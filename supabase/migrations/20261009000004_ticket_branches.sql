-- 工单分支预览流程：每个需要改代码的工单在独立分支实现，
-- 用户在 Vercel preview 链接验收，确认关闭后 watcher 合并到 main。
alter table public.tickets
  add column if not exists branch text,
  add column if not exists preview_url text,
  add column if not exists branch_merged boolean not null default false;

comment on column public.tickets.branch is '实现分支名，如 ticket/12-202610091700；无需改代码的工单为 NULL';
comment on column public.tickets.preview_url is 'Vercel preview 部署链接';
comment on column public.tickets.branch_merged is '分支是否已合并到 main（用户关闭后由 watcher 合并）';
