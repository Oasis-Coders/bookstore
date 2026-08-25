'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/app-shell';
import { useT } from '@/lib/i18n/use-t';

export function SuppliersClient({ suppliers }: { suppliers: any[] }) {
  const { tt } = useT();
  return (
    <AppShell title={tt('suppliers.title')} titleZh={tt('suppliers.title')} eyebrow={tt('suppliers.count', { n: suppliers.length })} actions={<Button>{tt('suppliers.add')}</Button>}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {suppliers.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-serif text-[16px]">{s.name_zh}</p>
                {s.name_en && <p className="text-[12px] text-[#4f7a5c]">{s.name_en}</p>}
              </div>
              <Badge>{s.code}</Badge>
            </div>
            <div className="mt-3 space-y-1 text-[12px] text-[#0f3d2e]/70">
              {s.contact_name && <p>{tt('suppliers.contact')}：{s.contact_name}</p>}
              {s.phone && <p>{tt('suppliers.phone')}：{s.phone}</p>}
              {s.email && <p>{tt('suppliers.email')}：{s.email}</p>}
              {s.payment_terms && <p>{tt('suppliers.paymentTerms')}：{s.payment_terms}</p>}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle>{tt('suppliers.howTo')}</CardTitle>
        <p className="mt-2 text-[13px] text-[#4f7a5c]">{tt('suppliers.howToDesc')}</p>
      </Card>
    </AppShell>
  );
}
