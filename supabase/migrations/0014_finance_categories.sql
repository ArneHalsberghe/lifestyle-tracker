-- =============================================================
-- Lifestyle Tracker — financiën met categorieën per maand
-- Run AFTER 0013, in Supabase SQL Editor.
-- =============================================================

-- Herbruikbare inkomsten-/uitgaven-categorieën.
create table if not exists public.finance_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  direction  text not null check (direction in ('in', 'out')),
  sort       integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Bedrag per categorie per maand (maand = 1e van de maand).
create table if not exists public.finance_monthly (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.finance_categories(id) on delete cascade,
  month       date not null,
  amount      numeric(12,2) not null default 0,
  updated_at  timestamptz not null default now(),
  unique (category_id, month)
);

create trigger trg_finance_monthly_updated_at
  before update on public.finance_monthly
  for each row execute function public.set_updated_at();

create index if not exists idx_finance_categories_user on public.finance_categories (user_id);
create index if not exists idx_finance_monthly_user_month on public.finance_monthly (user_id, month);

-- RLS
do $$
declare
  t text;
  tables text[] := array['finance_categories','finance_monthly'];
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
