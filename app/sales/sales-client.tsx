'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/app-shell';
import { BookAutocomplete } from '@/components/ui/book-autocomplete';
import { useT } from '@/lib/i18n/use-t';
import { createSale } from './actions';

type CartItem = { id: string; title: string; qty: number; price: number; shelf_position?: string; sku?: string };

type RecentSale = { id: string; sale_number: string; subtotal: number; payment_method?: string; customer_name?: string; sold_at: string };

export function SalesClient({ books, locations, recentSales }: { books?: any[]; locations?: any[]; recentSales?: RecentSale[] } = { books: [], locations: [], recentSales: [] }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [locationId, setLocationId] = useState(locations?.[0]?.id || '');
  const [selling, setSelling] = useState(false);
  const [msg, setMsg] = useState('');
  
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const discountNum = Number(discount || 0);
  const netTotal = Math.max(0, total - discountNum);

  const addBookById = (bookId: string) => {
    const found = books?.find((b: any) => b.id === bookId);
    if (found) {
      setCart([...cart, { id: found.id, title: found.title, qty: 1, price: Number(found.current_price || 10), shelf_position: found.shelf_position, sku: found.sku }]);
      setSelectedBookId('');
    }
  };

  const addToCart = () => {
    if (!selectedBookId) return;
    addBookById(selectedBookId);
  };

  const removeItem = (id: string) => setCart(cart.filter(c => c.id !== id));
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { setCart(cart.filter(c => c.id !== id)); return; }
    setCart(cart.map(c => c.id === id ? { ...c, qty } : c));
  };

  const handleConfirm = async () => {
    if (cart.length === 0) return;
    setSelling(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.set('location_id', locationId || (locations?.[0]?.id || ''));
      fd.set('items_json', JSON.stringify(cart.map(c => ({ 
        book_id: c.id, 
        quantity: c.qty,
        unit_price: c.price,
      }))));
      fd.set('sale_date', saleDate);
      fd.set('discount', discount);
      fd.set('payment_method', paymentMethod);
      fd.set('payment_status', paymentStatus);
      fd.set('customer_name', customerName);
      fd.set('notes', notes);
      fd.set('shipping_cost', '0');
      const result = await createSale(fd);
      if ((result as any)?.success) {
        setMsg(isZh ? '销售成功' : 'Sale completed');
        setCart([]);
        setCustomerName('');
        setNotes('');
        window.location.reload();
      } else {
        setMsg((result as any)?.error || (isZh ? '销售失败' : 'Sale failed'));
      }
    } catch (e: any) {
      if (false) {
      } else {
        setMsg(e.message || (isZh ? '销售失败' : 'Sale failed'));
      }
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
                <label className="text-[11px] font-medium">{isZh ? '折扣 £' : 'Discount £'}</label>
                <Input type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0.00" className="mt-1" />
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

            {locations && locations.length > 1 && (
              <div>
                <label className="text-[12px] font-medium">{tt('sales.location')}</label>
                <select value={locationId} onChange={e => setLocationId(e.target.value)} className="mt-1 flex h-10 w-full rounded-[12px] border border-[#0f3d2e]/15 bg-white px-3 text-[12px]">
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                </select>
              </div>
            )}

            <div className="rounded-[16px] border border-dashed border-[#0f3d2e]/20 p-4">
              <label className="text-[11px] font-semibold">{isZh ? '选择图书（输入缩小范围，显示书架位置）' : 'Select Book (type to filter, shows shelf location)'}</label>
              <BookAutocomplete books={books || []} value={selectedBookId} onChange={(id) => { setSelectedBookId(id); if (id) addBookById(id); }} isZh={isZh} placeholder={isZh ? '输入书名/代号...' : 'Type title/sku...'} />
              <div className="mt-2 flex gap-2">
                <Input value={scanInput} onChange={e => setScanInput(e.target.value)} placeholder={tt('sales.scanPlaceholder')} className="flex-1 text-[11px]" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const q = scanInput.trim().toLowerCase(); if (!q) return; let found = books?.find((b:any) => b.sku.toLowerCase() === q); if (!found) found = books?.find((b:any) => b.title.toLowerCase().includes(q) || b.sku.toLowerCase().includes(q)); if (found) { addBookById(found.id); setScanInput(''); } } }} />
                <Button variant="secondary" size="sm" onClick={() => { const q = scanInput.trim().toLowerCase(); if (!q) return; let found = books?.find((b:any) => b.sku.toLowerCase() === q); if (!found) found = books?.find((b:any) => b.title.toLowerCase().includes(q)); if (found) { addBookById(found.id); setScanInput(''); } }}>{tt('sales.add')}</Button>
              </div>

              <div className="mt-3 space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2 text-[12px]">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button onClick={() => removeItem(item.id)} className="text-[14px] text-red-400 hover:text-red-600">×</button>
                      <div className="flex-1 min-w-0">
                        <span className="truncate">{item.title} <span className="text-[#4f7a5c] text-[10px]">({item.sku})</span></span>
                        {item.shelf_position && <span className="ml-2 inline-flex text-[10px] bg-white px-1.5 py-0.5 rounded-full border">{item.shelf_position}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-6 w-6 rounded-[6px] bg-white text-[12px]">-</button>
                        <span className="w-6 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-6 w-6 rounded-[6px] bg-white text-[12px]">+</button>
                      </div>
                    </div>
                    <span className="ml-2">£{(item.qty * item.price).toFixed(2)}</span>
                  </div>
                ))}
                {cart.length === 0 && <p className="py-4 text-center text-[12px] text-[#4f7a5c]">{isZh ? '购物车为空，选书添加' : 'Cart empty, select books to add'}</p>}
              </div>

              <div className="mt-4 space-y-1 border-t border-[#0f3d2e]/10 pt-3">
                <div className="flex items-center justify-between text-[12px]"><span>{isZh ? '小计' : 'Subtotal'}</span><span>£{total.toFixed(2)}</span></div>
                {discountNum > 0 && <div className="flex items-center justify-between text-[12px] text-[#d26a39]"><span>{isZh ? '折扣' : 'Discount'}</span><span>-£{discountNum.toFixed(2)}</span></div>}
                <div className="flex items-center justify-between font-semibold"><span className="text-[13px]">{tt('sales.total')}</span><span className="font-serif text-[18px]">£{netTotal.toFixed(2)}</span></div>
              </div>

              <Button className="mt-3 w-full" onClick={handleConfirm} disabled={selling || cart.length === 0}>{selling ? (isZh ? '处理中…' : 'Processing...') : tt('sales.confirmSale')}</Button>
              <p className="mt-2 text-center text-[11px] text-[#4f7a5c]">{tt('sales.confirmHint')}</p>
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
            <CardTitle>{isZh ? '打印发票' : 'Print Invoice'}</CardTitle>
            <p className="mt-2 text-[11px] text-[#4f7a5c]">{isZh ? '含单号、日期、书名、数量、售价、折扣、付款方式、购书人。点击上方最近销售的发票按钮可预览打印。' : 'Includes sale no, date, books, qty, price, discount, payment, customer. Click invoice button above to preview.'}</p>
            <div className="mt-3 rounded-[10px] bg-[#faf6ee] p-3 text-[11px]">
              <p className="font-semibold">COCM Bookshop Invoice</p>
              <p className="mt-1 text-[#4f7a5c]">Includes: Logo, Sale Number (C-format), Date, Customer (Name/Order/Church), Payment Method/Status, Books (Title/SKU/Qty/Price), Shelf Location for picking, Subtotal, Discount, Net Total</p>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
