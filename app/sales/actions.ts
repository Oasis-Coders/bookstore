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
  const discountPercent = Number(formData.get('discount_percent') || 0);
  const paymentMethod = String(formData.get('payment_method') || 'cash');
  const paymentStatus = String(formData.get('payment_status') || 'paid');
  const customerName = String(formData.get('customer_name') || '').trim() || null;
  const externalRef = String(formData.get('external_ref') || '');
  const notes = String(formData.get('notes') || '').trim() || null;
  const shippingCost = Number(formData.get('shipping_cost') || 0);

  if (!locationId) return { success: false, error: '请选择出库库位' };

  const enrichedItems = items.map((it: any) => ({
    book_id: it.book_id,
    quantity: it.quantity,
    unit_price: it.unit_price,
    discount_percent: it.discount_percent || discountPercent || 0,
    discount_amount: it.discount_amount || 0,
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

export async function voidSale(saleId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  
  try {
    const { data: lines } = await supabase.from('sales_transaction_lines').select('id, book_id, quantity').eq('sale_id', saleId);
    if (lines && lines.length > 0) {
      for (const line of lines as any[]) {
        const { data: allocs } = await supabase.from('sales_batch_allocations').select('batch_id, quantity, unit_cost').eq('sale_line_id', line.id);
        if (allocs) {
          for (const a of allocs as any[]) {
            const { data: batch } = await supabase.from('inventory_batches').select('quantity_remaining, quantity_received').eq('id', a.batch_id).single();
            if (batch) {
              const newRemaining = Math.min(Number((batch as any).quantity_received), Number((batch as any).quantity_remaining) + Number(a.quantity));
              await supabase.from('inventory_batches').update({ quantity_remaining: newRemaining }).eq('id', a.batch_id);
            }
            try {
              const { data: sale } = await supabase.from('sales_transactions').select('location_id, created_by').eq('id', saleId).single();
              if (sale) {
                await supabase.from('inventory_transactions').insert({
                  transaction_type: 'return_in',
                  book_id: line.book_id,
                  quantity: a.quantity,
                  destination_location_id: (sale as any).location_id,
                  source_batch_id: a.batch_id,
                  unit_cost: a.unit_cost,
                  reference_type: 'sale_void',
                  reference_id: saleId,
                  actor_profile_id: (sale as any).created_by,
                  reason: `Void sale ${saleId}`,
                } as any);
              }
            } catch {}
          }
        }
      }
    }
  } catch (e) {
    console.error('void restore error', e);
  }

  const { error } = await supabase.from('sales_transactions').update({ status: 'voided' }).eq('id', saleId);
  if (error) throw error;
  revalidatePath('/sales');
  revalidatePath('/reports');
  revalidatePath('/books');
}
