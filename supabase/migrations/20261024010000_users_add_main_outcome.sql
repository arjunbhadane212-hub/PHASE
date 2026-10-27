-- Onboarding question 3 ("6 months from now, what would mean this worked?")
-- is stored here. The old download_reason columns stay in place, unused.
-- Applied to production 2026-10-23.
alter table public.users add column if not exists main_outcome text;
