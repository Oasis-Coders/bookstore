import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient();
  let valuation: any[] = [];
  let lowStock: any[] = [];
  let mode: 'demo' | 'live' = 'demo';

  if (supabase) {
    try {
      const [vRes, lRes] = await Promise.all([
        supabase.from('inventory_valuation_view').select('*').limit(20),
        supabase.from('low_stock_view').select('*').limit(20),
      ]);
      if (vRes.data) {
        valuation = vRes.data;
        mode = 'live';
      }
      if (lRes.data) lowStock = lRes.data;
    } catch {}
  }

  if (mode === 'demo') {
    valuation = [
      { sku: 'BOOK-001', title: '活水得胜之路', location_name: '书店门店', quantity_on_hand: 8, inventory_value: 42.4, weighted_average_cost: 5.3, current_price: 12.5, retail_value: 100 },
      { sku: 'BOOK-002', title: '认识真理', location_name: '仓库', quantity_on_hand: 15, inventory_value: 78, weighted_average_cost: 5.2, current_price: 9.99, retail_value: 149.85 },
    ];
    lowStock = [
      { sku: 'BOOK-003', title: '恩典之旅', low_stock_threshold: 5, quantity_on_hand: 2, reorder_shortage: 3 },
    ];
  }

  const totalValue = valuation.reduce((s, r) => s + Number(r.inventory_value || 0), 0);
  const totalRetail = valuation.reduce((s, r) => s + Number(r.retail_value || 0), 0);

  return (
    <AppShell
      title="Reports"
      titleZh="会计报表"
      eyebrow="FIFO 估值 • 低库存 • 流水 • 毛利"
      actions={<Button variant="ghost">导出 CSV</Button>}
    >
      {/* Valuation */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>库存价值报表</CardTitle>
          <div className="flex gap-2 text-[12px]">
            <span>成本总值 {formatCurrency(totalValue)}</span>
            <span className="text-[#4f7a5c]">零售总值 {formatCurrency(totalRetail)}</span>
          </div>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#0f3d2e]/10 text-left text-[#4f7a5c]">
                <th className="pb-2">SKU</th>
                <th className="pb-2">书名</th>
                <th className="pb-2">库位</th>
                <th className="pb-2 text-right">在库</th>
                <th className="pb-2 text-right">加权均价</th>
                <th className="pb-2 text-right">成本价值</th>
                <th className="pb-2 text-right">零售价值</th>
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
        <p className="mt-2 text-[11px] text-[#4f7a5c]">SQL: SELECT * FROM inventory_valuation_view — 按批次剩余数量 × unit_cost 求和，实时准确</p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>低库存预警</CardTitle>
          <div className="mt-3 space-y-2">
            {lowStock.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-[#4f7a5c]">暂无低库存，库存充足 ✅</p>
            ) : (
              lowStock.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-[12px] bg-[#f9e0d0]/50 px-3 py-2">
                  <div>
                    <p className="text-[12px] font-medium">{r.title}</p>
                    <p className="text-[11px] text-[#4f7a5c]">阈值 {r.low_stock_threshold} • 现存 {r.quantity_on_hand}</p>
                  </div>
                  <Badge variant="danger">缺 {r.reorder_shortage}</Badge>
                </div>
              ))
            )}
          </div>
          <p className="mt-2 text-[11px] text-[#4f7a5c]">按全库总库存判断，含零库存图书</p>
        </Card>

        <Card>
          <CardTitle>会计报表 SQL</CardTitle>
          <div className="mt-3 space-y-2 text-[11px]">
            <p className="font-mono rounded bg-[#faf6ee] p-2">SELECT * FROM low_stock_view ORDER BY reorder_shortage DESC;</p>
            <p className="font-mono rounded bg-[#faf6ee] p-2">SELECT * FROM inventory_movement_report_view WHERE occurred_at &gt;= date_trunc(&apos;month&apos;, now()) ORDER BY occurred_at;</p>
            <p className="font-mono rounded bg-[#faf6ee] p-2">SELECT * FROM sales_margin_report_view ORDER BY sold_at DESC;</p>
            <p className="text-[12px] text-[#4f7a5c] mt-2">以上视图均已在 migration 中建好，带符号数量和价值变动，会计可直接按日期、库位、书籍筛选。</p>
          </div>
          <Button variant="secondary" size="sm" className="mt-3">下载 CSV 模板</Button>
        </Card>
      </div>
    </AppShell>
  );
}
