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

create trigger trg_integrations_updated_at
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
