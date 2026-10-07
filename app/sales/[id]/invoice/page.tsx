import { createSupabaseServerClient } from '@/lib/supabase/server';
import { InvoiceClient } from './invoice-client';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  let isAdmin = false;
  let canEdit = false;
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
        const names = (roles || []).map((r: any) => r.roles?.name);
        isAdmin = names.includes('admin') || names.includes('super_admin');
        // 2026-10-07: 改单放开给 staff（退换货）
        canEdit = isAdmin || names.includes('staff');
      }
    } catch {}
  }
  return <InvoiceClient saleId={id} isAdmin={isAdmin} canEdit={canEdit} />;
}
