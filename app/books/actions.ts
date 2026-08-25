'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createBook(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const payload = {
    sku: String(formData.get('sku') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    publisher: String(formData.get('publisher') || '').trim() || null,
    author: String(formData.get('author') || '').trim() || null,
    isbn13: String(formData.get('isbn13') || '').trim() || null,
    category: String(formData.get('category') || '').trim() || null,
    current_price: Number(formData.get('current_price') || 0),
    low_stock_threshold: Number(formData.get('low_stock_threshold') || 5),
  };

  if (!payload.sku || !payload.title) throw new Error('SKU 和书名必填');

  const { data: { user } } = await supabase.auth.getUser();
  const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user?.id || '');
  const roleNames = (roles || []).map((r: any) => r.roles?.name);
  
  const { error } = await supabase.from('books').insert(payload);
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

  const payload = {
    sku: String(formData.get('sku') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    publisher: String(formData.get('publisher') || '').trim() || null,
    author: String(formData.get('author') || '').trim() || null,
    isbn13: String(formData.get('isbn13') || '').trim() || null,
    category: String(formData.get('category') || '').trim() || null,
    current_price: Number(formData.get('current_price') || 0),
    low_stock_threshold: Number(formData.get('low_stock_threshold') || 5),
    is_active: formData.get('is_active') === 'true',
  };

  if (!payload.sku || !payload.title) throw new Error('SKU 和书名必填');

  const { error } = await supabase.from('books').update(payload).eq('id', bookId);
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
  const { error } = await supabase.from('books').delete().eq('id', bookId);
  if (error) throw error;
  revalidatePath('/books');
}
