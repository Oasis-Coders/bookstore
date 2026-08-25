'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/app-shell';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';

type DashboardData = {
  mode: 'demo' | 'live';
  totalValue: number;
  totalBooks: number;
  lowStockCount: number;
  recentPOs: any[];
  valuation?: any[];
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const { tt } = useT();

  return (
    <AppShell title={tt('nav.dashboard')} titleZh={tt('nav.dashboard')} eyebrow={tt('dashboard.eyebrow')}>
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f7a5c]">{tt('dashboard.inventoryValue')}</p>
          <p className="mt-2 font-serif text-[32px] tracking-tight">{formatCurrency(data.totalValue)}</p>
          <p className="mt-1 text-[12px] text-[#4f7a5c]">{tt('dashboard.inventoryValueHint')}</p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f7a5c]">{tt('dashboard.booksInStock')}</p>
          <p className="mt-2 font-serif text-[32px] tracking-tight">
            {data.totalBooks} {tt('dashboard.species')}
          </p>
          <p className="mt-1 text-[12px] text-[#4f7a5c]">{tt('dashboard.booksInStockHint')}</p>
        </Card>
        <Card className={data.lowStockCount > 0 ? 'border-[#d26a39]/30' : ''}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f7a5c]">{tt('dashboard.lowStockAlert')}</p>
          <p className="mt-2 font-serif text-[32px] tracking-tight">
            {data.lowStockCount} <span className="text-[16px]">{tt('dashboard.species')}</span>
          </p>
          <div className="mt-2">
            {data.lowStockCount > 0 ? (
              <Badge variant="active">
                {data.lowStockCount} {tt('dashboard.needRestock')}
              </Badge>
            ) : (
              <Badge>{tt('dashboard.sufficient')}</Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <CardTitle>{tt('dashboard.recentPOs')}</CardTitle>
            <Button variant="ghost" size="sm">
              <a href="/purchase-orders">{tt('common.viewAll')}</a>
            </Button>
          </div>
          <div className="mt-4">
            {data.mode === 'demo' ? (
              <div className="rounded-[16px] bg-[#faf6ee] p-8 text-center">
                <p className="text-[14px] text-[#4f7a5c]">{tt('dashboard.demoMode')}</p>
                <p className="mt-2 text-[12px] text-[#4f7a5c]/70">{tt('dashboard.demoHint')}</p>
              </div>
            ) : data.recentPOs.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-[#4f7a5c]">{tt('dashboard.noPOs')}</p>
            ) : (
              <div className="space-y-2">
                {data.recentPOs.map((po: any) => (
                  <div key={po.id} className="flex items-center justify-between rounded-[12px] border border-[#0f3d2e]/5 bg-[#faf6ee]/50 px-4 py-3">
                    <div>
                      <p className="text-[13px] font-medium">{po.po_number}</p>
                      <p className="text-[11px] text-[#4f7a5c]">{po.suppliers?.name_zh} • {po.status}</p>
                    </div>
                    <Badge>{po.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>{tt('dashboard.guide')}</CardTitle>
          <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-[#0f3d2e]/80">
            <p>
              <strong className="text-[#0f3d2e]">1. {tt('dashboard.guide1')}</strong> {tt('dashboard.guide1Desc')}
            </p>
            <p>
              <strong className="text-[#0f3d2e]">2. {tt('dashboard.guide2')}</strong> {tt('dashboard.guide2Desc')}
            </p>
            <p>
              <strong className="text-[#0f3d2e]">3. {tt('dashboard.guide3')}</strong> {tt('dashboard.guide3Desc')}
            </p>
            <p>
              <strong className="text-[#0f3d2e]">4. {tt('dashboard.guide4')}</strong> {tt('dashboard.guide4Desc')}
            </p>
            <p>
              <strong className="text-[#0f3d2e]">5. {tt('dashboard.guide5')}</strong> {tt('dashboard.guide5Desc')}
            </p>
            <p className="pt-2 text-[11px] text-[#4f7a5c]">{tt('dashboard.guideHint')}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/books" className="inline-flex h-9 items-center rounded-[12px] bg-[#0f3d2e] px-4 text-[13px] font-semibold text-white">
              {tt('dashboard.goBooks')}
            </a>
            <a href="/purchase-orders" className="inline-flex h-9 items-center rounded-[12px] border border-[#0f3d2e]/20 px-4 text-[13px] font-semibold">
              {tt('dashboard.createPO')}
            </a>
          </div>
        </Card>
      </div>

      {/* Design credit */}
      <div className="mt-6 rounded-[20px] bg-[#0f3d2e] p-5 text-white">
        <p className="mt-1 font-serif text-[16px]">{tt('dashboard.designTokens')}</p>
      </div>
    </AppShell>
  );
}
