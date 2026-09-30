import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BarcodesClient } from './barcodes-client';
import { getSpareBarcodeStats, listSpareBarcodes } from './actions';

export default async function BarcodesPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/books');

  const [stats, assigned, available] = await Promise.all([
    getSpareBarcodeStats(),
    listSpareBarcodes('assigned', 300),
    listSpareBarcodes('available', 300),
  ]);

  return <BarcodesClient stats={stats} assigned={assigned} available={available} />;
}
