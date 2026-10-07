-- Follow-up to the 15-rank extension (20261007000000). get_public_profile computed
-- the level XP band from a hard-coded 1-10 VALUES list, clamped rank with
-- least(10,...), and treated rank>=10 as 100%. With prestige tiers that mis-renders
-- ranks 10-15 (Apex is no longer the max, and 11-15 all collapsed to the Apex band).
-- Patch: extend the band table to 15 (level 10 now 6001-8500), clamp to 15, cap only
-- at 15 (Eternal). Every other line is identical to the live definition.
-- Applied to the remote DB via Supabase apply_migration; filed here for the record.
create or replace function public.get_public_profile(p_username text)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_u public.users%rowtype;
  v_gid bigint; v_tier int; v_gidx int; v_starts timestamptz; v_ends timestamptz;
  v_size int; v_p int; v_d int; v_pd int[]; v_pos int; v_pxp int; v_zone text;
  v_lvl_min int; v_lvl_max int;
  v_global_rank int; v_global_total int;
begin
  select * into v_u from public.users where username = p_username;
  if not found then raise exception 'Profile not found'; end if;
  if not coalesce(v_u.is_public, true) then raise exception 'Profile is private'; end if;

  select g.id, g.tier, g.group_index, p.starts_at, p.ends_at
    into v_gid, v_tier, v_gidx, v_starts, v_ends
  from public.leaderboard_memberships m
  join public.leaderboard_groups g on g.id = m.group_id
  join public.leaderboard_periods p on p.id = g.period_id
  where m.user_id = v_u.id and p.status in ('active','closing')
  limit 1;

  if v_gid is not null then
    select count(*) into v_size from public.leaderboard_memberships where group_id = v_gid;
    select promote_count, demote_count into v_p, v_d
      from public.leaderboard_tier_config where tier = v_tier;
    v_pd := public._lb_pd(v_size, coalesce(v_p,4), coalesce(v_d,4));
    v_p := v_pd[1]; v_d := v_pd[2];

    with last_ev as (
      select user_id, max(created_at) as last_ev
      from public.xp_events where created_at >= v_starts group by user_id
    ), ranked as (
      select m.user_id, m.period_xp,
             row_number() over (order by m.period_xp desc, le.last_ev asc nulls last, m.user_id asc) as rnk
      from public.leaderboard_memberships m
      left join last_ev le on le.user_id = m.user_id
      where m.group_id = v_gid
    )
    select rnk, period_xp into v_pos, v_pxp from ranked where user_id = v_u.id;

    v_zone := case when v_pos <= v_p then 'promotion'
                   when v_pos > v_size - v_d then 'demotion'
                   else 'holding' end;
  end if;

  select rnk, total into v_global_rank, v_global_total from (
    select id, row_number() over (order by total_xp_all_time desc, created_at asc) as rnk,
           count(*) over () as total
    from public.users
    where coalesce(is_public,true) and banned_at is null and not coalesce(shadow_flagged,false)
  ) q where q.id = v_u.id;

  -- Level progress (mirrors data/levels.js thresholds, now 1-15).
  select mn, mx into v_lvl_min, v_lvl_max from (values
    (1,0,100),(2,101,250),(3,251,500),(4,501,900),(5,901,1400),
    (6,1401,2100),(7,2101,3000),(8,3001,4200),(9,4201,6000),(10,6001,8500),
    (11,8501,11500),(12,11501,15500),(13,15501,21000),(14,21001,28000),(15,28001,28000)
  ) as t(lvl,mn,mx) where lvl = greatest(1, least(15, coalesce(v_u.rank,1)));

  return json_build_object(
    'username', v_u.username, 'first_name', v_u.first_name, 'last_name', v_u.last_name,
    'rank', v_u.rank, 'current_xp', v_u.current_xp, 'total_xp_all_time', v_u.total_xp_all_time,
    'highest_level_reached', v_u.highest_level_reached,
    'level_min_xp', v_lvl_min, 'level_max_xp', v_lvl_max,
    'level_progress_pct', case when coalesce(v_u.rank,1) >= 15 then 100
      else round(100.0 * greatest(0, coalesce(v_u.current_xp,0) - v_lvl_min)
                 / nullif(v_lvl_max - v_lvl_min, 0)) end,
    'current_streak', v_u.current_streak, 'longest_streak_ever', v_u.longest_streak_ever,
    'total_habits_completed', v_u.total_habits_completed, 'member_since', v_u.created_at,
    'selected_main_color', v_u.selected_main_color, 'selected_banner_color', v_u.selected_banner_color,
    'equipped_banner', v_u.equipped_banner, 'equipped_animation', v_u.equipped_animation,
    'equipped_decoration', v_u.equipped_decoration, 'equipped_icon', v_u.equipped_icon,
    'equipped_title', v_u.equipped_title,
    'equipped_title_name',   (select name         from public.shop_items where key = v_u.equipped_title),
    'equipped_title_rarity', (select rarity       from public.shop_items where key = v_u.equipped_title),
    'equipped_title_style',  (select rarity_style from public.shop_items where key = v_u.equipped_title),
    'equipped_title_rarity_tier', (select rarity_tier    from public.shop_items where key = v_u.equipped_title),
    'equipped_title_source',      (select source_system  from public.shop_items where key = v_u.equipped_title),
    'owned_titles', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', si.key, 'name', si.name, 'rarity', si.rarity,
        'style', coalesce(si.rarity_style,'starter'), 'box_tier', si.box_tier,
        'rarity_tier', si.rarity_tier, 'source_system', si.source_system,
        'acquired_at', ui.acquired_at, 'acquired_via', ui.acquired_via
      ) order by
        array_position(array['mythic','legendary','epic','rare','common'],
                       coalesce(si.rarity_tier,'common')),
        si.source_system, si.name), '[]'::jsonb)
      from public.user_inventory ui
      join public.shop_items si on si.id = ui.shop_item_id
      where ui.user_id = v_u.id and si.category = 'title' and ui.quantity > 0),
    'titles_owned_count', (
      select count(*) from public.user_inventory ui
      join public.shop_items si on si.id = ui.shop_item_id
      where ui.user_id = v_u.id and si.category = 'title' and ui.quantity > 0),
    'leaderboard_tier', v_u.leaderboard_tier,
    'leaderboard_tier_name', (select name from public.leaderboard_tier_config where tier = v_u.leaderboard_tier),
    'current_period_xp', v_pxp,
    'live_standing', case when v_gid is null then null else json_build_object(
        'position', v_pos, 'group_size', v_size, 'zone', v_zone,
        'tier', v_tier,
        'tier_name', (select name from public.leaderboard_tier_config where tier = v_tier),
        'group_index', v_gidx, 'promote_count', v_p, 'demote_count', v_d,
        'ends_at', v_ends) end,
    'global_rank', v_global_rank, 'global_total', v_global_total,
    'period_history', (
      select coalesce(json_agg(h), '[]'::json) from (
        select p.ends_at, tc.name as tier_name, g.tier as tier_num,
               m.final_rank, m.result, m.period_xp
        from public.leaderboard_memberships m
        join public.leaderboard_groups g on g.id = m.group_id
        join public.leaderboard_periods p on p.id = g.period_id
        left join public.leaderboard_tier_config tc on tc.tier = g.tier
        where m.user_id = v_u.id and p.status = 'closed' and m.result is not null
        order by p.ends_at desc limit 10
      ) h)
  );
end; $function$;
