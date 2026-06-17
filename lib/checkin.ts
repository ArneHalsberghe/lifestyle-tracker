import type { DailyCheckin, DailyHabits } from "@/lib/types";

export type CheckinMetricKey =
  | "energy_morning"
  | "energy_noon"
  | "energy_evening"
  | "fatigue"
  | "brain_fog"
  | "concentration"
  | "tolerance"
  | "overstimulation"
  | "happiness"
  | "stress"
  | "anxiety"
  | "motivation"
  | "social_battery"
  | "loneliness";

export interface MetricDef {
  key: CheckinMetricKey;
  label: string;
  /** true = higher is better (energie, geluk). false = lower is better (stress). */
  positive: boolean;
}

export interface MetricGroup {
  title: string;
  emoji: string;
  metrics: MetricDef[];
}

export const CHECKIN_GROUPS: MetricGroup[] = [
  {
    title: "Energie",
    emoji: "⚡",
    metrics: [
      { key: "energy_morning", label: "Ochtendenergie", positive: true },
      { key: "energy_noon", label: "Middagenergie", positive: true },
      { key: "energy_evening", label: "Avondenergie", positive: true },
    ],
  },
  {
    title: "Vermoeidheid & Fabry",
    emoji: "🧠",
    metrics: [
      { key: "fatigue", label: "Vermoeidheid", positive: false },
      { key: "brain_fog", label: "Brain fog", positive: false },
      { key: "concentration", label: "Concentratie", positive: true },
      { key: "tolerance", label: "Belastbaarheid", positive: true },
      { key: "overstimulation", label: "Overprikkeling", positive: false },
    ],
  },
  {
    title: "Gemoed",
    emoji: "🙂",
    metrics: [
      { key: "happiness", label: "Geluk", positive: true },
      { key: "stress", label: "Stress", positive: false },
      { key: "anxiety", label: "Angst", positive: false },
      { key: "motivation", label: "Motivatie", positive: true },
    ],
  },
  {
    title: "Sociaal",
    emoji: "🫂",
    metrics: [
      { key: "social_battery", label: "Sociale batterij", positive: true },
      { key: "loneliness", label: "Eenzaamheid", positive: false },
    ],
  },
];

export const ALL_METRICS: MetricDef[] = CHECKIN_GROUPS.flatMap((g) => g.metrics);

export interface HabitDef {
  key: keyof Omit<DailyHabits, "id" | "user_id" | "date" | "created_at">;
  label: string;
}

export const HABITS: HabitDef[] = [
  { key: "up_before_9", label: "Voor 09:00 opgestaan" },
  { key: "no_daytime_sleep", label: "Niet geslapen tussen 09:00 en 22:00" },
  { key: "steps_7000", label: "Minstens 7000 stappen" },
  { key: "enough_water", label: "Voldoende water gedronken" },
  { key: "ate_healthy", label: "Gezond gegeten" },
  { key: "no_impulse_spending", label: "Geen impulsieve uitgaven" },
  { key: "no_online_gambling", label: "Niet online gegokt" },
  { key: "slept_on_time", label: "Op tijd gaan slapen" },
];

// ------------------------- phases (3x/dag) -------------------------

export type Phase = "morning" | "noon" | "evening";
export type MealKey = "breakfast" | "lunch" | "dinner";

export interface PhaseConfig {
  phase: Phase;
  label: string;
  emoji: string;
  intro: string;
  metricKeys: CheckinMetricKey[];
  habitKeys: HabitDef["key"][];
  mealKeys: MealKey[];
  showAlcohol: boolean;
  showSpending: boolean;
  showNotes: boolean;
}

