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
      let query = supabase.from('books').select('*').eq('is_active', true).order('title');
      if (q) {
        query = query.or(`title.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%`);
      }
      const { data } = await query.limit(50);
      if (data) {
        books = data;
        mode = 'live';
      }
    } catch {}
  }

  // Demo data fallback
  if (mode === 'demo' && books.length === 0) {
    books = [
      { id: '1', sku: 'BOOK-DEMO-001', title: '活水得胜之路', publisher: '活水出版社', author: '张牧师', current_price: 12.5, category: '灵修', low_stock_threshold: 5 },
      { id: '2', sku: 'BOOK-DEMO-002', title: '认识真理', publisher: '福音出版社', author: '李弟兄', current_price: 9.99, category: '神学', low_stock_threshold: 3 },
      { id: '3', sku: 'BOOK-DEMO-003', title: '恩典之旅', publisher: '活水出版社', author: '王传道', current_price: 15.0, category: '见证', low_stock_threshold: 5 },
    ].filter(b => !q || b.title.includes(q) || b.publisher.includes(q) || b.sku.includes(q));
  }

  return <BooksClient books={books} q={q} mode={mode} />;
}
