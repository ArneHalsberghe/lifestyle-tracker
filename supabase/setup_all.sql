-- Lifestyle Tracker — VOLLEDIGE database setup (herhaalbaar)
-- Plak in Supabase > SQL Editor en Run.

-- >>>>>>>>>>>>>>>>>>>> 0001_init.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — initial schema
-- Run this in Supabase: SQL Editor > New query > paste > Run.
-- =============================================================

-- ---------- helper: updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================
-- SLEEP & ENERGY
-- =============================================================
create table if not exists public.sleep_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  date           date not null,
  bedtime        time,
  wake_time      time,
  duration_min   integer,
  quality        smallint check (quality between 1 and 5),
  energy_morning smallint check (energy_morning between 1 and 5),
  notes          text,
  created_at     timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.energy_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  logged_at  timestamptz not null default now(),
  level      smallint check (level between 1 and 5),
  note       text
);

-- =============================================================
-- FOOD & DRINK
-- =============================================================
create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_at   timestamptz not null default now(),
  type        text not null check (type in ('ontbijt','lunch','diner','snack')),
  description text,
  calories    integer,
  photo_url   text,
  notes       text
);

create table if not exists public.drinks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  logged_at     timestamptz not null default now(),
  type          text not null check (type in ('water','koffie','thee','alcohol','fris')),
  amount_ml     integer,
  caffeine_mg   integer,
  alcohol_units numeric(4,2)
);

-- =============================================================
-- MOVEMENT & SPORT
-- =============================================================
create table if not exists public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  started_at    timestamptz not null default now(),
  activity_type text not null,
  duration_min  integer,
  distance_km   numeric(6,2),
  calories      integer,
  avg_hr        integer,
  max_hr        integer,
  source        text not null default 'manueel' check (source in ('manueel','garmin','apple_health')),
  external_id   text,
  notes         text,
  unique (source, external_id)
);

create table if not exists public.body_measurements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  weight_kg    numeric(5,2),
  body_fat_pct numeric(4,1),
  waist_cm     numeric(5,1),
  notes        text,
  unique (user_id, date)
);

create table if not exists public.daily_activity (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  steps           integer,
  active_calories integer,
  resting_hr      integer,
  floors          integer,
  source          text not null default 'manueel',
  unique (user_id, date, source)
);

-- =============================================================
-- MOOD & HABITS
-- =============================================================
create table if not exists public.mood_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  logged_at  timestamptz not null default now(),
  mood       smallint check (mood between 1 and 5),
  stress     smallint check (stress between 1 and 5),
  tags       text[],
  notes      text
);

create table if not exists public.habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  icon            text,
  target_per_week smallint,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  habit_id  uuid not null references public.habits(id) on delete cascade,
  date      date not null,
  completed boolean not null default true,
  unique (habit_id, date)
);

-- =============================================================
-- INTEGRATIONS (Garmin, Apple Health)
-- =============================================================
create table if not exists public.integrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null check (provider in ('garmin','apple_health')),
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  last_sync_at  timestamptz,
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);

create or replace trigger trg_integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

-- Flexible store for raw imported metrics that don't fit a typed table yet.
create table if not exists public.raw_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  source      text not null,
  metric_type text not null,
  recorded_at timestamptz not null,
  value       numeric,
  unit        text,
  created_at  timestamptz not null default now()
);

-- =============================================================
-- INDEXES (query by user + time)
-- =============================================================
create index if not exists idx_sleep_logs_user_date    on public.sleep_logs (user_id, date desc);
create index if not exists idx_energy_logs_user_time    on public.energy_logs (user_id, logged_at desc);
create index if not exists idx_meals_user_time          on public.meals (user_id, logged_at desc);
create index if not exists idx_drinks_user_time         on public.drinks (user_id, logged_at desc);
create index if not exists idx_workouts_user_time       on public.workouts (user_id, started_at desc);
create index if not exists idx_body_user_date           on public.body_measurements (user_id, date desc);
create index if not exists idx_daily_activity_user_date on public.daily_activity (user_id, date desc);
create index if not exists idx_mood_logs_user_time      on public.mood_logs (user_id, logged_at desc);
create index if not exists idx_habit_logs_user_date     on public.habit_logs (user_id, date desc);
create index if not exists idx_raw_metrics_user_time    on public.raw_metrics (user_id, recorded_at desc);

