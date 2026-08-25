import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function SuppliersPage() {
  const supabase = await createSupabaseServerClient();
  let suppliers: any[] = [];
  let mode: 'demo' | 'live' = 'demo';

  if (supabase) {
    try {
      const { data } = await supabase.from('suppliers').select('*').eq('is_active', true).order('name_zh').limit(50);
      if (data) {
        suppliers = data;
        mode = 'live';
      }
    } catch {}
  }

  if (mode === 'demo' && suppliers.length === 0) {
    suppliers = [
      { id: '1', code: 'SUP-001', name_zh: '以琳书房供应', name_en: 'Elim Books', contact_name: '陈弟兄', phone: '020 1234 5678', payment_terms: '月结30天' },
      { id: '2', code: 'SUP-002', name_zh: '福音出版社直供', contact_name: '林姐妹', email: 'orders@gospel-press.example', payment_terms: '预付' },
    ];
  }

  return (
    <AppShell title="Suppliers" titleZh="供应商" eyebrow={`${suppliers.length} 家合作`} actions={<Button>+ 新增供应商</Button>}>
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
              {s.contact_name && <p>联系人：{s.contact_name}</p>}
              {s.phone && <p>电话：{s.phone}</p>}
              {s.email && <p>邮箱：{s.email}</p>}
              {s.payment_terms && <p>账期：{s.payment_terms}</p>}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle>如何使用</CardTitle>
        <p className="mt-2 text-[13px] text-[#4f7a5c]">供应商与采购单关联。下单后自动汇总金额，收货时按行建批次，支持同一供应商多次不同进货价。</p>
      </Card>
    </AppShell>
  );
}
