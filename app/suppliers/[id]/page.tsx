import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Demo</div>;
  const { data: s } = await supabase.from('suppliers').select('*').eq('id', id).single();
  if (!s) notFound();
  const { data: pos } = await supabase.from('purchase_orders').select('po_number, status, created_at').eq('supplier_id', id).order('created_at', { ascending: false }).limit(5);

  return (
    <AppShell title={s.name_zh} titleZh={s.name_zh} eyebrow={s.code} actions={
      <Link href={`/suppliers/${s.id}/edit`}><Button>编辑</Button></Link>
    }>
      <div className="mx-auto max-w-[640px] space-y-4">
        <Card>
          <CardTitle>供应商信息</CardTitle>
          <div className="mt-3 space-y-2 text-[13px]">
            <p>代号: <span className="font-mono">{s.code}</span></p>
            <p>中文: {s.name_zh}</p>
            {s.name_en && <p>英文: {s.name_en}</p>}
            {s.contact_person && <p>联系人: {s.contact_person}</p>}
            {s.phone && <p>电话: {s.phone}</p>}
            {s.email && <p>邮箱: {s.email}</p>}
            {s.payment_terms && <p>账期: {s.payment_terms}</p>}
            {s.address && <p>地址: {s.address}</p>}
            {s.notes && <p>备注: {s.notes}</p>}
            <p>状态: <Badge>{s.is_active ? '启用' : '停用'}</Badge></p>
          </div>
        </Card>
        <Card>
          <CardTitle>最近采购单</CardTitle>
          <div className="mt-3 space-y-2">
            {(pos || []).map((po: any) => (
              <div key={po.po_number} className="flex justify-between rounded-[10px] bg-[#faf6ee]/60 px-3 py-2 text-[12px]">
                <span className="font-mono">{po.po_number}</span><Badge>{po.status}</Badge>
              </div>
            ))}
            {(!pos || pos.length === 0) && <p className="text-[12px] text-[#4f7a5c]">暂无采购单</p>}
          </div>
        </Card>
        <div className="flex gap-2">
          <Link href="/suppliers"><Button variant="ghost">返回列表</Button></Link>
          <Link href={`/suppliers/${s.id}/edit`}><Button>编辑供应商</Button></Link>
        </div>
      </div>
    </AppShell>
  );
}
