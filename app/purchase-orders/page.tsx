import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

export default async function PurchaseOrdersPage() {
  const supabase = await createSupabaseServerClient();
  let pos: any[] = [];
  let mode: 'demo' | 'live' = 'demo';

  if (supabase) {
    try {
      const { data } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name_zh, code)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        pos = data;
        mode = 'live';
      }
    } catch {}
  }

  if (mode === 'demo' && pos.length === 0) {
    pos = [
      { id: '1', po_number: 'PO-20250825-001', status: 'approved', subtotal: 256.5, suppliers: { name_zh: '以琳书房供应' }, order_date: '2025-08-20' },
      { id: '2', po_number: 'PO-20250825-002', status: 'partially_received', subtotal: 89.9, suppliers: { name_zh: '福音出版社' }, order_date: '2025-08-22' },
      { id: '3', po_number: 'PO-20250825-003', status: 'draft', subtotal: 120.0, suppliers: { name_zh: '以琳书房供应' }, order_date: '2025-08-25' },
    ];
  }

  const statusColor: Record<string, 'default' | 'active' | 'warning' | 'danger'> = {
    draft: 'default',
    approved: 'warning',
    ordered: 'warning',
    partially_received: 'active',
    received: 'active',
    cancelled: 'danger',
  };

  const statusZh: Record<string, string> = {
    draft: '草稿',
    approved: '已批准',
    ordered: '已下单',
    partially_received: '部分收货',
    received: '已收货',
    cancelled: '已取消',
  };

  return (
    <AppShell
      title="Purchase Orders"
      titleZh="采购单"
      eyebrow={`${pos.length} 张单据`}
      actions={<Button>+ 新建采购单</Button>}
    >
      <Card>
        <div className="flex flex-wrap gap-2 text-[12px] text-[#4f7a5c]">
          <span>状态流：</span>
          <Badge>草稿 draft</Badge>→<Badge variant="warning">已批准 approved</Badge>→<Badge variant="warning">已下单 ordered</Badge>→
          <Badge variant="active">部分收货</Badge>→<Badge variant="active">已收货 received</Badge>
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
              <Button variant="ghost" size="sm">详情</Button>
              {(po.status === 'approved' || po.status === 'ordered' || po.status === 'partially_received') && (
                <Button size="sm">收货</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>同书不同批次进价</CardTitle>
          <p className="mt-2 text-[13px] leading-relaxed text-[#0f3d2e]/80">
            同一本《活水得胜之路》2 月进价 £5.20，5 月进价 £5.80，系统会保留两条批次。
            销售时 FIFO 先扣 2 月那批，成本准确，会计对账清晰。
          </p>
          <pre className="mt-3 overflow-auto rounded-[12px] bg-[#faf6ee] p-3 text-[11px]">
            {`-- 收货时
select apply_purchase_receipt(
  '<PO_UUID>', '<STORE_UUID>',
  '[{"purchase_order_line_id":"<行>","quantity":10}]'
);

-- 同书第二次进货，unit_cost 不同，自动新批次`}
          </pre>
        </Card>
        <Card>
          <CardTitle>一键收货</CardTitle>
          <p className="mt-2 text-[13px] text-[#4f7a5c]">
            在 PO 详情页点「收货」→ 选库位 → 输入实收数量 → 系统原子操作：
          </p>
          <ul className="mt-2 list-disc pl-4 text-[12px] text-[#0f3d2e]/80">
            <li>更新 PO 行已收数量</li>
            <li>建立 inventory_batches 批次（保留 unit_cost）</li>
            <li>写入不可变 inventory_transactions 流水</li>
            <li>自动计算 PO 状态 → partially_received / received</li>
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
