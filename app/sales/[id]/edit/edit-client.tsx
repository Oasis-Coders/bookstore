'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { BookAutocomplete } from '@/components/ui/book-autocomplete';
import { useT } from '@/lib/i18n/use-t';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type CartItem = { id: string; title: string; qty: number; price: number; sku?: string; shelf_position?: string; stock?: number };

const PAYMENT_LABELS: Record<string, { zh: string; en: string }> = {
  cash: { zh: '现金', en: 'Cash' },
  card: { zh: '刷卡', en: 'Card' },
  bank_transfer: { zh: '银行转账', en: 'Bank Transfer' },
  shopify: { zh: '网付', en: 'Shopify' },
  mix: { zh: '混合', en: 'Mix' },
  deferral: { zh: '赊账', en: 'Deferral' },
  other: { zh: '其他', en: 'Other' },
};

export function EditSaleClient({ sale, lines, edits, books, stockMap }: { sale: any; lines: any[]; edits: any[]; books?: any[]; stockMap?: Record<string, number> }) {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const router = useRouter();

  // Cart from existing lines
  const initialCart: CartItem[] = (lines || []).map((l: any) => ({
    id: l.book_id,
    title: l.books?.title || l.book_id?.slice(0,6),
    qty: l.quantity,
    price: Number(l.unit_price),
    sku: l.books?.sku,
    shelf_position: undefined,
    stock: undefined,
  }));

  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [selectedBookId, setSelectedBookId] = useState('');

  const [customerName, setCustomerName] = useState(sale.customer_name || '');
  const [paymentMethod, setPaymentMethod] = useState(sale.payment_method || 'cash');
  const [paymentStatus, setPaymentStatus] = useState(sale.payment_status || 'paid');
  const [discountPercent, setDiscountPercent] = useState(() => {
    const sub = Number(sale.subtotal || 0);
    const disc = Number(sale.discount_amount || 0);
    if (sub <= 0) return '0';
    return String(Math.round((disc / sub) * 100));
  });
  const [saleDate, setSaleDate] = useState(sale.sale_date || new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState(sale.notes || sale.customer_note || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const discountPctNum = Math.min(100, Math.max(0, Number(discountPercent || 0)));
  const discountAmount = subtotal * discountPctNum / 100;
  const netTotal = Math.max(0, subtotal - discountAmount);

  // For stock check during edit: available = current stockMap + qty already in this sale (since restore will happen)
  const oldQtyMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of lines || []) {
      m[l.book_id] = (m[l.book_id] || 0) + Number(l.quantity || 0);
    }
    return m;
  }, [lines]);

  const addBookById = (bookId: string) => {
    const found = books?.find((b: any) => b.id === bookId);
    if (!found) return;
    const baseStock = stockMap?.[found.id] ?? 999;
    const alreadyInOld = oldQtyMap[found.id] || 0;
    const effectiveStock = baseStock + alreadyInOld;
    const existing = cart.find(c => c.id === found.id);
    if (effectiveStock <= 0) {
      alert(isZh ? `《${found.title}》当前可用库存为 0，加不上。` : `"${found.title}" has 0 available stock.`);
      return;
    }
    if (existing) {
      if (existing.qty + 1 > effectiveStock) {
        alert(isZh ? `《${found.title}》可用只有 ${effectiveStock} 本，已加了 ${existing.qty} 本。` : `"${found.title}" only has ${effectiveStock} available, you already have ${existing.qty}.`);
        return;
      }
      setCart(cart.map(c => c.id === found.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { id: found.id, title: found.title, qty: 1, price: Number(found.current_price || 10), sku: found.sku, shelf_position: found.shelf_position }]);
    }
    setSelectedBookId('');
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { setCart(cart.filter(c => c.id !== id)); return; }
    const item = cart.find(c => c.id === id);
    const baseStock = stockMap?.[id] ?? 999;
    const alreadyInOld = oldQtyMap[id] || 0;
    const effectiveStock = baseStock + alreadyInOld;
    if (qty > effectiveStock) {
      alert(isZh ? `《${item?.title}》可用只有 ${effectiveStock} 本。` : `"${item?.title}" only has ${effectiveStock} available.`);
      return;
    }
    setCart(cart.map(c => c.id === id ? { ...c, qty } : c));
  };
  const updatePrice = (id: string, price: number) => {
    setCart(cart.map(c => c.id === id ? { ...c, price: Math.max(0, price) } : c));
  };
  const removeItem = (id: string) => setCart(cart.filter(c => c.id !== id));

  const handleSave = async () => {
    if (cart.length === 0) {
      setMsg(isZh ? '改后至少要有一本书' : 'At least one book required');
      return;
    }
    if (!reason.trim()) {
      setMsg(isZh ? '请填写改动原因，会写入操作记录' : 'Please enter reason for audit');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) { setMsg('系统未配置'); setSaving(false); return; }
      const items = cart.map(c => ({ book_id: c.id, quantity: c.qty, unit_price: c.price }));
      const { error } = await (supabase as any).rpc('apply_sale_content_edit', {
        p_sale_id: sale.id,
        p_items: items,
        p_customer_name: customerName || null,
        p_payment_method: paymentMethod,
        p_payment_status: paymentStatus,
        p_discount_amount: discountAmount,
        p_sale_date: saleDate,
        p_notes: notes || null,
        p_shipping_cost: 0,
        p_reason: reason,
      });
      if (error) {
        setMsg(error.message || (isZh ? '保存失败' : 'Save failed'));
      } else {
        router.push(`/sales/${sale.id}/invoice`);
        router.refresh();
      }
    } catch (e: any) {
      setMsg(e.message || (isZh ? '保存失败' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const readableDiff = (oldVals: any, newVals: any) => {
    if (!oldVals || !newVals) return null;
    const keys = ['customer_name','payment_method','payment_status','discount_amount','sale_date','notes','subtotal','total_cost'];
    const diffs: string[] = [];
    for (const k of keys) {
      const ov = oldVals[k];
      const nv = newVals[k];
      if (JSON.stringify(ov) !== JSON.stringify(nv) && (ov !== undefined || nv !== undefined)) {
        const label = k === 'customer_name' ? (isZh ? '购书人' : 'Customer')
          : k === 'payment_method' ? (isZh ? '付款方式' : 'Payment')
          : k === 'payment_status' ? (isZh ? '状态' : 'Status')
          : k === 'discount_amount' ? (isZh ? '折扣' : 'Discount')
          : k === 'sale_date' ? (isZh ? '日期' : 'Date')
          : k === 'notes' ? (isZh ? '备注' : 'Notes')
          : k === 'subtotal' ? (isZh ? '小计' : 'Subtotal')
          : k === 'total_cost' ? (isZh ? '成本' : 'Cost')
          : k;
        const fmt = (v: any) => {
          if (k === 'payment_method' && v) {
            const l = PAYMENT_LABELS[String(v)] || { zh: String(v), en: String(v) };
            return isZh ? l.zh : l.en;
          }
          return v === null || v === undefined ? (isZh ? '空' : 'empty') : String(v);
        };
        diffs.push(`${label}: ${fmt(ov)} → ${fmt(nv)}`);
      }
    }
    // lines diff
    if (oldVals.lines && newVals.lines) {
      const oldTitles = (oldVals.lines as any[]).map((l: any) => `${l.book_title || l.sku}×${l.quantity}`).join(', ');
      const newTitles = (newVals.lines as any[]).map((l: any) => `${l.book_title || l.sku}×${l.quantity}`).join(', ');
      if (oldTitles !== newTitles) {
        diffs.push(`${isZh ? '书目' : 'Books'}: ${oldTitles || '—'} → ${newTitles || '—'}`);
      }
    }
    return diffs.length ? diffs : [isZh ? '无明显字段变化' : 'No obvious field change'];
  };

  return (
    <AppShell title={isZh ? `改单 ${sale.sale_number}` : `Edit ${sale.sale_number}`} titleZh={`改单 ${sale.sale_number}`} eyebrow={isZh ? '改动会写入操作记录，库存原子回滚重扣' : 'Edits are audited with atomic stock restore'}>
      <div className="mx-auto max-w-[900px] space-y-4">
        <Card>
          <CardTitle>{isZh ? '原订单' : 'Original Sale'}</CardTitle>
          <div className="mt-2 text-[12px] text-[#4f7a5c] space-y-1">
            <p>{sale.sale_number} • {new Date(sale.sold_at).toLocaleString()} • £{Number(sale.subtotal || 0).toFixed(2)} {Number(sale.discount_amount || 0) > 0 ? `(-£${Number(sale.discount_amount).toFixed(2)} → £${(Number(sale.subtotal||0)-Number(sale.discount_amount||0)).toFixed(2)})` : ''}</p>
            <div className="flex flex-wrap gap-2">
              {(lines || []).map((l: any) => (
                <span key={l.id} className="rounded-full bg-[#faf6ee] px-2 py-0.5">{l.books?.title || l.book_id.slice(0,6)} ×{l.quantity} @£{Number(l.unit_price).toFixed(2)}</span>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>{isZh ? '编辑书目和数量' : 'Edit Books & Quantities'}</CardTitle>
          <div className="mt-3">
            <label className="text-[11px] font-semibold">{isZh ? '添加图书（输入缩小范围）' : 'Add Book (type to filter)'}</label>
            <BookAutocomplete books={books || []} value={selectedBookId} onChange={(id) => { if (id) addBookById(id); }} isZh={isZh} placeholder={isZh ? '输入书名/代号...' : 'Type title/sku...'} />
            <div className="mt-3 space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {cart.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2 text-[12px]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0f3d2e] text-[10px] text-white">{idx+1}</span>
                    <button onClick={() => removeItem(item.id)} className="text-[14px] text-red-400 hover:text-red-600">×</button>
                    <span className="truncate font-medium">{item.title} <span className="text-[#4f7a5c] text-[10px]">({item.sku})</span></span>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-6 w-6 rounded-[6px] bg-white text-[12px]">-</button>
                      <span className="w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-6 w-6 rounded-[6px] bg-white text-[12px]">+</button>
                    </div>
                    <Input value={String(item.price)} onChange={e=>updatePrice(item.id, Number(e.target.value)||0)} className="h-7 w-[68px] text-[11px] px-1" />
                    <span className="w-[60px] text-right">£{(item.qty * item.price).toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="py-4 text-center text-[12px] text-[#4f7a5c]">{isZh ? '至少选一本' : 'Select at least one book'}</p>}
            </div>
            <div className="mt-4 space-y-1 border-t border-[#0f3d2e]/10 pt-3">
              <div className="flex items-center justify-between text-[12px]"><span>{isZh ? '小计' : 'Subtotal'}</span><span>£{subtotal.toFixed(2)}</span></div>
              {discountPctNum > 0 && <div className="flex items-center justify-between text-[12px] text-[#d26a39]"><span>{isZh ? `折扣 ${discountPctNum}%` : `Discount ${discountPctNum}%`}</span><span>-£{discountAmount.toFixed(2)}</span></div>}
              <div className="flex items-center justify-between font-semibold"><span className="text-[13px]">{isZh ? '实付' : 'Payable'}</span><span className="font-serif text-[18px]">£{netTotal.toFixed(2)}</span></div>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>{isZh ? '编辑信息' : 'Edit Info'}</CardTitle>
          {msg && <div className={`mt-3 rounded-[12px] px-3 py-2 text-[12px] ${msg.includes('失败') || msg.toLowerCase().includes('fail') || msg.includes('不足') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-[11px] font-medium">{isZh ? '购书人' : 'Customer'}</label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1" placeholder={isZh ? '人名/网单号/教会...' : 'Name / order no / church...'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium">{isZh ? '付款方式' : 'Payment'}</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 flex h-10 w-full rounded-[12px] border border-[#0f3d2e]/15 bg-white px-3 text-[12px]">
                  {Object.entries(PAYMENT_LABELS).map(([k,v]) => <option key={k} value={k}>{isZh ? v.zh : v.en}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium">{isZh ? '状态' : 'Status'}</label>
                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="mt-1 flex h-10 w-full rounded-[12px] border border-[#0f3d2e]/15 bg-white px-3 text-[12px]">
                  <option value="paid">{isZh ? '已付' : 'Paid'}</option>
                  <option value="pending">{isZh ? '待付' : 'Pending'}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium">{isZh ? '折扣 %' : 'Discount %'}</label>
                <Input type="number" min="0" max="100" step="1" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-[11px] font-medium">{isZh ? '销售日期' : 'Sale Date'}</label>
                <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium">{isZh ? '备注' : 'Notes'}</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#d26a39]">{isZh ? '改动原因 *（写入操作记录）' : 'Reason * (audit log)'}</label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder={isZh ? '例：客人改要一本，折扣写错' : 'e.g. customer changed qty, discount typo'} className="mt-1 border-[#d26a39]/30" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? (isZh ? '保存中…' : 'Saving…') : (isZh ? '保存改动' : 'Save Changes')}</Button>
              <Button variant="secondary" onClick={() => router.push('/sales')} className="flex-1">{isZh ? '返回' : 'Back'}</Button>
            </div>
            <p className="text-[11px] text-[#4f7a5c] text-center">{isZh ? '保存会原子执行：先把旧书库存返还，再扣新书库存，失败则整单回滚，操作人/原因/前后对比写入历史。' : 'Save is atomic: restore old stock, deduct new stock, rollback on failure, actor/reason/diff logged.'}</p>
          </div>
        </Card>

        {edits && edits.length > 0 && (
          <Card>
            <CardTitle>{isZh ? '本次订单的改动记录' : 'Edit History for this Sale'}</CardTitle>
            <div className="mt-3 space-y-2">
              {edits.map((ed: any) => {
                const diffs = readableDiff(ed.old_values, ed.new_values);
                return (
                  <div key={ed.id} className="rounded-[12px] bg-[#faf6ee]/60 px-3 py-2 text-[11px]">
                    <p className="font-medium">{new Date(ed.edited_at).toLocaleString()} • {ed.editor_name || ed.edited_by?.slice(0,6)} • {ed.change_type === 'content' ? (isZh ? '改书/改量' : 'Content') : (isZh ? '信息' : 'Metadata')}</p>
                    {ed.reason && <p className="text-[#4f7a5c]">{isZh ? '原因' : 'Reason'}：{ed.reason}</p>}
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      {diffs?.map((d: string, i: number) => <li key={i} className="text-[#0f3d2e]">{d}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
