import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

export default async function BooksPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams?.q || '';
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

  return (
    <AppShell title="Books" titleZh="书库" eyebrow={`${books.length} 种图书`} actions={<Button variant="secondary">+ 添加图书</Button>}>
      {/* Search */}
      <form className="mb-6 flex gap-2">
        <Input name="q" defaultValue={q} placeholder="搜索中文书名、出版社、代号/SKU、作者..." className="max-w-[420px]" />
        <Button type="submit" variant="secondary">搜索</Button>
        {q && <a href="/books" className="inline-flex h-11 items-center rounded-[20px] border border-[#0f3d2e]/15 px-4 text-[13px]">清除</a>}
      </form>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <Card key={book.id} className="group transition-all hover:shadow-[rgba(15,61,46,0.08)_0px_4px_16px] hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <Badge>{book.category || '未分类'}</Badge>
              <span className="text-[11px] text-[#4f7a5c]">{book.sku}</span>
            </div>
            <h3 className="mt-3 font-serif text-[18px] leading-tight tracking-tight line-clamp-2">{book.title}</h3>
            <p className="mt-1 text-[12px] text-[#4f7a5c]">{book.publisher} {book.author ? `• ${book.author}` : ''}</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-[11px] text-[#4f7a5c]">现售价</p>
                <p className="font-semibold">{formatCurrency(Number(book.current_price))}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-[#4f7a5c]">阈值 {book.low_stock_threshold}</p>
                <Badge variant={mode === 'demo' ? 'warning' : 'default'}>在库查看</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {books.length === 0 && (
        <Card className="mt-6 py-12 text-center">
          <p className="text-[14px] text-[#4f7a5c]">未找到{q ? ` “${q}” 相关` : ''}图书</p>
          <p className="mt-1 text-[12px] text-[#4f7a5c]/70">支持中文模糊搜索：书名、出版社、SKU</p>
        </Card>
      )}

      <div className="mt-8 rounded-[16px] bg-[#f4e8c1]/50 p-4 text-[12px] text-[#0f3d2e]/70">
        <p>💡 进货价按批次记录：同书名每次进货价不同时，系统会保留每个批次的成本，FIFO 出库时自动按最早批次扣减。</p>
      </div>
    </AppShell>
  );
}
