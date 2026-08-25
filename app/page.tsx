import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

async function getDashboardData() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    // Demo mode - no Supabase env
    return {
      mode: 'demo' as const,
      totalValue: 0,
      totalBooks: 0,
      lowStockCount: 0,
      recentPOs: [],
    };
  }

  try {
    const [valuationRes, lowStockRes, booksRes, poRes] = await Promise.all([
      supabase.from('inventory_valuation_view').select('*'),
      supabase.from('low_stock_view').select('*'),
      supabase.from('books').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('purchase_orders').select('*, suppliers(name_zh)').order('created_at', { ascending: false }).limit(5),
    ]);

    const totalValue = valuationRes.data?.reduce((sum: number, r: any) => sum + Number(r.inventory_value || 0), 0) || 0;
    const totalBooks = booksRes.count || 0;
    const lowStockCount = lowStockRes.data?.length || 0;

    return {
      mode: 'live' as const,
      totalValue,
      totalBooks,
      lowStockCount,
      recentPOs: poRes.data || [],
      valuation: valuationRes.data?.slice(0, 5) || [],
    };
  } catch {
    return {
      mode: 'demo' as const,
      totalValue: 12458.5,
      totalBooks: 156,
      lowStockCount: 8,
      recentPOs: [],
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <AppShell title="Dashboard" titleZh="总览" eyebrow="活水书室 Huo Shui Bookstore">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f7a5c]">库存总值</p>
          <p className="mt-2 font-serif text-[32px] tracking-tight">{formatCurrency(data.totalValue)}</p>
          <p className="mt-1 text-[12px] text-[#4f7a5c]">按 FIFO 批次成本计算</p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f7a5c]">在库图书</p>
          <p className="mt-2 font-serif text-[32px] tracking-tight">{data.totalBooks} 种</p>
          <p className="mt-1 text-[12px] text-[#4f7a5c]">有效 SKU 数量</p>
        </Card>
        <Card className={data.lowStockCount > 0 ? 'border-[#d26a39]/30' : ''}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f7a5c]">低库存预警</p>
          <p className="mt-2 font-serif text-[32px] tracking-tight">
            {data.lowStockCount} <span className="text-[16px]">种</span>
          </p>
          <div className="mt-2">
            {data.lowStockCount > 0 ? (
              <Badge variant="active">{data.lowStockCount} 需补货</Badge>
            ) : (
              <Badge>库存充足</Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <CardTitle>最近采购单</CardTitle>
            <Button variant="ghost" size="sm">
              <a href="/purchase-orders">查看全部</a>
            </Button>
          </div>
          <div className="mt-4">
            {data.mode === 'demo' ? (
              <div className="rounded-[16px] bg-[#faf6ee] p-8 text-center">
                <p className="text-[14px] text-[#4f7a5c]">演示模式 — 连接 Supabase 后显示真实数据</p>
                <p className="mt-2 text-[12px] text-[#4f7a5c]/70">
                  在 .env.local 配置 NEXT_PUBLIC_SUPABASE_URL 后刷新
                </p>
              </div>
            ) : data.recentPOs.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-[#4f7a5c]">暂无采购单</p>
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
          <CardTitle>操作指引</CardTitle>
          <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-[#0f3d2e]/80">
            <p>
              <strong className="text-[#0f3d2e]">1. 建供应商</strong> → 供应商页添加
            </p>
            <p>
              <strong className="text-[#0f3d2e]">2. 录图书</strong> → 书库添加中文书名、SKU、出版社
            </p>
            <p>
              <strong className="text-[#0f3d2e]">3. 下采购单</strong> → 选供应商、填数量和进货价（同书不同批次可不同价）
            </p>
            <p>
              <strong className="text-[#0f3d2e]">4. 收货入库</strong> → PO 详情一键收货，自动建批次
            </p>
            <p>
              <strong className="text-[#0f3d2e]">5. 销售出库</strong> → 销售页 FIFO 自动扣减，算毛利
            </p>
            <p className="pt-2 text-[11px] text-[#4f7a5c]">库存价值按批次成本自动汇总，无需手工算</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/books" className="inline-flex h-9 items-center rounded-[12px] bg-[#0f3d2e] px-4 text-[13px] font-semibold text-white">
              去书库
            </a>
            <a href="/purchase-orders" className="inline-flex h-9 items-center rounded-[12px] border border-[#0f3d2e]/20 px-4 text-[13px] font-semibold">
              建采购单
            </a>
          </div>
        </Card>
      </div>

      {/* Design credit */}
      <div className="mt-6 rounded-[20px] bg-[#0f3d2e] p-5 text-white">
        <p className="text-[12px] opacity-70">设计系统复用 COCM Camp App</p>
        <p className="mt-1 font-serif text-[16px]">cream #faf6ee • forest #0f3d2e • ember #d26a39 • DM Serif + Inter + Noto Sans SC</p>
      </div>
    </AppShell>
  );
}
