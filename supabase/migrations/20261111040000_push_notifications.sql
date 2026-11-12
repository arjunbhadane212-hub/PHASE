-- Phone push notifications (2026-11-11)
--
-- Web Push (works on Android Chrome, desktop browsers, and iOS 16.4+ once Phase
-- is added to the Home Screen). Free: browser push services, a Supabase Edge
-- Function (push-dispatch) and pg_cron every 15 minutes. No paid provider.
--
-- What gets sent, modelled on what makes Duolingo's reminders work:
--   * Timed to the user: the daily reminder fires ~30 min before the time they
--     USUALLY check in (median of the last 3 weeks), not at a fixed hour.
--   * Loss aversion: a "your N-day streak ends at midnight" push at ~20:45
--     local if nothing is done yet — the single strongest re-engagement push.
--   * Specific: names a habit that is still open, the streak count, the
--     next milestone, the league position and hours left.
--   * Social stakes: league push in the last 10h of the week (promotion zone /
--     drop zone / chasing), Game Mode only.
--   * Backs off: comeback pushes at 2/3/5/7/14 days away, then one honest
--     "we'll stop sending these" at day 21, then silence until they return.
--   * Never the same line twice in a row: the last 12 copy keys a user saw are
--     excluded. ~90 lines, tone split by mode (Game = loud/competitive,
--     Focus = quiet/personal), per CLAUDE.md.
--   * Hard caps: max 2 per local day, only 08:00–22:00 local, respects
--     notification_settings.push_enabled / reminders_enabled.
--
-- Secrets (VAPID private key, dispatch secret) live in Supabase Vault and are
-- inserted out-of-band, never in this file.

create extension if not exists pg_net with schema extensions;

-- ── subscriptions ───────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  fail_count      int not null default 0
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "read own push subs" on public.push_subscriptions;
create policy "read own push subs" on public.push_subscriptions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "delete own push subs" on public.push_subscriptions;
create policy "delete own push subs" on public.push_subscriptions for delete to authenticated using (auth.uid() = user_id);

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1024 then raise exception 'Invalid endpoint'; end if;
  if p_p256dh is null or length(p_p256dh) not between 80 and 100 then raise exception 'Invalid key'; end if;
  if p_auth is null or length(p_auth) not between 16 and 32 then raise exception 'Invalid auth secret'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_user, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh,
    auth = excluded.auth, user_agent = excluded.user_agent, fail_count = 0;
  -- keep at most 10 devices per user
  delete from public.push_subscriptions where id in (
    select id from public.push_subscriptions where user_id = v_user order by created_at desc offset 10);
  return json_build_object('ok', true);
end $$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- ── copy bank ───────────────────────────────────────────────────────────────
create table if not exists public.push_copy (
  key     text primary key,
  kind    text not null,   -- reminder | streak_risk | league | comeback | test
  variant text not null default 'default',
  mode    text not null check (mode in ('game','focus','any')),
  title   text not null,
  body    text not null,
  active  boolean not null default true
);
alter table public.push_copy enable row level security;  -- server only (no policies)

-- ── send log (dedupe, caps, never-repeat) ───────────────────────────────────
create table if not exists public.push_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  kind       text not null,
  copy_key   text,
  local_date date not null,
  sent_at    timestamptz not null default now(),
  status     text not null default 'queued'
);
create unique index if not exists push_log_once_per_day on public.push_log (user_id, kind, local_date) where kind <> 'test';
create index if not exists push_log_user_sent_idx on public.push_log (user_id, sent_at desc);
alter table public.push_log enable row level security;  -- server only

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function public._push_fill(p_text text, p_vars jsonb)
returns text language plpgsql immutable set search_path = public as $$
declare k text; v text; t text := p_text;
begin
  for k, v in select key, value from jsonb_each_text(p_vars) loop
    t := replace(t, '{' || k || '}', coalesce(v, ''));
  end loop;
  return t;
end $$;

-- Config for the edge function (service_role only).
create or replace function public._push_config()
returns json language plpgsql security definer set search_path = public as $$
begin
  return json_build_object(
    'vapid_public', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_public'),
    'vapid_private_jwk', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_private_jwk')::json,
    'subject', 'https://phaseofficial.vercel.app',
    'dispatch_secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_secret'));
end $$;
revoke all on function public._push_config() from public, anon, authenticated;
grant execute on function public._push_config() to service_role;

