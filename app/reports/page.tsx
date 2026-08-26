import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReportsClient } from './reports-client';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; type?: string }> }) {
  const { from, to, type } = await searchParams;
  const supabase = await createSupabaseServerClient();
  let valuation: any[] = [];
  let lowStock: any[] = [];
  let salesList: any[] = [];
  let salesBooksList: any[] = [];
  let mode: 'demo' | 'live' = 'demo';

  if (supabase) {
    try {
      const [vRes, lRes] = await Promise.all([
        supabase.from('inventory_valuation_view').select('*').limit(20),
        supabase.from('low_stock_view').select('*').limit(20),
      ]);
      if (vRes.data) {
        valuation = vRes.data;
        mode = 'live';
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
          let bQuery = supabase.from('sales_transaction_lines').select('quantity, unit_price, sales_transactions!inner(sale_date, sale_number, payment_method, customer_name), books(sku, title, title_en, shelf_position)').order('created_at', { ascending: false });
          // Filter via sale_date through join - need to do post-filter if RLS
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
            payment_method: l.sales_transactions?.payment_method,
            customer_name: l.sales_transactions?.customer_name,
          }));
        } catch {
          // Fallback to view if exists
          try {
            let vQuery = supabase.from('sales_books_report_view').select('*').limit(200);
            if (from) vQuery = vQuery.gte('sale_date', from);
            if (to) vQuery = vQuery.lte('sale_date', to);
            const { data } = await vQuery;
            salesBooksList = data || [];
          } catch {}
        }
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
      { sale_number: 'C100124', sale_date: '2026-08-26', payment_method: 'card', payment_status: 'paid', subtotal: 15, discount_amount: 0, net_total: 15, customer_name: 'Shopify #1234' },
    ];
    salesBooksList = [
      { sale_date: '2026-08-26', sale_number: 'C100123', sku: 'BOOK-001', title: '活水得胜之路', quantity: 2, unit_price: 12.5, payment_method: 'cash', customer_name: '张弟兄' },
    ];
  }

  return <ReportsClient valuation={valuation} lowStock={lowStock} salesList={salesList} salesBooksList={salesBooksList} initialFilters={{ from, to, type }} />;
}
