import type { SupabaseClient } from '@supabase/supabase-js';

export async function listBooks(supabase: SupabaseClient, q?: string) {
  let query = supabase.from('books').select('*').eq('is_active', true).order('title').limit(50);
  if (q) {
    query = query.or(`title.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getLowStock(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('low_stock_view').select('*').limit(50);
  if (error) throw error;
  return data;
}

export async function getValuation(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('inventory_valuation_view').select('*').limit(100);
  if (error) throw error;
  return data;
}
