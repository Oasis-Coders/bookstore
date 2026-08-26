import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'no supabase client' }, { status: 500 });
  
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }
  const { month_start, opening_stock, closing_stock, notes } = body;
  if (!month_start) return NextResponse.json({ error: 'month_start required (YYYY-MM-01)' }, { status: 400 });

  const { data: user } = await supabase.auth.getUser();
  
  // Try upsert
  const payload: any = {
    month_start,
    opening_stock: Number(opening_stock || 0),
    closing_stock: closing_stock != null ? Number(closing_stock) : null,
    notes: notes || null,
  };
  if (user?.user?.id) payload.created_by = user.user.id;

  const { data, error } = await supabase.from('monthly_stock_snapshots').upsert(payload, { onConflict: 'month_start' }).select().single();

  if (error) {
    // Return detailed error for debugging
    return NextResponse.json({ error: error.message, code: error.code, hint: (error as any).hint, details: (error as any).details }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}
