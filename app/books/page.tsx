import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BooksClient } from './books-client';

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: qRaw } = await searchParams;
  const q = qRaw || '';
  const supabase = await createSupabaseServerClient();

  let books: any[] = [];
  let mode: 'demo' | 'live' = 'demo';

  if (supabase) {
    try {
      let query = supabase.from('books').select('*, inventory_batches(quantity_remaining)').eq('is_active', true).order('title');
      if (q) {
        // Bilingual search: title, title_en, simplified, traditional, sku, author, publisher
        query = query.or(`title.ilike.%${q}%,title_en.ilike.%${q}%,title_simplified.ilike.%${q}%,title_traditional.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%,shelf_position.ilike.%${q}%`);
      }
      const { data } = await query.limit(80);
      if (data) {
        // Compute stock on hand from batches
        books = data.map((b: any) => ({
          ...b,
          on_hand: Array.isArray(b.inventory_batches) ? b.inventory_batches.reduce((s: number, batch: any) => s + (batch.quantity_remaining || 0), 0) : 0,
        }));
        mode = 'live';
      }
    } catch (e) {
      // Fallback without new columns if migration not yet run
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

  // Demo data fallback
  if (mode === 'demo' && books.length === 0) {
    books = [
      { id: '1', sku: 'BOOK-DEMO-001', title: '活水得胜之路', title_en: 'The Way of Victory', title_simplified: '活水得胜之路', title_traditional: '活水得勝之路', publisher: '活水出版社', author: '张牧师', current_price: 12.5, category: '灵修', shelf_position: 'A-3-2', on_hand: 8, low_stock_threshold: 5 },
      { id: '2', sku: 'BOOK-DEMO-002', title: '认识真理', title_en: 'Knowing the Truth', title_simplified: '认识真理', title_traditional: '認識真理', publisher: '福音出版社', author: '李弟兄', current_price: 9.99, category: '神学', shelf_position: 'B-1-5', on_hand: 3, low_stock_threshold: 3 },
      { id: '3', sku: 'BOOK-DEMO-003', title: '恩典之旅', title_en: 'Journey of Grace', publisher: '活水出版社', author: '王传道', current_price: 15.0, category: '见证', shelf_position: 'A-2-1', on_hand: 12, low_stock_threshold: 5 },
    ].filter(b => !q || b.title.includes(q) || b.title_en?.toLowerCase().includes(q.toLowerCase()) || b.publisher.includes(q) || b.sku.includes(q));
  }

  return <BooksClient books={books} q={q} mode={mode} />;
}
