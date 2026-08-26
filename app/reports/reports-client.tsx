'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';
import { useRouter, useSearchParams } from 'next/navigation';

export function ReportsClient({ valuation, lowStock, salesList = [], salesBooksList = [], monthlyFinancial, currentInventoryValue, initialFilters }: { valuation: any[]; lowStock: any[]; salesList?: any[]; salesBooksList?: any[]; monthlyFinancial?: any; currentInventoryValue?: number; initialFilters?: any }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fromDate, setFromDate] = useState(initialFilters?.from || new Date().toISOString().slice(0, 8) + '01');
  const [toDate, setToDate] = useState(initialFilters?.to || new Date().toISOString().slice(0,10));
  const [selectedMonth, setSelectedMonth] = useState(initialFilters?.month || new Date().toISOString().slice(0,7));
  const [openingStock, setOpeningStock] = useState<number>(Number(monthlyFinancial?.opening_stock || 0));
  const [closingStock, setClosingStock] = useState<number>(Number(monthlyFinancial?.closing_stock || currentInventoryValue || 0));
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotsHistory, setSnapshotsHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState('');
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    if (monthlyFinancial) {
      if (monthlyFinancial.opening_stock != null) setOpeningStock(Number(monthlyFinancial.opening_stock));
      if (monthlyFinancial.closing_stock != null) setClosingStock(Number(monthlyFinancial.closing_stock));
      else if (currentInventoryValue) setClosingStock(Number(currentInventoryValue));
    }
  }, [monthlyFinancial?.month_start, monthlyFinancial?.opening_stock, monthlyFinancial?.closing_stock]);

  useEffect(() => {
    setOpeningStock(Number(monthlyFinancial?.opening_stock || 0));
    setClosingStock(Number(monthlyFinancial?.closing_stock || currentInventoryValue || 0));
  }, [monthlyFinancial?.opening_stock, monthlyFinancial?.closing_stock, monthlyFinancial?.month_start, currentInventoryValue]);

  const financial = {
    sales: Number(monthlyFinancial?.sales_total || 0),
    purchases: Number(monthlyFinancial?.purchases_total || 0),
    cogs_direct: Number(monthlyFinancial?.cogs_total || 0),
    opening: openingStock,
    closing: closingStock,
  };
  const stockSubtotal = financial.opening + financial.purchases;
  const cogsFromStock = stockSubtotal - financial.closing;
  const finalCogs = financial.cogs_direct > 0 ? financial.cogs_direct : cogsFromStock;
  const grossProfit = financial.sales - finalCogs;

  const monthLabel = (() => {
    try {
      const [y,m] = selectedMonth.split('-');
      const d = new Date(Number(y), Number(m)-1, 1);
      return d.toLocaleString(isZh ? 'zh-CN' : 'en-GB', { month: 'long', year: 'numeric' });
    } catch { return selectedMonth; }
  })();

  const monthShort = (() => {
    try {
      const [y,m] = selectedMonth.split('-');
      const d = new Date(Number(y), Number(m)-1, 1);
      const mon = d.toLocaleString(isZh ? 'zh-CN' : 'en-GB', { month: 'short' });
      return `${mon}-${String(y).slice(-2)}`;
    } catch { return selectedMonth; }
  })();

  const exportFinancialCsv = () => {
    const csv = `Month,${selectedMonth}\nSales,${financial.sales}\nOpening Stock,${financial.opening}\nAdd Purchase,${financial.purchases}\nSubtotal Opening+Purchase,${stockSubtotal}\nLess Closing Stock,${financial.closing}\nCost of Sales,${finalCogs}\nGross Profit,${grossProfit}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `financial_${selectedMonth}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/reports/snapshots');
      const j = await res.json();
      if (j.data) setSnapshotsHistory(j.data);
    } catch {}
  };

  const saveSnapshot = async () => {
    setSavingSnapshot(true);
    setSnapshotMsg('');
    try {
      const res = await fetch('/api/reports/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month_start: `${selectedMonth}-01`, opening_stock: financial.opening, closing_stock: financial.closing }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'save failed');
      setSnapshotMsg(isZh ? '已保存' : 'Saved');
      setTimeout(() => setSnapshotMsg(''), 2500);
      loadHistory();
    } catch (e:any) {
      setSnapshotMsg((isZh ? '保存失败: ' : 'Save failed: ') + (e?.message||''));
    }
    setSavingSnapshot(false);
  };

  const totalValue = valuation.reduce((s, r) => s + Number(r.inventory_value || 0), 0);
  const totalRetail = valuation.reduce((s, r) => s + Number(r.retail_value || 0), 0);

  const exportCsv = (type: 'valuation' | 'lowstock' | 'sales' | 'salesBooks') => {
    let csv = '';
    let filename = '';
    if (type === 'valuation') {
      filename = `inventory_valuation_${new Date().toISOString().slice(0,10)}.csv`;
      csv = 'SKU,Title,Location,Qty,WAC,Cost Value,Retail Value\n' + valuation.map(r => 
        `${r.sku},"${r.title}",${r.location_name},${r.quantity_on_hand},${r.weighted_average_cost},${r.inventory_value},${r.retail_value}`
      ).join('\n');
    } else if (type === 'lowstock') {
      filename = `low_stock_${new Date().toISOString().slice(0,10)}.csv`;
      csv = 'SKU,Title,Threshold,On Hand,Shortage\n' + lowStock.map(r =>
        `${r.sku},"${r.title}",${r.low_stock_threshold},${r.quantity_on_hand},${r.reorder_shortage}`
      ).join('\n');
    } else if (type === 'sales') {
      filename = `sales_${fromDate}_to_${toDate}.csv`;
      csv = 'Date,Sale Number,Payment Method,Status,Subtotal,Discount,Net Total,Customer\n' + salesList.map(r =>
        `${r.sale_date},${r.sale_number},${r.payment_method},${r.payment_status},${r.subtotal},${r.discount_amount || 0},${r.net_total},${r.customer_name || ''}`
      ).join('\n');
    } else if (type === 'salesBooks') {
      filename = `sales_books_${fromDate}_to_${toDate}.csv`;
      csv = 'Date,Sale Number,SKU,Title,Qty,Unit Price,Payment Method,Customer,Shelf\n' + salesBooksList.map(r =>
        `${r.sale_date},${r.sale_number},${r.sku},"${r.title}",${r.quantity},${r.unit_price},${r.payment_method},${r.customer_name || ''},${r.shelf_position || ''}`
      ).join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDateFilter = () => {
    setFiltering(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('from', fromDate);
    params.set('to', toDate);
    if (selectedMonth) params.set('month', selectedMonth);
    router.push(`/reports?${params.toString()}`);
    setTimeout(()=>setFiltering(false), 800);
  };

  return (
    <AppShell
      title={tt('reports.title')}
      titleZh={tt('reports.title')}
      eyebrow={tt('reports.eyebrow')}
      actions={<Button variant="ghost" onClick={() => exportCsv('valuation')} className="rounded-[10px]">{tt('reports.exportCsv')}</Button>}
    >
      {/* Monthly Financial - Redesigned to match accounting sheet */}
      <div className="rounded-[20px] border border-[#e9e2d4] bg-white shadow-[0_2px_20px_rgba(15,61,46,0.04)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-[#fcfaf6] border-b border-[#efe8d9]">
          <div className="flex items-center gap-3">
            <span className="h-[6px] w-[22px] rounded-full bg-[#0f3d2e]" />
            <h2 className="text-[15px] font-semibold tracking-tight text-[#0f3d2e]">{isZh ? '每月财务报表' : 'Monthly Financial Report'}</h2>
            <span className="text-[11px] font-medium text-[#5a7a6a] bg-white border border-[#e9e2d4] px-2.5 py-1 rounded-full">{monthLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input type="month" value={selectedMonth} onChange={e=>{ setSelectedMonth(e.target.value); const p=new URLSearchParams(searchParams.toString()); p.set('month', e.target.value); router.push(`/reports?${p.toString()}`); }} className="h-[36px] w-[168px] rounded-full bg-white border border-[#e9e2d4] px-3.5 pr-9 text-[12.5px] text-[#0f3d2e] focus:outline-none focus:ring-2 focus:ring-[#0f3d2e]/10" />
            </div>
            <Button size="sm" variant="ghost" onClick={exportFinancialCsv} className="h-[36px] rounded-full text-[12px] px-4 border border-[#e9e2d4] bg-white hover:bg-[#fcfaf6]">{isZh ? '导出' : 'Export'}</Button>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-5">
          {/* Accounting grid */}
          <div className="rounded-[14px] border border-[#ece5d6] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_150px_145px] bg-[#fdf8f0] border-b border-[#ece5d6] px-4 py-2.5">
              <span className="text-[13px] font-semibold text-[#0f3d2e]">{monthShort}</span>
              <span className="text-[11px] text-[#8a9a8e] text-right pr-2"></span>
              <span className="text-[11px] text-[#8a9a8e] text-right"></span>
            </div>

            {/* Sales */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-3 border-b border-[#f0ebe0] items-center hover:bg-[#fcfaf6]/50 transition">
              <span className="text-[13px] font-medium text-[#0f3d2e]">{isZh ? '销售额' : 'Sales'} <span className="font-normal text-[#6b8a7a] ml-1">Sales</span></span>
              <span className="text-right"></span>
              <span className="text-right text-[13.5px] font-semibold tabular-nums text-[#0f3d2e]">{formatCurrency(financial.sales)}</span>
            </div>

            {/* Less cost header */}
            <div className="grid grid-cols-1 bg-[#fcfaf6] px-4 py-2 border-b border-[#f0ebe0]">
              <span className="text-[11.5px] font-medium text-[#6b8a7a] tracking-wide">{isZh ? '减：销售成本' : 'Less:'} <span className="font-normal">cost of sales</span></span>
            </div>

            {/* Opening */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-2.5 border-b border-[#f6f1e8] items-center">
              <span className="text-[12.5px] text-[#3d5a4e] pl-4">{isZh ? '期初库存' : 'Opening'} <span className="text-[#8a9a8e]">opening stock</span></span>
              <div className="flex justify-end">
                <input type="number" step="0.01" value={openingStock} onChange={e=>setOpeningStock(Number(e.target.value||0))} className="h-[32px] w-[112px] rounded-full border border-[#e9e2d4] bg-white text-right text-[12.5px] px-3 tabular-nums focus:outline-none focus:border-[#0f3d2e]/30 focus:ring-1 focus:ring-[#0f3d2e]/10" />
              </div>
              <span className="text-right"></span>
            </div>

            {/* Add purchase */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-2.5 border-b border-[#f6f1e8] items-center">
              <span className="text-[12.5px] text-[#3d5a4e] pl-4">{isZh ? '加：本期进货' : 'Add:'} <span className="text-[#8a9a8e]">purchase</span></span>
              <span className="text-right text-[12.5px] tabular-nums text-[#3d5a4e] pr-3">{formatCurrency(financial.purchases)}</span>
              <span></span>
            </div>

            {/* Subtotal */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-2 border-b border-[#f0ebe0] items-center bg-[#fdfcfa]">
              <span></span>
              <span className="text-right text-[12.5px] font-medium tabular-nums text-[#0f3d2e] pr-3 border-t border-[#0f3d2e]/20 pt-1 mt-1 inline-block">{formatCurrency(stockSubtotal)}</span>
              <span></span>
            </div>

            {/* Closing */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-2.5 border-b border-[#ece5d6] items-center">
              <span className="text-[12.5px] text-[#3d5a4e] pl-4">{isZh ? '减：期末库存' : 'Less:'} <span className="text-[#8a9a8e]">closing stock</span></span>
              <div className="flex justify-end">
                <input type="number" step="0.01" value={closingStock} onChange={e=>setClosingStock(Number(e.target.value||0))} className="h-[32px] w-[112px] rounded-full border border-[#e9e2d4] bg-white text-right text-[12.5px] px-3 tabular-nums focus:outline-none focus:border-[#0f3d2e]/30 focus:ring-1 focus:ring-[#0f3d2e]/10" />
              </div>
              <span className="text-right text-[12.5px] font-medium tabular-nums text-[#0f3d2e]">{formatCurrency(finalCogs)}</span>
            </div>

            {/* Gross profit */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-3 items-center bg-[#eef6ee]">
              <span className="text-[13px] font-semibold text-[#0f3d2e]">{isZh ? '毛利' : 'Gross profit'} <span className="font-normal text-[#5a7a6a] ml-1">Gross profit</span></span>
              <span></span>
              <span className="text-right"><span className="inline-block rounded-full bg-[#c8e6c9] px-3.5 py-1 text-[13px] font-bold tabular-nums text-[#0f3d2e]">{formatCurrency(grossProfit)}</span></span>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-[#6b8a7a]">{isZh ? `当月 ${monthlyFinancial?.order_count || 0} 笔销售，COGS 按批次成本` : `${monthlyFinancial?.order_count || 0} orders, COGS from batches`}</p>
            <div className="flex items-center gap-2">
              <button onClick={saveSnapshot} disabled={savingSnapshot} className="h-[30px] rounded-full bg-[#0f3d2e] text-white text-[11.5px] px-4 font-medium hover:bg-[#163a2d] disabled:opacity-60 transition">{savingSnapshot ? (isZh ? '保存中…' : 'Saving…') : (isZh ? '保存快照' : 'Save')}</button>
              <button onClick={()=>{ setShowHistory(!showHistory); if(!showHistory) loadHistory(); }} className="text-[11px] text-[#5a7a6a] hover:text-[#0f3d2e] underline decoration-dotted underline-offset-4 px-2">{showHistory ? (isZh ? '收起' : 'Hide') : (isZh ? '查看历史' : 'History')}</button>
              {snapshotMsg && <span className={`text-[11px] px-2.5 py-1 rounded-full ${snapshotMsg.includes('失败') || snapshotMsg.toLowerCase().includes('fail') ? 'bg-[#fef2f2] text-[#991b1b]' : 'bg-[#f0fdf4] text-[#166534]'}`}>{snapshotMsg}</span>}
            </div>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[#8a9a8e]">{isZh ? '公式：销售成本 = 期初 + 进货 - 期末；毛利 = 销售 - 销售成本。进货取采购单已下单金额，销售成本按批次更精确' : 'COGS = Opening + Purchases - Closing; Gross = Sales - COGS. Purchases from PO, COGS from batch allocations'}</p>

          {showHistory && (
            <div className="mt-3 rounded-[12px] border border-[#ece5d6] bg-[#fdfcfa] p-3 max-h-[190px] overflow-auto">
              <p className="text-[11px] font-semibold text-[#0f3d2e] mb-2">{isZh ? '历史快照' : 'Snapshot History'}</p>
              {snapshotsHistory.length===0 ? <p className="text-[11px] text-[#8a9a8e] py-3 text-center">{isZh ? '暂无快照，保存当月后会显示在这里' : 'No snapshots yet'}</p> : (
                <div className="space-y-1">
                  {snapshotsHistory.map((s:any,i:number)=><div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded-[8px] hover:bg-white"><span className="font-mono text-[#5a7a6a]">{s.month_start?.slice(0,7)}</span><span className="tabular-nums">开 {Number(s.opening_stock).toFixed(2)}</span><span className="tabular-nums">末 {Number(s.closing_stock).toFixed(2)}</span><span className="text-[10px] text-[#9ab0a4]">{s.created_at?.slice(0,10)||''}</span></div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="border-[#0f3d2e]/10 bg-gradient-to-br from-white to-[#faf6ee]/30">
        <CardTitle className="flex items-center gap-2 text-[14px]"><span className="h-1 w-5 rounded-full bg-[#d26a39]" />{isZh ? '财务月报 / 销售报表 - 按时间筛选' : 'Financial Report - Date Range Filter'}</CardTitle>
        <p className="mt-1 text-[11px] text-[#4f7a5c]">{isZh ? '选择时间段查看销售列表和书目列表，用于财务对账和Shopify库存同步' : 'Select date range to view sales list and books list for accounting and Shopify stock sync'}</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] font-medium">{isZh ? '开始日期' : 'From'}</label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="mt-1 h-9 rounded-[10px]" />
          </div>
          <div>
            <label className="text-[11px] font-medium">{isZh ? '结束日期' : 'To'}</label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="mt-1 h-9 rounded-[10px]" />
          </div>
          <Button size="sm" onClick={handleDateFilter} disabled={filtering} className="h-9 rounded-[10px] min-w-[64px]">{filtering ? <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block" />{isZh ? '查询中' : 'Loading'}</span> : (isZh ? '查询' : 'Filter')}</Button>
          <span className="text-[11px] text-[#4f7a5c]">{isZh ? '附件财务月报表格参考：日期、单号、付款方式/状态、合计' : 'Ref attachment financial monthly report: Date, Sale No, Payment/Status, Total'}</span>
        </div>
      </Card>

      {/* Sales List by Date */}
      {salesList.length > 0 && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[14px]">{isZh ? `销售单列表 (${fromDate} 至 ${toDate})` : `Sales List (${fromDate} to ${toDate})`}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => exportCsv('sales')} className="rounded-[10px]">{isZh ? '导出CSV' : 'Export CSV'}</Button>
          </div>
          <div className="mt-3 overflow-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#0f3d2e]/10 text-left text-[#4f7a5c]"><th className="pb-2">{isZh ? '日期' : 'Date'}</th><th className="pb-2">{isZh ? '单号' : 'Sale No'}</th><th className="pb-2">{isZh ? '付款方式' : 'Payment'}</th><th className="pb-2">{isZh ? '状态' : 'Status'}</th><th className="pb-2 text-right">{isZh ? '合计' : 'Total'}</th><th className="pb-2">{isZh ? '购书人' : 'Customer'}</th></tr></thead>
              <tbody>
                {salesList.map((r, i) => (
                  <tr key={i} className="border-b border-[#0f3d2e]/5">
                    <td className="py-2">{r.sale_date}</td>
                    <td className="py-2 font-mono font-medium">{r.sale_number}</td>
                    <td className="py-2"><Badge variant="active" className="text-[10px]">{r.payment_method}</Badge></td>
                    <td className="py-2 text-[11px]">{r.payment_status}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(Number(r.net_total || r.subtotal || 0))}</td>
                    <td className="py-2 text-[#4f7a5c]">{r.customer_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Sales Books List for Shopify Sync */}
      {salesBooksList.length > 0 && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[14px]">{isZh ? `销售书目列表 (${fromDate} 至 ${toDate}) - 用于Shopify库存同步` : `Books Sold List (${fromDate} to ${toDate}) - For Shopify Sync`}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => exportCsv('salesBooks')} className="rounded-[10px]">{isZh ? '导出CSV 手动改Shopify库存' : 'Export CSV for Shopify'}</Button>
          </div>
          <p className="mt-1 text-[11px] text-[#4f7a5c]">{isZh ? '集合统计后，手动修改网上书店相应库存。含日期、书名、代号/SKU、书架位置提示。' : 'Aggregate then manually update online store stock. Includes Date, Title, SKU, shelf hint for picking.'}</p>
          <div className="mt-3 overflow-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-[#0f3d2e]/10 text-left text-[#4f7a5c]"><th className="pb-2">{isZh ? '日期' : 'Date'}</th><th className="pb-2">{isZh ? '单号' : 'Sale No'}</th><th className="pb-2">SKU</th><th className="pb-2">{isZh ? '书名' : 'Title'}</th><th className="pb-2 text-center">{isZh ? '数量' : 'Qty'}</th><th className="pb-2">{isZh ? '书架' : 'Shelf'}</th><th className="pb-2">{isZh ? '购书人' : 'Customer'}</th></tr></thead>
              <tbody>
                {salesBooksList.map((r, i) => (
                  <tr key={i} className="border-b border-[#0f3d2e]/5">
                    <td className="py-2">{r.sale_date}</td>
                    <td className="py-2 font-mono text-[10px]">{r.sale_number}</td>
                    <td className="py-2 font-mono">{r.sku}</td>
                    <td className="py-2 max-w-[200px] truncate">{r.title}</td>
                    <td className="py-2 text-center font-medium">{r.quantity}</td>
                    <td className="py-2"><span className="px-1.5 py-0.5 rounded-full bg-[#faf6ee] text-[10px]">{r.shelf_position || '-'}</span></td>
                    <td className="py-2 text-[#4f7a5c]">{r.customer_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Valuation */}
      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-[14px]">{tt('reports.valuationTitle')}</CardTitle>
          <div className="flex gap-2 text-[12px]">
            <span>{tt('reports.costTotal')} {formatCurrency(totalValue)}</span>
            <span className="text-[#4f7a5c]">{tt('reports.retailTotal')} {formatCurrency(totalRetail)}</span>
          </div>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#0f3d2e]/10 text-left text-[#4f7a5c]">
                <th className="pb-2">{tt('reports.sku')}</th>
                <th className="pb-2">{tt('reports.bookTitle')}</th>
                <th className="pb-2">{tt('reports.location')}</th>
                <th className="pb-2 text-right">{tt('reports.onHand')}</th>
                <th className="pb-2 text-right">{tt('reports.weightedAvg')}</th>
                <th className="pb-2 text-right">{tt('reports.costValue')}</th>
                <th className="pb-2 text-right">{tt('reports.retailValue')}</th>
              </tr>
            </thead>
            <tbody>
              {valuation.map((r, i) => (
                <tr key={i} className="border-b border-[#0f3d2e]/5">
                  <td className="py-2 font-mono text-[11px]">{r.sku}</td>
                  <td className="py-2">{r.title}</td>
                  <td className="py-2 text-[#4f7a5c]">{r.location_name}</td>
                  <td className="py-2 text-right">{r.quantity_on_hand}</td>
                  <td className="py-2 text-right">{formatCurrency(Number(r.weighted_average_cost || 0))}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(Number(r.inventory_value || 0))}</td>
                  <td className="py-2 text-right text-[#4f7a5c]">{formatCurrency(Number(r.retail_value || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {valuation.length === 0 && <p className="py-6 text-center text-[12px] text-[#4f7a5c]">{isZh ? '暂无数据' : 'No data'}</p>}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => exportCsv('valuation')}>{isZh ? '导出估值 CSV' : 'Export Valuation CSV'}</Button>
          <p className="text-[11px] text-[#4f7a5c] py-2">{tt('reports.sqlHint')}</p>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[14px]">{tt('reports.lowStockTitle')}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => exportCsv('lowstock')}>{isZh ? '导出' : 'Export'}</Button>
          </div>
          <div className="mt-3 space-y-2">
            {lowStock.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-[#4f7a5c]">{tt('reports.noLowStock')}</p>
            ) : (
              lowStock.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-[12px] bg-[#f9e0d0]/50 px-3 py-2">
                  <div>
                    <p className="text-[12px] font-medium">{r.title}</p>
                    <p className="text-[11px] text-[#4f7a5c]">{tt('reports.threshold')} {r.low_stock_threshold} • {tt('reports.current')} {r.quantity_on_hand}</p>
                  </div>
                  <Badge variant="danger">{tt('reports.shortage')} {r.reorder_shortage}</Badge>
                </div>
              ))
            )}
          </div>
          <p className="mt-2 text-[11px] text-[#4f7a5c]">{tt('reports.lowStockHint')}</p>
        </Card>
      </div>
    </AppShell>
  );
}
