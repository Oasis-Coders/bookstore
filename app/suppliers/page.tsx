import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SuppliersClient } from './suppliers-client';

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

  return <SuppliersClient suppliers={suppliers} />;
}
