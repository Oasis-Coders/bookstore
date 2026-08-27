'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/use-t';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createBook } from '../actions';
import { CategorySelect } from '@/components/ui/category-select';
import Link from 'next/link';

export default function NewBookPage() {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [isbnLookup, setIsbnLookup] = useState('');
  const [scanning, setScanning] = useState(false);
  const skuRef = useRef<HTMLInputElement>(null);
  const isbnRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      await createBook(fd);
      router.push('/books');
    } catch (err: any) {
      setError(err?.message || (isZh ? '创建失败' : 'Failed to create'));
    } finally {
      setSaving(false);
    }
  };

  const handleBarcodeScan = (value: string) => {
    // Barcode scanner outputs ISBN or SKU
    const cleaned = value.trim().replace(/[^0-9Xx\-]/g, '').replace(/-/g, '');
    if (cleaned.length >= 10) {
      // Looks like ISBN
      if (isbnRef.current) isbnRef.current.value = cleaned;
      if (skuRef.current && !skuRef.current.value) {
        skuRef.current.value = `BOOK-${cleaned.slice(-6)}`;
      }
      // Try to lookup book info from Open Library
      lookupISBN(cleaned);
    } else {
      // Treat as SKU
      if (skuRef.current) skuRef.current.value = value.toUpperCase();
    }
  };

  const lookupISBN = async (isbn: string) => {
    try {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const data = await res.json();
      const book = data[`ISBN:${isbn}`];
      if (book && titleRef.current) {
        if (!titleRef.current.value) {
          titleRef.current.value = book.title || '';
        }
      }
    } catch {}
  };

  const handleScanInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (e.target as HTMLInputElement).value;
      if (val) handleBarcodeScan(val);
    }
  };

  return (
    <AppShell title="New Book" titleZh="添加图书" eyebrow="活水书房">
      <div className="mx-auto max-w-[640px]">
        <div className="mb-4">
          <Link href="/books" className="inline-flex items-center text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">
            {isZh ? '← 返回书库' : '← Back to Books'}
          </Link>
        </div>

        <Card>
          <CardTitle>{isZh ? '添加新书' : 'Add Book'}</CardTitle>
          <div className="mt-3 rounded-[12px] border border-dashed border-[#0f3d2e]/20 bg-[#faf6ee]/50 p-3">
            <p className="text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '扫码添加图书' : 'Scan to Add Book'}</p>
            <p className="mt-1 text-[11px] text-[#4f7a5c]">{isZh ? '扫ISBN条码自动填入ISBN和代号，尝试联网获取书名。USB扫码枪即插即用。' : 'Scan ISBN barcode to auto-fill ISBN and Code, tries to fetch title online. USB scanner plug-and-play.'}</p>
            <div className="mt-2 flex gap-2">
              <Input 
                value={isbnLookup}
                onChange={e => setIsbnLookup(e.target.value)}
                onKeyDown={handleScanInput}
                placeholder={isZh ? '扫码或输入ISBN/条码后回车...' : 'Scan or type ISBN/barcode then Enter...'} 
                className="flex-1 h-9 text-[12px]"
              />
              <Button type="button" size="sm" variant="secondary" className="h-9" onClick={() => { if (isbnLookup) handleBarcodeScan(isbnLookup); setScanning(true); setTimeout(()=>setScanning(false), 2000); }}>
                {scanning ? (isZh ? '已扫' : 'Scanned') : (isZh ? '扫码' : 'Scan')}
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-[#4f7a5c]">{isZh ? '运作：扫码枪 = 键盘，扫出数字字符串如 9781234567890，系统收到后填入ISBN，自动生成 BOOK-xxxx 代号' : 'How: scanner = keyboard, outputs string like 9781234567890, system fills ISBN, auto-generates BOOK-xxxx Code'}</p>
          </div>

          <p className="mt-3 text-[13px] text-[#0f3d2e]/70">
            {isZh ? '支持中文书名，代号必须唯一' : 'Supports Chinese titles, Code must be unique'}
          </p>

          {error && (
            <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '代号 * (扫码自动生成)' : 'Code * (auto from scan)'}</label>
                <Input ref={skuRef} name="sku" placeholder={isZh ? '如 BOOK-001 或扫码生成' : 'e.g. BOOK-001 or auto from scan'} required className="mt-1" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '分类' : 'Category'}</label>
                <CategorySelect name="category" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '书架位置' : 'Shelf Position'}</label>
              <Input name="shelf_position" placeholder={isZh ? '如 A-3-2 或 书架B第2层' : 'e.g. A-3-2 or Shelf B Level 2'} className="mt-1" />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '中文书名 *' : 'Title (ZH) *'}</label>
              <Input ref={titleRef} name="title" placeholder={isZh ? '如 活水得胜之路' : 'Chinese title'} required className="mt-1" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '英文书名 (可选)' : 'English Title (optional)'}</label>
              <Input name="title_en" placeholder={isZh ? '如 The Way of Victory' : 'English title for display'} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '简体标题 (可选)' : 'Simplified (optional)'}</label>
                <Input name="title_simplified" placeholder={isZh ? '简体' : 'Simplified Chinese'} className="mt-1" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '繁体标题 (可选)' : 'Traditional (optional)'}</label>
                <Input name="title_traditional" placeholder={isZh ? '繁體' : 'Traditional Chinese'} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '出版社' : 'Publisher'}</label>
                <Input name="publisher" placeholder={isZh ? '出版社' : 'Publisher'} className="mt-1" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '作者' : 'Author'}</label>
                <Input name="author" placeholder={isZh ? '作者' : 'Author'} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '现售价 (GBP)' : 'Current Price (GBP)'}</label>
                <Input name="current_price" type="number" step="0.01" placeholder="12.50" className="mt-1" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '低库存阈值' : 'Low Stock Threshold'}</label>
                <Input name="low_stock_threshold" type="number" placeholder="5" defaultValue="5" className="mt-1" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">ISBN-13 {isZh ? '(扫码自动填)' : '(auto from scan)'}</label>
              <Input ref={isbnRef} name="isbn13" placeholder={isZh ? '扫ISBN条码自动填' : 'Auto from ISBN scan'} className="mt-1" />
            </div>

            <div className="flex gap-2 pt-2">
              <Link href="/books" className="flex-1">
                <Button variant="ghost" className="w-full" type="button">
                  {isZh ? '取消' : 'Cancel'}
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (isZh ? '创建中...' : 'Creating...') : isZh ? '创建' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