-- =============================================================
-- ROW LEVEL SECURITY
-- Every table: a user can only see/modify their own rows.
-- =============================================================
do $$
declare
  t text;
  tables text[] := array[
    'sleep_logs','energy_logs','meals','drinks','workouts',
    'body_measurements','daily_activity','mood_logs','habits',
    'habit_logs','integrations','raw_metrics'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "own_rows_select" on public.%I;', t);
    execute format('create policy "own_rows_select" on public.%I for select using (auth.uid() = user_id);', t);

    execute format('drop policy if exists "own_rows_insert" on public.%I;', t);
    execute format('create policy "own_rows_insert" on public.%I for insert with check (auth.uid() = user_id);', t);

    execute format('drop policy if exists "own_rows_update" on public.%I;', t);
    execute format('create policy "own_rows_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);

    execute format('drop policy if exists "own_rows_delete" on public.%I;', t);
    execute format('create policy "own_rows_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- >>>>>>>>>>>>>>>>>>>> 0002_gambling.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — gambling module
-- Run AFTER 0001_init.sql, in Supabase SQL Editor.
-- =============================================================

-- A gambling session (one sitting). Money in/out is tracked per entry,
-- so it works for poker (buy-in + rebuys), sports bets (one stake),
-- casino and online (deposits can be topped up any time).
create table if not exists public.gambling_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  game_type   text not null check (game_type in
                ('poker','sportweddenschap','casino','online','andere')),
  platform    text,                       -- site of locatie (optioneel)
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,                -- null = sessie loopt nog
  notes       text,
  created_at  timestamptz not null default now()
);

-- Individual money movements within a session.
--   kind = 'in'  -> buy-in, rebuy, storting, inzet  (geld erin)
--   kind = 'out' -> cashout, winst, uitbetaling     (geld eruit)
create table if not exists public.gambling_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  uuid not null references public.gambling_sessions(id) on delete cascade,
  kind        text not null check (kind in ('in','out')),
  amount      numeric(10,2) not null check (amount >= 0),
  label       text,                       -- 'buy-in', 'rebuy', 'cashout', ...
  created_at  timestamptz not null default now()
);

-- A single weekly loss budget per user (optional warning threshold).
create table if not exists public.gambling_limits (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  weekly_loss_limit numeric(10,2),        -- max netto verlies per week (EUR)
  updated_at        timestamptz not null default now()
);

create or replace trigger trg_gambling_limits_updated_at
  before update on public.gambling_limits
  for each row execute function public.set_updated_at();

-- ---------- indexes ----------
create index if not exists idx_gambling_sessions_user_time
  on public.gambling_sessions (user_id, started_at desc);
create index if not exists idx_gambling_sessions_active
  on public.gambling_sessions (user_id) where ended_at is null;
create index if not exists idx_gambling_entries_session
  on public.gambling_entries (session_id);
create index if not exists idx_gambling_entries_user_time
  on public.gambling_entries (user_id, created_at desc);

-- ---------- Row Level Security ----------
do $$
declare
  t text;
  tables text[] := array['gambling_sessions','gambling_entries','gambling_limits'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "own_rows_select" on public.%I;', t);
    execute format('create policy "own_rows_select" on public.%I for select using (auth.uid() = user_id);', t);

    execute format('drop policy if exists "own_rows_insert" on public.%I;', t);
    execute format('create policy "own_rows_insert" on public.%I for insert with check (auth.uid() = user_id);', t);

    execute format('drop policy if exists "own_rows_update" on public.%I;', t);
    execute format('create policy "own_rows_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);

    execute format('drop policy if exists "own_rows_delete" on public.%I;', t);
    execute format('create policy "own_rows_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- >>>>>>>>>>>>>>>>>>>> 0003_full_profile.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — full personal dashboard schema
-- Run AFTER 0001 and 0002, in Supabase SQL Editor.
-- Covers: daily check-in (energy/fatigue/mood 1-10), habits checklist,
-- nutrition, Fabry, work, finance, crypto, social, and the profile.
-- =============================================================

-- ---------- PROFILE (static personal info + report) ----------
create table if not exists public.user_profile (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  birthdate      date,
  height_cm      integer,
  location       text,
  occupation     text,
  languages      text,
  medical_notes  text,   -- Fabry, epilepsie, medicatie, ...
  goals          text,   -- levensdoelen
  kpis           text,   -- belangrijkste KPI's / succesindicatoren
  report         text,   -- volledig ChatGPT-rapport (vrije tekst)
  updated_at     timestamptz not null default now()
);

create or replace trigger trg_user_profile_updated_at
  before update on public.user_profile
  for each row execute function public.set_updated_at();

-- ---------- DAILY CHECK-IN (subjectieve metrics, schaal 1-10) ----------
create table if not exists public.daily_checkins (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  -- energie
  energy_morning  smallint check (energy_morning between 1 and 10),
  energy_noon     smallint check (energy_noon between 1 and 10),
  energy_evening  smallint check (energy_evening between 1 and 10),
  -- vermoeidheid / Fabry
  fatigue         smallint check (fatigue between 1 and 10),
  brain_fog       smallint check (brain_fog between 1 and 10),
  concentration   smallint check (concentration between 1 and 10),
  tolerance       smallint check (tolerance between 1 and 10),     -- belastbaarheid
  overstimulation smallint check (overstimulation between 1 and 10),
  -- gemoed
  happiness       smallint check (happiness between 1 and 10),
  stress          smallint check (stress between 1 and 10),
  anxiety         smallint check (anxiety between 1 and 10),
  motivation      smallint check (motivation between 1 and 10),
  -- sociaal
  social_battery  smallint check (social_battery between 1 and 10),
  loneliness      smallint check (loneliness between 1 and 10),
  notes           text,
  created_at      timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------- DAILY HABITS (vaste checklist) ----------
create table if not exists public.daily_habits (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  date                  date not null,
  up_before_9           boolean,
  no_daytime_sleep      boolean,   -- niet geslapen 09:00-22:00
  steps_7000            boolean,
  enough_water          boolean,
  ate_healthy           boolean,
  no_impulse_spending   boolean,
  no_online_gambling    boolean,
  slept_on_time         boolean,
  created_at            timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------- NUTRITION (dagelijkse totalen) ----------
create table if not exists public.nutrition_days (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  calories      integer,
  protein_g     integer,
  carbs_g       integer,
  fat_g         integer,
  water_ml      integer,
  fastfood      boolean,
  alcohol_units numeric(4,2),
  soda_ml       integer,
  snack_count   smallint,
  notes         text,
  unique (user_id, date)
);

-- ---------- FABRY (maandelijkse infusie) ----------
create table if not exists public.fabry_infusions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  product       text default 'Elfabrio',
  side_effects  text,
  recovery_days smallint,
  notes         text
);

-- ---------- WORK (dagelijkse activiteit) ----------
create table if not exists public.work_days (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  date           date not null,
  hours_worked   numeric(4,1),
  leads_called   integer,
  conversations  integer,
  appointments   integer,
  demos          integer,
  deals          integer,
  revenue        numeric(10,2),
  notes          text,
  unique (user_id, date)
);

-- ---------- FINANCE: net worth snapshots ----------
create table if not exists public.net_worth_snapshots (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  bank         numeric(12,2),
  savings      numeric(12,2),
  crypto       numeric(12,2),
  real_estate  numeric(12,2),
  other        numeric(12,2),
  notes        text,
  unique (user_id, date)
);

-- ---------- FINANCE: transactions (inkomen/uitgaven) ----------
create table if not exists public.finance_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  direction  text not null check (direction in ('in','out')),
  category   text,     -- omzet, commissie, vastgoed, privé, bedrijfskosten, abonnement
  amount     numeric(12,2) not null check (amount >= 0),
  label      text,
  created_at timestamptz not null default now()
);

-- ---------- CRYPTO positions ----------
create table if not exists public.crypto_positions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  asset         text not null,           -- XRP, BTC, ...
  units         numeric(20,8),
  invested      numeric(12,2),
  current_value numeric(12,2),
  updated_at    timestamptz not null default now()
);

-- ---------- SOCIAL events ----------
create table if not exists public.social_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  type        text check (type in ('date','vrienden','familie','activiteit','andere')),
  description text,
  hours       numeric(4,1)
);

-- ---------- ALTER existing tables to match the profile ----------
-- Sleep: add fell-asleep, naps, sleep score, body battery, HRV, resting HR.
alter table public.sleep_logs add column if not exists fell_asleep   time;
alter table public.sleep_logs add column if not exists naps_min      integer;
alter table public.sleep_logs add column if not exists sleep_score   smallint;
alter table public.sleep_logs add column if not exists body_battery  smallint;
alter table public.sleep_logs add column if not exists hrv           integer;
alter table public.sleep_logs add column if not exists resting_hr    integer;

-- Body composition (weekly metrics).
alter table public.body_measurements add column if not exists bmi            numeric(4,1);
alter table public.body_measurements add column if not exists muscle_mass_kg numeric(5,2);
alter table public.body_measurements add column if not exists body_water_pct numeric(4,1);
alter table public.body_measurements add column if not exists visceral_fat   smallint;

-- Movement: active minutes alongside steps/calories.
alter table public.daily_activity add column if not exists active_minutes integer;

-- ---------- indexes ----------
create index if not exists idx_daily_checkins_user_date on public.daily_checkins (user_id, date desc);
create index if not exists idx_daily_habits_user_date    on public.daily_habits (user_id, date desc);
create index if not exists idx_nutrition_days_user_date  on public.nutrition_days (user_id, date desc);
create index if not exists idx_fabry_user_date           on public.fabry_infusions (user_id, date desc);
create index if not exists idx_work_days_user_date       on public.work_days (user_id, date desc);
create index if not exists idx_networth_user_date        on public.net_worth_snapshots (user_id, date desc);
create index if not exists idx_finance_tx_user_date      on public.finance_transactions (user_id, date desc);
create index if not exists idx_crypto_user               on public.crypto_positions (user_id);
create index if not exists idx_social_user_date          on public.social_events (user_id, date desc);

-- ---------- Row Level Security ----------
do $$
declare
  t text;
  tables text[] := array[
    'user_profile','daily_checkins','daily_habits','nutrition_days',
    'fabry_infusions','work_days','net_worth_snapshots','finance_transactions',
    'crypto_positions','social_events'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "own_rows_select" on public.%I;', t);
    execute format('create policy "own_rows_select" on public.%I for select using (auth.uid() = user_id);', t);

    execute format('drop policy if exists "own_rows_insert" on public.%I;', t);
    execute format('create policy "own_rows_insert" on public.%I for insert with check (auth.uid() = user_id);', t);

    execute format('drop policy if exists "own_rows_update" on public.%I;', t);
    execute format('create policy "own_rows_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);

    execute format('drop policy if exists "own_rows_delete" on public.%I;', t);
    execute format('create policy "own_rows_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- >>>>>>>>>>>>>>>>>>>> 0004_sleep_buttons.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — sleep buttons + naps
-- Run AFTER 0003, in Supabase SQL Editor.
-- =============================================================

-- Timestamps captured by the "telefoon weg" / "dag starten" buttons.
alter table public.sleep_logs add column if not exists sleep_start_at timestamptz;
alter table public.sleep_logs add column if not exists wake_at        timestamptz;

create index if not exists idx_sleep_logs_open_night
  on public.sleep_logs (user_id)
  where wake_at is null and sleep_start_at is not null;

-- Daytime naps (goal = 0/day; log them if they happen).
create table if not exists public.naps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  started_at   timestamptz not null default now(),
  duration_min integer,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_naps_user_date on public.naps (user_id, date desc);

-- RLS for naps
alter table public.naps enable row level security;

drop policy if exists "own_rows_select" on public.naps;
create policy "own_rows_select" on public.naps for select using (auth.uid() = user_id);

drop policy if exists "own_rows_insert" on public.naps;
create policy "own_rows_insert" on public.naps for insert with check (auth.uid() = user_id);

drop policy if exists "own_rows_update" on public.naps;
create policy "own_rows_update" on public.naps for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_rows_delete" on public.naps;
create policy "own_rows_delete" on public.naps for delete using (auth.uid() = user_id);

-- >>>>>>>>>>>>>>>>>>>> 0005_push.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — web push (notifications)
-- Run AFTER 0004, in Supabase SQL Editor.
-- =============================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subs_user on public.push_subscriptions (user_id);

-- Dedupe log so a reminder is sent at most once per day, even if the
-- cron endpoint is pinged multiple times.
create table if not exists public.reminder_log (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  reminder_key text not null,
  sent_at      timestamptz not null default now(),
  unique (date, reminder_key)
);

-- RLS: users manage their own subscriptions. The cron/send routes use the
-- service-role key, which bypasses RLS.
alter table public.push_subscriptions enable row level security;

drop policy if exists "own_rows_select" on public.push_subscriptions;
create policy "own_rows_select" on public.push_subscriptions for select using (auth.uid() = user_id);

drop policy if exists "own_rows_insert" on public.push_subscriptions;
create policy "own_rows_insert" on public.push_subscriptions for insert with check (auth.uid() = user_id);

drop policy if exists "own_rows_update" on public.push_subscriptions;
create policy "own_rows_update" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_rows_delete" on public.push_subscriptions;
create policy "own_rows_delete" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- reminder_log is only touched by the service role; lock it for normal users.
alter table public.reminder_log enable row level security;

-- >>>>>>>>>>>>>>>>>>>> 0006_food_phases.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — food (no calorie counting) + check-in phases
-- Run AFTER 0005, in Supabase SQL Editor.
-- =============================================================

-- Per-day food log: did you eat each meal, and was it healthy?
-- Plus alcohol and first/last caffeine moments.
create table if not exists public.food_days (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null,
  breakfast_eaten   boolean,
  breakfast_healthy boolean,
  lunch_eaten       boolean,
  lunch_healthy     boolean,
  dinner_eaten      boolean,
  dinner_healthy    boolean,
  alcohol_units     numeric(4,1),
  first_caffeine_at timestamptz,
  last_caffeine_at  timestamptz,
  notes             text,
  updated_at        timestamptz not null default now(),
  unique (user_id, date)
);

create or replace trigger trg_food_days_updated_at
  before update on public.food_days
  for each row execute function public.set_updated_at();

-- Individual snacks (multiple per day), with healthy flag and time.
create table if not exists public.snacks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  eaten_at   timestamptz not null default now(),
  healthy    boolean,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_food_days_user_date on public.food_days (user_id, date desc);
create index if not exists idx_snacks_user_date     on public.snacks (user_id, date desc);

-- Track which of the 3 daily check-ins are done.
alter table public.daily_checkins add column if not exists morning_done boolean default false;
alter table public.daily_checkins add column if not exists noon_done    boolean default false;
alter table public.daily_checkins add column if not exists evening_done boolean default false;

-- RLS
do $$
declare
  t text;
  tables text[] := array['food_days','snacks'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "own_rows_select" on public.%I;', t);
    execute format('create policy "own_rows_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_insert" on public.%I;', t);
    execute format('create policy "own_rows_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_update" on public.%I;', t);
    execute format('create policy "own_rows_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_delete" on public.%I;', t);
    execute format('create policy "own_rows_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- >>>>>>>>>>>>>>>>>>>> 0007_bot_journal.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — health bot + journal
-- Run AFTER 0006, in Supabase SQL Editor.
-- =============================================================

-- Chat history with the assistant (one rolling thread per user).
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_user_time
  on public.chat_messages (user_id, created_at);

-- A single evolving "memory" the assistant maintains: current mood,
-- what you're working on, recurring concerns, preferences, ...
create table if not exists public.assistant_memory (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  content    text,
  updated_at timestamptz not null default now()
);

create or replace trigger trg_assistant_memory_updated_at
  before update on public.assistant_memory
  for each row execute function public.set_updated_at();

-- Journal: bot-generated daily summaries ('bot') and your own notes ('self').
create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  content    text not null,
  source     text not null default 'self' check (source in ('bot', 'self')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one bot-summary per day; self notes can be multiple.
create unique index if not exists uniq_journal_bot_per_day
  on public.journal_entries (user_id, date)
  where source = 'bot';

create index if not exists idx_journal_user_date
  on public.journal_entries (user_id, date desc);

create or replace trigger trg_journal_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- RLS
do $$
declare
  t text;
  tables text[] := array['chat_messages','assistant_memory','journal_entries'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "own_rows_select" on public.%I;', t);
    execute format('create policy "own_rows_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_insert" on public.%I;', t);
    execute format('create policy "own_rows_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_update" on public.%I;', t);
    execute format('create policy "own_rows_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_delete" on public.%I;', t);
    execute format('create policy "own_rows_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- >>>>>>>>>>>>>>>>>>>> 0008_work_finance.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — freelance werk + geld
-- Run AFTER 0007, in Supabase SQL Editor.
-- =============================================================

-- Freelance projects/tasks with an hourly rate.
create table if not exists public.work_projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  hourly_rate numeric(8,2) not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Hours worked per project per day. Earnings = hours * project.hourly_rate.
create table if not exists public.work_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.work_projects(id) on delete cascade,
  date       date not null,
  hours      numeric(5,2) not null default 0,
  note       text,
  created_at timestamptz not null default now(),
  unique (project_id, date)
);

-- Fixed monthly costs (rent, gas, electricity, ...) for context.
create table if not exists public.finance_settings (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  monthly_fixed_costs numeric(10,2),
  updated_at          timestamptz not null default now()
);

create or replace trigger trg_finance_settings_updated_at
  before update on public.finance_settings
  for each row execute function public.set_updated_at();

-- Daily discretionary spending (outside the fixed monthly costs).
alter table public.daily_checkins add column if not exists spending_eur numeric(10,2);

create index if not exists idx_work_projects_user on public.work_projects (user_id);
create index if not exists idx_work_logs_user_date on public.work_logs (user_id, date desc);

-- RLS
do $$
declare
  t text;
  tables text[] := array['work_projects','work_logs','finance_settings'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "own_rows_select" on public.%I;', t);
    execute format('create policy "own_rows_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_insert" on public.%I;', t);
    execute format('create policy "own_rows_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_update" on public.%I;', t);
    execute format('create policy "own_rows_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_delete" on public.%I;', t);
    execute format('create policy "own_rows_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- >>>>>>>>>>>>>>>>>>>> 0009_settings.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — app settings, belasting, huishouden
-- Run AFTER 0008, in Supabase SQL Editor.
-- =============================================================

-- Belastingvoet voor zelfstandige inkomsten (default ~50%).
alter table public.finance_settings
  add column if not exists income_tax_rate numeric(4,2) default 0.50;

-- App-instellingen (gedrag).
create table if not exists public.app_settings (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  household_enabled  boolean not null default true,
  household_minutes  integer not null default 10,
  updated_at         timestamptz not null default now()
);

create or replace trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Dagelijks huishouden afvinken.
alter table public.daily_habits add column if not exists household_done boolean;

-- RLS
alter table public.app_settings enable row level security;

drop policy if exists "own_rows_select" on public.app_settings;
create policy "own_rows_select" on public.app_settings for select using (auth.uid() = user_id);

drop policy if exists "own_rows_insert" on public.app_settings;
create policy "own_rows_insert" on public.app_settings for insert with check (auth.uid() = user_id);

drop policy if exists "own_rows_update" on public.app_settings;
create policy "own_rows_update" on public.app_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_rows_delete" on public.app_settings;
create policy "own_rows_delete" on public.app_settings for delete using (auth.uid() = user_id);

-- >>>>>>>>>>>>>>>>>>>> 0010_reminder_prefs.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — instelbare meldingen (toggle + uur)
-- Run AFTER 0009, in Supabase SQL Editor.
-- =============================================================

create table if not exists public.reminder_prefs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  reminder_key text not null,
  enabled      boolean not null default true,
  hour         smallint not null,
  minute       smallint not null default 0,
  updated_at   timestamptz not null default now(),
  unique (user_id, reminder_key)
);

create or replace trigger trg_reminder_prefs_updated_at
  before update on public.reminder_prefs
  for each row execute function public.set_updated_at();

create index if not exists idx_reminder_prefs_user on public.reminder_prefs (user_id);

alter table public.reminder_prefs enable row level security;

drop policy if exists "own_rows_select" on public.reminder_prefs;
create policy "own_rows_select" on public.reminder_prefs for select using (auth.uid() = user_id);

drop policy if exists "own_rows_insert" on public.reminder_prefs;
create policy "own_rows_insert" on public.reminder_prefs for insert with check (auth.uid() = user_id);

drop policy if exists "own_rows_update" on public.reminder_prefs;
create policy "own_rows_update" on public.reminder_prefs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_rows_delete" on public.reminder_prefs;
create policy "own_rows_delete" on public.reminder_prefs for delete using (auth.uid() = user_id);

-- >>>>>>>>>>>>>>>>>>>> 0011_health_token.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — Apple Health sync via Shortcuts (token)
-- Run AFTER 0010, in Supabase SQL Editor.
-- =============================================================

-- A secret token the iPhone Shortcut uses to push health data.
alter table public.app_settings add column if not exists health_token text;

create unique index if not exists uniq_app_settings_health_token
  on public.app_settings (health_token)
  where health_token is not null;

-- >>>>>>>>>>>>>>>>>>>> 0012_health_hrv_sleep.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — extra Health-data: HRV + slaap uit Health
-- Run AFTER 0011, in Supabase SQL Editor.
-- (resting_hr bestaat al op daily_activity sinds 0001.)
-- =============================================================

alter table public.daily_activity add column if not exists hrv       integer;
alter table public.daily_activity add column if not exists sleep_min integer;

-- >>>>>>>>>>>>>>>>>>>> 0013_checkin_hrv.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — HRV manueel in de check-in
-- Run AFTER 0012, in Supabase SQL Editor.
-- (HRV zit niet in Arne's Apple Health, dus manueel invoeren.)
-- =============================================================

alter table public.daily_checkins add column if not exists hrv integer;

-- >>>>>>>>>>>>>>>>>>>> 0014_finance_categories.sql <<<<<<<<<<<<<<<<<<<<

-- =============================================================
-- Lifestyle Tracker — financiën met categorieën per maand
-- Run AFTER 0013, in Supabase SQL Editor.
-- =============================================================

-- Herbruikbare inkomsten-/uitgaven-categorieën.
create table if not exists public.finance_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  direction  text not null check (direction in ('in', 'out')),
  sort       integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Bedrag per categorie per maand (maand = 1e van de maand).
create table if not exists public.finance_monthly (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.finance_categories(id) on delete cascade,
  month       date not null,
  amount      numeric(12,2) not null default 0,
  updated_at  timestamptz not null default now(),
  unique (category_id, month)
);

create or replace trigger trg_finance_monthly_updated_at
  before update on public.finance_monthly
  for each row execute function public.set_updated_at();

create index if not exists idx_finance_categories_user on public.finance_categories (user_id);
create index if not exists idx_finance_monthly_user_month on public.finance_monthly (user_id, month);

-- RLS
do $$
declare
  t text;
  tables text[] := array['finance_categories','finance_monthly'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "own_rows_select" on public.%I;', t);
    execute format('create policy "own_rows_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_insert" on public.%I;', t);
    execute format('create policy "own_rows_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_update" on public.%I;', t);
    execute format('create policy "own_rows_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_rows_delete" on public.%I;', t);
    execute format('create policy "own_rows_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;
