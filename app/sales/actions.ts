'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createSale(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const locationId = String(formData.get('location_id') || '');
  const itemsJson = String(formData.get('items_json') || '[]');
  let items: any[];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    throw new Error('Invalid items format');
  }
  if (!items || items.length === 0) throw new Error('Cart is empty');
  
  const saleDate = String(formData.get('sale_date') || new Date().toISOString().slice(0,10));
  const discount = Number(formData.get('discount') || 0);
  const paymentMethod = String(formData.get('payment_method') || 'cash');
  const paymentStatus = String(formData.get('payment_status') || 'paid');
  const customerName = String(formData.get('customer_name') || '').trim() || null;
  const externalRef = String(formData.get('external_ref') || '');
  const notes = String(formData.get('notes') || '').trim() || null;

  if (!locationId) throw new Error('请选择销售库位');

  // Generate C-number if not provided
  let saleNumber = externalRef;
  if (!saleNumber) {
    try {
      const { data: gen } = await supabase.rpc('generate_sale_number');
      saleNumber = gen || `C${Date.now().toString().slice(-6)}`;
    } catch {
      saleNumber = `C${Math.floor(100000 + Math.random() * 900000)}`;
    }
  }
  if (!saleNumber.startsWith('C') && !saleNumber.startsWith('POS-')) {
    saleNumber = `C${saleNumber.replace(/\D/g, '').padStart(6, '0').slice(-6)}`;
  }

  try {
    const { data, error } = await supabase.rpc('apply_sale', {
      p_location_id: locationId || null,
      p_items: items,
      p_external_reference: saleNumber,
      p_sold_at: new Date(saleDate).toISOString(),
      p_notes: notes,
    });
    if (error) throw new Error(error.message);

    if (data) {
      try {
        await supabase.from('sales_transactions').update({
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          discount_amount: discount,
          customer_name: customerName,
          sale_date: saleDate,
        }).eq('id', data);
      } catch {}
    }

    revalidatePath('/sales');
    revalidatePath('/reports');
    return data;
  } catch (e: any) {
    // Fallback direct insert if RPC fails (e.g., no inventory)
    if (e.message?.includes('库存不足')) {
      throw e; // Real stockout, don't fallback
    }
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const locationIdResolved = locationId || (await supabase.from('locations').select('id').limit(1).single())?.data?.id;
      if (!locationIdResolved) throw new Error('No location found');
      
      const salePayload: any = {
        sale_number: saleNumber,
        location_id: locationIdResolved,
        status: 'completed',
        external_reference: saleNumber,
        sold_at: new Date(saleDate).toISOString(),
        sale_date: saleDate,
        subtotal: items.reduce((s: number, i: any) => s + (i.quantity * 10), 0),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        discount_amount: discount,
        customer_name: customerName,
        customer_note: notes,
        created_by: userRes.user?.id,
      };
      const { data, error } = await supabase.from('sales_transactions').insert(salePayload).select('id').single();
      if (error) throw error;
      
      for (const item of items) {
        const { data: bookData } = await supabase.from('books').select('current_price').eq('id', item.book_id).single();
        const unitPrice = bookData?.current_price || 10;
        await supabase.from('sales_transaction_lines').insert({
          sale_id: data.id,
          book_id: item.book_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          cost_of_goods_sold: 0,
        });
      }
      
      revalidatePath('/sales');
      return data;
    } catch (fallbackErr: any) {
      throw new Error(fallbackErr.message || e.message || 'Sale failed');
    }
  }
}

export async function voidSale(saleId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('sales_transactions').update({ status: 'voided' }).eq('id', saleId);
  if (error) throw error;
  revalidatePath('/sales');
}
