-- Admin dashboard: repoint from the retired Mongo/FastAPI backend to Supabase.
--
-- Context: AdminPage.js used to call a FastAPI backend (backend/server.py)
-- that talked to MongoDB via REACT_APP_BACKEND_URL. That backend is no longer
-- part of the live stack (the rest of the app already talks to Supabase
-- directly via supabase-js RPCs), so admin actions silently did nothing to
-- real user data. This migration adds a small, self-contained admin surface
-- entirely inside Postgres so AdminPage.js can be repointed to `supabase.rpc(...)`.
--
-- Design notes:
--   * A single-row `admin_auth` table holds a bcrypt hash of the admin
--     password (via pgcrypto) plus a basic failed-attempt lockout. RLS is
--     enabled with NO policies, so neither `anon` nor `authenticated` can
--     read/write it directly -- only SECURITY DEFINER functions (owned by
--     the migration role) can touch it, mirroring the `abuse_signals`
--     lock-out-everyone pattern already used elsewhere in this project.
--   * Every admin_* function takes the password as its first argument and
--     calls `_admin_check()` before doing anything. This mirrors the
--     existing ADMIN_SECRET-header pattern from the old backend, just
--     re-homed into Postgres.
--   * Banning is two-layer: `public.users.banned_at` (already existed, used
--     by the leaderboard/eligibility logic) for in-app checks, AND
--     `auth.users.banned_until` (native Supabase Auth column) so a banned
--     user can no longer log in or refresh their session at all -- this is
--     what actually makes them "gone from the app", not just hidden from
--     leaderboards.
--   * These functions are exposed to `anon` because AdminPage.js is a
--     password-gated page, not a signed-in Supabase Auth session -- same
--     shape as the rest of this project's already-anon-executable
--     SECURITY DEFINER RPCs (see security advisors). The password check +
--     lockout is the actual gate.

create table if not exists public.admin_auth (
  id boolean primary key default true,
  password_hash text not null,
  fail_count integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint admin_auth_singleton check (id)
);

alter table public.admin_auth enable row level security;
-- No policies at all => zero access for anon/authenticated. Only
-- SECURITY DEFINER functions below (and the Supabase dashboard/service
-- role) can read or write this table.

insert into public.admin_auth (id, password_hash)
values (true, extensions.crypt('u615yAuSjqnnJuTeqKY9', extensions.gen_salt('bf')))
on conflict (id) do nothing;

-- ================= internal password check (not exposed directly) =================
create or replace function public._admin_check(p_password text)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_row public.admin_auth%rowtype;
begin
  select * into v_row from public.admin_auth where id = true;
  if not found then
    raise exception 'Admin not configured';
  end if;

  if v_row.locked_until is not null and v_row.locked_until > now() then
    raise exception 'Too many failed attempts. Try again in a few minutes.';
  end if;

  if p_password is null or extensions.crypt(p_password, v_row.password_hash) <> v_row.password_hash then
    update public.admin_auth
      set fail_count = fail_count + 1,
          locked_until = case when fail_count + 1 >= 10 then now() + interval '15 minutes' else locked_until end,
          updated_at = now()
      where id = true;
    raise exception 'Invalid admin password';
  end if;

  update public.admin_auth set fail_count = 0, locked_until = null, updated_at = now() where id = true;
end;
$$;

revoke all on function public._admin_check(text) from public;

