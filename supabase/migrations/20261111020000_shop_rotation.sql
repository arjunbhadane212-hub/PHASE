-- Rotating shop (2026-11-11)
--
-- The shop used to show the entire catalogue forever, so there was never a
-- reason to come back to it. Now it restocks every cycle (24h, 00:00 UTC) with
-- a fresh hand-picked subset per section — the same shop for everyone, so
-- "did you see today's shop" is a shared moment.
--
-- Sections (rotating): titles 4 · banners 3 · animations 2 · profile effects 3.
-- Always stocked:      boosts/essentials, mystery boxes.
-- Each cycle also marks ONE featured item (the day's showpiece, legendary+ when
-- available) and ONE daily deal (30% off, never the featured item).
--
-- Rotation is persisted (shop_rotations) and generated lazily on first read,
-- under an advisory lock, so every client sees an identical shop and the
-- server can enforce it: purchase_shop_item rejects a rotating item that is
-- not in today's shop (with a 5-minute grace after a restock so a purchase in
-- flight at midnight still lands) and charges the deal price when it applies.
-- Items shown in the previous cycle are deprioritised so a restock always
-- brings something new.

-- ── config ──────────────────────────────────────────────────────────────────
insert into public.game_config (key, value, description) values
  ('shop_cycle_hours', 24, 'Hours per shop rotation cycle (aligned to UTC epoch)'),
  ('shop_slots_title', 4, 'Rotating title slots per cycle'),
  ('shop_slots_banner', 3, 'Rotating banner slots per cycle'),
  ('shop_slots_anim', 2, 'Rotating animation slots per cycle'),
  ('shop_slots_effect', 3, 'Rotating profile-effect slots per cycle'),
  ('shop_deal_pct', 30, 'Daily deal discount percent')
on conflict (key) do nothing;

-- ── storage ─────────────────────────────────────────────────────────────────
create table if not exists public.shop_rotations (
  cycle        int  not null,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  category     text not null,
  position     int  not null,
  featured     boolean not null default false,
  deal_price   int,
  created_at   timestamptz not null default now(),
  primary key (cycle, shop_item_id)
);
create index if not exists shop_rotations_item_idx on public.shop_rotations (shop_item_id);
alter table public.shop_rotations enable row level security;
drop policy if exists "shop rotation is public to signed-in users" on public.shop_rotations;
create policy "shop rotation is public to signed-in users" on public.shop_rotations
  for select to authenticated using (true);

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function public.shop_cycle_hours()
returns int language sql stable set search_path = public as $$
  select greatest(1, coalesce((select value from public.game_config where key = 'shop_cycle_hours'), 24))
$$;

create or replace function public.shop_current_cycle()
returns int language sql stable set search_path = public as $$
  select floor(extract(epoch from now()) / (public.shop_cycle_hours() * 3600))::int
$$;

create or replace function public.shop_rotating_category(p_category text)
returns boolean language sql immutable set search_path = public as $$
  select p_category in ('title','banner','anim','effect')
$$;

-- Rarity weight for the draw: commons show up often, mythics are an event.
create or replace function public.shop_rarity_weight(p_rarity text)
returns numeric language sql immutable set search_path = public as $$
  select case p_rarity when 'common' then 6 when 'rare' then 5 when 'epic' then 3.5
                       when 'legendary' then 2.2 when 'mythic' then 1 else 4 end::numeric
$$;

