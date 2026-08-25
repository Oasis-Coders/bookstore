import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createBook } from '../actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';

async function createBookAction(formData: FormData) {
  'use server';
  try {
    await createBook(formData);
  } catch (e: any) {
    const msg = e.message || '创建失败';
    redirect(`/books/new?error=${encodeURIComponent(msg)}`);
  }
  redirect('/books');
}

export default async function NewBookPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params.error;

  return (
    <AppShell title="New Book" titleZh="添加图书" eyebrow="活水书房">
      <div className="mx-auto max-w-[640px]">
        <div className="mb-4">
          <Link href="/books" className="inline-flex items-center text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">
            ← 返回书库
          </Link>
        </div>

        <Card>
          <CardTitle>添加新书</CardTitle>
          <p className="mt-2 text-[13px] text-[#0f3d2e]/70">支持中文书名，代号/SKU 必须唯一</p>

          {error && (
            <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error}
            </div>
          )}

          <form action={createBookAction} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">代号 / SKU *</label>
                <Input name="sku" placeholder="如 BOOK-001" required className="mt-1" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">分类</label>
                <Input name="category" placeholder="如 灵修、神学" className="mt-1" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">中文书名 *</label>
              <Input name="title" placeholder="书名" required className="mt-1" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">出版社</label>
                <Input name="publisher" placeholder="出版社" className="mt-1" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">作者</label>
                <Input name="author" placeholder="作者" className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">现售价 (GBP)</label>
                <Input name="current_price" type="number" step="0.01" placeholder="12.50" className="mt-1" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">低库存阈值</label>
                <Input name="low_stock_threshold" type="number" placeholder="5" defaultValue="5" className="mt-1" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">ISBN-13</label>
              <Input name="isbn13" placeholder="可选" className="mt-1" />
            </div>

            <div className="flex gap-2 pt-2">
              <Link href="/books" className="flex-1">
                <Button variant="ghost" className="w-full" type="button">取消</Button>
              </Link>
              <Button type="submit" className="flex-1">创建图书</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
