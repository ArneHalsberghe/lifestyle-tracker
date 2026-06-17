import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { dueReminders, resolveReminders, type ReminderPref } from "@/lib/reminders";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

function brusselsHM(): { h: number; m: number; date: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(now);
  return { h: h === 24 ? 0 : h, m, date };
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { h, m, date } = brusselsHM();
  const isoWeekday = ((new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;

  const admin = createAdminClient();

  const { data: prefs } = await admin
    .from("reminder_prefs")
    .select("reminder_key, enabled, hour, minute");
  const resolved = resolveReminders((prefs ?? []) as ReminderPref[]);
  const due = dueReminders(resolved, h, m, isoWeekday);
  if (due.length === 0) return NextResponse.json({ ok: true, sent: 0, fired: [] });

  let sent = 0;
  const fired: string[] = [];

  for (const reminder of due) {
    // Dedupe: only the first ping in the window wins per reminder per day.
    const { error: logError } = await admin
      .from("reminder_log")
      .insert({ date, reminder_key: reminder.key });
    if (logError) continue; // already sent today

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    for (const s of subs ?? []) {
      const res = await sendPush(s, {
        title: reminder.title,
        body: reminder.body,
        url: reminder.url,
      });
      if (res === "ok") sent++;
      if (res === "gone") {
        await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
    fired.push(reminder.key);
  }

  return NextResponse.json({ ok: true, sent, fired });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
