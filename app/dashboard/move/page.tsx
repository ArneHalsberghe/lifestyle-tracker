import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import WeightLogger from "./WeightLogger";
import WorkoutLogger from "./WorkoutLogger";

export const dynamic = "force-dynamic";

interface Weight {
  date: string;
  weight_kg: number | null;
}
interface Workout {
  id: string;
  started_at: string;
  activity_type: string;
  duration_min: number | null;
  distance_km: number | null;
}

export default async function MovePage() {
  const supabase = await createClient();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(new Date());

  const [{ data: weights }, { data: workouts }, { data: activity }] =
    await Promise.all([
      supabase
        .from("body_measurements")
        .select("date, weight_kg")
        .not("weight_kg", "is", null)
        .order("date", { ascending: false })
        .limit(12),
      supabase
        .from("workouts")
        .select("id, started_at, activity_type, duration_min, distance_km")
        .order("started_at", { ascending: false })
        .limit(10),
      supabase
        .from("daily_activity")
        .select("steps, active_minutes")
        .eq("date", today)
        .order("source", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  const steps = (activity as { steps: number | null } | null)?.steps ?? null;

  const w = (weights ?? []) as Weight[];
  const ws = (workouts ?? []) as Workout[];
  const lastWeight = w[0]?.weight_kg ?? null;

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">🏃 Beweging</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>

      <div className="mt-4 space-y-4">
        <WeightLogger lastWeight={lastWeight != null ? Number(lastWeight) : null} />

        {w.length > 1 && (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-sm font-medium">Gewichtsverloop</h2>
            <ul className="mt-2 space-y-1">
              {w.map((row) => (
                <li
                  key={row.date}
                  className="flex justify-between text-sm text-muted"
                >
                  <span>
                    {new Intl.DateTimeFormat("nl-BE", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(row.date))}
                  </span>
                  <span className="font-medium text-text">{row.weight_kg} kg</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <WorkoutLogger />

        {/* Steps */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-medium">👟 Stappen vandaag</h2>
          {steps != null ? (
            <p className="mt-1 text-2xl font-semibold">
              {steps.toLocaleString("nl-BE")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Nog geen stappen vandaag. Zet de Apple Health-sync op via
              Instellingen → Apple Health (Shortcuts).
            </p>
          )}
        </section>

        {/* Recent workouts */}
        {ws.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-sm font-medium">Recente sessies</h2>
            <ul className="mt-2 space-y-2">
              {ws.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>{s.activity_type}</span>
                  <span className="text-xs text-muted">
                    {new Intl.DateTimeFormat("nl-BE", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(s.started_at))}
                    {s.duration_min ? ` · ${s.duration_min}m` : ""}
                    {s.distance_km ? ` · ${s.distance_km}km` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
