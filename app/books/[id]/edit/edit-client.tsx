'use client';
import { useT } from '@/lib/i18n/use-t';
import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateBook, deleteBook } from '@/app/books/actions';
import { CategorySelect } from '@/components/ui/category-select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function EditBookClient({ book, canDelete }: { book: any; canDelete?: boolean }) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();
  const { lang, isZh } = useT();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const fd = new FormData(e.currentTarget);
    try {
      await updateBook(book.id, fd);
      setMsg(isZh ? '已保存' : 'Saved');
      setTimeout(() => router.push('/books'), 800);
    } catch (err: any) {
      setMsg(err.message || (isZh ? '保存失败' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(isZh ? `确定删除《${book.title}》？` : `Delete "${book.title}"?`)) return;
    try {
      await deleteBook(book.id);
      router.push('/books');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AppShell title="Edit Book" titleZh="编辑图书" eyebrow={book.sku}>
      <div className="mx-auto max-w-[640px] space-y-4">
        <Card>
          <CardTitle>{isZh ? '编辑图书' : 'Edit Book'}</CardTitle>
          {msg && (
            <div
              className={`mt-3 rounded-[10px] px-3 py-2 text-[12px] ${
                msg.includes('失败') || msg.toLowerCase().includes('fail') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}
            >
              {msg}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-sku" className="text-[11px] text-[#4f7a5c]">{isZh ? '代号 *' : 'Code *'}</label>
                <Input id="edit-sku" name="sku" defaultValue={book.sku} required spellCheck={false} className="mt-1" />
              </div>
              <div>
                <label htmlFor="edit-price" className="text-[11px] text-[#4f7a5c]">{isZh ? '现售价 (GBP)' : 'Current Price (GBP)'}</label>
                <Input id="edit-price" name="current_price" type="number" step="0.01" defaultValue={book.current_price} className="mt-1" />
              </div>
            </div>
            <div>
              <label htmlFor="edit-title" className="text-[11px] text-[#4f7a5c]">{isZh ? '书名 *' : 'Title *'}</label>
              <Input id="edit-title" name="title" defaultValue={book.title} required className="mt-1" />
            </div>
            <div>
              <label htmlFor="edit-title-en" className="text-[11px] text-[#4f7a5c]">{isZh ? '英文书名 (可选)' : 'English Title (optional)'}</label>
              <Input id="edit-title-en" name="title_en" defaultValue={book.title_en || book.metadata?.title_en || ''} placeholder={isZh ? '如 The Way of Victory' : 'English title'} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-title-s" className="text-[11px] text-[#4f7a5c]">{isZh ? '简体标题' : 'Simplified'}</label>
                <Input id="edit-title-s" name="title_simplified" defaultValue={book.title_simplified || book.metadata?.title_simplified || ''} className="mt-1" />
              </div>
              <div>
                <label htmlFor="edit-title-t" className="text-[11px] text-[#4f7a5c]">{isZh ? '繁体标题' : 'Traditional'}</label>
                <Input id="edit-title-t" name="title_traditional" defaultValue={book.title_traditional || book.metadata?.title_traditional || ''} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-author" className="text-[11px] text-[#4f7a5c]">{isZh ? '作者' : 'Author'}</label>
                <Input id="edit-author" name="author" defaultValue={book.author || ''} className="mt-1" />
              </div>
              <div>
                <label htmlFor="edit-publisher" className="text-[11px] text-[#4f7a5c]">{isZh ? '出版社' : 'Publisher'}</label>
                <Input id="edit-publisher" name="publisher" defaultValue={book.publisher || ''} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-isbn13" className="text-[11px] text-[#4f7a5c]">ISBN13</label>
                <Input id="edit-isbn13" name="isbn13" defaultValue={book.isbn13 || ''} spellCheck={false} inputMode="numeric" className="mt-1" />
              </div>
              <div>
                <label htmlFor="edit-category" className="text-[11px] text-[#4f7a5c]">{isZh ? '分类' : 'Category'}</label>
                <CategorySelect id="edit-category" name="category" defaultValue={book.category || ''} />
              </div>
              <div>
                <label htmlFor="edit-shelf" className="text-[11px] text-[#4f7a5c]">{isZh ? '书架位置' : 'Shelf Position'}</label>
                <Input id="edit-shelf" name="shelf_position" defaultValue={book.shelf_position || book.metadata?.shelf_position || ''} placeholder={isZh ? '如 A-3-2' : 'e.g. A-3-2'} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-threshold" className="text-[11px] text-[#4f7a5c]">{isZh ? '低库存阈值' : 'Low Stock Threshold'}</label>
                <Input id="edit-threshold" name="low_stock_threshold" type="number" defaultValue={book.low_stock_threshold} className="mt-1" />
              </div>
              <div>
                <label htmlFor="edit-active" className="text-[11px] text-[#4f7a5c]">{isZh ? '状态' : 'Status'}</label>
                <select
                  id="edit-active"
                  name="is_active"
                  defaultValue={String(book.is_active)}
                  className="mt-1 w-full rounded-[10px] border border-[#0f3d2e]/15 bg-white text-[#0f3d2e] px-3 py-2 text-[13px]"
                >
                  <option value="true">{isZh ? '启用' : 'Active'}</option>
                  <option value="false">{isZh ? '停用' : 'Inactive'}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (isZh ? '保存中…' : 'Saving…') : isZh ? '保存修改' : 'Save Changes'}
              </Button>
              <Link href="/books">
                <Button variant="ghost" type="button">
                  {isZh ? '返回' : 'Back'}
                </Button>
              </Link>
              {canDelete && (
                <Button variant="ghost" type="button" onClick={handleDelete} className="ml-auto text-red-600 hover:bg-red-50">
                  {isZh ? '删除' : 'Delete'}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
