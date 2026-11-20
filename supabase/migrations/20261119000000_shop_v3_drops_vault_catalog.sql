-- Shop v3 — "Drops" (2026-11-19)
--
-- The v2 rotation (20261111020000) picked items with a soft rarity weight
-- (6/5/3.5/2.2/1), so a mythic showed up almost as often as a rare and every
-- restock felt the same. v3 makes rarity mean "how hard it is to SEE in the
-- shop", not just how it looks:
--
--   Daily drop   00:00 UTC. Titles 4 · Banners 3 · Animations 3 · Effects 3.
--                Every SLOT rolls a rarity first — common 40 · rare 32 ·
--                epic 18 · legendary 10 (game_config shop_odds_*) — then picks
--                a fresh item of that rarity. Mythics never drop daily.
--                Every drop holds at least one epic-or-better item.
--                Items shown in the last 3 drops sit out (cooldown), so a
--                restock is genuinely new.
--   The Vault    Monday 00:00 UTC (same edge as the league reset). One mythic
--                + one legendary from another section, for the whole week.
--                The ONLY place a mythic can be bought.
--
-- get_shop_rotation now also returns per-item history (last seen, times seen)
-- so the client can say "first time ever" / "back after 23 days", the drop
-- number, the odds table and the Vault. Old fields are unchanged.
--
-- Also: rarity_tier is backfilled for non-title items (one rarity column to
-- reason about), 23 new items fill the thin rarities (animations had no
-- common/rare/epic; banners/effects had no epic; effects had no mythic), and a
-- per-user wishlist.

-- ── config ──────────────────────────────────────────────────────────────────
insert into public.game_config (key, value, description) values
  ('shop_odds_common', 40, 'Daily shop: % chance a slot rolls common'),
  ('shop_odds_rare', 32, 'Daily shop: % chance a slot rolls rare'),
  ('shop_odds_epic', 18, 'Daily shop: % chance a slot rolls epic'),
  ('shop_odds_legendary', 10, 'Daily shop: % chance a slot rolls legendary (mythic = Vault only)'),
  ('shop_cooldown_cycles', 3, 'Daily shop: an item sits out this many drops after appearing'),
  ('shop_vault_cooldown_weeks', 6, 'Vault: an item sits out this many weeks after being vaulted'),
  ('shop_epoch_cycle', 20768, 'First shop cycle; drop number = cycle - this + 1')
on conflict (key) do nothing;
update public.game_config set value = 3 where key = 'shop_slots_anim' and value = 2;

-- ── one rarity column ───────────────────────────────────────────────────────
update public.shop_items set rarity_tier = rarity
 where rarity_tier is null and rarity is not null;

create or replace function public.shop_tier_rank(p_tier text)
returns int language sql immutable set search_path = public as $$
  select case p_tier when 'common' then 1 when 'rare' then 2 when 'epic' then 3
                     when 'legendary' then 4 when 'mythic' then 5 else 1 end
$$;

-- ── catalogue fill ──────────────────────────────────────────────────────────
-- `rarity` (the box-era column) only allows common/rare/legendary/mythic, so
-- epics carry rarity='rare' there; rarity_tier is what the shop reads.
insert into public.shop_items (key, category, name, price_gems, rarity, rarity_tier, max_owned, is_active, box_only) values
  -- animations · common
  ('anim_drift',        'anim',   'Drift',          250, 'common',    'common',    1, true, false),
  ('anim_fine_tick',    'anim',   'Fine Tick',      250, 'common',    'common',    1, true, false),
  ('anim_heartbeat',    'anim',   'Heartbeat',      250, 'common',    'common',    1, true, false),
  ('anim_signal',       'anim',   'Signal',         250, 'common',    'common',    1, true, false),
  -- animations · rare
  ('anim_pendulum',     'anim',   'Pendulum',       450, 'rare',      'rare',      1, true, false),
  ('anim_binary',       'anim',   'Binary',         450, 'rare',      'rare',      1, true, false),
  ('anim_counterspin',  'anim',   'Counterspin',    450, 'rare',      'rare',      1, true, false),
  ('anim_gearwork',     'anim',   'Gearwork',       450, 'rare',      'rare',      1, true, false),
  -- animations · epic
  ('anim_triple_lock',  'anim',   'Triple Lock',    600, 'rare',      'epic',      1, true, false),
  ('anim_satellite',    'anim',   'Satellite',      600, 'rare',      'epic',      1, true, false),
  ('anim_redline',      'anim',   'Redline',        600, 'rare',      'epic',      1, true, false),
  -- banners · epic
  ('banner_halftone',   'banner', 'Halftone',       500, 'rare',      'epic',      1, true, false),
  ('banner_strata',     'banner', 'Strata',         500, 'rare',      'epic',      1, true, false),
  ('banner_bloc',       'banner', 'Bloc',           500, 'rare',      'epic',      1, true, false),
  ('banner_signal',     'banner', 'Broadcast',      500, 'rare',      'epic',      1, true, false),
  -- effects · epic
  ('fx_gear_ring',      'effect', 'Gear Ring',     1200, 'rare',      'epic',      1, true, false),
  ('fx_triple_ring',    'effect', 'Triple Ring',   1200, 'rare',      'epic',      1, true, false),
  ('fx_orbital',        'effect', 'Orbital',       1200, 'rare',      'epic',      1, true, false),
  ('fx_beacon',         'effect', 'Beacon',        1200, 'rare',      'epic',      1, true, false),
  ('fx_counter_ring',   'effect', 'Counter Ring',  1200, 'rare',      'epic',      1, true, false),
  -- effects · mythic (Vault only)
  ('fx_event_horizon',  'effect', 'Event Horizon', 4000, 'mythic',    'mythic',    1, true, false),
  ('fx_zero_point',     'effect', 'Zero Point',    4000, 'mythic',    'mythic',    1, true, false),
  ('fx_continuum',      'effect', 'Continuum',     4000, 'mythic',    'mythic',    1, true, false)
