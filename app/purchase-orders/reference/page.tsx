import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReferenceClient } from './reference-client';

function shiftDay(d: string, delta: number) {
  const dt = new Date(d + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export default async function PurchaseReferencePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; supplier?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getUTCFullYear();
  const from = sp.from || `${year}-01-01`;
  const to = sp.to || today;
  const supplierId = sp.supplier && sp.supplier !== 'all' ? sp.supplier : null;

  const supabase = await createSupabaseServerClient();
  let suppliers: any[] = [];
  let rows: any[] = [];

  if (supabase) {
    const { data: supData } = await supabase
      .from('suppliers')
      .select('id, code, name_zh, name_en')
      .eq('is_active', true)
      .order('name_zh');
    suppliers = supData || [];

    // Books of the selected supplier are matched by publisher name
    // (suppliers are auto-created from publisher names on import).
    let supplierNames: string[] = [];
    if (supplierId) {
      const s = suppliers.find((x) => x.id === supplierId);
      if (s) supplierNames = [s.name_zh, s.name_en].filter(Boolean);
    }

    const { data: books } = await supabase
      .from('books')
      .select('id, sku, title, current_price, publisher')
      .eq('is_active', true)
      .order('sku')
      .limit(5000);
    const bookList = (books || []).filter(
      (b) => !supplierId || (b.publisher && supplierNames.includes(b.publisher))
    );
    const bookIdSet = new Set(bookList.map((b) => b.id));

    // Current stock per book
    const stockMap = new Map<string, number>();
    const { data: inv } = await supabase
      .from('current_inventory_view')
      .select('book_id, quantity_on_hand')
      .limit(20000);
    for (const r of inv || []) {
      if (!bookIdSet.has(r.book_id)) continue;
      stockMap.set(r.book_id, (stockMap.get(r.book_id) || 0) + Number(r.quantity_on_hand || 0));
    }

    // Opening stock = qty at end of the day before `from`
    const openMap = new Map<string, number>();
    try {
      const { data: openRows } = await supabase.rpc('inventory_qty_at', { p_as_of: shiftDay(from, -1) });
      for (const r of openRows || []) {
        if (!bookIdSet.has(r.book_id)) continue;
        openMap.set(r.book_id, Number(r.qty_on_hand || 0));
      }
    } catch {}

    // Purchased (received) in period, optionally from one supplier
    const purchMap = new Map<string, number>();
    let poIds: string[] | null = null;
    if (supplierId) {
      const { data: pos } = await supabase.from('purchase_orders').select('id').eq('supplier_id', supplierId);
      poIds = (pos || []).map((p) => p.id);
    }
    if (!supplierId || (poIds && poIds.length > 0)) {
      let txQuery = supabase
        .from('inventory_transactions')
        .select('book_id, quantity, reference_id')
        .eq('transaction_type', 'purchase_receipt')
        .eq('reference_type', 'purchase_order')
        .gte('occurred_at', from)
        .lt('occurred_at', shiftDay(to, 1))
        .limit(20000);
      if (poIds) txQuery = txQuery.in('reference_id', poIds);
      const { data: ptx } = await txQuery;
      for (const r of ptx || []) {
        if (!bookIdSet.has(r.book_id)) continue;
        purchMap.set(r.book_id, (purchMap.get(r.book_id) || 0) + Number(r.quantity || 0));
      }
    }

    // Sold in period (completed sales)
    const soldMap = new Map<string, number>();
    const { data: slines } = await supabase
      .from('sales_transaction_lines')
      .select('book_id, quantity, sales_transactions!inner(sale_date, status)')
      .gte('sales_transactions.sale_date', from)
      .lte('sales_transactions.sale_date', to)
      .eq('sales_transactions.status', 'completed')
      .limit(20000);
    for (const r of slines || []) {
      if (!bookIdSet.has(r.book_id)) continue;
      soldMap.set(r.book_id, (soldMap.get(r.book_id) || 0) + Number(r.quantity || 0));
    }

    rows = bookList.map((b) => ({
      book_id: b.id,
      sku: b.sku,
      title: b.title,
      price: Number(b.current_price || 0),
      opening: openMap.get(b.id) || 0,
      purchased: purchMap.get(b.id) || 0,
      sold: soldMap.get(b.id) || 0,
      current: stockMap.get(b.id) || 0,
    }));
  }

  return (
    <ReferenceClient
      rows={rows}
      suppliers={suppliers}
      initialFilters={{ from, to, supplier: supplierId || 'all' }}
    />
  );
}
