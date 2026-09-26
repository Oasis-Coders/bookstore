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

export async function approvePO(poId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');
  const { error } = await supabase.from('purchase_orders').update({ status: 'approved' }).eq('id', poId);
  if (error) return fail(friendlyDbError(error, { fallback: '审批失败，请重试' }));
  revalidatePath('/purchase-orders');
  return ok();
}

export async function receivePO(formData: FormData): Promise<ActionResult & { data?: unknown }> {
  // Wrapper for apply_purchase_receipt RPC - called from client via server action
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');

  const poId = String(formData.get('po_id'));
  const locationId = String(formData.get('location_id'));
  const linesJson = String(formData.get('lines_json') || '[]');
  let lines: unknown[];
  try {
    lines = JSON.parse(linesJson);
  } catch {
    return fail('收货数据格式错误，请重试');
  }

  const { data, error } = await supabase.rpc('apply_purchase_receipt', {
    p_purchase_order_id: poId,
    p_location_id: locationId,
    p_receipt_lines: lines,
    p_received_at: new Date().toISOString(),
  });

  if (error) return fail(friendlyDbError(error, { fallback: '收货失败，请重试' }));
  revalidatePath('/purchase-orders');
  revalidatePath('/reports');
  return ok({ data });
}
