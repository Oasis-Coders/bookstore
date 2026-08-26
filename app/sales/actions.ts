'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type SaleResult = { success: true; saleId: string } | { success: false; error: string };

export async function createSale(formData: FormData): Promise<SaleResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: '系统未配置' };

  const locationId = String(formData.get('location_id') || '');
  const itemsJson = String(formData.get('items_json') || '[]');
  let items: any[];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { success: false, error: '商品格式错误' };
  }
  if (!items || items.length === 0) return { success: false, error: '购物车为空' };
  
  const saleDate = String(formData.get('sale_date') || new Date().toISOString().slice(0,10));
  const discount = Number(formData.get('discount') || 0);
  const paymentMethod = String(formData.get('payment_method') || 'cash');
  const paymentStatus = String(formData.get('payment_status') || 'paid');
  const customerName = String(formData.get('customer_name') || '').trim() || null;
  const externalRef = String(formData.get('external_ref') || '');
  const notes = String(formData.get('notes') || '').trim() || null;
  const shippingCost = Number(formData.get('shipping_cost') || 0);

  if (!locationId) return { success: false, error: '请选择销售库位' };

  // Ensure items have real unit_price snapshots (not arbitrary 10)
  // Frontend should send unit_price, but we validate here
  const enrichedItems = items.map((it: any) => ({
    book_id: it.book_id,
    quantity: it.quantity,
    unit_price: it.unit_price, // must be real price from frontend, RPC will fallback to current_price if missing
    discount_percent: it.discount_percent || 0,
    discount_amount: it.discount_amount || 0,
  }));

  try {
    // Call atomic RPC that handles everything: stock deduction, sale header, lines, costs, payments
    const { data, error } = await supabase.rpc('apply_sale', {
      p_location_id: locationId,
      p_items: enrichedItems,
      p_external_reference: externalRef || null,
      p_sold_at: new Date(saleDate).toISOString(),
      p_notes: notes,
      p_payment_method: paymentMethod,
      p_payment_status: paymentStatus,
      p_discount_amount: discount,
      p_customer_name: customerName,
      p_sale_date: saleDate,
      p_shipping_cost: shippingCost,
      p_customer_note: notes,
    } as any);

    if (error) {
      // Return friendly error, not raw DB error
      const msg = error.message || '';
      if (msg.includes('库存不足')) {
        return { success: false, error: msg };
      }
      if (msg.includes('不存在') || msg.includes('停用')) {
        return { success: false, error: msg };
      }
      if (msg.includes('权限') || msg.includes('role')) {
        return { success: false, error: '没有执行销售的权限，请联系管理员' };
      }
      return { success: false, error: msg || '销售失败，请重试' };
    }

    revalidatePath('/sales');
    revalidatePath('/reports');
    revalidatePath('/books');
    return { success: true, saleId: data as string };
  } catch (e: any) {
    return { success: false, error: e.message || '销售失败，请重试' };
  }
}

export async function voidSale(saleId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('sales_transactions').update({ status: 'voided' }).eq('id', saleId);
  if (error) throw error;
  revalidatePath('/sales');
}
