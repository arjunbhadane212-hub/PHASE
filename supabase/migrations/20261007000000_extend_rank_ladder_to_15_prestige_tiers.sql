-- Extend the XP rank ladder from 10 to 15 levels (5 prestige tiers above Apex).
-- Applied to the remote DB via Supabase apply_migration; filed here for the record.
--
-- Apex stops being an unbounded top rank (now 6001-8500); the new tiers sit above:
--   11 Ascendant  8501-11500
--   12 Mythic     11501-15500
--   13 Celestial  15501-21000
--   14 Immortal   21001-28000
--   15 Eternal    28001-999999
--
-- This overrides the previously-"locked" 10-rank ceiling in CLAUDE.md. The product
-- owner explicitly authorized extending the ladder (session 2026-10-07). The 10
-- existing rank names/colors are unchanged; only Apex's upper bound moved.

-- (1) level_for_xp: add thresholds for ranks 11-15. Lower bands unchanged.
create or replace function public.level_for_xp(p_xp integer)
 returns integer language sql immutable set search_path to 'public'
as $function$
  select case
    when p_xp >= 28001 then 15 when p_xp >= 21001 then 14 when p_xp >= 15501 then 13
    when p_xp >= 11501 then 12 when p_xp >= 8501 then 11 when p_xp >= 6001 then 10
    when p_xp >= 4201 then 9 when p_xp >= 3001 then 8 when p_xp >= 2101 then 7
    when p_xp >= 1401 then 6 when p_xp >= 901 then 5 when p_xp >= 501 then 4
    when p_xp >= 251 then 3 when p_xp >= 101 then 2 else 1 end;
$function$;

-- (2) Centralized rank-name lookup (was an inline CASE inside complete_habit).
-- Single source of truth for names 1-15; falls back to 'Eternal' above 15.
create or replace function public.rank_name_for(p_rank integer)
 returns text language sql immutable set search_path to 'public'
as $function$
  select case p_rank
    when 1 then 'Rookie' when 2 then 'Novice' when 3 then 'Apprentice' when 4 then 'Adept'
    when 5 then 'Achiever' when 6 then 'Expert' when 7 then 'Master' when 8 then 'Elite'
    when 9 then 'Champion' when 10 then 'Apex' when 11 then 'Ascendant' when 12 then 'Mythic'
    when 13 then 'Celestial' when 14 then 'Immortal' when 15 then 'Eternal'
    else 'Eternal' end;
$function$;

