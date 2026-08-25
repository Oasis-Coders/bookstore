import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReportsClient } from './reports-client';

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient();
  let valuation: any[] = [];
  let lowStock: any[] = [];
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
  }

  return <ReportsClient valuation={valuation} lowStock={lowStock} />;
}
