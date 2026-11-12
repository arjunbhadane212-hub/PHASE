-- Economy + streak integrity (2026-11-11)
--
-- Fixes found in the full-app audit. Every one of these was reproducible:
--
-- 1. STREAK WIPE (timezone): evaluate_streak() compared streak_day (a LOCAL
--    date written by complete_habit from the client) against current_date
--    (UTC). A US user who opened the app in the evening — after 00:00 UTC —
--    before checking in had their streak broken (or a shield burned) while
--    their local day was still running. Now the day is resolved per user
--    from users.timezone (set by the client via set_my_timezone), falling
--    back to a clamped client date, then UTC.
-- 2. INFINITE GEMS: complete -> level up (+50) -> uncomplete -> complete
--    levelled up again and paid again, forever. Level rewards are now paid
--    once per level EVER (above highest_level_reached), and uncomplete
--    recomputes rank from the reduced XP.
-- 3. LEAGUE XP FARMING: uncomplete never removed league XP and a re-complete
--    added it again. period_xp is now bumped only when the immutable
--    xp_events ledger row is actually inserted (first completion of that
--    habit that day).
-- 4. DOUBLE SPEND / LOST UPDATES: complete_habit, purchase_shop_item,
--    buy_xp_boost, open_loot_box, buy_focus_shield and use_streak_revive read
--    the balance without a row lock, and complete_habit wrote an absolute
--    `gems = <snapshot> + n`. A purchase racing a completion could hand out a
--    free item. Every money path now takes `FOR UPDATE` on the user row and
--    writes relative deltas.
-- 5. Retired items (is_active=false) could still be bought by id. Blocked.
-- 6. Shield bridge lost on uncheck: unchecking the only habit of the day
--    rewound streak_day to the last completion date, so a streak that a
--    shield had bridged broke on the next load.
--
-- New, additive:
-- * users.timezone (+ set_my_timezone RPC, protected from direct writes).
-- * user_rewards: once-ever ledger for level-up and streak-milestone rewards.
-- * Escalating level-up reward (25*level + 25 gems) so levels matter.
-- * Streak milestone rewards (3/7/14/30/50/100/200/365 days).
-- * complete_habit returns streak_extended / streak_before / streak_milestone
--   so the client can show the streak celebration.

-- ── timezone ────────────────────────────────────────────────────────────────
alter table public.users add column if not exists timezone text;

create or replace function public.set_my_timezone(p_tz text)
returns json language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_tz is null or length(p_tz) > 64
     or not exists (select 1 from pg_timezone_names where name = p_tz) then
    raise exception 'Unknown timezone';
  end if;
  update public.users set timezone = p_tz where id = v_user and timezone is distinct from p_tz;
  return json_build_object('timezone', p_tz);
end $$;
revoke all on function public.set_my_timezone(text) from public, anon;
grant execute on function public.set_my_timezone(text) to authenticated;

-- The user's current calendar day. Prefers the stored timezone; otherwise a
-- client-supplied date clamped to UTC +/- 1 day; otherwise UTC.
create or replace function public.resolve_local_date(p_user uuid, p_client_date date default null)
returns date language plpgsql stable security definer set search_path = public as $$
declare v_tz text; v_d date;
begin
  select timezone into v_tz from public.users where id = p_user;
  if v_tz is not null then
    begin
      v_d := (now() at time zone v_tz)::date;
      return v_d;
    exception when others then null;
    end;
  end if;
  if p_client_date is not null and p_client_date between current_date - 1 and current_date + 1 then
    return p_client_date;
  end if;
  return current_date;
end $$;
revoke all on function public.resolve_local_date(uuid, date) from public, anon, authenticated;

-- protect timezone from direct client writes (must go through set_my_timezone)
create or replace function public.protect_user_columns()
 returns trigger language plpgsql set search_path to '' as $function$
