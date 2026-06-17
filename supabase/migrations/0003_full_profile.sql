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

create trigger trg_user_profile_updated_at
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
