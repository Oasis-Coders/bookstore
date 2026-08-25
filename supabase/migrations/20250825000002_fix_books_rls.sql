-- Fix: allow staff to maintain books/suppliers/locations
-- Original policy only allowed admin/super_admin, causing "new row violates RLS" for staff users
-- Also ensure staff can be auto-assigned if no role exists

do $$
declare t text;
begin
  foreach t in array array['suppliers','books','locations'] loop
    execute format('drop policy if exists admin_insert on public.%I', t);
    execute format('drop policy if exists admin_update on public.%I', t);
    execute format('drop policy if exists admin_delete on public.%I', t);
    execute format('create policy admin_insert on public.%I for insert to authenticated with check (public.has_any_role(array[''staff'',''admin'',''super_admin'']))', t);
    execute format('create policy admin_update on public.%I for update to authenticated using (public.has_any_role(array[''staff'',''admin'',''super_admin''])) with check (public.has_any_role(array[''staff'',''admin'',''super_admin'']))', t);
    execute format('create policy admin_delete on public.%I for delete to authenticated using (public.has_any_role(array[''admin'',''super_admin'']))', t);
  end loop;
end $$;

-- Ensure auto super_admin for first user still works, plus fallback: if a user has no role, treat as staff for RLS (optional, handled by giving default role)
-- Update has_any_role to also allow users with no explicit role to be treated as staff for basic operations (safer: auto-assign staff on profile creation)

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_role_id uuid;
  v_count int;
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;

  -- Count existing roles
  select count(*) into v_count from public.user_roles;
  
  if v_count = 0 then
    -- First user = super_admin
    select id into v_role_id from public.roles where name = 'super_admin' limit 1;
  else
    -- Others = staff by default (can be upgraded by super_admin)
    select id into v_role_id from public.roles where name = 'staff' limit 1;
  end if;

  if v_role_id is not null then
    insert into public.user_roles(user_id, role_id)
    values (new.id, v_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;

  return new;
end;
$$;

-- Backfill: give staff role to existing users with no role
insert into public.user_roles(user_id, role_id)
select p.id, r.id
from public.profiles p
cross join (select id from public.roles where name='staff' limit 1) r
where not exists (select 1 from public.user_roles ur where ur.user_id = p.id)
on conflict (user_id, role_id) do nothing;
