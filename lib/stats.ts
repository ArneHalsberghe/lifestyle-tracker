// Aggregation layer for the Stats dashboard: merges all domains into one
// dense daily series and provides summary + correlation helpers.

import type {
  DailyCheckin,
  DailyHabits,
  GamblingSessionWithEntries,
} from "@/lib/types";
import { sessionNet } from "@/lib/gambling";

const TZ = "Europe/Brussels";

function brusselsDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

function brusselsMinutes(iso: string): number {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = Number(p.find((x) => x.type === "hour")?.value ?? "0");
  const m = Number(p.find((x) => x.type === "minute")?.value ?? "0");
  return (h === 24 ? 0 : h) * 60 + m;
}

function avgOf(nums: (number | null | undefined)[]): number | null {
  const v = nums.filter((n): n is number => n != null && !Number.isNaN(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export interface DayRow {
  date: string;
  label: string;
  energyAvg: number | null;
  energyM: number | null;
  energyN: number | null;
  energyE: number | null;
  fatigue: number | null;
  brainFog: number | null;
  concentration: number | null;
  tolerance: number | null;
  overstim: number | null;
  happiness: number | null;
  stress: number | null;
  anxiety: number | null;
  motivation: number | null;
  social: number | null;
  loneliness: number | null;
  sleepH: number | null; // uren
  bedtimeMin: number | null;
  wakeMin: number | null;
  restingHr: number | null;
  hrv: number | null;
  weight: number | null;
  alcohol: number | null;
  workoutMin: number | null;
  spending: number | null;
  earnings: number | null;
  gamblingNet: number | null;
  habitPct: number | null;
  sleptOnTime: number | null; // 1 = voor middernacht geslapen, 0 = niet
  upBefore9: number | null; // 1 = op tijd op, 0 = niet
}

const HABIT_KEYS = [
  "up_before_9",
  "no_daytime_sleep",
  "steps_7000",
  "enough_water",
  "ate_healthy",
  "no_impulse_spending",
  "no_online_gambling",
  "slept_on_time",
] as const;

export interface RawData {
  checkins: DailyCheckin[];
  habits: DailyHabits[];
  sleeps: { date: string; sleep_start_at: string | null; wake_at: string | null }[];
  body: { date: string; weight_kg: number | null }[];
  food: { date: string; alcohol_units: number | null }[];
  workouts: { started_at: string; duration_min: number | null }[];
  gambling: GamblingSessionWithEntries[];
  workLogs: { date: string; project_id: string; hours: number }[];
  activity: {
    date: string;
    resting_hr: number | null;
    hrv: number | null;
    sleep_min: number | null;
  }[];
  rates: Map<string, number>;
  taxRate: number;
}

export function buildDays(data: RawData, days: number): DayRow[] {
  const map = new Map<string, DayRow>();
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
    map.set(iso, {
      date: iso,
      label: new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short" }).format(d),
      energyAvg: null, energyM: null, energyN: null, energyE: null,
      fatigue: null, brainFog: null, concentration: null, tolerance: null, overstim: null,
      happiness: null, stress: null, anxiety: null, motivation: null,
      social: null, loneliness: null,
      sleepH: null, bedtimeMin: null, wakeMin: null,
      restingHr: null, hrv: null,
      weight: null, alcohol: null, workoutMin: null,
      spending: null, earnings: null, gamblingNet: null, habitPct: null,
      sleptOnTime: null, upBefore9: null,
    });
  }

  for (const c of data.checkins) {
    const r = map.get(c.date);
    if (!r) continue;
    r.energyM = c.energy_morning;
    r.energyN = c.energy_noon;
    r.energyE = c.energy_evening;
    r.energyAvg = avgOf([c.energy_morning, c.energy_noon, c.energy_evening]);
    r.fatigue = c.fatigue;
    r.brainFog = c.brain_fog;
    r.concentration = c.concentration;
    r.tolerance = c.tolerance;
    r.overstim = c.overstimulation;
    r.happiness = c.happiness;
    r.stress = c.stress;
    r.anxiety = c.anxiety;
    r.motivation = c.motivation;
    r.social = c.social_battery;
    r.loneliness = c.loneliness;
    r.spending = c.spending_eur;
    r.hrv = c.hrv; // HRV wordt manueel in de check-in ingevuld
  }

  for (const h of data.habits) {
    const r = map.get(h.date);
    if (!r) continue;
    let done = 0;
    for (const k of HABIT_KEYS) if (h[k] === true) done++;
    r.habitPct = Math.round((done / HABIT_KEYS.length) * 100);
    r.sleptOnTime =
      h.slept_on_time === true ? 1 : h.slept_on_time === false ? 0 : null;
    r.upBefore9 = h.up_before_9 === true ? 1 : h.up_before_9 === false ? 0 : null;
  }

  for (const s of data.sleeps) {
    const r = map.get(s.date);
    if (!r) continue;
    if (s.sleep_start_at && s.wake_at) {
      r.sleepH =
        Math.round(
          ((new Date(s.wake_at).getTime() - new Date(s.sleep_start_at).getTime()) /
            3600000) *
            10,
        ) / 10;
      r.bedtimeMin = brusselsMinutes(s.sleep_start_at);
      r.wakeMin = brusselsMinutes(s.wake_at);
    }
  }

  for (const a of data.activity) {
    const r = map.get(a.date);
    if (!r) continue;
    // rusthartslag blijft uit Apple Health komen
    if (a.resting_hr != null) r.restingHr = Number(a.resting_hr);
  }

  for (const b of data.body) {
    const r = map.get(b.date);
    if (r && b.weight_kg != null) r.weight = Number(b.weight_kg);
  }

  for (const f of data.food) {
    const r = map.get(f.date);
    if (r && f.alcohol_units != null) r.alcohol = Number(f.alcohol_units);
  }

  for (const w of data.workouts) {
    const iso = brusselsDate(w.started_at);
    const r = map.get(iso);
    if (r) r.workoutMin = (r.workoutMin ?? 0) + (Number(w.duration_min) || 0);
  }

  for (const s of data.gambling) {
    const iso = brusselsDate(s.started_at);
    const r = map.get(iso);
    if (r) r.gamblingNet = (r.gamblingNet ?? 0) + sessionNet(s);
  }

  const factor = 1 - data.taxRate;
  for (const l of data.workLogs) {
    const r = map.get(l.date);
    if (r) {
      const earned = Number(l.hours) * (data.rates.get(l.project_id) ?? 0) * factor;
      r.earnings = (r.earnings ?? 0) + earned;
    }
  }

  return Array.from(map.values());
}

// ---- summary + correlation helpers ----

export function mean(rows: DayRow[], key: keyof DayRow): number | null {
  return avgOf(rows.map((r) => r[key] as number | null));
}

export function sum(rows: DayRow[], key: keyof DayRow): number {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
}

export function countNonNull(rows: DayRow[], key: keyof DayRow): number {
  return rows.filter((r) => r[key] != null).length;
}

/** Pearson correlation between two day-fields, optional lag (b shifted by `lag` days). */
export function correlate(
  rows: DayRow[],
  aKey: keyof DayRow,
  bKey: keyof DayRow,
  lag = 0,
): number | null {
  const pairs: [number, number][] = [];
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i][aKey] as number | null;
    const j = i + lag;
    if (j < 0 || j >= rows.length) continue;
    const b = rows[j][bKey] as number | null;
    if (a != null && b != null) pairs.push([a, b]);
  }
  const n = pairs.length;
  if (n < 6) return null;
  const ma = pairs.reduce((s, p) => s + p[0], 0) / n;
  const mb = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0, da = 0, db = 0;
  for (const [a, b] of pairs) {
    num += (a - ma) * (b - mb);
    da += (a - ma) ** 2;
    db += (b - mb) ** 2;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

export function strength(r: number): string {
  const a = Math.abs(r);
  return a >= 0.6 ? "sterk" : a >= 0.4 ? "duidelijk" : "licht";
}
