'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/lib/i18n/use-t';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Tx = any;
type Sale = any;
type PO = any;

const PAYMENT_LABELS: Record<string, { zh: string; en: string }> = {
  cash: { zh: '现金', en: 'Cash' },
  card: { zh: '刷卡', en: 'Card' },
  bank_transfer: { zh: '银行转账', en: 'Bank Transfer' },
  shopify: { zh: '网付', en: 'Shopify' },
  mix: { zh: '混合', en: 'Mix' },
  deferral: { zh: '赊账', en: 'Deferral' },
  other: { zh: '其他', en: 'Other' },
};

function readableDiff(isZh: boolean, oldVals: any, newVals: any) {
  if (!oldVals || !newVals) return [];
  const diffs: string[] = [];
  const keys = [
    { k: 'customer_name', zh: '购书人', en: 'Customer' },
    { k: 'payment_method', zh: '付款方式', en: 'Payment' },
    { k: 'payment_status', zh: '付款状态', en: 'Payment Status' },
    { k: 'discount_amount', zh: '折扣金额', en: 'Discount' },
    { k: 'sale_date', zh: '销售日期', en: 'Sale Date' },
    { k: 'notes', zh: '备注', en: 'Notes' },
    { k: 'customer_note', zh: '客户备注', en: 'Customer Note' },
    { k: 'shipping_cost', zh: '运费', en: 'Shipping' },
    { k: 'subtotal', zh: '小计', en: 'Subtotal' },
  ];
  for (const { k, zh, en } of keys) {
    const ov = oldVals[k];
    const nv = newVals[k];
    if (JSON.stringify(ov) !== JSON.stringify(nv) && (ov !== undefined || nv !== undefined)) {
      const label = isZh ? zh : en;
      const fmt = (v: any) => {
        if (k === 'payment_method' && v) {
          const l = PAYMENT_LABELS[String(v)] || { zh: String(v), en: String(v) };
          return isZh ? l.zh : l.en;
        }
        if (v === null || v === undefined || v === '') return isZh ? '空' : 'empty';
        return String(v);
      };
      diffs.push(`${label}: ${fmt(ov)} → ${fmt(nv)}`);
    }
  }
  if (oldVals.lines && newVals.lines) {
    const oldT = (oldVals.lines as any[]).map((l: any) => `${l.book_title || l.title || l.sku || l.book_id?.slice(0,6)}×${l.quantity}${l.unit_price ? `@£${Number(l.unit_price).toFixed(2)}` : ''}`).join(', ');
    const newT = (newVals.lines as any[]).map((l: any) => `${l.book_title || l.title || l.sku || l.book_id?.slice(0,6)}×${l.quantity}${l.unit_price ? `@£${Number(l.unit_price).toFixed(2)}` : ''}`).join(', ');
    if (oldT !== newT) {
      diffs.push(`${isZh ? '书目' : 'Books'}: ${oldT || '—'} → ${newT || '—'}`);
    }
  } else if (oldVals.lines || newVals.lines) {
    // fallback for old format
    const oldL = oldVals.lines ? JSON.stringify(oldVals.lines).slice(0,120) : '';
    const newL = newVals.lines ? JSON.stringify(newVals.lines).slice(0,120) : '';
    if (oldL !== newL) diffs.push(`${isZh ? '书目有变化' : 'Books changed'}`);
  }
  return diffs.length ? diffs : [isZh ? '无字段变化' : 'No field change'];
}

