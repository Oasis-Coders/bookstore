import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EditSupplierClient } from './edit-client';

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Demo</div>;
  const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', id).single();
  if (!supplier) notFound();
  return <EditSupplierClient supplier={supplier} />;
}
