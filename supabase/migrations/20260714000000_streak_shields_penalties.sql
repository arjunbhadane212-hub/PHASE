-- Phase app — Section 5: streak logic, Streak Shield / Streak Revive,
-- Focus Mode abandonment penalty, and the new tab-switch penalty.
--
-- Context / design decisions (see DEV_PROMPT_2026-07-14 section 5):
--  * Streak = "any single habit completed within the rolling 24h window = +1",
--    already true in complete_habit. This migration hardens it so that a
--    shield-bridged day keeps the streak alive, and records previous_streak so
--    a Revive can restore the exact count that was lost.
--  * full_day_completion + its separate bonus are left untouched (two distinct
--    rewards, per spec).
--  * No pg_cron exists in this project, and day-boundary logic elsewhere is
--    lazy/check-on-read. So streak-breaking runs check-on-load via
--    evaluate_streak(), called from the auth bootstrap.
--  * Gem penalties live in public.game_config so Arjun can tune them without a
--    code deploy (abandon = 30, tab_switch = 45, focus shield = 500).

-- ---------------------------------------------------------------------------
-- 1. Schema: consumable counters, streak anchor, revive memory, failed status
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists streak_shields  integer not null default 0 check (streak_shields >= 0),
  add column if not exists streak_revives  integer not null default 0 check (streak_revives >= 0),
  -- streak_day = the calendar day through which the current streak is credited.
  -- Advanced to `today` on completion, or to `yesterday` when a shield bridges a
  -- missed day. Keeping it explicit makes shield-bridging idempotent across loads.
  add column if not exists streak_day      date,
  -- previous_streak = the streak value at the instant it last broke, so Revive
  -- can restore the exact count (feels worth 200 gems).
  add column if not exists previous_streak integer not null default 0 check (previous_streak >= 0);

-- habit_completions gains a status so a failed/abandoned attempt is recorded and
-- blocks a same-day retry, without being counted as a real completion.
alter table public.habit_completions
  add column if not exists status text not null default 'completed'
    check (status in ('completed', 'failed'));

-- Backfill streak_day from each user's most recent real completion.
update public.users u
set streak_day = sub.max_date
from (
  select user_id, max(completed_date) as max_date
  from public.habit_completions
  where status = 'completed'
  group by user_id
) sub
where sub.user_id = u.id and u.streak_day is null;

-- ---------------------------------------------------------------------------
-- 2. Tunable config (easy for Arjun to adjust; read by the RPCs below)
-- ---------------------------------------------------------------------------
create table if not exists public.game_config (
  key         text primary key,
  value       integer not null,
  description text
);

insert into public.game_config (key, value, description) values
  ('focus_abandon_penalty',          30,  'Gems deducted when a Focus session is deliberately abandoned.'),
  ('focus_tab_switch_penalty',       45,  'Gems deducted when the user leaves the tab mid Focus session (harsher than a deliberate abandon).'),
  ('focus_tab_switch_grace_seconds', 3,   'Reference copy of the client-side grace period before a tab-switch penalty fires.'),
  ('focus_shield_price',             500, 'Home-screen Streak Shield price in Focus Mode.')
on conflict (key) do nothing;

alter table public.game_config enable row level security;
drop policy if exists "Anyone can read game config" on public.game_config;
create policy "Anyone can read game config"
  on public.game_config for select
  using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 3. Shop rows for the Game Mode Boosts (Streak Shield 100, Streak Revive 200).