function AuditHistoryInner() {
  const { isZh } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('type') || 'all';

  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [adjustments, setAdjustments] = useState<PO[]>([]);
  const [edits, setEdits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) { setLoading(false); return; }
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) { router.push('/auth?redirectTo=/admin/history'); return; }
      const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', uid);
      const roleNames = (roles || []).map((r: any) => r.roles?.name);
      const adminOk = roleNames.includes('admin') || roleNames.includes('super_admin');
      setIsAdmin(adminOk);
      if (!adminOk) { router.push('/'); return; }

      let txs: Tx[] = [];
      let sls: Sale[] = [];
      let pos: PO[] = [];
      let eds: any[] = [];

      try {
        if (filter === 'all' || filter === 'inventory') {
          const { data } = await supabase.from('inventory_transactions').select('*, books(title, sku), profiles:actor_profile_id(display_name, email)').order('occurred_at', { ascending: false }).limit(50);
          txs = (data as any) || [];
        }
        if (filter === 'all' || filter === 'sales' || filter === 'edits') {
          const { data } = await supabase.from('sales_transactions').select('*, profiles:created_by(display_name, email)').order('sold_at', { ascending: false }).limit(30);
          sls = (data as any) || [];
          try {
            const { data: ed } = await supabase.from('sale_edits_view').select('*').order('edited_at', { ascending: false }).limit(40);
            eds = (ed as any) || [];
          } catch {
            try {
              const { data: ed2 } = await supabase.from('sale_edits').select('*, profiles:edited_by(display_name, email)').order('edited_at', { ascending: false }).limit(40);
              eds = (ed2 as any) || [];
            } catch {}
          }
        }
        if (filter === 'all' || filter === 'po') {
          const { data } = await supabase.from('purchase_orders').select('po_number, status, created_at, created_by, suppliers(name_zh), profiles:created_by(display_name, email)').order('created_at', { ascending: false }).limit(20);
          pos = (data as any) || [];
        }
      } catch {}

      setTransactions(txs);
      setSales(sls);
      setAdjustments(pos);
      setEdits(eds);
      setLoading(false);
    };
    run();
  }, [filter, router]);

  const setFilter = (f: string) => router.push(`/admin/history?type=${f}`);
  const eyebrow = isZh ? '不可篡改流水' : 'Immutable Audit Log';

  if (loading) {
    return (
      <AppShell title="Audit Log" titleZh="操作记录" eyebrow={eyebrow}>
        <div className="mx-auto max-w-[840px]"><Card><p className="text-[12px] text-[#4f7a5c]">{isZh ? '加载中…' : 'Loading…'}</p></Card></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Audit Log" titleZh="操作记录" eyebrow={eyebrow}>
      <div className="mx-auto max-w-[840px] space-y-4">
        <Card>
          <div className="flex flex-wrap gap-2">
            {[
              { k: 'all', zh: '全部', en: 'All' },
              { k: 'inventory', zh: '库存流水', en: 'Inventory' },
              { k: 'sales', zh: '销售', en: 'Sales' },
              { k: 'edits', zh: '改单记录', en: 'Edits' },
              { k: 'po', zh: '采购单', en: 'POs' },
            ].map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)} className={`rounded-[10px] px-3 py-1.5 text-[12px] ${filter===f.k ? 'bg-[#0f3d2e] text-white' : 'bg-[#faf6ee] text-[#4f7a5c]'}`}>{isZh ? f.zh : f.en}</button>
            ))}
          </div>
        </Card>

        {(filter === 'all' || filter === 'edits') && (
          <Card>
            <CardTitle>{isZh ? '改单记录' : 'Sale Edit History'}</CardTitle>
            <div className="mt-3 space-y-2">
              {edits.map((ed: any) => {
                const diffs = readableDiff(isZh, ed.old_values, ed.new_values);
                return (
                  <div key={ed.id} className="rounded-[12px] bg-[#fff7ed] px-3 py-2 text-[11px] border border-[#d26a39]/20">
                    <p className="font-medium">{new Date(ed.edited_at).toLocaleString(isZh ? 'zh-CN' : 'en-GB')} • {ed.editor_name || ed.profiles?.display_name || ed.edited_by?.slice(0,6)} {ed.profiles?.email ? `(${ed.profiles.email})` : ed.editor_email ? `(${ed.editor_email})` : ''} • {ed.sale_number || ed.sale_id?.slice(0,8)} • {ed.change_type === 'content' ? (isZh ? '改书/改量' : 'Content change') : (isZh ? '信息更正' : 'Info fix')}</p>
                    {ed.reason && <p className="text-[#4f7a5c]">{isZh ? '原因' : 'Reason'}：{ed.reason}</p>}
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      {diffs.map((d: string, i: number) => <li key={i} className="text-[#0f3d2e]">{d}</li>)}
                    </ul>
                  </div>
                );
              })}
              {edits.length === 0 && <p className="py-4 text-center text-[12px] text-[#4f7a5c]">{isZh ? '暂无改单' : 'No edits'}</p>}
            </div>
          </Card>
        )}

        {(filter === 'all' || filter === 'inventory') && (
          <Card>
            <CardTitle>{isZh ? '库存流水' : 'Inventory Log'}</CardTitle>
            <div className="mt-3 space-y-2">
              {transactions.map((t: any) => {
                const typeLabel = t.transaction_type === 'sale' ? (isZh ? '销售出库' : 'Sale')
                  : t.transaction_type === 'purchase_receipt' ? (isZh ? '采购入库' : 'Purchase')
                  : t.transaction_type === 'return_in' ? (isZh ? '改单返还' : 'Edit Restore')
                  : t.transaction_type === 'count_adjustment_in' ? (isZh ? '盘盈' : 'Adjustment In')
                  : t.transaction_type === 'count_adjustment_out' ? (isZh ? '盘亏' : 'Adjustment Out')
                  : t.transaction_type === 'transfer' ? (isZh ? '调拨' : 'Transfer')
                  : t.transaction_type;
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-[12px] bg-[#faf6ee]/60 px-3 py-2 text-[12px]">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{t.books?.title || t.book_id?.slice(0,8)} <span className="text-[#4f7a5c]">{t.books?.sku}</span></p>
                      <p className="text-[11px] text-[#4f7a5c] truncate">{new Date(t.occurred_at).toLocaleString(isZh ? 'zh-CN' : 'en-GB')} • <span className="font-medium text-[#0f3d2e]">{t.profiles?.display_name || t.actor_profile_id?.slice(0,6)}</span>{t.profiles?.email ? <span className="text-[#4f7a5c]/70"> ({t.profiles.email})</span> : null} {t.reason ? `• ${t.reason}` : ''}</p>
                    </div>
                    <div className="text-right"><Badge variant={t.transaction_type==='sale' ? 'danger' : 'active'}>{typeLabel}</Badge><p className="mt-1">{t.quantity > 0 ? `+${t.quantity}` : t.quantity} {t.unit_cost ? `@ £${t.unit_cost}` : ''}</p></div>
                  </div>
                );
              })}
              {transactions.length === 0 && <p className="py-6 text-center text-[12px] text-[#4f7a5c]">{isZh ? '暂无流水' : 'No transactions'}</p>}
            </div>
          </Card>
        )}

        {(filter === 'all' || filter === 'sales') && (
          <Card>
            <CardTitle>{isZh ? '销售记录' : 'Sales Records'}</CardTitle>
            <div className="mt-3 space-y-2">
              {sales.map((s: any) => {
                const net = Number(s.subtotal || 0) - Number(s.discount_amount || 0);
                const pm = PAYMENT_LABELS[String(s.payment_method || 'cash')] || { zh: s.payment_method, en: s.payment_method };
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-[12px] border border-[#0f3d2e]/5 px-3 py-2 text-[12px]">
                    <div className="min-w-0 flex-1"><p className="font-mono">{s.sale_number || s.external_reference || s.id.slice(0,8)}</p><p className="text-[11px] text-[#4f7a5c] truncate">{new Date(s.sold_at).toLocaleString(isZh ? 'zh-CN' : 'en-GB')} • <span className="font-medium text-[#0f3d2e]">{s.profiles?.display_name || ''}</span>{s.profiles?.email ? <span className="text-[#4f7a5c]/70"> ({s.profiles.email})</span> : null} • {isZh ? pm.zh : pm.en}</p></div>
                    <div className="text-right"><p>£{net.toFixed(2)}</p><Badge variant="active">{isZh ? '已结算' : 'Settled'}</Badge></div>
                  </div>
                );
              })}
              {sales.length === 0 && <p className="py-6 text-center text-[12px] text-[#4f7a5c]">{isZh ? '暂无销售' : 'No sales'}</p>}
            </div>
          </Card>
        )}

        {(filter === 'all' || filter === 'po') && (
          <Card>
            <CardTitle>{isZh ? '采购单变动' : 'PO Changes'}</CardTitle>
            <div className="mt-3 space-y-2">
              {adjustments.map((po: any) => (
                <div key={po.po_number} className="flex items-center justify-between rounded-[12px] bg-[#faf6ee]/50 px-3 py-2 text-[12px]">
                  <div className="min-w-0"><span className="font-mono font-medium">{po.po_number}</span><span className="ml-2 text-[11px] text-[#4f7a5c]">{(po as any).profiles?.display_name || ''}{(po as any).profiles?.email ? ` (${(po as any).profiles.email})` : ''}</span></div>
                  <div className="flex items-center gap-2 shrink-0"><Badge>{po.status === 'draft' ? (isZh ? '草稿' : 'Draft') : po.status === 'approved' ? (isZh ? '已批准' : 'Approved') : po.status === 'ordered' ? (isZh ? '已下单' : 'Ordered') : po.status === 'partially_received' ? (isZh ? '部分收货' : 'Partial') : po.status === 'received' ? (isZh ? '已收货' : 'Received') : po.status}</Badge><span className="text-[#4f7a5c]">{po.suppliers?.name_zh}</span></div>
                </div>
              ))}
              {adjustments.length === 0 && <p className="py-6 text-center text-[12px] text-[#4f7a5c]">{isZh ? '暂无采购单' : 'No POs'}</p>}
            </div>
          </Card>
        )}

        <div className="rounded-[12px] bg-[#0f3d2e]/5 p-3 text-[11px] text-[#4f7a5c]"><p>{isZh ? '所有流水表都有触发器禁止随意改动，保证审计可信。改单会记录操作人、原因和前后对比，库存原子返还重扣，失败整单回滚。' : 'All logs are immutable. Edits log actor, reason, before/after, with atomic stock restore and rollback on failure.'}</p></div>
      </div>
    </AppShell>
  );
}

function AuditHistoryWrapper() {
  return <Suspense fallback={<div className="p-6 text-[12px] text-[#6b8a7a]">Loading...</div>}><AuditHistoryInner /></Suspense>;
}

export default AuditHistoryWrapper;
