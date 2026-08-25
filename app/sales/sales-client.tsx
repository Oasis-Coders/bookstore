'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/app-shell';
import { useT } from '@/lib/i18n/use-t';

export function SalesClient() {
  const { tt } = useT();
  return (
    <AppShell title={tt('sales.title')} titleZh={tt('sales.title')} eyebrow={tt('sales.eyebrow')}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>{tt('sales.newSale')}</CardTitle>
          <p className="mt-1 text-[12px] text-[#4f7a5c]">{tt('sales.newSaleHint')}</p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[12px] font-medium">{tt('sales.location')}</label>
              <select className="mt-1 flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 text-[13px]">
                <option>{tt('sales.storeMain')}</option>
                <option>{tt('sales.warehouse')}</option>
              </select>
            </div>

            <div className="rounded-[16px] border border-dashed border-[#0f3d2e]/20 p-4">
              <div className="flex gap-2">
                <Input placeholder={tt('sales.scanPlaceholder')} className="flex-1" />
                <Button variant="secondary" size="sm">{tt('sales.add')}</Button>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2 text-[12px]">
                  <span>活水得胜之路 ×2</span>
                  <span>£25.00</span>
                </div>
                <div className="flex items-center justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2 text-[12px]">
                  <span>认识真理 ×1</span>
                  <span>£9.99</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#0f3d2e]/10 pt-3">
                <span className="text-[13px] font-semibold">{tt('sales.total')}</span>
                <span className="font-serif text-[18px]">£34.99</span>
              </div>

              <Button className="mt-3 w-full">{tt('sales.confirmSale')}</Button>
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
              {`select apply_sale(
  '<STORE_UUID>',
  '[{"book_id":"<id>","quantity":5}]',
  'POS-20250825-001'
);`}
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
