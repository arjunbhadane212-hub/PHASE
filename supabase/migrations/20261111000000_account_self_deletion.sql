-- Self-service account deletion (required by Google Play and the App Store).
-- NOT YET APPLIED to production — needs owner approval.
--
-- Why: xp_events is append-only (forbid_mutation trigger) and xp_events,
-- leaderboard_memberships and abuse_signals reference public.users WITHOUT
-- ON DELETE CASCADE. So deleting any user who ever earned XP failed.
-- Used by SettingsPage "Delete account".

-- 1. Let the append-only guard step aside ONLY when delete_my_account() set a
--    transaction-local flag. Clients have SELECT-only on xp_events, so they can
--    never reach this path themselves.
create or replace function public.forbid_mutation()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'DELETE' and current_setting('phase.account_delete', true) = 'on' then
    return old;
  end if;
  raise exception 'xp_events is append-only';
end $$;

-- 2. The signed-in user deletes themselves and everything they own.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v uuid := auth.uid();
begin
  if v is null then
    raise exception 'Not authenticated';
  end if;
  perform set_config('phase.account_delete', 'on', true);
  delete from public.xp_events where user_id = v;
  delete from public.leaderboard_memberships where user_id = v;
  delete from public.abuse_signals where user_id = v;
  delete from auth.users where id = v; -- cascades to public.users and all other user tables
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
