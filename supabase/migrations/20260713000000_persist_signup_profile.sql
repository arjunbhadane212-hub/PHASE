-- Phase app: persist signup identity fields (first_name, last_name, username)
-- Root cause: handle_new_user() only copied id + email, so the first/last name
-- sent as auth metadata and the (never-generated) username never reached
-- public.users. This left the dashboard greeting blank, the Settings "View
-- Public Profile" link hidden, and the public profile nameless.
--
-- Fix: generate a unique username at signup and copy the names from
-- auth metadata, plus a one-time backfill of the existing rows.

-- 1) Enforce username uniqueness (case-insensitive). Partial so existing NULLs
--    remain allowed and are treated as distinct.
create unique index if not exists users_username_lower_unique
  on public.users (lower(username))
  where username is not null;

-- 2) Username generator: sanitized base + entropy, collision-checked against
--    already-taken usernames (visible within the current transaction).
create or replace function public.generate_username(p_base text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  base text;
  candidate text;
  tries int := 0;
begin
  base := regexp_replace(lower(coalesce(p_base, '')), '[^a-z0-9]', '', 'g');
  if base is null or length(base) = 0 then
    base := 'phaser';
  end if;
  base := left(base, 20);

  loop
    if tries = 0 then
      candidate := base;                                    -- clean first try
    else
      candidate := base || floor(random() * 100000)::int::text;
    end if;

    exit when not exists (
      select 1 from public.users where lower(username) = lower(candidate)
    );

    tries := tries + 1;
    if tries > 50 then
      candidate := base || floor(random() * 1000000000)::bigint::text;
      exit;
    end if;
  end loop;

  return candidate;
end;
$$;

-- 3) Rewrite the signup trigger to persist names + a generated username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_first text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  v_last  text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
begin
  insert into public.users (id, email, first_name, last_name, username)
  values (
    new.id,
    new.email,
    v_first,
    v_last,
    public.generate_username(coalesce(v_first, split_part(new.email, '@', 1)))
  );
  return new;
end;
$$;

-- 4) One-time backfill for rows created before this fix.
--    Names come from auth metadata where present.
update public.users u
set first_name = coalesce(u.first_name, nullif(trim(a.raw_user_meta_data->>'first_name'), '')),
    last_name  = coalesce(u.last_name,  nullif(trim(a.raw_user_meta_data->>'last_name'), ''))
from auth.users a
where a.id = u.id
  and (u.first_name is null or u.last_name is null);

--    Generate usernames one row at a time so each sees the prior assignments.
do $$
declare r record;
begin
  for r in select id, first_name, email from public.users where username is null loop
    update public.users
      set username = public.generate_username(coalesce(r.first_name, split_part(r.email, '@', 1)))
      where id = r.id;
  end loop;
end $$;
