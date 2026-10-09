import { AppShell } from '@/components/layout/app-shell';
import { TicketsClient } from './tickets-client';

/** 问题申报：admin+ 可见，agent 自动跟进处理 */
export default function TicketsPage() {
  return (
    <AppShell title="Tickets" titleZh="问题申报" eyebrow="Tickets">
      <TicketsClient />
    </AppShell>
  );
}
