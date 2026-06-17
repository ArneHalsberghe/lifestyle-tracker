import type {
  GameType,
  GamblingEntry,
  GamblingSessionWithEntries,
} from "@/lib/types";

export const GAME_TYPES: { value: GameType; label: string; emoji: string }[] = [
  { value: "poker", label: "Poker", emoji: "🃏" },
  { value: "sportweddenschap", label: "Sportweddenschap", emoji: "⚽" },
  { value: "casino", label: "Casino", emoji: "🎰" },
  { value: "online", label: "Online", emoji: "💻" },
  { value: "andere", label: "Andere", emoji: "🎲" },
];

export function gameLabel(t: GameType): string {
  return GAME_TYPES.find((g) => g.value === t)?.label ?? t;
}

export function gameEmoji(t: GameType): string {
  return GAME_TYPES.find((g) => g.value === t)?.emoji ?? "🎲";
}

export function sumIn(entries: GamblingEntry[]): number {
  return entries
    .filter((e) => e.kind === "in")
    .reduce((s, e) => s + Number(e.amount), 0);
}

export function sumOut(entries: GamblingEntry[]): number {
  return entries
    .filter((e) => e.kind === "out")
    .reduce((s, e) => s + Number(e.amount), 0);
}

/** Net result of a session: money out minus money in. Positive = winst. */
export function sessionNet(s: GamblingSessionWithEntries): number {
  return sumOut(s.gambling_entries) - sumIn(s.gambling_entries);
}

/** Session duration in minutes (uses now() if still running). */
export function sessionMinutes(s: {
  started_at: string;
  ended_at: string | null;
}): number {
  const end = s.ended_at ? new Date(s.ended_at) : new Date();
  return Math.max(
    0,
    Math.round((end.getTime() - new Date(s.started_at).getTime()) / 60000),
  );
}

export function formatEUR(n: number): string {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}u ${m}m` : `${m}m`;
}

/** Monday 00:00 of the week containing `d` (local time). */
export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function weekKey(d: Date): string {
  const s = startOfWeek(d);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(
    s.getDate(),
  ).padStart(2, "0")}`;
}

export interface AggregateStats {
  sessionCount: number;
  totalNet: number;
  totalIn: number;
  totalMinutes: number;
  winningSessions: number;
  winRate: number; // 0..1
  avgMinutes: number;
  weekNet: number; // net result for the current week
}

export function aggregate(sessions: GamblingSessionWithEntries[]): AggregateStats {
  const completed = sessions.filter((s) => s.ended_at);
  const totalNet = sessions.reduce((s, x) => s + sessionNet(x), 0);
  const totalIn = sessions.reduce((s, x) => s + sumIn(x.gambling_entries), 0);
  const totalMinutes = completed.reduce((s, x) => s + sessionMinutes(x), 0);
  const winning = sessions.filter((s) => sessionNet(s) > 0).length;

  const ws = startOfWeek(new Date()).getTime();
  const weekNet = sessions
    .filter((s) => new Date(s.started_at).getTime() >= ws)
    .reduce((s, x) => s + sessionNet(x), 0);

  return {
    sessionCount: sessions.length,
    totalNet,
    totalIn,
    totalMinutes,
    winningSessions: winning,
    winRate: sessions.length ? winning / sessions.length : 0,
    avgMinutes: completed.length
      ? Math.round(totalMinutes / completed.length)
      : 0,
    weekNet,
  };
}

export interface WeekPoint {
  week: string; // label e.g. "12 mei"
  net: number;
}

/** Net result grouped per week, oldest first, for the last `weeks` weeks. */
export function netPerWeek(
  sessions: GamblingSessionWithEntries[],
  weeks = 12,
): WeekPoint[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = weekKey(new Date(s.started_at));
    map.set(k, (map.get(k) ?? 0) + sessionNet(s));
  }

  const out: WeekPoint[] = [];
  const cursor = startOfWeek(new Date());
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i * 7);
    const k = weekKey(d);
    out.push({
      week: new Intl.DateTimeFormat("nl-BE", {
        day: "numeric",
        month: "short",
      }).format(d),
      net: Math.round((map.get(k) ?? 0) * 100) / 100,
    });
  }
  return out;
}
