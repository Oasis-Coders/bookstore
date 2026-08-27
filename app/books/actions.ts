'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createBook(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const basePayload = {
    sku: String(formData.get('sku') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    publisher: String(formData.get('publisher') || '').trim() || null,
    author: String(formData.get('author') || '').trim() || null,
    isbn13: String(formData.get('isbn13') || '').trim() || null,
    category: String(formData.get('category') || '').trim() || null,
    shelf_position: String(formData.get('shelf_position') || '').trim() || null,
    current_price: Number(formData.get('current_price') || 0),
    low_stock_threshold: Number(formData.get('low_stock_threshold') || 5),
  };
  const titleEn = String(formData.get('title_en') || '').trim() || null;
  const titleSimplified = String(formData.get('title_simplified') || '').trim() || null;
  const titleTraditional = String(formData.get('title_traditional') || '').trim() || null;

  if (!basePayload.sku || !basePayload.title) throw new Error('代号和书名必填 / Code and title required');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user?.id || '');
  const roleNames = (roles || []).map((r: any) => r.roles?.name);

  // Try with title_en and shelf_position and simplified/traditional, fallback if columns missing
  let payload: any = { ...basePayload, title_en: titleEn, title_simplified: titleSimplified, title_traditional: titleTraditional };
  let { error } = await supabase.from('books').insert(payload);
  if (error && (error.message.includes('title_en') || error.message.includes('shelf_position'))) {
    const { shelf_position: _sp, ...rest } = basePayload;
    const meta: any = {};
    if (titleEn) meta.title_en = titleEn;
    if (basePayload.shelf_position) meta.shelf_position = basePayload.shelf_position;
    if (titleSimplified) meta.title_simplified = titleSimplified;
    if (titleTraditional) meta.title_traditional = titleTraditional;
    payload = { ...rest, metadata: Object.keys(meta).length ? meta : {} };
    const res = await supabase.from('books').insert(payload);
    error = res.error;
  }
  if (error) {
    if (error.message.includes('row-level security') || error.code === '42501') {
      throw new Error(`权限不足：当前角色 [${roleNames.join(',') || '无角色'}] 无法添加图书。请让 super_admin 在 人员管理 给你分配 staff/admin 角色。原始错误: ${error.message}`);
    }
    throw error;
  }
  revalidatePath('/books');
}
export async function updateBook(bookId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const basePayload = {
    sku: String(formData.get('sku') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    publisher: String(formData.get('publisher') || '').trim() || null,
    author: String(formData.get('author') || '').trim() || null,
    isbn13: String(formData.get('isbn13') || '').trim() || null,
    category: String(formData.get('category') || '').trim() || null,
    shelf_position: String(formData.get('shelf_position') || '').trim() || null,
    current_price: Number(formData.get('current_price') || 0),
    low_stock_threshold: Number(formData.get('low_stock_threshold') || 5),
    is_active: formData.get('is_active') === 'true',
  };
  const titleEn = String(formData.get('title_en') || '').trim() || null;
  const titleSimplified = String(formData.get('title_simplified') || '').trim() || null;
  const titleTraditional = String(formData.get('title_traditional') || '').trim() || null;
  if (!basePayload.sku || !basePayload.title) throw new Error('代号和书名必填 / Code and title required');
  let payload: any = { ...basePayload, title_en: titleEn, title_simplified: titleSimplified, title_traditional: titleTraditional };
  let { error } = await supabase.from('books').update(payload).eq('id', bookId);
  if (error && (error.message.includes('title_en') || error.message.includes('shelf_position') || error.message.includes('title_simplified') || error.message.includes('title_traditional'))) {
    // Fallback: update without new columns, merge into metadata
    const { data: existing } = await supabase.from('books').select('metadata').eq('id', bookId).single();
    const meta: any = { ...(existing?.metadata || {}) };
    if (titleEn) meta.title_en = titleEn; else delete meta.title_en;
    if (basePayload.shelf_position) meta.shelf_position = basePayload.shelf_position; else delete meta.shelf_position;
    if (titleSimplified) meta.title_simplified = titleSimplified; else delete meta.title_simplified;
    if (titleTraditional) meta.title_traditional = titleTraditional; else delete meta.title_traditional;
    const { shelf_position: _sp, title_simplified: _s, title_traditional: _t, title_en: _en, ...rest } = payload as any;
    const { error: err2 } = await supabase.from('books').update({ ...rest, metadata: meta }).eq('id', bookId);
    error = err2;
  }
  if (error) throw error;
  revalidatePath('/books');
  revalidatePath(`/books/${bookId}`);
}
export async function updateBookPrice(bookId: string, price: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('books').update({ current_price: price }).eq('id', bookId);
  if (error) throw error;
  revalidatePath('/books');
}
export async function deleteBook(bookId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  // Server-side role check: only admin/super_admin can delete
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录 / Not authenticated');
  const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
  const roleNames = (roles || []).map((r: any) => r.roles?.name);
  if (!roleNames.includes('admin') && !roleNames.includes('super_admin')) {
    throw new Error('权限不足：只有管理员可以删除 / Only admin can delete');
  }
  const { error } = await supabase.from('books').delete().eq('id', bookId);
  if (error) throw error;
  revalidatePath('/books');
}