begin
  if current_user in ('authenticated','anon') then
    if  NEW.id                      is distinct from OLD.id
     or NEW.email                   is distinct from OLD.email
     or NEW.created_at              is distinct from OLD.created_at
     or NEW.rank                    is distinct from OLD.rank
     or NEW.xp                      is distinct from OLD.xp
     or NEW.current_xp              is distinct from OLD.current_xp
     or NEW.total_xp_all_time       is distinct from OLD.total_xp_all_time
     or NEW.highest_level_reached   is distinct from OLD.highest_level_reached
     or NEW.gems                    is distinct from OLD.gems
     or NEW.current_streak          is distinct from OLD.current_streak
     or NEW.previous_streak         is distinct from OLD.previous_streak
     or NEW.longest_streak_ever     is distinct from OLD.longest_streak_ever
     or NEW.streak_day              is distinct from OLD.streak_day
     or NEW.streak_shields          is distinct from OLD.streak_shields
     or NEW.streak_revives          is distinct from OLD.streak_revives
     or NEW.total_habits_completed  is distinct from OLD.total_habits_completed
     or NEW.total_focus_minutes     is distinct from OLD.total_focus_minutes
     or NEW.active_boost_multiplier is distinct from OLD.active_boost_multiplier
     or NEW.active_boost_expires_at is distinct from OLD.active_boost_expires_at
     or NEW.boost_inventory         is distinct from OLD.boost_inventory
     or NEW.unlocked_titles         is distinct from OLD.unlocked_titles
     or NEW.unlocked_icons          is distinct from OLD.unlocked_icons
     or NEW.unlocked_animations     is distinct from OLD.unlocked_animations
     or NEW.unlocked_banners        is distinct from OLD.unlocked_banners
     or NEW.unlocked_main_colors    is distinct from OLD.unlocked_main_colors
     or NEW.unlocked_banner_colors  is distinct from OLD.unlocked_banner_colors
     or NEW.unlocked_effects        is distinct from OLD.unlocked_effects
     or NEW.equipped_title          is distinct from OLD.equipped_title
     or NEW.equipped_icon           is distinct from OLD.equipped_icon
     or NEW.equipped_animation      is distinct from OLD.equipped_animation
     or NEW.equipped_banner         is distinct from OLD.equipped_banner
     or NEW.equipped_decoration     is distinct from OLD.equipped_decoration
     or NEW.equipped_focus_aura     is distinct from OLD.equipped_focus_aura
     or NEW.equipped_focus_sound    is distinct from OLD.equipped_focus_sound
     or NEW.selected_main_color     is distinct from OLD.selected_main_color
     or NEW.selected_banner_color   is distinct from OLD.selected_banner_color
     or NEW.leaderboard_tier        is distinct from OLD.leaderboard_tier
     or NEW.leaderboard_eligible    is distinct from OLD.leaderboard_eligible
     or NEW.leaderboard_active      is distinct from OLD.leaderboard_active
     or NEW.shadow_flagged          is distinct from OLD.shadow_flagged
     or NEW.banned_at               is distinct from OLD.banned_at
     or NEW.is_pro                  is distinct from OLD.is_pro
     or NEW.timezone                is distinct from OLD.timezone
    then
      raise exception 'Protected column: this field is server-managed and cannot be set directly';
    end if;
  end if;
  return NEW;
end $function$;

-- ── once-ever reward ledger ─────────────────────────────────────────────────
create table if not exists public.user_rewards (
  user_id    uuid not null references public.users(id) on delete cascade,
  reward_key text not null,
  gems       int  not null default 0,
  granted_at timestamptz not null default now(),
  primary key (user_id, reward_key)
);
alter table public.user_rewards enable row level security;
drop policy if exists "read own rewards" on public.user_rewards;
create policy "read own rewards" on public.user_rewards for select to authenticated
  using (auth.uid() = user_id);

-- Level N pays 25*N + 25 gems (L2 75 · L5 150 · L10 275 · L15 400).
create or replace function public.level_reward_gems(p_level int)
returns int language sql immutable set search_path = public as $$ select greatest(0, 25 * p_level + 25) $$;