-- Build (once) the rotation for a cycle.
create or replace function public.ensure_shop_rotation(p_cycle int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cat text; v_slots int; v_feat uuid; v_deal uuid; v_pct int;
begin
  if exists (select 1 from public.shop_rotations where cycle = p_cycle) then return; end if;
  perform pg_advisory_xact_lock(771100, p_cycle);
  if exists (select 1 from public.shop_rotations where cycle = p_cycle) then return; end if;

  foreach v_cat in array array['title','banner','anim','effect'] loop
    select coalesce(value, 3) into v_slots from public.game_config where key = 'shop_slots_' || v_cat;
    v_slots := coalesce(v_slots, 3);
    insert into public.shop_rotations (cycle, shop_item_id, category, position)
    select p_cycle, s.id, v_cat, row_number() over ()
    from (
      select s.id
      from public.shop_items s
      where s.category = v_cat and s.is_active and not coalesce(s.box_only, false)
        and s.price_gems is not null and s.price_gems > 0
        and (v_cat <> 'title' or s.source_system = 'shop')
      order by
        -- fresh items first: anything shown last cycle goes to the back
        (exists (select 1 from public.shop_rotations r where r.cycle = p_cycle - 1 and r.shop_item_id = s.id)),
        power(random(), 1.0 / public.shop_rarity_weight(coalesce(s.rarity_tier, s.rarity))) desc
      limit v_slots
    ) s;
  end loop;

  -- Featured: the day's showpiece — a legendary/mythic when the draw has one.
  select r.shop_item_id into v_feat
  from public.shop_rotations r join public.shop_items s on s.id = r.shop_item_id
  where r.cycle = p_cycle
  order by (coalesce(s.rarity_tier, s.rarity) in ('legendary','mythic')) desc, random()
  limit 1;
  update public.shop_rotations set featured = true where cycle = p_cycle and shop_item_id = v_feat;

  -- Deal: any other rotating item, 30% off, rounded to 10.
  select coalesce(value, 30) into v_pct from public.game_config where key = 'shop_deal_pct';
  v_pct := least(greatest(coalesce(v_pct, 30), 5), 80);
  select r.shop_item_id into v_deal
  from public.shop_rotations r
  where r.cycle = p_cycle and r.shop_item_id is distinct from v_feat
  order by random() limit 1;
  update public.shop_rotations r
     set deal_price = greatest(10, (round(s.price_gems * (100 - v_pct) / 100.0 / 10) * 10)::int)
    from public.shop_items s
   where r.cycle = p_cycle and r.shop_item_id = v_deal and s.id = r.shop_item_id;
end $$;
revoke all on function public.ensure_shop_rotation(int) from public, anon, authenticated;

-- What the shop shows right now.
create or replace function public.get_shop_rotation()
returns json language plpgsql security definer set search_path = public as $$
declare v_cycle int := public.shop_current_cycle(); v_h int := public.shop_cycle_hours();
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  perform public.ensure_shop_rotation(v_cycle);
  return json_build_object(
    'cycle', v_cycle,
    'starts_at', to_timestamp(v_cycle::bigint * v_h * 3600),
    'ends_at', to_timestamp((v_cycle::bigint + 1) * v_h * 3600),
    'server_now', now(),
    'items', coalesce((
      select json_agg(json_build_object('shop_item_id', r.shop_item_id, 'category', r.category,
        'position', r.position, 'featured', r.featured, 'deal_price', r.deal_price) order by r.category, r.position)
      from public.shop_rotations r where r.cycle = v_cycle), '[]'::json)
  );
end $$;
revoke all on function public.get_shop_rotation() from public, anon;
grant execute on function public.get_shop_rotation() to authenticated;

-- Pre-build the next cycle a few minutes early so the first visitor after a
-- restock never pays the generation cost (and pg_cron keeps history tidy).
create or replace function public.shop_prebuild_next()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_shop_rotation(public.shop_current_cycle());
  perform public.ensure_shop_rotation(public.shop_current_cycle() + 1);
  delete from public.shop_rotations where cycle < public.shop_current_cycle() - 30;
end $$;
revoke all on function public.shop_prebuild_next() from public, anon, authenticated;

-- ── purchase_shop_item: active + rotation + deal price + lock ───────────────
create or replace function public.purchase_shop_item(p_shop_item_id uuid)
 returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user uuid := auth.uid();
  v_item public.shop_items%rowtype;
  v_gems int; v_have int; v_max int; v_price int; v_rot record;
  v_cycle int := public.shop_current_cycle(); v_h int := public.shop_cycle_hours();
  v_shields int; v_revives int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_item from public.shop_items where id = p_shop_item_id;
  if not found or not v_item.is_active then raise exception 'Item not found'; end if;
  if v_item.box_only or v_item.price_gems is null then
    raise exception 'This item can only be obtained from loot boxes';
  end if;
  v_price := v_item.price_gems;

  if public.shop_rotating_category(v_item.category) then
    perform public.ensure_shop_rotation(v_cycle);
    select * into v_rot from public.shop_rotations where cycle = v_cycle and shop_item_id = v_item.id;
    if not found then
      -- grace window: an item from the cycle that JUST ended
      select * into v_rot from public.shop_rotations
       where cycle = v_cycle - 1 and shop_item_id = v_item.id
         and now() < to_timestamp(v_cycle::bigint * v_h * 3600) + interval '5 minutes';
      if not found then raise exception 'This item is not in today''s shop — check back after the restock'; end if;
    end if;
    if v_rot.deal_price is not null then v_price := v_rot.deal_price; end if;
  end if;

  select gems, coalesce(streak_shields,0), coalesce(streak_revives,0)
    into v_gems, v_shields, v_revives from public.users where id = v_user for update;

  -- Count-based consumables are capped on the live counter, not the mirror.
  if v_item.key = 'streak_shield' then v_have := v_shields;
  elsif v_item.key = 'streak_revive' then v_have := v_revives;
  else
    select coalesce(quantity,0) into v_have from public.user_inventory
      where user_id = v_user and shop_item_id = v_item.id;
    v_have := coalesce(v_have,0);
  end if;
  v_max := coalesce(v_item.max_owned,1);
  if v_have >= v_max then
    raise exception 'You already own the maximum of this item (%/%)', v_have, v_max;
  end if;
  if v_gems < v_price then
    raise exception 'Need % more gems', v_price - v_gems;
  end if;

  update public.users set gems = gems - v_price, updated_at = now() where id = v_user;
  if v_item.key = 'streak_shield' then
    update public.users set streak_shields = coalesce(streak_shields,0)+1 where id = v_user;
    insert into public.user_inventory (user_id, shop_item_id, quantity, acquired_via)
      values (v_user, v_item.id, v_have + 1, 'purchase')
      on conflict (user_id, shop_item_id) do update set quantity = excluded.quantity;
  elsif v_item.key = 'streak_revive' then
    update public.users set streak_revives = coalesce(streak_revives,0)+1 where id = v_user;
    insert into public.user_inventory (user_id, shop_item_id, quantity, acquired_via)
      values (v_user, v_item.id, v_have + 1, 'purchase')
      on conflict (user_id, shop_item_id) do update set quantity = excluded.quantity;
  else
    insert into public.user_inventory (user_id, shop_item_id, quantity, acquired_via)
      values (v_user, v_item.id, 1, 'purchase')
      on conflict (user_id, shop_item_id) do update set quantity = public.user_inventory.quantity + 1;
  end if;

  return json_build_object('gems', v_gems - v_price, 'item_key', v_item.key, 'price_paid', v_price,
    'name', v_item.name, 'category', v_item.category, 'quantity', v_have + 1, 'max_owned', v_max);
end; $function$;

-- ── catalogue expansion — enough depth that a restock is genuinely new ──────
insert into public.shop_items (key, category, name, price_gems, rarity_tier, source_system, box_only, max_owned, is_active, metadata) values
  ('title_ironvow',      'title', 'Ironvow',       400, 'common',    'shop', false, 1, true, '{}'),
  ('title_duskrunner',   'title', 'Duskrunner',    400, 'common',    'shop', false, 1, true, '{}'),
  ('title_coldforged',   'title', 'Coldforged',    400, 'common',    'shop', false, 1, true, '{}'),
  ('title_stillwater',   'title', 'Stillwater',    400, 'common',    'shop', false, 1, true, '{}'),
  ('title_nightwatch',   'title', 'Nightwatch',    900, 'rare',      'shop', false, 1, true, '{}'),
  ('title_razorline',    'title', 'Razorline',     900, 'rare',      'shop', false, 1, true, '{}'),
  ('title_wolfblood',    'title', 'Wolfblood',     900, 'rare',      'shop', false, 1, true, '{}'),
  ('title_tidebreaker',  'title', 'Tidebreaker',   900, 'rare',      'shop', false, 1, true, '{}'),
  ('title_skyrender',    'title', 'Skyrender',    1800, 'epic',      'shop', false, 1, true, '{}'),
  ('title_blackvault',   'title', 'Blackvault',   1800, 'epic',      'shop', false, 1, true, '{}'),
  ('title_suncaller',    'title', 'Suncaller',    1800, 'epic',      'shop', false, 1, true, '{}'),
  ('title_thornking',    'title', 'Thornking',    1800, 'epic',      'shop', false, 1, true, '{}'),
  ('title_kingslayer',   'title', 'Kingslayer',   3200, 'legendary', 'shop', false, 1, true, '{}'),
  ('title_voidmonarch',  'title', 'Void Monarch', 3200, 'legendary', 'shop', false, 1, true, '{}'),
  ('title_last_light',   'title', 'Last Light',   3200, 'legendary', 'shop', false, 1, true, '{}'),
  ('title_titanheart',   'title', 'Titanheart',   3200, 'legendary', 'shop', false, 1, true, '{}')
on conflict (key) do nothing;

insert into public.shop_items (key, category, name, price_gems, rarity, max_owned, is_active, box_only) values
  ('banner_chevron',     'banner', 'Chevron',      100, 'common',    1, true, false),
  ('banner_skyline',     'banner', 'Skyline',      100, 'common',    1, true, false),
  ('banner_summit',      'banner', 'Summit',       300, 'rare',      1, true, false),
  ('banner_tidal',       'banner', 'Tidal',        350, 'rare',      1, true, false),
  ('banner_monolith',    'banner', 'Monolith',     700, 'legendary', 1, true, false),
  ('banner_solstice',    'banner', 'Solstice',     800, 'legendary', 1, true, false),
  ('banner_singularity', 'banner', 'Singularity', 1800, 'mythic',    1, true, false),
  ('anim_orbit_lock',    'anim',   'Orbit Lock',   700, 'legendary', 1, true, false),
  ('anim_tick_storm',    'anim',   'Tick Storm',   750, 'legendary', 1, true, false),
  ('anim_dashline',      'anim',   'Dashline',     800, 'legendary', 1, true, false),
  ('anim_twin_arc',      'anim',   'Twin Arc',    1400, 'mythic',    1, true, false),
  ('anim_overdrive',     'anim',   'Overdrive',   1800, 'mythic',    1, true, false)
on conflict (key) do nothing;

-- pg_cron: build the next cycle 10 minutes before every restock.
select cron.unschedule(jobid) from cron.job where jobname = 'shop_prebuild_next';
select cron.schedule('shop_prebuild_next', '50 23 * * *', $$select public.shop_prebuild_next();$$);