-- (3) complete_habit: identical to the live definition, except the inline rank-name
-- CASE is replaced by a call to rank_name_for(). All other logic (progress titles,
-- leaderboard integration, anti-abuse guards, daily_logs) is preserved verbatim.
create or replace function public.complete_habit(p_habit_id uuid, p_client_date date default null::date)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_habit public.habits%rowtype;
  v_xp int; v_gems int; v_mult int;
  v_new_xp int; v_rank_before int; v_rank_after int; v_level_up boolean; v_levelup_gems int; v_gems_today int; v_rank_name text;
  v_today date := coalesce(p_client_date, current_date);
  v_dow int := extract(dow from v_today);
  v_weekday text := lower(trim(to_char(v_today, 'FMDay')));
  v_already_today boolean; v_last_date date; v_anchor date; v_cur record;
  v_new_streak int; v_new_prev int; v_scheduled int; v_completed int; v_full_day boolean;
  v_ceiling int; v_vel int; v_today_cnt int; v_recent int;
  v_titles json;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if v_today < current_date - 1 or v_today > current_date + 1 then raise exception 'Invalid completion date'; end if;
  select * into v_habit from public.habits where id = p_habit_id and user_id = v_user;
  if not found then raise exception 'Habit not found or not owned by user'; end if;
  if exists (select 1 from public.habit_completions where habit_id = p_habit_id and completed_date = v_today) then
    raise exception 'Habit already logged today';
  end if;
  if v_habit.difficulty = 'easy' then v_xp := 10; v_gems := 5;
  elsif v_habit.difficulty = 'medium' then v_xp := 25; v_gems := 10;
  elsif v_habit.difficulty = 'hard' then v_xp := 50; v_gems := 20;
  else v_xp := 0; v_gems := 0; end if;
  if (select app_mode from public.users where id = v_user) = 'game' then
    select active_boost_multiplier into v_mult from public.users
      where id = v_user and active_boost_expires_at > now();
    if v_mult is not null and v_mult > 1 then v_xp := v_xp * v_mult; end if;
  end if;
  v_already_today := exists (select 1 from public.habit_completions
    where user_id = v_user and completed_date = v_today and status = 'completed');
  select max(completed_date) into v_last_date from public.habit_completions
    where user_id = v_user and completed_date < v_today and status = 'completed';
  insert into public.habit_completions (habit_id, user_id, completed_at, completed_date, status)
  values (p_habit_id, v_user, now(), v_today, 'completed');
  select current_xp, gems, current_streak, total_habits_completed, streak_day, previous_streak
    into v_cur from public.users where id = v_user;
  v_anchor := coalesce(v_cur.streak_day, v_last_date);
  if v_already_today then v_new_streak := v_cur.current_streak; v_new_prev := v_cur.previous_streak;
  elsif v_anchor = v_today then v_new_streak := v_cur.current_streak; v_new_prev := v_cur.previous_streak;
  elsif v_anchor = v_today - 1 then v_new_streak := v_cur.current_streak + 1; v_new_prev := v_cur.previous_streak;
  elsif v_anchor is null then v_new_streak := 1; v_new_prev := v_cur.previous_streak;
  else v_new_streak := 1; v_new_prev := case when v_cur.current_streak > 0 then v_cur.current_streak else v_cur.previous_streak end;
  end if;
  v_new_xp := v_cur.current_xp + v_xp;
  v_rank_before := public.level_for_xp(v_cur.current_xp);
  v_rank_after := public.level_for_xp(v_new_xp);
  v_level_up := v_rank_after > v_rank_before;
  v_levelup_gems := case when v_level_up then 50 else 0 end;
  v_gems_today := v_gems + v_levelup_gems;
  v_rank_name := public.rank_name_for(v_rank_after);
  update public.users set
    current_xp = v_new_xp, gems = v_cur.gems + v_gems_today,
    total_xp_all_time = coalesce(total_xp_all_time,0) + v_xp,
    longest_streak_ever = greatest(coalesce(longest_streak_ever,0), v_new_streak),
    rank = v_rank_after, highest_level_reached = greatest(highest_level_reached, v_rank_after),
    current_streak = v_new_streak, previous_streak = v_new_prev, streak_day = v_today,
    total_habits_completed = v_cur.total_habits_completed + 1, updated_at = now()
  where id = v_user;

  v_titles := public.sync_progress_titles(v_user);

  select count(*) into v_scheduled from public.habits h where h.user_id = v_user and (
    h.repeat_schedule = 'daily' or (h.repeat_schedule = 'weekdays' and v_dow between 1 and 5)
    or (h.repeat_schedule = 'weekends' and v_dow in (0, 6))
    or (h.repeat_schedule not in ('daily','weekdays','weekends') and coalesce(h.custom_days, '[]'::jsonb) ? v_weekday));
  select count(distinct hc.habit_id) into v_completed from public.habit_completions hc
    join public.habits h on h.id = hc.habit_id
    where hc.user_id = v_user and hc.completed_date = v_today and hc.status = 'completed' and (
      h.repeat_schedule = 'daily' or (h.repeat_schedule = 'weekdays' and v_dow between 1 and 5)
      or (h.repeat_schedule = 'weekends' and v_dow in (0, 6))
      or (h.repeat_schedule not in ('daily','weekdays','weekends') and coalesce(h.custom_days, '[]'::jsonb) ? v_weekday));
  v_full_day := (v_scheduled > 0 and v_completed >= v_scheduled);
  insert into public.daily_logs (user_id, log_date, habits_completed, xp_earned_today, gems_earned_today, full_day_completion)
  values (v_user, v_today, jsonb_build_array(p_habit_id::text), v_xp, v_gems_today, v_full_day)
  on conflict (user_id, log_date) do update set
    habits_completed = public.daily_logs.habits_completed || jsonb_build_array(p_habit_id::text),
    xp_earned_today = public.daily_logs.xp_earned_today + v_xp,
    gems_earned_today = public.daily_logs.gems_earned_today + v_gems_today,
    full_day_completion = v_full_day;

  if v_xp > 0 then
    insert into public.xp_events(user_id, amount, source, client_action_id)
    values (v_user, v_xp, 'habit_complete',
            md5(v_user::text || p_habit_id::text || v_today::text)::uuid)
    on conflict (user_id, client_action_id) do nothing;

    select value into v_ceiling from public.game_config where key = 'lb_daily_completion_ceiling';
    select value into v_vel     from public.game_config where key = 'lb_velocity_max_10s';
    v_ceiling := coalesce(v_ceiling, 50);
    v_vel     := coalesce(v_vel, 20);
    select count(*) into v_today_cnt from public.habit_completions
      where user_id = v_user and completed_date = v_today;
    select count(*) into v_recent from public.xp_events
      where user_id = v_user and created_at > now() - interval '10 seconds';
    if v_today_cnt > v_ceiling then
      insert into public.abuse_signals(user_id, kind, detail)
        values (v_user, 'daily_ceiling', jsonb_build_object('date', v_today, 'count', v_today_cnt));
      update public.users set shadow_flagged = true where id = v_user;
    end if;
    if v_recent > v_vel then
      insert into public.abuse_signals(user_id, kind, detail)
        values (v_user, 'velocity', jsonb_build_object('recent_10s', v_recent));
      update public.users set shadow_flagged = true where id = v_user;
    end if;

    update public.leaderboard_memberships m
       set period_xp = m.period_xp + v_xp
      from public.leaderboard_groups g,
           public.leaderboard_periods p,
           public.users pr
     where p.status = 'active'
       and g.period_id = p.id
       and m.group_id = g.id
       and m.user_id = v_user
       and pr.id = v_user
       and pr.app_mode = 'game'
       and pr.leaderboard_eligible = true
       and pr.shadow_flagged = false
       and pr.banned_at is null
       and pr.leaderboard_active = true;
  end if;

  return json_build_object('xp_earned', v_xp, 'gems_earned', v_gems, 'gems', v_cur.gems + v_gems_today,
    'current_xp', v_new_xp, 'current_streak', v_new_streak, 'total_habits_completed', v_cur.total_habits_completed + 1,
    'full_day_completion', v_full_day, 'boost_multiplier', coalesce(v_mult, 1),
    'level_up', v_level_up, 'level_up_gems', v_levelup_gems, 'rank', v_rank_after, 'rank_name', v_rank_name,
    'newly_unlocked', coalesce(v_titles->'newly_unlocked', '[]'::json));
end; $function$;

-- (4) Recompute stored rank for existing users so high-XP players land on the new
-- prestige tiers immediately (rank is otherwise only recomputed on next completion).
update public.users
   set rank = public.level_for_xp(current_xp),
       highest_level_reached = greatest(coalesce(highest_level_reached,0), public.level_for_xp(current_xp));
