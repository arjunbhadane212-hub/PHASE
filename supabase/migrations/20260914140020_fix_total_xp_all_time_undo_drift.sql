-- Fix: total_xp_all_time (shown on Settings/Profile as "Total XP") drifts away
-- from current_xp (used to drive Home's level/rank + previously shown there too).
--
-- Root causes, confirmed against the live complete_habit/uncomplete_habit defs:
--
-- 1. complete_habit increments BOTH current_xp and total_xp_all_time by v_xp.
--    uncomplete_habit only ever decremented current_xp — total_xp_all_time was
--    left untouched (20260723000000_public_profile_and_lifetime_stats.sql even
--    says so explicitly: "total_xp_all_time only ever increases ... so
--    uncomplete_habit needs no change"). That was a deliberate call at the
--    time, but it means any check -> uncheck cycle permanently inflates
--    total_xp_all_time relative to current_xp — exactly the mismatch reported.
--    There is no prestige/reset feature that needs total_xp_all_time to be a
--    separate high-water mark, so the two columns should just track the same
--    net-earned number.
--
-- 2. Separately, uncomplete_habit recomputes the XP to remove from the habit's
--    base difficulty (10/25/50) rather than the amount actually granted. If a
--    Game Mode boost was active when the habit was completed, complete_habit
--    awarded a multiplied amount but uncomplete_habit only ever subtracted the
--    unboosted base — under-reversing the completion and permanently inflating
--    current_xp (and now total_xp_all_time) by the boosted delta.
--    complete_habit already writes the real, boost-inclusive amount to
--    xp_events (the leaderboard ledger) under a deterministic key
--    (md5(user_id || habit_id || date)), so uncomplete_habit can read the
--    actual granted amount back from there instead of re-deriving a guess.
--
-- Both current_xp and total_xp_all_time are earned only in Game Mode (the
-- boost multiplier that causes divergence is itself Game Mode-only); this
-- migration does not touch Focus Mode's completion path at all.
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
  v_actual_xp int;
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

  -- Prefer the amount actually granted (handles a boost that was active at
  -- completion time); fall back to the recomputed base value for completions
  -- that predate xp_events or hit the v_xp=0 edge case above.
  select amount into v_actual_xp from public.xp_events
    where user_id = v_user
      and client_action_id = md5(v_user::text || p_habit_id::text || v_today::text)::uuid;
  v_xp := coalesce(v_actual_xp, v_xp);

  delete from public.habit_completions
  where habit_id = p_habit_id and user_id = v_user and completed_date = v_today and status = 'completed';

  select count(*) into v_remaining
  from public.habit_completions
  where user_id = v_user and completed_date = v_today and status = 'completed';

  select current_xp, total_xp_all_time, gems, current_streak, total_habits_completed
    into v_cur from public.users where id = v_user;

  if v_remaining = 0 then
    v_new_streak := greatest(v_cur.current_streak - 1, 0);
  else
    v_new_streak := v_cur.current_streak;
  end if;

  update public.users set
    current_xp = greatest(v_cur.current_xp - v_xp, 0),
    total_xp_all_time = greatest(coalesce(v_cur.total_xp_all_time, 0) - v_xp, 0),
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

  select current_xp, total_xp_all_time, gems, current_streak, total_habits_completed
    into v_cur from public.users where id = v_user;

  return json_build_object(
    'xp_removed', v_xp,
    'gems_removed', v_gems,
    'current_xp', v_cur.current_xp,
    'total_xp_all_time', v_cur.total_xp_all_time,
    'gems', v_cur.gems,
    'current_streak', v_cur.current_streak,
    'total_habits_completed', v_cur.total_habits_completed
  );
end;
$$;

-- One-time reconciliation: bring every existing user's total_xp_all_time back
-- in line with current_xp now that both are maintained in lockstep going
-- forward. current_xp is the number that was actually being decremented all
-- along (just without boost-awareness, fixed above), so it's the trustworthy
-- side of the two to reconcile onto.
update public.users
set total_xp_all_time = current_xp
where total_xp_all_time <> current_xp;
