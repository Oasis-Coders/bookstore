'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { friendlyDbError } from '@/lib/friendly-error';
import { ensurePublisherSuppliers } from '@/lib/ensure-publisher-supplier';

// NOTE: server actions return { success, error } instead of throwing.
// Throwing from a server action crashes the page with a generic
// "Server Components render" error in production builds, so business
// failures (duplicate SKU, permission, deadlock, ...) are returned.
export type ActionResult = { success: boolean; error?: string };
const ok = (): ActionResult => ({ success: true });
const fail = (error: string): ActionResult => ({ success: false, error });

export async function createBook(formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');

  const basePayload = {
    sku: String(formData.get('sku') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    publisher: String(formData.get('publisher') || '').trim() || null,
    author: String(formData.get('author') || '').trim() || null,
    isbn13: String(formData.get('isbn13') || '').trim() || null,
    category: String(formData.get('category') || '').trim() || null,
    shelf_position: String(formData.get('shelf_position') || '').trim() || null,
    warehouse_location: String(formData.get('warehouse_location') || '').trim() || null,
    current_price: Number(formData.get('current_price') || 0),
    low_stock_threshold: Number(formData.get('low_stock_threshold') || 5),
  };
  const titleEn = String(formData.get('title_en') || '').trim() || null;
  const titleSimplified = String(formData.get('title_simplified') || '').trim() || null;
  const titleTraditional = String(formData.get('title_traditional') || '').trim() || null;

  if (!basePayload.sku || !basePayload.title) return fail('代号和书名必填');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user?.id || '');
  const roleNames = (roles || []).map((r: any) => r.roles?.name);

  // Try with title_en and shelf_position and simplified/traditional, fallback if columns missing
  let payload: any = { ...basePayload, title_en: titleEn, title_simplified: titleSimplified, title_traditional: titleTraditional };
  let { error } = await supabase.from('books').insert(payload);
  if (error && (error.message.includes('title_en') || error.message.includes('shelf_position') || error.message.includes('warehouse_location'))) {
    const { shelf_position: _sp, warehouse_location: _wl, ...rest } = basePayload;
    const meta: any = {};
    if (titleEn) meta.title_en = titleEn;
    if (basePayload.shelf_position) meta.shelf_position = basePayload.shelf_position;
    if (basePayload.warehouse_location) meta.warehouse_location = basePayload.warehouse_location;
    if (titleSimplified) meta.title_simplified = titleSimplified;
    if (titleTraditional) meta.title_traditional = titleTraditional;
    payload = { ...rest, metadata: Object.keys(meta).length ? meta : {} };
    const res = await supabase.from('books').insert(payload);
    error = res.error;
  }
  if (error) {
    if (error.message.includes('row-level security') || error.code === '42501') {
      return fail(`权限不足：当前角色 [${roleNames.join(',') || '无角色'}] 无法添加图书。请让 super_admin 在 人员管理 给你分配 staff/admin 角色。`);
    }
    return fail(friendlyDbError(error, { duplicate: '图书代号已存在，请换一个代号' }));
  }
  // 出版社自动同步为供应商：手动输入的新出版社也会出现在采购单/供应商页面的下拉里。
  // 同步失败（例如非 admin 权限）不影响图书本身的保存。
  try {
    await ensurePublisherSuppliers(supabase, [basePayload.publisher]);
  } catch { /* 同步是 best-effort，图书已保存成功 */ }
  revalidatePath('/books');
  return ok();
}
export async function updateBook(bookId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const basePayload = {
    sku: String(formData.get('sku') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    publisher: String(formData.get('publisher') || '').trim() || null,
    author: String(formData.get('author') || '').trim() || null,
    isbn13: String(formData.get('isbn13') || '').trim() || null,
    category: String(formData.get('category') || '').trim() || null,
    shelf_position: String(formData.get('shelf_position') || '').trim() || null,
    warehouse_location: String(formData.get('warehouse_location') || '').trim() || null,
    current_price: Number(formData.get('current_price') || 0),
    low_stock_threshold: Number(formData.get('low_stock_threshold') || 5),
    is_active: formData.get('is_active') === 'true',
  };
  const titleEn = String(formData.get('title_en') || '').trim() || null;
  const titleSimplified = String(formData.get('title_simplified') || '').trim() || null;
  const titleTraditional = String(formData.get('title_traditional') || '').trim() || null;
  if (!basePayload.sku || !basePayload.title) return fail('代号和书名必填');
  let payload: any = { ...basePayload, title_en: titleEn, title_simplified: titleSimplified, title_traditional: titleTraditional };
  let { error } = await supabase.from('books').update(payload).eq('id', bookId);
  if (error && (error.message.includes('title_en') || error.message.includes('shelf_position') || error.message.includes('warehouse_location') || error.message.includes('title_simplified') || error.message.includes('title_traditional'))) {
    // Fallback: update without new columns, merge into metadata
    const { data: existing } = await supabase.from('books').select('metadata').eq('id', bookId).single();
    const meta: any = { ...(existing?.metadata || {}) };
    if (titleEn) meta.title_en = titleEn; else delete meta.title_en;
    if (basePayload.shelf_position) meta.shelf_position = basePayload.shelf_position; else delete meta.shelf_position;
    if (basePayload.warehouse_location) meta.warehouse_location = basePayload.warehouse_location; else delete meta.warehouse_location;
    if (titleSimplified) meta.title_simplified = titleSimplified; else delete meta.title_simplified;
    if (titleTraditional) meta.title_traditional = titleTraditional; else delete meta.title_traditional;
    const { shelf_position: _sp, warehouse_location: _wl, title_simplified: _s, title_traditional: _t, title_en: _en, ...rest } = payload as any;
    const { error: err2 } = await supabase.from('books').update({ ...rest, metadata: meta }).eq('id', bookId);
    error = err2;
  }
  if (error) return fail(friendlyDbError(error, { duplicate: '图书代号已存在，请换一个代号' }));
  // 出版社自动同步为供应商（同 createBook）
  try {
    await ensurePublisherSuppliers(supabase, [basePayload.publisher]);
  } catch { /* best-effort */ }
  revalidatePath('/books');
  revalidatePath(`/books/${bookId}`);
  return ok();
}
export async function updateBookPrice(bookId: string, price: number): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const { error } = await supabase.from('books').update({ current_price: price }).eq('id', bookId);
  if (error) return fail(friendlyDbError(error, { fallback: '更新价格失败，请重试' }));
  revalidatePath('/books');
  return ok();
}
export async function deleteBook(bookId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  // Server-side role check: only admin/super_admin can delete
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('未登录，请先登录');
  const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
  const roleNames = (roles || []).map((r: any) => r.roles?.name);
  if (!roleNames.includes('admin') && !roleNames.includes('super_admin')) {
    return fail('权限不足：只有管理员可以删除');
  }
  const { error } = await supabase.from('books').delete().eq('id', bookId);
  if (error) return fail(friendlyDbError(error, { fallback: '删除失败：该图书可能已有库存或业务记录' }));
  revalidatePath('/books');
  return ok();
}

