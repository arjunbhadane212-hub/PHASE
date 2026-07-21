-- Step 4a: unequip_item RPC — clears an equipped slot.
-- equip_item has no clear path; this restores the old app's Remove/None/Default
-- behavior. SECURITY DEFINER, mirroring the established complete_habit /
-- equip_item pattern. Deletes the user_equipped row for the category and nulls
-- the mirrored users column; colors reset to the #1F2937 default (confirmed from
-- the old backend get_colors default, not guessed).

create or replace function public.unequip_item(p_category text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_category not in ('color_main','color_banner','anim','banner','effect','title') then
    raise exception 'Invalid category';
  end if;

  delete from public.user_equipped where user_id = v_user and category = p_category;

  case p_category
    when 'color_main'   then update public.users set selected_main_color   = '#1F2937' where id = v_user;
    when 'color_banner' then update public.users set selected_banner_color = '#1F2937' where id = v_user;
    when 'anim'         then update public.users set equipped_animation    = null      where id = v_user;
    when 'banner'       then update public.users set equipped_banner       = null      where id = v_user;
    when 'effect'       then update public.users set equipped_decoration   = null      where id = v_user;
    when 'title'        then update public.users set equipped_title        = null      where id = v_user;
  end case;

  return json_build_object('unequipped', p_category);
end;
$$;

grant execute on function public.unequip_item(text) to authenticated;
