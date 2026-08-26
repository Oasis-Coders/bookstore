import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PurchaseOrdersClient } from './purchase-orders-client';

export default async function PurchaseOrdersPage() {
  const supabase = await createSupabaseServerClient();
  let pos: any[] = [];

  if (supabase) {
    try {
      const { data } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name_zh, code)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) pos = data;
    } catch {}
  }

  return <PurchaseOrdersClient pos={pos} />;
}
