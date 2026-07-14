-- Shop catalog rebuild (Part B1-B3): purchase / equip / open-box RPCs.
-- SECURITY DEFINER, mirroring the established complete_habit pattern.
-- Single source of truth is user_inventory / user_equipped; legacy
-- streak_shields/streak_revives counters and users.equipped_*/selected_*_color
-- are dual-written as a transition bridge for not-yet-migrated readers.

drop function if exists public.equip_item(uuid);

-- ================= purchase_shop_item =================
create or replace function public.purchase_shop_item(p_shop_item_id uuid)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_item public.shop_items%rowtype;
  v_gems int; v_have int; v_max int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_item from public.shop_items where id = p_shop_item_id;
  if not found then raise exception 'Item not found'; end if;
  if v_item.box_only or v_item.price_gems is null then
    raise exception 'This item can only be obtained from loot boxes';
  end if;

  select gems into v_gems from public.users where id = v_user;
  select coalesce(quantity,0) into v_have from public.user_inventory
    where user_id = v_user and shop_item_id = v_item.id;
  v_have := coalesce(v_have,0);
  v_max  := coalesce(v_item.max_owned,1);
  if v_have >= v_max then
    raise exception 'You already own the maximum of this item (%/%)', v_have, v_max;
  end if;
  if v_gems < v_item.price_gems then
    raise exception 'Need % more gems', v_item.price_gems - v_gems;
  end if;

  update public.users set gems = gems - v_item.price_gems, updated_at = now() where id = v_user;
  insert into public.user_inventory (user_id, shop_item_id, quantity, acquired_via)
    values (v_user, v_item.id, 1, 'purchase')
    on conflict (user_id, shop_item_id) do update set quantity = public.user_inventory.quantity + 1;

  -- Legacy bridge: Focus Mode consumption still reads the integer counters.
  if v_item.key = 'streak_shield' then
    update public.users set streak_shields = coalesce(streak_shields,0)+1 where id = v_user;
  elsif v_item.key = 'streak_revive' then
    update public.users set streak_revives = coalesce(streak_revives,0)+1 where id = v_user;
  end if;

  select quantity into v_have from public.user_inventory where user_id = v_user and shop_item_id = v_item.id;
  return json_build_object('gems', v_gems - v_item.price_gems, 'item_key', v_item.key,
    'name', v_item.name, 'category', v_item.category, 'quantity', v_have, 'max_owned', v_max);
end; $$;

-- ================= equip_item =================
create or replace function public.equip_item(p_shop_item_id uuid)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_item public.shop_items%rowtype;
  v_owns boolean;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_item from public.shop_items where id = p_shop_item_id;
  if not found then raise exception 'Item not found'; end if;
  if v_item.category not in ('color_main','color_banner','anim','banner','effect','title') then
    raise exception 'This item type cannot be equipped';
  end if;
  select exists(select 1 from public.user_inventory
    where user_id = v_user and shop_item_id = v_item.id and quantity > 0) into v_owns;
  if not v_owns then raise exception 'You do not own this item'; end if;

  insert into public.user_equipped (user_id, category, shop_item_id, updated_at)
    values (v_user, v_item.category, v_item.id, now())
    on conflict (user_id, category) do update set shop_item_id = excluded.shop_item_id, updated_at = now();

  -- Legacy bridge for renderers not yet migrated to user_equipped.
  case v_item.category
    when 'color_main'   then update public.users set selected_main_color   = v_item.hex_value where id = v_user;
    when 'color_banner' then update public.users set selected_banner_color = v_item.hex_value where id = v_user;
    when 'anim'         then update public.users set equipped_animation    = v_item.key       where id = v_user;
    when 'banner'       then update public.users set equipped_banner       = v_item.key       where id = v_user;
    when 'effect'       then update public.users set equipped_decoration   = v_item.key       where id = v_user;
    when 'title'        then update public.users set equipped_title        = v_item.key       where id = v_user;
  end case;

  return json_build_object('equipped', v_item.key, 'category', v_item.category,
    'name', v_item.name, 'hex', v_item.hex_value, 'gradient', v_item.gradient_value);
end; $$;

-- ================= open_loot_box =================
create or replace function public.open_loot_box(p_loot_box_id uuid)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_box public.loot_boxes%rowtype;
  v_gems int; v_i int; v_item public.shop_items%rowtype;
  v_have int; v_max int; v_refund int;
  v_results jsonb := '[]'::jsonb; v_total_refund int := 0;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_box from public.loot_boxes where id = p_loot_box_id;
  if not found then raise exception 'Loot box not found'; end if;

  select gems into v_gems from public.users where id = v_user;
  if v_gems < v_box.price_gems then raise exception 'Need % more gems', v_box.price_gems - v_gems; end if;
  update public.users set gems = gems - v_box.price_gems, updated_at = now() where id = v_user;
  v_gems := v_gems - v_box.price_gems;

  for v_i in 1..v_box.items_per_open loop
    -- Weighted random selection (A-Res): random()^(1/weight), highest wins.
    select s.* into v_item
    from public.loot_box_drop_table d
    join public.shop_items s on s.id = d.shop_item_id
    where d.loot_box_id = v_box.id
    order by power(random(), 1.0 / d.weight) desc
    limit 1;

    v_max := coalesce(v_item.max_owned,1);
    select coalesce(quantity,0) into v_have from public.user_inventory
      where user_id = v_user and shop_item_id = v_item.id;
    v_have := coalesce(v_have,0);

    if v_have >= v_max then
      -- Duplicate cosmetic already at cap -> small gem refund fallback.
      v_refund := greatest(coalesce(v_item.price_gems,100)/4, 25);
      update public.users set gems = gems + v_refund where id = v_user;
      v_gems := v_gems + v_refund;
      v_total_refund := v_total_refund + v_refund;
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
end; $$;

grant execute on function public.purchase_shop_item(uuid) to authenticated;
grant execute on function public.equip_item(uuid) to authenticated;
grant execute on function public.open_loot_box(uuid) to authenticated;
