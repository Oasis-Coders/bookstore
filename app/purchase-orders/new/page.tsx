'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';

type SupplierOpt = { id: string; name_zh: string; code: string };
type BookOpt = { id: string; title: string; sku: string };

export default function NewPOPage() {
  const router = useRouter();
  const { lang } = useT();
  const isZh = lang === 'zh';

  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [books, setBooks] = useState<BookOpt[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    supplier_id: '',
    book_id: '',
    quantity: '',
    unit_cost: '',
    notes: '',
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoadingOpts(false);
      return;
    }
    (async () => {
      const [sRes, bRes] = await Promise.all([
        supabase.from('suppliers').select('id, name_zh, code').eq('is_active', true).limit(20),
        supabase.from('books').select('id, title, sku').eq('is_active', true).limit(20),
      ]);
      setSuppliers((sRes.data as any) || []);
      setBooks((bRes.data as any) || []);
      setLoadingOpts(false);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.supplier_id) {
      setError(isZh ? '请选择供应商' : 'Please select a supplier');
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error('Supabase not configured');

      const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const { data: userRes } = await supabase.auth.getUser();
      const createdBy = userRes.user?.id;
      if (!createdBy) throw new Error(isZh ? '未登录' : 'Not logged in');

      const { data, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          supplier_id: form.supplier_id,
          notes: form.notes || null,
          created_by: createdBy,
          status: 'draft',
        })
        .select('id')
        .single();
      if (poErr) throw poErr;

      const qty = Number(form.quantity || 0);
      const unitCost = Number(form.unit_cost || 0);
      if (form.book_id && qty > 0) {
        const { error: lineErr } = await supabase.from('purchase_order_lines').insert({
          purchase_order_id: data.id,
          book_id: form.book_id,
          quantity_ordered: qty,
          unit_cost: unitCost,
        });
        if (lineErr) throw lineErr;
      }

      router.push('/purchase-orders');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || (isZh ? '创建失败' : 'Failed to create'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title={isZh ? '新建采购单' : 'New PO'} titleZh="新建采购单" eyebrow={isZh ? '活水书房' : 'COCM Bookshop'}>
      <div className="mx-auto max-w-[640px]">
        <Link href="/purchase-orders" className="mb-4 inline-flex text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">
          ← {isZh ? '返回采购单' : 'Back to Purchase Orders'}
        </Link>
        <Card>
          <CardTitle>{isZh ? '新建采购单' : 'New Purchase Order'}</CardTitle>
          {error && <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-[12px] font-semibold">{isZh ? '供应商 *' : 'Supplier *'}</label>
              <select
                value={form.supplier_id}
                onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                required
                className="mt-1 flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 text-[13px]"
              >
                <option value="">{isZh ? '选择供应商' : 'Select supplier'}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_zh} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[12px] font-semibold">{isZh ? '图书' : 'Book'}</label>
                <select
                  value={form.book_id}
                  onChange={(e) => setForm((f) => ({ ...f, book_id: e.target.value }))}
                  className="mt-1 flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 text-[13px]"
                >
                  <option value="">{isZh ? '选择图书' : 'Select book'}</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold">{isZh ? '数量' : 'Quantity'}</label>
                <Input
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  type="number"
                  min="1"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold">{isZh ? '进货价' : 'Unit Cost'}</label>
              <Input
                value={form.unit_cost}
                onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))}
                type="number"
                step="0.01"
                placeholder={isZh ? '单本成本' : 'Cost per unit'}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold">{isZh ? '备注' : 'Notes'}</label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1" />
            </div>
            <div className="flex gap-2 pt-2">
              <Link href="/purchase-orders" className="flex-1">
                <Button variant="ghost" className="w-full" type="button">
                  {isZh ? '取消' : 'Cancel'}
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (isZh ? '创建中...' : 'Creating...') : isZh ? '创建草稿' : 'Create Draft'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
