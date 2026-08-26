'use client';

import { Card, CardTitle, StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/app-shell';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';

type DailySales = {
  sale_date: string;
  total_orders: number;
  cash_total: number;
  card_total: number;
  bank_transfer_total: number;
  shopify_total: number;
  mix_total: number;
  deferral_total: number;
  grand_total: number;
} | null;

type DashboardData = {
  mode: 'demo' | 'live';
  totalValue: number;
  totalBooks: number;
  lowStockCount: number;
  recentPOs: any[];
  valuation?: any[];
  dailySales?: DailySales;
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';

  return (
    <AppShell title={tt('nav.dashboard')} titleZh={tt('nav.dashboard')} eyebrow={tt('dashboard.eyebrow')}>
      {/* Daily Sales Bar - NEW */}
      {data.dailySales && (
        <Card className="mb-4 bg-gradient-to-br from-[#0f3d2e] to-[#1a5c46] text-white border-0 shadow-[0_8px_32px_rgba(15,61,46,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[12px] bg-white/15 backdrop-blur flex items-center justify-center">
                <span className="text-[16px]">💰</span>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-white/60">
                  {isZh ? `今日销售 · ${data.dailySales.sale_date}` : `Today's Sales · ${data.dailySales.sale_date}`}
                </p>
                <p className="text-[20px] font-serif font-bold tracking-tight">
                  {data.dailySales.total_orders} {isZh ? '单' : 'orders'} · {formatCurrency(data.dailySales.grand_total)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 text-[11px]">
              <div className="rounded-[10px] bg-white/10 px-3 py-2 backdrop-blur">
                <p className="text-white/50 text-[10px] uppercase">{isZh ? '现金' : 'Cash'}</p>
                <p className="font-semibold text-white mt-0.5">{formatCurrency(data.dailySales.cash_total)}</p>
              </div>
              <div className="rounded-[10px] bg-white/10 px-3 py-2 backdrop-blur">
                <p className="text-white/50 text-[10px] uppercase">{isZh ? '刷卡' : 'Card'}</p>
                <p className="font-semibold text-white mt-0.5">{formatCurrency(data.dailySales.card_total)}</p>
              </div>
              <div className="rounded-[10px] bg-white/10 px-3 py-2 backdrop-blur">
                <p className="text-white/50 text-[10px] uppercase">{isZh ? '转账' : 'Bank'}</p>
                <p className="font-semibold text-white mt-0.5">{formatCurrency(data.dailySales.bank_transfer_total)}</p>
              </div>
              <div className="rounded-[10px] bg-white/10 px-3 py-2 backdrop-blur">
                <p className="text-white/50 text-[10px] uppercase">Shopify</p>
                <p className="font-semibold text-white mt-0.5">{formatCurrency(data.dailySales.shopify_total)}</p>
              </div>
              <div className="rounded-[10px] bg-white/10 px-3 py-2 backdrop-blur">
                <p className="text-white/50 text-[10px] uppercase">{isZh ? '混合' : 'Mix'}</p>
                <p className="font-semibold text-white mt-0.5">{formatCurrency(data.dailySales.mix_total)}</p>
              </div>
              <div className="rounded-[10px] bg-[#d26a39]/30 px-3 py-2 backdrop-blur border border-[#d26a39]/30">
                <p className="text-white/70 text-[10px] uppercase">{isZh ? '挂账' : 'Deferral'}</p>
                <p className="font-semibold text-white mt-0.5">{formatCurrency(data.dailySales.deferral_total)}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label={tt('dashboard.inventoryValue')}
          value={formatCurrency(data.totalValue)}
          hint={tt('dashboard.inventoryValueHint')}
          accent="default"
        />
        <StatCard
          label={tt('dashboard.booksInStock')}
          value={<>{data.totalBooks} <span className="text-[18px] font-sans font-medium text-[#4f7a5c]">{tt('dashboard.species')}</span></>}
          hint={tt('dashboard.booksInStockHint')}
          accent="success"
        />
        <StatCard
          label={tt('dashboard.lowStockAlert')}
          value={<>{data.lowStockCount} <span className="text-[18px] font-sans font-medium text-[#4f7a5c]">{tt('dashboard.species')}</span></>}
          accent={data.lowStockCount > 0 ? 'amber' : 'default'}
        >
          <div className="mt-3">
            {data.lowStockCount > 0 ? (
              <Badge variant="active" className="shadow-sm">
                {data.lowStockCount} {tt('dashboard.needRestock')}
              </Badge>
            ) : (
              <Badge className="bg-[#1a5c46]/10 text-[#1a5c46] border-[#1a5c46]/20">{tt('dashboard.sufficient')}</Badge>
            )}
          </div>
        </StatCard>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-[#d26a39]" />
              {tt('dashboard.recentPOs')}
            </CardTitle>
            <Link href="/purchase-orders"><Button variant="ghost" size="sm" className="rounded-[10px]">{tt('common.viewAll')}</Button></Link>
          </div>
          <div className="mt-5">
            {data.mode === 'demo' ? (
              <div className="rounded-[16px] bg-gradient-to-br from-[#faf6ee] to-[#f4efe4] p-8 text-center border border-[#0f3d2e]/5">
                <div className="w-12 h-12 mx-auto rounded-[12px] bg-white shadow-sm flex items-center justify-center mb-3">
                  <span className="text-[20px]">📦</span>
                </div>
                <p className="text-[14px] font-medium text-[#0f3d2e]">{tt('dashboard.demoMode')}</p>
                <p className="mt-1.5 text-[12px] text-[#4f7a5c]">{tt('dashboard.demoHint')}</p>
              </div>
            ) : data.recentPOs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-[#0f3d2e]/5 flex items-center justify-center mb-3">
                  <span className="text-[16px] opacity-50">📋</span>
                </div>
                <p className="text-[13px] text-[#4f7a5c]">{tt('dashboard.noPOs')}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.recentPOs.map((po: any) => (
                  <Link key={po.id} href={`/purchase-orders/${po.id}`} className="flex items-center justify-between rounded-[14px] border border-[#0f3d2e]/[0.06] bg-[#faf6ee]/60 px-4 py-3.5 hover:bg-white hover:border-[#0f3d2e]/10 hover:shadow-[0_2px_12px_rgba(15,61,46,0.06)] transition-all group">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#0f3d2e] group-hover:text-[#0f3d2e]">{po.po_number}</p>
                      <p className="text-[11px] text-[#4f7a5c] mt-0.5 truncate">{po.suppliers?.name_zh} • {po.status}</p>
                    </div>
                    <Badge className="ml-3 shrink-0">{po.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-white to-[#faf6ee]/50">
          <CardTitle className="flex items-center gap-2">
            <span className="h-1 w-6 rounded-full bg-[#1a5c46]" />
            {tt('dashboard.guide')}
          </CardTitle>
          <div className="mt-5 space-y-3.5 text-[13px] leading-relaxed">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex gap-3 group">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-[#0f3d2e]/5 text-[11px] font-bold text-[#0f3d2e] group-hover:bg-[#0f3d2e] group-hover:text-white transition-colors">{i}</span>
                <p className="flex-1 text-[#0f3d2e]/80 leading-[1.5]"><strong className="text-[#0f3d2e] font-semibold">{(tt as any)(`dashboard.guide${i}`)}</strong> {(tt as any)(`dashboard.guide${i}Desc`)}</p>
              </div>
            ))}
            <p className="pt-2 text-[11px] text-[#4f7a5c] leading-relaxed bg-[#faf6ee]/80 rounded-[10px] px-3 py-2 border border-[#0f3d2e]/5">{tt('dashboard.guideHint')}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/books" className="inline-flex h-9 items-center rounded-[12px] bg-[#0f3d2e] px-4 text-[13px] font-semibold text-white hover:bg-[#1a5c46] transition-colors shadow-[0_2px_8px_rgba(15,61,46,0.2)] hover:shadow-[0_4px_12px_rgba(15,61,46,0.3)]">{tt('dashboard.goBooks')}</Link>
            <Link href="/purchase-orders/new" className="inline-flex h-9 items-center rounded-[12px] border border-[#0f3d2e]/15 bg-white px-4 text-[13px] font-semibold text-[#0f3d2e] hover:bg-[#faf6ee] transition-colors">{tt('dashboard.createPO')}</Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
