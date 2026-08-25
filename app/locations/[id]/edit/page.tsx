import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EditLocationClient } from './edit-client';

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Demo</div>;
  const { data: loc } = await supabase.from('locations').select('*').eq('id', id).single();
  if (!loc) notFound();
  return <EditLocationClient location={loc} />;
}
