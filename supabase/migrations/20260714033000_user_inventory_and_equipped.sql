-- Shop catalog rebuild (Part A4): relational ownership + equipped state.
-- These replace the drift-prone unlocked_* jsonb columns as the single source
-- of truth (the old columns caused the fake "Banners (6)" count in QA).
-- The legacy jsonb/equipped columns are kept for now as a transition bridge and
-- should be dropped once all readers + the concurrent session are migrated.

create table if not exists public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  quantity integer not null default 1 check (quantity >= 0),
  acquired_at timestamptz not null default now(),
  acquired_via text not null default 'purchase' check (acquired_via = any (array['purchase','loot_box','seed'])),
  unique (user_id, shop_item_id)
);
create index if not exists idx_user_inventory_user on public.user_inventory(user_id);

create table if not exists public.user_equipped (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null check (category = any (array['color_main','color_banner','anim','banner','effect','title'])),
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);
create index if not exists idx_user_equipped_user on public.user_equipped(user_id);

alter table public.user_inventory enable row level security;
alter table public.user_equipped enable row level security;
drop policy if exists "own inventory readable" on public.user_inventory;
create policy "own inventory readable" on public.user_inventory for select using (auth.uid() = user_id);
drop policy if exists "own equipped readable" on public.user_equipped;
create policy "own equipped readable" on public.user_equipped for select using (auth.uid() = user_id);

-- Best-effort migration of existing jsonb ownership into inventory.
insert into public.user_inventory (user_id, shop_item_id, quantity, acquired_via)
select u.id, s.id, 1, 'seed'
from public.users u
join lateral (
  select jsonb_array_elements_text(u.unlocked_effects) as k union all
  select jsonb_array_elements_text(u.unlocked_animations) union all
  select jsonb_array_elements_text(u.unlocked_banners) union all
  select jsonb_array_elements_text(u.unlocked_titles)
) keys on true
join public.shop_items s on s.key = keys.k
on conflict (user_id, shop_item_id) do nothing;

insert into public.user_inventory (user_id, shop_item_id, quantity, acquired_via)
select u.id, s.id, 1, 'seed'
from public.users u
join lateral (
  select jsonb_array_elements_text(u.unlocked_main_colors) as hex, 'color_main' as cat union all
  select jsonb_array_elements_text(u.unlocked_banner_colors), 'color_banner'
) c on true
join public.shop_items s on s.hex_value = c.hex and s.category = c.cat
on conflict (user_id, shop_item_id) do nothing;

-- Seed Vibrant Blue as the default-owned main color for every user.
insert into public.user_inventory (user_id, shop_item_id, quantity, acquired_via)
select u.id, s.id, 1, 'seed'
from public.users u
cross join public.shop_items s
where s.key = 'color_main_vibrant_blue'
on conflict (user_id, shop_item_id) do nothing;

-- Migrate equipped state (key-based) into user_equipped.
insert into public.user_equipped (user_id, category, shop_item_id)
select u.id, m.cat, s.id
from public.users u
join lateral (values
  ('effect', u.equipped_decoration),
  ('anim',   u.equipped_animation),
  ('banner', u.equipped_banner),
  ('title',  u.equipped_title)
) m(cat, k) on true
join public.shop_items s on s.key = m.k and s.category = m.cat
on conflict (user_id, category) do nothing;

-- Equipped colors (hex-based); ignore the #1F2937 placeholder default.
insert into public.user_equipped (user_id, category, shop_item_id)
select u.id, m.cat, s.id
from public.users u
join lateral (values
  ('color_main',   u.selected_main_color),
  ('color_banner', u.selected_banner_color)
) m(cat, hex) on true
join public.shop_items s on s.hex_value = m.hex and s.category = m.cat
where m.hex is not null and m.hex <> '#1F2937'
on conflict (user_id, category) do nothing;

-- Default equipped main color to Vibrant Blue for anyone without one.
insert into public.user_equipped (user_id, category, shop_item_id)
select u.id, 'color_main', s.id
from public.users u
cross join public.shop_items s
where s.key = 'color_main_vibrant_blue'
on conflict (user_id, category) do nothing;

update public.users set selected_main_color = '#2563EB'
where selected_main_color = '#1F2937';
