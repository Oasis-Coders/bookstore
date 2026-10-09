'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { listTickets, type TicketRow, type TicketStatus } from './actions';
import { StatusBadge, KindBadge, AdminOnly, STATUS_META } from './ticket-ui';

const FILTERS: Array<'all' | TicketStatus> = ['all', 'submitted', 'in_progress', 'review', 'blocked', 'closed'];

// 创建时间格式化：10-09 16:55（浏览器本地时区）
function formatCreated(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeAgo(iso: string, isZh: boolean) {
  const d = new Date(iso).getTime();
  const mins = Math.max(0, Math.floor((Date.now() - d) / 60000));
  if (mins < 1) return isZh ? '刚刚' : 'just now';
  if (mins < 60) return isZh ? `${mins} 分钟前` : `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return isZh ? `${h} 小时前` : `${h}h ago`;
  const days = Math.floor(h / 24);
  return isZh ? `${days} 天前` : `${days}d ago`;
}

export function TicketsClient() {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listTickets(filter)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <AdminOnly
      fallback={
        <Card className="p-8 text-center text-[13px] text-[#5b5f94]">
          {isZh ? '问题申报仅对管理员开放' : 'Tickets are visible to admins only'}
        </Card>
      }
    >
      <div className="mx-auto max-w-[900px] space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={isZh ? '状态筛选' : 'Status filter'}>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  filter === f
                    ? 'bg-cocm-ink text-white'
                    : 'border border-cocm-ink/10 bg-white text-[#5b5f94] hover:border-cocm-ink/25'
                }`}
              >
                {f === 'all' ? (isZh ? '全部' : 'All') : isZh ? STATUS_META[f].zh : STATUS_META[f].en}
              </button>
            ))}
          </div>
          <Link
            href="/tools/tickets/new"
            className="ml-auto inline-flex h-9 items-center rounded-[10px] bg-cocm-ink px-4 text-[13px] font-medium text-white hover:opacity-90"
          >
            {isZh ? '＋ 新建工单' : '+ New ticket'}
          </Link>
        </div>

        {loading ? (
          <Card className="p-8 text-center text-[13px] text-[#5b5f94]">{isZh ? '加载中…' : 'Loading…'}</Card>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-[13px] text-[#5b5f94]">
            {isZh ? '暂无工单' : 'No tickets yet'}
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const parts = [
                r.creator_name || '',
                `${isZh ? '创建于' : 'Created'} ${formatCreated(r.created_at)}`,
                `${isZh ? '更新' : 'Updated'} ${timeAgo(r.updated_at, isZh)}`,
                `${r.message_count} ${isZh ? '条消息' : 'messages'}`,
              ].filter(Boolean);
              return (
                <Link key={r.id} href={`/tools/tickets/${r.id}`}>
                  <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-[0_4px_16px_rgba(45,47,146,0.15)]">
                    <span className="shrink-0 font-mono text-[13px] font-bold text-cocm-red">#{r.number}</span>
                    <KindBadge kind={r.kind} lang={lang} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-cocm-ink">{r.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#5b5f94]">{parts.join(' · ')}</p>
                    </div>
                    <StatusBadge status={r.status} lang={lang} />
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AdminOnly>
  );
}
