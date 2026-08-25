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
        <Button variant="secondary">{tt('books.addBook')}</Button>
      </Link>
    }>
      <div className="space-y-4">
        <form method="GET" action="/books" className="flex gap-2">
          <Input name="q" defaultValue={q} placeholder={tt('books.searchPlaceholder')} className="max-w-[360px]" />
          <Button type="submit" variant="ghost">{tt('books.search')}</Button>
          {q && <Link href="/books"><Button variant="ghost" type="button">{tt('books.clear')}</Button></Link>}
        </form>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Card key={book.id} className="group transition-all hover:shadow-[rgba(15,61,46,0.08)_0px_4px_16px] hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <Badge>{book.sku}</Badge>
                <span className="text-[11px] text-[#4f7a5c]">{book.category || tt('books.uncategorized')}</span>
              </div>
              <h3 className="mt-3 font-serif text-[16px] leading-tight line-clamp-2">{(!isZh && (book.title_en || book.metadata?.title_en)) ? (book.title_en || book.metadata?.title_en) : book.title}</h3>
              {isZh && (book.title_en || book.metadata?.title_en) ? <p className="mt-1 text-[11px] text-[#4f7a5c]">{book.title_en || book.metadata?.title_en}</p> : null}
              {!isZh && (book.title_en || book.metadata?.title_en) ? <p className="mt-1 text-[11px] text-[#4f7a5c]">{book.title}</p> : null}
              <p className="mt-1 text-[12px] text-[#4f7a5c]">{book.author || ''} {book.publisher ? `· ${book.publisher}` : ''}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[13px] font-semibold">{formatCurrency(book.current_price || 0)}</span>
                <div className="flex gap-1">
                  <Link href={`/books/${book.id}/edit`}><Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">{isZh ? '编辑' : 'Edit'}</Button></Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {books.length === 0 && (
          <Card className="py-12 text-center">
            <p className="text-[13px] text-[#4f7a5c]">{tt('books.notFound')}{q ? tt('books.notFoundQuery', { q }) : ''}</p>
            <Link href="/books/new" className="mt-3 inline-block"><Button size="sm">{isZh ? '添加第一本' : 'Add first book'}</Button></Link>
          </Card>
        )}

        {mode === 'demo' && <div className="rounded-[12px] bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{tt('common.demoMode')}</div>}
      </div>
    </AppShell>
  );
}
