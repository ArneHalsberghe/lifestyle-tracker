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
