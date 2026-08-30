
'use client';

import { useState, useMemo } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';

export function SuppliersClient({ suppliers }: { suppliers: any[] }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((s:any) => {
      const hay = [s.name_zh, s.name_en, s.code, s.contact_person, s.email, s.phone].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(query);
    });
  }, [suppliers, q]);

  return (
    <AppShell title={tt('suppliers.title')} titleZh={tt('suppliers.title')} eyebrow={tt('suppliers.count', { n: filtered.length })} actions={
      <Link href="/suppliers/new"><Button>{tt('suppliers.add')}</Button></Link>
    }>
      <div className="mb-4 flex gap-2">
        <Input value={q} onChange={e=>setQ(e.target.value)} placeholder={isZh ? '搜索供应商（中英/代号）...' : 'Search supplier (name/code)...'} className="flex-1" />
        {q && <Button variant="ghost" onClick={()=>setQ('')}>{isZh ? '清除' : 'Clear'}</Button>}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((s) => (
          <Card key={s.id} className="group transition-all hover:shadow-[rgba(15,61,46,0.08)_0px_4px_16px] hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-serif text-[16px]">{s.name_zh}</p>
                {s.name_en && <p className="text-[12px] text-[#4f7a5c]">{s.name_en}</p>}
              </div>
              <Badge>{s.code}</Badge>
            </div>
            <div className="mt-3 space-y-1 text-[12px] text-[#0f3d2e]/70">
              {s.contact_person && <p>{tt('suppliers.contact')}：{s.contact_person}</p>}
              {s.phone && <p>{tt('suppliers.phone')}：{s.phone}</p>}
              {s.email && <p>{tt('suppliers.email')}：{s.email}</p>}
              {s.payment_terms && <p>{tt('suppliers.paymentTerms')}：{s.payment_terms}</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={`/suppliers/${s.id}`}><Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">{isZh ? '查看' : 'View'}</Button></Link>
              <Link href={`/suppliers/${s.id}/edit`}><Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">{isZh ? '编辑' : 'Edit'}</Button></Link>
            </div>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && (
        <Card className="py-12 text-center"><p className="text-[13px] text-[#4f7a5c]">{q ? (isZh ? `未找到 “${q}”` : `No results for “${q}”`) : (isZh ? '暂无供应商' : 'No suppliers yet')}</p><Link href="/suppliers/new" className="mt-3 inline-block"><Button size="sm">{isZh ? '添加供应商' : 'Add supplier'}</Button></Link></Card>
      )}
    </AppShell>
  );
}
