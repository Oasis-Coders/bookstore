import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EditBookClient } from './edit-client';

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Not configured</div>;

  const { data: book, error } = await supabase.from('books').select('*').eq('id', id).single();
  if (error || !book) notFound();

  // Check if current user can delete (admin or super_admin)
  let canDelete = false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
      const roleNames = (roles || []).map((r: any) => r.roles?.name);
      canDelete = roleNames.includes('admin') || roleNames.includes('super_admin');
    }
  } catch {}

  return <EditBookClient book={book} canDelete={canDelete} />;
}
