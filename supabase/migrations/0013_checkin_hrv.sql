-- =============================================================
-- Lifestyle Tracker — HRV manueel in de check-in
-- Run AFTER 0012, in Supabase SQL Editor.
-- (HRV zit niet in Arne's Apple Health, dus manueel invoeren.)
-- =============================================================

alter table public.daily_checkins add column if not exists hrv integer;
