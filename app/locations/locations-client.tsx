'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/app-shell';
import { useT } from '@/lib/i18n/use-t';

export function LocationsClient({ locations }: { locations: any[] }) {
  const { tt } = useT();
  return (
    <AppShell title={tt('locations.title')} titleZh={tt('locations.title')} eyebrow={tt('locations.eyebrow')}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {locations.map((loc: any) => (
          <Card key={loc.id}>
            <div className="flex items-center justify-between">
              <CardTitle>{loc.name}</CardTitle>
              <Badge variant={loc.location_type === 'store' ? 'active' : 'default'}>
                {loc.location_type === 'store' ? tt('locations.store') : tt('locations.warehouse')}
              </Badge>
            </div>
            <p className="mt-1 text-[12px] text-[#4f7a5c]">{loc.code} {loc.address ? `• ${loc.address}` : ''}</p>
            <div className="mt-4 rounded-[12px] bg-[#faf6ee] p-3 text-[12px]">
              <p className="text-[#4f7a5c]">{tt('locations.transferExample')}</p>
              <p className="mt-1 font-mono text-[11px]">apply_stock_transfer(book_id, STORE-MAIN, WH-01, qty)</p>
              <p className="mt-1 text-[11px] text-[#4f7a5c]">{tt('locations.transferDesc')}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle>{tt('locations.logicTitle')}</CardTitle>
        <div className="mt-3 space-y-2 text-[13px] text-[#0f3d2e]/80">
          <p>• {tt('locations.logic1')}</p>
          <p>• {tt('locations.logic2')}</p>
          <p>• {tt('locations.logic3')}</p>
          <p>• {tt('locations.logic4')}</p>
        </div>
      </Card>
    </AppShell>
  );
}
