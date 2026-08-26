import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SuppliersClient } from './suppliers-client';

export default async function SuppliersPage() {
  const supabase = await createSupabaseServerClient();
  let suppliers: any[] = [];

  if (supabase) {
    try {
      const { data } = await supabase.from('suppliers').select('*').eq('is_active', true).order('name_zh').limit(50);
      if (data) suppliers = data;
    } catch {}
  }

  return <SuppliersClient suppliers={suppliers} />;
}