-- ================= admin_authenticate =================
create or replace function public.admin_authenticate(p_password text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
begin
  perform public._admin_check(p_password);
  return true;
end;
$$;

revoke all on function public.admin_authenticate(text) from public;
grant execute on function public.admin_authenticate(text) to anon, authenticated;

-- ================= admin_stats =================
create or replace function public.admin_stats(p_password text)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_result json;
begin
  perform public._admin_check(p_password);

  select json_build_object(
    'total_users', (select count(*) from public.users),
    'banned_users', (select count(*) from public.users where banned_at is not null),
    'active_today', (select count(distinct user_id) from public.habit_completions where completed_date = current_date),
    'total_habits', (select count(*) from public.habits),
    'total_completions', (select coalesce(sum(total_habits_completed), 0) from public.users),
    'top_xp', (select coalesce(json_agg(t), '[]'::json) from (
      select email, username, total_xp_all_time from public.users
      order by total_xp_all_time desc nulls last limit 10) t),
    'top_streaks', (select coalesce(json_agg(t), '[]'::json) from (
      select email, username, longest_streak_ever, current_streak from public.users
      order by longest_streak_ever desc nulls last limit 10) t),
    'top_gems', (select coalesce(json_agg(t), '[]'::json) from (
      select email, username, gems from public.users
      order by gems desc nulls last limit 10) t)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_stats(text) from public;
grant execute on function public.admin_stats(text) to anon, authenticated;

-- ================= admin_list_users =================
create or replace function public.admin_list_users(p_password text, p_query text default '')
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_result json;
  v_q text := nullif(trim(p_query), '');
begin
  perform public._admin_check(p_password);

  select coalesce(json_agg(t), '[]'::json) into v_result from (
    select id, email, username, first_name, last_name, gems, xp, current_xp, rank,
           current_streak, longest_streak_ever, total_habits_completed, is_pro,
           banned_at, app_mode, created_at
    from public.users
    where v_q is null
       or email ilike '%'||v_q||'%'
       or username ilike '%'||v_q||'%'
       or first_name ilike '%'||v_q||'%'
       or last_name ilike '%'||v_q||'%'
    order by created_at desc
    limit 100
  ) t;

  return v_result;
end;
$$;

revoke all on function public.admin_list_users(text, text) from public;
grant execute on function public.admin_list_users(text, text) to anon, authenticated;

-- ================= admin_grant_gems (the "give somebody gems" one-click action) =================
create or replace function public.admin_grant_gems(p_password text, p_user_id uuid, p_amount integer)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_new_gems integer;
begin
  perform public._admin_check(p_password);

  if p_amount = 0 then
    raise exception 'Amount must be non-zero';
  end if;

  update public.users
    set gems = greatest(0, gems + p_amount), updated_at = now()
    where id = p_user_id
    returning gems into v_new_gems;

  if not found then
    raise exception 'User not found';
  end if;

  return json_build_object('user_id', p_user_id, 'gems', v_new_gems);
end;
$$;

revoke all on function public.admin_grant_gems(text, uuid, integer) from public;
grant execute on function public.admin_grant_gems(text, uuid, integer) to anon, authenticated;

-- ================= admin_update_user (the full edit-modal fields) =================
create or replace function public.admin_update_user(p_password text, p_user_id uuid, p_fields json)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
begin
  perform public._admin_check(p_password);

  update public.users set
    gems                   = coalesce((p_fields->>'gems')::integer, gems),
    xp                     = coalesce((p_fields->>'xp')::integer, xp),
    current_xp             = coalesce((p_fields->>'current_xp')::integer, current_xp),
    rank                   = coalesce((p_fields->>'rank')::integer, rank),
    current_streak         = coalesce((p_fields->>'current_streak')::integer, current_streak),
    longest_streak_ever    = coalesce((p_fields->>'longest_streak_ever')::integer, longest_streak_ever),
    total_habits_completed = coalesce((p_fields->>'total_habits_completed')::integer, total_habits_completed),
    streak_shields         = coalesce((p_fields->>'streak_shields')::integer, streak_shields),
    streak_revives         = coalesce((p_fields->>'streak_revives')::integer, streak_revives),
    is_pro                 = coalesce((p_fields->>'is_pro')::boolean, is_pro),
    app_mode               = coalesce(p_fields->>'app_mode', app_mode),
    updated_at             = now()
  where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;

  return json_build_object('user_id', p_user_id, 'updated', true);
end;
$$;

revoke all on function public.admin_update_user(text, uuid, json) from public;
grant execute on function public.admin_update_user(text, uuid, json) to anon, authenticated;

-- ================= admin_ban_user (one click, gone from the app) =================
create or replace function public.admin_ban_user(p_password text, p_user_id uuid, p_banned boolean)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions', 'auth'
as $$
begin
  perform public._admin_check(p_password);

  update public.users
    set banned_at = case when p_banned then now() else null end,
        updated_at = now()
    where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;

  -- Native Supabase Auth ban: blocks login + token refresh outright, not
  -- just an in-app flag. ~100 years is GoTrue's documented convention for
  -- "indefinite" ban (there's no literal "forever" value).
  update auth.users
    set banned_until = case when p_banned then now() + interval '100 years' else null end
    where id = p_user_id;

  return json_build_object('user_id', p_user_id, 'banned', p_banned);
end;
$$;

revoke all on function public.admin_ban_user(text, uuid, boolean) from public;
grant execute on function public.admin_ban_user(text, uuid, boolean) to anon, authenticated;
