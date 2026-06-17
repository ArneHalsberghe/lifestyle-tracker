-- =============================================================
-- Lifestyle Tracker — Apple Health sync via Shortcuts (token)
-- Run AFTER 0010, in Supabase SQL Editor.
-- =============================================================

-- A secret token the iPhone Shortcut uses to push health data.
alter table public.app_settings add column if not exists health_token text;

create unique index if not exists uniq_app_settings_health_token
  on public.app_settings (health_token)
  where health_token is not null;
