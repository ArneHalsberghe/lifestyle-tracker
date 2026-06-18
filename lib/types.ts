// Shared domain types for the lifestyle tracker.
// These mirror the database tables defined in supabase/migrations.

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface SleepLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  bedtime: string | null;
  wake_time: string | null;
  duration_min: number | null;
  quality: Rating | null;
  energy_morning: Rating | null;
  notes: string | null;
  created_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  logged_at: string;
  type: "ontbijt" | "lunch" | "diner" | "snack";
  description: string | null;
  calories: number | null;
  photo_url: string | null;
  notes: string | null;
}

export interface Drink {
  id: string;
  user_id: string;
  logged_at: string;
  type: "water" | "koffie" | "thee" | "alcohol" | "fris";
  amount_ml: number | null;
  caffeine_mg: number | null;
  alcohol_units: number | null;
}

export interface Workout {
  id: string;
  user_id: string;
  started_at: string;
  activity_type: string;
  duration_min: number | null;
  distance_km: number | null;
  calories: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  source: "manueel" | "garmin" | "apple_health";
  external_id: string | null;
  notes: string | null;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  notes: string | null;
}

export interface MoodLog {
  id: string;
  user_id: string;
  logged_at: string;
  mood: Rating | null;
  stress: Rating | null;
  tags: string[] | null;
  notes: string | null;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  target_per_week: number | null;
  active: boolean;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
}

// ----------------------- Gambling -----------------------

export type GameType =
  | "poker"
  | "sportweddenschap"
  | "casino"
  | "online"
  | "andere";

export type EntryKind = "in" | "out";

export interface GamblingEntry {
  id: string;
  user_id: string;
  session_id: string;
  kind: EntryKind;
  amount: number;
  label: string | null;
  created_at: string;
}

export interface GamblingSession {
  id: string;
  user_id: string;
  game_type: GameType;
  platform: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
}

// A session with its entries joined in.
export interface GamblingSessionWithEntries extends GamblingSession {
  gambling_entries: GamblingEntry[];
}

export interface GamblingLimit {
  user_id: string;
  weekly_loss_limit: number | null;
  updated_at: string;
}

// ----------------------- Daily check-in -----------------------

export interface DailyCheckin {
  id: string;
  user_id: string;
  date: string;
  energy_morning: number | null;
  energy_noon: number | null;
  energy_evening: number | null;
  fatigue: number | null;
  brain_fog: number | null;
  concentration: number | null;
  tolerance: number | null;
  overstimulation: number | null;
  happiness: number | null;
  stress: number | null;
  anxiety: number | null;
  motivation: number | null;
  social_battery: number | null;
  loneliness: number | null;
  hrv: number | null;
  notes: string | null;
  spending_eur: number | null;
  morning_done: boolean | null;
  noon_done: boolean | null;
  evening_done: boolean | null;
  created_at: string;
}

export interface DailyHabits {
  id: string;
  user_id: string;
  date: string;
  up_before_9: boolean | null;
  no_daytime_sleep: boolean | null;
  steps_7000: boolean | null;
  enough_water: boolean | null;
  ate_healthy: boolean | null;
  no_impulse_spending: boolean | null;
  no_online_gambling: boolean | null;
  slept_on_time: boolean | null;
  household_done: boolean | null;
  created_at: string;
}

// ----------------------- Food & drink -----------------------

export interface FoodDay {
  id: string;
  user_id: string;
  date: string;
  breakfast_eaten: boolean | null;
  breakfast_healthy: boolean | null;
  lunch_eaten: boolean | null;
  lunch_healthy: boolean | null;
  dinner_eaten: boolean | null;
  dinner_healthy: boolean | null;
  alcohol_units: number | null;
  first_caffeine_at: string | null;
  last_caffeine_at: string | null;
  notes: string | null;
}

export interface Snack {
  id: string;
  user_id: string;
  date: string;
  eaten_at: string;
  healthy: boolean | null;
  note: string | null;
}

// ----------------------- Work & money -----------------------

export interface WorkProject {
  id: string;
  user_id: string;
  name: string;
  hourly_rate: number;
  active: boolean;
  created_at: string;
}

export interface WorkLog {
  id: string;
  user_id: string;
  project_id: string;
  date: string;
  hours: number;
  note: string | null;
}

export interface FinanceCategory {
  id: string;
  user_id: string;
  name: string;
  direction: "in" | "out";
  sort: number;
  active: boolean;
}

export interface FinanceMonthly {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  amount: number;
}
