import type { SupabaseClient } from '@supabase/supabase-js';

export type PurchaseBatch = {
  unit_cost?: number | null;
  received_at?: string | null;
  quantity_received?: number | null;
  quantity_remaining?: number | null;
};

export type LatestPurchaseCost = { unit_cost: number; received_at: string | null };

export type PurchaseCostEntry = {
  unit_cost: number;
  received_at: string | null;
  quantity_received: number | null;
  quantity_remaining: number | null;
};

// 工单 #18 跟进：多批次进货价全部列出来（按收货时间倒序），而不是只显示最近一次。
// 只计实际收货量 > 0 且单价有效的批次；无有效批次返回 []。
export function listPurchaseCosts(batches: PurchaseBatch[] | null | undefined): PurchaseCostEntry[] {
  if (!Array.isArray(batches)) return [];
  return batches
    .filter((b): b is PurchaseBatch & { unit_cost: number } => {
      if (!b || typeof b.unit_cost !== 'number' || !Number.isFinite(b.unit_cost)) return false;
      if (typeof b.quantity_received === 'number' && b.quantity_received <= 0) return false;
      const t = b.received_at ? Date.parse(b.received_at) : 0;
      return Number.isFinite(t);
    })
    .map((b) => ({
      unit_cost: b.unit_cost,
      received_at: b.received_at ?? null,
      quantity_received: typeof b.quantity_received === 'number' ? b.quantity_received : null,
      quantity_remaining: typeof b.quantity_remaining === 'number' ? b.quantity_remaining : null,
    }))
    .sort((a, b) => {
      const ta = a.received_at ? Date.parse(a.received_at) : 0;
      const tb = b.received_at ? Date.parse(b.received_at) : 0;
      return tb - ta;
    });
}

export type PurchaseCostDisplay =
  | { kind: 'batches'; entries: PurchaseCostEntry[] }
  | { kind: 'import'; unit_cost: number }
  | { kind: 'none' };

// 工单 #18 跟进：进货价展示口径——有收货批次就列全部批次价；没有批次时，
// 若批量导入文件里填过 Unit cost（books.import_unit_cost），显示导入价；
// 两者都没有才显示暂无进货记录。
export function resolvePurchaseCost(
  batches: PurchaseBatch[] | null | undefined,
  importUnitCost: number | null | undefined,
): PurchaseCostDisplay {
  const entries = listPurchaseCosts(batches);
  if (entries.length > 0) return { kind: 'batches', entries };
  if (typeof importUnitCost === 'number' && Number.isFinite(importUnitCost)) {
    return { kind: 'import', unit_cost: importUnitCost };
  }
  return { kind: 'none' };
}

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

export async function getPurchaseCosts(supabase: SupabaseClient, bookId: string): Promise<PurchaseCostEntry[]> {
  const { data, error } = await supabase
    .from('inventory_batches')
    .select('unit_cost, received_at, quantity_received, quantity_remaining')
    .eq('book_id', bookId)
    .gt('quantity_received', 0)
    .order('received_at', { ascending: false });
  if (error || !data) return [];
  return listPurchaseCosts(data as any[]);
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
