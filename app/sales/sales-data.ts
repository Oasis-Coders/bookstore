import type { createSupabaseServerClient } from '@/lib/supabase/server';
import { listAllActiveBooks } from '../../lib/books/queries';

export type SupabaseLike = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

export async function fetchSalesUserPermissions(supabase: SupabaseLike) {
  let isAdmin = false;
  let canEdit = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
      const names = (roles || []).map((r: any) => r.roles?.name);
      isAdmin = names.includes('admin') || names.includes('super_admin');
      // 2026-10-07: 改单放开给 staff（退换货），DB 层 RPC 同步放宽
      canEdit = isAdmin || names.includes('staff');
    }
  } catch {}
  return { isAdmin, canEdit };
}

/**
 * Resolves the deterministic sale location in a single `locations` query (instead of up to 3 serial queries)
 * and aggregates location-specific stock batches into `stockMap`.
 */
export async function fetchSaleLocationAndStock(supabase: SupabaseLike) {
  let saleLocationId: string | null = null;
  const stockMap: Record<string, number> = {};

  try {
    const { data: locs } = await supabase
      .from('locations')
      .select('id, code, location_type')
      .eq('is_active', true)
      .order('code', { ascending: true })
      .limit(20);

    const list = (locs || []) as { id: string; code?: string; location_type?: string }[];
    const storeLon = list.find((l) => l.code === 'STORE-LON');
    const storeType = list.find((l) => l.location_type === 'store');
    const anyLoc = list[0];
    saleLocationId = storeLon?.id || storeType?.id || anyLoc?.id || null;
  } catch {}

  try {
    if (saleLocationId) {
      const { data: batches } = await supabase
        .from('inventory_batches')
        .select('book_id, quantity_remaining')
        .eq('location_id', saleLocationId)
        .gt('quantity_remaining', 0)
        .limit(1000);
      if (batches) {
        for (const b of batches as any[]) {
          stockMap[b.book_id] = (stockMap[b.book_id] || 0) + Number(b.quantity_remaining || 0);
        }
      }
    } else {
      const { data: val } = await supabase
        .from('inventory_valuation_view')
        .select('book_id, quantity_on_hand')
        .limit(500);
      if (val) {
        for (const r of val as any[]) {
          const bid = r.book_id;
          const qty = Number(r.quantity_on_hand || 0);
          stockMap[bid] = (stockMap[bid] || 0) + qty;
        }
      }
    }
  } catch {
    try {
      const { data: batches } = await supabase
        .from('inventory_batches')
        .select('book_id, quantity_remaining')
        .gt('quantity_remaining', 0)
        .limit(500);
      if (batches) {
        for (const b of batches as any[]) {
          stockMap[b.book_id] = (stockMap[b.book_id] || 0) + Number(b.quantity_remaining || 0);
        }
      }
    } catch {}
  }

  return { saleLocationId, stockMap };
}

export async function fetchRecentSalesAndEdits(
  supabase: SupabaseLike,
  options: { q?: string; onlyEdited?: boolean }
) {
  const q = (options.q || '').trim();
  const onlyEdited = Boolean(options.onlyEdited);
  let recentSales: any[] = [];
  let editedSaleIds: string[] = [];

  try {
    let sQuery = supabase
      .from('sales_transactions')
      .select(
        'id, sale_number, subtotal, discount_amount, shipping_cost, payment_method, payment_mix, payment_status, customer_name, sold_at, sale_date'
      )
      .order('sale_number', { ascending: false });

    if (onlyEdited) {
      const { data: editedRows } = await supabase
        .from('sale_edits')
        .select('sale_id')
        .order('edited_at', { ascending: false })
        .limit(200);
      const eIds = [...new Set((editedRows || []).map((r: any) => r.sale_id))].slice(0, 50);
      if (eIds.length === 0) {
        recentSales = [];
      } else {
        sQuery = sQuery.in('id', eIds);
        const sRes = await sQuery.limit(50);
        recentSales = sRes.data || [];
      }
      editedSaleIds = eIds;
    } else {
      if (q) {
        sQuery = sQuery.or(`sale_number.ilike.%${q}%,customer_name.ilike.%${q}%`);
      }
      const sRes = await sQuery.limit(q ? 50 : 20);
      recentSales = sRes.data || [];
    }

    recentSales = (recentSales as any[]).map((s: any) => ({
      id: s.id,
      sale_number: s.sale_number || `C${s.id.slice(0, 6)}`,
      subtotal: s.subtotal,
      discount_amount: s.discount_amount,
      shipping_cost: s.shipping_cost,
      net_total: Number(s.subtotal || 0) - Number(s.discount_amount || 0) + Number(s.shipping_cost || 0),
      payment_method: s.payment_method,
      payment_mix: s.payment_mix,
      payment_status: s.payment_status,
      customer_name: s.customer_name,
      sold_at: s.sale_date || new Date(s.sold_at).toLocaleString('en-GB'),
    }));
  } catch (e) {
    console.error('sales fetch error', e);
  }

  // Only query sale_edits if not already resolved by onlyEdited=true
  if (!onlyEdited) {
    try {
      const ids = recentSales.map((s: any) => s.id);
      if (ids.length > 0) {
        const { data: edits } = await supabase.from('sale_edits').select('sale_id').in('sale_id', ids);
        editedSaleIds = [...new Set((edits || []).map((e: any) => e.sale_id))];
      }
    } catch {}
  }

  return { recentSales, editedSaleIds };
}

export async function fetchAssignedSpareBarcodeMap(supabase: SupabaseLike): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const { data } = await supabase
      .from('spare_barcodes')
      .select('code, assigned_book_id')
      .eq('status', 'assigned')
      .not('assigned_book_id', 'is', null)
      .limit(100000);
    for (const r of (data || []) as any[]) {
      if (r.code && r.assigned_book_id) map[String(r.code).trim()] = r.assigned_book_id;
    }
  } catch {}
  return map;
}

/**
 * Executes all /sales page data pipelines concurrently via Promise.all instead of an 8-11 step sequential waterfall.
 */
export async function fetchSalesPageData(
  supabase: SupabaseLike,
  options: { q?: string; onlyEdited?: boolean } = {}
) {
  const [perms, locStock, books, salesAndEdits, spareMap] = await Promise.all([
    fetchSalesUserPermissions(supabase),
    fetchSaleLocationAndStock(supabase),
    listAllActiveBooks(supabase as any, 'id, title, sku, current_price, shelf_position, title_en').catch((e) => {
      console.error('books fetch error', e);
      return [] as any[];
    }),
    fetchRecentSalesAndEdits(supabase, options),
    fetchAssignedSpareBarcodeMap(supabase),
  ]);

  return {
    books,
    recentSales: salesAndEdits.recentSales,
    editedSaleIds: salesAndEdits.editedSaleIds,
    stockMap: locStock.stockMap,
    saleLocationId: locStock.saleLocationId,
    isAdmin: perms.isAdmin,
    canEdit: perms.canEdit,
    spareMap,
  };
}