on conflict (key) do nothing;

-- ── the Vault ───────────────────────────────────────────────────────────────
create table if not exists public.shop_vault (
  week         int  not null,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  slot         text not null check (slot in ('mythic','legendary')),
  position     int  not null,
  created_at   timestamptz not null default now(),
  primary key (week, shop_item_id)
);
create index if not exists shop_vault_item_idx on public.shop_vault (shop_item_id);
alter table public.shop_vault enable row level security;
drop policy if exists "vault is public to signed-in users" on public.shop_vault;
create policy "vault is public to signed-in users" on public.shop_vault
  for select to authenticated using (true);
grant select on public.shop_vault to authenticated;

-- Weeks start Monday 00:00 UTC (1970-01-05 was a Monday = epoch + 4 days).
create or replace function public.shop_week_of(p_ts timestamptz)
returns int language sql immutable set search_path = public as $$
  select floor((extract(epoch from p_ts) - 345600) / 604800)::int
$$;
create or replace function public.shop_current_week()
returns int language sql stable set search_path = public as $$
  select public.shop_week_of(now())
$$;
create or replace function public.shop_week_start(p_week int)
returns timestamptz language sql immutable set search_path = public as $$
  select to_timestamp(p_week::bigint * 604800 + 345600)
$$;

create or replace function public.ensure_shop_vault(p_week int)
returns void language plpgsql security definer set search_path = public as $$
declare v_cool int; v_myth uuid; v_myth_cat text; v_leg uuid;
begin
  if exists (select 1 from public.shop_vault where week = p_week) then return; end if;
  perform pg_advisory_xact_lock(771101, p_week);
  if exists (select 1 from public.shop_vault where week = p_week) then return; end if;
  select coalesce(value, 6) into v_cool from public.game_config where key = 'shop_vault_cooldown_weeks';
  v_cool := coalesce(v_cool, 6);

  -- The mythic: longest-unvaulted first, cooldown respected when possible.
  select s.id, s.category into v_myth, v_myth_cat
  from public.shop_items s
  left join lateral (select max(v.week) w from public.shop_vault v where v.shop_item_id = s.id and v.week < p_week) lv on true
  where s.is_active and not coalesce(s.box_only, false) and coalesce(s.price_gems, 0) > 0
    and public.shop_rotating_category(s.category) and s.rarity_tier = 'mythic'
    and (s.category <> 'title' or s.source_system = 'shop')
  order by (lv.w is not null and lv.w > p_week - v_cool), lv.w nulls first, random()
  limit 1;

  -- The legendary: a different section from the mythic.
  select s.id into v_leg
  from public.shop_items s
  left join lateral (select max(v.week) w from public.shop_vault v where v.shop_item_id = s.id and v.week < p_week) lv on true
  where s.is_active and not coalesce(s.box_only, false) and coalesce(s.price_gems, 0) > 0
    and public.shop_rotating_category(s.category) and s.rarity_tier = 'legendary'
    and (s.category <> 'title' or s.source_system = 'shop')
    and s.category is distinct from v_myth_cat
  order by (lv.w is not null and lv.w > p_week - v_cool), lv.w nulls first, random()
  limit 1;

  if v_myth is not null then
    insert into public.shop_vault (week, shop_item_id, slot, position) values (p_week, v_myth, 'mythic', 1);
  end if;
  if v_leg is not null then
    insert into public.shop_vault (week, shop_item_id, slot, position) values (p_week, v_leg, 'legendary', 2);
  end if;
