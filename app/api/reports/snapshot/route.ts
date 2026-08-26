import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const { month_start, opening_stock, closing_stock, notes } = await req.json();
  if (!month_start) return NextResponse.json({ error: 'month_start required' }, { status: 400 });

  // upsert
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('monthly_stock_snapshots').upsert({
    month_start,
    opening_stock: Number(opening_stock||0),
    closing_stock: closing_stock != null ? Number(closing_stock) : null,
    notes: notes || null,
    created_by: user?.user?.id,
  }, { onConflict: 'month_start' }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
