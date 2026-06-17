import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { brusselsToday } from "@/lib/food";
import type { DailyCheckin, DailyHabits, FoodDay } from "@/lib/types";
import {
  ALL_METRICS,
  HABITS,
  MEAL_COLS,
  avg,
  buildSeries,
  corrLabel,
  currentPhase,
  habitCompletionRate,
  pearson,
  round1,
  type CheckinMetricKey,
  type Phase,
} from "@/lib/checkin";
import PhasedCheckin from "./PhasedCheckin";
import CheckinCharts from "./CheckinCharts";

export const dynamic = "force-dynamic";

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function CheckinPage() {
  const supabase = await createClient();
  const today = brusselsToday();

  const [
    { data: checkinsData },
    { data: habitsData },
    { data: foodToday },
    { data: appSettings },
  ] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select("*")
      .gte("date", isoDaysAgo(60))
      .order("date", { ascending: true }),
    supabase
      .from("daily_habits")
      .select("*")
      .gte("date", isoDaysAgo(60))
      .order("date", { ascending: true }),
    supabase.from("food_days").select("*").eq("date", today).maybeSingle(),
    supabase
      .from("app_settings")
      .select("household_enabled, household_minutes")
      .maybeSingle(),
  ]);

  const checkins = (checkinsData ?? []) as DailyCheckin[];
  const habits = (habitsData ?? []) as DailyHabits[];

  const todayCheckin = checkins.find((c) => c.date === today);
  const todayHabits = habits.find((h) => h.date === today);
  const food = (foodToday as FoodDay) ?? null;

  // Prefill the phased form
  const metrics: Record<string, number | null> = {};
  for (const m of ALL_METRICS) {
    metrics[m.key] = todayCheckin ? (todayCheckin[m.key] ?? null) : null;
  }
  const habitsRecord: Record<string, boolean> = {};
  for (const h of HABITS) {
    habitsRecord[h.key] = todayHabits ? Boolean(todayHabits[h.key]) : false;
  }
  const foodRecord: Record<string, boolean | null> = {};
  for (const mk of Object.values(MEAL_COLS)) {
    foodRecord[mk.eaten] = food
      ? ((food[mk.eaten as keyof FoodDay] as boolean | null) ?? null)
      : null;
    foodRecord[mk.healthy] = food
      ? ((food[mk.healthy as keyof FoodDay] as boolean | null) ?? null)
      : null;
  }

  const done: Record<Phase, boolean> = {
    morning: Boolean(todayCheckin?.morning_done),
    noon: Boolean(todayCheckin?.noon_done),
    evening: Boolean(todayCheckin?.evening_done),
  };

  const series = buildSeries(checkins, 30);
  const insights = buildInsights(checkins, habits);

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">📋 Check-in</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>
      <p className="mt-1 text-sm text-muted">
        Drie keer per dag: ochtend, middag en avond — elk met eigen vragen.
      </p>

      <PhasedCheckin
        initialPhase={currentPhase()}
        date={today}
        metrics={metrics}
        habits={habitsRecord}
        food={foodRecord}
        alcohol={food?.alcohol_units ?? 0}
        spending={todayCheckin?.spending_eur ?? 0}
        householdEnabled={appSettings?.household_enabled ?? true}
        householdMinutes={appSettings?.household_minutes ?? 10}
        household={
          todayHabits?.household_done === undefined
            ? null
            : (todayHabits?.household_done ?? null)
        }
        done={done}
      />

      {insights.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-medium">Inzichten</h2>
          <ul className="mt-2 space-y-1.5">
            {insights.map((t, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted">
                <span className="text-accent">•</span>
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted">Laatste 30 dagen</h2>
        <CheckinCharts series={series} />
      </section>
    </main>
  );
}

function buildInsights(
  checkins: DailyCheckin[],
  habits: DailyHabits[],
): string[] {
  const out: string[] = [];
  if (checkins.length === 0) return out;

  const last7 = checkins.filter((c) => c.date >= isoDaysAgo(7));
  const energy7 = avg(
    last7.flatMap((c) =>
      [c.energy_morning, c.energy_noon, c.energy_evening].filter(
        (v): v is number => v != null,
      ),
    ),
  );
  if (energy7 != null) {
    const tag = energy7 >= 7 ? "✅ boven je doel" : "onder je doel van 7";
    out.push(`Gemiddelde energie deze week: ${round1(energy7)}/10 (${tag}).`);
  }

  const fatigue7 = avg(
    last7.map((c) => c.fatigue).filter((v): v is number => v != null),
  );
  if (fatigue7 != null) {
    out.push(`Gemiddelde vermoeidheid deze week: ${round1(fatigue7)}/10.`);
  }

  const habits7 = habits.filter((h) => h.date >= isoDaysAgo(7));
  const rate = habitCompletionRate(habits7);
  if (rate != null) {
    out.push(`Gewoontes deze week: ${Math.round(rate * 100)}% afgevinkt.`);
  }

  const energyAvgArr = checkins.map((c) =>
    avg(
      [c.energy_morning, c.energy_noon, c.energy_evening].filter(
        (v): v is number => v != null,
      ),
    ),
  );
  const col = (k: CheckinMetricKey) => checkins.map((c) => c[k] ?? null);

  const candidates: { a: (number | null)[]; b: (number | null)[]; desc: string }[] =
    [
      { a: col("stress"), b: col("fatigue"), desc: "Stress ↔ vermoeidheid" },
      {
        a: col("overstimulation"),
        b: col("fatigue"),
        desc: "Overprikkeling ↔ vermoeidheid",
      },
      { a: col("stress"), b: energyAvgArr, desc: "Stress ↔ energie" },
      { a: col("motivation"), b: energyAvgArr, desc: "Motivatie ↔ energie" },
      {
        a: col("social_battery"),
        b: col("happiness"),
        desc: "Sociale batterij ↔ geluk",
      },
      {
        a: col("brain_fog"),
        b: col("concentration"),
        desc: "Brain fog ↔ concentratie",
      },
    ];

  for (const c of candidates) {
    const r = pearson(c.a, c.b);
    if (r != null && Math.abs(r) >= 0.35) {
      out.push(`${c.desc}: ${corrLabel(r)} (r = ${r.toFixed(2)}).`);
    }
  }

  if (checkins.length < 5) {
    out.push(
      "Tip: hoe meer dagen je invult, hoe beter de app verbanden kan tonen.",
    );
  }

  return out;
}
