import type { SupabaseClient } from '@supabase/supabase-js';

export type PurchaseOrderLineInput = {
  purchase_order_line_id: string;
  quantity: number;
};

export type SaleItemInput = {
  book_id: string;
  quantity: number;
  unit_price?: number;
};

// ── RPC wrappers — match SQL function signatures ──

export async function applyPurchaseReceipt(
  supabase: SupabaseClient,
  poId: string,
  locationId: string,
  lines: PurchaseOrderLineInput[],
  receivedAt?: string
) {
  const { data, error } = await supabase.rpc('apply_purchase_receipt', {
    p_purchase_order_id: poId,
    p_location_id: locationId,
    p_receipt_lines: lines as any,
    p_received_at: receivedAt || new Date().toISOString(),
  });
  if (error) throw error;
  return data as string; // transaction_group_id
}

export async function applySale(
  supabase: SupabaseClient,
  locationId: string,
  items: SaleItemInput[],
  opts?: { externalReference?: string; soldAt?: string; notes?: string }
) {
  const { data, error } = await supabase.rpc('apply_sale', {
    p_location_id: locationId,
    p_items: items as any,
    p_external_reference: opts?.externalReference || null,
    p_sold_at: opts?.soldAt || new Date().toISOString(),
    p_notes: opts?.notes || null,
  });
  if (error) throw error;
  return data as string; // sale_id
}

export async function applyStockTransfer(
  supabase: SupabaseClient,
  bookId: string,
  sourceLocationId: string,
  destLocationId: string,
  quantity: number,
  reason?: string
) {
  const { data, error } = await supabase.rpc('apply_stock_transfer', {
    p_book_id: bookId,
    p_source_location_id: sourceLocationId,
    p_destination_location_id: destLocationId,
    p_quantity: quantity,
    p_reason: reason || null,
    p_occurred_at: new Date().toISOString(),
  });
  if (error) throw error;
  return data as string;
}

export async function applyInventoryAdjustment(
  supabase: SupabaseClient,
  bookId: string,
  locationId: string,
  quantityDelta: number,
  reason: string,
  unitCost?: number
) {
  const { data, error } = await supabase.rpc('apply_inventory_adjustment', {
    p_book_id: bookId,
    p_location_id: locationId,
    p_quantity_delta: quantityDelta,
    p_reason: reason,
    p_unit_cost: unitCost ?? null,
    p_occurred_at: new Date().toISOString(),
  });
  if (error) throw error;
  return data as string;
}
