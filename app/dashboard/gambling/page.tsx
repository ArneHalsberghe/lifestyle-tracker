import { createClient } from "@/lib/supabase/server";
import type { GamblingSessionWithEntries } from "@/lib/types";
import {
  aggregate,
  formatDuration,
  formatEUR,
  gameEmoji,
  gameLabel,
  netPerWeek,
  sessionMinutes,
  sessionNet,
} from "@/lib/gambling";
import Tracker from "./_components/Tracker";
import StatsCharts from "./_components/StatsCharts";
import BudgetSettings from "./_components/BudgetSettings";
import DeleteSessionButton from "./_components/DeleteSessionButton";

export const dynamic = "force-dynamic";

export default async function GamblingPage() {
  const supabase = await createClient();

  const { data: sessionsRaw } = await supabase
    .from("gambling_sessions")
    .select("*, gambling_entries(*)")
    .order("started_at", { ascending: false })
    .limit(200);

  const { data: limitRow } = await supabase
    .from("gambling_limits")
    .select("weekly_loss_limit")
    .maybeSingle();

  const sessions = (sessionsRaw ?? []) as GamblingSessionWithEntries[];
  const active = sessions.find((s) => !s.ended_at) ?? null;
  const completed = sessions.filter((s) => s.ended_at);

  const stats = aggregate(sessions);
  const weekly = netPerWeek(sessions, 12);
  const limit = limitRow?.weekly_loss_limit ?? null;
  const weekLoss = stats.weekNet < 0 ? -stats.weekNet : 0;

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">🎲 Gokken</h1>
        <BudgetSettings current={limit} />
      </header>

      {/* Budget banner */}
      <BudgetBanner limit={limit} weekLoss={weekLoss} weekNet={stats.weekNet} />

      {/* Timer + logging */}
      <section className="mt-4">
        <Tracker active={active} />
      </section>

      {/* Aggregate stats */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <Card
          label="Netto totaal"
          value={formatEUR(stats.totalNet)}
          tone={stats.totalNet > 0 ? "good" : stats.totalNet < 0 ? "bad" : "neutral"}
        />
        <Card label="Sessies" value={String(stats.sessionCount)} />
        <Card
          label="Win-ratio"
          value={`${Math.round(stats.winRate * 100)}%`}
        />
        <Card label="Tijd totaal" value={formatDuration(stats.totalMinutes)} />
      </section>

      {/* Chart */}
      <section className="mt-4">
        <StatsCharts weekly={weekly} />
      </section>

      {/* Insights */}
      <Insights stats={stats} />

      {/* Lifestyle link (komt tot leven zodra slaap/stemming gelogd wordt) */}
      <section className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-4">
        <h2 className="text-sm font-medium">🔗 Koppeling met je levensstijl</h2>
        <p className="mt-1 text-xs text-muted">
          Zodra je ook slaap en stemming logt, zie je hier verbanden — bv.
          gokken vs. slaapkwaliteit, stress of stemming op dezelfde dag.
        </p>
      </section>

      {/* Recent sessions */}
      {completed.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-muted">Recente sessies</h2>
          <ul className="mt-2 space-y-2">
            {completed.slice(0, 20).map((s) => {
              const net = sessionNet(s);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{gameEmoji(s.game_type)}</span>
                    <div>
                      <p className="text-sm">{gameLabel(s.game_type)}</p>
                      <p className="text-[11px] text-muted">
                        {new Intl.DateTimeFormat("nl-BE", {
                          day: "numeric",
                          month: "short",
                        }).format(new Date(s.started_at))}{" "}
                        · {formatDuration(sessionMinutes(s))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        net > 0
                          ? "text-emerald-400"
                          : net < 0
                            ? "text-red-400"
                            : "text-text"
                      }`}
                    >
                      {net > 0 ? "+" : ""}
                      {formatEUR(net)}
                    </span>
                    <DeleteSessionButton id={s.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="mt-8 text-center text-[11px] text-muted">
        Hulp nodig of zin om te minderen? De DrugLijn: 078 15 10 20 ·{" "}
        <a
          href="https://gokhulp.be"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          gokhulp.be
        </a>
      </p>
    </main>
  );
}

function BudgetBanner({
  limit,
  weekLoss,
  weekNet,
}: {
  limit: number | null;
  weekLoss: number;
  weekNet: number;
}) {
  if (!limit) return null;

  const over = weekLoss >= limit;
  const near = !over && weekLoss >= limit * 0.8;

  if (!over && !near) {
    return (
      <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
        Deze week: netto {formatEUR(weekNet)} · weekbudget verlies max{" "}
        {formatEUR(limit)}.
      </div>
    );
  }

  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
        over
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300"
      }`}
    >
      {over ? (
        <>
          <p className="font-medium">Je bent over je weekbudget.</p>
          <p className="mt-1 text-xs">
            Verlies deze week: {formatEUR(weekLoss)} (limiet {formatEUR(limit)}).
            Misschien een goed moment om te stoppen voor deze week. Praten kan
            anoniem via De DrugLijn 078 15 10 20.
          </p>
        </>
      ) : (
        <p className="text-xs">
          Je nadert je weekbudget: {formatEUR(weekLoss)} van {formatEUR(limit)}{" "}
          verlies.
        </p>
      )}
    </div>
  );
}

function Insights({ stats }: { stats: ReturnType<typeof aggregate> }) {
  const items: string[] = [];

  if (stats.sessionCount === 0) return null;

  items.push(
    stats.totalNet >= 0
      ? `Over alles samen sta je ${formatEUR(stats.totalNet)} in de plus.`
      : `Over alles samen sta je ${formatEUR(stats.totalNet)} in de min.`,
  );
  items.push(
    `${Math.round(stats.winRate * 100)}% van je sessies eindigde positief.`,
  );
  if (stats.avgMinutes > 0) {
    items.push(`Gemiddelde sessieduur: ${formatDuration(stats.avgMinutes)}.`);
  }
  if (stats.avgMinutes >= 120) {
    items.push(
      "Je sessies duren gemiddeld vrij lang — let op de tijd die je erin steekt.",
    );
  }

  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Inzichten</h2>
      <ul className="mt-2 space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-xs text-muted">
            <span className="text-accent">•</span>
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Card({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-red-400"
        : "text-text";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
