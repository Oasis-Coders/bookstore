import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BooksClient } from './books-client';

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  const { q: qRaw, show: showRaw } = await searchParams;
  const q = qRaw || '';
  // 1D: 停用图书不再从书库消失；默认全部可见，可按状态筛选
  const show = showRaw === 'active' || showRaw === 'inactive' ? showRaw : 'all';
  const supabase = await createSupabaseServerClient();

  let books: any[] = [];
  let mode: 'live' | 'empty' = 'empty';

  if (supabase) {
    // 备用条码：q 若含数字，先在 spare_barcodes 里找已分配的图书 id
    let spareBookIds: string[] = [];
    const digits = q.replace(/\D/g, '');
    if (digits.length >= 4) {
      try {
        const { data: spares } = await supabase
          .from('spare_barcodes')
          .select('assigned_book_id')
          .eq('status', 'assigned')
          .ilike('code', `%${digits}%`)
          .not('assigned_book_id', 'is', null)
          .limit(20);
        spareBookIds = [...new Set(((spares || []) as any[]).map((r) => r.assigned_book_id).filter(Boolean))];
      } catch {}
    }
    const spareOr = spareBookIds.length ? `,id.in.(${spareBookIds.join(',')})` : '';
    try {
      let query = supabase.from('books').select('*, inventory_batches(quantity_remaining)').order('title');
      if (show === 'active') query = query.eq('is_active', true);
      if (show === 'inactive') query = query.eq('is_active', false);
      if (q) {
        query = query.or(`title.ilike.%${q}%,title_en.ilike.%${q}%,title_simplified.ilike.%${q}%,title_traditional.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%,shelf_position.ilike.%${q}%,warehouse_location.ilike.%${q}%${spareOr}`);
      }
      const { data } = await query.limit(80);
      if (data) {
        books = data.map((b: any) => ({
          ...b,
          on_hand: Array.isArray(b.inventory_batches) ? b.inventory_batches.reduce((s: number, batch: any) => s + (batch.quantity_remaining || 0), 0) : 0,
        }));
        mode = 'live';
      }
    } catch (e) {
      try {
        let query2 = supabase.from('books').select('*').order('title');
        if (show === 'active') query2 = query2.eq('is_active', true);
        if (show === 'inactive') query2 = query2.eq('is_active', false);
        if (q) {
          query2 = query2.or(`title.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%${spareOr}`);
        }
        const { data } = await query2.limit(80);
        if (data) {
          books = data.map((b: any) => ({
            ...b,
            on_hand: 0,
            title_en: b.title_en || b.metadata?.title_en || null,
            title_simplified: b.title_simplified || b.metadata?.title_simplified || null,
            title_traditional: b.title_traditional || b.metadata?.title_traditional || null,
            shelf_position: b.shelf_position || b.metadata?.shelf_position || null,
          }));
          mode = 'live';
        }
      } catch {}
    }
  }

  return <BooksClient books={books} q={q} mode={mode} show={show} />;
}
