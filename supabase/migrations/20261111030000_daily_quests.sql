-- Daily quests (2026-11-11)
--
-- Replaces the hard-coded PLACEHOLDER quest cards on Home ("7-day sprint ·
-- Complete", "Beat Rival") — they looked like a feature and did nothing.
--
-- Three quests a day, computed server-side from real data, claimed for gems.
--   slot 1  always "Complete 1 habit"          (an easy first win — endowed progress)
--   slot 2  one of hard / three / morning / XP / focus-minutes, picked per user per day
--   slot 3  "Finish every habit today" when there are 2+ scheduled, else another rotating one
-- The pick is a stable hash of (user, date), so the set doesn't reshuffle on reload.
-- Progress is derived from habit_completions / daily_logs / focus_sessions, so it
-- can't be faked from the client; claiming re-checks progress under a row lock
-- and is once per quest per day (quest_claims primary key).
-- This also makes the shop's "All habits in a day +gems" line TRUE — before,
-- nothing paid it.

create table if not exists public.quest_claims (
  user_id    uuid not null references public.users(id) on delete cascade,
  quest_date date not null,
  quest_key  text not null,
  gems       int  not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_date, quest_key)
);
alter table public.quest_claims enable row level security;
drop policy if exists "read own quest claims" on public.quest_claims;
create policy "read own quest claims" on public.quest_claims for select to authenticated using (auth.uid() = user_id);

-- Internal: the user's quests for a date with live progress.
create or replace function public._daily_quests(p_user uuid, p_date date)
returns table (quest_key text, title text, target int, progress int, reward int, claimed boolean, slot int)
language plpgsql stable security definer set search_path = public as $$
declare
  v_dow int := extract(dow from p_date);
  v_weekday text := lower(trim(to_char(p_date, 'FMDay')));
  v_mode text; v_tz text;
  v_sched int; v_sched_hard int; v_done int; v_done_hard int; v_morning int; v_xp int; v_focus_min int;
  v_pool text[]; v_slot2 text; v_slot3 text;
begin
  select app_mode, timezone into v_mode, v_tz from public.users where id = p_user;

  with sched as (
    select h.id, h.difficulty from public.habits h where h.user_id = p_user and (
      h.repeat_schedule = 'daily' or (h.repeat_schedule = 'weekdays' and v_dow between 1 and 5)
      or (h.repeat_schedule = 'weekends' and v_dow in (0, 6))
      or (h.repeat_schedule not in ('daily','weekdays','weekends') and coalesce(h.custom_days, '[]'::jsonb) ? v_weekday))
  ), done as (
    select distinct hc.habit_id, hc.completed_at from public.habit_completions hc
    where hc.user_id = p_user and hc.completed_date = p_date and hc.status = 'completed'
  )
  select (select count(*) from sched),
         (select count(*) from sched where difficulty = 'hard'),
         (select count(distinct d.habit_id) from done d join sched s on s.id = d.habit_id),
         (select count(distinct d.habit_id) from done d join sched s on s.id = d.habit_id and s.difficulty = 'hard'),
         (select count(*) from done d where v_tz is not null and extract(hour from d.completed_at at time zone v_tz) < 12)
    into v_sched, v_sched_hard, v_done, v_done_hard, v_morning;

  select coalesce(xp_earned_today, 0) into v_xp from public.daily_logs where user_id = p_user and log_date = p_date;
  v_xp := coalesce(v_xp, 0);
  select coalesce(sum(credited_minutes), 0)::int into v_focus_min from public.focus_sessions
   where user_id = p_user and status = 'completed'
     and (case when v_tz is not null then (ended_at at time zone v_tz)::date else ended_at::date end) = p_date;

  -- rotating pool (only quests this user can actually finish today)
  v_pool := array[]::text[];
  if v_sched_hard > 0 then v_pool := array_append(v_pool, 'q_hard'); end if;
  if v_sched >= 3 then v_pool := array_append(v_pool, 'q_three'); end if;
  if v_tz is not null and v_sched > 0 then v_pool := array_append(v_pool, 'q_morning'); end if;
  if v_mode = 'game' and v_sched > 0 then v_pool := array_append(v_pool, 'q_xp'); end if;
  if v_mode = 'focus' and v_sched > 0 then v_pool := array_append(v_pool, 'q_focus'); end if;

  select k into v_slot2 from unnest(v_pool) k order by md5(p_user::text || p_date::text || k) limit 1;
  if v_sched >= 2 then
    v_slot3 := 'q_perfect';
  else
    select k into v_slot3 from unnest(v_pool) k where k is distinct from v_slot2
      order by md5(p_date::text || p_user::text || k) limit 1;
  end if;

  return query
  with q(quest_key, title, target, progress, reward, slot) as (
    values
      ('q_first', 'Complete 1 habit', 1, least(v_done, 1), 5, 1),
      ('q_hard', 'Complete a hard habit', 1, least(v_done_hard, 1), 10, 2),
      ('q_three', 'Complete 3 habits', 3, least(v_done, 3), 10, 2),
      ('q_morning', 'Finish a habit before noon', 1, least(v_morning, 1), 10, 2),
      ('q_xp', 'Earn 60 XP today', 60, least(v_xp, 60), 10, 2),
      ('q_focus', 'Focus for 30 minutes', 30, least(v_focus_min, 30), 10, 2),
      ('q_perfect', 'Finish every habit today', greatest(v_sched, 1)::int, least(v_done, greatest(v_sched, 1))::int, 15, 3)
  )
  select q.quest_key, q.title, q.target::int, q.progress::int, q.reward::int,
         exists (select 1 from public.quest_claims c where c.user_id = p_user and c.quest_date = p_date and c.quest_key = q.quest_key),
         case when q.quest_key = 'q_first' then 1 when q.quest_key = v_slot2 then 2 else 3 end
  from q
  where v_sched > 0 and (q.quest_key in ('q_first', v_slot2, v_slot3)
     or exists (select 1 from public.quest_claims c where c.user_id = p_user and c.quest_date = p_date and c.quest_key = q.quest_key))
  order by 7;
