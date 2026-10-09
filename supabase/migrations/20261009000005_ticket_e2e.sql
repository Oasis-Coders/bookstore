-- 工单两段式验收：watcher 在分支上实现并通过自动化测试后，
-- preview 链接先由主 agent 做 browser E2E，确认通过后才发给用户验收。
alter table public.tickets
  add column if not exists e2e_status text;

comment on column public.tickets.e2e_status is
  'agent E2E 状态：pending=preview 就绪待主 agent 验收；passed=通过已发用户；failed=失败待 watcher 返修';
