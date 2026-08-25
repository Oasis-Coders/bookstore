'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/app-shell';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';

export function ReportsClient({ valuation, lowStock }: { valuation: any[]; lowStock: any[] }) {
  const { tt } = useT();
  const totalValue = valuation.reduce((s, r) => s + Number(r.inventory_value || 0), 0);
  const totalRetail = valuation.reduce((s, r) => s + Number(r.retail_value || 0), 0);

  return (
    <AppShell
      title={tt('reports.title')}
      titleZh={tt('reports.title')}
      eyebrow={tt('reports.eyebrow')}
      actions={<Button variant="ghost">{tt('reports.exportCsv')}</Button>}
    >
      {/* Valuation */}
      <Card>
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
        </div>
        <p className="mt-2 text-[11px] text-[#4f7a5c]">{tt('reports.sqlHint')}</p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{tt('reports.lowStockTitle')}</CardTitle>
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

        <Card>
          <CardTitle>{tt('reports.sqlTitle')}</CardTitle>
          <div className="mt-3 space-y-2 text-[11px]">
            <p className="font-mono rounded bg-[#faf6ee] p-2">SELECT * FROM low_stock_view ORDER BY reorder_shortage DESC;</p>
            <p className="font-mono rounded bg-[#faf6ee] p-2">SELECT * FROM inventory_movement_report_view WHERE occurred_at &gt;= date_trunc(&apos;month&apos;, now()) ORDER BY occurred_at;</p>
            <p className="font-mono rounded bg-[#faf6ee] p-2">SELECT * FROM sales_margin_report_view ORDER BY sold_at DESC;</p>
            <p className="text-[12px] text-[#4f7a5c] mt-2">{tt('reports.sqlDesc')}</p>
          </div>
          <Button variant="secondary" size="sm" className="mt-3">{tt('reports.downloadTemplate')}</Button>
        </Card>
      </div>
    </AppShell>
  );
}
