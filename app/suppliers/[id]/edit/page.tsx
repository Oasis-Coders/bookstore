import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EditSupplierClient } from './edit-client';

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Not configured</div>;
  const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', id).single();
  if (!supplier) notFound();

  let canDelete = false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
      const roleNames = (roles || []).map((r: any) => r.roles?.name);
      canDelete = roleNames.includes('admin') || roleNames.includes('super_admin');
    }
  } catch {}

  return <EditSupplierClient supplier={supplier} canDelete={canDelete} />;
}
