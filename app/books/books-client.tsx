'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';

type Book = {
  shelf_position?: string | null;
  title_en?: string | null;
  metadata?: any;
  id: string;
  sku: string;
  title: string;
  publisher?: string;
  author?: string;
  current_price?: number;
  category?: string;
  low_stock_threshold?: number;
};

export function BooksClient({ books, q, mode }: { books: Book[]; q: string; mode: 'demo' | 'live' }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';

  return (
    <AppShell title={tt('books.title')} titleZh={tt('books.title')} eyebrow={tt('books.count', { n: books.length })} actions={
      <Link href="/books/new">
        <Button variant="secondary" className="rounded-[12px] shadow-[0_2px_8px_rgba(15,61,46,0.15)] hover:shadow-[0_4px_12px_rgba(15,61,46,0.25)] transition-all hover:scale-[1.02]">+ {tt('books.addBook')}</Button>
      </Link>
    }>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <form method="GET" action="/books" className="flex gap-2 flex-1 max-w-[420px]">
            <div className="relative flex-1">
              <Input name="q" defaultValue={q} placeholder={tt('books.searchPlaceholder')} className="pr-10 rounded-[12px] h-10 border-[#0f3d2e]/10 focus:border-[#0f3d2e]/20 bg-white shadow-sm" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4f7a5c]/40 text-[14px]">⌕</span>
            </div>
            <Button type="submit" variant="ghost" className="rounded-[12px] h-10">{tt('books.search')}</Button>
            {q && <Link href="/books"><Button variant="ghost" type="button" className="rounded-[12px] h-10">{tt('books.clear')}</Button></Link>}
          </form>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Card key={book.id} className="group p-5 hover:shadow-[0_8px_24px_rgba(15,61,46,0.08),0_2px_8px_rgba(15,61,46,0.04)] hover:-translate-y-[1px] hover:border-[#0f3d2e]/10 transition-all duration-300">
              <div className="flex items-start justify-between gap-2">
                <Badge className="rounded-[8px] bg-[#0f3d2e]/5 text-[#0f3d2e] border-[#0f3d2e]/10 text-[10.5px] font-semibold tracking-wide">{book.sku}</Badge>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#faf6ee] text-[#4f7a5c] border border-[#0f3d2e]/5">{book.category || tt('books.uncategorized')}</span>
              </div>
              <h3 className="mt-3.5 font-serif text-[16px] font-semibold leading-[1.3] line-clamp-2 text-[#0f3d2e] group-hover:text-[#0f3d2e]">{(!isZh && (book.title_en || book.metadata?.title_en)) ? (book.title_en || book.metadata?.title_en) : book.title}</h3>
              {isZh && (book.title_en || book.metadata?.title_en) ? <p className="mt-1 text-[11px] text-[#4f7a5c] font-medium">{book.title_en || book.metadata?.title_en}</p> : null}
              {!isZh && (book.title_en || book.metadata?.title_en) ? <p className="mt-1 text-[11px] text-[#4f7a5c] line-clamp-1">{book.title}</p> : null}
              <p className="mt-2 text-[12px] text-[#4f7a5c] flex items-center gap-1.5">
                {book.author ? <span className="font-medium">{book.author}</span> : null}
                {book.publisher ? <span className="opacity-60">· {book.publisher}</span> : null}
              </p>
              {(book.shelf_position || (book as any).metadata?.shelf_position) ? <p className="mt-1 text-[11px] font-medium text-[#0f3d2e]/70 flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[#d26a39]" />{isZh ? '书架：' : 'Shelf: '}{book.shelf_position || (book as any).metadata?.shelf_position}</p> : null}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[15px] font-bold tracking-tight text-[#0f3d2e]">{formatCurrency(book.current_price || 0)}</span>
                <div className="flex gap-1">
                  <Link href={`/books/${book.id}/edit`}><Button size="sm" variant="ghost" className="h-8 px-3 text-[11px] rounded-[9px] hover:bg-[#0f3d2e] hover:text-white transition-colors font-medium">{isZh ? '编辑' : 'Edit'}</Button></Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {books.length === 0 && (
          <Card className="py-16 text-center bg-gradient-to-br from-white to-[#faf6ee]/50 border-dashed">
            <div className="w-14 h-14 mx-auto rounded-[16px] bg-[#faf6ee] flex items-center justify-center mb-4">
              <span className="text-[24px] opacity-40">📚</span>
            </div>
            <p className="text-[14px] font-medium text-[#0f3d2e]">{tt('books.notFound')}{q ? tt('books.notFoundQuery', { q }) : ''}</p>
            <Link href="/books/new" className="mt-4 inline-block"><Button size="sm" className="rounded-[10px]">{isZh ? '添加第一本' : 'Add first book'}</Button></Link>
          </Card>
        )}

        {mode === 'demo' && <div className="rounded-[12px] bg-amber-50 border border-amber-100 px-3.5 py-2.5 text-[11px] text-amber-800 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />{tt('common.demoMode')}</div>}
      </div>
    </AppShell>
  );
}
