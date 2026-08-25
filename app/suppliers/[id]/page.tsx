import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Demo mode - 供应商详情不可用</div>;

  const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', id).single();
  if (!supplier) notFound();

  const { data: recentPOs } = await supabase.from('purchase_orders').select('po_number, status, order_date, subtotal').eq('supplier_id', id).order('created_at', { ascending: false }).limit(5);

  return (
    <AppShell title={supplier.name_zh} titleZh={supplier.name_zh} eyebrow={supplier.code}>
      <div className="mx-auto max-w-[640px] space-y-4">
        <Link href="/suppliers" className="inline-flex text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">← 返回供应商</Link>
        
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-serif text-[22px]">{supplier.name_zh}</p>
              {supplier.name_en && <p className="text-[13px] text-[#4f7a5c]">{supplier.name_en}</p>}
            </div>
            <Badge>{supplier.code}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
            {supplier.contact_name && <div><p className="text-[#4f7a5c]">联系人</p><p className="font-medium">{supplier.contact_name}</p></div>}
            {supplier.phone && <div><p className="text-[#4f7a5c]">电话</p><p>{supplier.phone}</p></div>}
            {supplier.email && <div><p className="text-[#4f7a5c]">邮箱</p><p>{supplier.email}</p></div>}
            {supplier.payment_terms && <div><p className="text-[#4f7a5c]">付款条件</p><p>{supplier.payment_terms}</p></div>}
          </div>
          {supplier.address && <p className="mt-3 text-[12px] text-[#4f7a5c]">地址：{supplier.address}</p>}
          {supplier.notes && <p className="mt-2 text-[12px] text-[#0f3d2e]/70">{supplier.notes}</p>}
        </Card>

        <Card>
          <CardTitle>最近采购单</CardTitle>
          <div className="mt-3 space-y-2">
            {(recentPOs || []).map((po: any) => (
              <div key={po.po_number} className="flex items-center justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2 text-[12px]">
                <span>{po.po_number}</span>
                <div className="flex items-center gap-2"><Badge>{po.status}</Badge><span>£{po.subtotal}</span></div>
              </div>
            ))}
            {(!recentPOs || recentPOs.length === 0) && <p className="text-[12px] text-[#4f7a5c]">暂无采购单</p>}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
