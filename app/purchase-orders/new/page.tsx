import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function createPOAction(formData: FormData) {
  'use server';
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('No supabase');
  const supplierId = String(formData.get('supplier_id') || '');
  const notes = String(formData.get('notes') || '') || null;
  
  // Generate PO number
  const poNumber = `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  
  const { data: profile } = await supabase.auth.getUser();
  const createdBy = profile.user?.id;
  if (!createdBy) throw new Error('Not logged in');

  const { data, error } = await supabase.from('purchase_orders').insert({
    po_number: poNumber,
    supplier_id: supplierId,
    notes,
    created_by: createdBy,
    status: 'draft',
  }).select('id').single();
  
  if (error) throw error;
  
  // Add lines if provided
  const bookId = String(formData.get('book_id') || '');
  const qty = Number(formData.get('quantity') || 0);
  const unitCost = Number(formData.get('unit_cost') || 0);
  
  if (bookId && qty > 0) {
    await supabase.from('purchase_order_lines').insert({
      purchase_order_id: data.id,
      book_id: bookId,
      quantity_ordered: qty,
      unit_cost: unitCost,
    });
  }
  
  revalidatePath('/purchase-orders');
  redirect('/purchase-orders');
}

export default async function NewPOPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  let suppliers: any[] = [];
  let books: any[] = [];
  
  if (supabase) {
    const [sRes, bRes] = await Promise.all([
      supabase.from('suppliers').select('id, name_zh, code').eq('is_active', true).limit(20),
      supabase.from('books').select('id, title, sku').eq('is_active', true).limit(20),
    ]);
    suppliers = sRes.data || [];
    books = bRes.data || [];
  }

  return (
    <AppShell title="New PO" titleZh="新建采购单" eyebrow="活水书房">
      <div className="mx-auto max-w-[640px]">
        <Link href="/purchase-orders" className="mb-4 inline-flex text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">← 返回采购单</Link>
        <Card>
          <CardTitle>新建采购单</CardTitle>
          {error && <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
          <form action={createPOAction} className="mt-6 space-y-4">
            <div>
              <label className="text-[12px] font-semibold">供应商 *</label>
              <select name="supplier_id" required className="mt-1 flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 text-[13px]">
                <option value="">选择供应商</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name_zh} ({s.code})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[12px] font-semibold">图书</label>
                <select name="book_id" className="mt-1 flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 text-[13px]">
                  <option value="">选择图书</option>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.sku})</option>)}
                </select>
              </div>
              <div><label className="text-[12px] font-semibold">数量</label><Input name="quantity" type="number" min="1" className="mt-1" /></div>
            </div>
            <div><label className="text-[12px] font-semibold">进货价</label><Input name="unit_cost" type="number" step="0.01" placeholder="单本成本" className="mt-1" /></div>
            <div><label className="text-[12px] font-semibold">备注</label><Input name="notes" className="mt-1" /></div>
            <div className="flex gap-2 pt-2">
              <Link href="/purchase-orders" className="flex-1"><Button variant="ghost" className="w-full" type="button">取消</Button></Link>
              <Button type="submit" className="flex-1">创建草稿</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