// ============ 1A: 出版社下拉选项（与供应商搜索一致：中英名/代号） ============
export type SupplierOption = { id: string; name_zh: string; name_en: string | null; code: string };
export async function getSupplierOptions(): Promise<SupplierOption[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('suppliers').select('id, name_zh, name_en, code').eq('is_active', true).order('name_zh').limit(500);
  return (data || []) as SupplierOption[];
}

// ============ 1B: 分类管理 ============
export type CategoryStat = { name: string; count: number };
export async function getCategoryStats(): Promise<CategoryStat[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data: cats } = await supabase.from('categories').select('name').order('sort_order').order('name').limit(1000);
  const { data: books } = await supabase.from('books').select('category').not('category', 'is', null).limit(5000);
  const counts = new Map<string, number>();
  for (const r of (books || []) as any[]) {
    const c = String(r.category || '').trim();
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  }
  return ((cats || []) as any[])
    .map((c) => ({ name: c.name as string, count: counts.get(c.name as string) || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
}

export async function createCategory(name: string): Promise<ActionResult> {
  const n = name.trim();
  if (!n) return fail('分类名称不能为空');
  const { supabase, ok: can, error } = await requireBookEditor();
  if (!can) return fail(error!);
  const { data: existing } = await supabase.from('categories').select('id').eq('name', n).maybeSingle();
  if (existing) return fail('该分类已存在');
  const { error: err } = await supabase.from('categories').insert({ name: n });
  if (err) return fail(friendlyDbError(err, { fallback: '添加分类失败，请重试' }));
  revalidatePath('/books');
  return ok();
}

async function requireBookEditor(): Promise<{ supabase: any; ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, ok: false, error: '系统未配置' };
  const { data: { user } } = await supabase.auth.getUser();
  const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user?.id || '');
  const roleNames = (roles || []).map((r: any) => r.roles?.name);
  if (!roleNames.includes('staff') && !roleNames.includes('admin') && !roleNames.includes('super_admin')) {
    return { supabase, ok: false, error: '权限不足：需要 staff 及以上角色' };
  }
  return { supabase, ok: true };
}

export async function renameCategory(oldName: string, newName: string): Promise<ActionResult> {
  const oldN = oldName.trim(), newN = newName.trim();
  if (!oldN || !newN) return fail('分类名称不能为空');
  if (oldN === newN) return ok();
  const { supabase, ok: can, error } = await requireBookEditor();
  if (!can) return fail(error!);
  const { error: err } = await supabase.from('books').update({ category: newN }).eq('category', oldN);
  if (err) return fail(friendlyDbError(err, { fallback: '改名失败，请重试' }));
  await supabase.from('categories').update({ name: newN }).eq('name', oldN);
  revalidatePath('/books');
  return ok();
}

export async function deleteCategory(name: string): Promise<ActionResult & { affected?: number }> {
  const n = name.trim();
  if (!n) return fail('分类名称不能为空');
  const { supabase, ok: can, error } = await requireBookEditor();
  if (!can) return fail(error!);
  const { data: existing } = await supabase.from('books').select('id').eq('category', n).limit(5000);
  const affected = (existing || []).length;
  const { error: err } = await supabase.from('books').update({ category: null }).eq('category', n);
  if (err) return fail(friendlyDbError(err, { fallback: '删除失败，请重试' }));
  await supabase.from('categories').delete().eq('name', n);
  revalidatePath('/books');
  return { success: true, affected };
}
