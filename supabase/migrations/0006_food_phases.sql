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
