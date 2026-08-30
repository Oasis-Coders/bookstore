'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { useT } from '@/lib/i18n/use-t';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function EditSaleClient({ sale, lines, edits }: { sale: any; lines: any[]; edits: any[] }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const router = useRouter();
  const [customerName, setCustomerName] = useState(sale.customer_name || '');
  const [paymentMethod, setPaymentMethod] = useState(sale.payment_method || 'cash');
  const [paymentStatus, setPaymentStatus] = useState(sale.payment_status || 'paid');
  const [discountAmount, setDiscountAmount] = useState(String(sale.discount_amount || 0));
  const [saleDate, setSaleDate] = useState(sale.sale_date || new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState(sale.notes || sale.customer_note || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    if (!reason.trim()) {
      setMsg(isZh ? '请填写改动原因，会写入操作记录' : 'Please enter reason for audit');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) { setMsg('系统未配置'); setSaving(false); return; }
      const { error } = await (supabase as any).rpc('apply_sale_metadata_edit', {
        p_sale_id: sale.id,
        p_customer_name: customerName || null,
        p_payment_method: paymentMethod,
        p_payment_status: paymentStatus,
        p_discount_amount: Number(discountAmount || 0),
        p_sale_date: saleDate,
        p_notes: notes || null,
        p_shipping_cost: 0,
        p_reason: reason,
      });
      if (error) {
        setMsg(error.message || (isZh ? '保存失败' : 'Save failed'));
      } else {
        setMsg(isZh ? '已保存，操作记录已写入' : 'Saved, audit logged');
        setTimeout(() => router.push(`/sales/${sale.id}/invoice`), 1200);
      }
    } catch (e: any) {
      setMsg(e.message || (isZh ? '保存失败' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title={isZh ? `改单 ${sale.sale_number}` : `Edit ${sale.sale_number}`} titleZh={`改单 ${sale.sale_number}`} eyebrow={isZh ? '改动会写入操作记录' : 'Edits are audited'}>
      <div className="mx-auto max-w-[840px] space-y-4">
        <Card>
          <CardTitle>{isZh ? '当前订单' : 'Current Sale'}</CardTitle>
          <div className="mt-2 text-[12px] text-[#4f7a5c] space-y-1">
            <p>{sale.sale_number} • {new Date(sale.sold_at).toLocaleString()} • £{Number(sale.subtotal || 0).toFixed(2)}</p>
            <div className="flex flex-wrap gap-2">
              {lines.map((l: any) => (
                <span key={l.id} className="rounded-full bg-[#faf6ee] px-2 py-0.5">{l.books?.title || l.book_id.slice(0,6)} ×{l.quantity} @£{Number(l.unit_price).toFixed(2)}</span>
              ))}
            </div>
            <p className="text-[11px] text-amber-700">{isZh ? '注意：此版本仅可改客户/付款/折扣/日期/备注，不改书和数量。如需改书请联系管理员作废重开，库存会自动返还。' : 'Note: This version edits customer/payment/discount/date/notes only. To change books, void and recreate - stock returns automatically.'}</p>
          </div>
        </Card>

        <Card>
          <CardTitle>{isZh ? '编辑信息' : 'Edit Info'}</CardTitle>
          {msg && <div className={`mt-3 rounded-[12px] px-3 py-2 text-[12px] ${msg.includes('失败') || msg.toLowerCase().includes('fail') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-[11px] font-medium">{isZh ? '购书人' : 'Customer'}</label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium">{isZh ? '付款方式' : 'Payment'}</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 flex h-10 w-full rounded-[12px] border border-[#0f3d2e]/15 bg-white px-3 text-[12px]">
                  <option value="cash">{isZh ? '现金' : 'Cash'}</option>
                  <option value="card">{isZh ? '刷卡' : 'Card'}</option>
                  <option value="bank_transfer">{isZh ? '银行转账' : 'Bank Transfer'}</option>
                  <option value="shopify">{isZh ? '网付' : 'Shopify'}</option>
                  <option value="mix">{isZh ? '混合' : 'Mix'}</option>
                  <option value="deferral">{isZh ? '赊账' : 'Deferral'}</option>
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
                <label className="text-[11px] font-medium">{isZh ? '折扣金额 £' : 'Discount £'}</label>
                <Input type="number" step="0.01" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} className="mt-1" />
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
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder={isZh ? '例：客人改付刷卡，折扣写错' : 'e.g. customer changed to card, discount typo'} className="mt-1 border-[#d26a39]/30" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? (isZh ? '保存中…' : 'Saving…') : (isZh ? '保存改动' : 'Save Changes')}</Button>
              <Button variant="secondary" onClick={() => router.push(`/sales`)} className="flex-1">{isZh ? '返回' : 'Back'}</Button>
            </div>
          </div>
        </Card>

        {edits && edits.length > 0 && (
          <Card>
            <CardTitle>{isZh ? '本次订单的改动记录' : 'Edit History for this Sale'}</CardTitle>
            <div className="mt-3 space-y-2">
              {edits.map((ed: any) => (
                <div key={ed.id} className="rounded-[12px] bg-[#faf6ee]/60 px-3 py-2 text-[11px]">
                  <p className="font-medium">{new Date(ed.edited_at).toLocaleString()} • {ed.editor_name || ed.edited_by.slice(0,6)} • {ed.change_type}</p>
                  {ed.reason && <p className="text-[#4f7a5c]">原因：{ed.reason}</p>}
                  <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-[#4f7a5c]">改前：</span><span className="font-mono">{JSON.stringify(ed.old_values)}</span></div>
                    <div><span className="text-[#0f3d2e]">改后：</span><span className="font-mono">{JSON.stringify(ed.new_values)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
