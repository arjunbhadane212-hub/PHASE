-- Covering indexes for foreign keys flagged by the Supabase performance advisor.
-- Additive only. Applied to production 2026-11-11 (app-overhaul).
create index if not exists focus_sessions_habit_id_idx        on public.focus_sessions (habit_id);
create index if not exists loot_box_drop_table_shop_item_idx  on public.loot_box_drop_table (shop_item_id);
create index if not exists user_equipped_shop_item_idx        on public.user_equipped (shop_item_id);
create index if not exists user_inventory_shop_item_idx       on public.user_inventory (shop_item_id);
