import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SalesClient } from './sales-client';

export default async function SalesPage() {
  const supabase = await createSupabaseServerClient();
  let books: any[] = [];
  let locations: any[] = [];
  let recentSales: any[] = [];
  
  if (supabase) {
    try {
      const bRes = await supabase.from('books').select('id, title, sku, current_price, shelf_position, title_en').eq('is_active', true).order('title').limit(200);
      books = bRes.data || [];
    } catch (e) {
      console.error('books fetch error', e);
    }
    try {
      const lRes = await supabase.from('locations').select('id, name, code').eq('is_active', true).limit(10);
      locations = lRes.data || [];
    } catch (e) {
      console.error('locations fetch error', e);
    }
    try {
      const sRes = await supabase.from('sales_transactions').select('id, sale_number, subtotal, payment_method, customer_name, sold_at, sale_date').order('sold_at', { ascending: false }).limit(20);
      recentSales = (sRes.data || []).map((s: any) => ({
        id: s.id,
        sale_number: s.sale_number || `C${s.id.slice(0,6)}`,
        subtotal: s.subtotal,
        payment_method: s.payment_method,
        customer_name: s.customer_name,
        sold_at: s.sale_date || new Date(s.sold_at).toLocaleString(),
      }));
    } catch (e) {
      console.error('sales fetch error', e);
    }
  }

  return <SalesClient books={books} locations={locations} recentSales={recentSales} />;
}
