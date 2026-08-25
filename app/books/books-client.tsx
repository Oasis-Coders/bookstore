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
  const { tt } = useT();

  return (
    <AppShell title={tt('books.title')} titleZh={tt('books.title')} eyebrow={tt('books.count', { n: books.length })} actions={
      <Link href="/books/new">
        <Button variant="secondary">{tt('books.addBook')}</Button>
      </Link>
    }>
      {/* Search */}
      <form className="mb-6 flex gap-2">
        <Input name="q" defaultValue={q} placeholder={tt('books.searchPlaceholder')} className="max-w-[420px]" />
        <Button type="submit" variant="secondary">{tt('books.search')}</Button>
        {q && <a href="/books" className="inline-flex h-11 items-center rounded-[20px] border border-[#0f3d2e]/15 px-4 text-[13px]">{tt('books.clear')}</a>}
      </form>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <Card key={book.id} className="group transition-all hover:shadow-[rgba(15,61,46,0.08)_0px_4px_16px] hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <Badge>{book.category || tt('books.uncategorized')}</Badge>
              <span className="text-[11px] text-[#4f7a5c]">{book.sku}</span>
            </div>
            <h3 className="mt-3 font-serif text-[18px] leading-tight tracking-tight line-clamp-2">{book.title}</h3>
            <p className="mt-1 text-[12px] text-[#4f7a5c]">{book.publisher} {book.author ? `• ${book.author}` : ''}</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-[11px] text-[#4f7a5c]">{tt('books.currentPrice')}</p>
                <p className="font-semibold">{formatCurrency(Number(book.current_price))}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-[#4f7a5c]">{tt('books.threshold')} {book.low_stock_threshold}</p>
                <Badge variant={mode === 'demo' ? 'warning' : 'default'}>{tt('books.viewStock')}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {books.length === 0 && (
        <Card className="mt-6 py-12 text-center">
          <p className="text-[14px] text-[#4f7a5c]">{tt('books.notFound')}{q ? tt('books.notFoundQuery', { q }) : ''}</p>
          <p className="mt-1 text-[12px] text-[#4f7a5c]/70">{tt('books.searchSupport')}</p>
        </Card>
      )}

      <div className="mt-8 rounded-[16px] bg-[#f4e8c1]/50 p-4 text-[12px] text-[#0f3d2e]/70">
        <p>{tt('books.tip')}</p>
      </div>
    </AppShell>
  );
}
