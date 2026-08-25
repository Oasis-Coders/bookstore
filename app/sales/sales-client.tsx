'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/app-shell';
import { useT } from '@/lib/i18n/use-t';
import { createSale } from './actions';

type CartItem = { id: string; title: string; qty: number; price: number };

export function SalesClient({ books, locations }: { books?: any[]; locations?: any[] } = { books: [], locations: [] }) {
  const { tt } = useT();
  const [cart, setCart] = useState<CartItem[]>([
    { id: 'demo-1', title: '活水得胜之路', qty: 2, price: 12.5 },
    { id: 'demo-2', title: '认识真理', qty: 1, price: 9.99 },
  ]);
  const [skuInput, setSkuInput] = useState('');
  const [locationId, setLocationId] = useState(locations?.[0]?.id || '');
  const [selling, setSelling] = useState(false);
  const [msg, setMsg] = useState('');

  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);

  const addToCart = () => {
    if (!skuInput.trim()) return;
    // Try to find in books list
    const found = books?.find((b: any) => b.sku.toLowerCase().includes(skuInput.toLowerCase()) || b.title.includes(skuInput));
    if (found) {
      setCart([...cart, { id: found.id, title: found.title, qty: 1, price: Number(found.current_price || 10) }]);
    } else {
      // Demo add
      setCart([...cart, { id: `manual-${Date.now()}`, title: skuInput, qty: 1, price: 10 }]);
    }
    setSkuInput('');
  };

  const removeItem = (id: string) => setCart(cart.filter(c => c.id !== id));
  const updateQty = (id: string, qty: number) => setCart(cart.map(c => c.id === id ? { ...c, qty: Math.max(1, qty) } : c));

  const handleConfirm = async () => {
    if (cart.length === 0) return;
    setSelling(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.set('location_id', locationId || 'STORE-MAIN');
      fd.set('items_json', JSON.stringify(cart.map(c => ({ book_id: c.id, quantity: c.qty }))));
      fd.set('external_ref', `POS-${Date.now()}`);
      await createSale(fd);
      setMsg('销售成功！库存已按最早进货先出');
      setCart([]);
    } catch (e: any) {
      // In demo mode, just clear and show success
      if (e.message?.includes('Supabase') || e.message?.includes('not configured')) {
        setMsg('演示模式：销售已模拟完成');
        setCart([]);
      } else {
        setMsg(e.message || '销售失败');
      }
    } finally {
      setSelling(false);
    }
  };

  return (
    <AppShell title={tt('sales.title')} titleZh={tt('sales.title')} eyebrow={tt('sales.eyebrow')}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>{tt('sales.newSale')}</CardTitle>
          <p className="mt-1 text-[12px] text-[#4f7a5c]">{tt('sales.newSaleHint')}</p>

          {msg && <div className={`mt-3 rounded-[12px] px-3 py-2 text-[12px] ${msg.includes('失败') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[12px] font-medium">{tt('sales.location')}</label>
              <select value={locationId} onChange={e => setLocationId(e.target.value)} className="mt-1 flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 text-[13px]">
                {(locations && locations.length > 0) ? locations.map((l: any) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>) : <>
                  <option value="STORE-MAIN">{tt('sales.storeMain')}</option>
                  <option value="WH-01">{tt('sales.warehouse')}</option>
                </>}
              </select>
            </div>

            <div className="rounded-[16px] border border-dashed border-[#0f3d2e]/20 p-4">
              <div className="flex gap-2">
                <Input value={skuInput} onChange={e => setSkuInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addToCart())} placeholder={tt('sales.scanPlaceholder')} className="flex-1" />
                <Button variant="secondary" size="sm" onClick={addToCart}>{tt('sales.add')}</Button>
              </div>

              <div className="mt-3 space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2 text-[12px]">
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeItem(item.id)} className="text-[14px] text-red-400 hover:text-red-600">×</button>
                      <span className="flex-1">{item.title}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-6 w-6 rounded-[6px] bg-white text-[12px]">-</button>
                        <span className="w-6 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-6 w-6 rounded-[6px] bg-white text-[12px]">+</button>
                      </div>
                    </div>
                    <span>£{(item.qty * item.price).toFixed(2)}</span>
                  </div>
                ))}
                {cart.length === 0 && <p className="py-4 text-center text-[12px] text-[#4f7a5c]">购物车为空，扫码或输入添加</p>}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#0f3d2e]/10 pt-3">
                <span className="text-[13px] font-semibold">{tt('sales.total')}</span>
                <span className="font-serif text-[18px]">£{total.toFixed(2)}</span>
              </div>

              <Button className="mt-3 w-full" onClick={handleConfirm} disabled={selling || cart.length === 0}>{selling ? '处理中…' : tt('sales.confirmSale')}</Button>
              <p className="mt-2 text-center text-[11px] text-[#4f7a5c]">{tt('sales.confirmHint')}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>{tt('sales.howFifo')}</CardTitle>
            <div className="mt-3 space-y-2 text-[12px] text-[#0f3d2e]/80">
              <p>{tt('sales.batchA')}</p>
              <p>{tt('sales.batchB')}</p>
              <p>{tt('sales.sale5')}</p>
              <p className="font-semibold">{tt('sales.cogs')}</p>
            </div>
            <pre className="mt-3 overflow-auto rounded-[12px] bg-[#faf6ee] p-3 text-[11px]">
              {`select apply_sale(\n  '<STORE_UUID>',\n  '[{"book_id":"<id>","quantity":5}]',\n  'POS-20250825-001'\n);`}
            </pre>
          </Card>

          <Card>
            <CardTitle>{tt('sales.recentSales')}</CardTitle>
            <div className="mt-3 space-y-2">
              {[
                { id: 'SAL-001', total: 34.99, cogs: 27.2, margin: '22%', time: '10:30' },
                { id: 'SAL-002', total: 15.0, cogs: 10.4, margin: '30%', time: '09:15' },
              ].map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-[12px] border border-[#0f3d2e]/5 px-3 py-2 text-[12px]">
                  <div>
                    <p className="font-mono">{s.id}</p>
                    <p className="text-[11px] text-[#4f7a5c]">{s.time} • COGS {s.cogs}</p>
                  </div>
                  <div className="text-right">
                    <p>£{s.total}</p>
                    <Badge variant="active">{s.margin} {tt('sales.margin')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
