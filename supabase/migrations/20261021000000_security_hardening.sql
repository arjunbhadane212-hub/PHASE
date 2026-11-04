-- Security hardening (2026-10-21). Defense in depth on top of RLS.
-- 1. Function EXECUTE lockdown: only the RPCs the client actually calls stay reachable.
-- 2. Table privilege lockdown: clients may only write what the app really writes.
-- 3. Extra protected users columns (equipped_*, focus minutes, identity).
-- 4. Habit farming guard (cap habits per user) + input length limits.

-- ---------- 1. FUNCTIONS ----------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- client RPCs (signed-in users only)
do $$
declare f text;
begin
  foreach f in array array[
    'abandon_focus_session','buy_focus_shield','buy_item','buy_xp_boost','check_roast',
    'check_title_unlocks','close_focus_session','complete_focus_session','complete_habit',
    'equip_item','evaluate_streak','get_leaderboard','get_period_result','open_loot_box',
    'purchase_shop_item','start_focus_session','uncomplete_habit','unequip_item','use_streak_revive'
  ] loop
    execute (select string_agg(format('grant execute on function %s to authenticated', p.oid::regprocedure), '; ')
             from pg_proc p where p.pronamespace='public'::regnamespace and p.proname=f);
  end loop;
end $$;

-- public profile pages + password-gated admin panel are used without a Supabase session
do $$
declare f text;
begin
  foreach f in array array[
    'get_public_profile','admin_authenticate','admin_ban_user','admin_get_user_detail',
    'admin_grant_gems','admin_list_users','admin_stats','admin_update_user'
  ] loop
    execute (select string_agg(format('grant execute on function %s to anon, authenticated', p.oid::regprocedure), '; ')
             from pg_proc p where p.pronamespace='public'::regnamespace and p.proname=f);
  end loop;
end $$;

-- future functions are private by default
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

alter function public.handle_updated_at() set search_path = '';

-- ---------- 2. TABLES ----------
revoke all on all tables in schema public from anon;
grant select on public.shop_items, public.loot_boxes, public.loot_box_drop_table to anon;

revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
revoke all on public.abuse_signals, public.admin_auth from authenticated;
-- the only direct writes the client performs
grant update on public.users to authenticated;
grant insert, update, delete on public.habits to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;

-- ---------- 3. PROTECTED COLUMNS ----------
create or replace function public.protect_user_columns()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- INVOKER on purpose: in a SECURITY DEFINER function current_user is always the owner,
  -- which would make this check a no-op. As invoker it sees 'authenticated' for direct
  -- client writes and the owner role inside server RPCs.
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
    then
      raise exception 'Protected column: this field is server-managed and cannot be set directly';
    end if;
  end if;
  return NEW;
end $$;
revoke execute on function public.protect_user_columns() from public, anon, authenticated;

-- ---------- 4. ANTI-FARMING + INPUT LIMITS ----------
create or replace function public.limit_habits_per_user()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.habits where user_id = NEW.user_id) >= 40 then
    raise exception 'Habit limit reached (40)';
  end if;
  return NEW;
end $$;
revoke execute on function public.limit_habits_per_user() from public, anon, authenticated;
drop trigger if exists habits_limit_per_user on public.habits;
create trigger habits_limit_per_user before insert on public.habits
  for each row execute function public.limit_habits_per_user();

alter table public.habits
  add constraint habits_name_len check (char_length(habit_name) between 1 and 100) not valid,
  add constraint habits_desc_len check (description is null or char_length(description) <= 500) not valid;
alter table public.users
  add constraint users_name_len check (char_length(coalesce(first_name,'')) <= 50 and char_length(coalesce(last_name,'')) <= 50) not valid,
  add constraint users_notif_size check (pg_column_size(notification_settings) <= 2048) not valid;
