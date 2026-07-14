-- Shop catalog rebuild (Part A3): loot box tiers + weighted drop tables.
-- Loot box tiers stay Starter / Delta / Phase (banned: Common/Rare/Ultra-rare
-- as TIER naming). Item-level rarity tags live on shop_items.rarity.

create table if not exists public.loot_boxes (
  id uuid primary key default gen_random_uuid(),
  key text unique not null check (key = any (array['starter','delta','phase'])),
  name text not null,
  price_gems integer not null,
  items_per_open integer not null default 2,
  created_at timestamptz not null default now()
);

create table if not exists public.loot_box_drop_table (
  id uuid primary key default gen_random_uuid(),
  loot_box_id uuid not null references public.loot_boxes(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  weight numeric not null check (weight > 0),
  unique (loot_box_id, shop_item_id)
);
create index if not exists idx_drop_table_box on public.loot_box_drop_table(loot_box_id);

alter table public.loot_boxes enable row level security;
alter table public.loot_box_drop_table enable row level security;
drop policy if exists "loot_boxes world-readable" on public.loot_boxes;
create policy "loot_boxes world-readable" on public.loot_boxes for select using (true);
drop policy if exists "drop_table world-readable" on public.loot_box_drop_table;
create policy "drop_table world-readable" on public.loot_box_drop_table for select using (true);

insert into public.loot_boxes (key, name, price_gems, items_per_open) values
  ('starter','Starter Box',100,2),
  ('delta','Delta Box',500,2),
  ('phase','Phase Box',2000,2)
on conflict (key) do update set name=excluded.name, price_gems=excluded.price_gems, items_per_open=excluded.items_per_open;

-- Reward-direction rule (locked): no phase titles in starter/delta drop tables;
-- no delta titles in starter. Lower-tier items may appear as floor in higher boxes.
with rows(box_key, item_key, weight) as (values
  ('starter','boost_xp_2x',20),('starter','streak_shield',15),('starter','fx_pulse',12),
  ('starter','banner_circuit',8),('starter','banner_grid',8),('starter','banner_pulse',8),
  ('starter','color_main_teal',10),('starter','color_main_orange',10),('starter','color_main_sky_blue',9),
  ('delta','title_enforcer',4),('delta','title_vandal',4),('delta','title_phantom',4),('delta','title_savage',4),
  ('delta','banner_void_fracture',6),('delta','anim_plasma',5),('delta','anim_cosmic',5),
  ('delta','fx_neon_ring',6),('delta','fx_aurora',6),('delta','color_main_amber',6),
  ('delta','boost_xp_3x',8),('delta','streak_shield',10),('delta','boost_xp_2x',10),
  ('phase','title_god_complex',2),('phase','title_anti_hero',2),('phase','title_anomaly',2),
  ('phase','title_executioner',2),('phase','title_cataclysm',2),
  ('phase','anim_supernova',4),('phase','anim_divine_light',3),('phase','banner_void_walker',4),
  ('phase','fx_void_pulse',6),('phase','boost_xp_5x',6),('phase','anim_plasma',6),
  ('phase','title_enforcer',5),('phase','streak_revive',8),('phase','boost_xp_3x',10)
)
insert into public.loot_box_drop_table (loot_box_id, shop_item_id, weight)
select b.id, s.id, r.weight
from rows r
join public.loot_boxes b on b.key = r.box_key
join public.shop_items s on s.key = r.item_key
on conflict (loot_box_id, shop_item_id) do update set weight = excluded.weight;
