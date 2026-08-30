import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EditSaleClient } from './edit-client';
import { notFound, redirect } from 'next/navigation';

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/auth?redirectTo=/sales');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?redirectTo=/sales');

  const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
  const roleNames = (roles || []).map((r: any) => r.roles?.name);
  const isAdmin = roleNames.includes('admin') || roleNames.includes('super_admin');
  if (!isAdmin) redirect('/');

  const { data: sale } = await supabase.from('sales_transactions').select('*').eq('id', id).single();
  if (!sale) notFound();

  const { data: lines } = await supabase.from('sales_transaction_lines').select('*, books(title, sku)').eq('sale_id', id);

  let edits: any[] = [];
  try {
    const { data } = await supabase.from('sale_edits_view').select('*').eq('sale_id', id).order('edited_at', { ascending: false });
    edits = data || [];
  } catch {
    try {
      const { data } = await supabase.from('sale_edits').select('*').eq('sale_id', id).order('edited_at', { ascending: false });
      edits = data || [];
    } catch {}
  }

  // Books + stock for autocomplete (same as sales page)
  let books: any[] = [];
  let stockMap: Record<string, number> = {};
  try {
    const bRes = await supabase.from('books').select('id, title, sku, current_price, shelf_position').eq('is_active', true).order('title').limit(200);
    books = bRes.data || [];
  } catch {}
  try {
    const { data: val } = await supabase.from('inventory_valuation_view').select('book_id, quantity_on_hand').limit(500);
    if (val) {
      for (const r of val as any[]) {
        stockMap[r.book_id] = (stockMap[r.book_id] || 0) + Number(r.quantity_on_hand || 0);
      }
    }
  } catch {
    try {
      const { data: batches } = await supabase.from('inventory_batches').select('book_id, quantity_remaining').gt('quantity_remaining', 0).limit(500);
      if (batches) {
        for (const b of batches as any[]) stockMap[b.book_id] = (stockMap[b.book_id] || 0) + Number(b.quantity_remaining || 0);
      }
    } catch {}
  }

  return <EditSaleClient sale={sale} lines={lines || []} edits={edits} books={books} stockMap={stockMap} />;
}
