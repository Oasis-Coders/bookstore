-- Standalone categories table so categories can be managed before any book uses them.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Backfill from existing books.category values
insert into public.categories (name)
select distinct trim(category) from public.books
where category is not null and trim(category) <> ''
on conflict (name) do nothing;

alter table public.categories enable row level security;

create policy categories_select on public.categories
  for select to authenticated using (true);
create policy categories_insert on public.categories
  for insert to authenticated
  with check (public.has_any_role(array['staff','admin','super_admin']));
create policy categories_update on public.categories
  for update to authenticated
  using (public.has_any_role(array['staff','admin','super_admin']))
  with check (public.has_any_role(array['staff','admin','super_admin']));
create policy categories_delete on public.categories
  for delete to authenticated
  using (public.has_any_role(array['staff','admin','super_admin']));

grant select, insert, update, delete on public.categories to authenticated;
