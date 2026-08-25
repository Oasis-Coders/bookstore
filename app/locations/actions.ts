'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createLocation(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const payload = {
    code: String(formData.get('code') || '').trim(),
    name: String(formData.get('name') || '').trim(),
    location_type: String(formData.get('location_type') || 'store') as 'store' | 'warehouse',
    address: String(formData.get('address') || '').trim() || null,
  };

  if (!payload.code || !payload.name) throw new Error('代号和名称必填');

  const { error } = await supabase.from('locations').insert(payload);
  if (error) throw error;
  revalidatePath('/locations');
}
