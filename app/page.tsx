import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardClient } from './dashboard-client';

async function getDashboardData() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      mode: 'demo' as const,
      totalValue: 0,
      totalBooks: 0,
      lowStockCount: 0,
      recentPOs: [],
      dailySales: null,
    };
  }

  try {
    const [valuationRes, lowStockRes, booksRes, poRes, dailySalesRes] = await Promise.all([
      supabase.from('inventory_valuation_view').select('*'),
      supabase.from('low_stock_view').select('*'),
      supabase.from('books').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('purchase_orders').select('*, suppliers(name_zh)').order('created_at', { ascending: false }).limit(5),
      // Daily sales - try view first, fallback to manual aggregation
      (async () => {
        try {
          const { data } = await supabase.from('daily_sales_summary').select('*').single();
          if (data) {
            // normalize to 4-item shape
            return {
              sale_date: data.sale_date,
              total_orders: data.total_orders,
              cash_total: Number(data.cash_total || 0),
              card_total: Number(data.card_total || 0),
              bank_transfer_total: Number(data.bank_transfer_total || 0),
              shopify_total: Number(data.shopify_total || 0),
              grand_total: Number(data.grand_total || 0),
            };
          }
        } catch {}
        // Fallback: aggregate today's sales manually
        try {
          const today = new Date().toISOString().slice(0,10);
          const { data: sales } = await supabase.from('sales_transactions').select('subtotal, discount_amount, payment_method, sale_date').eq('sale_date', today).eq('status', 'completed');
          if (!sales) return null;
          const agg: any = { sale_date: today, total_orders: sales.length, cash_total: 0, card_total: 0, bank_transfer_total: 0, shopify_total: 0, grand_total: 0 };
          sales.forEach((s: any) => {
            const net = Number(s.subtotal || 0) - Number(s.discount_amount || 0);
            agg.grand_total += net;
            if (s.payment_method === 'cash') agg.cash_total += net;
            else if (s.payment_method === 'card') agg.card_total += net;
            else if (s.payment_method === 'bank_transfer') agg.bank_transfer_total += net;
            else if (s.payment_method === 'shopify') agg.shopify_total += net;
            else agg.cash_total += net;
          });
          return agg;
        } catch { return null; }
      })(),
    ]);

    const totalValue = valuationRes.data?.reduce((sum: number, r: any) => sum + Number(r.inventory_value || 0), 0) || 0;
    const totalBooks = booksRes.count || 0;
    const lowStockCount = lowStockRes.data?.length || 0;

    return {
      mode: 'live' as const,
      totalValue,
      totalBooks,
      lowStockCount,
      recentPOs: poRes.data || [],
      valuation: valuationRes.data?.slice(0, 5) || [],
      dailySales: dailySalesRes as any,
    };
  } catch {
    return {
      mode: 'demo' as const,
      totalValue: 12458.5,
      totalBooks: 156,
      lowStockCount: 8,
      recentPOs: [],
      dailySales: {
        sale_date: new Date().toISOString().slice(0,10),
        total_orders: 12,
        cash_total: 156.5,
        card_total: 89.2,
        bank_transfer_total: 45,
        shopify_total: 234.8,
        grand_total: 525.5,
      },
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}
