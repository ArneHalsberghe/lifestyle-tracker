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

create trigger trg_reminder_prefs_updated_at
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
