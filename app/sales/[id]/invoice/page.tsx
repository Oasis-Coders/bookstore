import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Supabase not configured</div>;

  const { data: sale, error } = await supabase.from('sales_transactions').select('*').eq('id', id).single();
  if (error || !sale) return notFound();

  const { data: lines } = await supabase.from('sales_transaction_lines').select('*, books(id, title, sku, category)').eq('sale_id', id);

  const invoiceNo = sale.sale_number?.replace(/^C/, '') || sale.id.slice(0,6);
  const purchaseDate = sale.sale_date ? new Date(sale.sale_date).toLocaleDateString('en-GB') : new Date(sale.sold_at).toLocaleDateString('en-GB');
  const customerName = sale.customer_name || '';
  const paymentMethod = sale.payment_method || 'cash';

  // Real-time calculation from DB
  let bookSubtotal = 0;
  let grossTotal = 0;
  const enriched = (lines || []).map((l: any, idx: number) => {
    const qty = Number(l.quantity);
    const unit = Number(l.unit_price);
    const discPct = Number(l.discount_percent || 0);
    const discAmt = Number(l.discount_amount || 0);
    const gross = qty * unit;
    grossTotal += gross;
    let discount = discAmt;
    if (discPct > 0 && discAmt === 0) discount = gross * discPct / 100;
    const net = gross - discount;
    bookSubtotal += net;
    return {
      idx: idx+1,
      cat: l.books?.category?.slice(0,8) || l.books?.sku?.slice(0,6) || '-',
      title: l.books?.title || 'Unknown Book',
      qty,
      unit,
      discPct,
      discAmt: discount,
      net,
    };
  });

  // If transaction-level discount exists and lines have no discount, apply globally
  const globalDisc = Number(sale.discount_amount || 0);
  if (globalDisc > 0 && enriched.length > 0 && enriched.every((e:any)=>e.discAmt===0)) {
    // Distribute proportionally, for simplicity show as adjustment on subtotal
    const totalGross = enriched.reduce((s:number, e:any)=>s+e.qty*e.unit, 0);
    if (totalGross > 0) {
      // Recalc bookSubtotal as gross - global discount
      bookSubtotal = Math.max(0, totalGross - globalDisc);
      // Mark first line to show discount for transparency
      enriched[0].discAmt = globalDisc;
      if (totalGross > 0) enriched[0].discPct = Math.round((globalDisc/totalGross)*100);
      enriched[0].net = enriched[0].qty * enriched[0].unit - globalDisc;
      // Other lines net unchanged, but bookSubtotal already correct
      // Recompute accurately: keep other lines, first line net = its gross - global
      // To keep sum consistent, adjust
    }
  }

  const shipping = Number((sale as any).shipping_cost || 0);
  const total = bookSubtotal + shipping;

  return (
    <div className="min-h-screen bg-white text-[#0f1f17] print:bg-white">
      <style>{`@media print { .no-print { display:none } body { -webkit-print-color-adjust: exact } }`}</style>
      <div className="mx-auto max-w-[820px] p-6 sm:p-10 font-serif">
        <div className="flex justify-between items-start border-b-2 border-[#0f3d2e] pb-5">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">COCM Bookshop</h1>
            <p className="text-[11px] text-[#5a7a6a] mt-1">活水书房 • Chinese Christian Bookshop</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#6b8a7a] uppercase tracking-widest">Invoice No</p>
            <p className="text-[20px] font-bold">{invoiceNo}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 text-[12.5px]">
          <div>
            <p className="text-[10.5px] text-[#6b8a7a] uppercase">Purchase Date</p>
            <p className="mt-1 font-medium">{purchaseDate}</p>
          </div>
          <div>
            <p className="text-[10.5px] text-[#6b8a7a] uppercase">Name</p>
            <p className="mt-1 font-medium">{customerName || '-'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10.5px] text-[#6b8a7a] uppercase">Payment</p>
            <p className="mt-1 capitalize">{paymentMethod.replace('_',' ')}</p>
          </div>
        </div>

        <div className="mt-8 border border-[#0f3d2e]/20 rounded-[8px] overflow-hidden">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-[#f6f3ee] text-left text-[11px] text-[#5a7a6a]">
                <th className="py-2.5 px-3 font-semibold w-[32px]">#</th>
                <th className="py-2.5 px-2 font-semibold w-[70px]">CAT</th>
                <th className="py-2.5 px-3 font-semibold">Book Name</th>
                <th className="py-2.5 px-2 font-semibold text-right w-[52px]">Qty</th>
                <th className="py-2.5 px-2 font-semibold text-right w-[72px]">Price £</th>
                <th className="py-2.5 px-2 font-semibold text-right w-[64px]">Disc.</th>
                <th className="py-2.5 px-3 font-semibold text-right w-[88px]">Subtotal £</th>
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-[#8a9a8e]">No items in this sale</td></tr>}
              {enriched.map((e:any)=>(
                <tr key={e.idx} className="border-t border-[#ece8e0]">
                  <td className="py-2.5 px-3">{e.idx}</td>
                  <td className="py-2.5 px-2 font-mono text-[11px]">{e.cat}</td>
                  <td className="py-2.5 px-3">{e.title}</td>
                  <td className="py-2.5 px-2 text-right">{e.qty}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{e.unit.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{e.discPct>0 ? `${e.discPct}%` : (e.discAmt>0 ? `£${e.discAmt.toFixed(2)}` : '-')}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-medium">£{e.net.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-[280px] text-[12.5px] space-y-2">
            <div className="flex justify-between py-1"><span className="text-[#5a7a6a]">Book Subtotal</span><span className="font-medium tabular-nums">£{bookSubtotal.toFixed(2)}</span></div>
            <div className="flex justify-between py-1"><span className="text-[#5a7a6a]">P & P Cost</span><span className="tabular-nums">£{shipping.toFixed(2)}</span></div>
            <div className="flex justify-between py-2 border-t-2 border-[#0f3d2e] font-bold text-[14px] mt-2 pt-2"><span>Total:</span><span className="tabular-nums">£{total.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="mt-10 rounded-[10px] bg-[#faf6ee] border border-[#ece5d6] p-4 text-[11.5px] leading-relaxed text-[#3d5a4e]">
          <p className="font-semibold text-[#0f3d2e] mb-1">Payment Method</p>
          <p>By cheque: Please make cheque payable to COCM</p>
          <p>Please quote Invoice No. on the back of the cheque</p>
          <p className="mt-2">By bank transfer:</p>
          <p>Account name: COCM</p>
          <p>Account no: 00025186 ; Sort code: 40-52-40</p>
          <p>Please quote your invoice number as reference when transferring payment.</p>
        </div>

        <div className="no-print mt-8 flex gap-2">
          <button onClick={()=>window.print()} className="rounded-full bg-[#0f3d2e] text-white px-5 h-9 text-[13px]">Print</button>
          <a href="/sales" className="rounded-full border border-[#0f3d2e]/20 px-5 h-9 inline-flex items-center text-[13px]">Back to Sales</a>
        </div>
      </div>
    </div>
  );
}
