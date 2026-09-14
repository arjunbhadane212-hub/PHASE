-- Leaderboard: mid-period placement + auto-place on view.
--
-- Previously users were only grouped into a league at the Monday period_start,
-- so a new/late-eligible user waited until next week to appear. This adds
-- lb_ensure_membership() to place an eligible user into the CURRENT active
-- period on demand (idempotent, backfilling period_xp from xp_events since the
-- period began), and calls it at the top of get_leaderboard() so any eligible
-- viewer is placed the moment they open the League after doing some habits.
--
-- (Applied live to project dnfcrpthpinilibvqwtf via MCP on 2026-09-13.)

create or replace function public.lb_ensure_membership(p_user uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_pid bigint; v_starts timestamptz; v_tier int; v_gsize int; v_gid bigint; v_xp int;
begin
  if p_user is null then return; end if;
  select id, starts_at into v_pid, v_starts from public.leaderboard_periods where status='active' limit 1;
  if v_pid is null then return; end if;
  if exists (
    select 1 from public.leaderboard_memberships m
    join public.leaderboard_groups g on g.id = m.group_id
    where g.period_id = v_pid and m.user_id = p_user
  ) then return; end if;
  select leaderboard_tier into v_tier from public.users
    where id = p_user and app_mode = 'game' and leaderboard_eligible and leaderboard_active
      and not shadow_flagged and banned_at is null;
  if v_tier is null then return; end if;
  select coalesce(group_size, 15) into v_gsize from public.leaderboard_tier_config where tier = v_tier;
  v_gsize := coalesce(v_gsize, 15);
  select g.id into v_gid
  from public.leaderboard_groups g
  left join public.leaderboard_memberships m on m.group_id = g.id
  where g.period_id = v_pid and g.tier = v_tier
  group by g.id
  having (v_tier = 10 or count(m.id) < v_gsize)
  order by count(m.id) asc
  limit 1;
  if v_gid is null then
    insert into public.leaderboard_groups(period_id, tier, group_index)
    values (v_pid, v_tier,
      coalesce((select max(group_index) + 1 from public.leaderboard_groups where period_id = v_pid and tier = v_tier), 0))
    returning id into v_gid;
  end if;
  select coalesce(sum(amount), 0)::int into v_xp
    from public.xp_events where user_id = p_user and created_at >= v_starts;
  insert into public.leaderboard_memberships(group_id, user_id, period_xp)
  values (v_gid, p_user, v_xp);
end $$;

grant execute on function public.lb_ensure_membership(uuid) to authenticated, service_role;

-- get_leaderboard now auto-places an eligible viewer before reading.
create or replace function public.get_leaderboard()
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_gid bigint; v_pid bigint; v_tier int; v_gidx int; v_ends timestamptz; v_starts timestamptz;
  v_size int; v_p int; v_d int; v_pd int[]; v_json json;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  perform public.lb_ensure_membership(v_user);

  select g.id, g.period_id, g.tier, g.group_index, p.ends_at, p.starts_at
    into v_gid, v_pid, v_tier, v_gidx, v_ends, v_starts
  from public.leaderboard_memberships m
  join public.leaderboard_groups g on g.id = m.group_id
  join public.leaderboard_periods p on p.id = g.period_id
  where m.user_id = v_user and p.status in ('active','closing')
  limit 1;

  if v_gid is null then
    return json_build_object('status','not_in_league');
  end if;

  select count(*) into v_size from public.leaderboard_memberships where group_id = v_gid;
  select promote_count, demote_count into v_p, v_d from public.leaderboard_tier_config where tier = v_tier;
  v_pd := public._lb_pd(v_size, coalesce(v_p,4), coalesce(v_d,4));
  v_p := v_pd[1]; v_d := v_pd[2];

  with last_ev as (
    select user_id, max(created_at) as last_ev
    from public.xp_events where created_at >= v_starts group by user_id
  ),
  rows as (
    select m.user_id, m.period_xp,
      row_number() over (order by m.period_xp desc, le.last_ev asc nulls last, m.user_id asc) as rnk,
      u.username, u.first_name, u.equipped_icon, u.equipped_title,
      u.selected_main_color, u.current_streak, u.leaderboard_tier
    from public.leaderboard_memberships m
    join public.users u on u.id = m.user_id
    left join last_ev le on le.user_id = m.user_id
    where m.group_id = v_gid
  )
  select json_build_object(
    'status','ok', 'period_id', v_pid, 'ends_at', v_ends,
    'tier', v_tier, 'tier_name', (select name from public.leaderboard_tier_config where tier = v_tier),
    'group_index', v_gidx, 'member_count', v_size,
    'promote_count', v_p, 'demote_count', v_d,
    'rows', coalesce(json_agg(json_build_object(
        'rank', rnk, 'user_id', user_id, 'is_me', (user_id = v_user),
        'display_name', coalesce(nullif(username,''), first_name),
        'username', username, 'equipped_icon', equipped_icon, 'equipped_title', equipped_title,
        'main_color', selected_main_color, 'streak', current_streak, 'tier', leaderboard_tier,
        'period_xp', period_xp,
        'zone', case when rnk <= v_p then 'promotion'
                     when rnk > v_size - v_d then 'demotion'
                     else 'holding' end
      ) order by rnk), '[]'::json)
  ) into v_json from rows;

  return v_json;
end $function$;
