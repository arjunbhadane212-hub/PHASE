-- Phase app: fix habit-completion "day" to the user's LOCAL day, and add a
-- real uncomplete path that reverts the rewards it granted.
--
-- Root cause of the "shows unsaved but gems went up" report: complete_habit
-- stamped completed_date = current_date (UTC on Supabase) and the client read
-- back the UTC day too, so a habit completed near local midnight landed on the
-- "wrong" day for anyone not on UTC. Both sides now agree on a client-supplied
-- local date, clamped to +/- 1 day of the server date so it can't be spoofed
-- to farm streaks.
--
-- Uncomplete previously POSTed to a dead FastAPI endpoint (no-op). It is now a
-- real RPC that deletes the completion and reverses gems/XP/streak/daily_logs.

-- Single definition (drop the old 1-arg form so there's no overload ambiguity).
drop function if exists public.complete_habit(uuid);

create or replace function public.complete_habit(p_habit_id uuid, p_client_date date default null)
returns json
language plpgsql
security definer set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_habit public.habits%rowtype;
  v_xp int;
  v_gems int;
  v_today date := coalesce(p_client_date, current_date);
  v_dow int := extract(dow from v_today);
  v_weekday text := lower(trim(to_char(v_today, 'FMDay')));
  v_already_today boolean;
  v_last_date date;
  v_cur record;
  v_new_streak int;
  v_scheduled int;
  v_completed int;
  v_full_day boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- A local day can differ from the server (UTC) day by at most one, given the
  -- real timezone range (UTC-12 .. UTC+14). Reject anything outside that.
  if v_today < current_date - 1 or v_today > current_date + 1 then
    raise exception 'Invalid completion date';
  end if;

  select * into v_habit from public.habits where id = p_habit_id and user_id = v_user;
  if not found then
    raise exception 'Habit not found or not owned by user';
  end if;

  if exists (
    select 1 from public.habit_completions
    where habit_id = p_habit_id and completed_date = v_today
  ) then
    raise exception 'Habit already completed today';
  end if;

  -- reward by difficulty (confirmed final values)
  if v_habit.difficulty = 'easy' then
    v_xp := 10; v_gems := 5;
  elsif v_habit.difficulty = 'medium' then
    v_xp := 25; v_gems := 10;
  elsif v_habit.difficulty = 'hard' then
    v_xp := 50; v_gems := 20;
  else
    v_xp := 0; v_gems := 0;
  end if;

  -- streak inputs captured BEFORE inserting today's completion
  v_already_today := exists (
    select 1 from public.habit_completions
    where user_id = v_user and completed_date = v_today
  );
  select max(completed_date) into v_last_date
    from public.habit_completions
    where user_id = v_user and completed_date < v_today;

  insert into public.habit_completions (habit_id, user_id, completed_at, completed_date)
  values (p_habit_id, v_user, now(), v_today);

  select current_xp, gems, current_streak, total_habits_completed
    into v_cur from public.users where id = v_user;

  if v_already_today then
    v_new_streak := v_cur.current_streak;
  elsif v_last_date = v_today - 1 then
    v_new_streak := v_cur.current_streak + 1;
  else
    v_new_streak := 1;
  end if;

  update public.users set
    current_xp = v_cur.current_xp + v_xp,
    gems = v_cur.gems + v_gems,
    current_streak = v_new_streak,
    total_habits_completed = v_cur.total_habits_completed + 1,
    updated_at = now()
  where id = v_user;

  -- ===== daily_logs upsert =====
  select count(*) into v_scheduled
  from public.habits h
  where h.user_id = v_user
    and (
      h.repeat_schedule = 'daily'
      or (h.repeat_schedule = 'weekdays' and v_dow between 1 and 5)
      or (h.repeat_schedule = 'weekends' and v_dow in (0, 6))
      or (h.repeat_schedule not in ('daily','weekdays','weekends')
          and coalesce(h.custom_days, '[]'::jsonb) ? v_weekday)
    );

  select count(distinct hc.habit_id) into v_completed
  from public.habit_completions hc
  join public.habits h on h.id = hc.habit_id
  where hc.user_id = v_user and hc.completed_date = v_today
    and (
      h.repeat_schedule = 'daily'
      or (h.repeat_schedule = 'weekdays' and v_dow between 1 and 5)
      or (h.repeat_schedule = 'weekends' and v_dow in (0, 6))
      or (h.repeat_schedule not in ('daily','weekdays','weekends')
          and coalesce(h.custom_days, '[]'::jsonb) ? v_weekday)
    );

  v_full_day := (v_scheduled > 0 and v_completed >= v_scheduled);

  insert into public.daily_logs (user_id, log_date, habits_completed, xp_earned_today, gems_earned_today, full_day_completion)
  values (v_user, v_today, jsonb_build_array(p_habit_id::text), v_xp, v_gems, v_full_day)
  on conflict (user_id, log_date) do update set
    habits_completed = public.daily_logs.habits_completed || jsonb_build_array(p_habit_id::text),
    xp_earned_today = public.daily_logs.xp_earned_today + v_xp,
    gems_earned_today = public.daily_logs.gems_earned_today + v_gems,
    full_day_completion = v_full_day;

  return json_build_object(
    'xp_earned', v_xp,
    'gems_earned', v_gems,
    'current_xp', v_cur.current_xp + v_xp,
    'gems', v_cur.gems + v_gems,
    'current_streak', v_new_streak,
    'total_habits_completed', v_cur.total_habits_completed + 1,
    'full_day_completion', v_full_day
  );
end;
$function$;

grant execute on function public.complete_habit(uuid, date) to authenticated;

-- ===== uncomplete: real revert =====
create or replace function public.uncomplete_habit(p_habit_id uuid, p_client_date date default null)
returns json
language plpgsql
security definer set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_habit public.habits%rowtype;
  v_today date := coalesce(p_client_date, current_date);
  v_dow int := extract(dow from v_today);
  v_weekday text := lower(trim(to_char(v_today, 'FMDay')));
  v_xp int;
  v_gems int;
  v_cur record;
  v_remaining int;
  v_new_streak int;
  v_scheduled int;
  v_completed int;
  v_full_day boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if v_today < current_date - 1 or v_today > current_date + 1 then
    raise exception 'Invalid date';
  end if;

  select * into v_habit from public.habits where id = p_habit_id and user_id = v_user;
  if not found then
    raise exception 'Habit not found or not owned by user';
  end if;

  if not exists (
    select 1 from public.habit_completions
    where habit_id = p_habit_id and user_id = v_user and completed_date = v_today
  ) then
    raise exception 'Habit is not completed on that date';
  end if;

  -- reward that was granted (same difficulty mapping as complete_habit)
  if v_habit.difficulty = 'easy' then
    v_xp := 10; v_gems := 5;
  elsif v_habit.difficulty = 'medium' then
    v_xp := 25; v_gems := 10;
  elsif v_habit.difficulty = 'hard' then
    v_xp := 50; v_gems := 20;
  else
    v_xp := 0; v_gems := 0;
  end if;

  delete from public.habit_completions
  where habit_id = p_habit_id and user_id = v_user and completed_date = v_today;

  select count(*) into v_remaining
  from public.habit_completions
  where user_id = v_user and completed_date = v_today;

  select current_xp, gems, current_streak, total_habits_completed
    into v_cur from public.users where id = v_user;

  -- The day's streak credit exists iff >= 1 completion remains today; if this
  -- removal empties the day, undo the +1 that the first completion granted.
  if v_remaining = 0 then
    v_new_streak := greatest(v_cur.current_streak - 1, 0);
  else
    v_new_streak := v_cur.current_streak;
  end if;

  update public.users set
    current_xp = greatest(v_cur.current_xp - v_xp, 0),
    gems = greatest(v_cur.gems - v_gems, 0),
    current_streak = v_new_streak,
    total_habits_completed = greatest(v_cur.total_habits_completed - 1, 0),
    updated_at = now()
  where id = v_user;

  -- daily_logs revert (recompute full-day flag against what's left)
  select count(*) into v_scheduled
  from public.habits h
  where h.user_id = v_user
    and (
      h.repeat_schedule = 'daily'
      or (h.repeat_schedule = 'weekdays' and v_dow between 1 and 5)
      or (h.repeat_schedule = 'weekends' and v_dow in (0, 6))
      or (h.repeat_schedule not in ('daily','weekdays','weekends')
          and coalesce(h.custom_days, '[]'::jsonb) ? v_weekday)
    );

  select count(distinct hc.habit_id) into v_completed
  from public.habit_completions hc
  join public.habits h on h.id = hc.habit_id
  where hc.user_id = v_user and hc.completed_date = v_today
    and (
      h.repeat_schedule = 'daily'
      or (h.repeat_schedule = 'weekdays' and v_dow between 1 and 5)
      or (h.repeat_schedule = 'weekends' and v_dow in (0, 6))
      or (h.repeat_schedule not in ('daily','weekdays','weekends')
          and coalesce(h.custom_days, '[]'::jsonb) ? v_weekday)
    );

  v_full_day := (v_scheduled > 0 and v_completed >= v_scheduled);

  update public.daily_logs set
    habits_completed = coalesce(habits_completed, '[]'::jsonb) - p_habit_id::text,
    xp_earned_today = greatest(xp_earned_today - v_xp, 0),
    gems_earned_today = greatest(gems_earned_today - v_gems, 0),
    full_day_completion = v_full_day
  where user_id = v_user and log_date = v_today;

  select current_xp, gems, current_streak, total_habits_completed
    into v_cur from public.users where id = v_user;

  return json_build_object(
    'xp_removed', v_xp,
    'gems_removed', v_gems,
    'current_xp', v_cur.current_xp,
    'gems', v_cur.gems,
    'current_streak', v_cur.current_streak,
    'total_habits_completed', v_cur.total_habits_completed
  );
end;
$function$;

grant execute on function public.uncomplete_habit(uuid, date) to authenticated;
