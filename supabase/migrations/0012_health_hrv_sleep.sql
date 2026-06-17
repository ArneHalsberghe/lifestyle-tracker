-- =============================================================
-- Lifestyle Tracker — extra Health-data: HRV + slaap uit Health
-- Run AFTER 0011, in Supabase SQL Editor.
-- (resting_hr bestaat al op daily_activity sinds 0001.)
-- =============================================================

alter table public.daily_activity add column if not exists hrv       integer;
alter table public.daily_activity add column if not exists sleep_min integer;
