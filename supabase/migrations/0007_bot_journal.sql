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

create trigger trg_assistant_memory_updated_at
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

create trigger trg_journal_updated_at
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
