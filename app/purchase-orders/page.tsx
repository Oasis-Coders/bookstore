import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PurchaseOrdersClient } from './purchase-orders-client';

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

  return <PurchaseOrdersClient pos={pos} />;
}
