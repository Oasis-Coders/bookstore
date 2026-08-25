alter table public.profiles add column if not exists email text;
-- Backfill from auth.users
update public.profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;
-- Update handle_new_user to store email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_role_id uuid;
  v_count int;
begin
  insert into public.profiles(id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email), new.email)
  on conflict (id) do update set email = excluded.email, display_name = coalesce(public.profiles.display_name, excluded.display_name);

  select count(*) into v_count from public.user_roles;
  
  if v_count = 0 then
    select id into v_role_id from public.roles where name = 'super_admin' limit 1;
  else
    select id into v_role_id from public.roles where name = 'staff' limit 1;
  end if;

  if v_role_id is not null then
    insert into public.user_roles(user_id, role_id)
    values (new.id, v_role_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;
