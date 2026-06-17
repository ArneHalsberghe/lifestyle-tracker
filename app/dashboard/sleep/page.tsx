import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  bedtimeStatus,
  durationMin,
  formatDuration,
  formatTime,
  wakeStatus,
  type GoalStatus,
  type Nap,
  type SleepNight,
} from "@/lib/sleep";
import SleepButtons from "./SleepButtons";
import NapLogger from "./NapLogger";

export const dynamic = "force-dynamic";

const dot: Record<GoalStatus, string> = {
  good: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-red-400",
};

function brusselsToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(new Date());
}

export default async function SleepPage() {
  const supabase = await createClient();

  const { data: nightsData } = await supabase
    .from("sleep_logs")
    .select("id, date, sleep_start_at, wake_at")
    .not("sleep_start_at", "is", null)
    .order("sleep_start_at", { ascending: false })
    .limit(14);

  const { data: napsData } = await supabase
    .from("naps")
    .select("id, date, started_at, duration_min, note")
    .eq("date", brusselsToday())
    .order("started_at", { ascending: true });

  const nights = (nightsData ?? []) as SleepNight[];
  const naps = (napsData ?? []) as Nap[];

  const open = nights.find((n) => !n.wake_at) ?? null;
  const completed = nights.filter((n) => n.wake_at);
  const lastNight = completed[0] ?? null;

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">😴 Slaap</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>

      {/* Goals */}
      <p className="mt-1 text-xs text-muted">
        Doel: slapen tussen <strong>23–24u</strong>, opstaan om{" "}
        <strong>9u</strong>, geen dutjes overdag.
      </p>

      {/* Buttons */}
      <section className="mt-5">
        <SleepButtons openSince={open?.sleep_start_at ?? null} />
      </section>

      {/* Last night */}
      {lastNight && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-medium">Vorige nacht</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Box label="Naar bed" value={formatTime(lastNight.sleep_start_at)} />
            <Box label="Opgestaan" value={formatTime(lastNight.wake_at)} />
            <Box
              label="Geslapen"
              value={
                lastNight.sleep_start_at && lastNight.wake_at
                  ? formatDuration(
                      durationMin(lastNight.sleep_start_at, lastNight.wake_at),
                    )
                  : "—"
              }
            />
          </div>
          <ul className="mt-3 space-y-1 text-xs">
            <li className={dot[bedtimeStatus(lastNight.sleep_start_at).status]}>
              ● Bedtijd: {bedtimeStatus(lastNight.sleep_start_at).text}
            </li>
            <li className={dot[wakeStatus(lastNight.wake_at).status]}>
              ● Opstaan: {wakeStatus(lastNight.wake_at).text}
            </li>
          </ul>
        </section>
      )}

      {/* Naps */}
      <section className="mt-4">
        <NapLogger naps={naps} />
      </section>

      {/* Recent nights */}
      {completed.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-muted">Recente nachten</h2>
          <ul className="mt-2 space-y-2">
            {completed.slice(0, 10).map((n) => {
              const bs = bedtimeStatus(n.sleep_start_at);
              const ws = wakeStatus(n.wake_at);
              return (
                <li
                  key={n.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                >
                  <div>
                    <p>
                      {new Intl.DateTimeFormat("nl-BE", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      }).format(new Date(n.date))}
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatTime(n.sleep_start_at)} → {formatTime(n.wake_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {n.sleep_start_at && n.wake_at
                        ? formatDuration(durationMin(n.sleep_start_at, n.wake_at))
                        : "—"}
                    </span>
                    <span className="text-xs">
                      <span className={dot[bs.status]}>●</span>
                      <span className={dot[ws.status]}>●</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
