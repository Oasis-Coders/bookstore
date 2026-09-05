'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');
  const [sale, setSale] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Follow the UI language (same source as lib/i18n context): zh -> zh-CN, en -> en-GB
  const uiLocale: 'zh-CN' | 'en-GB' = (() => {
    if (typeof document === 'undefined') return 'zh-CN';
    const cookie = document.cookie.split('; ').find((r) => r.trim().startsWith('lang='))?.split('=')[1];
    if (cookie === 'en') return 'en-GB';
    if (cookie === 'zh') return 'zh-CN';
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null;
    if (stored === 'en') return 'en-GB';
    return 'zh-CN';
  })();
  const isZh = uiLocale === 'zh-CN';
  const fmtGBP = (n: number) => new Intl.NumberFormat(uiLocale, { style: 'currency', currency: 'GBP' }).format(n);
  const payMethodLabel: Record<string, string> = {
    cash: isZh ? '现金' : 'Cash',
    card: isZh ? '刷卡' : 'Card',
    bank_transfer: isZh ? '银行转账' : 'Bank Transfer',
    shopify: 'Shopify',
    mix: isZh ? '混合' : 'Mix',
    deferral: isZh ? '挂账' : 'Deferral',
  };

  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }
    (async () => {
      const { data: saleData, error: saleErr } = await supabase.from('sales_transactions').select('*').eq('id', id).single();
      if (saleErr || !saleData) {
        setError('Invoice not found');
        setLoading(false);
        return;
      }
      setSale(saleData);
      const { data: lineData } = await supabase.from('sales_transaction_lines').select('*, books(id, title, sku, category)').eq('sale_id', id);
      setLines(lineData || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-10 text-[12px] text-[#6b8a7a]">{isZh ? '发票加载中…' : 'Loading invoice…'}</div>;
  if (error) return <div className="p-10 text-[12px] text-red-600">{isZh ? '找不到发票' : 'Invoice not found'}</div>;
  if (!sale) return <div className="p-10 text-[12px]">{isZh ? '未找到' : 'Not found'}</div>;

  const invoiceNo = sale.sale_number?.replace(/^C/, '').replace(/^SAL-/, '') || sale.id.slice(0,6);
  const purchaseDate = sale.sale_date ? new Date(sale.sale_date).toLocaleDateString(uiLocale) : new Date(sale.sold_at).toLocaleDateString(uiLocale);
  const customerName = sale.customer_name || '';
  const paymentMethod = sale.payment_method || 'cash';

  let bookSubtotal = 0;
  const enriched = (lines || []).map((l: any, idx: number) => {
    const qty = Number(l.quantity);
    const unit = Number(l.unit_price);
    const discPct = Number(l.discount_percent || 0);
    const discAmt = Number(l.discount_amount || 0);
    const gross = qty * unit;
    let discount = discAmt;
    if (discPct > 0 && discAmt === 0) discount = gross * discPct / 100;
    const net = gross - discount;
    bookSubtotal += net;
    return {
      idx: idx+1,
      cat: (isZh && l.books?.category === 'Sales' ? '特价' : l.books?.category?.slice(0,8)) || l.books?.sku?.slice(0,6) || '-',
      title: l.books?.title || 'Unknown Book',
      qty,
      unit,
      discPct,
      discAmt: discount,
      net,
      gross,
    };
  });

  const globalDisc = Number(sale.discount_amount || 0);
  const totalGross = enriched.reduce((s:number, e:any)=>s+e.gross, 0);
  // If global discount exists and no per-line discount, keep bookSubtotal as gross, will subtract globally in totals
  // For display, we keep per-line discounts as is, and show global discount separately
  const bookSubtotalAfterGlobal = Math.max(0, bookSubtotal - (enriched.every((e:any)=>e.discAmt===0) ? globalDisc : 0));
  const effectiveBookTotal = enriched.every((e:any)=>e.discAmt===0) ? (totalGross - globalDisc > 0 ? totalGross - globalDisc : bookSubtotalAfterGlobal) : bookSubtotal;

  const shipping = Number((sale as any).shipping_cost || 0);
  const total = (enriched.every((e:any)=>e.discAmt===0) ? Math.max(0, totalGross - globalDisc) : bookSubtotal) + shipping;
  const displayBookSubtotal = enriched.every((e:any)=>e.discAmt===0) ? totalGross : bookSubtotal;

  return (
    <div className="min-h-screen bg-white text-[#0f1f17] print:bg-white">
      <style>{`@media print { .no-print { display:none } body { -webkit-print-color-adjust: exact } }`}</style>
      <div className="mx-auto max-w-[820px] p-6 sm:p-10 font-serif">
        <div className="flex justify-between items-start border-b-2 border-[#0f3d2e] pb-5">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">COCM Bookshop</h1>
            <p className="text-[11px] text-[#5a7a6a] mt-1">活水书房</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#6b8a7a] uppercase tracking-widest">{isZh ? '发票编号' : 'Invoice No'}</p>
            <p className="text-[20px] font-bold">{invoiceNo}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-8 text-[12px]">
          <div>
            <p className="text-[11px] text-[#6b8a7a] uppercase tracking-widest">{isZh ? '购买日期' : 'Purchase Date'}</p>
            <p className="mt-1">{purchaseDate}</p>
            {customerName && <><p className="mt-3 text-[11px] text-[#6b8a7a] uppercase tracking-widest">{isZh ? '客户' : 'Customer'}</p><p className="mt-1">{customerName}</p></>}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#6b8a7a] uppercase tracking-widest">{isZh ? '付款方式' : 'Payment Method'}</p>
            <p className="mt-1 capitalize">{payMethodLabel[paymentMethod] || paymentMethod.replace('_',' ')}</p>
          </div>
        </div>

        <div className="mt-8 border border-[#0f3d2e]/20 rounded-[8px] overflow-hidden">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-[#f6f3ee] text-left text-[11px] text-[#5a7a6a]">
                <th className="py-2.5 px-3 font-semibold w-[32px]">#</th>
                <th className="py-2.5 px-2 font-semibold w-[70px]">{isZh ? '分类' : 'CAT'}</th>
                <th className="py-2.5 px-3 font-semibold">{isZh ? '书名' : 'Book Name'}</th>
                <th className="py-2.5 px-2 font-semibold text-right w-[52px]">{isZh ? '数量' : 'Qty'}</th>
                <th className="py-2.5 px-2 font-semibold text-right w-[72px]">{isZh ? '单价' : 'Price £'}</th>
                <th className="py-2.5 px-2 font-semibold text-right w-[64px]">{isZh ? '折扣' : 'Disc.'}</th>
                <th className="py-2.5 px-3 font-semibold text-right w-[88px]">{isZh ? '小计' : 'Subtotal £'}</th>
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-[#8a9a8e]">{isZh ? '本次销售无商品' : 'No items in this sale'}</td></tr>}
              {enriched.map((e:any)=>(
                <tr key={e.idx} className="border-t border-[#ece8e0]">
                  <td className="py-2.5 px-3">{e.idx}</td>
                  <td className="py-2.5 px-2 font-mono text-[11px]">{e.cat}</td>
                  <td className="py-2.5 px-3">{e.title}</td>
                  <td className="py-2.5 px-2 text-right">{e.qty}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{fmtGBP(e.unit)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{e.discPct>0 ? `${e.discPct}%` : (e.discAmt>0 ? fmtGBP(e.discAmt) : '-')}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmtGBP(e.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-[280px] text-[12.5px] space-y-2">
            <div className="flex justify-between py-1"><span className="text-[#5a7a6a]">{isZh ? '图书小计' : 'Book Subtotal'}</span><span className="font-medium tabular-nums">{fmtGBP(displayBookSubtotal)}</span></div>
            {globalDisc > 0 && enriched.every((e:any)=>e.discAmt===0) && (
              <div className="flex justify-between py-1 text-[#d26a39]"><span>{isZh ? '折扣' : 'Discount'} {totalGross>0 ? `${Math.round(globalDisc/totalGross*100)}%` : ''}</span><span className="tabular-nums">-{fmtGBP(globalDisc)}</span></div>
            )}
            <div className="flex justify-between py-1"><span className="text-[#5a7a6a]">{isZh ? '邮费' : 'P & P Cost'}</span><span className="tabular-nums">{fmtGBP(shipping)}</span></div>
            <div className="flex justify-between py-2 border-t-2 border-[#0f3d2e] font-bold text-[14px] mt-2 pt-2"><span>{isZh ? '总计：' : 'Total:'}</span><span className="tabular-nums">{fmtGBP(total)}</span></div>
          </div>
        </div>

        <div className="mt-10 rounded-[10px] bg-[#faf6ee] border border-[#ece5d6] p-4 text-[11.5px] leading-relaxed text-[#3d5a4e]">
          <p className="font-semibold text-[#0f3d2e] mb-1">{isZh ? '付款方式' : 'Payment Method'}</p>
          <p>{isZh ? '支票付款：抬头请写 COCM' : 'By cheque: Please make cheque payable to COCM'}</p>
          <p>{isZh ? '请在支票背面注明发票编号' : 'Please quote Invoice No. on the back of the cheque'}</p>
          <p className="mt-2">{isZh ? '银行转账：' : 'By bank transfer:'}</p>
          <p>{isZh ? '账户名：COCM' : 'Account name: COCM'}</p>
          <p>{isZh ? '账号：00025186；银行代码：40-52-40' : 'Account no: 00025186 ; Sort code: 40-52-40'}</p>
          <p>{isZh ? '转账时请以发票编号作为备注。' : 'Please quote your invoice number as reference when transferring payment.'}</p>
        </div>

        <div className="no-print mt-8 flex gap-2">
          <button onClick={()=>window.print()} className="rounded-full bg-[#0f3d2e] text-white px-5 h-9 text-[13px]">{isZh ? '打印' : 'Print'}</button>
          <a href="/sales" className="rounded-full border border-[#0f3d2e]/20 px-5 h-9 inline-flex items-center text-[13px]">{isZh ? '返回销售' : 'Back to Sales'}</a>
        </div>
      </div>
    </div>
  );
}
