'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { friendlyDbError } from '@/lib/friendly-error';

// 1C: 内部备用 EAN-13 条码池（27 开头，与 ISBN 明确区分）
// 用于没有厂家条码的图书，配合 2027-01 盘点后批量导入/切换使用。

export type SpareBarcodeStat = { total: number; available: number; assigned: number };
export type SpareBarcodeRow = {
  code: string;
  status: string;
  assigned_at: string | null;
  book_id: string | null;
  book_title: string | null;
  book_sku: string | null;
};

export async function getSpareBarcodeStats(): Promise<SpareBarcodeStat> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { total: 0, available: 0, assigned: 0 };
  // 用 head count 精确计数：直接拉全表会被 Supabase 默认 1000 行截断
  const [{ count: total }, { count: available }] = await Promise.all([
    supabase.from('spare_barcodes').select('code', { count: 'exact', head: true }),
    supabase.from('spare_barcodes').select('code', { count: 'exact', head: true }).eq('status', 'available'),
  ]);
  const t = total || 0;
  const a = available || 0;
  return { total: t, available: a, assigned: t - a };
}

export async function listSpareBarcodes(filter: 'available' | 'assigned', limit = 200): Promise<SpareBarcodeRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('spare_barcodes')
    .select('code, status, assigned_at, assigned_book_id, books!spare_barcodes_assigned_book_id_fkey(title, sku)')
    .eq('status', filter)
    .order('code')
    .limit(limit);
  return ((data || []) as any[]).map((r) => ({
    code: r.code,
    status: r.status,
    assigned_at: r.assigned_at,
    book_id: r.assigned_book_id,
    book_title: r.books?.title || null,
    book_sku: r.books?.sku || null,
  }));
}

/** 给一本书分配下一个可用备用条码 */
export async function assignSpareBarcode(bookId: string): Promise<{ success: boolean; code?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: '系统未配置' };
  const { data: { user } } = await supabase.auth.getUser();
  void user;
  const { data, error } = await supabase.rpc('allocate_spare_barcode', {
    p_book_id: bookId,
  });
  if (error) return { success: false, error: friendlyDbError(error, { fallback: '分配失败' }) };
  revalidatePath('/tools/barcodes');
  return { success: true, code: data as string };
}

/** 批量生成更多备用条码（默认 500） */
export async function generateMoreSpareBarcodes(count = 500): Promise<{ success: boolean; generated?: number; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: '系统未配置' };
  const n = Math.min(Math.max(1, Math.floor(count)), 5000);
  const { data, error } = await supabase.rpc('generate_spare_barcodes', { p_count: n });
  if (error) return { success: false, error: friendlyDbError(error, { fallback: '生成失败' }) };
  revalidatePath('/tools/barcodes');
  return { success: true, generated: data as number };
}

/** 导出用：返回全部可用备用条码（不分页，打印/扫码用） */
export async function listAllAvailableSpareCodes(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('spare_barcodes')
    .select('code')
    .eq('status', 'available')
    .order('code')
    .limit(100000);
  return ((data || []) as any[]).map((r) => r.code);
}

/** 查询一本书当前已分配的备用条码（供编辑页展示） */
export async function getBookSpareBarcode(bookId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from('spare_barcodes').select('code').eq('assigned_book_id', bookId).eq('status', 'assigned').limit(1).maybeSingle();
  return (data as any)?.code || null;
}

/** 已分配备用条码映射：code -> book_id（供销售/选书等页面扫码解析用） */
export async function getAssignedSpareBarcodeMap(): Promise<Record<string, string>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return {};
  const { data } = await supabase
    .from('spare_barcodes')
    .select('code, assigned_book_id')
    .eq('status', 'assigned')
    .not('assigned_book_id', 'is', null)
    .limit(100000);
  const map: Record<string, string> = {};
  for (const r of (data || []) as any[]) {
    if (r.code && r.assigned_book_id) map[String(r.code).trim()] = r.assigned_book_id;
  }
  return map;
}

/** 按书名/代号搜索图书（分配条码用；含停用图书，与书库页一致） */
export async function searchBooksForAssign(q: string): Promise<{ id: string; title: string; sku: string; isbn13: string | null; has_spare: boolean; is_active: boolean }[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const kw = q.trim();
  if (!kw) return [];
  const { data: books } = await supabase
    .from('books')
    .select('id, title, sku, isbn13, is_active')
    .or(`title.ilike.%${kw}%,title_simplified.ilike.%${kw}%,title_traditional.ilike.%${kw}%,title_en.ilike.%${kw}%,sku.ilike.%${kw}%`)
    .order('title')
    .limit(20);
  const ids = ((books || []) as any[]).map((b) => b.id);
  let assignedSet = new Set<string>();
  if (ids.length) {
    const { data: assigned } = await supabase.from('spare_barcodes').select('assigned_book_id').in('assigned_book_id', ids).eq('status', 'assigned');
    assignedSet = new Set(((assigned || []) as any[]).map((r) => r.assigned_book_id));
  }
  return ((books || []) as any[]).map((b) => ({
    id: b.id, title: b.title, sku: b.sku, isbn13: b.isbn13 || null, has_spare: assignedSet.has(b.id), is_active: b.is_active !== false,
  }));
}
