import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { brusselsToday } from "@/lib/food";
import type { WorkProject, WorkLog } from "@/lib/types";
import WorkManager from "./WorkManager";

export const dynamic = "force-dynamic";

function isoMinusDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function WorkPage() {
  const supabase = await createClient();
  const today = brusselsToday();
  const monthStart = today.slice(0, 8) + "01";
  const dow = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7; // 0 = Monday
  const weekStart = isoMinusDays(today, dow);

  const [{ data: projData }, { data: logData }, { data: settings }, { data: checkins }] =
    await Promise.all([
      supabase
        .from("work_projects")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("work_logs")
        .select("*")
        .gte("date", isoMinusDays(today, 40)),
      supabase
        .from("finance_settings")
        .select("monthly_fixed_costs, income_tax_rate")
        .maybeSingle(),
      supabase
        .from("daily_checkins")
        .select("date, spending_eur")
        .gte("date", monthStart),
    ]);

  const projects = (projData ?? []) as WorkProject[];
  const logs = (logData ?? []) as WorkLog[];
  const rate = new Map(projects.map((p) => [p.id, Number(p.hourly_rate)]));

  const taxRate = Number(settings?.income_tax_rate ?? 0.5);
  const factor = 1 - taxRate; // netto na belasting

  const earn = (filter: (l: WorkLog) => boolean) =>
    logs
      .filter(filter)
      .reduce((s, l) => s + Number(l.hours) * (rate.get(l.project_id) ?? 0), 0) *
    factor;

  const stats = {
    today: earn((l) => l.date === today),
    week: earn((l) => l.date >= weekStart),
    month: earn((l) => l.date >= monthStart),
  };

  const todayHours: Record<string, number> = {};
  for (const l of logs.filter((l) => l.date === today)) {
    todayHours[l.project_id] = Number(l.hours);
  }

  const monthSpending = (checkins ?? []).reduce(
    (s, c) => s + (Number((c as { spending_eur: number | null }).spending_eur) || 0),
    0,
  );
  const fixedCosts = settings?.monthly_fixed_costs ?? null;
  const netMonth = stats.month - (Number(fixedCosts) || 0) - monthSpending;

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">💼 Werk & geld</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>
      <p className="mt-1 text-sm text-muted">
        Log je uren per project; de app berekent je verdiensten.
      </p>

      <WorkManager
        today={today}
        projects={projects}
        todayHours={todayHours}
        stats={stats}
        fixedCosts={fixedCosts != null ? Number(fixedCosts) : null}
        monthSpending={monthSpending}
        netMonth={netMonth}
        taxRatePct={Math.round(taxRate * 100)}
      />
    </main>
  );
}