-- Who should get what, right now. Inserts the push_log rows it returns, so a
-- second call in the same window never double-sends (service_role only).
create or replace function public.push_collect_due(p_limit int default 300)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record; v_copy record;
  v_out jsonb := '[]'::jsonb; v_sent int := 0;
  v_tz text; v_lnow timestamp; v_ldate date; v_lmin int; v_dow int; v_weekday text;
  v_done boolean; v_sched int; v_pending int; v_habit text; v_last date; v_away int;
  v_usual numeric; v_target int; v_today_cnt int; v_rem boolean;
  v_kind text; v_variant text; v_url text; v_vars jsonb; v_log bigint; v_recent text[];
  v_group bigint; v_ends timestamptz; v_gtier int; v_pos int; v_size int; v_tier text; v_promo int; v_demo int; v_hours int;
  v_ms int[] := array[3,7,14,30,50,100,200,365];
begin
  for r in
    select u.id, u.app_mode, u.created_at, coalesce(u.current_streak,0) streak, coalesce(u.previous_streak,0) prev,
           coalesce(u.streak_shields,0) shields, coalesce(u.total_habits_completed,0) total,
           coalesce(u.timezone, 'UTC') tz, coalesce(u.notification_settings, '{}'::jsonb) ns
    from public.users u
    where u.banned_at is null
      and coalesce((u.notification_settings->>'push_enabled')::boolean, true)
      and exists (select 1 from public.push_subscriptions s where s.user_id = u.id)
  loop
    exit when v_sent >= p_limit;
    v_lnow := now() at time zone r.tz;
    v_ldate := v_lnow::date;
    v_lmin := extract(hour from v_lnow)::int * 60 + extract(minute from v_lnow)::int;
    continue when v_lmin < 480 or v_lmin >= 1320;            -- 08:00–22:00 local only
    select count(*) into v_today_cnt from public.push_log
      where user_id = r.id and local_date = v_ldate and kind <> 'test';
    continue when v_today_cnt >= 2;                           -- max 2 a day
    v_rem := coalesce((r.ns->>'reminders_enabled')::boolean, true);
    v_dow := extract(dow from v_ldate);
    v_weekday := lower(trim(to_char(v_ldate, 'FMDay')));

    select count(*),
           count(*) filter (where not exists (select 1 from public.habit_completions hc where hc.habit_id = h.id and hc.completed_date = v_ldate)),
           (array_agg(h.habit_name order by case h.time_of_day when 'morning' then 1 when 'afternoon' then 2 else 3 end, h.created_at)
              filter (where not exists (select 1 from public.habit_completions hc where hc.habit_id = h.id and hc.completed_date = v_ldate)))[1]
      into v_sched, v_pending, v_habit
      from public.habits h
     where h.user_id = r.id and (
       h.repeat_schedule = 'daily' or (h.repeat_schedule = 'weekdays' and v_dow between 1 and 5)
       or (h.repeat_schedule = 'weekends' and v_dow in (0, 6))
       or (h.repeat_schedule not in ('daily','weekdays','weekends') and coalesce(h.custom_days, '[]'::jsonb) ? v_weekday));
    v_done := exists (select 1 from public.habit_completions where user_id = r.id and completed_date = v_ldate and status = 'completed');
    select max(completed_date) into v_last from public.habit_completions where user_id = r.id and status = 'completed';
    v_away := v_ldate - coalesce(v_last, r.created_at::date);

    select percentile_cont(0.5) within group (order by extract(hour from hc.completed_at at time zone r.tz) * 60
                                                   + extract(minute from hc.completed_at at time zone r.tz))
      into v_usual from public.habit_completions hc
     where hc.user_id = r.id and hc.status = 'completed' and hc.completed_at > now() - interval '21 days';
    v_target := least(greatest(coalesce(v_usual, 1110)::int - 30, 540), 1230);

    v_kind := null; v_variant := 'default'; v_url := '/dashboard';
    v_group := null; v_pos := null; v_size := null; v_tier := null; v_hours := null;

    -- 1. streak about to break (20:45 – 22:00 local)
    if v_rem and r.streak >= 1 and not v_done and v_sched > 0 and v_lmin >= 1245
       and not exists (select 1 from public.push_log where user_id = r.id and local_date = v_ldate and kind = 'streak_risk') then
      v_kind := 'streak_risk';
      v_variant := case when r.shields > 0 then 'shielded'
                        when (r.streak + 1) = any (v_ms) then 'milestone'
                        when r.streak >= 30 then 'long' else 'default' end;
    end if;

    -- 2. league closing (Game Mode, last 10h of the week, 12:00 – 21:30 local)
    if v_kind is null and r.app_mode = 'game' and v_lmin between 720 and 1290 then
      select m.group_id, p.ends_at, g.tier into v_group, v_ends, v_gtier
        from public.leaderboard_memberships m
        join public.leaderboard_groups g on g.id = m.group_id
        join public.leaderboard_periods p on p.id = g.period_id
       where m.user_id = r.id and p.status = 'active' and p.ends_at between now() and now() + interval '10 hours'
       limit 1;
      if v_group is not null
         and not exists (select 1 from public.push_log where user_id = r.id and kind = 'league' and sent_at > now() - interval '3 days') then
        select count(*) into v_size from public.leaderboard_memberships where group_id = v_group;
        select 1 + count(*) into v_pos from public.leaderboard_memberships
         where group_id = v_group and period_xp > (select period_xp from public.leaderboard_memberships where group_id = v_group and user_id = r.id);
        select name, promote_count, demote_count into v_tier, v_promo, v_demo from public.leaderboard_tier_config where tier = v_gtier;
        v_hours := greatest(1, ceil(extract(epoch from (v_ends - now())) / 3600)::int);
        v_kind := 'league'; v_url := '/dashboard/leaderboard';
        v_variant := case when v_pos <= greatest(coalesce(v_promo, 3), 1) then 'promo'
                          when coalesce(v_demo, 0) > 0 and v_size > 3 and v_pos > v_size - v_demo then 'danger'
                          else 'chase' end;
      end if;
    end if;

    -- 3. daily reminder (active users) or comeback (lapsed users)
    if v_kind is null and v_rem and v_sched > 0 and not v_done and v_lmin >= v_target and v_lmin < 1290 then
      if v_away <= 1 then
        if not exists (select 1 from public.push_log where user_id = r.id and local_date = v_ldate and kind = 'reminder') then
          v_kind := 'reminder';
          v_variant := case when r.total = 0 then 'new'
                            when r.streak >= 1 and (r.streak + 1) = any (v_ms) then 'milestone'
                            when r.streak >= 2 then 'streak'
                            when r.streak = 0 and r.prev >= 3 then 'fresh'
                            else 'default' end;
        end if;
      elsif v_away in (2, 3, 5, 7, 14, 21) then
        if not exists (select 1 from public.push_log where user_id = r.id and local_date = v_ldate and kind = 'comeback') then
          v_kind := 'comeback';
          v_variant := case when v_away = 21 then 'goodbye' else 'd' || v_away end;
        end if;
      end if;
    end if;

    continue when v_kind is null;

    -- never the same line twice in a row: skip the last 12 seen
    select coalesce(array_agg(copy_key), '{}') into v_recent from (
      select copy_key from public.push_log where user_id = r.id and copy_key is not null order by sent_at desc limit 12) x;
    select * into v_copy from public.push_copy c
     where c.active and c.kind = v_kind and c.variant = v_variant and c.mode in (r.app_mode, 'any')
     order by (c.key = any (v_recent)), random() limit 1;
    if not found then
      select * into v_copy from public.push_copy c
       where c.active and c.kind = v_kind and c.variant = 'default' and c.mode in (r.app_mode, 'any')
       order by (c.key = any (v_recent)), random() limit 1;
    end if;
    continue when not found;

    v_vars := jsonb_build_object(
      'streak', r.streak, 'next', r.streak + 1, 'prev', r.prev, 'shields', r.shields,
      'habit', coalesce(left(v_habit, 40), 'your habit'), 'left', coalesce(v_pending, 0),
      'days', v_away, 'pos', v_pos, 'tier', coalesce(v_tier, 'your league'), 'hours', v_hours);

    v_log := null;
    insert into public.push_log (user_id, kind, copy_key, local_date)
    values (r.id, v_kind, v_copy.key, v_ldate)
    on conflict do nothing
    returning id into v_log;
    continue when v_log is null;

    v_out := v_out || coalesce((
      select jsonb_agg(jsonb_build_object('log_id', v_log, 'sub_id', s.id, 'endpoint', s.endpoint,
        'p256dh', s.p256dh, 'auth', s.auth, 'kind', v_kind,
        'title', public._push_fill(v_copy.title, v_vars), 'body', public._push_fill(v_copy.body, v_vars),
        'url', v_url, 'tag', 'phase-' || v_kind))
      from public.push_subscriptions s where s.user_id = r.id), '[]'::jsonb);
    v_sent := v_sent + 1;
  end loop;
  return v_out;