create or replace function public.streak_milestone_gems(p_days int)
returns int language sql immutable set search_path = public as $$
  select case p_days
    when 3 then 25 when 7 then 50 when 14 then 75 when 30 then 150
    when 50 then 200 when 100 then 400 when 200 then 600 when 365 then 1000
    else 0 end
$$;

-- Bring highest_level_reached up to date so already-earned levels never pay twice.
update public.users set highest_level_reached = greatest(coalesce(highest_level_reached, 1), coalesce(rank, 1));
-- Seed the ledger with milestones already passed (no retroactive payout).
insert into public.user_rewards (user_id, reward_key, gems)
select u.id, 'streak_' || m.d, 0
from public.users u
cross join (values (3),(7),(14),(30),(50),(100),(200),(365)) m(d)
where greatest(coalesce(u.longest_streak_ever,0), coalesce(u.current_streak,0)) >= m.d
on conflict do nothing;

-- ── complete_habit ──────────────────────────────────────────────────────────
create or replace function public.complete_habit(p_habit_id uuid, p_client_date date default null)
 returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user uuid := auth.uid();
  v_habit public.habits%rowtype;
  v_xp int; v_gems int; v_mult int;
  v_new_xp int; v_rank_before int; v_rank_after int; v_high int; v_level_up boolean;
  v_levelup_gems int := 0; v_gems_today int; v_rank_name text; v_lvl int;
  v_today date := coalesce(p_client_date, current_date);
  v_dow int; v_weekday text;
  v_already_today boolean; v_last_date date; v_anchor date; v_cur record;
  v_new_streak int; v_new_prev int; v_scheduled int; v_completed int; v_full_day boolean;
  v_ceiling int; v_vel int; v_today_cnt int; v_recent int; v_ins int;
  v_titles json; v_extended boolean; v_ms_gems int := 0; v_milestone json := null;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if v_today < current_date - 1 or v_today > current_date + 1 then raise exception 'Invalid completion date'; end if;
  v_dow := extract(dow from v_today);
  v_weekday := lower(trim(to_char(v_today, 'FMDay')));

  -- Serialise every money/XP write for this user.
  select current_xp, gems, current_streak, total_habits_completed, streak_day, previous_streak,
         highest_level_reached, app_mode, active_boost_multiplier, active_boost_expires_at
    into v_cur from public.users where id = v_user for update;
  if not found then raise exception 'Profile not found'; end if;

  select * into v_habit from public.habits where id = p_habit_id and user_id = v_user;
  if not found then raise exception 'Habit not found or not owned by user'; end if;
  if exists (select 1 from public.habit_completions where habit_id = p_habit_id and completed_date = v_today) then
    raise exception 'Habit already logged today';
  end if;

  if v_habit.difficulty = 'easy' then v_xp := 10; v_gems := 5;
  elsif v_habit.difficulty = 'medium' then v_xp := 25; v_gems := 10;
  elsif v_habit.difficulty = 'hard' then v_xp := 50; v_gems := 20;
  else v_xp := 0; v_gems := 0; end if;
  if v_cur.app_mode = 'game' and v_cur.active_boost_expires_at > now()
     and v_cur.active_boost_multiplier > 1 then
    v_mult := v_cur.active_boost_multiplier;
    v_xp := v_xp * v_mult;
  end if;

  v_already_today := exists (select 1 from public.habit_completions
    where user_id = v_user and completed_date = v_today and status = 'completed');
  select max(completed_date) into v_last_date from public.habit_completions
    where user_id = v_user and completed_date < v_today and status = 'completed';
  insert into public.habit_completions (habit_id, user_id, completed_at, completed_date, status)
  values (p_habit_id, v_user, now(), v_today, 'completed');

  v_anchor := coalesce(v_cur.streak_day, v_last_date);
  if v_already_today or v_anchor = v_today then
    v_new_streak := v_cur.current_streak; v_new_prev := v_cur.previous_streak;
  elsif v_anchor = v_today - 1 then
    v_new_streak := v_cur.current_streak + 1; v_new_prev := v_cur.previous_streak;
  elsif v_anchor is null then
    v_new_streak := 1; v_new_prev := v_cur.previous_streak;
  else
    v_new_streak := 1;
    v_new_prev := case when v_cur.current_streak > 0 then v_cur.current_streak else v_cur.previous_streak end;
  end if;
  v_extended := not v_already_today and v_anchor is distinct from v_today;

  v_new_xp := v_cur.current_xp + v_xp;
  v_rank_before := public.level_for_xp(v_cur.current_xp);
  v_rank_after := public.level_for_xp(v_new_xp);
  v_high := greatest(coalesce(v_cur.highest_level_reached, 1), v_rank_before);
  -- A level pays out the first time it is EVER reached, never again.
  v_level_up := v_rank_after > v_high;
  if v_level_up then
    for v_lvl in (v_high + 1)..v_rank_after loop
      v_levelup_gems := v_levelup_gems + public.level_reward_gems(v_lvl);
    end loop;
  end if;
  v_rank_name := public.rank_name_for(v_rank_after);

  -- Streak milestone (once ever per milestone).
  if v_extended and public.streak_milestone_gems(v_new_streak) > 0 then
    insert into public.user_rewards (user_id, reward_key, gems)
      values (v_user, 'streak_' || v_new_streak, public.streak_milestone_gems(v_new_streak))
      on conflict do nothing;
    get diagnostics v_ins = row_count;
    if v_ins > 0 then
      v_ms_gems := public.streak_milestone_gems(v_new_streak);
      v_milestone := json_build_object('days', v_new_streak, 'gems', v_ms_gems);
    end if;
  end if;

  v_gems_today := v_gems + v_levelup_gems + v_ms_gems;

  update public.users set
    current_xp = v_new_xp, gems = gems + v_gems_today,
    total_xp_all_time = coalesce(total_xp_all_time,0) + v_xp,
    longest_streak_ever = greatest(coalesce(longest_streak_ever,0), v_new_streak),
    rank = v_rank_after, highest_level_reached = greatest(coalesce(highest_level_reached,1), v_rank_after),
    current_streak = v_new_streak, previous_streak = v_new_prev, streak_day = v_today,
    total_habits_completed = coalesce(total_habits_completed,0) + 1, updated_at = now()
  where id = v_user;

  if v_level_up then
    insert into public.user_rewards (user_id, reward_key, gems)
      values (v_user, 'level_' || v_rank_after, v_levelup_gems) on conflict do nothing;
  end if;

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
    values (v_user, v_xp, 'habit_complete', md5(v_user::text || p_habit_id::text || v_today::text)::uuid)
    on conflict (user_id, client_action_id) do nothing;
    get diagnostics v_ins = row_count;

    select value into v_ceiling from public.game_config where key = 'lb_daily_completion_ceiling';
    select value into v_vel     from public.game_config where key = 'lb_velocity_max_10s';
    v_ceiling := coalesce(v_ceiling, 50);
    v_vel     := coalesce(v_vel, 20);
    select count(*) into v_today_cnt from public.habit_completions where user_id = v_user and completed_date = v_today;
    select count(*) into v_recent from public.xp_events where user_id = v_user and created_at > now() - interval '10 seconds';
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

    -- League XP only for the FIRST completion of this habit today (ledger row
    -- actually written) — an uncheck/recheck can no longer farm the league.
    if v_ins > 0 then
      update public.leaderboard_memberships m
         set period_xp = m.period_xp + v_xp
        from public.leaderboard_groups g, public.leaderboard_periods p, public.users pr
       where p.status = 'active' and g.period_id = p.id and m.group_id = g.id
         and m.user_id = v_user and pr.id = v_user and pr.app_mode = 'game'
         and pr.leaderboard_eligible = true and pr.shadow_flagged = false
         and pr.banned_at is null and pr.leaderboard_active = true;
    end if;
  end if;

  return json_build_object('xp_earned', v_xp, 'gems_earned', v_gems, 'gems', v_cur.gems + v_gems_today,
    'current_xp', v_new_xp, 'current_streak', v_new_streak, 'total_habits_completed', coalesce(v_cur.total_habits_completed,0) + 1,
    'full_day_completion', v_full_day, 'boost_multiplier', coalesce(v_mult, 1),
    'level_up', v_level_up, 'level_up_gems', v_levelup_gems, 'rank', v_rank_after, 'rank_name', v_rank_name,
    'next_level_gems', case when v_rank_after < 15 then public.level_reward_gems(v_rank_after + 1) else 0 end,
    'streak_extended', v_extended, 'streak_before', v_cur.current_streak, 'streak_milestone', v_milestone,
    'scheduled_today', v_scheduled, 'completed_today', v_completed,
    'newly_unlocked', coalesce(v_titles->'newly_unlocked', '[]'::json));
