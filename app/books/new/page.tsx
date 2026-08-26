'use client';

import { useState } from 'react';
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
          <p className="mt-2 text-[13px] text-[#0f3d2e]/70">
            {isZh ? '支持中文书名，代号/SKU 必须唯一' : 'Supports Chinese titles, SKU must be unique'}
          </p>

          {error && (
            <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '代号 / SKU *' : 'Code / SKU *'}</label>
                <Input name="sku" placeholder={isZh ? '如 BOOK-001' : 'e.g. BOOK-001'} required className="mt-1" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '分类' : 'Category'}</label>
                <CategorySelect name="category" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '书架位置' : 'Shelf Position'}</label>
              <Input name="shelf_position" placeholder={isZh ? '如 A-3-2 或 书架B第2层' : 'e.g. A-3-2 or Shelf B Level 2'} className="mt-1" />
              <p className="mt-1 text-[11px] text-[#4f7a5c]">{isZh ? '书在书架上的实际位置，方便找书' : 'Physical location on shelf for easy finding'}</p>
            </div>

                        <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '中文书名 *' : 'Title (ZH) *'}</label>
              <Input name="title" placeholder={isZh ? '如 活水得胜之路' : 'Chinese title'} required className="mt-1" />
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
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">ISBN-13</label>
              <Input name="isbn13" placeholder={isZh ? '可选' : 'Optional'} className="mt-1" />
            </div>

            <div className="flex gap-2 pt-2">
              <Link href="/books" className="flex-1">
                <Button variant="ghost" className="w-full" type="button">{isZh ? '取消' : 'Cancel'}</Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (isZh ? '创建中…' : 'Creating…') : isZh ? '创建图书' : 'Create Book'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
