-- Step 8: Public Profile + lifetime stats.
-- Applied to the remote DB via Supabase apply_migration; filed here for the record.
-- NOTE: assumes prior migrations (Step 6 boost columns/RPC, Step 7 level_for_xp +
-- rank/highest_level_reached) which were applied via MCP and are NOT yet in this repo.

-- Lifetime stat columns (public-profile flex numbers).
alter table public.users
  add column if not exists total_xp_all_time int not null default 0,
  add column if not exists longest_streak_ever int not null default 0;

-- complete_habit: additive lifetime maintenance (preserves Step 6 boost + Step 7 level).
-- total_xp_all_time only ever increases; longest_streak_ever is a running max — so
-- uncomplete_habit / abandon_focus_session need no change.
create or replace function public.complete_habit(p_habit_id uuid, p_client_date date default null::date)
 returns json language plpgsql security definer set search_path to 'public'
as $fn$
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
  v_rank_name := case v_rank_after
    when 1 then 'Rookie' when 2 then 'Novice' when 3 then 'Apprentice' when 4 then 'Adept'
    when 5 then 'Achiever' when 6 then 'Expert' when 7 then 'Master' when 8 then 'Elite'
    when 9 then 'Champion' when 10 then 'Apex' else 'Apex' end;
  update public.users set
    current_xp = v_new_xp, gems = v_cur.gems + v_gems_today,
    total_xp_all_time = coalesce(total_xp_all_time,0) + v_xp,
    longest_streak_ever = greatest(coalesce(longest_streak_ever,0), v_new_streak),
    rank = v_rank_after, highest_level_reached = greatest(highest_level_reached, v_rank_after),
    current_streak = v_new_streak, previous_streak = v_new_prev, streak_day = v_today,
    total_habits_completed = v_cur.total_habits_completed + 1, updated_at = now()
  where id = v_user;
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
  return json_build_object('xp_earned', v_xp, 'gems_earned', v_gems, 'gems', v_cur.gems + v_gems_today,
    'current_xp', v_new_xp, 'current_streak', v_new_streak, 'total_habits_completed', v_cur.total_habits_completed + 1,
    'full_day_completion', v_full_day, 'boost_multiplier', coalesce(v_mult, 1),
    'level_up', v_level_up, 'level_up_gems', v_levelup_gems, 'rank', v_rank_after, 'rank_name', v_rank_name);
end; $fn$;

-- Public profile read: SECURITY DEFINER (bypasses users RLS), is_public-gated,
-- returns only public-safe fields. Callable by anon (logged-out visitors).
create or replace function public.get_public_profile(p_username text)
 returns json language plpgsql security definer set search_path to 'public'
as $fn$
declare v_u public.users%rowtype;
begin
  select * into v_u from public.users where username = p_username;
  if not found then raise exception 'Profile not found'; end if;
  if not coalesce(v_u.is_public, true) then raise exception 'Profile is private'; end if;
  return json_build_object(
    'username', v_u.username, 'first_name', v_u.first_name, 'last_name', v_u.last_name,
    'rank', v_u.rank, 'current_xp', v_u.current_xp, 'total_xp_all_time', v_u.total_xp_all_time,
    'current_streak', v_u.current_streak, 'longest_streak_ever', v_u.longest_streak_ever,
    'total_habits_completed', v_u.total_habits_completed, 'member_since', v_u.created_at,
    'selected_main_color', v_u.selected_main_color, 'selected_banner_color', v_u.selected_banner_color,
    'equipped_banner', v_u.equipped_banner, 'equipped_animation', v_u.equipped_animation,
    'equipped_decoration', v_u.equipped_decoration, 'equipped_icon', v_u.equipped_icon,
    'equipped_title', v_u.equipped_title,
    'equipped_title_name', (select name from public.shop_items where key = v_u.equipped_title),
    'equipped_title_rarity', (select rarity from public.shop_items where key = v_u.equipped_title),
    'owned_titles', (select coalesce(jsonb_agg(jsonb_build_object('key',si.key,'name',si.name,'rarity',si.rarity) order by si.name),'[]'::jsonb)
      from public.user_inventory ui join public.shop_items si on si.id=ui.shop_item_id
      where ui.user_id = v_u.id and si.category='title')
  );
end; $fn$;
grant execute on function public.get_public_profile(text) to anon, authenticated;

-- Backfill lifetime columns from current values.
update public.users set
  total_xp_all_time = greatest(coalesce(total_xp_all_time,0), current_xp),
  longest_streak_ever = greatest(coalesce(longest_streak_ever,0), current_streak, previous_streak);
