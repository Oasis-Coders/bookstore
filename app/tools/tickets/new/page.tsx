import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { TicketNewClient } from './ticket-new-client';
import { isTicketAdmin } from '../actions';

export default async function TicketNewPage() {
  const ok = await isTicketAdmin();
  return (
    <AppShell title="New ticket" titleZh="新建工单" eyebrow="Tickets">
      {ok ? (
        <TicketNewClient />
      ) : (
        <Card className="p-8 text-center text-[13px] text-[#5b5f94]">问题申报仅对管理员开放</Card>
      )}
    </AppShell>
  );
}
