import type { SupabaseClient } from '@supabase/supabase-js';

export type PurchaseBatch = {
  unit_cost?: number | null;
  received_at?: string | null;
  quantity_received?: number | null;
};

export type LatestPurchaseCost = { unit_cost: number; received_at: string | null };

// 工单 #18：进货价 = 最近一次收货批次的实际单价（派生值，不存 books 表、界面只读展示，
// 因此无法手动修改）。取 received_at 最晚、且实际收货量 > 0 的批次；无进货记录返回 null。
export function latestPurchaseCost(batches: PurchaseBatch[] | null | undefined): LatestPurchaseCost | null {
  if (!Array.isArray(batches)) return null;
  let best: LatestPurchaseCost | null = null;
  let bestTime = -Infinity;
  for (const b of batches) {
    if (!b || typeof b.unit_cost !== 'number') continue;
    if (typeof b.quantity_received === 'number' && b.quantity_received <= 0) continue;
    const t = b.received_at ? Date.parse(b.received_at) : 0;
    if (!Number.isFinite(t)) continue;
    if (t >= bestTime) {
      bestTime = t;
      best = { unit_cost: b.unit_cost, received_at: b.received_at ?? null };
    }
  }
  return best;
}

export async function getLatestPurchaseCost(supabase: SupabaseClient, bookId: string): Promise<LatestPurchaseCost | null> {
  const { data, error } = await supabase
    .from('inventory_batches')
    .select('unit_cost, received_at')
    .eq('book_id', bookId)
    .gt('quantity_received', 0)
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data || typeof (data as any).unit_cost !== 'number') return null;
  return { unit_cost: (data as any).unit_cost, received_at: (data as any).received_at ?? null };
}

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
