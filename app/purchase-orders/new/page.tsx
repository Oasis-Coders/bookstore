'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookAutocomplete } from '@/components/ui/book-autocomplete';
import { useT } from '@/lib/i18n/use-t';
import { useUnsavedGuard } from '@/components/ui/use-unsaved-guard';
import { createPODraft, getSupplierBooks } from '../actions';
import Link from 'next/link';

type SupplierOpt = { id: string; name_zh: string; code: string };
type BookOpt = { id: string; title: string; sku: string; title_en?: string; shelf_position?: string };
type DraftRow = { key: number; book_id: string; quantity: string };

export default function NewPOPage() {
  const router = useRouter();
  const { lang } = useT();
  const isZh = lang === 'zh';

  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [books, setBooks] = useState<BookOpt[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<DraftRow[]>([{ key: 0, book_id: '', quantity: '' }]);
  const [nextKey, setNextKey] = useState(1);

  // 供应商历史书目（导入勾选）
  const [histBooks, setHistBooks] = useState<{ book_id: string; title: string; sku: string }[]>([]);
  const [histChecked, setHistChecked] = useState<Record<string, { qty: string }>>({});
  const [histLoading, setHistLoading] = useState(false);

  const poDirty = !submitting && (supplierId !== '' || rows.some((r) => r.book_id !== '' || r.quantity !== '') || notes !== '');
  useUnsavedGuard(poDirty, isZh);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setLoadingOpts(false); return; }
    (async () => {
      const [sRes, bRes] = await Promise.all([
        supabase.from('suppliers').select('id, name_zh, code').eq('is_active', true).limit(50),
        supabase.from('books').select('id, title, sku, title_en, shelf_position').eq('is_active', true).order('title').limit(300),
      ]);
      setSuppliers((sRes.data as any) || []);
      setBooks((bRes.data as any) || []);
      setLoadingOpts(false);
    })();
  }, []);

  // 供应商切换 -> 拉历史书目
  useEffect(() => {
    if (!supplierId) { setHistBooks([]); setHistChecked({}); return; }
    setHistLoading(true);
    getSupplierBooks(supplierId).then((list) => {
      setHistBooks(list);
      setHistChecked({});
      setHistLoading(false);
    }).catch(() => setHistLoading(false));
  }, [supplierId]);

  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);

  function addRow() {
    setRows((r) => [...r, { key: nextKey, book_id: '', quantity: '' }]);
    setNextKey((k) => k + 1);
  }
  function removeRow(key: number) {
    setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.key !== key)));
  }
  function patchRow(key: number, patch: Partial<DraftRow>) {
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }
  function importFromHistory() {
    const picked = histBooks.filter((b) => histChecked[b.book_id]);
    if (!picked.length) return;
    setRows((r) => {
      const existing = new Set(r.map((x) => x.book_id).filter(Boolean));
      const fresh = r.filter((x) => x.book_id !== '' || x.quantity !== '');
      const added = picked.filter((b) => !existing.has(b.book_id)).map((b, i) => ({
        key: nextKey + i, book_id: b.book_id, quantity: histChecked[b.book_id].qty || '',
      }));
      return [...fresh, ...added];
    });
    setNextKey((k) => k + picked.length);
    setHistChecked({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supplierId) {
      setError(isZh ? '请选择供应商' : 'Please select a supplier');
      document.getElementById('po-supplier')?.focus();
      return;
    }
    const lines = rows
      .filter((r) => r.book_id && Number(r.quantity) > 0)
      .map((r) => ({ book_id: r.book_id, quantity: Math.floor(Number(r.quantity)) }));
    if (lines.length === 0) {
      setError(isZh ? '请至少添加一种图书并填写数量' : 'Please add at least one book with quantity');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createPODraft({ supplier_id: supplierId, notes, order_date: orderDate, lines });
      if (!res.success) throw new Error(res.error || (isZh ? '创建失败' : 'Failed'));
      router.push(`/purchase-orders/${res.poId}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || (isZh ? '创建失败' : 'Failed to create'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title={isZh ? '新建采购单' : 'New PO'} titleZh="新建采购单" eyebrow={isZh ? '活水书房' : 'COCM Bookshop'}>
      <div className="mx-auto max-w-[680px]">
        <Link href="/purchase-orders" className="mb-4 inline-flex text-[13px] text-[#5b5f94] hover:text-cocm-ink">
          ← {isZh ? '返回采购单' : 'Back to Purchase Orders'}
        </Link>
        <Card>
          <CardTitle>{isZh ? '新建采购单' : 'New Purchase Order'}</CardTitle>
          <div className="mt-2 rounded-[10px] bg-cocm-paper p-3 text-[11px] text-[#5b5f94]">
            {isZh ? '草稿只记录要进的书和数量；进货价等到收货时再填（实际结算价）。要采购新书？先去书库添加新书，再来填采购单。' : 'Draft only records books and quantities; enter actual unit cost when receiving. New book? Add it to Books first.'}
            <Link href="/books/new" className="ml-2 text-cocm-ink underline font-medium">{isZh ? '去添加新书' : 'Add new book'}</Link>
          </div>
          {error && <div aria-live="polite" className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="po-supplier" className="text-[12px] font-semibold">{isZh ? '供应商 *' : 'Supplier *'}</label>
              <select
                id="po-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="mt-1 flex h-11 w-full rounded-[20px] border border-cocm-ink/15 bg-white px-4 text-[13px]"
              >
                <option value="">{isZh ? '选择供应商' : 'Select supplier'}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name_zh} ({s.code})</option>
                ))}
              </select>
            </div>

            {/* 供应商历史书目导入 */}
            {supplierId && (
              <div className="rounded-[12px] border border-cocm-ink/10 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold">{isZh ? '从该供应商历史订单导入' : 'Import from supplier history'}</p>
                  {histLoading && <span className="text-[11px] text-[#5b5f94]">{isZh ? '加载中…' : 'Loading…'}</span>}
                </div>
                {histBooks.length === 0 && !histLoading ? (
                  <p className="mt-2 text-[11px] text-[#5b5f94]">{isZh ? '该供应商暂无历史订单书目' : 'No history for this supplier yet'}</p>
                ) : (
                  <>
                    <div className="mt-2 max-h-[180px] space-y-1.5 overflow-y-auto">
                      {histBooks.map((b) => (
                        <label key={b.book_id} className="flex cursor-pointer items-center gap-2 rounded-[10px] bg-cocm-paper px-2.5 py-1.5 text-[12px]">
                          <input
                            type="checkbox"
                            checked={!!histChecked[b.book_id]}
                            onChange={(e) => setHistChecked((m) => (e.target.checked ? { ...m, [b.book_id]: { qty: '' } } : Object.fromEntries(Object.entries(m).filter(([k]) => k !== b.book_id))))}
                            className="h-4 w-4 accent-[#2d2f92]"
                          />
                          <span className="min-w-0 flex-1 truncate">{b.title} <span className="text-[#5b5f94]">({b.sku})</span></span>
                          {histChecked[b.book_id] && (
                            <input
                              type="number" min="1" placeholder={isZh ? '数量' : 'Qty'}
                              value={histChecked[b.book_id].qty}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setHistChecked((m) => ({ ...m, [b.book_id]: { qty: e.target.value } }))}
                              className="h-8 w-[72px] rounded-[8px] border border-cocm-ink/15 bg-white px-2 text-[12px]"
                            />
                          )}
                        </label>
                      ))}
                    </div>
                    <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={importFromHistory} disabled={!Object.keys(histChecked).length}>
                      {isZh ? `导入已勾选 (${Object.keys(histChecked).length})` : `Import checked (${Object.keys(histChecked).length})`}
                    </Button>
                  </>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold">{isZh ? '图书明细 *（可多行）' : 'Books * (multiple rows)'}</label>
                <button type="button" onClick={addRow} className="text-[12px] font-medium text-cocm-ink underline">＋ {isZh ? '加一行' : 'Add row'}</button>
              </div>
              <div className="mt-2 space-y-2">
                {rows.map((r) => (
                  <div key={r.key} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <BookAutocomplete
                        id={`po-book-${r.key}`}
                        books={books}
                        value={r.book_id}
                        onChange={(id) => patchRow(r.key, { book_id: id })}
                        isZh={isZh}
                        placeholder={isZh ? '输入书名/代号…' : 'Type title/sku…'}
                      />
                      {r.book_id && bookMap.get(r.book_id) && (
                        <p className="mt-0.5 truncate text-[10px] text-[#5b5f94]">{bookMap.get(r.book_id)!.title_en || bookMap.get(r.book_id)!.sku}</p>
                      )}
                    </div>
                    <Input
                      value={r.quantity}
                      onChange={(e) => patchRow(r.key, { quantity: e.target.value })}
                      type="number" inputMode="numeric" min="1" placeholder={isZh ? '数量' : 'Qty'}
                      aria-label={isZh ? '数量' : 'Quantity'}
                      className="w-[84px]"
                    />
                    <button type="button" onClick={() => removeRow(r.key)} aria-label={isZh ? '删除这一行' : 'Remove row'} className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[16px] text-red-400 hover:bg-red-50 hover:text-red-600">×</button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="po-order-date" className="text-[12px] font-semibold">{isZh ? '下单日期 *' : 'Order Date *'}</label>
              <Input id="po-order-date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} type="date" className="mt-1" required />
            </div>
            <div>
              <label htmlFor="po-notes" className="text-[12px] font-semibold">{isZh ? '备注' : 'Notes'}</label>
              <Input id="po-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
            </div>
            <div className="flex gap-2 pt-2">
              <Link href="/purchase-orders" className="flex-1">
                <Button variant="ghost" className="w-full" type="button">{isZh ? '取消' : 'Cancel'}</Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={submitting || loadingOpts}>
                {submitting ? (isZh ? '创建中…' : 'Creating…') : isZh ? '创建草稿' : 'Create Draft'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
