import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function SalesPage() {
  return (
    <AppShell title="Sales" titleZh="销售出库" eyebrow="FIFO 自动扣减">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>新建销售</CardTitle>
          <p className="mt-1 text-[12px] text-[#4f7a5c]">POS 快速出库，FIFO 自动算 COGS</p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[12px] font-medium">销售库位</label>
              <select className="mt-1 flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 text-[13px]">
                <option>书店门店 STORE-MAIN</option>
                <option>仓库 WH-01</option>
              </select>
            </div>

            <div className="rounded-[16px] border border-dashed border-[#0f3d2e]/20 p-4">
              <div className="flex gap-2">
                <Input placeholder="扫码或输入 SKU / 书名" className="flex-1" />
                <Button variant="secondary" size="sm">添加</Button>
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
                <span className="text-[13px] font-semibold">合计</span>
                <span className="font-serif text-[18px]">£34.99</span>
              </div>

              <Button className="mt-3 w-full">确认销售 (FIFO 扣减)</Button>
              <p className="mt-2 text-center text-[11px] text-[#4f7a5c]">调用 apply_sale() 原子操作，失败自动回滚</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>FIFO 如何工作</CardTitle>
            <div className="mt-3 space-y-2 text-[12px] text-[#0f3d2e]/80">
              <p>批次 A：2月进 10本 @ £5.20 剩余 3本</p>
              <p>批次 B：5月进 10本 @ £5.80 剩余 10本</p>
              <p>销售 5本 → 先扣 A 的 3本 (£15.60)，再扣 B 的 2本 (£11.60)</p>
              <p className="font-semibold">COGS = £27.20，剩余库存成本准确</p>
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
            <CardTitle>最近销售</CardTitle>
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
                    <Badge variant="active">{s.margin} 毛利</Badge>
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
