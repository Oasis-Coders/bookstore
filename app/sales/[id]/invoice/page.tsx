import { createSupabaseServerClient } from '@/lib/supabase/server';
import { InvoiceClient } from './invoice-client';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  let isAdmin = false;
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
        isAdmin = (roles || []).some((r: any) => r.roles?.name === 'admin' || r.roles?.name === 'super_admin');
      }
    } catch {}
  }
  return <InvoiceClient saleId={id} isAdmin={isAdmin} />;
}
