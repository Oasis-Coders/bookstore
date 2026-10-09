-- 问题申报（ticket）系统：admin+ 可见。工单 + 聊天式消息 thread，agent 自动跟进处理。
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  number integer generated always as identity,
  title text not null,
  kind text not null default 'bug' check (kind in ('bug', 'feature', 'other')),
  description text not null default '',
  status text not null default 'submitted'
    check (status in ('submitted', 'in_progress', 'review', 'blocked', 'closed')),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agent_seen_at timestamptz not null default now()
);

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_type text not null check (author_type in ('user', 'agent')),
  author_id uuid references auth.users (id),
  author_name text not null default '',
  body text not null default '',
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

-- updated_at 自动维护
create or replace function public.tickets_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists tickets_touch_updated_at on public.tickets;
create trigger tickets_touch_updated_at
  before update on public.tickets
  for each row execute function public.tickets_touch_updated_at();

alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;

-- 仅 admin / super_admin 可见可操作
create policy tickets_admin_all on public.tickets
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy ticket_messages_admin_all on public.ticket_messages
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

grant select, insert, update, delete on public.tickets to authenticated;
grant select, insert, update, delete on public.ticket_messages to authenticated;

-- 截图存储桶（公开读，admin+ 可写）
insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', true)
on conflict (id) do nothing;

create policy "ticket-attachments admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ticket-attachments'
    and public.has_any_role(array['admin', 'super_admin']));
create policy "ticket-attachments admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ticket-attachments'
    and public.has_any_role(array['admin', 'super_admin']));
create policy "ticket-attachments admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ticket-attachments'
    and public.has_any_role(array['admin', 'super_admin']));