end $$;
revoke all on function public.push_collect_due(int) from public, anon, authenticated;
grant execute on function public.push_collect_due(int) to service_role;

-- Delivery results from the edge function: prune dead devices, mark logs.
create or replace function public.push_report(p_results jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare e jsonb; v_status int; v_ok int := 0; v_dead int := 0;
begin
  for e in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    v_status := coalesce((e->>'status')::int, 0);
    if v_status between 200 and 299 then
      update public.push_subscriptions set last_success_at = now(), fail_count = 0 where id = (e->>'sub_id')::uuid;
      update public.push_log set status = 'sent' where id = (e->>'log_id')::bigint;
      v_ok := v_ok + 1;
    elsif v_status in (404, 410) then
      delete from public.push_subscriptions where id = (e->>'sub_id')::uuid;
      v_dead := v_dead + 1;
    else
      update public.push_subscriptions set fail_count = fail_count + 1 where id = (e->>'sub_id')::uuid;
      delete from public.push_subscriptions where id = (e->>'sub_id')::uuid and fail_count >= 5;
    end if;
  end loop;
  update public.push_log l set status = 'failed'
   where l.status = 'queued' and l.id in (select (x->>'log_id')::bigint from jsonb_array_elements(coalesce(p_results,'[]'::jsonb)) x);
  return json_build_object('ok', v_ok, 'pruned', v_dead);
end $$;
revoke all on function public.push_report(jsonb) from public, anon, authenticated;
grant execute on function public.push_report(jsonb) to service_role;

-- ── copy ────────────────────────────────────────────────────────────────────
-- Game Mode: loud, competitive, a little trash talk. Focus Mode: quiet, personal.
insert into public.push_copy (key, kind, variant, mode, title, body) values
  -- GAME · reminder
  ('g_rem_1','reminder','default','game','Your habits are waiting','{habit} won''t do itself. Go take the XP.'),
  ('g_rem_2','reminder','default','game','Daily check-in','{left} habits on the board today. Clear one and get on the scoreboard.'),
  ('g_rem_3','reminder','default','game','You vs. today','Today is still undefeated. Fix that. Start with {habit}.'),
  ('g_rem_4','reminder','default','game','Free XP, zero excuses','{left} habits left. The XP is just sitting there.'),
  ('g_rem_5','reminder','default','game','Two minutes','Two minutes on {habit} and today counts. That''s the whole deal.'),
  ('g_rem_6','reminder','default','game','Your league is moving','Someone just logged a habit. Your move.'),
  ('g_rem_s1','reminder','streak','game','{streak} days. Don''t get soft.','Day {next} is one habit away. Lock it in.'),
  ('g_rem_s2','reminder','streak','game','Keep the fire fed','{streak}-day streak on the line. {habit} keeps it alive.'),
  ('g_rem_s3','reminder','streak','game','Streak check','You built {streak} days. Don''t hand them back over one lazy evening.'),
  ('g_rem_s4','reminder','streak','game','Make it {next}','{streak} straight days. Make it {next} before the day runs out.'),
  ('g_rem_s5','reminder','streak','game','Still undefeated','{streak} days without a miss. Keep the run going.'),
  ('g_rem_m1','reminder','milestone','game','Day {next} is right there','One habit and you hit a {next}-day streak. Bonus gems unlock.'),
  ('g_rem_m2','reminder','milestone','game','Milestone incoming','{next} days is a flex. You''re one check-in away.'),
  ('g_rem_m3','reminder','milestone','game','Big day','Hit {next} days today and the milestone reward is yours.'),
  ('g_rem_n1','reminder','new','game','Day one starts now','Check off {habit} and your streak starts tonight.'),
  ('g_rem_n2','reminder','new','game','Your first XP is waiting','One habit. That''s all it takes to start climbing.'),
  ('g_rem_n3','reminder','new','game','Get on the board','Complete {habit} and earn your first XP.'),
  ('g_rem_f1','reminder','fresh','game','Run it back','Last streak: {prev} days. Beat it, starting today.'),
  ('g_rem_f2','reminder','fresh','game','New streak, who dis','The old one''s gone. The next one can be longer.'),
  ('g_rem_f3','reminder','fresh','game','Day 1 again','Every long streak started at 1. Today''s yours.'),
  -- GAME · streak at risk
  ('g_risk_1','streak_risk','default','game','Your {streak}-day streak ends at midnight','One habit saves it. You have a few hours.'),
  ('g_risk_2','streak_risk','default','game','Streak in danger','{streak} days are about to reset to zero. Don''t let that happen.'),
  ('g_risk_3','streak_risk','default','game','Last call','Midnight wipes your {streak}-day streak. Two minutes fixes it.'),
  ('g_risk_4','streak_risk','default','game','Don''t fumble this','{streak} days of work. One check-in tonight keeps it.'),
  ('g_risk_5','streak_risk','default','game','Clock''s running','Your streak resets in a few hours. {habit} saves it.'),
  ('g_risk_sh1','streak_risk','shielded','game','Your shield is about to burn','Skip today and a Streak Shield gets used. Or just do {habit}.'),
  ('g_risk_sh2','streak_risk','shielded','game','Save the shield','Your streak is covered tonight, but shields are rare. Keep it.'),
  ('g_risk_m1','streak_risk','milestone','game','You''re about to miss day {next}','A milestone reward is one habit away. So is losing it all.'),
  ('g_risk_m2','streak_risk','milestone','game','So close to {next}','Day {next} unlocks bonus gems. Don''t let midnight take it.'),
  ('g_risk_l1','streak_risk','long','game','{streak} days. Not tonight.','Do one habit. That''s it. Protect the streak.'),
  ('g_risk_l2','streak_risk','long','game','This would hurt','Losing a {streak}-day streak takes one skipped night. Don''t.'),
  -- GAME · league
  ('g_lg_p1','league','promo','game','You''re #{pos} in {tier}','League ends in {hours}h. Hold your spot and you move up.'),
  ('g_lg_p2','league','promo','game','Promotion is yours to lose','#{pos} with {hours}h left. Log a habit and lock it in.'),
  ('g_lg_c1','league','chase','game','League ends in {hours}h','You''re #{pos}. A couple of habits could move you up.'),
  ('g_lg_c2','league','chase','game','Climb before the reset','#{pos} in {tier}. The leaderboard closes in {hours}h.'),
  ('g_lg_c3','league','default','game','League ends in {hours}h','Every habit you log now counts toward your finish.'),
  ('g_lg_d1','league','danger','game','You''re in the drop zone','#{pos} with {hours}h left. Log habits now or fall a league.'),
  ('g_lg_d2','league','danger','game','Relegation watch','{hours}h until the reset and you''re near the bottom. Fight for it.'),
  -- GAME · comeback
  ('g_cb_2a','comeback','d2','game','Quick comeback?','One habit today and you''re back in it.'),
  ('g_cb_2b','comeback','d2','game','2 days off','Your streak is gone. Your habits aren''t. Come back.'),
  ('g_cb_3a','comeback','d3','game','The leaderboard moved on','3 days quiet. Everyone else kept going. Catch up.'),
  ('g_cb_3b','comeback','d3','game','Still here?','3 days without a check-in. One tap starts it over.'),
  ('g_cb_5a','comeback','d5','game','Your habits miss you','Not desperately. But a little. Come do {habit}.'),
  ('g_cb_5b','comeback','d5','game','5 days','That''s how long since your last habit. Day 1 is waiting.'),
  ('g_cb_7a','comeback','d7','game','One week off','A week off turns into a month off. Stop it here. One habit.'),
  ('g_cb_7b','comeback','d7','game','A whole week','Your rank is collecting dust. Come back and take today.'),
  ('g_cb_14a','comeback','d14','game','Two weeks','Habits fade fast. Today''s a good day to start again.'),
  ('g_cb_14b','comeback','d14','game','Still got it?','Two weeks away. Prove it with one habit.'),
  ('g_cb_bye1','comeback','goodbye','game','We''ll stop reminding you','These reminders don''t seem to be working. We''ll stop sending them for now.'),
  ('g_cb_bye2','comeback','goodbye','game','Okay, we get it','We''ll go quiet. Your habits will be here whenever you''re ready.'),
  -- FOCUS · reminder
  ('f_rem_1','reminder','default','focus','Time to focus','{habit} is still waiting for you today.'),
  ('f_rem_2','reminder','default','focus','A quiet nudge','You planned {left} sessions today. Start with one.'),
  ('f_rem_3','reminder','default','focus','Your space is ready','Close the tabs. Begin {habit}.'),
  ('f_rem_4','reminder','default','focus','A small step','A short focused session still counts. Begin when you''re ready.'),
  ('f_rem_5','reminder','default','focus','Today isn''t over','There''s still time to do what you said you''d do.'),
  ('f_rem_s1','reminder','streak','focus','{streak} days of showing up','Today can be day {next}. Begin {habit}.'),
  ('f_rem_s2','reminder','streak','focus','Keep the rhythm','{streak} days in a row. Don''t break it quietly.'),
  ('f_rem_s3','reminder','streak','focus','Still going','You''ve shown up {streak} days straight. Show up once more.'),
  ('f_rem_m1','reminder','milestone','focus','Almost {next} days','One session today and you reach a {next}-day streak.'),
  ('f_rem_m2','reminder','milestone','focus','A milestone, quietly','Day {next} is one focused session away.'),
  ('f_rem_n1','reminder','new','focus','Your first session','Begin {habit}. The timer does the rest.'),
  ('f_rem_n2','reminder','new','focus','Start small','One short session today. That''s how it begins.'),
  ('f_rem_f1','reminder','fresh','focus','Begin again','Your streak reset. The work didn''t go anywhere. Start today.'),
  ('f_rem_f2','reminder','fresh','focus','A clean start','Day one, again. It gets easier from here.'),
  -- FOCUS · streak at risk
  ('f_risk_1','streak_risk','default','focus','Your {streak}-day streak ends tonight','One session keeps it. You still have time.'),
  ('f_risk_2','streak_risk','default','focus','Before midnight','{streak} days of focus. Don''t let them end like this.'),
  ('f_risk_3','streak_risk','default','focus','Still time','A short session tonight keeps your {streak}-day streak alive.'),
  ('f_risk_sh1','streak_risk','shielded','focus','Your shield will cover tonight','Or begin {habit} and save the shield for a harder day.'),
  ('f_risk_m1','streak_risk','milestone','focus','Day {next} is so close','One session tonight. Don''t let it slip.'),
  ('f_risk_l1','streak_risk','long','focus','{streak} days, quietly built','Don''t lose them tonight. One session.'),
  -- FOCUS · comeback
  ('f_cb_2a','comeback','d2','focus','It''s been two days','No pressure. The work is still here when you''re ready.'),
  ('f_cb_2b','comeback','d2','focus','Come back gently','One short session is enough to begin again.'),
  ('f_cb_3a','comeback','d3','focus','Three quiet days','You said this mattered. It still can.'),
  ('f_cb_5a','comeback','d5','focus','We miss your focus','Five days away. Begin with something small.'),
  ('f_cb_7a','comeback','d7','focus','A week has passed','Who you''re becoming is still waiting. One session.'),
  ('f_cb_14a','comeback','d14','focus','Two weeks','It''s not too late. It never is. Begin again today.'),
  ('f_cb_bye1','comeback','goodbye','focus','We''ll stop for now','These reminders don''t seem to be helping, so we''ll go quiet. We''ll be here.'),
  -- test
  ('any_test_1','test','default','any','Notifications are on','This is how Phase will nudge you. Now go keep that streak alive.')
on conflict (key) do update set kind = excluded.kind, variant = excluded.variant, mode = excluded.mode,
  title = excluded.title, body = excluded.body, active = true;

-- ── schedule: every 15 minutes, pg_cron -> pg_net -> push-dispatch ──────────
create or replace function public.push_dispatch_tick()
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare v_secret text; v_id bigint;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if v_secret is null then return null; end if;
  select net.http_post(
    url := 'https://dnfcrpthpinilibvqwtf.supabase.co/functions/v1/push-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000) into v_id;
  return v_id;
end $$;
revoke all on function public.push_dispatch_tick() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'push_dispatch';
select cron.schedule('push_dispatch', '*/15 * * * *', $$select public.push_dispatch_tick();$$);

-- Vault secrets required (create once, out of band):
--   push_vapid_public, push_vapid_private_jwk, push_dispatch_secret
