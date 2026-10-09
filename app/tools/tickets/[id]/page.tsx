import { AppShell } from '@/components/layout/app-shell';
import { TicketDetailClient } from './ticket-detail-client';

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell title="Ticket" titleZh="工单详情" eyebrow="Tickets">
      <TicketDetailClient ticketId={id} />
    </AppShell>
  );
}
