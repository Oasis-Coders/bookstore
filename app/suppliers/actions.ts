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
    contact_person: String(formData.get('contact_person') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    email: String(formData.get('email') || '').trim() || null,
    payment_terms: String(formData.get('payment_terms') || '').trim() || null,
    address: String(formData.get('address') || '').trim() || null,
    notes: String(formData.get('notes') || '').trim() || null,
  };
  if (!payload.code || !payload.name_zh) throw new Error('代号和中文名必填');
  const { error } = await supabase.from('suppliers').insert(payload);
  if (error) {
    if (error.message.includes('row-level security') || error.code === '42501') {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user?.id || '');
      const roleNames = (roles || []).map((r: any) => r.roles?.name);
      throw new Error(`权限不足：当前角色 [${roleNames.join(',') || '无角色'}] 无法添加供应商。请让 super_admin 分配角色。`);
    }
    throw error;
  }
  revalidatePath('/suppliers');
}
export async function updateSupplier(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const payload = {
    name_zh: String(formData.get('name_zh') || '').trim(),
    contact_person: String(formData.get('contact_person') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
  };
  const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
  if (error) throw error;
  revalidatePath(`/suppliers/${id}`);
}
