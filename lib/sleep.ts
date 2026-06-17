// Sleep goals and helpers. Times are evaluated in the Europe/Brussels zone
// so they stay correct regardless of where the server runs (Vercel = UTC).

export const TZ = "Europe/Brussels";

// Persoonlijke doelen.
export const GOAL_BEDTIME_START_H = 23; // bed tussen 23:00 ...
export const GOAL_BEDTIME_END_H = 24; // ... en middernacht
export const GOAL_WAKE_H = 9; // opstaan om 09:00
export const GOAL_WAKE_GRACE_MIN = 15; // speling

export interface SleepNight {
  id: string;
  date: string;
  sleep_start_at: string | null;
  wake_at: string | null;
}

export interface Nap {
  id: string;
  date: string;
  started_at: string;
  duration_min: number | null;
  note: string | null;
}

/** Hour + minute of a date in the Brussels timezone. */
export function brusselsHM(iso: string): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat("nl-BE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { h: h === 24 ? 0 : h, m };
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("nl-BE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function durationMin(startIso: string, endIso: string): number {
  return Math.max(
    0,
    Math.round(
      (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
    ),
  );
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}u ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export type GoalStatus = "good" | "warn" | "bad";

export function bedtimeStatus(sleepStartIso: string | null): {
  status: GoalStatus;
  text: string;
} {
  if (!sleepStartIso) return { status: "warn", text: "geen bedtijd" };
  const { h } = brusselsHM(sleepStartIso);
  // doelvenster 23:00–00:00
  if (h === 23) return { status: "good", text: "binnen je venster (23–00u)" };
  if (h >= 0 && h < 12)
    return { status: "bad", text: "na middernacht — te laat" };
  if (h >= 12 && h < 23)
    return { status: "warn", text: "vroeger dan je venster" };
  return { status: "warn", text: "buiten je venster" };
}

export function wakeStatus(wakeIso: string | null): {
  status: GoalStatus;
  text: string;
} {
  if (!wakeIso) return { status: "warn", text: "nog niet opgestaan" };
  const { h, m } = brusselsHM(wakeIso);
  const minutes = h * 60 + m;
  const target = GOAL_WAKE_H * 60;
  if (minutes <= target + GOAL_WAKE_GRACE_MIN)
    return { status: "good", text: "op tijd (rond 9u)" };
  if (minutes <= target + 60)
    return { status: "warn", text: "iets later dan 9u" };
  return { status: "bad", text: "later dan 9u" };
}
