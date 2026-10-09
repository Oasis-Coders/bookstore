import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { TicketsClient } from './tickets-client';
import { isTicketAdmin } from './actions';

/** 问题申报：admin+ 可见，agent 自动跟进处理 */
export default async function TicketsPage() {
  const ok = await isTicketAdmin();
  return (
    <AppShell title="Tickets" titleZh="问题申报" eyebrow="Tickets">
      {ok ? (
        <TicketsClient />
      ) : (
        <Card className="p-8 text-center text-[13px] text-[#5b5f94]">问题申报仅对管理员开放</Card>
      )}
    </AppShell>
  );
}
