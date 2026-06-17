import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "no subscriptions" }, { status: 400 });
  }

  let sent = 0;
  for (const s of subs) {
    const res = await sendPush(s, {
      title: "Testmelding ✅",
      body: "Top — meldingen werken op dit toestel.",
      url: "/dashboard",
    });
    if (res === "ok") sent++;
    if (res === "gone") {
      await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
