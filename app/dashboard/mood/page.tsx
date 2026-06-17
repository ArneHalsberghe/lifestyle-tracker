import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HABITS } from "@/lib/checkin";
import type { DailyCheckin, DailyHabits } from "@/lib/types";
import HabitChecklist from "./HabitChecklist";
import MoodTrend, { type MoodPoint } from "./MoodTrend";

export const dynamic = "force-dynamic";

function brusselsToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(
    new Date(),
  );
}
function isoDaysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const MOODS = [
  { key: "happiness", label: "Geluk", emoji: "😊", positive: true },
  { key: "stress", label: "Stress", emoji: "😰", positive: false },
  { key: "anxiety", label: "Angst", emoji: "😟", positive: false },
  { key: "motivation", label: "Motivatie", emoji: "🔥", positive: true },
] as const;

export default async function MoodPage() {
  const supabase = await createClient();
  const today = brusselsToday();

  const [{ data: checkinsData }, { data: habitsData }, { data: app }] =
    await Promise.all([
      supabase
        .from("daily_checkins")
        .select("*")
        .gte("date", isoDaysAgo(30))
        .order("date", { ascending: true }),
      supabase.from("daily_habits").select("*").gte("date", isoDaysAgo(60)),
      supabase
        .from("app_settings")
        .select("household_enabled, household_minutes")
        .maybeSingle(),
    ]);

  const checkins = (checkinsData ?? []) as DailyCheckin[];
  const habits = (habitsData ?? []) as DailyHabits[];
  const todayCheckin = checkins.find((c) => c.date === today) ?? null;
  const todayHabits = habits.find((h) => h.date === today);

  // habit-state van vandaag voor de checklist
  const habitState: Record<string, boolean> = {};
  for (const h of HABITS) habitState[h.key] = Boolean(todayHabits?.[h.key]);
  habitState["household_done"] = Boolean(todayHabits?.household_done);

  // mood-trend (30d)
  const byDate = new Map(checkins.map((c) => [c.date, c]));
  const series: MoodPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const iso = isoDaysAgo(i);
    const c = byDate.get(iso);
    series.push({
      date: new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short" }).format(
        new Date(iso + "T12:00:00Z"),
      ),
      happiness: c?.happiness ?? null,
      stress: c?.stress ?? null,
      motivation: c?.motivation ?? null,
    });
  }

  // streak van volledige gewoonte-dagen
  const habitByDate = new Map(habits.map((h) => [h.date, h]));
  const isComplete = (iso: string) => {
    const h = habitByDate.get(iso);
    return h ? HABITS.every((def) => h[def.key] === true) : false;
  };
  let streak = 0;
  for (let d = 0; d < 60; d++) {
    const iso = isoDaysAgo(d);
    if (isComplete(iso)) streak++;
    else if (d === 0) continue; // vandaag mag nog onvolledig zijn
    else break;
  }

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">🙂 Stemming & gewoontes</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>

      {/* Gemoed vandaag */}
      <section className="mt-4">
        <h2 className="mb-2 text-sm font-medium text-muted">Gemoed vandaag</h2>
        {todayCheckin ? (
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map((m) => {
              const v = todayCheckin[m.key] as number | null;
              const good = v == null ? false : m.positive ? v >= 7 : v <= 4;
              const bad = v == null ? false : m.positive ? v <= 4 : v >= 7;
              return (
                <div key={m.key} className="rounded-2xl border border-border bg-surface p-3 text-center">
                  <div className="text-xl">{m.emoji}</div>
                  <div className="mt-1 text-[11px] text-muted">{m.label}</div>
                  <div
                    className={`text-lg font-semibold ${
                      good ? "text-emerald-400" : bad ? "text-red-400" : "text-text"
                    }`}
                  >
                    {v ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Link
            href="/dashboard/checkin"
            className="block rounded-2xl border border-dashed border-border bg-surface p-4 text-center text-sm text-muted"
          >
            Nog geen check-in vandaag — tik om in te checken →
          </Link>
        )}
      </section>

      {/* Gewoontes met streak */}
      <div className="mt-4">
        {streak > 0 && (
          <p className="mb-2 text-center text-sm text-accent">
            🔥 {streak} dag{streak > 1 ? "en" : ""} op rij alle gewoontes
          </p>
        )}
        <HabitChecklist
          initial={habitState}
          householdEnabled={app?.household_enabled ?? true}
          householdMinutes={app?.household_minutes ?? 10}
        />
      </div>

      {/* Trend */}
      <section className="mt-4">
        <MoodTrend series={series} />
      </section>
    </main>
  );
}
