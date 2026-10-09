import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { TicketDetailClient } from './ticket-detail-client';
import { isTicketAdmin } from '../actions';

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await isTicketAdmin();
  return (
    <AppShell title="Ticket" titleZh="工单详情" eyebrow="Tickets">
      {ok ? (
        <TicketDetailClient ticketId={id} />
      ) : (
        <Card className="p-8 text-center text-[13px] text-[#5b5f94]">问题申报仅对管理员开放</Card>
      )}
    </AppShell>
  );
}
