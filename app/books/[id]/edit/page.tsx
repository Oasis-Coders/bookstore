import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EditBookClient } from './edit-client';

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Not configured</div>;

  const { data: book, error } = await supabase.from('books').select('*').eq('id', id).single();
  if (error || !book) notFound();

  return <EditBookClient book={book} />;
}
