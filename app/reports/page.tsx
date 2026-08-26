import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReportsClient } from './reports-client';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; month?: string }> }) {
  const { from, to, month } = await searchParams;
  const supabase = await createSupabaseServerClient();
  let valuation: any[] = [] as any[];
  let lowStock: any[] = [] as any[];
  let salesList: any[] = [] as any[];
  let salesBooksList: any[] = [] as any[];
  let monthlyFinancial: any = null;
  let currentInventoryValue = 0;
  let mode: 'demo' | 'live' = 'demo';

  const targetMonth = month || new Date().toISOString().slice(0,7); // YYYY-MM
  const monthStart = `${targetMonth}-01`;
  // compute month end
  const d = new Date(`${targetMonth}-01T00:00:00`);
  d.setMonth(d.getMonth()+1); d.setDate(0);
  const monthEnd = d.toISOString().slice(0,10);

  if (supabase) {
    try {
      const [vRes, lRes] = await Promise.all([
        supabase.from('inventory_valuation_view').select('*').limit(30),
        supabase.from('low_stock_view').select('*').limit(20),
      ]);
      if (vRes.data && vRes.data.length > 0) {
        valuation = vRes.data;
        mode = 'live';
        currentInventoryValue = vRes.data.reduce((s: number, r: any) => s + Number(r.inventory_value || 0), 0);
      }
      if (lRes.data) lowStock = lRes.data;

      // Fetch sales for date range if provided
      if (from || to) {
        try {
          let query = supabase.from('sales_transactions').select('id, sale_number, sale_date, sold_at, payment_method, payment_status, subtotal, discount_amount, customer_name, status').order('sold_at', { ascending: false });
          if (from) query = query.gte('sale_date', from);
          if (to) query = query.lte('sale_date', to);
          const { data } = await query.limit(100);
          salesList = (data || []).map((s: any) => ({
            ...s,
            net_total: Number(s.subtotal || 0) - Number(s.discount_amount || 0),
          }));
        } catch {}

        try {
          let bQuery = supabase.from('sales_transaction_lines').select('quantity, unit_price, cost_of_goods_sold, sales_transactions!inner(sale_date, sale_number, payment_method, customer_name), books(sku, title, title_en, shelf_position)').order('created_at', { ascending: false });
          const { data: lines } = await bQuery.limit(200);
          salesBooksList = (lines || []).filter((l: any) => {
            const sd = l.sales_transactions?.sale_date;
            if (from && sd < from) return false;
            if (to && sd > to) return false;
            return true;
          }).map((l: any) => ({
            sale_date: l.sales_transactions?.sale_date,
            sale_number: l.sales_transactions?.sale_number,
            sku: l.books?.sku,
            title: l.books?.title,
            title_en: l.books?.title_en,
            shelf_position: l.books?.shelf_position,
            quantity: l.quantity,
            unit_price: l.unit_price,
            cost_of_goods_sold: l.cost_of_goods_sold,
            payment_method: l.sales_transactions?.payment_method,
            customer_name: l.sales_transactions?.customer_name,
          }));
        } catch {
          try {
            let vQuery = supabase.from('sales_books_report_view').select('*').limit(200);
            if (from) vQuery = vQuery.gte('sale_date', from);
            if (to) vQuery = vQuery.lte('sale_date', to);
            const { data } = await vQuery;
            salesBooksList = data || [];
          } catch {}
        }
      }

      // Monthly financial data
      try {
        // Try view first
        const { data: finView } = await supabase.from('monthly_financial_view').select('*').eq('month_start', monthStart).maybeSingle();
        if (finView) {
          monthlyFinancial = finView;
        } else {
          // Manual calc fallback
          const salesInMonth = await supabase.from('sales_transactions').select('subtotal, discount_amount').gte('sale_date', monthStart).lte('sale_date', monthEnd).eq('status','completed');
          const salesTotal = (salesInMonth.data || []).reduce((s: number, r: any) => s + Number(r.subtotal||0) - Number(r.discount_amount||0), 0);
          
          // COGS for month
          const cogsQuery = await supabase.from('sales_transaction_lines').select('cost_of_goods_sold, sales_transactions!inner(sale_date, status)').gte('sales_transactions.sale_date', monthStart).lte('sales_transactions.sale_date', monthEnd);
          // Note: above join filter may not work in all postgrest versions, fallback to client filter
          let cogsTotal = 0;
          if (cogsQuery.data) {
            cogsTotal = (cogsQuery.data as any[]).reduce((s, r) => s + Number(r.cost_of_goods_sold||0), 0);
          }

          // Purchases for month
          const poQuery = await supabase.from('purchase_orders').select('id, subtotal').gte('order_date', monthStart).lte('order_date', monthEnd).neq('status','draft').neq('status','cancelled');
          let purchasesTotal = 0;
          if (poQuery.data && poQuery.data.length > 0) {
            // sum via lines for accuracy
            const poIds = poQuery.data.map((p:any)=>p.id);
            const linesQuery = await supabase.from('purchase_order_lines').select('quantity_ordered, unit_cost').in('purchase_order_id', poIds);
            purchasesTotal = (linesQuery.data || []).reduce((s:any, l:any)=> s + Number(l.quantity_ordered||0)*Number(l.unit_cost||0), 0);
          }

          // Opening/closing from snapshots
          const { data: snap } = await supabase.from('monthly_stock_snapshots').select('*').eq('month_start', monthStart).maybeSingle();
          const { data: prevSnap } = await supabase.from('monthly_stock_snapshots').select('closing_stock').lt('month_start', monthStart).order('month_start', { ascending: false }).limit(1).maybeSingle();

          monthlyFinancial = {
            month_start: monthStart,
            month_end: monthEnd,
            sales_total: salesTotal,
            cogs_total: cogsTotal,
            purchases_total: purchasesTotal,
            opening_stock: snap?.opening_stock ?? prevSnap?.closing_stock ?? currentInventoryValue, // fallback
            closing_stock: snap?.closing_stock ?? currentInventoryValue,
            order_count: (salesInMonth.data || []).length,
          };
        }
      } catch (e) {
        // keep null
      }

    } catch {}
  }

  if (mode === 'demo') {
    valuation = [
      { sku: 'BOOK-001', title: '活水得胜之路', location_name: '书店门店', quantity_on_hand: 8, inventory_value: 42.4, weighted_average_cost: 5.3, current_price: 12.5, retail_value: 100 },
      { sku: 'BOOK-002', title: '认识真理', location_name: '仓库', quantity_on_hand: 15, inventory_value: 78, weighted_average_cost: 5.2, current_price: 9.99, retail_value: 149.85 },
    ];
    lowStock = [
      { sku: 'BOOK-003', title: '恩典之旅', low_stock_threshold: 5, quantity_on_hand: 2, reorder_shortage: 3 },
    ];
    salesList = [
      { sale_number: 'C100123', sale_date: '2026-08-26', payment_method: 'cash', payment_status: 'paid', subtotal: 45.5, discount_amount: 2, net_total: 43.5, customer_name: '张弟兄' },
    ];
    salesBooksList = [
      { sale_date: '2026-08-26', sale_number: 'C100123', sku: 'BOOK-001', title: '活水得胜之路', quantity: 2, unit_price: 12.5, payment_method: 'cash', customer_name: '张弟兄' },
    ];
    monthlyFinancial = {
      month_start: monthStart,
      month_end: monthEnd,
      sales_total: 0,
      cogs_total: 0,
      purchases_total: 0,
      opening_stock: currentInventoryValue || 0,
      closing_stock: currentInventoryValue || 0,
      order_count: 0,
    };
  }

  return <ReportsClient valuation={valuation} lowStock={lowStock} salesList={salesList} salesBooksList={salesBooksList} monthlyFinancial={monthlyFinancial} currentInventoryValue={currentInventoryValue} initialFilters={{ from, to, month: targetMonth }} />;
}
