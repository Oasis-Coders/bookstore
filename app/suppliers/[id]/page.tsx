'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';

type Supplier = any;
type PO = { id: string; po_number: string; status: string; created_at: string; order_date?: string };
const statusZh: Record<string,string> = { draft:'草稿', approved:'已批准', ordered:'已下单', partially_received:'部分收货', received:'已收货', cancelled:'已取消' };

export default function SupplierDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { lang } = useT();
  const isZh = lang === 'zh';

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: s } = await supabase.from('suppliers').select('*').eq('id', id).single();
      if (s) setSupplier(s);
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, created_at, order_date')
        .eq('supplier_id', id)
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8);
      if (poData) setPos(poData as any);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <AppShell title={isZh ? '加载中…' : 'Loading…'} titleZh={isZh ? '加载中…' : 'Loading…'} eyebrow={isZh ? '供应商' : 'Supplier'}>
        <div className="mx-auto max-w-[640px] space-y-4">
          <Card><div className="h-32 animate-pulse motion-reduce:animate-none bg-[#faf6ee]/60 rounded-[12px]" /></Card>
        </div>
      </AppShell>
    );
  }

  if (!supplier) {
    return (
      <AppShell title={isZh ? '未找到' : 'Not Found'} titleZh={isZh ? '未找到' : 'Not Found'} eyebrow={isZh ? '供应商' : 'Supplier'}>
        <div className="mx-auto max-w-[640px] text-center py-10">
          <p className="text-[13px] text-[#4f7a5c]">{isZh ? '未找到该供应商' : 'Supplier not found'}</p>
          <Link href="/suppliers" className="mt-3 inline-flex"><Button variant="ghost">{isZh ? '返回列表' : 'Back to List'}</Button></Link>
        </div>
      </AppShell>
    );
  }

  const s = supplier;

  return (
    <AppShell title={s.name_zh} titleZh={s.name_zh} eyebrow={s.code} actions={
      <Link href={`/suppliers/${s.id}/edit`}><Button>{isZh ? '编辑' : 'Edit'}</Button></Link>
    }>
      <div className="mx-auto max-w-[640px] space-y-4">
        <Card>
          <CardTitle>{isZh ? '供应商信息' : 'Supplier Info'}</CardTitle>
          <div className="mt-3 space-y-2 text-[13px]">
            <p>{isZh ? '代号' : 'Code'}: <span className="font-mono">{s.code}</span></p>
            <p>{isZh ? '中文' : 'Chinese Name'}: {s.name_zh}</p>
            {s.name_en && <p>{isZh ? '英文' : 'English Name'}: {s.name_en}</p>}
            {s.contact_person && <p>{isZh ? '联系人' : 'Contact'}: {s.contact_person}</p>}
            {s.phone && <p>{isZh ? '电话' : 'Phone'}: {s.phone}</p>}
            {s.email && <p>{isZh ? '邮箱' : 'Email'}: {s.email}</p>}
            {s.payment_terms && <p>{isZh ? '账期' : 'Terms'}: {s.payment_terms}</p>}
            {s.address && <p>{isZh ? '地址' : 'Address'}: {s.address}</p>}
            {s.notes && <p>{isZh ? '备注' : 'Notes'}: {s.notes}</p>}
            <p>{isZh ? '状态' : 'Status'}: <Badge>{s.is_active ? (isZh ? '启用' : 'Active') : (isZh ? '停用' : 'Inactive')}</Badge></p>
          </div>
        </Card>
        <Card>
          <CardTitle>{isZh ? '最近采购单' : 'Recent Purchase Orders'}</CardTitle>
          <div className="mt-3 space-y-2">
            {(pos || []).map((po: any) => (
              <Link key={po.po_number} href={`/purchase-orders/${po.id}`} className="flex items-center justify-between rounded-[10px] bg-[#faf6ee]/60 px-3 py-2.5 text-[12px] hover:bg-[#f5eedf] transition">
                <div className="flex flex-col">
                  <span className="font-mono font-medium">{po.po_number}</span>
                  <span className="text-[11px] text-[#6b8a7a]">{po.order_date ? (isZh ? `下单 ${po.order_date}` : `Ordered ${po.order_date}`) : new Date(po.created_at).toLocaleDateString(isZh ? 'zh-CN' : 'en-GB')}</span>
                </div>
                <Badge>{isZh ? (statusZh[po.status] || po.status) : po.status}</Badge>
              </Link>
            ))}
            {(!pos || pos.length === 0) && <p className="text-[12px] text-[#4f7a5c]">{isZh ? '暂无采购单' : 'No purchase orders'}</p>}
          </div>
        </Card>
        <div className="flex gap-2">
          <Link href="/suppliers"><Button variant="ghost">{isZh ? '返回列表' : 'Back to List'}</Button></Link>
          <Link href={`/suppliers/${s.id}/edit`}><Button>{isZh ? '编辑供应商' : 'Edit Supplier'}</Button></Link>
        </div>
      </div>
    </AppShell>
  );
}
