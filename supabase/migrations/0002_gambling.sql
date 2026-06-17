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