end; $function$;

-- ── uncomplete_habit ────────────────────────────────────────────────────────
create or replace function public.uncomplete_habit(p_habit_id uuid, p_client_date date default null)
 returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user uuid := auth.uid();
  v_habit public.habits%rowtype;
  v_today date := coalesce(p_client_date, current_date);
  v_dow int; v_weekday text;
  v_xp int; v_actual_xp int; v_gems int; v_cur record; v_remaining int;
  v_new_streak int; v_new_xp int; v_scheduled int; v_completed int; v_full_day boolean;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if v_today < current_date - 1 or v_today > current_date + 1 then raise exception 'Invalid date'; end if;
  v_dow := extract(dow from v_today);
  v_weekday := lower(trim(to_char(v_today, 'FMDay')));

  select current_xp, total_xp_all_time, gems, current_streak, total_habits_completed
    into v_cur from public.users where id = v_user for update;

  select * into v_habit from public.habits where id = p_habit_id and user_id = v_user;
  if not found then raise exception 'Habit not found or not owned by user'; end if;
  if not exists (select 1 from public.habit_completions
      where habit_id = p_habit_id and user_id = v_user and completed_date = v_today and status = 'completed') then
    raise exception 'Habit is not completed on that date';
  end if;

  if v_habit.difficulty = 'easy' then v_xp := 10; v_gems := 5;
  elsif v_habit.difficulty = 'medium' then v_xp := 25; v_gems := 10;
  elsif v_habit.difficulty = 'hard' then v_xp := 50; v_gems := 20;
  else v_xp := 0; v_gems := 0; end if;
  select amount into v_actual_xp from public.xp_events
    where user_id = v_user and client_action_id = md5(v_user::text || p_habit_id::text || v_today::text)::uuid;
  v_xp := coalesce(v_actual_xp, v_xp);

  delete from public.habit_completions
   where habit_id = p_habit_id and user_id = v_user and completed_date = v_today and status = 'completed';
  select count(*) into v_remaining from public.habit_completions
   where user_id = v_user and completed_date = v_today and status = 'completed';

  v_new_streak := case when v_remaining = 0 then greatest(coalesce(v_cur.current_streak,0) - 1, 0)
                       else v_cur.current_streak end;
  v_new_xp := greatest(coalesce(v_cur.current_xp,0) - v_xp, 0);

  update public.users set
    current_xp = v_new_xp,
    rank = public.level_for_xp(v_new_xp),
    total_xp_all_time = greatest(coalesce(total_xp_all_time, 0) - v_xp, 0),
    gems = greatest(gems - v_gems, 0),
    current_streak = v_new_streak,
    -- Back to "not done today": the streak (if any) is alive through yesterday.
    streak_day = case when v_remaining > 0 then v_today
                      when v_new_streak > 0 then v_today - 1
                      else null end,
    total_habits_completed = greatest(coalesce(total_habits_completed,0) - 1, 0),
    updated_at = now()
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

  update public.daily_logs set
    habits_completed = coalesce(habits_completed, '[]'::jsonb) - p_habit_id::text,
    xp_earned_today = greatest(xp_earned_today - v_xp, 0),
    gems_earned_today = greatest(gems_earned_today - v_gems, 0),
    full_day_completion = v_full_day
  where user_id = v_user and log_date = v_today;

  select current_xp, total_xp_all_time, gems, current_streak, total_habits_completed
    into v_cur from public.users where id = v_user;
  return json_build_object('xp_removed', v_xp, 'gems_removed', v_gems, 'current_xp', v_cur.current_xp,
    'total_xp_all_time', v_cur.total_xp_all_time, 'gems', v_cur.gems,
    'current_streak', v_cur.current_streak, 'total_habits_completed', v_cur.total_habits_completed);
