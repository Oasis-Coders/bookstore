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

export async function createSupplier(formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
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
  if (!payload.code || !payload.name_zh) return fail('代号和中文名必填');
  const { error } = await supabase.from('suppliers').insert(payload);
  if (error) {
    if (error.message.includes('row-level security') || error.code === '42501') {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user?.id || '');
      const roleNames = (roles || []).map((r: any) => r.roles?.name);
      return fail(`权限不足：当前角色 [${roleNames.join(',') || '无角色'}] 无法添加供应商。请让 super_admin 分配角色。`);
    }
    return fail(friendlyDbError(error, { duplicate: '供应商代号已存在，请换一个代号' }));
  }
  revalidatePath('/suppliers');
  return ok();
}
export async function updateSupplier(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
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
    is_active: formData.get('is_active') !== 'false',
  };
  if (!payload.code || !payload.name_zh) return fail('代号和中文名必填');
  const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
  if (error) return fail(friendlyDbError(error, { duplicate: '供应商代号已存在，请换一个代号' }));
  revalidatePath(`/suppliers/${id}`);
  revalidatePath('/suppliers');
  return ok();
}
export async function deleteSupplier(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('未登录，请先登录');
  const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
  const roleNames = (roles || []).map((r: any) => r.roles?.name);
  if (!roleNames.includes('admin') && !roleNames.includes('super_admin')) {
    return fail('权限不足：只有管理员可以删除');
  }
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) return fail(friendlyDbError(error, { fallback: '删除失败：该供应商可能已有业务记录' }));
  revalidatePath('/suppliers');
  return ok();
}
