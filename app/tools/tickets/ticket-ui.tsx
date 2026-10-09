'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { TicketStatus, TicketKind } from './actions';

export const STATUS_META: Record<TicketStatus, { zh: string; en: string; cls: string }> = {
  submitted: { zh: '待处理', en: 'Submitted', cls: 'bg-[#e8eaf6] text-[#5b5f94]' },
  in_progress: { zh: '处理中', en: 'In progress', cls: 'bg-[#fff3d6] text-[#9a6b00]' },
  review: { zh: '待确认', en: 'In review', cls: 'bg-[#d9ecff] text-[#0b5cad]' },
  blocked: { zh: '已阻塞', en: 'Blocked', cls: 'bg-[#ffd9d9] text-[#b3261e]' },
  closed: { zh: '已关闭', en: 'Closed', cls: 'bg-[#e4e4e4] text-[#6b6b6b]' },
};

export const KIND_META: Record<TicketKind, { zh: string; en: string; cls: string }> = {
  bug: { zh: '缺陷', en: 'Bug', cls: 'bg-[#ffd9d9] text-[#b3261e]' },
  feature: { zh: '需求', en: 'Feature', cls: 'bg-[#d9ecff] text-[#0b5cad]' },
  other: { zh: '其他', en: 'Other', cls: 'bg-[#e8eaf6] text-[#5b5f94]' },
};

export function StatusBadge({ status, lang }: { status: TicketStatus; lang: string }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {lang === 'zh' ? m.zh : m.en}
    </span>
  );
}

export function KindBadge({ kind, lang }: { kind: TicketKind; lang: string }) {
  const m = KIND_META[kind];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {lang === 'zh' ? m.zh : m.en}
    </span>
  );
}

/** 仅 admin / super_admin 渲染 children，否则渲染 fallback（或 null） */
export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) return;
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', uid);
        const names = ((roles || []) as any[]).map((r) => r.roles?.name).filter(Boolean);
        setRole(names.includes('super_admin') ? 'super_admin' : names.includes('admin') ? 'admin' : names[0] || 'staff');
      } finally {
        setDone(true);
      }
    };
    run();
  }, []);
  if (!done) return null;
  if (role !== 'admin' && role !== 'super_admin') return <>{fallback ?? null}</>;
  return <>{children}</>;
}
