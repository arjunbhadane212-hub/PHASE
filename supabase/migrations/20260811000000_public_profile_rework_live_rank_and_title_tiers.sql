-- Public Profile Rework (Aug 2026). Applied to the remote DB via Supabase
-- apply_migration; filed here for the record.
--
-- Two things:
-- 1) Title tier identity on the canonical catalog (shop_items), so the
--    Delta/Phase visual treatments are data-driven instead of guessed from a
--    rarity string. Titles already flow through shop_items + user_inventory +
--    equip_item + open_loot_box, so tiering the catalog is the change that
--    makes the box-titles spec real without forking ownership into a second
--    table the drop pipeline would never write to.
-- 2) get_public_profile v3: LIVE league standing, LIVE global rank, and level
--    progress. Nothing on the profile is a placeholder any more -- if you are
--    not in a league, the badge says UNPLACED rather than inventing a rank.

alter table public.shop_items
  add column if not exists box_tier text
    check (box_tier in ('starter','delta','phase')),
  add column if not exists rarity_style text
    check (rarity_style in ('starter','delta','phase'));

-- Backfill from the actual drop tables: a title's tier is the box it drops
-- from. Shared titles (Overkill / Vermin / Relentless) that drop from both
-- Delta and Phase resolve to the higher box -- the "renders at its best" rule.
with src as (
  select d.shop_item_id,
         max(case lb.key when 'phase' then 3 when 'delta' then 2 else 1 end) as lvl
  from public.loot_box_drop_table d
  join public.loot_boxes lb on lb.id = d.loot_box_id
  join public.shop_items s on s.id = d.shop_item_id
  where s.category = 'title'
  group by d.shop_item_id
)
update public.shop_items s
set box_tier     = case src.lvl when 3 then 'phase' when 2 then 'delta' else 'starter' end,
    rarity_style = case src.lvl when 3 then 'phase' when 2 then 'delta' else 'starter' end
from src where src.shop_item_id = s.id;

update public.shop_items
set box_tier     = coalesce(box_tier, case when rarity in ('mythic','ultra') then 'phase'
                                           when rarity in ('legendary','epic','rare') then 'delta'
                                           else 'starter' end),
    rarity_style = coalesce(rarity_style, case when rarity in ('mythic','ultra') then 'phase'
                                               when rarity in ('legendary','epic','rare') then 'delta'
                                               else 'starter' end)
where category = 'title';

create or replace function public.get_public_profile(p_username text)
 returns json language plpgsql security definer set search_path to 'public'
as $fn$
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

  -- Live league standing: same ordering as get_leaderboard so the number on the
  -- profile and the number on the leaderboard can never disagree.
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

  -- Live global standing by lifetime XP among public, non-banned accounts.
  select rnk, total into v_global_rank, v_global_total from (
    select id, row_number() over (order by total_xp_all_time desc, created_at asc) as rnk,
           count(*) over () as total
    from public.users
    where coalesce(is_public,true) and banned_at is null and not coalesce(shadow_flagged,false)
  ) q where q.id = v_u.id;

  -- Level progress (mirrors data/levels.js thresholds).
  select mn, mx into v_lvl_min, v_lvl_max from (values
    (1,0,100),(2,101,250),(3,251,500),(4,501,900),(5,901,1400),
    (6,1401,2100),(7,2101,3000),(8,3001,4200),(9,4201,6000),(10,6001,6000)
  ) as t(lvl,mn,mx) where lvl = greatest(1, least(10, coalesce(v_u.rank,1)));

  return json_build_object(
    'username', v_u.username, 'first_name', v_u.first_name, 'last_name', v_u.last_name,
    'rank', v_u.rank, 'current_xp', v_u.current_xp, 'total_xp_all_time', v_u.total_xp_all_time,
    'highest_level_reached', v_u.highest_level_reached,
    'level_min_xp', v_lvl_min, 'level_max_xp', v_lvl_max,
    'level_progress_pct', case when coalesce(v_u.rank,1) >= 10 then 100
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
    'owned_titles', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', si.key, 'name', si.name, 'rarity', si.rarity,
        'style', coalesce(si.rarity_style,'starter'), 'box_tier', si.box_tier,
        'acquired_at', ui.acquired_at, 'acquired_via', ui.acquired_via
      ) order by case coalesce(si.rarity_style,'starter')
                   when 'phase' then 0 when 'delta' then 1 else 2 end, si.name), '[]'::jsonb)
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
end; $fn$;

grant execute on function public.get_public_profile(text) to anon, authenticated;
