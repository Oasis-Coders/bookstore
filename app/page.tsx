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
    };
  }

  try {
    const [valuationRes, lowStockRes, booksRes, poRes] = await Promise.all([
      supabase.from('inventory_valuation_view').select('*'),
      supabase.from('low_stock_view').select('*'),
      supabase.from('books').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('purchase_orders').select('*, suppliers(name_zh)').order('created_at', { ascending: false }).limit(5),
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
    };
  } catch {
    return {
      mode: 'demo' as const,
      totalValue: 12458.5,
      totalBooks: 156,
      lowStockCount: 8,
      recentPOs: [],
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}
