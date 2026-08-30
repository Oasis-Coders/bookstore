import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SalesClient } from './sales-client';

export default async function SalesPage() {
  const supabase = await createSupabaseServerClient();
  let books: any[] = [] as any[];
  let recentSales: any[] = [] as any[];
  let stockMap: Record<string, number> = {};
  let isAdmin = false;
  let saleLocationId: string | null = null;
  
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
        const names = (roles || []).map((r: any) => r.roles?.name);
        isAdmin = names.includes('admin') || names.includes('super_admin');
      }
    } catch {}
    // Deterministic sale location - same as createSale
    try {
      const { data: storeLoc } = await supabase.from('locations').select('id').eq('code', 'STORE-LON').eq('is_active', true).single();
      if (storeLoc?.id) saleLocationId = storeLoc.id;
      else {
        const { data: storeTypeLoc } = await supabase.from('locations').select('id').eq('is_active', true).eq('location_type', 'store').order('code', { ascending: true }).limit(1).single();
        if (storeTypeLoc?.id) saleLocationId = storeTypeLoc.id;
        else {
          const { data: anyLoc } = await supabase.from('locations').select('id').eq('is_active', true).order('code', { ascending: true }).limit(1).single();
          if (anyLoc?.id) saleLocationId = anyLoc.id;
        }
      }
    } catch {}
    try {
      const bRes = await supabase.from('books').select('id, title, sku, current_price, shelf_position, title_en').eq('is_active', true).order('title').limit(200);
      books = bRes.data || [];
    } catch (e) {
      console.error('books fetch error', e);
    }
    try {
      const sRes = await supabase.from('sales_transactions').select('id, sale_number, subtotal, discount_amount, payment_method, customer_name, sold_at, sale_date').order('sold_at', { ascending: false }).limit(20);
      recentSales = (sRes.data || []).map((s: any) => ({
        id: s.id,
        sale_number: s.sale_number || `C${s.id.slice(0,6)}`,
        subtotal: s.subtotal,
        discount_amount: s.discount_amount,
        net_total: Number(s.subtotal || 0) - Number(s.discount_amount || 0),
        payment_method: s.payment_method,
        customer_name: s.customer_name,
        sold_at: s.sale_date || new Date(s.sold_at).toLocaleString(),
      }));
    } catch (e) {
      console.error('sales fetch error', e);
    }
    try {
      // Location-specific stock - only count batches in the sale location
      if (saleLocationId) {
        const { data: batches } = await supabase.from('inventory_batches').select('book_id, quantity_remaining').eq('location_id', saleLocationId).gt('quantity_remaining', 0).limit(1000);
        if (batches) {
          for (const b of batches as any[]) {
            stockMap[b.book_id] = (stockMap[b.book_id] || 0) + Number(b.quantity_remaining || 0);
          }
        }
      } else {
        // Fallback: if no location, sum all (should not happen)
        const { data: val } = await supabase.from('inventory_valuation_view').select('book_id, quantity_on_hand').limit(500);
        if (val) {
          for (const r of val as any[]) {
            const bid = (r as any).book_id;
            const q = Number((r as any).quantity_on_hand || 0);
            stockMap[bid] = (stockMap[bid] || 0) + q;
          }
        }
      }
    } catch {
      try {
        const { data: batches } = await supabase.from('inventory_batches').select('book_id, quantity_remaining').gt('quantity_remaining', 0).limit(500);
        if (batches) {
          for (const b of batches as any[]) {
            stockMap[b.book_id] = (stockMap[b.book_id] || 0) + Number(b.quantity_remaining || 0);
          }
        }
      } catch {}
    }
  }

  return <SalesClient books={books} recentSales={recentSales} stockMap={stockMap} isAdmin={isAdmin} />;
}
