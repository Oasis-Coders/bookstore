'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createSupplier(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const payload = {
    code: String(formData.get('code') || '').trim(),
    name_zh: String(formData.get('name_zh') || '').trim(),
    name_en: String(formData.get('name_en') || '').trim() || null,
    contact_name: String(formData.get('contact_name') || '').trim() || null,
    email: String(formData.get('email') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    address: String(formData.get('address') || '').trim() || null,
    payment_terms: String(formData.get('payment_terms') || '').trim() || null,
    notes: String(formData.get('notes') || '').trim() || null,
  };

  if (!payload.code || !payload.name_zh) throw new Error('代号和中文名称必填');

  const { error } = await supabase.from('suppliers').insert(payload);
  if (error) throw error;
  revalidatePath('/suppliers');
}

export async function updateSupplier(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const payload = {
    name_zh: String(formData.get('name_zh') || '').trim(),
    name_en: String(formData.get('name_en') || '').trim() || null,
    contact_name: String(formData.get('contact_name') || '').trim() || null,
    email: String(formData.get('email') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    payment_terms: String(formData.get('payment_terms') || '').trim() || null,
  };

  const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
  if (error) throw error;
  revalidatePath('/suppliers');
}
