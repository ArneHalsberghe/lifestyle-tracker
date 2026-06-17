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

create trigger trg_app_settings_updated_at
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
