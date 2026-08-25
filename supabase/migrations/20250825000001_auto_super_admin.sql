-- 让第一个注册的用户自动成为 super_admin，之后的不自动
-- 并且正确处理 display_name

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  super_admin_role_id uuid;
  is_first_user boolean;
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    updated_at = now();

  -- 如果这是第一个拥有 profile 的用户，自动给 super_admin
  select not exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where r.name = 'super_admin'
  ) into is_first_user;

  if is_first_user then
    select id into super_admin_role_id from public.roles where name = 'super_admin' limit 1;
    if super_admin_role_id is not null then
      insert into public.user_roles(user_id, role_id)
      values (new.id, super_admin_role_id)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- 确保 trigger 存在
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();
