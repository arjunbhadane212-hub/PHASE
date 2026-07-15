-- Keep streak_day consistent across the parallel session's uncomplete_habit and
-- guard complete_habit against a stale "today" anchor.
--
-- Bug: streak_day (added in 20260714000000_streak_shields_penalties) tracks the
-- day the streak is credited through. uncomplete_habit (added in
-- 20260714000000_local_day_and_uncomplete) predates that column, so after
-- unchecking the last completion of the day it left streak_day = today while
-- decrementing the streak. Re-completing then saw anchor = today (neither
-- today-1 nor null) and restarted the streak at 1.
--
-- Fix: uncomplete_habit now re-derives streak_day from the latest remaining real
-- completion, and only ever operates on status='completed' rows (so it can't
-- refund a failed/abandoned attempt that earned nothing). complete_habit also
-- treats anchor = today as "already credited" for defence in depth.
--
-- This migration must run AFTER both same-day 20260714000000_* migrations.

create or replace function public.complete_habit(p_habit_id uuid, p_client_date date default null)
returns json
language plpgsql
security definer set search_path = public
as $$
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
  v_anchor date;
  v_cur record;
  v_new_streak int;
  v_new_prev int;
  v_scheduled int;
  v_completed int;
  v_full_day boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

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
    raise exception 'Habit already logged today';
  end if;

  if v_habit.difficulty = 'easy' then
    v_xp := 10; v_gems := 5;
  elsif v_habit.difficulty = 'medium' then
    v_xp := 25; v_gems := 10;
  elsif v_habit.difficulty = 'hard' then
    v_xp := 50; v_gems := 20;
  else
    v_xp := 0; v_gems := 0;
  end if;

  v_already_today := exists (
    select 1 from public.habit_completions
    where user_id = v_user and completed_date = v_today and status = 'completed'
  );
  select max(completed_date) into v_last_date
    from public.habit_completions
    where user_id = v_user and completed_date < v_today and status = 'completed';

  insert into public.habit_completions (habit_id, user_id, completed_at, completed_date, status)
  values (p_habit_id, v_user, now(), v_today, 'completed');

  select current_xp, gems, current_streak, total_habits_completed, streak_day, previous_streak
    into v_cur from public.users where id = v_user;

  v_anchor := coalesce(v_cur.streak_day, v_last_date);

  if v_already_today then
    v_new_streak := v_cur.current_streak;
    v_new_prev   := v_cur.previous_streak;
  elsif v_anchor = v_today then
    -- Streak already credited through today (e.g. uncompleted then redone).
    v_new_streak := v_cur.current_streak;
    v_new_prev   := v_cur.previous_streak;
  elsif v_anchor = v_today - 1 then
    v_new_streak := v_cur.current_streak + 1;
    v_new_prev   := v_cur.previous_streak;
  elsif v_anchor is null then
    v_new_streak := 1;
    v_new_prev   := v_cur.previous_streak;
  else
    v_new_streak := 1;
    v_new_prev   := case when v_cur.current_streak > 0
                         then v_cur.current_streak
                         else v_cur.previous_streak end;
  end if;

  update public.users set
    current_xp = v_cur.current_xp + v_xp,
    gems = v_cur.gems + v_gems,
    current_streak = v_new_streak,
    previous_streak = v_new_prev,
    streak_day = v_today,
    total_habits_completed = v_cur.total_habits_completed + 1,
    updated_at = now()
  where id = v_user;

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
  where hc.user_id = v_user and hc.completed_date = v_today and hc.status = 'completed'
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
$$;

create or replace function public.uncomplete_habit(p_habit_id uuid, p_client_date date default null)
returns json
language plpgsql
security definer set search_path = public
as $$
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

  -- Only real completions can be undone (never a failed/abandoned row, which
  -- earned no XP/gems and must not be refunded).
  if not exists (
    select 1 from public.habit_completions
    where habit_id = p_habit_id and user_id = v_user and completed_date = v_today and status = 'completed'
  ) then
    raise exception 'Habit is not completed on that date';
  end if;

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
  where habit_id = p_habit_id and user_id = v_user and completed_date = v_today and status = 'completed';

  select count(*) into v_remaining
  from public.habit_completions
  where user_id = v_user and completed_date = v_today and status = 'completed';

  select current_xp, gems, current_streak, total_habits_completed
    into v_cur from public.users where id = v_user;

  if v_remaining = 0 then
    v_new_streak := greatest(v_cur.current_streak - 1, 0);
  else
    v_new_streak := v_cur.current_streak;
  end if;

  update public.users set
    current_xp = greatest(v_cur.current_xp - v_xp, 0),
    gems = greatest(v_cur.gems - v_gems, 0),
    current_streak = v_new_streak,
    -- Re-derive the streak anchor from the latest remaining real completion so
    -- a same-day re-complete continues the streak instead of restarting it.
    streak_day = (
      select max(completed_date) from public.habit_completions
      where user_id = v_user and status = 'completed'
    ),
    total_habits_completed = greatest(v_cur.total_habits_completed - 1, 0),
    updated_at = now()
  where id = v_user;

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
  where hc.user_id = v_user and hc.completed_date = v_today and hc.status = 'completed'
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
$$;
