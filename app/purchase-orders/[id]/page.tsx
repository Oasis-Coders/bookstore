import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { approvePO } from '../actions';
import { revalidatePath } from 'next/cache';

export default async function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Demo mode</div>;

  const { data: po } = await supabase.from('purchase_orders').select('*, suppliers(name_zh, code)').eq('id', id).single();
  if (!po) notFound();

  const { data: lines } = await supabase.from('purchase_order_lines').select('*, books(title, sku)').eq('purchase_order_id', id);
  const { data: locations } = await supabase.from('locations').select('id, name, code').eq('is_active', true).limit(10);

  return (
    <AppShell title={po.po_number} titleZh={po.po_number} eyebrow="采购单详情">
      <div className="mx-auto max-w-[720px] space-y-4">
        <Link href="/purchase-orders" className="inline-flex text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">← 返回采购单</Link>
        
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[18px] font-semibold">{po.po_number}</p>
              <p className="text-[13px] text-[#4f7a5c]">{po.suppliers?.name_zh} • {po.order_date}</p>
            </div>
            <Badge>{po.status}</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {po.status === 'draft' && (
              <form action={async () => { 'use server'; const { approvePO: approve } = await import('../actions'); await approve(id); }}><Button size="sm">批准 → ordered</Button></form>
            )}
            {po.status === 'approved' && (
              <form action={async () => { 'use server'; const supa = await (await import('@/lib/supabase/server')).createSupabaseServerClient(); if (supa) { await supa.from('purchase_orders').update({ status: 'ordered' }).eq('id', id); const { revalidatePath } = await import('next/cache'); revalidatePath(`/purchase-orders/${id}`); } }}><Button size="sm">标记已下单</Button></form>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>行项目</CardTitle>
          <div className="mt-3 space-y-2">
            {(lines || []).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2 text-[12px]">
                <span>{l.books?.title} ({l.books?.sku})</span>
                <span>{l.quantity_ordered} × £{l.unit_cost} = £{(l.quantity_ordered * Number(l.unit_cost)).toFixed(2)}</span>
              </div>
            ))}
            {(!lines || lines.length === 0) && <p className="text-[12px] text-[#4f7a5c]">暂无行项目</p>}
          </div>
        </Card>

        {(po.status === 'ordered' || po.status === 'partially_received' || po.status === 'approved') && (
          <Card>
            <CardTitle>收货入库</CardTitle>
            <p className="mt-2 text-[12px] text-[#4f7a5c]">选择库位，确认数量，系统会自动创建 FIFO 批次</p>
            <form action={async (fd: FormData) => {
              'use server';
              const supa = await (await import('@/lib/supabase/server')).createSupabaseServerClient();
              if (!supa) return;
              const locId = String(fd.get('location_id'));
              const lineId = String(fd.get('line_id'));
              const qty = Number(fd.get('qty'));
              const { error } = await supa.rpc('apply_purchase_receipt', {
                p_purchase_order_id: id,
                p_location_id: locId,
                p_receipt_lines: [{ purchase_order_line_id: lineId, quantity: qty }],
                p_received_at: new Date().toISOString(),
              } as any);
              if (!error) { const { revalidatePath } = await import('next/cache'); revalidatePath(`/purchase-orders/${id}`); revalidatePath('/reports'); }
            }} className="mt-3 space-y-3">
              <select name="location_id" className="flex h-10 w-full rounded-[12px] border border-[#0f3d2e]/15 px-3 text-[12px]">
                {(locations || []).map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select name="line_id" className="flex h-10 w-full rounded-[12px] border px-3 text-[12px]">
                  {(lines || []).map((l: any) => <option key={l.id} value={l.id}>{l.books?.title?.slice(0,10)} - {l.quantity_ordered}本</option>)}
                </select>
                <Input name="qty" type="number" placeholder="收货数量" min="1" />
              </div>
              <Button type="submit" size="sm" className="w-full">确认收货</Button>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