end $$;
revoke all on function public.ensure_shop_vault(int) from public, anon, authenticated;

-- ── the daily drop ──────────────────────────────────────────────────────────
create or replace function public.ensure_shop_rotation(p_cycle int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cat text; v_slots int; v_i int; v_roll numeric; v_tier text; v_id uuid;
  v_oc int; v_or int; v_oe int; v_ol int; v_sum numeric; v_cool int;
  v_week int; v_feat uuid; v_deal uuid; v_pct int; v_swap record;
  v_h int := public.shop_cycle_hours();
begin
  if exists (select 1 from public.shop_rotations where cycle = p_cycle) then return; end if;
  perform pg_advisory_xact_lock(771100, p_cycle);
  if exists (select 1 from public.shop_rotations where cycle = p_cycle) then return; end if;

  -- The Vault for the week this cycle starts in is built first, so the daily
  -- shelves never duplicate a vaulted item.
  v_week := public.shop_week_of(to_timestamp(p_cycle::bigint * v_h * 3600));
  perform public.ensure_shop_vault(v_week);

  select coalesce(max(value) filter (where key = 'shop_odds_common'), 40),
         coalesce(max(value) filter (where key = 'shop_odds_rare'), 32),
         coalesce(max(value) filter (where key = 'shop_odds_epic'), 18),
         coalesce(max(value) filter (where key = 'shop_odds_legendary'), 10),
         coalesce(max(value) filter (where key = 'shop_cooldown_cycles'), 3)
    into v_oc, v_or, v_oe, v_ol, v_cool
  from public.game_config where key like 'shop_%';
  v_sum := greatest(1, v_oc + v_or + v_oe + v_ol);

  foreach v_cat in array array['title','banner','anim','effect'] loop
    select value into v_slots from public.game_config where key = 'shop_slots_' || v_cat;
    v_slots := coalesce(v_slots, 3);
    for v_i in 1..v_slots loop
      v_roll := random() * v_sum;
      v_tier := case when v_roll < v_oc then 'common'
                     when v_roll < v_oc + v_or then 'rare'
                     when v_roll < v_oc + v_or + v_oe then 'epic'
                     else 'legendary' end;
      -- Nearest rarity to the roll (falling DOWN before up, so an empty tier
      -- never inflates scarcity), fresh before cooled-down, then random.
      select s.id into v_id
      from public.shop_items s
      where s.category = v_cat and s.is_active and not coalesce(s.box_only, false)
        and coalesce(s.price_gems, 0) > 0
        and (v_cat <> 'title' or s.source_system = 'shop')
        and coalesce(s.rarity_tier, 'common') <> 'mythic'
        and not exists (select 1 from public.shop_rotations r where r.cycle = p_cycle and r.shop_item_id = s.id)
        and not exists (select 1 from public.shop_vault v where v.week = v_week and v.shop_item_id = s.id)
      order by
        abs(public.shop_tier_rank(s.rarity_tier) - public.shop_tier_rank(v_tier)),
        (public.shop_tier_rank(s.rarity_tier) > public.shop_tier_rank(v_tier)),
        -- fresh first; if the whole tier is cooling down, the longest-gone wins
        coalesce((select max(r.cycle) from public.shop_rotations r
                   where r.cycle < p_cycle and r.shop_item_id = s.id), -1) >= p_cycle - v_cool,
        (select max(r.cycle) from public.shop_rotations r
          where r.cycle between p_cycle - v_cool and p_cycle - 1 and r.shop_item_id = s.id) nulls first,
        random()
      limit 1;
      exit when v_id is null;
      insert into public.shop_rotations (cycle, shop_item_id, category, position)
      values (p_cycle, v_id, v_cat, v_i);
    end loop;
  end loop;

  -- Guarantee: every drop has at least one epic-or-better. If the dice said
  -- no, upgrade one common/rare slot to a fresh epic in the same section.
  if not exists (select 1 from public.shop_rotations r join public.shop_items s on s.id = r.shop_item_id
                  where r.cycle = p_cycle and public.shop_tier_rank(s.rarity_tier) >= 3) then
    for v_swap in
      select r.shop_item_id, r.category from public.shop_rotations r
      where r.cycle = p_cycle order by random()
    loop
      select s.id into v_id from public.shop_items s
      where s.category = v_swap.category and s.is_active and not coalesce(s.box_only, false)
        and coalesce(s.price_gems, 0) > 0 and s.rarity_tier = 'epic'
        and (v_swap.category <> 'title' or s.source_system = 'shop')
        and not exists (select 1 from public.shop_rotations r where r.cycle = p_cycle and r.shop_item_id = s.id)
        and not exists (select 1 from public.shop_vault v where v.week = v_week and v.shop_item_id = s.id)
      order by random() limit 1;
      if v_id is not null then
        update public.shop_rotations set shop_item_id = v_id
         where cycle = p_cycle and shop_item_id = v_swap.shop_item_id;
        exit;
      end if;
    end loop;
  end if;

  -- Featured: the drop's rarest piece.
  select r.shop_item_id into v_feat
  from public.shop_rotations r join public.shop_items s on s.id = r.shop_item_id
  where r.cycle = p_cycle
  order by public.shop_tier_rank(s.rarity_tier) desc, random()
  limit 1;
  update public.shop_rotations set featured = true where cycle = p_cycle and shop_item_id = v_feat;

  -- Deal: a rare-or-better that isn't the featured piece (a discount on a
  -- 100-gem common isn't a deal), rounded to 10.
  select coalesce(value, 30) into v_pct from public.game_config where key = 'shop_deal_pct';
  v_pct := least(greatest(coalesce(v_pct, 30), 5), 80);
  select r.shop_item_id into v_deal
  from public.shop_rotations r join public.shop_items s on s.id = r.shop_item_id
  where r.cycle = p_cycle and r.shop_item_id is distinct from v_feat
  order by (public.shop_tier_rank(s.rarity_tier) >= 2) desc, random() limit 1;
  update public.shop_rotations r
     set deal_price = greatest(10, (round(s.price_gems * (100 - v_pct) / 100.0 / 10) * 10)::int)
    from public.shop_items s
   where r.cycle = p_cycle and r.shop_item_id = v_deal and s.id = r.shop_item_id;
end $$;
revoke all on function public.ensure_shop_rotation(int) from public, anon, authenticated;

-- ── what the shop shows right now ───────────────────────────────────────────
create or replace function public.get_shop_rotation()
returns json language plpgsql security definer set search_path = public as $$
declare
  v_cycle int := public.shop_current_cycle(); v_h int := public.shop_cycle_hours();
  v_week int := public.shop_current_week(); v_epoch int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  perform public.ensure_shop_rotation(v_cycle);
  perform public.ensure_shop_vault(v_week);
  select value into v_epoch from public.game_config where key = 'shop_epoch_cycle';

  return json_build_object(
    'cycle', v_cycle,
    'drop_number', v_cycle - coalesce(v_epoch, v_cycle) + 1,
    'starts_at', to_timestamp(v_cycle::bigint * v_h * 3600),
    'ends_at', to_timestamp((v_cycle::bigint + 1) * v_h * 3600),
    'server_now', now(),
    'odds', (select json_build_object(
        'common', max(value) filter (where key = 'shop_odds_common'),
        'rare', max(value) filter (where key = 'shop_odds_rare'),
        'epic', max(value) filter (where key = 'shop_odds_epic'),
        'legendary', max(value) filter (where key = 'shop_odds_legendary'),
        'slots', json_build_object(
          'title', max(value) filter (where key = 'shop_slots_title'),
          'banner', max(value) filter (where key = 'shop_slots_banner'),
          'anim', max(value) filter (where key = 'shop_slots_anim'),
          'effect', max(value) filter (where key = 'shop_slots_effect')))
      from public.game_config where key like 'shop_%'),
    'items', coalesce((
      select json_agg(json_build_object('shop_item_id', r.shop_item_id, 'category', r.category,
        'position', r.position, 'featured', r.featured, 'deal_price', r.deal_price,
        'last_seen_cycle', h.last_cycle, 'times_seen', coalesce(h.n, 0))
        order by r.category, r.position)
      from public.shop_rotations r
      left join lateral (
        select max(p.cycle) last_cycle, count(*) n from public.shop_rotations p
        where p.shop_item_id = r.shop_item_id and p.cycle < v_cycle) h on true
      where r.cycle = v_cycle), '[]'::json),
    'vault', json_build_object(
      'week', v_week,
      'starts_at', public.shop_week_start(v_week),
      'ends_at', public.shop_week_start(v_week + 1),
      'items', coalesce((
        select json_agg(json_build_object('shop_item_id', v.shop_item_id, 'slot', v.slot,
          'position', v.position, 'last_vault_week', h.w, 'times_vaulted', coalesce(h.n, 0))
          order by v.position)
        from public.shop_vault v
        left join lateral (
          select max(p.week) w, count(*) n from public.shop_vault p
          where p.shop_item_id = v.shop_item_id and p.week < v_week) h on true
        where v.week = v_week), '[]'::json))
  );
end $$;
revoke all on function public.get_shop_rotation() from public, anon;
grant execute on function public.get_shop_rotation() to authenticated;

-- Pre-build the next drop (and next week's Vault on Sundays) ahead of time.
-- History is kept a year so "last seen" stays meaningful.
create or replace function public.shop_prebuild_next()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_shop_vault(public.shop_current_week());
  perform public.ensure_shop_rotation(public.shop_current_cycle());
  perform public.ensure_shop_vault(public.shop_week_of(now() + interval '1 day'));
  perform public.ensure_shop_rotation(public.shop_current_cycle() + 1);
  delete from public.shop_rotations where cycle < public.shop_current_cycle() - 365;
end $$;
revoke all on function public.shop_prebuild_next() from public, anon, authenticated;

-- ── purchase: daily drop OR this week's Vault ───────────────────────────────
create or replace function public.purchase_shop_item(p_shop_item_id uuid)
 returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user uuid := auth.uid();
  v_item public.shop_items%rowtype;
  v_gems int; v_have int; v_max int; v_price int; v_rot record;
  v_cycle int := public.shop_current_cycle(); v_h int := public.shop_cycle_hours();
  v_week int := public.shop_current_week();
  v_shields int; v_revives int; v_ok boolean := false;
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
    perform public.ensure_shop_vault(v_week);
    select * into v_rot from public.shop_rotations where cycle = v_cycle and shop_item_id = v_item.id;
    if found then v_ok := true;
    else
      -- grace window: an item from the drop that JUST ended
      select * into v_rot from public.shop_rotations
       where cycle = v_cycle - 1 and shop_item_id = v_item.id
         and now() < to_timestamp(v_cycle::bigint * v_h * 3600) + interval '5 minutes';
      v_ok := found;
    end if;
    if v_ok then
      if v_rot.deal_price is not null then v_price := v_rot.deal_price; end if;
    else
      -- The Vault (full price), with the same 5-minute grace at the weekly edge.
      v_ok := exists (select 1 from public.shop_vault where week = v_week and shop_item_id = v_item.id)
           or (exists (select 1 from public.shop_vault where week = v_week - 1 and shop_item_id = v_item.id)
               and now() < public.shop_week_start(v_week) + interval '5 minutes');
    end if;
    if not v_ok then raise exception 'This item is not in today''s shop — check back after the restock'; end if;
  end if;

  select gems, coalesce(streak_shields,0), coalesce(streak_revives,0)
    into v_gems, v_shields, v_revives from public.users where id = v_user for update;

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

-- ── wishlist ────────────────────────────────────────────────────────────────
create table if not exists public.shop_wishlist (
  user_id      uuid not null references public.users(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, shop_item_id)
);
create index if not exists shop_wishlist_item_idx on public.shop_wishlist (shop_item_id);
alter table public.shop_wishlist enable row level security;
drop policy if exists "wishlist read own" on public.shop_wishlist;
create policy "wishlist read own" on public.shop_wishlist
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "wishlist add own" on public.shop_wishlist;
create policy "wishlist add own" on public.shop_wishlist
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "wishlist remove own" on public.shop_wishlist;
create policy "wishlist remove own" on public.shop_wishlist
  for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, delete on public.shop_wishlist to authenticated;

-- ── relaunch today on the new draw ──────────────────────────────────────────
-- Today's and tomorrow's v2 drops are rebuilt so v3 starts now (purchases are
-- unaffected — ownership lives in user_inventory, not in the rotation).
delete from public.shop_rotations where cycle >= public.shop_current_cycle();
select public.shop_prebuild_next();

-- ── follow-ups applied separately on 2026-11-19 ─────────────────────────────
-- (1) shop_v3_cooldown_longest_gone: when a whole rarity is cooling down the
--     draw now picks the item gone longest (the ORDER BY above already shows
--     the final form).
-- (2) shop_v3_effects_rarity_monotonic: effects had 13 rares vs 5 epics, so a
--     rare effect turned up LESS often (~14d) than an epic (~9d). The three
--     900-gem rares become epic; per-item frequency is now monotonic:
--     common ~3d · rare ~10d · epic ~15d · legendary ~20d · mythic Sanctum.
update public.shop_items set rarity_tier = 'epic', price_gems = 1200
 where key in ('fx_draw_ring','fx_quad_ticks','fx_segment_ring') and rarity_tier = 'rare';
