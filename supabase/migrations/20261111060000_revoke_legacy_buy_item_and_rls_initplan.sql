-- 1. Legacy pre-relational purchase RPC: unused by every frontend branch and it
--    bypassed the shop rotation + row locks in purchase_shop_item.
revoke execute on function public.buy_item(uuid) from public, anon, authenticated;

-- 2. Scale fix (Supabase advisor 0003 auth_rls_initplan): evaluate
--    auth.uid()/role()/jwt() once per query instead of once per row by wrapping
--    in a scalar subquery. Pure rewrite of every public policy; semantics unchanged.
do $$
declare p record; v_using text; v_check text; stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual,'') ~ 'auth\.(uid|role|jwt)\(\)' or coalesce(with_check,'') ~ 'auth\.(uid|role|jwt)\(\)')
  loop
    v_using := case when p.qual is null then null
      else regexp_replace(regexp_replace(p.qual, '\(\s*select\s+auth\.(uid|role|jwt)\(\)\s+as\s+\w+\s*\)', 'auth.\1()', 'gi'),
                          'auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g') end;
    v_check := case when p.with_check is null then null
      else regexp_replace(regexp_replace(p.with_check, '\(\s*select\s+auth\.(uid|role|jwt)\(\)\s+as\s+\w+\s*\)', 'auth.\1()', 'gi'),
                          'auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g') end;
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if v_using is not null then stmt := stmt || format(' using (%s)', v_using); end if;
    if v_check is not null then stmt := stmt || format(' with check (%s)', v_check); end if;
    execute stmt;
  end loop;
end $$;
