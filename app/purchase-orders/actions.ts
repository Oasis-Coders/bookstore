'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function approvePO(poId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('purchase_orders').update({ status: 'approved' }).eq('id', poId);
  if (error) throw error;
  revalidatePath('/purchase-orders');
}

export async function receivePO(formData: FormData) {
  // Wrapper for apply_purchase_receipt RPC - called from client via server action
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const poId = String(formData.get('po_id'));
  const locationId = String(formData.get('location_id'));
  const linesJson = String(formData.get('lines_json') || '[]');
  const lines = JSON.parse(linesJson);

  const { data, error } = await supabase.rpc('apply_purchase_receipt', {
    p_purchase_order_id: poId,
    p_location_id: locationId,
    p_receipt_lines: lines,
    p_received_at: new Date().toISOString(),
  });

  if (error) throw error;
  revalidatePath('/purchase-orders');
  revalidatePath('/reports');
  return data;
}
