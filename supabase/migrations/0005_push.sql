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
