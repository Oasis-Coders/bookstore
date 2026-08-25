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

  const { error } = await supabase.from('books').insert(payload);
  if (error) throw error;
  revalidatePath('/books');
}

export async function updateBookPrice(bookId: string, price: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('books').update({ current_price: price }).eq('id', bookId);
  if (error) throw error;
  revalidatePath('/books');
}
