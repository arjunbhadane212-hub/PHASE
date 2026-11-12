-- BUG: level_for_xp() returns ranks 1-15 since extend_rank_ladder_to_15_prestige_tiers,
-- but users_rank_check still allows only 1-10. The first time a player passes 8,501 XP,
-- complete_habit() writes rank = 11, the CHECK rejects the whole update, and that player
-- can never complete a habit again. Widen the constraint to match the ladder.
-- Applied to production 2026-11-11 (app-overhaul).
alter table public.users drop constraint if exists users_rank_check;
alter table public.users add constraint users_rank_check check (rank between 1 and 15);
