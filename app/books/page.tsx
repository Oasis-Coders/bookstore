import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BooksClient } from './books-client';

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: qRaw } = await searchParams;
  const q = qRaw || '';
  const supabase = await createSupabaseServerClient();

  let books: any[] = [];
  let mode: 'live' | 'empty' = 'empty';

  if (supabase) {
    try {
      let query = supabase.from('books').select('*, inventory_batches(quantity_remaining)').eq('is_active', true).order('title');
      if (q) {
        query = query.or(`title.ilike.%${q}%,title_en.ilike.%${q}%,title_simplified.ilike.%${q}%,title_traditional.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%,shelf_position.ilike.%${q}%`);
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
        let query2 = supabase.from('books').select('*').eq('is_active', true).order('title');
        if (q) {
          query2 = query2.or(`title.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%`);
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

  return <BooksClient books={books} q={q} mode={mode} />;
}