end $$;
revoke all on function public._daily_quests(uuid, date) from public, anon, authenticated;

create or replace function public.quest_date_for(p_user uuid, p_client_date date)
returns date language sql stable security definer set search_path = public as $$
  select case when p_client_date between current_date - 1 and current_date + 1 then p_client_date
              else public.resolve_local_date(p_user, null) end
$$;
revoke all on function public.quest_date_for(uuid, date) from public, anon, authenticated;

create or replace function public.get_daily_quests(p_client_date date default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_date date;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  v_date := public.quest_date_for(v_user, p_client_date);
  return json_build_object('date', v_date, 'quests', coalesce((
    select json_agg(json_build_object('key', q.quest_key, 'title', q.title, 'target', q.target,
      'progress', q.progress, 'reward', q.reward, 'claimed', q.claimed,
      'complete', q.progress >= q.target) order by q.slot)
    from public._daily_quests(v_user, v_date) q), '[]'::json));
end $$;
revoke all on function public.get_daily_quests(date) from public, anon;
grant execute on function public.get_daily_quests(date) to authenticated;

create or replace function public.claim_daily_quest(p_key text, p_client_date date default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_date date; v_q record; v_gems int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  perform 1 from public.users where id = v_user for update;
  v_date := public.quest_date_for(v_user, p_client_date);
  select * into v_q from public._daily_quests(v_user, v_date) q where q.quest_key = p_key;
  if not found then raise exception 'That quest is not active today'; end if;
  if v_q.claimed then raise exception 'Already claimed'; end if;
  if v_q.progress < v_q.target then raise exception 'Quest not complete yet'; end if;
  insert into public.quest_claims (user_id, quest_date, quest_key, gems) values (v_user, v_date, p_key, v_q.reward);
  update public.users set gems = gems + v_q.reward, updated_at = now() where id = v_user returning gems into v_gems;
  return json_build_object('key', p_key, 'reward', v_q.reward, 'gems', v_gems);
end $$;
revoke all on function public.claim_daily_quest(text, date) from public, anon;
grant execute on function public.claim_daily_quest(text, date) to authenticated;
