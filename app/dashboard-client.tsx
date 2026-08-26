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

  const salesItems = data.dailySales ? [
    { key: 'cash', label: isZh ? '现金' : 'Cash', labelEn: 'Cash', value: data.dailySales.cash_total, dot: 'bg-emerald-500' },
    { key: 'card', label: isZh ? '刷卡' : 'Card', labelEn: 'Card', value: data.dailySales.card_total, dot: 'bg-blue-500' },
    { key: 'bank', label: isZh ? '转账' : 'Bank Transfer', labelEn: 'Bank', value: data.dailySales.bank_transfer_total, dot: 'bg-amber-500' },
    { key: 'shopify', label: 'Shopify', labelEn: 'Shopify', value: data.dailySales.shopify_total, dot: 'bg-[#96bf48]' },
  ] : [];

  return (
    <AppShell title={tt('nav.dashboard')} titleZh={tt('nav.dashboard')} eyebrow={tt('dashboard.eyebrow')}>
      {/* Daily Sales - redesigned for 4 items */}
      {data.dailySales && (
        <Card className="mb-5 border-0 bg-white shadow-[0_4px_24px_rgba(15,61,46,0.08)] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[10px] bg-[#0f3d2e] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white"><path d="M8 1.5c-1.5 0-2.5 1-2.5 2.5S6.5 6.5 8 6.5s2.5-1 2.5-2.5S9.5 1.5 8 1.5Zm0 8c-2.2 0-4.5 1.1-4.5 2.5v1h9v-1c0-1.4-2.3-2.5-4.5-2.5Z" fill="currentColor" opacity="0.9"/></svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4f7a5c]">{isZh ? `今日销售 · ${data.dailySales.sale_date}` : `Today · ${data.dailySales.sale_date}`}</p>
                <p className="text-[13px] font-medium text-[#0f3d2e]">{data.dailySales.total_orders} {isZh ? '笔订单' : 'orders'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[11px] text-[#4f7a5c]">{isZh ? '今日合计' : 'Grand Total'}</p>
                <p className="text-[20px] font-serif font-bold text-[#0f3d2e] tracking-tight">{formatCurrency(data.dailySales.grand_total)}</p>
              </div>
              <Link href="/sales"><Button size="sm" variant="ghost" className="h-8 rounded-[10px] text-[11px]">{isZh ? '查看' : 'View'}</Button></Link>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {salesItems.map(item => (
              <div key={item.key} className="rounded-[14px] bg-[#faf6ee]/80 border border-[#0f3d2e]/[0.06] px-3.5 py-3 hover:bg-white hover:border-[#0f3d2e]/10 hover:shadow-sm transition-all">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
                  <p className="text-[11px] font-semibold text-[#4f7a5c] uppercase tracking-wide">{item.label}</p>
                </div>
                <p className="text-[14px] font-semibold text-[#0f3d2e] tabular-nums">{formatCurrency(item.value)}</p>
                <div className="mt-1.5 h-1 w-full rounded-full bg-[#0f3d2e]/5 overflow-hidden">
                  <div className={`h-full rounded-full ${item.dot} transition-all`} style={{ width: `${Math.min(100, (item.value / Math.max(1, data.dailySales!.grand_total)) * 100)}%` }} />
                </div>
              </div>
            ))}
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
                  <span className="h-3 w-3 rounded-full bg-[#0f3d2e]/20" />
                </div>
                <p className="text-[14px] font-medium text-[#0f3d2e]">{tt('dashboard.demoMode')}</p>
                <p className="mt-1.5 text-[12px] text-[#4f7a5c]">{tt('dashboard.demoHint')}</p>
              </div>
            ) : data.recentPOs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-[#0f3d2e]/5 flex items-center justify-center mb-3">
                  <span className="h-2 w-2 rounded-full bg-[#0f3d2e]/30" />
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
