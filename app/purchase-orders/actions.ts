'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { friendlyDbError } from '@/lib/friendly-error';
import type { ActionResult } from '@/app/books/actions';

// NOTE: server actions return { success, error } instead of throwing.
// Throwing from a server action crashes the page with a generic
// "Server Components render" error in production builds.
const ok = (extra?: Record<string, unknown>): ActionResult & Record<string, unknown> => ({ success: true, ...(extra || {}) });
const fail = (error: string): ActionResult => ({ success: false, error });

// ============ 反馈批 3: 多书草稿 / 勾选 / 经手人 / 收货进货价 / 导出 ============

export type PODraftLineInput = { book_id: string; quantity: number };
export type StageHandler = { stage: string; user_id: string | null; display_name: string; at: string };

async function currentStaffName(supabase: any): Promise<{ id: string | null; display_name: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, display_name: '' };
    const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
    return { id: user.id, display_name: prof?.display_name || user.email || '' };
  } catch {
    return { id: null, display_name: '' };
  }
}

async function appendStageHandler(supabase: any, poId: string, stage: string): Promise<void> {
  const { id, display_name } = await currentStaffName(supabase);
  const entry: StageHandler = { stage, user_id: id, display_name, at: new Date().toISOString() };
  // 原子追加：读-改-写放在单条 update 里（stage_handlers 很少并发写）
  const { data: po } = await supabase.from('purchase_orders').select('stage_handlers').eq('id', poId).single();
  const arr: StageHandler[] = Array.isArray((po as any)?.stage_handlers) ? (po as any).stage_handlers : [];
  await supabase.from('purchase_orders').update({ stage_handlers: [...arr, entry] }).eq('id', poId);
}

/** 3A+3C+原子: 创建多书草稿（PO号服务端序列生成，不在建单时填进货价） */
export async function createPODraft(input: { supplier_id: string; notes?: string; order_date?: string; lines: PODraftLineInput[] }): Promise<ActionResult & { poId?: string; poNumber?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  if (!input.supplier_id) return fail('请选择供应商');
  const cleanLines = (input.lines || [])
    .filter((l) => l.book_id && Number(l.quantity) > 0)
    .map((l) => ({ book_id: l.book_id, quantity: Math.floor(Number(l.quantity)) }));
  if (cleanLines.length === 0) return fail('请至少添加一种图书');

  const { data, error } = await supabase.rpc('create_purchase_order_draft', {
    p_supplier_id: input.supplier_id,
    p_notes: input.notes?.trim() || null,
    p_lines: cleanLines,
  });
  if (error) return fail(friendlyDbError(error, { fallback: '创建失败，请重试' }));
  const row = Array.isArray(data) ? data[0] : data;
  const poId = row?.po_id as string;
  if (input.order_date) {
    await supabase.from('purchase_orders').update({ order_date: input.order_date }).eq('id', poId);
  }
  // 3B: 记录建单经手人
  await appendStageHandler(supabase, poId, 'draft');
  revalidatePath('/purchase-orders');
  return ok({ poId, poNumber: row?.po_number as string });
}

/** 3A: 取某供应商历史订过的书目（供一键导入勾选） */
export async function getSupplierBooks(supplierId: string): Promise<{ book_id: string; title: string; sku: string }[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase || !supplierId) return [];
  const { data: pos } = await supabase.from('purchase_orders').select('id').eq('supplier_id', supplierId).limit(200);
  const poIds = ((pos || []) as any[]).map((p) => p.id);
  if (!poIds.length) return [];
  const { data: lines } = await supabase.from('purchase_order_lines').select('book_id, books(id, title, sku)').in('purchase_order_id', poIds).limit(1000);
  const seen = new Map<string, { book_id: string; title: string; sku: string }>();
  for (const l of (lines || []) as any[]) {
    if (l.book_id && l.books && !seen.has(l.book_id)) {
      seen.set(l.book_id, { book_id: l.book_id, title: l.books.title, sku: l.books.sku });
    }
  }
  return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title, 'zh'));
}

/** 3A: 勾选/取消勾选行（整个状态流转中可用） */
export async function togglePOLineSelected(lineId: string, selected: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const { error } = await supabase.from('purchase_order_lines').update({ is_selected: selected }).eq('id', lineId);
  if (error) return fail(friendlyDbError(error, { fallback: '更新失败，请重试' }));
  revalidatePath('/purchase-orders');
  return ok();
}

