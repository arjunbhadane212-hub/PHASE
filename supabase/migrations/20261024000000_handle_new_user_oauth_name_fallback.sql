-- Google (and other OAuth) signups put the name under full_name / name /
-- given_name / family_name instead of the first_name / last_name keys the
-- email signup form sends. Fall back to those so an OAuth user lands with a
-- real name on their profile. Email signups behave exactly as before.
-- Applied to production 2026-10-23.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full text := nullif(trim(coalesce(m->>'full_name', m->>'name')), '');
  v_first text := nullif(trim(coalesce(m->>'first_name', m->>'given_name', split_part(v_full, ' ', 1))), '');
  v_last text := nullif(trim(coalesce(m->>'last_name', m->>'family_name', nullif(regexp_replace(v_full, '^\S+\s*', ''), ''))), '');
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
