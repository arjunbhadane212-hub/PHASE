-- =============================================================================
-- Loot boxes: active-only pools + publish-ready economy (final state).
--
-- Supersedes the two earlier ad-hoc rebalances (loot_box_rebalance_and_refund,
-- loot_economy_v2_publish_ready) that were applied straight to the project and
-- never saved here.
--
-- WHY: Profile colours were retired (is_active = false) AFTER the v2 pools
-- were written, and open_loot_box never filtered on is_active. A Starter open
-- was ~38% likely to charge gems for a retired colour that renders nowhere.
-- Pools now reference only active items, and every selection in the function
-- (roll, floor guarantee, duplicate swap) is filtered on is_active.
--
-- Identity (strictly better contents going up):
--   starter  100  x2  Cosmetic Crate  commons + a small rare chance
--   delta    500  x2  Rare Vault       >=1 rare guaranteed; first box titles
--   phase   2000  x3  Prestige Vault   >=1 legendary guaranteed; mythic titles
--
-- Streak / hours titles are EARNED and are never in any box.
-- =============================================================================

update public.loot_boxes set items_per_open = 3 where key = 'phase';
update public.loot_boxes set items_per_open = 2 where key in ('starter','delta');

delete from public.loot_box_drop_table
 where loot_box_id in (select id from public.loot_boxes where key in ('starter','delta','phase'));

insert into public.loot_box_drop_table (id, loot_box_id, shop_item_id, weight)
select gen_random_uuid(), lb.id, si.id, v.weight
from (values
  -- STARTER ------------------------------------------------------------------
  ('starter','banner_circuit',        10),
  ('starter','banner_grid',           10),
  ('starter','banner_pulse',          10),
  ('starter','fx_pulse',               9),
  ('starter','fx_breathe_ring',        9),
  ('starter','fx_half_arc',            9),
  ('starter','boost_xp_2x',           10),
  ('starter','streak_shield',          8),
  ('starter','banner_midnight',        3),
  ('starter','banner_deep_ocean',      3),
  ('starter','fx_ripple',              3),
  ('starter','fx_draw_ring',           3),
  ('starter','fx_quad_ticks',          2),

  -- DELTA --------------------------------------------------------------------
  ('delta','banner_void_fracture',     7),
  ('delta','banner_sunset_blaze',      7),
  ('delta','banner_enchanted_forest',  7),
  ('delta','banner_deep_ocean',        5),
  ('delta','banner_midnight',          5),
  ('delta','fx_neon_ring',             5),
  ('delta','fx_aurora',                5),
  ('delta','fx_fire_ring',             5),
  ('delta','fx_ice_ring',              5),
  ('delta','fx_vortex',                5),
  ('delta','fx_electric',              5),
  ('delta','fx_galaxy_spin',           5),
  ('delta','fx_rainbow',               5),
  ('delta','fx_matrix_rain',           5),
  ('delta','fx_segment_ring',          5),
  ('delta','boost_xp_3x',              9),
  ('delta','streak_revive',            7),
  ('delta','anim_plasma',              4),
  ('delta','anim_cosmic',              4),
  ('delta','banner_crimson_tide',      3),
  ('delta','banner_meridian',          3),
  ('delta','fx_dual_orbit',            3),
  ('delta','title_savage',             4),
  ('delta','title_vandal',             4),
  ('delta','title_phantom',            4),
  ('delta','title_enforcer',           3),

  -- PHASE --------------------------------------------------------------------
  ('phase','anim_plasma',              5),
  ('phase','anim_shadow_flame',        5),
  ('phase','anim_cosmic',              5),
  ('phase','anim_lightning_storm',     5),
  ('phase','anim_golden_aura',         5),
  ('phase','banner_crimson_tide',      4),
  ('phase','banner_northern_lights',   4),
  ('phase','banner_galaxy',            4),
  ('phase','banner_meridian',          4),
  ('phase','fx_void_pulse',            3),
  ('phase','fx_dual_orbit',            3),
  ('phase','flame_ring',               3),
  ('phase','frost_ring',               3),
  ('phase','lightning_arc',            3),
  ('phase','galaxy_spiral',            3),
  ('phase','boost_xp_5x',              5),
  ('phase','title_enforcer',           3),
  ('phase','anim_ethereal_glow',       3),
  ('phase','anim_supernova',           3),
  ('phase','anim_inferno',             2),
  ('phase','anim_divine_light',        1),
  ('phase','banner_void_walker',       2),
  ('phase','banner_warpgate',          2),
  ('phase','title_god_complex',        2),
  ('phase','title_anti_hero',          2),
  ('phase','title_executioner',        2),
  ('phase','title_anomaly',            2),
  ('phase','title_cataclysm',          2)
) as v(box_key, item_key, weight)
join public.loot_boxes lb on lb.key = v.box_key
join public.shop_items si on si.key = v.item_key and si.is_active;

