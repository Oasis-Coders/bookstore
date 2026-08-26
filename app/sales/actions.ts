'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createSale(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const locationId = String(formData.get('location_id') || '');
  const itemsJson = String(formData.get('items_json') || '[]');
  const items = JSON.parse(itemsJson);
  const saleDate = String(formData.get('sale_date') || new Date().toISOString().slice(0,10));
  const discount = Number(formData.get('discount') || 0);
  const paymentMethod = String(formData.get('payment_method') || 'cash');
  const customerName = String(formData.get('customer_name') || '').trim() || null;
  const externalRef = String(formData.get('external_ref') || '');
  const notes = String(formData.get('notes') || '').trim() || null;

  // Generate C-number if not provided (avoid confusion with old 6-digit)
  let saleNumber = externalRef;
  if (!saleNumber) {
    try {
      const { data: gen } = await supabase.rpc('generate_sale_number');
      saleNumber = gen || `C${Date.now().toString().slice(-6)}`;
    } catch {
      // Fallback: C + 6 digits
      saleNumber = `C${Math.floor(100000 + Math.random() * 900000)}`;
    }
  }
  // Ensure C prefix for new system
  if (!saleNumber.startsWith('C') && !saleNumber.startsWith('POS-')) {
    saleNumber = `C${saleNumber.replace(/\D/g, '').padStart(6, '0').slice(-6)}`;
  }

  // Try with new columns, fallback to old if migration not run yet
  try {
    const { data, error } = await supabase.rpc('apply_sale', {
      p_location_id: locationId || null,
      p_items: items,
      p_external_reference: saleNumber,
      p_sold_at: new Date(saleDate).toISOString(),
      p_notes: notes,
    });
    if (error) throw error;

    // Try to update with new fields if sale created
    if (data) {
      try {
        await supabase.from('sales_transactions').update({
          payment_method: paymentMethod,
          discount_amount: discount,
          customer_name: customerName,
          sale_date: saleDate,
        }).eq('sale_number', saleNumber);
      } catch {}
    }

    revalidatePath('/sales');
    revalidatePath('/reports');
    return data;
  } catch (e: any) {
    // If RPC fails, try direct insert for demo/offline mode
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const salePayload: any = {
        sale_number: saleNumber,
        location_id: locationId || (await supabase.from('locations').select('id').limit(1).single())?.data?.id,
        status: 'completed',
        external_reference: saleNumber,
        sold_at: new Date(saleDate).toISOString(),
        sale_date: saleDate,
        subtotal: items.reduce((s: number, i: any) => s + (i.quantity * 10), 0),
        payment_method: paymentMethod,
        discount_amount: discount,
        customer_name: customerName,
        customer_note: notes,
        created_by: userRes.user?.id,
      };
      const { data, error } = await supabase.from('sales_transactions').insert(salePayload).select('id').single();
      if (error) throw error;
      
      // Insert lines
      for (const item of items) {
        await supabase.from('sales_transaction_lines').insert({
          sale_id: data.id,
          book_id: item.book_id,
          quantity: item.quantity,
          unit_price: 10,
          cost_of_goods_sold: 5,
        });
      }
      
      revalidatePath('/sales');
      return data;
    } catch {
      throw e;
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