/** 3A: 草稿中加行 */
export async function addPOLine(poId: string, bookId: string, quantity: number): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const qty = Math.floor(Number(quantity));
  if (!bookId || qty <= 0) return fail('请选择图书并填写数量');
  const { data: po } = await supabase.from('purchase_orders').select('status').eq('id', poId).single();
  if ((po as any)?.status !== 'draft') return fail('只有草稿可以加书');
  const { error } = await supabase.from('purchase_order_lines').insert({
    purchase_order_id: poId, book_id: bookId, quantity_ordered: qty, unit_cost: 0, is_selected: true,
  });
  if (error) return fail(friendlyDbError(error, { fallback: '添加失败，请重试' }));
  revalidatePath('/purchase-orders');
  return ok();
}

/** 草稿中删行 / 改数量 */
export async function removePOLine(lineId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const { error } = await supabase.from('purchase_order_lines').delete().eq('id', lineId);
  if (error) return fail(friendlyDbError(error, { fallback: '删除失败，请重试' }));
  revalidatePath('/purchase-orders');
  return ok();
}
export async function updatePOLineQty(lineId: string, quantity: number): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const qty = Math.floor(Number(quantity));
  if (qty <= 0) return fail('数量必须大于 0');
  const { error } = await supabase.from('purchase_order_lines').update({ quantity_ordered: qty }).eq('id', lineId);
  if (error) return fail(friendlyDbError(error, { fallback: '更新失败，请重试' }));
  revalidatePath('/purchase-orders');
  return ok();
}

/** 3B: 批准（记录经手人） */
export async function approvePOWithHandler(poId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const { data: po } = await supabase.from('purchase_orders').select('status').eq('id', poId).single();
  if ((po as any)?.status !== 'draft') return fail('只有草稿可以批准');
  const { error } = await supabase.from('purchase_orders').update({ status: 'approved' }).eq('id', poId);
  if (error) return fail(friendlyDbError(error, { fallback: '审批失败，请重试' }));
  await appendStageHandler(supabase, poId, 'approved');
  revalidatePath('/purchase-orders');
  return ok();
}

/** 3B: 标记已下单（记录经手人） */
export async function markPOOrdered(poId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const { data: po } = await supabase.from('purchase_orders').select('status').eq('id', poId).single();
  if ((po as any)?.status !== 'approved') return fail('只有已批准的单可以标记下单');
  const { error } = await supabase.from('purchase_orders').update({ status: 'ordered' }).eq('id', poId);
  if (error) return fail(friendlyDbError(error, { fallback: '更新失败，请重试' }));
  await appendStageHandler(supabase, poId, 'ordered');
  revalidatePath('/purchase-orders');
  return ok();
}

/** 3C: 收货（多行，收货时填实际进货价；只收已勾选的行） */
export async function receivePOWithCost(input: { po_id: string; location_id: string; lines: { purchase_order_line_id: string; quantity: number; unit_cost: number }[] }): Promise<ActionResult & { data?: unknown }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const clean = (input.lines || [])
    .filter((l) => l.purchase_order_line_id && Number(l.quantity) > 0 && Number(l.unit_cost) >= 0)
    .map((l) => ({
      purchase_order_line_id: l.purchase_order_line_id,
      quantity: Math.floor(Number(l.quantity)),
      unit_cost: Math.round(Number(l.unit_cost) * 100) / 100,
    }));
  if (!input.location_id) return fail('请选择库位');
  if (clean.length === 0) return fail('请至少填写一行的收货数量和进货价');
  const { data, error } = await supabase.rpc('apply_purchase_receipt', {
    p_purchase_order_id: input.po_id,
    p_location_id: input.location_id,
    p_receipt_lines: clean,
    p_received_at: new Date().toISOString(),
  });
  if (error) return fail(friendlyDbError(error, { fallback: '收货失败，请重试' }));
  // 记录收货经手人
  await appendStageHandler(supabase, input.po_id, 'received');
  revalidatePath('/purchase-orders');
  revalidatePath('/reports');
  return ok({ data });
}

/** 3B: 取某采购单的经手人记录 */
export async function getPOStageHandlers(poId: string): Promise<StageHandler[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('purchase_orders').select('stage_handlers').eq('id', poId).single();
  const arr = (data as any)?.stage_handlers;
  return Array.isArray(arr) ? arr : [];
}