create or replace function public.open_loot_box(p_loot_box_id uuid)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_box public.loot_boxes%rowtype;
  v_gems int; v_floor int;
  v_ids uuid[] := '{}';
  v_id uuid; v_item public.shop_items%rowtype;
  v_i int; v_have int; v_max int; v_rank int; v_maxrank int;
  v_refund int; v_value int;
  v_results jsonb := '[]'::jsonb; v_total_refund int := 0;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_box from public.loot_boxes where id = p_loot_box_id;
  if not found then raise exception 'Loot box not found'; end if;

  select gems into v_gems from public.users where id = v_user;
  if v_gems < v_box.price_gems then raise exception 'Need % more gems', v_box.price_gems - v_gems; end if;
  update public.users set gems = gems - v_box.price_gems, updated_at = now() where id = v_user;
  v_gems := v_gems - v_box.price_gems;

  v_floor := case v_box.key when 'delta' then 2 when 'phase' then 3 else 1 end;

  -- weighted rolls (active items only)
  for v_i in 1..v_box.items_per_open loop
    select d.shop_item_id into v_id
    from public.loot_box_drop_table d
    join public.shop_items s on s.id = d.shop_item_id and s.is_active
    where d.loot_box_id = v_box.id
    order by power(random(), 1.0 / d.weight) desc
    limit 1;
    v_ids := array_append(v_ids, v_id);
  end loop;

  -- floor guarantee
  select max(case s.rarity when 'common' then 1 when 'rare' then 2 when 'legendary' then 3 when 'mythic' then 4 else 1 end)
    into v_maxrank from public.shop_items s where s.id = any(v_ids);
  if coalesce(v_maxrank,1) < v_floor then
    select d.shop_item_id into v_id
    from public.loot_box_drop_table d
    join public.shop_items s on s.id = d.shop_item_id and s.is_active
    where d.loot_box_id = v_box.id
      and (case s.rarity when 'common' then 1 when 'rare' then 2 when 'legendary' then 3 when 'mythic' then 4 else 1 end) >= v_floor
    order by power(random(), 1.0 / d.weight) desc
    limit 1;
    if v_id is not null then v_ids[1] := v_id; end if;
  end if;

  -- grant, with duplicate protection
  foreach v_id in array v_ids loop
    select * into v_item from public.shop_items where id = v_id;
    v_max  := coalesce(v_item.max_owned, 1);
    v_rank := case v_item.rarity when 'common' then 1 when 'rare' then 2 when 'legendary' then 3 when 'mythic' then 4 else 1 end;
    select coalesce(quantity,0) into v_have from public.user_inventory where user_id = v_user and shop_item_id = v_item.id;
    v_have := coalesce(v_have,0);

    if v_have >= v_max then
      select s.id into v_id
      from public.loot_box_drop_table d
      join public.shop_items s on s.id = d.shop_item_id and s.is_active
      left join public.user_inventory ui on ui.user_id = v_user and ui.shop_item_id = s.id
      where d.loot_box_id = v_box.id
        and coalesce(ui.quantity,0) < coalesce(s.max_owned,1)
        and (case s.rarity when 'common' then 1 when 'rare' then 2 when 'legendary' then 3 when 'mythic' then 4 else 1 end) >= v_rank
      order by power(random(), 1.0 / d.weight) desc
      limit 1;
      if v_id is null then
        select s.id into v_id
        from public.loot_box_drop_table d
        join public.shop_items s on s.id = d.shop_item_id and s.is_active
        left join public.user_inventory ui on ui.user_id = v_user and ui.shop_item_id = s.id
        where d.loot_box_id = v_box.id
          and coalesce(ui.quantity,0) < coalesce(s.max_owned,1)
        order by power(random(), 1.0 / d.weight) desc
        limit 1;
      end if;
      if v_id is not null then
        select * into v_item from public.shop_items where id = v_id;
        v_have := 0;
      end if;
    end if;

    if v_have >= v_max then
      v_value := coalesce(v_item.price_gems,
        case v_item.rarity when 'mythic' then 1500 when 'legendary' then 800 when 'rare' then 400 else 150 end);
      v_refund := greatest(round(v_value * 0.5)::int,
        case v_item.rarity when 'mythic' then 400 when 'legendary' then 250 when 'rare' then 120 else 40 end);
      update public.users set gems = gems + v_refund where id = v_user;
      v_gems := v_gems + v_refund; v_total_refund := v_total_refund + v_refund;
      v_results := v_results || jsonb_build_object('item_key',v_item.key,'name',v_item.name,
        'category',v_item.category,'rarity',v_item.rarity,'duplicate',true,'refund',v_refund);
    else
      insert into public.user_inventory (user_id, shop_item_id, quantity, acquired_via)
        values (v_user, v_item.id, 1, 'loot_box')
        on conflict (user_id, shop_item_id) do update set quantity = public.user_inventory.quantity + 1;
      if v_item.key = 'streak_shield' then
        update public.users set streak_shields = coalesce(streak_shields,0)+1 where id = v_user;
      elsif v_item.key = 'streak_revive' then
        update public.users set streak_revives = coalesce(streak_revives,0)+1 where id = v_user;
      end if;
      v_results := v_results || jsonb_build_object('item_key',v_item.key,'name',v_item.name,
        'category',v_item.category,'rarity',v_item.rarity,'hex',v_item.hex_value,
        'gradient',v_item.gradient_value,'duplicate',false);
    end if;
  end loop;

  return json_build_object('box', v_box.key, 'gems', v_gems, 'items', v_results, 'total_refund', v_total_refund);
end; $function$;
