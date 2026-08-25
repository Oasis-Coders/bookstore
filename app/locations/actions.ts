'use server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createLocation(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const payload = {
    code: String(formData.get('code') || '').trim(),
    name: String(formData.get('name') || '').trim(),
    location_type: String(formData.get('location_type') || 'store').trim(),
    address: String(formData.get('address') || '').trim() || null,
  };
  if (!payload.code || !payload.name) throw new Error('代号和名称必填');
  const { error } = await supabase.from('locations').insert(payload);
  if (error) {
    if (error.message.includes('row-level security') || error.code === '42501') {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user?.id || '');
      const roleNames = (roles || []).map((r: any) => r.roles?.name);
      throw new Error(`权限不足：当前角色 [${roleNames.join(',') || '无角色'}] 无法添加库位。`);
    }
    throw error;
  }
  revalidatePath('/locations');
}
