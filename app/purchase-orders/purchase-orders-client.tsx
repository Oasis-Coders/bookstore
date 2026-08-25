'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/app-shell';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';

const statusColor: Record<string, 'default' | 'active' | 'warning' | 'danger'> = {
  draft: 'default',
  approved: 'warning',
  ordered: 'warning',
  partially_received: 'active',
  received: 'active',
  cancelled: 'danger',
};

export function PurchaseOrdersClient({ pos }: { pos: any[] }) {
  const { tt } = useT();

  const statusZh: Record<string, string> = {
    draft: tt('purchaseOrders.draft'),
    approved: tt('purchaseOrders.approved'),
    ordered: tt('purchaseOrders.ordered'),
    partially_received: tt('purchaseOrders.partial'),
    received: tt('purchaseOrders.received'),
    cancelled: tt('purchaseOrders.cancelled'),
  };

  return (
    <AppShell
      title={tt('purchaseOrders.title')}
      titleZh={tt('purchaseOrders.title')}
      eyebrow={tt('purchaseOrders.count', { n: pos.length })}
      actions={<Button>{tt('purchaseOrders.newPO')}</Button>}
    >
      <Card>
        <div className="flex flex-wrap gap-2 text-[12px] text-[#4f7a5c]">
          <span>{tt('purchaseOrders.statusFlow')}</span>
          <Badge>{tt('purchaseOrders.draft')} draft</Badge>→<Badge variant="warning">{tt('purchaseOrders.approved')} approved</Badge>→<Badge variant="warning">{tt('purchaseOrders.ordered')} ordered</Badge>→
          <Badge variant="active">{tt('purchaseOrders.partial')}</Badge>→<Badge variant="active">{tt('purchaseOrders.received')} received</Badge>
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        {pos.map((po) => (
          <Card key={po.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[13px] font-semibold">{po.po_number}</p>
              <p className="text-[12px] text-[#4f7a5c]">
                {po.suppliers?.name_zh} • {po.order_date} • {formatCurrency(Number(po.subtotal || 0))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusColor[po.status] || 'default'}>{statusZh[po.status] || po.status}</Badge>
              <Button variant="ghost" size="sm">{tt('common.details')}</Button>
              {(po.status === 'approved' || po.status === 'ordered' || po.status === 'partially_received') && (
                <Button size="sm">{tt('purchaseOrders.receiveAction')}</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>{tt('purchaseOrders.differentCostTitle')}</CardTitle>
          <p className="mt-2 text-[13px] leading-relaxed text-[#0f3d2e]/80">{tt('purchaseOrders.differentCostDesc')}</p>
          <pre className="mt-3 overflow-auto rounded-[12px] bg-[#faf6ee] p-3 text-[11px]">
            {`-- Receive
select apply_purchase_receipt(
  '<PO_UUID>', '<STORE_UUID>',
  '[{"purchase_order_line_id":"<line>","quantity":10}]'
);

-- Same book second purchase, different unit_cost, auto new batch`}
          </pre>
        </Card>
        <Card>
          <CardTitle>{tt('purchaseOrders.receiveTitle')}</CardTitle>
          <p className="mt-2 text-[13px] text-[#4f7a5c]">{tt('purchaseOrders.receiveDesc')}</p>
          <ul className="mt-2 list-disc pl-4 text-[12px] text-[#0f3d2e]/80">
            <li>{tt('purchaseOrders.receive1')}</li>
            <li>{tt('purchaseOrders.receive2')}</li>
            <li>{tt('purchaseOrders.receive3')}</li>
            <li>{tt('purchaseOrders.receive4')}</li>
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
