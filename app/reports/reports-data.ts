import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  buildPublisherReportRows,
  distinctPublishers,
  type PublisherReportBook,
  type PublisherReportValuation,
} from './publisher-report-utils';

export type SupabaseLike = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

export function shiftDay(d: string, delta: number) {
  const dt = new Date(d + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export function getMonthRange(month?: string) {
  const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthStart = `${targetMonth}-01`;
  const d = new Date(`${targetMonth}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  const monthEnd = d.toISOString().slice(0, 10);
  return { targetMonth, monthStart, monthEnd };
}

export async function fetchInventoryOverview(supabase: SupabaseLike) {
  const [vRes, lRes] = await Promise.all([
    supabase.from('inventory_valuation_view').select('*').order('sku', { ascending: true }).limit(5000),
    supabase.from('low_stock_view').select('*').limit(100),
  ]);
  const valuation: any[] = vRes.data && vRes.data.length > 0 ? vRes.data : [];
  const lowStock: any[] = lRes.data || [];
  const currentInventoryValue = valuation.reduce((s: number, r: any) => s + Number(r.inventory_value || 0), 0);
  const mode: 'live' | 'empty' = valuation.length > 0 ? 'live' : 'empty';
  return { valuation, lowStock, currentInventoryValue, mode };
}

export async function fetchMonthlyFinancialData(
  supabase: SupabaseLike,
  targetMonth: string,
  monthStart: string,
  monthEnd: string,
  currentInventoryValuePromise?: Promise<number> | number
) {
  let autoOpeningStock: number | null = null;
  let autoClosingStock: number | null = null;
  let monthlyFinancial: any = null;

  const prevEnd = shiftDay(monthStart, -1);
  const nowMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = targetMonth === nowMonth;

  // Run independent RPCs and view query in parallel instead of sequentially
  const [openRes, closeRes, finViewRes] = await Promise.all([
    Promise.resolve(supabase.rpc('inventory_value_at', { p_as_of: prevEnd })).catch(() => ({ data: null })),
    isCurrentMonth
      ? Promise.resolve(currentInventoryValuePromise ?? 0).then(
          (val) => ({ data: val }),
          () => ({ data: null })
        )
      : Promise.resolve(supabase.rpc('inventory_value_at', { p_as_of: monthEnd })).catch(() => ({ data: null })),
    Promise.resolve(
      supabase.from('monthly_financial_view').select('*').eq('month_start', monthStart).maybeSingle()
    ).catch(() => ({ data: null })),
  ]);

  if (openRes?.data != null) autoOpeningStock = Number(openRes.data);
  if (closeRes?.data != null) autoClosingStock = Number(closeRes.data);

  if (finViewRes?.data) {
    monthlyFinancial = finViewRes.data;
  } else {
    try {
      const currentInventoryValue = await Promise.resolve(currentInventoryValuePromise ?? 0);
      const [salesInMonth, cogsQuery, poQuery, snapRes, prevSnapRes] = await Promise.all([
        supabase
          .from('sales_transactions')
          .select('subtotal, discount_amount, shipping_cost')
          .gte('sale_date', monthStart)
          .lte('sale_date', monthEnd)
          .eq('status', 'completed'),
        supabase
          .from('sales_transaction_lines')
          .select('cost_of_goods_sold, sales_transactions!inner(sale_date, status)')
          .gte('sales_transactions.sale_date', monthStart)
          .lte('sales_transactions.sale_date', monthEnd),
        supabase
          .from('purchase_orders')
          .select('id, subtotal')
          .gte('order_date', monthStart)
          .lte('order_date', monthEnd)
          .neq('status', 'draft')
          .neq('status', 'cancelled'),
        supabase.from('monthly_stock_snapshots').select('*').eq('month_start', monthStart).maybeSingle(),
        supabase
          .from('monthly_stock_snapshots')
          .select('closing_stock')
          .lt('month_start', monthStart)
          .order('month_start', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const salesTotal = (salesInMonth.data || []).reduce(
        (s: number, r: any) => s + Number(r.subtotal || 0) - Number(r.discount_amount || 0) + Number(r.shipping_cost || 0),
        0
      );
      const cogsTotal = ((cogsQuery.data || []) as any[]).reduce(
        (s: number, r: any) => s + Number(r.cost_of_goods_sold || 0),
        0
      );

      let purchasesTotal = 0;
      if (poQuery.data && poQuery.data.length > 0) {
        const poIds = poQuery.data.map((p: any) => p.id);
        const linesQuery = await supabase
          .from('purchase_order_lines')
          .select('quantity_ordered, unit_cost')
          .in('purchase_order_id', poIds);
        purchasesTotal = (linesQuery.data || []).reduce(
          (s: number, l: any) => s + Number(l.quantity_ordered || 0) * Number(l.unit_cost || 0),
          0
        );
      }

      monthlyFinancial = {
        month_start: monthStart,
        month_end: monthEnd,
        sales_total: salesTotal,
        cogs_total: cogsTotal,
        purchases_total: purchasesTotal,
        opening_stock:
          snapRes.data?.opening_stock ?? prevSnapRes.data?.closing_stock ?? autoOpeningStock ?? currentInventoryValue,
        closing_stock: snapRes.data?.closing_stock ?? currentInventoryValue,
        order_count: (salesInMonth.data || []).length,
      };
    } catch {}
  }

  return { monthlyFinancial, autoOpeningStock, autoClosingStock };
}

export async function fetchSalesRangeData(
  supabase: SupabaseLike,
  filters: { from?: string; to?: string; payFilter?: string | null; payStatusFilter?: string | null }
) {
  const { from, to, payFilter, payStatusFilter } = filters;
  let salesList: any[] = [];
  let salesBooksList: any[] = [];

  if (!from && !to) {
    return { salesList, salesBooksList };
  }

  let profileMap: Record<string, string> = {};

  try {
    let query = supabase
      .from('sales_transactions')
      .select(
        'id, sale_number, sale_date, sold_at, payment_method, payment_status, subtotal, discount_amount, shipping_cost, customer_name, status, created_by'
      )
      .order('sale_number', { ascending: true });
    if (from) query = query.gte('sale_date', from);
    if (to) query = query.lte('sale_date', to);
    if (payFilter) query = query.eq('payment_method', payFilter);
    if (payStatusFilter) query = query.eq('payment_status', payStatusFilter);
    const { data } = await query.limit(2000);

    if (data && data.length > 0) {
      const ids = [...new Set((data as any[]).map((s) => s.created_by).filter(Boolean))];
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', ids);
        if (profs) {
          for (const p of profs as any[]) profileMap[p.id] = p.display_name;
        }
      }
    }
    salesList = (data || []).map((s: any) => ({
      ...s,
      net_total: Number(s.subtotal || 0) - Number(s.discount_amount || 0) + Number(s.shipping_cost || 0),
      created_by_name: profileMap[s.created_by] || s.created_by?.slice(0, 8) || '-',
      staff_name: profileMap[s.created_by] || '-',
    }));
  } catch {
    try {
      let q2 = supabase
        .from('sales_transactions')
        .select(
          'id, sale_number, sale_date, sold_at, payment_method, payment_status, subtotal, discount_amount, shipping_cost, customer_name, status, created_by, profiles(display_name)'
        )
        .order('sale_number', { ascending: true });
      if (from) q2 = q2.gte('sale_date', from);
      if (to) q2 = q2.lte('sale_date', to);
      if (payFilter) q2 = q2.eq('payment_method', payFilter);
      if (payStatusFilter) q2 = q2.eq('payment_status', payStatusFilter);
      const { data } = await q2.limit(2000);
      salesList = (data || []).map((s: any) => ({
        ...s,
        net_total: Number(s.subtotal || 0) - Number(s.discount_amount || 0) + Number(s.shipping_cost || 0),
        created_by_name: s.profiles?.display_name || s.created_by?.slice(0, 8) || '-',
        staff_name: s.profiles?.display_name || '-',
      }));
    } catch {}
  }

  try {
    const saleIds = salesList.map((s: any) => s.id);
    if (saleIds.length > 0) {
      const { data: lines } = await supabase
        .from('sales_transaction_lines')
        .select(
          'sale_id, quantity, unit_price, cost_of_goods_sold, sales_transactions!inner(sale_date, sale_number, payment_method, customer_name, created_by), books(sku, title, title_en, shelf_position, warehouse_location)'
        )
        .in('sale_id', saleIds)
        .order('created_at', { ascending: true })
        .limit(5000);

      // Reuse profileMap from salesList when possible, only fetching missing IDs
      const bookProfileMap: Record<string, string> = { ...profileMap };
      if (lines && (lines as any[]).length > 0) {
        const missingCids = [
          ...new Set(
            (lines as any[])
              .map((l: any) => l.sales_transactions?.created_by)
              .filter((id: any) => id && !bookProfileMap[id])
          ),
        ];
        if (missingCids.length > 0) {
          const { data: bp } = await supabase.from('profiles').select('id, display_name').in('id', missingCids);
          if (bp) for (const p of bp as any[]) bookProfileMap[p.id] = p.display_name;
        }
      }

      salesBooksList = (lines || []).map((l: any) => ({
        sale_date: l.sales_transactions?.sale_date,
        sale_number: l.sales_transactions?.sale_number,
        sku: l.books?.sku,
        title: l.books?.title,
        title_en: l.books?.title_en,
        shelf_position: l.books?.shelf_position,
        warehouse_location: l.books?.warehouse_location,
        quantity: l.quantity,
        unit_price: l.unit_price,
        cost_of_goods_sold: l.cost_of_goods_sold,
        payment_method: l.sales_transactions?.payment_method,
        customer_name: l.sales_transactions?.customer_name,
        created_by: l.sales_transactions?.created_by,
        staff_name: bookProfileMap[l.sales_transactions?.created_by] || '-',
      }));
    }
  } catch {
    try {
      let vQuery = supabase.from('sales_books_report_view').select('*').order('sale_number', { ascending: true }).limit(2000);
      if (from) vQuery = vQuery.gte('sale_date', from);
      if (to) vQuery = vQuery.lte('sale_date', to);
      const { data } = await vQuery;
      salesBooksList = data || [];
    } catch {}
  }

  return { salesList, salesBooksList };
}

export async function fetchEditedSalesData(supabase: SupabaseLike) {
  let editedSalesList: any[] = [];
  try {
    const { data: editsData } = await supabase
      .from('sale_edits')
      .select('id, sale_id, change_type, reason, edited_at, edited_by')
      .order('edited_at', { ascending: false })
      .limit(200);
    if (editsData && editsData.length > 0) {
      const saleIds = [...new Set((editsData as any[]).map((e) => e.sale_id))];
      const editorIds = [...new Set((editsData as any[]).map((e) => e.edited_by).filter(Boolean))];
      const [sRes, pRes] = await Promise.all([
        supabase
          .from('sales_transactions')
          .select('id, sale_number, sale_date, subtotal, discount_amount, shipping_cost')
          .in('id', saleIds),
        editorIds.length > 0
          ? supabase.from('profiles').select('id, display_name').in('id', editorIds)
          : Promise.resolve({ data: [] } as any),
      ]);
      const saleMap: Record<string, any> = {};
      for (const s of (sRes.data || []) as any[]) saleMap[s.id] = s;
      const editorMap: Record<string, string> = {};
      for (const p of (pRes.data || []) as any[]) editorMap[p.id] = p.display_name;
      editedSalesList = (editsData as any[]).map((e) => {
        const s = saleMap[e.sale_id] || {};
        return {
          edited_at: e.edited_at,
          sale_date: s.sale_date,
          sale_number: s.sale_number,
          net_total: Number(s.subtotal || 0) - Number(s.discount_amount || 0) + Number(s.shipping_cost || 0),
          change_type: e.change_type,
          reason: e.reason,
          edited_by_name: editorMap[e.edited_by] || '-',
        };
      });
    }
  } catch (e) {
    console.error('edited sales fetch error', e);
  }
  return editedSalesList;
}

export async function fetchPublisherReportData(
  supabase: SupabaseLike,
  valuationPromise: Promise<any[]> | any[],
  params: { pub_from?: string; pub_to?: string; pub_publisher?: string }
) {
  const year = new Date().getUTCFullYear();
  const todayStr = new Date().toISOString().slice(0, 10);
  const pubFrom = params.pub_from || `${year}-01-01`;
  const pubTo = params.pub_to || todayStr;
  const pubPublisher = params.pub_publisher && params.pub_publisher !== 'all' ? params.pub_publisher : 'all';

  let publisherReportRows: any[] = [];
  let publisherList: string[] = [];

  try {
    // Run books, opening stock RPC,purchase receipts, and valuation resolution in parallel!
    const [pubBooksRes, openRowsRes, ptxRes, valuation] = await Promise.all([
      supabase.from('books').select('id, sku, title, publisher').eq('is_active', true).order('sku').limit(5000),
      Promise.resolve(supabase.rpc('inventory_qty_at', { p_as_of: shiftDay(pubFrom, -1) })).catch(() => ({ data: [] })),
      Promise.resolve(
        supabase
          .from('inventory_transactions')
          .select('book_id, quantity')
          .eq('transaction_type', 'purchase_receipt')
          .eq('reference_type', 'purchase_order')
          .gte('occurred_at', pubFrom)
          .lt('occurred_at', shiftDay(pubTo, 1))
          .limit(20000)
      ).catch(() => ({ data: [] })),
      Promise.resolve(valuationPromise),
    ]);

    const allPubBooks = ((pubBooksRes.data || []) as any[]) as PublisherReportBook[];
    publisherList = distinctPublishers(allPubBooks);
    const filteredBooks =
      pubPublisher === 'all' ? allPubBooks : allPubBooks.filter((b) => (b.publisher || '').trim() === pubPublisher);
    const bookIdSet = new Set(filteredBooks.map((b) => b.id));

    const valuationById: Record<string, PublisherReportValuation> = {};
    for (const v of (valuation || []) as any[]) {
      if (v.book_id && bookIdSet.has(v.book_id)) {
        valuationById[v.book_id] = {
          quantity_on_hand: Number(v.quantity_on_hand || 0),
          current_price: Number(v.current_price || 0),
          weighted_average_cost: Number(v.weighted_average_cost || 0),
          shelf_position: v.shelf_position || null,
        };
      }
    }

    const openMap: Record<string, number> = {};
    for (const r of (openRowsRes?.data || []) as any[]) {
      if (bookIdSet.has(r.book_id)) openMap[r.book_id] = Number(r.qty_on_hand || 0);
    }

    const purchMap: Record<string, number> = {};
    for (const r of (ptxRes?.data || []) as any[]) {
      if (bookIdSet.has(r.book_id)) purchMap[r.book_id] = (purchMap[r.book_id] || 0) + Number(r.quantity || 0);
    }

    publisherReportRows = buildPublisherReportRows(filteredBooks, valuationById, openMap, purchMap);
  } catch (e) {
    console.error('publisher report fetch error', e);
  }

  return {
    rows: publisherReportRows,
    publishers: publisherList,
    initialFilters: { from: pubFrom, to: pubTo, publisher: pubPublisher },
  };
}