end; $function$;

-- ── evaluate_streak (local day) ─────────────────────────────────────────────
drop function if exists public.evaluate_streak();
create or replace function public.evaluate_streak(p_client_date date default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_today date; v_streak int; v_anchor date; v_shields int; v_missed int;
begin
  if v_user is null then return null; end if;
  v_today := public.resolve_local_date(v_user, p_client_date);
  select current_streak, streak_day, streak_shields into v_streak, v_anchor, v_shields
    from public.users where id = v_user for update;
  if coalesce(v_streak, 0) <= 0 or v_anchor is null then
    return json_build_object('current_streak', coalesce(v_streak, 0), 'changed', false);
  end if;
  v_missed := (v_today - v_anchor) - 1;
  if v_missed <= 0 then
    return json_build_object('current_streak', v_streak, 'changed', false);
  end if;
  if coalesce(v_shields,0) >= v_missed then
    update public.users set streak_shields = streak_shields - v_missed, streak_day = v_today - 1, updated_at = now()
     where id = v_user;
    update public.user_inventory ui set quantity = greatest(v_shields - v_missed, 0)
      from public.shop_items s where s.id = ui.shop_item_id and s.key = 'streak_shield' and ui.user_id = v_user;
    return json_build_object('current_streak', v_streak, 'changed', true,
      'shield_consumed', v_missed, 'streak_shields', v_shields - v_missed);
  else
    update public.users set previous_streak = v_streak, current_streak = 0, streak_day = null, updated_at = now()
     where id = v_user;
    return json_build_object('current_streak', 0, 'changed', true, 'broken', true, 'previous_streak', v_streak);
  end if;
end $$;
revoke all on function public.evaluate_streak(date) from public, anon;
grant execute on function public.evaluate_streak(date) to authenticated;

-- ── use_streak_revive (local day + lock) ────────────────────────────────────
create or replace function public.use_streak_revive()
returns json language plpgsql security definer set search_path to 'public' as $function$
declare v_user uuid := auth.uid(); v_streak int; v_prev int; v_revives int; v_today date;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select current_streak, previous_streak, streak_revives into v_streak, v_prev, v_revives
    from public.users where id = v_user for update;
  if coalesce(v_revives,0) <= 0 then raise exception 'No Streak Revive available'; end if;
  if v_streak > 0 then raise exception 'Your streak is not broken'; end if;
  if coalesce(v_prev, 0) <= 0 then raise exception 'No streak to restore'; end if;
  v_today := public.resolve_local_date(v_user, null);
  update public.users set current_streak = v_prev, previous_streak = 0, streak_day = v_today - 1,
    streak_revives = streak_revives - 1, updated_at = now() where id = v_user;
  -- keep the inventory mirror in step with the counter (it used to drift up
  -- forever, so the shop said "3/3 Full" while the user held zero revives)
  update public.user_inventory ui set quantity = greatest(v_revives - 1, 0)
    from public.shop_items s where s.id = ui.shop_item_id and s.key = 'streak_revive' and ui.user_id = v_user;
  return json_build_object('current_streak', v_prev, 'streak_revives', v_revives - 1);
end; $function$;

-- ── buy_xp_boost (lock + active) ────────────────────────────────────────────
create or replace function public.buy_xp_boost(p_shop_item_id uuid)
 returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user uuid := auth.uid(); v_item public.shop_items%rowtype;
  v_gems int; v_mult int; v_hours int; v_cur_mult int; v_cur_exp timestamptz; v_new_exp timestamptz;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_item from public.shop_items where id = p_shop_item_id and is_active;
  if not found then raise exception 'Item not found'; end if;
  v_mult := (v_item.metadata->>'multiplier')::int;
  v_hours := (v_item.metadata->>'duration_hours')::int;
  if v_item.category <> 'boost' or v_mult is null or v_hours is null then raise exception 'Not an XP boost'; end if;
  select gems, active_boost_multiplier, active_boost_expires_at into v_gems, v_cur_mult, v_cur_exp
    from public.users where id = v_user for update;
  if v_cur_exp is not null and v_cur_exp > now() and v_mult < coalesce(v_cur_mult,1) then
    raise exception 'A x% boost is already active', v_cur_mult;
  end if;
  if v_gems < v_item.price_gems then raise exception 'Need % more gems', v_item.price_gems - v_gems; end if;
  v_new_exp := now() + make_interval(hours => v_hours);
  update public.users set gems = gems - v_item.price_gems, active_boost_multiplier = v_mult,
    active_boost_expires_at = v_new_exp, updated_at = now()
  where id = v_user returning gems, active_boost_multiplier, active_boost_expires_at into v_gems, v_cur_mult, v_cur_exp;
  return json_build_object('gems', v_gems, 'active_boost_multiplier', v_cur_mult,
    'active_boost_expires_at', v_cur_exp, 'bought_multiplier', v_mult);
end; $function$;

-- ── buy_focus_shield (lock + cap) ───────────────────────────────────────────
create or replace function public.buy_focus_shield()
returns json language plpgsql security definer set search_path to 'public' as $function$
declare v_user uuid := auth.uid(); v_gems int; v_price int; v_shields int; v_cap int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select value into v_price from public.game_config where key = 'focus_shield_price';
  v_price := coalesce(v_price, 500);
  select coalesce(max_owned, 4) into v_cap from public.shop_items where key = 'streak_shield';
  v_cap := coalesce(v_cap, 4);
  select gems, coalesce(streak_shields,0) into v_gems, v_shields from public.users where id = v_user for update;
  if v_shields >= v_cap then raise exception 'You already hold the maximum of % shields', v_cap; end if;
  if v_gems < v_price then raise exception 'Need % more gems', v_price - v_gems; end if;
  update public.users set gems = gems - v_price, streak_shields = coalesce(streak_shields,0) + 1, updated_at = now()
   where id = v_user returning gems, streak_shields into v_gems, v_shields;
  return json_build_object('gems', v_gems, 'streak_shields', v_shields);
end; $function$;

-- ── open_loot_box: lock the balance before charging ─────────────────────────
-- (body identical to 20261027000000 except the FOR UPDATE + relative charge)
create or replace function public.open_loot_box(p_loot_box_id uuid)
 returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user uuid := auth.uid();
  v_box public.loot_boxes%rowtype;
  v_gems int; v_floor int;
  v_ids uuid[] := '{}';
  v_id uuid; v_item public.shop_items%rowtype;
  v_i int; v_have int; v_max int; v_rank int; v_maxrank int;
  v_refund int; v_value int;
  v_results jsonb := '[]'::jsonb; v_total_refund int := 0;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_box from public.loot_boxes where id = p_loot_box_id;
  if not found then raise exception 'Loot box not found'; end if;

  select gems into v_gems from public.users where id = v_user for update;
  if v_gems < v_box.price_gems then raise exception 'Need % more gems', v_box.price_gems - v_gems; end if;
  update public.users set gems = gems - v_box.price_gems, updated_at = now() where id = v_user;
  v_gems := v_gems - v_box.price_gems;

  v_floor := case v_box.key when 'delta' then 2 when 'phase' then 3 else 1 end;

  for v_i in 1..v_box.items_per_open loop
    select d.shop_item_id into v_id
    from public.loot_box_drop_table d
    join public.shop_items s on s.id = d.shop_item_id and s.is_active
    where d.loot_box_id = v_box.id
    order by power(random(), 1.0 / d.weight) desc
    limit 1;
    v_ids := array_append(v_ids, v_id);
  end loop;

  select max(case s.rarity when 'common' then 1 when 'rare' then 2 when 'legendary' then 3 when 'mythic' then 4 else 1 end)
    into v_maxrank from public.shop_items s where s.id = any(v_ids);
  if coalesce(v_maxrank,1) < v_floor then
    select d.shop_item_id into v_id
    from public.loot_box_drop_table d
    join public.shop_items s on s.id = d.shop_item_id and s.is_active
    where d.loot_box_id = v_box.id
      and (case s.rarity when 'common' then 1 when 'rare' then 2 when 'legendary' then 3 when 'mythic' then 4 else 1 end) >= v_floor
    order by power(random(), 1.0 / d.weight) desc
    limit 1;
    if v_id is not null then v_ids[1] := v_id; end if;
  end if;

  foreach v_id in array v_ids loop
    select * into v_item from public.shop_items where id = v_id;
    v_max  := coalesce(v_item.max_owned, 1);
    v_rank := case v_item.rarity when 'common' then 1 when 'rare' then 2 when 'legendary' then 3 when 'mythic' then 4 else 1 end;
    select coalesce(quantity,0) into v_have from public.user_inventory where user_id = v_user and shop_item_id = v_item.id;
    v_have := coalesce(v_have,0);

    if v_have >= v_max then
      select s.id into v_id
      from public.loot_box_drop_table d
      join public.shop_items s on s.id = d.shop_item_id and s.is_active
      left join public.user_inventory ui on ui.user_id = v_user and ui.shop_item_id = s.id
      where d.loot_box_id = v_box.id
        and coalesce(ui.quantity,0) < coalesce(s.max_owned,1)
        and (case s.rarity when 'common' then 1 when 'rare' then 2 when 'legendary' then 3 when 'mythic' then 4 else 1 end) >= v_rank
      order by power(random(), 1.0 / d.weight) desc
      limit 1;
      if v_id is null then
        select s.id into v_id
        from public.loot_box_drop_table d
        join public.shop_items s on s.id = d.shop_item_id and s.is_active
        left join public.user_inventory ui on ui.user_id = v_user and ui.shop_item_id = s.id
        where d.loot_box_id = v_box.id
          and coalesce(ui.quantity,0) < coalesce(s.max_owned,1)
        order by power(random(), 1.0 / d.weight) desc
        limit 1;
      end if;
      if v_id is not null then
        select * into v_item from public.shop_items where id = v_id;
        v_have := 0;
      end if;
    end if;

    if v_have >= v_max then
      v_value := coalesce(v_item.price_gems,
        case v_item.rarity when 'mythic' then 1500 when 'legendary' then 800 when 'rare' then 400 else 150 end);
      v_refund := greatest(round(v_value * 0.5)::int,
        case v_item.rarity when 'mythic' then 400 when 'legendary' then 250 when 'rare' then 120 else 40 end);
      update public.users set gems = gems + v_refund where id = v_user;
      v_gems := v_gems + v_refund; v_total_refund := v_total_refund + v_refund;
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
end; $function$;

-- One-time resync of the shield/revive inventory mirrors to the real counters.
update public.user_inventory ui set quantity = coalesce(u.streak_shields, 0)
  from public.shop_items s, public.users u
 where s.id = ui.shop_item_id and s.key = 'streak_shield' and u.id = ui.user_id;
update public.user_inventory ui set quantity = coalesce(u.streak_revives, 0)
  from public.shop_items s, public.users u
 where s.id = ui.shop_item_id and s.key = 'streak_revive' and u.id = ui.user_id;
