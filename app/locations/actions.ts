'use server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { friendlyDbError } from '@/lib/friendly-error';
import type { ActionResult } from '@/app/books/actions';

// NOTE: server actions return { success, error } instead of throwing.
// Throwing from a server action crashes the page with a generic
// "Server Components render" error in production builds.
const ok = (): ActionResult => ({ success: true });
const fail = (error: string): ActionResult => ({ success: false, error });

export async function createLocation(formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const payload = {
    code: String(formData.get('code') || '').trim(),
    name: String(formData.get('name') || '').trim(),
    location_type: String(formData.get('location_type') || 'store').trim(),
    address: String(formData.get('address') || '').trim() || null,
  };
  if (!payload.code || !payload.name) return fail('代号和名称必填');
  const { error } = await supabase.from('locations').insert(payload);
  if (error) {
    if (error.message.includes('row-level security') || error.code === '42501') {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user?.id || '');
      const roleNames = (roles || []).map((r: any) => r.roles?.name);
      return fail(`权限不足：当前角色 [${roleNames.join(',') || '无角色'}] 无法添加库位。`);
    }
    return fail(friendlyDbError(error, { duplicate: '库位代号已存在，请换一个代号' }));
  }
  revalidatePath('/locations');
  return ok();
}
export async function updateLocation(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const payload = {
    code: String(formData.get('code') || '').trim(),
    name: String(formData.get('name') || '').trim(),
    location_type: String(formData.get('location_type') || 'store').trim(),
    address: String(formData.get('address') || '').trim() || null,
    is_active: formData.get('is_active') !== 'false',
  };
  const { error } = await supabase.from('locations').update(payload).eq('id', id);
  if (error) return fail(friendlyDbError(error, { duplicate: '库位代号已存在，请换一个代号' }));
  revalidatePath(`/locations/${id}`);
  revalidatePath('/locations');
  return ok();
}
export async function deleteLocation(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) return fail(friendlyDbError(error, { fallback: '删除失败：该库位可能已有库存或业务记录' }));
  revalidatePath('/locations');
  return ok();
}
