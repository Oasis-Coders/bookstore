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

  useEffect(() => {
    if (monthlyFinancial) {
      if (monthlyFinancial.opening_stock != null) setOpeningStock(Number(monthlyFinancial.opening_stock));
      if (monthlyFinancial.closing_stock != null) setClosingStock(Number(monthlyFinancial.closing_stock));
      else if (currentInventoryValue) setClosingStock(Number(currentInventoryValue));
    }
  }, [monthlyFinancial?.month_start, monthlyFinancial?.opening_stock, monthlyFinancial?.closing_stock]);
  const [snapshotMsg, setSnapshotMsg] = useState('');

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
  // Computed as per your sheet: Opening + Purchases = subtotal, COGS = Opening+Purchases-Closing, Gross = Sales - COGS
  const stockSubtotal = financial.opening + financial.purchases;
  const cogs = financial.cogs_direct > 0 ? financial.cogs_direct : (stockSubtotal - financial.closing);
  // If cogs_direct exists (from allocations), prefer it; else fallback to stock math
  const cogsFromStock = stockSubtotal - financial.closing;
  const finalCogs = financial.cogs_direct > 0 ? financial.cogs_direct : cogsFromStock;
  const grossProfit = financial.sales - finalCogs;

  const monthLabel = (() => {
    try {
      const [y,m] = selectedMonth.split('-');
      const d = new Date(Number(y), Number(m)-1, 1);
      const mon = d.toLocaleString(isZh ? 'zh-CN' : 'en-GB', { month: 'short' });
      return `${mon}-${String(y).slice(-2)}`;
    } catch { return selectedMonth; }
  })();

  const exportFinancialCsv = () => {
    const csv = `Month,${selectedMonth}
Sales,${financial.sales}
Opening Stock,${financial.opening}
Add Purchase,${financial.purchases}
Subtotal Opening+Purchase,${stockSubtotal}
Less Closing Stock,${financial.closing}
Cost of Sales,${finalCogs}
Gross Profit,${grossProfit}
`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `financial_${selectedMonth}.csv`; a.click(); URL.revokeObjectURL(url);
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
      if (!res.ok) throw new Error('save failed');
      setSnapshotMsg(isZh ? '已保存快照' : 'Snapshot saved');
      setTimeout(() => setSnapshotMsg(''), 3000);
    } catch {
      setSnapshotMsg(isZh ? '保存失败' : 'Save failed');
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
    const params = new URLSearchParams(searchParams.toString());
    params.set('from', fromDate);
    params.set('to', toDate);
    if (selectedMonth) params.set('month', selectedMonth);
    router.push(`/reports?${params.toString()}`);
  };

  return (
    <AppShell
      title={tt('reports.title')}
      titleZh={tt('reports.title')}
      eyebrow={tt('reports.eyebrow')}
      actions={<Button variant="ghost" onClick={() => exportCsv('valuation')}>{tt('reports.exportCsv')}</Button>}
    >
      {/* Monthly Financial Report - matches your screenshot framework */}
      <Card className="border-[#0f3d2e]/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><span className="h-1 w-5 rounded-full bg-[#0f3d2e]" />{isZh ? '每月财务报表' : 'Monthly Financial Report'}</CardTitle>
          <div className="flex items-center gap-2">
            <Input type="month" value={selectedMonth} onChange={e=>{ setSelectedMonth(e.target.value); const p=new URLSearchParams(searchParams.toString()); p.set('month', e.target.value); router.push(`/reports?${p.toString()}`); }} className="h-8 w-[140px] text-[12px]" />
            <Button size="sm" variant="ghost" onClick={exportFinancialCsv} className="h-8 rounded-[8px] text-[11px]">{isZh ? '导出' : 'Export'}</Button>
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-left">
                <th className="py-2 px-2 font-semibold bg-[#faf6ee] border border-[#0f3d2e]/10 w-[40%]">{monthLabel}</th>
                <th className="py-2 px-2 font-normal bg-[#faf6ee] border border-[#0f3d2e]/10"></th>
                <th className="py-2 px-2 font-normal bg-[#faf6ee] border border-[#0f3d2e]/10 text-right"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 font-medium">{isZh ? '销售额 Sales' : 'Sales'}</td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10"></td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 text-right font-semibold tabular-nums">{formatCurrency(financial.sales)}</td>
              </tr>
              <tr>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 font-medium bg-[#faf6ee]/50" colSpan={3}>{isZh ? '减：销售成本 Less cost of sales' : 'Less cost of sales'}</td>
              </tr>
              <tr>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 pl-6">{isZh ? '期初库存 opening stock' : 'opening stock'}</td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 text-right">
                  <Input type="number" step="0.01" value={openingStock} onChange={e=>setOpeningStock(Number(e.target.value||0))} className="h-7 w-[120px] ml-auto text-right text-[12px]" />
                </td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10"></td>
              </tr>
              <tr>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 pl-6">{isZh ? '加：本期进货 Add purchase' : 'Add purchase'}</td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 text-right tabular-nums">{formatCurrency(financial.purchases)}</td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10"></td>
              </tr>
              <tr>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 pl-6"></td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 text-right font-medium tabular-nums border-t-2 border-[#0f3d2e]/20">{formatCurrency(stockSubtotal)}</td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10"></td>
              </tr>
              <tr>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 pl-6">{isZh ? '减：期末库存 Less closing stock' : 'Less closing stock'}</td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 text-right">
                  <Input type="number" step="0.01" value={closingStock} onChange={e=>setClosingStock(Number(e.target.value||0))} className="h-7 w-[120px] ml-auto text-right text-[12px]" />
                </td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 text-right tabular-nums font-medium">{formatCurrency(finalCogs)}</td>
              </tr>
              <tr className="bg-[#e8f5e9]/50">
                <td className="py-2 px-2 border border-[#0f3d2e]/10 font-semibold">{isZh ? '毛利 Gross profit' : 'Gross profit'}</td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10"></td>
                <td className="py-2 px-2 border border-[#0f3d2e]/10 text-right font-bold tabular-nums bg-[#c8e6c9]">{formatCurrency(grossProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#4f7a5c]">
          <span>{isZh ? `当月 ${monthlyFinancial?.order_count || 0} 笔销售，COGS按批次成本精确计算。期初/期末可手动校正后保存快照` : `${monthlyFinancial?.order_count || 0} orders this month, COGS from batch costing. Edit opening/closing then save snapshot`}</span>
          <Button size="sm" variant="secondary" className="h-7 text-[11px] rounded-[8px]" onClick={saveSnapshot} disabled={savingSnapshot}>{savingSnapshot ? (isZh ? '保存中...' : 'Saving...') : (isZh ? '保存期初期末快照' : 'Save Opening/Closing Snapshot')}</Button>
          {snapshotMsg && <span className={`text-[11px] px-2 py-1 rounded-full ${snapshotMsg.includes('失败') || snapshotMsg.includes('fail') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{snapshotMsg}</span>}
        </div>
        <p className="mt-2 text-[10px] text-[#4f7a5c]">{isZh ? '公式：销售成本 = 期初 + 进货 - 期末；毛利 = 销售 - 销售成本。进货取采购单已下单金额，销售成本取批次成本更准确' : 'Formula: COGS = Opening + Purchases - Closing; Gross = Sales - COGS. Purchases from PO lines, COGS from batch allocations if available'}</p>
      </Card>

      {/* Date Range Filter - NEW */}
      <Card className="border-[#0f3d2e]/10 bg-gradient-to-br from-white to-[#faf6ee]/30">
        <CardTitle className="flex items-center gap-2"><span className="h-1 w-5 rounded-full bg-[#d26a39]" />{isZh ? '财务月报 / 销售报表 - 按时间筛选' : 'Financial Report - Date Range Filter'}</CardTitle>
        <p className="mt-1 text-[11px] text-[#4f7a5c]">{isZh ? '选择时间段查看销售列表和书目列表，用于财务对账和Shopify库存同步' : 'Select date range to view sales list and books list for accounting and Shopify stock sync'}</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] font-medium">{isZh ? '开始日期' : 'From'}</label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="mt-1 h-9" />
          </div>
          <div>
            <label className="text-[11px] font-medium">{isZh ? '结束日期' : 'To'}</label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="mt-1 h-9" />
          </div>
          <Button size="sm" onClick={handleDateFilter} className="h-9 rounded-[10px]">{isZh ? '查询' : 'Filter'}</Button>
          <span className="text-[11px] text-[#4f7a5c]">{isZh ? '附件财务月报表格参考：日期、单号、付款方式/状态、合计' : 'Ref attachment financial monthly report: Date, Sale No, Payment/Status, Total'}</span>
        </div>
      </Card>

      {/* Sales List by Date - NEW */}
      {salesList.length > 0 && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <CardTitle>{isZh ? `销售单列表 (${fromDate} 至 ${toDate})` : `Sales List (${fromDate} to ${toDate})`}</CardTitle>
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

      {/* Sales Books List for Shopify Sync - NEW */}
      {salesBooksList.length > 0 && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <CardTitle>{isZh ? `销售书目列表 (${fromDate} 至 ${toDate}) - 用于Shopify库存同步` : `Books Sold List (${fromDate} to ${toDate}) - For Shopify Sync`}</CardTitle>
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
          <CardTitle>{tt('reports.valuationTitle')}</CardTitle>
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
            <CardTitle>{tt('reports.lowStockTitle')}</CardTitle>
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
