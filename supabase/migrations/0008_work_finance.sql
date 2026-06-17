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
