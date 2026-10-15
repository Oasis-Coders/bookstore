-- 工单系统支持多应用：bookstore 和 cocm-internal 共用 tickets 表，用 app 区分。
alter table public.tickets
  add column if not exists app text not null default 'bookstore';

comment on column public.tickets.app is
  '工单所属应用：bookstore=书库系统，internal=COCM内部系统';

-- 已有数据全部归为 bookstore
update public.tickets set app='bookstore' where app is null or app='';
