'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';

type PO = any;
type Line = any;
type Location = { id: string; name: string; code: string };

export default function PODetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { lang } = useT();
  const isZh = lang === 'zh';

  const [po, setPo] = useState<PO | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // receive form state
  const [receiveForm, setReceiveForm] = useState({ location_id: '', line_id: '', qty: '' });

  async function fetchData() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: poData } = await supabase.from('purchase_orders').select('*, suppliers(name_zh, code)').eq('id', id).single();
    if (poData) {
      setPo(poData);
    }
    const { data: lineData } = await supabase.from('purchase_order_lines').select('*, books(title, sku)').eq('purchase_order_id', id);
    if (lineData) setLines(lineData);
    const { data: locData } = await supabase.from('locations').select('id, name, code').eq('is_active', true).limit(10);
    if (locData) {
      setLocations(locData as any);
      if (locData.length > 0 && !receiveForm.location_id) {
        setReceiveForm((f) => ({ ...f, location_id: (locData as any)[0].id }));
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (lines.length > 0 && !receiveForm.line_id) {
      setReceiveForm((f) => ({ ...f, line_id: lines[0].id }));
    }
  }, [lines, receiveForm.line_id]);

  async function handleApprove() {
    setActionLoading('approve');
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error('No supabase');
      const { error } = await supabase.from('purchase_orders').update({ status: 'approved' }).eq('id', id);
      if (error) throw error;
      await fetchData();
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkOrdered() {
    setActionLoading('ordered');
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error('No supabase');
      const { error } = await supabase.from('purchase_orders').update({ status: 'ordered' }).eq('id', id);
      if (error) throw error;
      await fetchData();
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReceive(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading('receive');
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error('No supabase');
      const locId = receiveForm.location_id;
      const lineId = receiveForm.line_id;
      const qty = Number(receiveForm.qty);
      if (!locId || !lineId || !qty) {
        throw new Error(isZh ? '请填写完整收货信息' : 'Please fill all receive fields');
      }
      const { error } = await (supabase as any).rpc('apply_purchase_receipt', {
        p_purchase_order_id: id,
        p_location_id: locId,
        p_receipt_lines: [{ purchase_order_line_id: lineId, quantity: qty }],
        p_received_at: new Date().toISOString(),
      });
      if (error) throw error;
      setReceiveForm((f) => ({ ...f, qty: '' }));
      await fetchData();
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <AppShell title={isZh ? '加载中...' : 'Loading...'} titleZh={isZh ? '加载中...' : 'Loading...'} eyebrow={isZh ? '采购单详情' : 'Purchase Order'}>
        <div className="mx-auto max-w-[720px] space-y-4">
          <Card><div className="h-24 animate-pulse bg-[#faf6ee]/60 rounded-[12px]" /></Card>
        </div>
      </AppShell>
    );
  }

  if (!po) {
    return (
      <AppShell title={isZh ? '未找到' : 'Not Found'} titleZh={isZh ? '未找到' : 'Not Found'} eyebrow={isZh ? '采购单' : 'Purchase Order'}>
        <div className="mx-auto max-w-[720px] text-center py-10">
          <p className="text-[13px] text-[#4f7a5c]">{isZh ? '未找到采购单' : 'Purchase order not found'}</p>
          <Link href="/purchase-orders" className="mt-3 inline-flex"><Button variant="ghost">{isZh ? '返回采购单' : 'Back to Purchase Orders'}</Button></Link>
        </div>
      </AppShell>
    );
  }

  const canReceive = po.status === 'ordered' || po.status === 'partially_received' || po.status === 'approved';

  const statusLabel: Record<string, string> = {
    draft: isZh ? '草稿' : 'Draft',
    approved: isZh ? '已批准' : 'Approved',
    ordered: isZh ? '已下单' : 'Ordered',
    partially_received: isZh ? '部分收货' : 'Partially Received',
    received: isZh ? '已收货' : 'Received',
    cancelled: isZh ? '已取消' : 'Cancelled',
  };

  return (
    <AppShell title={po.po_number} titleZh={po.po_number} eyebrow={isZh ? '采购单详情' : 'Purchase Order Details'}>
      <div className="mx-auto max-w-[720px] space-y-4">
        <Link href="/purchase-orders" className="inline-flex text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">
          ← {isZh ? '返回采购单' : 'Back to Purchase Orders'}
        </Link>

        {error && <div className="rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[18px] font-semibold">{po.po_number}</p>
              <p className="text-[13px] text-[#4f7a5c]">{po.suppliers?.name_zh} • {po.order_date}</p>
            </div>
            <Badge>{statusLabel[po.status] || po.status}</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {po.status === 'draft' && (
              <Button size="sm" onClick={handleApprove} disabled={!!actionLoading}>
                {actionLoading === 'approve' ? (isZh ? '处理中...' : 'Processing...') : isZh ? '批准 → ordered' : 'Approve → ordered'}
              </Button>
            )}
            {po.status === 'approved' && (
              <Button size="sm" onClick={handleMarkOrdered} disabled={!!actionLoading}>
                {actionLoading === 'ordered' ? (isZh ? '处理中...' : 'Processing...') : isZh ? '标记已下单' : 'Mark Ordered'}
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>{isZh ? '行项目' : 'Line Items'}</CardTitle>
          <div className="mt-3 space-y-2">
            {(lines || []).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2 text-[12px]">
                <span>{l.books?.title} ({l.books?.sku})</span>
                <span>{l.quantity_ordered} × £{l.unit_cost} = £{(l.quantity_ordered * Number(l.unit_cost)).toFixed(2)}</span>
              </div>
            ))}
            {(!lines || lines.length === 0) && <p className="text-[12px] text-[#4f7a5c]">{isZh ? '暂无行项目' : 'No line items'}</p>}
          </div>
        </Card>

        {canReceive && (
          <Card>
            <CardTitle>{isZh ? '收货入库' : 'Receive Stock'}</CardTitle>
            <p className="mt-2 text-[12px] text-[#4f7a5c]">
              {isZh ? '选择库位，确认数量，系统会自动按每批进货价创建库存批次' : 'Select location and confirm quantity — system auto-creates inventory batches per cost'}
            </p>
            <form onSubmit={handleReceive} className="mt-3 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#4f7a5c]">{isZh ? '库位' : 'Location'}</label>
                <select
                  value={receiveForm.location_id}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, location_id: e.target.value }))}
                  className="mt-1 flex h-10 w-full rounded-[12px] border border-[#0f3d2e]/15 px-3 text-[12px]"
                >
                  {(locations || []).map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#4f7a5c]">{isZh ? '行' : 'Line'}</label>
                  <select
                    value={receiveForm.line_id}
                    onChange={(e) => setReceiveForm((f) => ({ ...f, line_id: e.target.value }))}
                    className="mt-1 flex h-10 w-full rounded-[12px] border px-3 text-[12px]"
                  >
                    {(lines || []).map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.books?.title?.slice(0, 10)} - {l.quantity_ordered}
                        {isZh ? '本' : ' pcs'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#4f7a5c]">{isZh ? '收货数量' : 'Qty Received'}</label>
                  <Input
                    value={receiveForm.qty}
                    onChange={(e) => setReceiveForm((f) => ({ ...f, qty: e.target.value }))}
                    type="number"
                    placeholder={isZh ? '收货数量' : 'Qty'}
                    min="1"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="w-full" disabled={!!actionLoading}>
                {actionLoading === 'receive' ? (isZh ? '处理中...' : 'Processing...') : isZh ? '确认收货' : 'Confirm Receipt'}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
