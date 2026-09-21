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

export function ReportsClient({ valuation, lowStock, salesList = [], salesBooksList = [], monthlyFinancial, currentInventoryValue, autoOpeningStock, autoClosingStock, initialFilters }: { valuation: any[]; lowStock: any[]; salesList?: any[]; salesBooksList?: any[]; monthlyFinancial?: any; currentInventoryValue?: number; autoOpeningStock?: number | null; autoClosingStock?: number | null; initialFilters?: any }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fromDate, setFromDate] = useState(initialFilters?.from || new Date().toISOString().slice(0, 8) + '01');
  const [toDate, setToDate] = useState(initialFilters?.to || new Date().toISOString().slice(0,10));
  const [selectedMonth, setSelectedMonth] = useState(initialFilters?.month || new Date().toISOString().slice(0,7));

  // Opening stock: system value = inventory cost right after the previous month's
  // last transaction. A saved snapshot never silently overrides it; still editable by hand.
  const sysOpening = autoOpeningStock != null
    ? Number(autoOpeningStock)
    : (monthlyFinancial?.opening_stock != null ? Number(monthlyFinancial.opening_stock) : 0);
  const [openingStock, setOpeningStock] = useState<number>(sysOpening);
  // Closing stock: system value = inventory cost at month end for past months,
  // live inventory for the current month. Still editable by hand.
  const sysClosing = autoClosingStock != null
    ? Number(autoClosingStock)
    : Number(monthlyFinancial?.closing_stock ?? currentInventoryValue ?? 0);
  const [closingStock, setClosingStock] = useState<number>(sysClosing);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotsHistory, setSnapshotsHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState('');
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    if (monthlyFinancial) {
      const sysOpen = autoOpeningStock != null ? Number(autoOpeningStock)
        : (monthlyFinancial.opening_stock != null ? Number(monthlyFinancial.opening_stock) : 0);
      setOpeningStock(sysOpen);
      const sysClose = autoClosingStock != null ? Number(autoClosingStock)
        : Number(monthlyFinancial.closing_stock ?? currentInventoryValue ?? 0);
      setClosingStock(sysClose);
    }
  }, [monthlyFinancial?.month_start, monthlyFinancial?.opening_stock, monthlyFinancial?.closing_stock, autoOpeningStock, autoClosingStock]);

  useEffect(() => {
    const sysOpen = autoOpeningStock != null ? Number(autoOpeningStock)
      : (monthlyFinancial?.opening_stock != null ? Number(monthlyFinancial.opening_stock) : 0);
    setOpeningStock(sysOpen);
    setClosingStock(autoClosingStock != null ? Number(autoClosingStock)
      : Number(monthlyFinancial?.closing_stock ?? currentInventoryValue ?? 0));
  }, [monthlyFinancial?.opening_stock, monthlyFinancial?.closing_stock, monthlyFinancial?.month_start, currentInventoryValue, autoOpeningStock, autoClosingStock]);

  const financial = {
    sales: Number(monthlyFinancial?.sales_total || 0),
    purchases: Number(monthlyFinancial?.purchases_total || 0),
    cogs_direct: Number(monthlyFinancial?.cogs_total || 0),
    opening: openingStock,
    closing: closingStock,
  };
  const stockSubtotal = financial.opening + financial.purchases;
  // COGS follows the requested formula: opening + purchases − closing.
  // Direct FIFO COGS stays visible in the footer for validation.
  const cogsFromStock = stockSubtotal - financial.closing;
  const finalCogs = cogsFromStock;
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

  // ---- CSV: BOM for Excel Chinese + escape every field (no missing rows) ----
  const csvCell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const downloadCsv = (filename: string, headers: string[], rows: any[][]) => {
    const body = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const exportFinancialCsv = () => {
    downloadCsv(`financial_${selectedMonth}.csv`,
      ['Item', 'Amount (GBP)'],
      [
        ['Month', selectedMonth],
        ['Sales', financial.sales.toFixed(2)],
        ['Opening Stock', financial.opening.toFixed(2)],
        ['Add Purchase', financial.purchases.toFixed(2)],
        ['Subtotal Opening+Purchase', stockSubtotal.toFixed(2)],
        ['Less Closing Stock', financial.closing.toFixed(2)],
        ['Cost of Sales (Opening+Purchases-Closing)', finalCogs.toFixed(2)],
        ['Direct FIFO COGS (validation)', financial.cogs_direct.toFixed(2)],
        ['Gross Profit', grossProfit.toFixed(2)],
      ]);
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
    if (type === 'valuation') {
      downloadCsv(`inventory_valuation_${new Date().toISOString().slice(0,10)}.csv`,
        ['SKU', 'Title', 'Shelf Position', 'Warehouse Location', 'Qty', 'Retail Unit Price', 'WAC', 'Cost Value', 'Retail Value'],
        valuation.map(r => [r.sku, r.title, r.shelf_position || '', r.warehouse_location || '', r.quantity_on_hand, Number(r.current_price || 0).toFixed(2), r.weighted_average_cost, r.inventory_value, r.retail_value]));
    } else if (type === 'lowstock') {
      downloadCsv(`low_stock_${new Date().toISOString().slice(0,10)}.csv`,
        ['SKU', 'Title', 'Threshold', 'On Hand', 'Shortage'],
        lowStock.map(r => [r.sku, r.title, r.low_stock_threshold, r.quantity_on_hand, r.reorder_shortage]));
    } else if (type === 'sales') {
      downloadCsv(`sales_${fromDate}_to_${toDate}.csv`,
        ['Date', 'Sale Number', 'Payment Method', 'Status', 'Subtotal', 'Discount', 'Postage', 'Net Total', 'Customer', 'Staff'],
        salesList.map(r => [r.sale_date, r.sale_number, r.payment_method, r.payment_status, r.subtotal, r.discount_amount || 0, r.shipping_cost || 0, r.net_total, r.customer_name || '', r.created_by_name || r.staff_name || '']));
    } else if (type === 'salesBooks') {
      downloadCsv(`sales_books_${fromDate}_to_${toDate}.csv`,
        ['Date', 'Sale Number', 'SKU', 'Title', 'Qty', 'Unit Price', 'Payment Method', 'Customer', 'Shelf Position', 'Warehouse Location'],
        salesBooksList.map(r => [r.sale_date, r.sale_number, r.sku, r.title, r.quantity, r.unit_price, r.payment_method, r.customer_name || '', r.shelf_position || '', r.warehouse_location || '']));
    }
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
      <div className="rounded-[20px] border border-[#e9e2d4] bg-white shadow-[0_2px_20px_rgba(45,47,146,0.04)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-[#fcfaf6] border-b border-[#efe8d9]">
          <div className="flex items-center gap-3">
            <span className="h-[6px] w-[22px] rounded-full bg-cocm-ink" />
            <h2 className="text-[15px] font-semibold tracking-tight text-cocm-ink">{isZh ? '每月财务报表' : 'Monthly Financial Report'}</h2>
            <span className="text-[11px] font-medium text-[#6d72a0] bg-white border border-[#e9e2d4] px-2.5 py-1 rounded-full">{monthLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <label htmlFor="report-month" className="sr-only">{isZh ? '选择月份' : 'Select month'}</label>
              <input id="report-month" type="month" value={selectedMonth} onChange={e=>{ setSelectedMonth(e.target.value); const p=new URLSearchParams(searchParams.toString()); p.set('month', e.target.value); router.push(`/reports?${p.toString()}`); }} className="h-[36px] w-[168px] rounded-full bg-white border border-[#e9e2d4] px-3.5 pr-9 text-[12.5px] text-cocm-ink focus:outline-none focus:ring-2 focus:ring-cocm-ink/10" />
            </div>
            <Button size="sm" variant="ghost" onClick={exportFinancialCsv} className="h-[36px] rounded-full text-[12px] px-4 border border-[#e9e2d4] bg-white hover:bg-[#fcfaf6]">{isZh ? '导出' : 'Export'}</Button>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-5">
          {/* Accounting grid */}
          <div className="rounded-[14px] border border-[#ece5d6] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_150px_145px] bg-[#fdf8f0] border-b border-[#ece5d6] px-4 py-2.5">
              <span className="text-[13px] font-semibold text-cocm-ink">{monthShort}</span>
              <span className="text-[11px] text-[#9aa0bd] text-right pr-2"></span>
              <span className="text-[11px] text-[#9aa0bd] text-right"></span>
            </div>

            {/* Sales */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-3 border-b border-[#f0ebe0] items-center hover:bg-[#fcfaf6]/50 transition">
              <span className="text-[13px] font-medium text-cocm-ink">{isZh ? '销售额' : 'Sales'} <span className="font-normal text-[#7e84ad] ml-1">Sales</span></span>
              <span className="text-right"></span>
              <span className="text-right text-[13.5px] font-semibold tabular-nums text-cocm-ink">{formatCurrency(financial.sales)}</span>
            </div>

            {/* Less cost header */}
            <div className="grid grid-cols-1 bg-[#fcfaf6] px-4 py-2 border-b border-[#f0ebe0]">
              <span className="text-[11.5px] font-medium text-[#7e84ad] tracking-wide">{isZh ? '减：销售成本' : 'Less:'} <span className="font-normal">cost of sales</span></span>
            </div>

            {/* Opening */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-2.5 border-b border-[#f6f1e8] items-center">
              <label htmlFor="opening-stock" className="text-[12.5px] text-[#3c4070] pl-4">{isZh ? '期初库存' : 'Opening'} <span className="text-[#9aa0bd]">opening stock</span>
                {autoOpeningStock != null && (
                  <button type="button" onClick={() => setOpeningStock(Number(autoOpeningStock))} className="ml-2 text-[10.5px] text-[#6d72a0] underline decoration-dotted underline-offset-2 hover:text-cocm-ink" title={isZh ? '按上月最后一天最后一笔交易后的库存成本重算' : 'Recompute from inventory cost after last transaction of previous month'}>
                    {isZh ? `系统值 £${Number(autoOpeningStock).toFixed(2)} · 点此填入` : `system £${Number(autoOpeningStock).toFixed(2)} · tap to fill`}
                  </button>
                )}
              </label>
              <div className="flex justify-end">
                <input id="opening-stock" type="number" step="0.01" value={openingStock} onChange={e=>setOpeningStock(Number(e.target.value||0))} className="h-[32px] w-[112px] rounded-full border border-[#e9e2d4] bg-white text-right text-[12.5px] px-3 tabular-nums focus:outline-none focus:border-cocm-ink/30 focus:ring-1 focus:ring-cocm-ink/10" />
              </div>
              <span className="text-right"></span>
            </div>

            {/* Add purchase */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-2.5 border-b border-[#f6f1e8] items-center">
              <span className="text-[12.5px] text-[#3c4070] pl-4">{isZh ? '加：本期进货' : 'Add:'} <span className="text-[#9aa0bd]">purchase</span></span>
              <span className="text-right text-[12.5px] tabular-nums text-[#3c4070] pr-3">{formatCurrency(financial.purchases)}</span>
              <span></span>
            </div>

            {/* Subtotal */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-2 border-b border-[#f0ebe0] items-center bg-[#fdfcfa]">
              <span></span>
              <span className="text-right text-[12.5px] font-medium tabular-nums text-cocm-ink pr-3 border-t border-cocm-ink/20 pt-1 mt-1 inline-block">{formatCurrency(stockSubtotal)}</span>
              <span></span>
            </div>

            {/* Closing */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-2.5 border-b border-[#ece5d6] items-center">
              <label htmlFor="closing-stock" className="text-[12.5px] text-[#3c4070] pl-4">{isZh ? '减：期末库存' : 'Less:'} <span className="text-[#9aa0bd]">closing stock</span>
                {autoClosingStock != null && (
                  <button type="button" onClick={() => setClosingStock(Number(autoClosingStock))} className="ml-2 text-[10.5px] text-[#6d72a0] underline decoration-dotted underline-offset-2 hover:text-cocm-ink" title={isZh ? '按所选月份最后一天的库存成本重算（当月为实时库存）' : 'Recompute from inventory cost at month end (live for current month)'}>
                    {isZh ? `系统值 £${Number(autoClosingStock).toFixed(2)} · 点此填入` : `system £${Number(autoClosingStock).toFixed(2)} · tap to fill`}
                  </button>
                )}
              </label>
              <div className="flex justify-end">
                <input id="closing-stock" type="number" step="0.01" value={closingStock} onChange={e=>setClosingStock(Number(e.target.value||0))} className="h-[32px] w-[112px] rounded-full border border-[#e9e2d4] bg-white text-right text-[12.5px] px-3 tabular-nums focus:outline-none focus:border-cocm-ink/30 focus:ring-1 focus:ring-cocm-ink/10" />
              </div>
              <span className="text-right text-[12.5px] font-medium tabular-nums text-cocm-ink">{formatCurrency(finalCogs)}</span>
            </div>

            {/* Gross profit */}
            <div className="grid grid-cols-[1fr_150px_145px] px-4 py-3 items-center bg-[#eef6ee]">
              <span className="text-[13px] font-semibold text-cocm-ink">{isZh ? '毛利' : 'Gross profit'} <span className="font-normal text-[#6d72a0] ml-1">Gross profit</span></span>
              <span></span>
              <span className="text-right"><span className="inline-block rounded-full bg-[#c8e6c9] px-3.5 py-1 text-[13px] font-bold tabular-nums text-cocm-ink">{formatCurrency(grossProfit)}</span></span>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-[#7e84ad]">{isZh ? `当月 ${monthlyFinancial?.order_count || 0} 笔销售，批次直接成本 £${financial.cogs_direct.toFixed(2)}（公式：期初 + 进货 − 期末）` : `${monthlyFinancial?.order_count || 0} orders, direct FIFO COGS £${financial.cogs_direct.toFixed(2)} (formula: opening + purchases − closing)`}</p>
            <div className="flex items-center gap-2">
              <button onClick={saveSnapshot} disabled={savingSnapshot} className="h-[30px] rounded-full bg-cocm-ink text-white text-[11.5px] px-4 font-medium hover:bg-[#23247a] disabled:opacity-60 transition">{savingSnapshot ? (isZh ? '保存中…' : 'Saving…') : (isZh ? '保存快照' : 'Save')}</button>
              <button onClick={()=>{ setShowHistory(!showHistory); if(!showHistory) loadHistory(); }} className="text-[11px] text-[#6d72a0] hover:text-cocm-ink underline decoration-dotted underline-offset-4 px-2">{showHistory ? (isZh ? '收起' : 'Hide') : (isZh ? '查看历史' : 'History')}</button>
              {snapshotMsg && <span aria-live="polite" className={`text-[11px] px-2.5 py-1 rounded-full ${snapshotMsg.includes('失败') || snapshotMsg.toLowerCase().includes('fail') ? 'bg-[#fef2f2] text-[#991b1b]' : 'bg-[#f0fdf4] text-[#166534]'}`}>{snapshotMsg}</span>}
            </div>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[#9aa0bd]">{isZh ? '公式：销售成本 = 期初 + 进货 - 期末；毛利 = 销售 - 销售成本。期初默认取上月最后一天最后一笔交易后的库存成本值；期末默认取所选月份最后一天的库存成本值（当月为实时库存）；均可手动修改；进货取采购单已下单金额。' : 'COGS = Opening + Purchases - Closing; Gross = Sales - COGS. Opening defaults to inventory cost after the last transaction of the previous month; closing defaults to inventory cost at the selected month end (live for current month); both editable; purchases from POs.'}</p>

          {showHistory && (
            <div className="mt-3 rounded-[12px] border border-[#ece5d6] bg-[#fdfcfa] p-3 max-h-[190px] overflow-auto">
              <p className="text-[11px] font-semibold text-cocm-ink mb-2">{isZh ? '历史快照' : 'Snapshot History'}</p>
              {snapshotsHistory.length===0 ? <p className="text-[11px] text-[#9aa0bd] py-3 text-center">{isZh ? '暂无快照，保存当月后会显示在这里' : 'No snapshots yet'}</p> : (
                <div className="space-y-1">
                  {snapshotsHistory.map((s:any,i:number)=><div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded-[8px] hover:bg-white"><span className="font-mono text-[#6d72a0]">{s.month_start?.slice(0,7)}</span><span className="tabular-nums">开 {Number(s.opening_stock).toFixed(2)}</span><span className="tabular-nums">末 {Number(s.closing_stock).toFixed(2)}</span><span className="text-[10px] text-[#9ab0a4]">{s.created_at?.slice(0,10)||''}</span></div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="border-cocm-ink/10 bg-gradient-to-br from-white to-cocm-paper/30">
        <CardTitle className="flex items-center gap-2 text-[14px]"><span className="h-1 w-5 rounded-full bg-cocm-red" />{isZh ? '财务月报 / 销售报表 - 按时间筛选' : 'Financial Report - Date Range Filter'}</CardTitle>
        <p className="mt-1 text-[11px] text-[#5b5f94]">{isZh ? '选择时间段查看销售列表和书目列表，用于财务对账和Shopify库存同步' : 'Select date range to view sales list and books list for accounting and Shopify stock sync'}</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="report-from" className="text-[11px] font-medium">{isZh ? '开始日期' : 'From'}</label>
            <Input id="report-from" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="mt-1 h-9 rounded-[10px]" />
          </div>
          <div>
            <label htmlFor="report-to" className="text-[11px] font-medium">{isZh ? '结束日期' : 'To'}</label>
            <Input id="report-to" type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="mt-1 h-9 rounded-[10px]" />
          </div>
          <Button size="sm" onClick={handleDateFilter} disabled={filtering} className="h-9 rounded-[10px] min-w-[64px]">{filtering ? <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin motion-reduce:animate-none inline-block" />{isZh ? '查询中' : 'Loading'}</span> : (isZh ? '查询' : 'Filter')}</Button>
          <span className="text-[11px] text-[#5b5f94]">{isZh ? '附件财务月报表格参考：日期、单号、付款方式/状态、合计' : 'Ref attachment financial monthly report: Date, Sale No, Payment/Status, Total'}</span>
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
              <thead><tr className="border-b border-cocm-ink/10 text-left text-[#5b5f94]"><th className="pb-2">{isZh ? '日期' : 'Date'}</th><th className="pb-2">{isZh ? '单号' : 'Sale No'}</th><th className="pb-2">{isZh ? '付款方式' : 'Payment'}</th><th className="pb-2">{isZh ? '状态' : 'Status'}</th><th className="pb-2 text-right">{isZh ? '合计' : 'Total'}</th><th className="pb-2">{isZh ? '购书人' : 'Customer'}</th><th className="pb-2">{isZh ? '操作员' : 'Staff'}</th></tr></thead>
              <tbody>
                {salesList.map((r, i) => (
                  <tr key={i} className="border-b border-cocm-ink/5">
                    <td className="py-2">{r.sale_date}</td>
                    <td className="py-2 font-mono font-medium">{r.sale_number}</td>
                    <td className="py-2"><Badge variant="active" className="text-[10px]">{r.payment_method}</Badge></td>
                    <td className="py-2 text-[11px]">{r.payment_status}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(Number(r.net_total || r.subtotal || 0))}</td>
                    <td className="py-2 text-[#5b5f94]">{r.customer_name || '-'}</td>
                    <td className="py-2 text-[11px]">{r.created_by_name || r.staff_name || '-'}</td>
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
          <p className="mt-1 text-[11px] text-[#5b5f94]">{isZh ? '集合统计后，手动修改网上书店相应库存。含日期、书名、代号/SKU、书架位置提示。' : 'Aggregate then manually update online store stock. Includes Date, Title, SKU, shelf hint for picking.'}</p>
          <div className="mt-3 overflow-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-cocm-ink/10 text-left text-[#5b5f94]"><th className="pb-2">{isZh ? '日期' : 'Date'}</th><th className="pb-2">{isZh ? '单号' : 'Sale No'}</th><th className="pb-2">SKU</th><th className="pb-2">{isZh ? '书名' : 'Title'}</th><th className="pb-2 text-center">{isZh ? '数量' : 'Qty'}</th><th className="pb-2">{isZh ? '书架' : 'Shelf'}</th><th className="pb-2">{isZh ? '仓库' : 'Warehouse'}</th><th className="pb-2">{isZh ? '购书人' : 'Customer'}</th><th className="pb-2">{isZh ? '操作员' : 'Staff'}</th></tr></thead>
              <tbody>
                {salesBooksList.map((r, i) => (
                  <tr key={i} className="border-b border-cocm-ink/5">
                    <td className="py-2">{r.sale_date}</td>
                    <td className="py-2 font-mono text-[10px]">{r.sale_number}</td>
                    <td className="py-2 font-mono">{r.sku}</td>
                    <td className="py-2 max-w-[200px] truncate">{r.title}</td>
                    <td className="py-2 text-center font-medium">{r.quantity}</td>
                    <td className="py-2"><span className="px-1.5 py-0.5 rounded-full bg-cocm-paper text-[10px]">{r.shelf_position || '-'}</span></td>
                    <td className="py-2"><span className="px-1.5 py-0.5 rounded-full bg-cocm-paper text-[10px]">{r.warehouse_location || '-'}</span></td>
                    <td className="py-2 text-[#5b5f94]">{r.customer_name || '-'}</td>
                    <td className="py-2 text-[11px]">{r.staff_name || r.created_by_name || '-'}</td>
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
            <span className="text-[#5b5f94]">{tt('reports.retailTotal')} {formatCurrency(totalRetail)}</span>
          </div>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-cocm-ink/10 text-left text-[#5b5f94]">
                <th className="pb-2">{tt('reports.sku')}</th>
                <th className="pb-2">{tt('reports.bookTitle')}</th>
                <th className="pb-2">{tt('reports.shelfPosition')}</th>
                <th className="pb-2">{tt('reports.warehouseLocation')}</th>
                <th className="pb-2 text-right">{tt('reports.onHand')}</th>
                <th className="pb-2 text-right">{tt('reports.retailUnitPrice')}</th>
                <th className="pb-2 text-right">{tt('reports.weightedAvg')}</th>
                <th className="pb-2 text-right">{tt('reports.costValue')}</th>
                <th className="pb-2 text-right">{tt('reports.retailValue')}</th>
              </tr>
            </thead>
            <tbody>
              {valuation.map((r, i) => (
                <tr key={i} className="border-b border-cocm-ink/5">
                  <td className="py-2 font-mono text-[11px]">{r.sku}</td>
                  <td className="py-2">{r.title}</td>
                  <td className="py-2 text-[#5b5f94]">{r.shelf_position || '-'}</td>
                  <td className="py-2 text-[#5b5f94]">{r.warehouse_location || '-'}</td>
                  <td className="py-2 text-right">{r.quantity_on_hand}</td>
                  <td className="py-2 text-right">{formatCurrency(Number(r.current_price || 0))}</td>
                  <td className="py-2 text-right">{formatCurrency(Number(r.weighted_average_cost || 0))}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(Number(r.inventory_value || 0))}</td>
                  <td className="py-2 text-right text-[#5b5f94]">{formatCurrency(Number(r.retail_value || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {valuation.length === 0 && <p className="py-6 text-center text-[12px] text-[#5b5f94]">{isZh ? '暂无数据' : 'No data'}</p>}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => exportCsv('valuation')}>{isZh ? '导出估值 CSV' : 'Export Valuation CSV'}</Button>
          <p className="text-[11px] text-[#5b5f94] py-2">{tt('reports.sqlHint')}</p>
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
              <p className="py-6 text-center text-[12px] text-[#5b5f94]">{tt('reports.noLowStock')}</p>
            ) : (
              lowStock.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-[12px] bg-[#fbe4e5]/50 px-3 py-2">
                  <div>
                    <p className="text-[12px] font-medium">{r.title}</p>
                    <p className="text-[11px] text-[#5b5f94]">{tt('reports.threshold')} {r.low_stock_threshold} • {tt('reports.current')} {r.quantity_on_hand}</p>
                  </div>
                  <Badge variant="danger">{tt('reports.shortage')} {r.reorder_shortage}</Badge>
                </div>
              ))
            )}
          </div>
          <p className="mt-2 text-[11px] text-[#5b5f94]">{tt('reports.lowStockHint')}</p>
        </Card>
      </div>
    </AppShell>
  );
}
