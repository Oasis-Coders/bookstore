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

/**
 * 分页拉取全部在售图书（选书器用）。
 * 原因：PostgREST 单次查询最多返回 1000 行，而书库已有 500+ 本在售书；
 * 销售/改单/采购页之前用 .limit(200/300) 只取按书名排序的前 N 本，
 * 排在后面的书（如 A111、T4、D114）在选书器里永远搜不到。
 * 用 .range() 按 1000 行一页拉满，直到遇到不满一页为止。
 */
export async function listAllActiveBooks(supabase: SupabaseClient, columns = 'id, title, sku') {
  const PAGE = 1000;
  const all: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('books')
      .select(columns)
      .eq('is_active', true)
      .order('title')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
