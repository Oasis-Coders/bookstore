import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'no db' }, { status: 500 });
  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: 'no rows' }, { status: 400 });

  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let ok = 0, fail = 0;
  const errors: string[] = [];

  for (let i=0;i<rows.length;i++) {
    const r = rows[i];
    const sku = (r.sku || '').trim().toUpperCase();
    const title = (r.title || '').trim();
    if (!sku || !title) { fail++; errors.push(`Row ${i+1}: Code and title required`); continue; }

    try {
      // Check existing
      const { data: existing } = await supabase.from('books').select('id').eq('sku', sku).maybeSingle();
      
      const payload: any = {
        sku,
        title,
        title_en: r.title_en?.trim() || null,
        title_simplified: r.title_simplified?.trim() || r.title?.trim() || null,
        title_traditional: r.title_traditional?.trim() || null,
        author: r.author?.trim() || null,
        publisher: r.publisher?.trim() || null,
        category: r.category?.trim() || null,
        shelf_position: r.shelf_position?.trim() || null,
        current_price: r.current_price ? Number(r.current_price) : null,
        low_stock_threshold: r.low_stock_threshold ? Number(r.low_stock_threshold) : 5,
        is_active: true,
      };

      let bookId: string;
      if (existing) {
        const { error } = await supabase.from('books').update(payload).eq('id', existing.id);
        if (error) throw error;
        bookId = existing.id;
      } else {
        const { data, error } = await supabase.from('books').insert(payload).select('id').single();
        if (error) throw error;
        bookId = data.id;
      }

      // Initial stock if provided
      const initStock = Number(r.initial_stock || 0);
      if (initStock > 0) {
        // Need a location - get first store location or create batch without location? Use first location
        const { data: loc } = await supabase.from('locations').select('id').limit(1).maybeSingle();
        if (loc) {
          await supabase.from('inventory_batches').insert({
            book_id: bookId,
            location_id: loc.id,
            batch_code: `INIT-${sku}-${Date.now()}-${i}`,
            source_type: 'adjustment',
            unit_cost: payload.current_price ? Number(payload.current_price) * 0.6 : 5,
            quantity_received: initStock,
            quantity_remaining: initStock,
            created_by: user.user.id,
          });
        }
      }

      ok++;
    } catch (e: any) {
      fail++;
      errors.push(`Row ${i+1} (${r.sku}): ${e?.message || 'failed'}`);
      if (errors.length > 20) break;
    }
  }

  return NextResponse.json({ ok, fail, errors });
}
