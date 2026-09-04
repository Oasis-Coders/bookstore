'use client';

import { useState, useRef } from 'react';
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
  title_simplified?: string | null;
  title_traditional?: string | null;
  metadata?: any;
  id: string;
  sku: string;
  title: string;
  publisher?: string;
  author?: string;
  current_price?: number;
  category?: string;
  low_stock_threshold?: number;
  on_hand?: number;
};

export function BooksClient({ books, q, mode }: { books: Book[]; q: string; mode: 'live' | 'empty' }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const [scanning, setScanning] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // barcode scanners send Enter after code - let form submit
    }
  };

  const handleStartScan = () => {
    setScanning(true);
    searchInputRef.current?.focus();
    setTimeout(() => setScanning(false), 3000);
  };

  return (
    <AppShell title={tt('books.title')} titleZh={tt('books.title')} eyebrow={tt('books.count', { n: books.length })} actions={
      <div className="flex gap-2">
        <Link href="/books/import">
          <Button variant="ghost" size="sm" className="rounded-[12px]">{isZh ? '批量导入' : 'Import'}</Button>
        </Link>
        <Link href="/books/new">
          <Button variant="secondary" className="rounded-[12px] shadow-[0_2px_8px_rgba(15,61,46,0.15)] hover:shadow-[0_4px_12px_rgba(15,61,46,0.25)] transition-[box-shadow,transform] hover:scale-[1.02]">+ {tt('books.addBook')}</Button>
        </Link>
      </div>
    }>
      <div className="space-y-5">
        <div className="flex flex-col gap-3">
          <form method="GET" action="/books" className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[280px] max-w-[480px]">
              <Input 
                ref={searchInputRef}
                name="q" 
                defaultValue={q} 
                aria-label={isZh ? '搜索图书' : 'Search books'}
                placeholder={isZh ? '中英文搜：书名/英文/简繁/代号/作者/书架…' : 'Search EN/ZH: title, Code, author, shelf…'} 
                className="pr-10 rounded-[12px] h-10 border-[#0f3d2e]/10 focus:border-[#0f3d2e]/20 bg-white shadow-sm" 
                onKeyDown={handleScanKeyDown}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4f7a5c]/40 text-[12px]"></span>
            </div>
            <Button type="submit" variant="ghost" className="rounded-[12px] h-10">{tt('books.search')}</Button>
            {q && <Link href="/books"><Button variant="ghost" type="button" className="rounded-[12px] h-10">{tt('books.clear')}</Button></Link>}
            <Button type="button" variant="ghost" size="sm" onClick={handleStartScan} className={`rounded-[10px] h-9 ${scanning ? 'bg-[#0f3d2e] text-white' : ''}`} title={isZh ? '外接扫码枪直接扫，支持USB扫码器' : 'Supports USB barcode scanner'}>
              {scanning ? (isZh ? '等待扫码…' : 'Scanning…') : `${isZh ? '扫码' : 'Scan'}`}
            </Button>
          </form>
          <p className="text-[11px] text-[#4f7a5c]">
            {isZh ? '支持中英文、简繁体、代号、书架位置搜索。外接USB扫码枪可直接扫码，扫码枪会自动回车搜索。' : 'Bilingual search incl. EN/ZH, simplified/traditional, Code, shelf. USB barcode scanner supported - scans auto-submit.'}
            {false && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{tt('common.demoMode')}</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Card key={book.id} className="cv-auto group p-5 hover:shadow-[0_8px_24px_rgba(15,61,46,0.08),0_2px_8px_rgba(15,61,46,0.04)] hover:-translate-y-[1px] hover:border-[#0f3d2e]/10 transition-[box-shadow,border-color,transform] duration-300">
              <div className="flex items-start justify-between gap-2">
                <Badge className="rounded-[8px] bg-[#0f3d2e]/5 text-[#0f3d2e] border-[#0f3d2e]/10 text-[10.5px] font-semibold tracking-wide">{book.sku}</Badge>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#faf6ee] text-[#4f7a5c] border border-[#0f3d2e]/5">{book.category || tt('books.uncategorized')}</span>
                  {typeof book.on_hand === 'number' && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${book.on_hand <= (book.low_stock_threshold || 3) ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                      {isZh ? `库存 ${book.on_hand}` : `Stock ${book.on_hand}`}
                    </span>
                  )}
                </div>
              </div>
              <h3 className="mt-3.5 font-serif text-[16px] font-semibold leading-[1.3] line-clamp-2 text-[#0f3d2e] group-hover:text-[#0f3d2e]">{(!isZh && (book.title_en || book.metadata?.title_en)) ? (book.title_en || book.metadata?.title_en) : book.title}</h3>
              <div className="mt-1 space-y-0.5">
                {isZh && (book.title_en || book.metadata?.title_en) ? <p className="text-[11px] text-[#4f7a5c] font-medium">EN: {book.title_en || book.metadata?.title_en}</p> : null}
                {!isZh && (book.title_en || book.metadata?.title_en) ? <p className="mt-1 text-[11px] text-[#4f7a5c] line-clamp-1">ZH: {book.title}</p> : null}
                {(book.title_simplified || book.metadata?.title_simplified) && (book.title_simplified !== book.title) ? <p className="text-[10px] text-[#4f7a5c]/70">简: {book.title_simplified || book.metadata?.title_simplified}</p> : null}
                {(book.title_traditional || book.metadata?.title_traditional) && (book.title_traditional !== book.title) ? <p className="text-[10px] text-[#4f7a5c]/70">繁: {book.title_traditional || book.metadata?.title_traditional}</p> : null}
              </div>
              <p className="mt-2 text-[12px] text-[#4f7a5c] flex items-center gap-1.5">
                {book.author ? <span className="font-medium">{book.author}</span> : null}
                {book.publisher ? <span className="opacity-60">· {book.publisher}</span> : null}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(book.shelf_position || (book as any).metadata?.shelf_position) ? <span className="text-[11px] font-medium text-[#0f3d2e]/70 flex items-center gap-1 bg-[#faf6ee] px-2 py-1 rounded-full border border-[#0f3d2e]/5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[#d26a39]" />{isZh ? '书架：' : 'Shelf: '}{book.shelf_position || (book as any).metadata?.shelf_position}</span> : null}
              </div>
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
              <span className="h-3 w-3 rounded-full bg-[#0f3d2e]/20" />
            </div>
            <p className="text-[14px] font-medium text-[#0f3d2e]">{tt('books.notFound')}{q ? tt('books.notFoundQuery', { q }) : ''}</p>
            <Link href="/books/new" className="mt-4 inline-block"><Button size="sm" className="rounded-[10px]">{isZh ? '添加第一本' : 'Add first book'}</Button></Link>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
