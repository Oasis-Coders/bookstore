import { AppShell } from '@/components/layout/app-shell';
import { TicketNewClient } from './ticket-new-client';

export default function TicketNewPage() {
  return (
    <AppShell title="New ticket" titleZh="新建工单" eyebrow="Tickets">
      <TicketNewClient />
    </AppShell>
  );
}
