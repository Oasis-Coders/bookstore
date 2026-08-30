'use client';

import { useState, useMemo } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/app-shell';
import { BookAutocomplete } from '@/components/ui/book-autocomplete';
import { useT } from '@/lib/i18n/use-t';
import { createSale } from './actions';

type CartItem = { id: string; title: string; qty: number; price: number; shelf_position?: string; sku?: string; stock?: number };

type RecentSale = { id: string; sale_number: string; subtotal: number; payment_method?: string; customer_name?: string; sold_at: string };

export function SalesClient({ books, recentSales, stockMap }: { books?: any[]; recentSales?: RecentSale[]; stockMap?: Record<string, number> } = { books: [], recentSales: [], stockMap: {} }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [selling, setSelling] = useState(false);
  const [msg, setMsg] = useState('');
  
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0,10));
  const [discountPercent, setDiscountPercent] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const discountPctNum = Math.min(100, Math.max(0, Number(discountPercent || 0)));
  const discountAmount = total * discountPctNum / 100;
  const netTotal = Math.max(0, total - discountAmount);
  const totalQty = cart.reduce((s,i)=>s+i.qty,0);

  const addBookById = (bookId: string) => {
    const found = books?.find((b: any) => b.id === bookId);
    if (!found) return;
    const stock = stockMap?.[found.id] ?? (found as any).quantity_on_hand ?? 999;
    // zero stock blocking - Luke requested warning and prevent adding
    if (stock <= 0) {
      alert(isZh ? `《${found.title}》当前库存为 0，无法加入销售单。请先盘点/进货。` : `"${found.title}" has 0 stock and cannot be added. Please check inventory.`);
      return;
    }
    // check existing
    const existing = cart.find(c=>c.id===found.id);
    if (existing) {
      setCart(cart.map(c=>c.id===found.id ? {...c, qty: c.qty+1} : c));
    } else {
      setCart([...cart, { id: found.id, title: found.title, qty: 1, price: Number(found.current_price || 10), shelf_position: found.shelf_position, sku: found.sku, stock }]);
    }
    setSelectedBookId('');
  };

  const removeItem = (id: string) => setCart(cart.filter(c => c.id !== id));
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { setCart(cart.filter(c => c.id !== id)); return; }
    setCart(cart.map(c => c.id === id ? { ...c, qty } : c));
  };
  const updatePrice = (id: string, price: number) => {
    setCart(cart.map(c => c.id === id ? { ...c, price: Math.max(0, price) } : c));
  };

  const handleConfirm = async () => {
    if (cart.length === 0) return;
    setSelling(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.set('items_json', JSON.stringify(cart.map(c => ({ 
        book_id: c.id, 
        quantity: c.qty,
        unit_price: c.price,
      }))));
      fd.set('sale_date', saleDate);
      fd.set('discount', String(discountAmount));
      fd.set('discount_percent', String(discountPctNum));
      fd.set('payment_method', paymentMethod);
      fd.set('payment_status', paymentStatus);
      fd.set('customer_name', customerName);
      fd.set('notes', notes);
      fd.set('shipping_cost', '0');
      const result = await createSale(fd);
      if ((result as any)?.success) {
        setMsg(isZh ? `销售成功 ${totalQty}本/${cart.length}种 已出库` : `Sale completed ${totalQty} pcs/${cart.length} titles`);
        setCart([]);
        setCustomerName('');
        setNotes('');
        setDiscountPercent('0');
        window.location.reload();
      } else {
        setMsg((result as any)?.error || (isZh ? '销售失败' : 'Sale failed'));
      }
    } catch (e: any) {
      setMsg(e.message || (isZh ? '销售失败' : 'Sale failed'));
    } finally {
      setSelling(false);
    }
  };

  const handlePrintInvoice = (sale: RecentSale) => {
    window.open(`/sales/${sale.id}/invoice`, '_blank');
  };

  return (
    <AppShell title={tt('sales.title')} titleZh={tt('sales.title')} eyebrow={tt('sales.eyebrow')}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>{tt('sales.newSale')}</CardTitle>
          <p className="mt-1 text-[12px] text-[#4f7a5c]">{tt('sales.newSaleHint')}</p>

          {msg && <div className={`mt-3 rounded-[12px] px-3 py-2 text-[12px] ${msg.includes('失败') || msg.toLowerCase().includes('fail') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium">{isZh ? '销售日期' : 'Sale Date'} *</label>
                <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-[11px] font-medium">{isZh ? '折扣 %（如20=八折）' : 'Discount % (e.g. 20=20% off)'}</label>
                <div className="mt-1 flex gap-2">
                  <Input type="number" min="0" max="100" step="1" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="0" className="flex-1" />
                  <span className="flex h-10 items-center rounded-[12px] bg-[#faf6ee] px-3 text-[11px] text-[#4f7a5c]">{discountPctNum>0 ? `-£${discountAmount.toFixed(2)}` : '0%'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium">{isZh ? '付款方式' : 'Payment Method'}</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 flex h-10 w-full rounded-[12px] border border-[#0f3d2e]/15 bg-white px-3 text-[12px]">
                  <option value="cash">{isZh ? '现金' : 'Cash'}</option>
                  <option value="card">{isZh ? '刷卡' : 'Card'}</option>
                  <option value="bank_transfer">{isZh ? '银行转账' : 'Bank Transfer'}</option>
                  <option value="shopify">{isZh ? '网付' : 'Shopify'}</option>
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

            <div>
              <label className="text-[11px] font-medium">{isZh ? '购书人（人名/网单号/教会/团契）' : 'Customer (Name/Order No/Church/Fellowship)'} </label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={isZh ? '人名、网单号、教会...' : 'Name, order no, church...'} className="mt-1" />
            </div>

            <div className="rounded-[16px] border border-dashed border-[#0f3d2e]/20 p-4">
              <label className="text-[11px] font-semibold">{isZh ? '选择图书（输入缩小范围，显示书架位置）' : 'Select Book (type to filter, shows shelf location)'}</label>
              <BookAutocomplete books={books || []} value={selectedBookId} onChange={(id) => { if (id) addBookById(id); }} isZh={isZh} placeholder={isZh ? '输入书名/代号...' : 'Type title/sku...'} />
              <div className="mt-2 flex gap-2">
                <Input value={scanInput} onChange={e => setScanInput(e.target.value)} placeholder={tt('sales.scanPlaceholder')} className="flex-1 text-[11px]" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const q = scanInput.trim().toLowerCase(); if (!q) return; let found = books?.find((b:any) => b.sku.toLowerCase() === q); if (!found) found = books?.find((b:any) => b.title.toLowerCase().includes(q) || b.sku.toLowerCase().includes(q)); if (found) { addBookById(found.id); setScanInput(''); } } }} />
                <Button variant="secondary" size="sm" onClick={() => { const q = scanInput.trim().toLowerCase(); if (!q) return; let found = books?.find((b:any) => b.sku.toLowerCase() === q); if (!found) found = books?.find((b:any) => b.title.toLowerCase().includes(q)); if (found) { addBookById(found.id); setScanInput(''); } }}>{tt('sales.add')}</Button>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-[#4f7a5c]">
                <span>{isZh ? `已选 ${cart.length} 种 / 共 ${totalQty} 本` : `${cart.length} titles / ${totalQty} pcs selected`}</span>
                {cart.length>0 && <button onClick={()=>setCart([])} className="text-red-500 hover:text-red-700">{isZh ? '清空' : 'Clear'}</button>}
              </div>

              <div className="mt-2 space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2 text-[12px]">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0f3d2e] text-[10px] text-white">{idx+1}</span>
                      <button onClick={() => removeItem(item.id)} className="text-[14px] text-red-400 hover:text-red-600">×</button>
                      <div className="flex-1 min-w-0">
                        <span className="truncate font-medium">{item.title} <span className="text-[#4f7a5c] text-[10px]">({item.sku})</span></span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.shelf_position && <span className="inline-flex text-[10px] bg-white px-1.5 py-0.5 rounded-full border">{item.shelf_position}</span>}
                          {item.stock !== undefined && item.stock <= 2 && <span className={`text-[10px] ${item.stock===0 ? 'text-red-600' : 'text-amber-600'}`}>{item.stock===0 ? (isZh ? '零库存' : '0 stock') : `${item.stock} left`}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-6 w-6 rounded-[6px] bg-white text-[12px]">-</button>
                        <span className="w-6 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-6 w-6 rounded-[6px] bg-white text-[12px]">+</button>
                      </div>
                      <Input value={String(item.price)} onChange={e=>updatePrice(item.id, Number(e.target.value)||0)} className="h-7 w-[68px] text-[11px] px-1" title={isZh ? '清仓/赠送可手动改价' : 'Clearance/gift - edit price'} />
                      <span className="w-[60px] text-right">£{(item.qty * item.price).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && <p className="py-4 text-center text-[12px] text-[#4f7a5c]">{isZh ? '购物车为空，选书添加' : 'Cart empty, select books to add'}</p>}
              </div>

              <div className="mt-4 space-y-1 border-t border-[#0f3d2e]/10 pt-3">
                <div className="flex items-center justify-between text-[12px]"><span>{isZh ? '小计' : 'Subtotal'}</span><span>£{total.toFixed(2)}</span></div>
                {discountPctNum > 0 && <div className="flex items-center justify-between text-[12px] text-[#d26a39]"><span>{isZh ? `折扣 ${discountPctNum}%` : `Discount ${discountPctNum}%`}</span><span>-£{discountAmount.toFixed(2)}</span></div>}
                <div className="flex items-center justify-between font-semibold"><span className="text-[13px]">{tt('sales.total')}</span><span className="font-serif text-[18px]">£{netTotal.toFixed(2)}</span></div>
              </div>

              <Button className="mt-3 w-full" onClick={handleConfirm} disabled={selling || cart.length === 0}>{selling ? (isZh ? '处理中…' : 'Processing...') : tt('sales.confirmSale')}</Button>
              <p className="mt-2 text-center text-[11px] text-[#4f7a5c]">{isZh ? '库存不足时整笔销售取消（原子操作）。零库存已阻止加入。' : 'Sale is atomic - cancelled if any item insufficient. Zero-stock blocked.'}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle className="flex items-center justify-between">{isZh ? '最近销售' : 'Recent Sales'} <span className="text-[11px] font-normal text-[#4f7a5c]">{isZh ? '按时间倒序' : 'Latest first'}</span></CardTitle>
            <div className="mt-3 space-y-2">
              {(recentSales && recentSales.length > 0 ? recentSales : []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-[12px] border border-[#0f3d2e]/5 px-3 py-2 text-[12px]">
                  <div>
                    <p className="font-mono font-semibold">{s.sale_number}</p>
                    <p className="text-[11px] text-[#4f7a5c]">{s.sold_at} • {s.payment_method} {s.customer_name ? `• ${s.customer_name}` : ''}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p>£{Number(s.subtotal || s.total || 0).toFixed(2)}</p>
                      <Badge variant="active" className="text-[10px]">{s.payment_method || 'cash'}</Badge>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => handlePrintInvoice(s)}>{isZh ? '发票' : 'Invoice'}</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>{isZh ? '改单说明' : 'Correcting Sales'}</CardTitle>
            <div className="mt-2 text-[11px] text-[#4f7a5c] space-y-1.5 leading-relaxed">
              <p>{isZh ? '• 确认前：直接在左侧购物车点 × 删除或改数量/改价。' : '• Before confirm: Remove via × or adjust qty/price in cart.'}</p>
              <p>{isZh ? '• 确认后客人改主意：联系管理员作废整单（库存返还），再重新开一单；暂不支持部分退货。' : '• After confirm: Contact admin to void whole sale (stock returns) and re-create; partial returns not yet supported.'}</p>
              <p>{isZh ? '• 清仓/赠送（代号 Sales）：加入购物车后直接在单价框改价即可，系统按改后价开票。' : '• Clearance/gift (code Sales): Edit price in cart, invoice uses edited price.'}</p>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
