import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EditSaleClient } from './edit-client';
import { notFound, redirect } from 'next/navigation';

export default async function EditSalePage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/auth?redirectTo=/sales');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?redirectTo=/sales');

  const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
  const roleNames = (roles || []).map((r: any) => r.roles?.name);
  const isAdmin = roleNames.includes('admin') || roleNames.includes('super_admin');
  if (!isAdmin) redirect('/');

  const { data: sale } = await supabase.from('sales_transactions').select('*').eq('id', params.id).single();
  if (!sale) notFound();

  const { data: lines } = await supabase.from('sales_transaction_lines').select('*, books(title, sku)').eq('sale_id', params.id);

  let edits: any[] = [];
  try {
    const { data } = await supabase.from('sale_edits_view').select('*').eq('sale_id', params.id).order('edited_at', { ascending: false });
    edits = data || [];
  } catch {
    try {
      const { data } = await supabase.from('sale_edits').select('*, profiles:edited_by(display_name)').eq('sale_id', params.id).order('edited_at', { ascending: false });
      edits = (data || []).map((e: any) => ({ ...e, editor_name: e.profiles?.display_name }));
    } catch {}
  }

  return <EditSaleClient sale={sale} lines={lines || []} edits={edits} />;
}
