'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createSale(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const locationId = String(formData.get('location_id'));
  const itemsJson = String(formData.get('items_json') || '[]');
  const items = JSON.parse(itemsJson);
  const externalRef = String(formData.get('external_ref') || `POS-${Date.now()}`);

  const { data, error } = await supabase.rpc('apply_sale', {
    p_location_id: locationId,
    p_items: items,
    p_external_reference: externalRef,
    p_sold_at: new Date().toISOString(),
    p_notes: null,
  });

  if (error) throw error;
  revalidatePath('/sales');
  revalidatePath('/reports');
  return data;
}
