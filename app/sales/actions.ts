'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type SaleResult = { success: true; saleId: string } | { success: false; error: string };

export async function createSale(formData: FormData): Promise<SaleResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: '系统未配置' };

  let locationId = String(formData.get('location_id') || '').trim();
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
  const discountPercent = Number(formData.get('discount_percent') || 0);
  const paymentMethod = String(formData.get('payment_method') || 'cash');
  const paymentStatus = String(formData.get('payment_status') || 'paid');
  const customerName = String(formData.get('customer_name') || '').trim() || null;
  const externalRef = String(formData.get('external_ref') || '');
  const notes = String(formData.get('notes') || '').trim() || null;
  const shippingCost = Number(formData.get('shipping_cost') || 0);

  // Deterministic default location: active, ordered by code asc, prefer STORE-LON
  if (!locationId) {
    try {
      const { data: loc } = await supabase.from('locations').select('id').eq('is_active', true).order('code', { ascending: true }).limit(1).single();
      if (loc?.id) locationId = loc.id;
    } catch {}
    if (!locationId) {
      try {
        const { data: loc2 } = await supabase.from('locations').select('id').order('code', { ascending: true }).limit(1).single();
        if (loc2?.id) locationId = loc2.id;
      } catch {}
    }
  }

  if (!locationId) return { success: false, error: '系统未配置库位，请先在设置中添加' };

  // Only store global discount amount; per-line discount percent stays 0 to avoid double-discount
  // Items keep their edited unit_price for clearance/gift sales
  const enrichedItems = items.map((it: any) => ({
    book_id: it.book_id,
    quantity: it.quantity,
    unit_price: it.unit_price,
    discount_percent: 0,
    discount_amount: 0,
  }));

  try {
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
      const msg = error.message || '';
      if (msg.includes('库存不足')) return { success: false, error: msg };
      if (msg.includes('不存在') || msg.includes('停用')) return { success: false, error: msg };
      if (msg.includes('权限') || msg.includes('role')) return { success: false, error: '没有执行销售的权限，请联系管理员' };
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

// Void is disabled - unsafe implementation removed per feedback.
// To re-enable, create a secure atomic DB function with role checks and audit.
// This placeholder prevents accidental use from UI.
export async function voidSale(saleId: string) {
  throw new Error('作废功能暂不可用，请联系管理员 / Void is disabled, contact admin');
}
