'use client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/app-shell';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';

export function LocationsClient({ locations }: { locations: any[] }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  return (
    <AppShell title={tt('locations.title')} titleZh={tt('locations.title')} eyebrow={tt('locations.count', { n: locations.length })} actions={
      <Link href="/locations/new"><Button>{tt('locations.add') || (isZh ? '+ 新增库位' : '+ New Location')}</Button></Link>
    }>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((l: any) => (
          <Card key={l.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[14px]">{l.name}</p>
              <p className="text-[11px] text-[#4f7a5c]">{l.code} · {l.location_type === 'warehouse' ? (isZh ? '仓库' : 'Warehouse') : (isZh ? '门店' : 'Store')} {l.address ? `· ${l.address}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={l.location_type === 'warehouse' ? 'default' : 'active'}>{l.location_type === 'warehouse' ? (isZh ? '仓库' : 'WH') : (isZh ? '门店' : 'Store')}</Badge>
              <Link href={`/locations/${l.id}/edit`}><Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">{isZh ? '编辑' : 'Edit'}</Button></Link>
            </div>
          </Card>
        ))}
      </div>
      {locations.length === 0 && <Card className="py-10 text-center text-[12px] text-[#4f7a5c]">{isZh ? '暂无库位' : 'No locations'}</Card>}
    </AppShell>
  );
}
