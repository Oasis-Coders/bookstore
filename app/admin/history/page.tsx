'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/lib/i18n/use-t';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Tx = any;
type Sale = any;
type PO = any;

export default function AuditHistoryPage() {
  const { isZh } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('type') || 'all';

  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [adjustments, setAdjustments] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      // check admin
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        router.push('/auth?redirectTo=/admin/history');
        return;
      }
      const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', uid);
      const roleNames = (roles || []).map((r: any) => r.roles?.name);
      const adminOk = roleNames.includes('admin') || roleNames.includes('super_admin');
      setIsAdmin(adminOk);
      if (!adminOk) {
        router.push('/');
        return;
      }

      let txs: Tx[] = [];
      let sls: Sale[] = [];
      let pos: PO[] = [];

      try {
        if (filter === 'all' || filter === 'inventory') {
          const { data } = await supabase
            .from('inventory_transactions')
            .select('*, books(title, sku), profiles:actor_profile_id(display_name, email)')
            .order('occurred_at', { ascending: false })
            .limit(50);
          txs = (data as any) || [];
        }
        if (filter === 'all' || filter === 'sales') {
          const { data } = await supabase
            .from('sales_transactions')
            .select('*, profiles:created_by(display_name, email)')
            .order('sold_at', { ascending: false })
            .limit(30);
          sls = (data as any) || [];
        }
        if (filter === 'all' || filter === 'po') {
          const { data } = await supabase
            .from('purchase_orders')
            .select('po_number, status, created_at, created_by, suppliers(name_zh), profiles:created_by(display_name, email)')
            .order('created_at', { ascending: false })
            .limit(20);
          pos = (data as any) || [];
        }
      } catch {}


      setTransactions(txs);
      setSales(sls);
      setAdjustments(pos);
      setLoading(false);
    };
    run();
  }, [filter, router, isZh]);

  const setFilter = (f: string) => {
    router.push(`/admin/history?type=${f}`);
  };

  const eyebrow = isZh ? '不可篡改流水' : 'Immutable Audit Log';

  if (loading) {
    return (
      <AppShell title="Audit Log" titleZh="操作记录" eyebrow={eyebrow}>
        <div className="mx-auto max-w-[840px]">
          <Card>
            <p className="text-[12px] text-[#4f7a5c]">{isZh ? '加载中…' : 'Loading…'}</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Audit Log" titleZh="操作记录" eyebrow={eyebrow}>
      <div className="mx-auto max-w-[840px] space-y-4">
        <Card>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-[10px] px-3 py-1.5 text-[12px] ${
                filter === 'all' ? 'bg-[#0f3d2e] text-white' : 'bg-[#faf6ee] text-[#4f7a5c]'
              }`}
            >
              {isZh ? '全部' : 'All'}
            </button>
            <button
              onClick={() => setFilter('inventory')}
              className={`rounded-[10px] px-3 py-1.5 text-[12px] ${
                filter === 'inventory' ? 'bg-[#0f3d2e] text-white' : 'bg-[#faf6ee]'
              }`}
            >
              {isZh ? '库存流水' : 'Inventory'}
            </button>
            <button
              onClick={() => setFilter('sales')}
              className={`rounded-[10px] px-3 py-1.5 text-[12px] ${
                filter === 'sales' ? 'bg-[#0f3d2e] text-white' : 'bg-[#faf6ee]'
              }`}
            >
              {isZh ? '销售' : 'Sales'}
            </button>
            <button
              onClick={() => setFilter('po')}
              className={`rounded-[10px] px-3 py-1.5 text-[12px] ${
                filter === 'po' ? 'bg-[#0f3d2e] text-white' : 'bg-[#faf6ee]'
              }`}
            >
              {isZh ? '采购单' : 'POs'}
            </button>
          </div>
        </Card>

        {(filter === 'all' || filter === 'inventory') && (
          <Card>
            <CardTitle>{isZh ? '库存流水（不可篡改）' : 'Inventory Log (Immutable)'}</CardTitle>
            <div className="mt-3 space-y-2">
              {transactions.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-[12px] bg-[#faf6ee]/60 px-3 py-2 text-[12px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {t.books?.title || t.book_id?.slice(0, 8)}{' '}
                      <span className="text-[#4f7a5c]">{t.books?.sku}</span>
                    </p>
                    <p className="text-[11px] text-[#4f7a5c] truncate">
                      {new Date(t.occurred_at).toLocaleString(isZh ? 'zh-CN' : 'en-GB')} •{' '}
                      <span className="font-medium text-[#0f3d2e]">{t.profiles?.display_name || t.actor_profile_id?.slice(0, 6)}</span>
                      {t.profiles?.email ? <span className="text-[#4f7a5c]/70"> ({t.profiles.email})</span> : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={t.transaction_type === 'sale' ? 'danger' : 'active'}>{t.transaction_type}</Badge>
                    <p className="mt-1">
                      {t.quantity > 0 ? `+${t.quantity}` : t.quantity} {t.unit_cost ? `@ £${t.unit_cost}` : ''}
                    </p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="py-6 text-center text-[12px] text-[#4f7a5c]">{isZh ? '暂无流水' : 'No transactions'}</p>
              )}
            </div>
          </Card>
        )}

        {(filter === 'all' || filter === 'sales') && (
          <Card>
            <CardTitle>{isZh ? '销售记录' : 'Sales Records'}</CardTitle>
            <div className="mt-3 space-y-2">
              {sales.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-[12px] border border-[#0f3d2e]/5 px-3 py-2 text-[12px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono">{s.external_reference || s.id.slice(0, 8)}</p>
                    <p className="text-[11px] text-[#4f7a5c] truncate">
                      {new Date(s.sold_at).toLocaleString(isZh ? 'zh-CN' : 'en-GB')} •{' '}
                      <span className="font-medium text-[#0f3d2e]">{s.profiles?.display_name || ''}</span>
                      {s.profiles?.email ? <span className="text-[#4f7a5c]/70"> ({s.profiles.email})</span> : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>£{s.total_amount || s.total}</p>
                    <Badge variant="active">{isZh ? '已结算' : 'Settled'}</Badge>
                  </div>
                </div>
              ))}
              {sales.length === 0 && (
                <p className="py-6 text-center text-[12px] text-[#4f7a5c]">{isZh ? '暂无销售' : 'No sales'}</p>
              )}
            </div>
          </Card>
        )}

        {(filter === 'all' || filter === 'po') && (
          <Card>
            <CardTitle>{isZh ? '采购单变动' : 'PO Changes'}</CardTitle>
            <div className="mt-3 space-y-2">
              {adjustments.map((po: any) => (
                <div
                  key={po.po_number}
                  className="flex items-center justify-between rounded-[12px] bg-[#faf6ee]/50 px-3 py-2 text-[12px]"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-medium">{po.po_number}</span>
                    <span className="ml-2 text-[11px] text-[#4f7a5c]">{(po as any).profiles?.display_name || ''}{(po as any).profiles?.email ? ` (${(po as any).profiles.email})` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge>{po.status}</Badge>
                    <span className="text-[#4f7a5c]">{po.suppliers?.name_zh}</span>
                  </div>
                </div>
              ))}
              {adjustments.length === 0 && (
                <p className="py-6 text-center text-[12px] text-[#4f7a5c]">{isZh ? '暂无采购单' : 'No POs'}</p>
              )}
            </div>
          </Card>
        )}

        <div className="rounded-[12px] bg-[#0f3d2e]/5 p-3 text-[11px] text-[#4f7a5c]">
          <p>
            {isZh
              ? '所有流水表都有触发器禁止 UPDATE/DELETE，保证审计可信。'
              : 'All log tables have triggers blocking UPDATE/DELETE to ensure audit integrity.'}
          </p>
          
        </div>
      </div>
    </AppShell>
  );
}
