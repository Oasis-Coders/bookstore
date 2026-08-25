import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SalesClient } from './sales-client';

export default async function SalesPage() {
  const supabase = await createSupabaseServerClient();
  let books: any[] = [];
  let locations: any[] = [];
  
  if (supabase) {
    try {
      const [bRes, lRes] = await Promise.all([
        supabase.from('books').select('id, title, sku, current_price').eq('is_active', true).limit(30),
        supabase.from('locations').select('id, name, code').eq('is_active', true).limit(10),
      ]);
      books = bRes.data || [];
      locations = lRes.data || [];
    } catch {}
  }

  return <SalesClient books={books} locations={locations} />;
}
