import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildDays, type RawData } from "@/lib/stats";
import type {
  DailyCheckin,
  DailyHabits,
  GamblingSessionWithEntries,
} from "@/lib/types";
import StatsClient from "./StatsClient";

export const dynamic = "force-dynamic";

const WINDOW = 180;

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function StatsPage() {
  const supabase = await createClient();
  const since = isoDaysAgo(WINDOW);
  const sinceTs = since + "T00:00:00Z";

  const [
    checkins,
    habits,
    sleeps,
    body,
    food,
    workouts,
    gambling,
    workLogs,
    projects,
    fin,
  ] = await Promise.all([
    supabase.from("daily_checkins").select("*").gte("date", since),
    supabase.from("daily_habits").select("*").gte("date", since),
    supabase
      .from("sleep_logs")
      .select("date, sleep_start_at, wake_at")
      .not("sleep_start_at", "is", null)
      .gte("date", since),
    supabase.from("body_measurements").select("date, weight_kg").gte("date", since),
    supabase.from("food_days").select("date, alcohol_units").gte("date", since),
    supabase
      .from("workouts")
      .select("started_at, duration_min")
      .gte("started_at", sinceTs),
    supabase
      .from("gambling_sessions")
      .select("*, gambling_entries(*)")
      .gte("started_at", sinceTs),
    supabase.from("work_logs").select("date, project_id, hours").gte("date", since),
    supabase.from("work_projects").select("id, hourly_rate"),
    supabase.from("finance_settings").select("income_tax_rate").maybeSingle(),
  ]);

  const rates = new Map<string, number>(
    (projects.data ?? []).map((p) => [p.id as string, Number(p.hourly_rate)]),
  );

  const data: RawData = {
    checkins: (checkins.data ?? []) as DailyCheckin[],
    habits: (habits.data ?? []) as DailyHabits[],
    sleeps: (sleeps.data ?? []) as RawData["sleeps"],
    body: (body.data ?? []) as RawData["body"],
    food: (food.data ?? []) as RawData["food"],
    workouts: (workouts.data ?? []) as RawData["workouts"],
    gambling: (gambling.data ?? []) as GamblingSessionWithEntries[],
    workLogs: (workLogs.data ?? []) as RawData["workLogs"],
    rates,
    taxRate: Number(fin.data?.income_tax_rate ?? 0.5),
  };

  const days = buildDays(data, WINDOW);

  return (
    <main className="px-4 pb-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">📊 Statistieken</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>

      <StatsClient days={days} />
    </main>
  );
}