export const PHASES: PhaseConfig[] = [
  {
    phase: "morning",
    label: "Ochtend",
    emoji: "🌅",
    intro: "Hoe start je de dag?",
    metricKeys: ["energy_morning", "fatigue", "brain_fog", "anxiety", "motivation"],
    habitKeys: [], // op tijd geslapen / op tijd op wordt automatisch afgeleid uit de slaap-knoppen
    mealKeys: [],
    showAlcohol: false,
    showSpending: false,
    showNotes: false,
  },
  {
    phase: "noon",
    label: "Middag",
    emoji: "☀️",
    intro: "Hoe gaat je dag tot nu toe?",
    metricKeys: ["energy_noon", "concentration", "tolerance", "overstimulation"],
    habitKeys: ["no_daytime_sleep"],
    mealKeys: ["breakfast", "lunch"],
    showAlcohol: false,
    showSpending: false,
    showNotes: false,
  },
  {
    phase: "evening",
    label: "Avond",
    emoji: "🌙",
    intro: "Hoe sluit je de dag af?",
    metricKeys: ["energy_evening", "happiness", "stress", "social_battery", "loneliness"],
    habitKeys: [
      "steps_7000",
      "enough_water",
      "ate_healthy",
      "no_impulse_spending",
      "no_online_gambling",
    ],
    mealKeys: ["dinner"],
    showAlcohol: true,
    showSpending: true,
    showNotes: true,
  },
];

export const MEAL_LABELS: Record<MealKey, { label: string; emoji: string }> = {
  breakfast: { label: "Ontbijt", emoji: "🥣" },
  lunch: { label: "Middagmaal", emoji: "🥗" },
  dinner: { label: "Avondmaal", emoji: "🍽️" },
};

export const MEAL_COLS: Record<MealKey, { eaten: string; healthy: string }> = {
  breakfast: { eaten: "breakfast_eaten", healthy: "breakfast_healthy" },
  lunch: { eaten: "lunch_eaten", healthy: "lunch_healthy" },
  dinner: { eaten: "dinner_eaten", healthy: "dinner_healthy" },
};

export function habitLabel(key: string): string {
  return HABITS.find((h) => h.key === key)?.label ?? key;
}

/** Current phase based on the Brussels hour. */
export function currentPhase(): Phase {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels",
      hour: "2-digit",
      hour12: false,
    })
      .format(new Date())
      .replace(/[^0-9]/g, ""),
  );
  if (h < 12) return "morning";
  if (h < 18) return "noon";
  return "evening";
}

// ------------------------- math helpers -------------------------

export function avg(nums: number[]): number | null {
  const v = nums.filter((n) => n != null && !Number.isNaN(n));
  if (!v.length) return null;
  return v.reduce((s, n) => s + n, 0) / v.length;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Pearson correlation between two equal-length arrays (pairs with nulls dropped). */
export function pearson(
  xs: (number | null)[],
  ys: (number | null)[],
): number | null {
  const pairs: [number, number][] = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x != null && y != null) pairs.push([x, y]);
  }
  const n = pairs.length;
  if (n < 5) return null; // te weinig data voor betekenis

  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

export function corrLabel(r: number): string {
  const a = Math.abs(r);
  const strength =
    a >= 0.6 ? "sterk" : a >= 0.35 ? "duidelijk" : "licht";
  return `${strength} ${r > 0 ? "positief" : "negatief"} verband`;
}

// ------------------------- series builders -------------------------

export interface DayPoint {
  date: string; // label "12 jun"
  iso: string;
  [metric: string]: string | number | null;
}

/** Builds a dense daily series for the last `days` days, with metric values. */
export function buildSeries(
  checkins: DailyCheckin[],
  days = 30,
): DayPoint[] {
  const byDate = new Map<string, DailyCheckin>();
  for (const c of checkins) byDate.set(c.date, c);

  const out: DayPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const c = byDate.get(iso);
    const point: DayPoint = {
      iso,
      date: new Intl.DateTimeFormat("nl-BE", {
        day: "numeric",
        month: "short",
      }).format(d),
    };
    for (const m of ALL_METRICS) {
      point[m.key] = c ? (c[m.key] ?? null) : null;
    }
    out.push(point);
  }
  return out;
}

export function habitCompletionRate(habits: DailyHabits[]): number | null {
  if (!habits.length) return null;
  let done = 0;
  let total = 0;
  for (const h of habits) {
    for (const def of HABITS) {
      const v = h[def.key];
      if (v === true) done++;
      total++;
    }
  }
  return total ? done / total : null;
}