--    The Focus Mode shield is a separate home-screen button (buy_focus_shield).
--    NOTE: shop_items.tier is reserved for loot-box tiers (starter/delta/phase),
--    so item-level rarity lives in metadata.rarity instead.
-- ---------------------------------------------------------------------------
insert into public.shop_items (key, category, name, price_gems, tier, metadata) values
  ('streak_shield', 'Boosts', 'Streak Shield', 100, null,
     '{"rarity": "Common", "description": "Protects your streak for 1 missed day.", "max_owned": 3}'::jsonb),
  ('streak_revive', 'Boosts', 'Streak Revive', 200, null,
     '{"rarity": "Rare", "description": "Restores a broken streak.", "max_owned": 3}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. complete_habit — hardened streak logic (shield anchor + revive memory).
--    NOTE: a parallel session (data-persistence / section 1) added a
--    p_client_date argument to fix the client-timezone completion bug. This is
--    the merged canonical form: their client-date fix + this session's streak
--    hardening. The old single-arg overload is dropped at the end so
--    rpc('complete_habit', {p_habit_id}) stays unambiguous.
-- ---------------------------------------------------------------------------
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

  -- Guard against a bad/spoofed client date (parallel-session fix, preserved).
  if v_today < current_date - 1 or v_today > current_date + 1 then
    raise exception 'Invalid completion date';
  end if;

  select * into v_habit from public.habits where id = p_habit_id and user_id = v_user;
  if not found then
    raise exception 'Habit not found or not owned by user';
  end if;

  -- Any log (completed OR failed) for this habit today locks it for the day.
  if exists (
    select 1 from public.habit_completions
    where habit_id = p_habit_id and completed_date = v_today
  ) then
    raise exception 'Habit already logged today';
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

  -- streak inputs captured BEFORE inserting today's completion (real completions only)
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

  -- Anchor prefers the shield-aware streak_day, falling back to raw completions.
  v_anchor := coalesce(v_cur.streak_day, v_last_date);

  if v_already_today then
    v_new_streak := v_cur.current_streak;          -- already counted today
    v_new_prev   := v_cur.previous_streak;
  elsif v_anchor = v_today - 1 then
    v_new_streak := v_cur.current_streak + 1;       -- consecutive (incl. shield-bridged)
    v_new_prev   := v_cur.previous_streak;
  elsif v_anchor is null then
    v_new_streak := 1;                              -- first ever
    v_new_prev   := v_cur.previous_streak;
  else
    v_new_streak := 1;                              -- lapsed: restart, remember prior
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

  -- ===== daily_logs upsert (unchanged behaviour; counts real completions) =====
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

-- Drop the redundant single-arg overload (kept only for legacy callers).
drop function if exists public.complete_habit(uuid);
grant execute on function public.complete_habit(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. evaluate_streak — check-on-load: break the streak, or consume shields to
--    bridge missed 24h windows. Idempotent (safe to call on every load).
-- ---------------------------------------------------------------------------
create or replace function public.evaluate_streak()
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := current_date;
  v_streak int;
  v_anchor date;
  v_shields int;
  v_missed int;
begin
  if v_user is null then return null; end if;

  select current_streak, streak_day, streak_shields
    into v_streak, v_anchor, v_shields
    from public.users where id = v_user;

  if coalesce(v_streak, 0) <= 0 or v_anchor is null then
    return json_build_object('current_streak', coalesce(v_streak, 0), 'changed', false);
  end if;

  -- Full 24h windows missed since the streak was last credited. Today is still
  -- in progress, so it is never counted as missed.
  v_missed := (v_today - v_anchor) - 1;
  if v_missed <= 0 then
    return json_build_object('current_streak', v_streak, 'changed', false);
  end if;

  if v_shields >= v_missed then
    -- Shields fully bridge the gap; credit the streak through yesterday so the
    -- next load doesn't re-charge for the same days.
    update public.users set
      streak_shields = streak_shields - v_missed,
      streak_day = v_today - 1,
      updated_at = now()
    where id = v_user;
    return json_build_object(
      'current_streak', v_streak, 'changed', true,
      'shield_consumed', v_missed, 'streak_shields', v_shields - v_missed
    );
  else
    -- Not enough shields: streak breaks. Remember it for a possible Revive.
    update public.users set
      previous_streak = v_streak,
      current_streak = 0,
      streak_day = null,
      updated_at = now()
    where id = v_user;
    return json_build_object(
      'current_streak', 0, 'changed', true, 'broken', true, 'previous_streak', v_streak
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. use_streak_revive — restore the exact broken streak, consuming one revive.
-- ---------------------------------------------------------------------------
create or replace function public.use_streak_revive()
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_streak int;
  v_prev int;
  v_revives int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select current_streak, previous_streak, streak_revives
    into v_streak, v_prev, v_revives
    from public.users where id = v_user;

  if v_revives <= 0 then raise exception 'No Streak Revive available'; end if;
  if v_streak > 0 then raise exception 'Your streak is not broken'; end if;
  if coalesce(v_prev, 0) <= 0 then raise exception 'No streak to restore'; end if;

  update public.users set
    current_streak = v_prev,
    previous_streak = 0,
    streak_day = current_date - 1,   -- credited through yesterday; alive today
    streak_revives = streak_revives - 1,
    updated_at = now()
  where id = v_user;

  return json_build_object('current_streak', v_prev, 'streak_revives', v_revives - 1);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. buy_focus_shield — Focus Mode home-screen Streak Shield (500 gems).
-- ---------------------------------------------------------------------------
create or replace function public.buy_focus_shield()
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_gems int;
  v_price int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select value into v_price from public.game_config where key = 'focus_shield_price';
  v_price := coalesce(v_price, 500);

  select gems into v_gems from public.users where id = v_user;
  if v_gems < v_price then raise exception 'Insufficient gems'; end if;

  update public.users set
    gems = gems - v_price,
    streak_shields = streak_shields + 1,
    updated_at = now()
  where id = v_user
  returning gems, streak_shields into v_gems, v_price;

  return json_build_object('gems', v_gems, 'streak_shields', v_price);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. abandon_focus_session — deliberate abandon OR automatic tab-switch.
--    Deducts gems (floored at 0), marks the habit failed for today, and either
--    consumes a shield or breaks the streak.
-- ---------------------------------------------------------------------------
create or replace function public.abandon_focus_session(p_habit_id uuid, p_reason text default 'abandon')
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := current_date;
  v_penalty int;
  v_cur record;
  v_new_gems int;
  v_new_shields int;
  v_new_streak int;
  v_new_prev int;
  v_shield_consumed boolean := false;
  v_streak_broke boolean := false;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_reason not in ('abandon', 'tab_switch') then p_reason := 'abandon'; end if;

  if not exists (select 1 from public.habits where id = p_habit_id and user_id = v_user) then
    raise exception 'Habit not found or not owned by user';
  end if;

  select value into v_penalty from public.game_config
    where key = case p_reason when 'tab_switch' then 'focus_tab_switch_penalty'
                              else 'focus_abandon_penalty' end;
  v_penalty := coalesce(v_penalty, case when p_reason = 'tab_switch' then 45 else 30 end);

  select gems, streak_shields, current_streak, previous_streak, streak_day
    into v_cur from public.users where id = v_user;

  v_new_gems := greatest(0, v_cur.gems - v_penalty);
  v_new_shields := v_cur.streak_shields;
  v_new_streak := v_cur.current_streak;
  v_new_prev := v_cur.previous_streak;

  -- Streak handling only matters when there is a live streak to protect/lose.
  if v_cur.current_streak > 0 then
    if v_cur.streak_shields > 0 then
      v_new_shields := v_cur.streak_shields - 1;
      v_shield_consumed := true;
    else
      v_new_prev := v_cur.current_streak;   -- remember for Revive
      v_new_streak := 0;
      v_streak_broke := true;
    end if;
  end if;

  update public.users set
    gems = v_new_gems,
    streak_shields = v_new_shields,
    current_streak = v_new_streak,
    previous_streak = v_new_prev,
    streak_day = case when v_streak_broke then null else streak_day end,
    updated_at = now()
  where id = v_user;

  -- Record the failure for today (idempotent against an existing row for today).
  if not exists (
    select 1 from public.habit_completions
    where habit_id = p_habit_id and completed_date = v_today
  ) then
    insert into public.habit_completions (habit_id, user_id, completed_at, completed_date, status)
    values (p_habit_id, v_user, now(), v_today, 'failed');
  end if;

  return json_build_object(
    'reason', p_reason,
    'penalty', v_penalty,
    'gems', v_new_gems,
    'shield_consumed', v_shield_consumed,
    'streak_broke', v_streak_broke,
    'current_streak', v_new_streak,
    'streak_shields', v_new_shields
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. buy_item — extend to grant Boosts consumables (shield / revive counters).
--    Cosmetic categories keep the original array-unlock behaviour.
-- ---------------------------------------------------------------------------
create or replace function public.buy_item(p_item_id uuid)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_item public.shop_items%rowtype;
  v_col text;
  v_counter text;
  v_gems int;
  v_owned boolean;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select * into v_item from public.shop_items where id = p_item_id;
  if not found then raise exception 'Item not found'; end if;

  select gems into v_gems from public.users where id = v_user;

  -- Boosts are consumable counters, not array unlocks.
  if v_item.category = 'Boosts' then
    v_counter := case v_item.key
      when 'streak_shield' then 'streak_shields'
      when 'streak_revive' then 'streak_revives'
      else null
    end;
    if v_counter is null then
      raise exception 'Boost % is not purchasable yet', v_item.key;
    end if;
    if v_gems < v_item.price_gems then raise exception 'Insufficient gems'; end if;

    execute format(
      'update public.users set gems = gems - $1, %I = %I + 1, updated_at = now() where id = $2',
      v_counter, v_counter
    ) using v_item.price_gems, v_user;

    return json_build_object(
      'gems', v_gems - v_item.price_gems,
      'item_key', v_item.key,
      'name', v_item.name,
      'category', v_item.category
    );
  end if;

  -- Cosmetic categories -> unlocked_* array column
  v_col := case v_item.category
    when 'Effects' then 'unlocked_effects'
    when 'Anims'   then 'unlocked_animations'
    when 'Banners' then 'unlocked_banners'
    else null
  end;
  if v_col is null then
    raise exception 'Category % is not purchasable yet', v_item.category;
  end if;

  execute format('select (%I) ? $1 from public.users where id = $2', v_col)
    into v_owned using v_item.key, v_user;
  if v_owned then raise exception 'Already owned'; end if;

  if v_gems < v_item.price_gems then raise exception 'Insufficient gems'; end if;

  execute format(
    'update public.users set gems = gems - $1, %I = (%I) || to_jsonb($2::text) where id = $3',
    v_col, v_col
  ) using v_item.price_gems, v_item.key, v_user;

  return json_build_object(
    'gems', v_gems - v_item.price_gems,
    'item_key', v_item.key,
    'name', v_item.name,
    'category', v_item.category
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Grants
-- ---------------------------------------------------------------------------
grant execute on function public.evaluate_streak()            to authenticated;
grant execute on function public.use_streak_revive()          to authenticated;
grant execute on function public.buy_focus_shield()           to authenticated;
grant execute on function public.abandon_focus_session(uuid, text) to authenticated;
