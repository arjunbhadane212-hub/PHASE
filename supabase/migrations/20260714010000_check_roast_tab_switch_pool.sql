-- Add a distinct Focus Mode roast pool for the tab-switch penalty (section 5d).
-- Same quiet, personal, disappointed tone as the abandon pool, but the copy
-- specifically calls out leaving the tab. Selected when app_mode = 'focus' and
-- the event is 'tab_switch'.
create or replace function public.check_roast(p_event text default null::text)
returns json
language plpgsql
security definer set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_mode text;
  v_settings jsonb;
  v_today_count int;
  v_last text;
  v_pool text[];
  v_candidates text[];
  v_chosen text;

  v_game text[] := array[
    'Your streak called. It wants to know if you''re coming back.',
    'Rest day number three? Bold strategy.',
    'Somewhere, a leaderboard is quietly judging you.',
    'You versus the couch. The couch is up a point.',
    'Big talk yesterday. Where''d that energy wander off to?',
    'Your habits miss you. Not desperately, but a little.',
    'Champions show up. Just leaving that here.',
    'That XP won''t earn itself, hotshot.'
  ];
  v_focus text[] := array[
    'You said today would be different. It still can be.',
    'The work is still here, waiting patiently.',
    'A quiet day slipped by. Tomorrow''s yours to take back.',
    'No pressure. Just a small nudge toward who you''re becoming.',
    'You know what needs doing. Take the first step.',
    'Progress doesn''t need noise. Just you, showing up.'
  ];
  v_abandon text[] := array[
    'You stepped away. That''s okay — come back when you''re ready.',
    'Session cut short. The next one counts double in spirit.',
    'Almost had it. The timer will be here when you return.'
  ];
  v_tabswitch text[] := array[
    'You slipped off to another tab. The session noticed you leave.',
    'The timer was still running. You just weren''t here for it.',
    'Focus meant staying. You wandered off mid-session.'
  ];
begin
  if v_user is null then return null; end if;

  select app_mode, notification_settings into v_mode, v_settings
  from public.users where id = v_user;

  if coalesce((v_settings->>'roast_enabled')::boolean, true) = false then
    return null;
  end if;

  select count(*) into v_today_count
  from public.notifications
  where user_id = v_user and type = 'roast' and created_at::date = current_date;
  if v_today_count >= 2 then return null; end if;

  select text into v_last
  from public.notifications
  where user_id = v_user and type = 'roast'
  order by created_at desc limit 1;

  if v_mode = 'focus' and p_event = 'tab_switch' then
    v_pool := v_tabswitch;
  elsif v_mode = 'focus' and p_event = 'abandon' then
    v_pool := v_abandon;
  elsif v_mode = 'game' then
    v_pool := v_game;
  else
    v_pool := v_focus;
  end if;

  select array_agg(x) into v_candidates
  from unnest(v_pool) x where x is distinct from v_last;
  if v_candidates is null or array_length(v_candidates, 1) = 0 then
    v_candidates := v_pool;
  end if;

  v_chosen := v_candidates[1 + floor(random() * array_length(v_candidates, 1))::int];

  insert into public.notifications (user_id, text, type)
  values (v_user, v_chosen, 'roast');

  return json_build_object('roast', v_chosen, 'type', 'roast', 'mode', v_mode);
end;
$function$;
