import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function LocationsPage() {
  const supabase = await createSupabaseServerClient();
  let locations: any[] = [];
  let mode: 'demo' | 'live' = 'demo';

  if (supabase) {
    try {
      const { data } = await supabase.from('locations').select('*').eq('is_active', true).order('code');
      if (data) {
        locations = data;
        mode = 'live';
      }
    } catch {}
  }

  if (mode === 'demo' && locations.length === 0) {
    locations = [
      { id: '1', code: 'STORE-MAIN', name: '书店门店', location_type: 'store', address: '伦敦活水书室' },
      { id: '2', code: 'WH-01', name: '仓库', location_type: 'warehouse', address: '后仓' },
    ];
  }

  return (
    <AppShell title="Locations" titleZh="库位" eyebrow="门店 + 仓库">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {locations.map((loc: any) => (
          <Card key={loc.id}>
            <div className="flex items-center justify-between">
              <CardTitle>{loc.name}</CardTitle>
              <Badge variant={loc.location_type === 'store' ? 'active' : 'default'}>
                {loc.location_type === 'store' ? '门店' : '仓库'}
              </Badge>
            </div>
            <p className="mt-1 text-[12px] text-[#4f7a5c]">{loc.code} {loc.address ? `• ${loc.address}` : ''}</p>
            <div className="mt-4 rounded-[12px] bg-[#faf6ee] p-3 text-[12px]">
              <p className="text-[#4f7a5c]">调拨示例</p>
              <p className="mt-1 font-mono text-[11px]">apply_stock_transfer(book_id, STORE-MAIN, WH-01, qty)</p>
              <p className="mt-1 text-[11px] text-[#4f7a5c]">按 FIFO 保留原批次成本，自动在目标库位建子批次</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle>多地点库存逻辑</CardTitle>
        <div className="mt-3 space-y-2 text-[13px] text-[#0f3d2e]/80">
          <p>• 每个批次归属一个库位，库存价值按库位汇总</p>
          <p>• 销售必须指定门店/仓库，FIFO 扣减该库位的批次</p>
          <p>• 调拨会从来源扣减、在目标建保留成本的新批次，不丢失进货价</p>
          <p>• 会计报表可按库位过滤，看门店 vs 仓库价值分布</p>
        </div>
      </Card>
    </AppShell>
  );
}
