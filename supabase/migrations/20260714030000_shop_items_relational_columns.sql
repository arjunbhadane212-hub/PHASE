-- Shop catalog rebuild (Part A1): new canonical columns on shop_items.
-- NOTE: depends on the concurrent Shield/Revive session's migration
-- (20260714000000_streak_shields_penalties.sql) which adds the
-- streak_shields/streak_revives counter columns and the streak_shield/
-- streak_revive shop rows. Additive; existing rows untouched.

alter table public.shop_items
  add column if not exists rarity text,
  add column if not exists hex_value text,
  add column if not exists gradient_value text,
  add column if not exists max_owned integer,
  add column if not exists box_only boolean not null default false;

-- Box-only items (titles) have no direct gem price.
alter table public.shop_items
  alter column price_gems drop not null;

-- Widen the category CHECK to the new lowercase taxonomy while keeping the
-- old capitalized values valid so the concurrent session's rows don't break.
alter table public.shop_items
  drop constraint if exists shop_items_category_check;
alter table public.shop_items
  add constraint shop_items_category_check check (category = any (array[
    'boost','color_main','color_banner','anim','banner','effect','title',
    'Boosts','Colors','Anims','Banners','Effects','Titles','Battles'
  ]));

-- Item-level rarity tag values (allowed system; NOT the loot-box tier naming).
alter table public.shop_items
  drop constraint if exists shop_items_rarity_check;
alter table public.shop_items
  add constraint shop_items_rarity_check
  check (rarity is null or rarity = any (array['common','rare','legendary','mythic']));
