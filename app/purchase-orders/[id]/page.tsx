'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookAutocomplete } from '@/components/ui/book-autocomplete';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';
import {
  approvePOWithHandler, markPOOrdered, togglePOLineSelected,
  addPOLine, removePOLine, updatePOLineQty, receivePOWithCost, finalizePO,
  getPOStageHandlers, type StageHandler,
} from '../actions';

type PO = any;
type Line = any;
type Location = { id: string; name: string; code: string };

const STAGE_LABEL: Record<string, { zh: string; en: string }> = {
  draft: { zh: '建单', en: 'Drafted' },
  approved: { zh: '批准', en: 'Approved' },
  ordered: { zh: '下单', en: 'Ordered' },
  received: { zh: '收货', en: 'Received' },
  finalized: { zh: '结束', en: 'Finalized' },
};

export default function PODetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { lang } = useT();
  const isZh = lang === 'zh';

  const [po, setPo] = useState<PO | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [handlers, setHandlers] = useState<StageHandler[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // 草稿加行
  const [newBookId, setNewBookId] = useState('');
  const [newQty, setNewQty] = useState('');
  // 收货表单：每行数量 + 实际进货价
  const [locationId, setLocationId] = useState('');
  const [receiveRows, setReceiveRows] = useState<Record<string, { qty: string; cost: string }>>({});
  // 结束采购单：两步确认（第一步布防，第二步执行）
  const [finalizeArmed, setFinalizeArmed] = useState(false);

  async function fetchData() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setLoading(false); return; }
    const { data: poData } = await supabase.from('purchase_orders').select('*, suppliers(name_zh, code)').eq('id', id).single();
    if (poData) setPo(poData);
    const { data: lineData } = await supabase.from('purchase_order_lines').select('*, books(title, sku)').eq('purchase_order_id', id).order('created_at');
    if (lineData) setLines(lineData);
    setHandlers(await getPOStageHandlers(id));
    const { data: locData } = await supabase.from('locations').select('id, name, code').eq('is_active', true).limit(10);
    if (locData) {
      setLocations(locData as any);
      if (locData.length > 0) setLocationId((v) => v || (locData as any)[0].id);
    }
    const { data: bookData } = await supabase.from('books').select('id, title, sku').eq('is_active', true).order('title').limit(300);
    if (bookData) setBooks(bookData as any);
    setLoading(false);
  }

  useEffect(() => { fetchData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const canReceive = po && ['ordered', 'partially_received', 'approved'].includes(po.status);
  const isDraft = po?.status === 'draft';
  const exportable = po && ['approved', 'ordered'].includes(po.status);

  const receivePreviewTotal = useMemo(() => {
    return Object.entries(receiveRows).reduce((s, [, r]) => s + (Number(r.qty) || 0) * (Number(r.cost) || 0), 0);
  }, [receiveRows]);

  async function run(label: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    setActionLoading(label); setError(null); setMsg(null);
    try {
      const res = await fn();
      if (!res.success) throw new Error(res.error || '失败');
      await fetchData(); router.refresh();
      setMsg(isZh ? '已保存' : 'Saved');
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(null); }
  }

  async function handleReceive(e: React.FormEvent) {
    e.preventDefault();
    const rows = Object.entries(receiveRows)
      .filter(([, r]) => Number(r.qty) > 0)
      .map(([lineId, r]) => ({ purchase_order_line_id: lineId, quantity: Math.floor(Number(r.qty)), unit_cost: Math.round(Number(r.cost || 0) * 100) / 100 }));
    if (rows.length === 0) { setError(isZh ? '请至少填写一行的收货数量；若剩余书不再到货，可点下方的「结束采购单」' : 'Fill at least one row; if the rest will never arrive, use “Finalize PO” below'); return; }
    await run('receive', () => receivePOWithCost({ po_id: id, location_id: locationId, lines: rows }));
    setReceiveRows({});
    setFinalizeArmed(false);
  }

  async function handleFinalize() {
    if (!finalizeArmed) { setFinalizeArmed(true); return; }
    setFinalizeArmed(false);
    await run('finalize', () => finalizePO(id));
  }

  function exportLinesCSV() {
    const sel = lines.filter((l) => l.is_selected);
    const head = ['title', 'sku', 'quantity_ordered', 'unit_cost'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = sel.map((l) => [l.books?.title, l.books?.sku, l.quantity_ordered, Number(l.unit_cost || 0).toFixed(2)].map(esc).join(','));
    const csv = '\uFEFF' + [head.join(','), ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${po.po_number}-order-lines.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (loading) {
    return (
      <AppShell title={isZh ? '加载中...' : 'Loading...'} titleZh={isZh ? '加载中...' : 'Loading...'} eyebrow={isZh ? '采购单详情' : 'Purchase Order'}>
        <div className="mx-auto max-w-[720px] space-y-4"><Card><div className="h-24 animate-pulse bg-cocm-paper/60 rounded-[12px]" /></Card></div>
      </AppShell>
    );
  }
  if (!po) {
    return (
      <AppShell title={isZh ? '未找到' : 'Not Found'} titleZh={isZh ? '未找到' : 'Not Found'} eyebrow={isZh ? '采购单' : 'Purchase Order'}>
        <div className="mx-auto max-w-[720px] text-center py-10">
          <p className="text-[13px] text-[#5b5f94]">{isZh ? '未找到采购单' : 'Purchase order not found'}</p>
          <Link href="/purchase-orders" className="mt-3 inline-flex"><Button variant="ghost">{isZh ? '返回采购单' : 'Back to Purchase Orders'}</Button></Link>
        </div>
      </AppShell>
    );
  }

  const statusLabel: Record<string, string> = {
    draft: isZh ? '草稿' : 'Draft',
    approved: isZh ? '已批准' : 'Approved',
    ordered: isZh ? '已下单' : 'Ordered',
    partially_received: isZh ? '部分收货' : 'Partially Received',
    received: isZh ? '已收货' : 'Received',
    closed: isZh ? '已结束' : 'Closed',
    cancelled: isZh ? '已取消' : 'Cancelled',
  };

  const remainingTotal = lines
    .filter((l) => l.is_selected)
    .reduce((s, l: any) => s + Math.max(0, Number(l.quantity_ordered) - Number(l.quantity_received || 0)), 0);

  return (
    <AppShell title={po.po_number} titleZh={po.po_number} eyebrow={isZh ? '采购单详情' : 'Purchase Order Details'}>
      <div className="mx-auto max-w-[720px] space-y-4">
        <Link href="/purchase-orders" className="inline-flex text-[13px] text-[#5b5f94] hover:text-cocm-ink">
          ← {isZh ? '返回采购单' : 'Back to Purchase Orders'}
        </Link>

        {error && <div className="rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
        {msg && <div className="rounded-[12px] bg-green-50 px-3 py-2 text-[12px] text-green-700">{msg}</div>}

        <Card>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[18px] font-semibold">{po.po_number}</p>
              <p className="text-[13px] text-[#5b5f94] truncate">{po.suppliers?.name_zh} • {po.order_date}</p>
              {po.notes && <p className="mt-1 text-[12px] text-cocm-ink/80">{po.notes}</p>}
            </div>
            <Badge className="shrink-0">{statusLabel[po.status] || po.status}</Badge>
          </div>
          {/* 3B: 经手人 */}
          {handlers.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-cocm-ink/10 pt-3 text-[11px] text-[#5b5f94]">
              {handlers.map((h, i) => (
                <p key={i}>
                  <span className="font-semibold text-cocm-ink">{isZh ? STAGE_LABEL[h.stage]?.zh || h.stage : STAGE_LABEL[h.stage]?.en || h.stage}</span>
                  {' · '}{h.display_name || (isZh ? '未知' : 'Unknown')}
                  {h.at && <span className="text-[#9aa0bd]"> {new Date(h.at).toLocaleString(isZh ? 'zh-CN' : 'en-GB')}</span>}
                </p>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {isDraft && (
              <Button size="sm" onClick={() => run('approve', () => approvePOWithHandler(id))} disabled={!!actionLoading}>
                {actionLoading === 'approve' ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '批准' : 'Approve')}
              </Button>
            )}
            {po.status === 'approved' && (
              <Button size="sm" onClick={() => run('ordered', () => markPOOrdered(id))} disabled={!!actionLoading}>
                {actionLoading === 'ordered' ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '标记已下单' : 'Mark Ordered')}
              </Button>
            )}
            {exportable && lines.some((l) => l.is_selected) && (
              <Button size="sm" variant="ghost" onClick={exportLinesCSV}>
                {isZh ? '导出已勾选行 (CSV)' : 'Export checked lines (CSV)'}
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>{isZh ? '行项目（打勾 = 要进/要发给供应商）' : 'Line Items (checked = include)'}</CardTitle>
          <div className="mt-3 space-y-2">
            {lines.map((l: any) => (
              <div key={l.id} className={`flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px] ${l.is_selected ? 'bg-cocm-paper' : 'bg-gray-50 opacity-70'}`}>
                <input
                  type="checkbox"
                  checked={!!l.is_selected}
                  onChange={(e) => run(`tick-${l.id}`, () => togglePOLineSelected(l.id, e.target.checked))}
                  aria-label={isZh ? `勾选《${l.books?.title}》` : `Check ${l.books?.title}`}
                  className="h-4 w-4 shrink-0 accent-[#2d2f92]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.books?.title} <span className="text-[#5b5f94]">({l.books?.sku})</span></p>
                  <p className="text-[11px] text-[#5b5f94]">
                    {isZh ? '订购' : 'Ordered'} {l.quantity_ordered}{isZh ? '本' : ' pcs'}
                    {Number(l.quantity_received || 0) > 0 && ` · ${isZh ? '已收' : 'Received'} ${l.quantity_received}`}
                    {Number(l.unit_cost || 0) > 0 && ` · £${Number(l.unit_cost).toFixed(2)}/${isZh ? '本' : 'pc'}`}
                  </p>
                </div>
                {isDraft && (
                  <>
                    <Input
                      value={String(l.quantity_ordered)}
                      onChange={(e) => { const v = e.target.value; setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, quantity_ordered: v } : x))); }}
                      onBlur={async (e) => { const v = Number(e.target.value); if (v > 0 && v !== l.quantity_ordered) await run(`qty-${l.id}`, () => updatePOLineQty(l.id, v)); }}
                      type="number" min="1" className="h-8 w-[64px] text-[12px] px-1.5"
                      aria-label={isZh ? '数量' : 'Quantity'}
                    />
                    <button onClick={() => run(`del-${l.id}`, () => removePOLine(l.id))} aria-label={isZh ? '删除此行' : 'Remove line'} className="text-[16px] text-red-400 hover:text-red-600">×</button>
                  </>
                )}
              </div>
            ))}
            {lines.length === 0 && <p className="text-[12px] text-[#5b5f94]">{isZh ? '暂无行项目' : 'No line items'}</p>}
          </div>
          {/* 草稿加行 */}
          {isDraft && (
            <div className="mt-3 flex items-center gap-2 border-t border-cocm-ink/10 pt-3">
              <div className="min-w-0 flex-1">
                <BookAutocomplete id="po-add-book" books={books} value={newBookId} onChange={setNewBookId} isZh={isZh} placeholder={isZh ? '输入书名/代号加一行…' : 'Type title/sku to add…'} />
              </div>
              <Input value={newQty} onChange={(e) => setNewQty(e.target.value)} type="number" min="1" placeholder={isZh ? '数量' : 'Qty'} className="w-[76px]" aria-label={isZh ? '数量' : 'Quantity'} />
              <Button size="sm" onClick={async () => { await run('addline', () => addPOLine(id, newBookId, Number(newQty))); setNewBookId(''); setNewQty(''); }} disabled={!!actionLoading || !newBookId || !newQty}>
                {isZh ? '加书' : 'Add'}
              </Button>
            </div>
          )}
        </Card>

        {canReceive && (
          <Card>
            <CardTitle>{isZh ? '收货入库（实际进货价）' : 'Receive Stock (actual unit cost)'}</CardTitle>
            <p className="mt-2 text-[12px] text-[#5b5f94]">
              {isZh ? '只收打勾的行。按行填写实收数量和本次实际进货价（单本），保存后直接入库。' : 'Only checked lines are received. Enter actual received qty and this receipt’s real unit cost per line.'}
            </p>
            <form onSubmit={handleReceive} className="mt-3 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#5b5f94]">{isZh ? '库位' : 'Location'}</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-[12px] border border-cocm-ink/15 px-3 text-[12px]"
                >
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {lines.filter((l) => l.is_selected).map((l: any) => {
                  const remaining = Number(l.quantity_ordered) - Number(l.quantity_received || 0);
                  if (remaining <= 0) return null;
                  const r = receiveRows[l.id] || { qty: '', cost: '' };
                  return (
                    <div key={l.id} className="rounded-[12px] bg-cocm-paper px-3 py-2 text-[12px]">
                      <p className="truncate font-medium">{l.books?.title} <span className="text-[#5b5f94]">({l.books?.sku})</span></p>
                      <p className="text-[11px] text-[#5b5f94]">{isZh ? '待收' : 'Remaining'} {remaining}{isZh ? '本' : ' pcs'}</p>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#5b5f94]">{isZh ? '实收数量' : 'Qty'}</label>
                          <Input
                            type="number" min="0" max={remaining}
                            value={r.qty}
                            onChange={(e) => setReceiveRows((m) => ({ ...m, [l.id]: { qty: e.target.value, cost: r.cost } }))}
                            className="mt-0.5 h-9"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#5b5f94]">{isZh ? '实际进货价 £/本' : 'Unit cost £'}</label>
                          <Input
                            type="number" min="0" step="0.01"
                            value={r.cost}
                            onChange={(e) => setReceiveRows((m) => ({ ...m, [l.id]: { qty: r.qty, cost: e.target.value } }))}
                            className="mt-0.5 h-9"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {lines.filter((l) => l.is_selected && Number(l.quantity_ordered) - Number(l.quantity_received || 0) > 0).length === 0 && (
                  <p className="text-[12px] text-[#5b5f94]">{isZh ? '勾选的行都已收完' : 'All checked lines fully received'}</p>
                )}
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#5b5f94]">{isZh ? '本次入库成本合计' : 'This receipt total'}</span>
                <span className="font-semibold tabular-nums">£{receivePreviewTotal.toFixed(2)}</span>
              </div>
              <Button type="submit" size="sm" className="w-full" disabled={!!actionLoading}>
                {actionLoading === 'receive' ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '确认收货入库' : 'Confirm Receipt')}
              </Button>
              {po.status === 'partially_received' && (
                <div className="border-t border-cocm-ink/10 pt-3">
                  <p className="text-[11px] leading-relaxed text-[#5b5f94]">
                    {isZh
                      ? '若剩余数量不再到货（如供应商短装），可直接结束本单；结束后将不再收货。'
                      : 'If the remaining qty will never arrive (short shipment), finalize the PO; no further receiving afterwards.'}
                  </p>
                  <Button type="button" variant="ghost" size="sm" className="mt-2 w-full" disabled={!!actionLoading} onClick={handleFinalize}>
                    {actionLoading === 'finalize'
                      ? (isZh ? '处理中...' : 'Processing...')
                      : finalizeArmed
                        ? (isZh ? `再次点击确认结束（剩余 ${remainingTotal} 本不再收货）` : `Click again to finalize (${remainingTotal} pcs will not be received)`)
                        : (isZh ? '确认收完，结束采购单' : 'Finalize PO')}
                  </Button>
                </div>
              )}
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
