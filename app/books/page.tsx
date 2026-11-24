import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchAllPages } from '@/lib/supabase/fetch-all';
import { BooksClient } from './books-client';

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  const { q: qRaw, show: showRaw } = await searchParams;
  const q = qRaw || '';
  // 1D: 停用图书不再从书库消失；默认全部可见，可按状态筛选；lowstock 为低库存预警
  const show = showRaw === 'active' || showRaw === 'inactive' || showRaw === 'lowstock' ? showRaw : 'all';
  const supabase = await createSupabaseServerClient();

  let books: any[] = [];
  let totalCount: number | null = null;
  let mode: 'live' | 'empty' = 'empty';

  if (supabase) {
    // 备用条码：q 若含数字，先在 spare_barcodes 里找已分配的图书 id
    let spareBookIds: string[] = [];
    const digits = q.replace(/\D/g, '');
    if (digits.length >= 4) {
      try {
        const { data: spares } = await supabase
          .from('spare_barcodes')
          .select('assigned_book_id')
          .eq('status', 'assigned')
          .ilike('code', `%${digits}%`)
          .not('assigned_book_id', 'is', null)
          .limit(20);
        spareBookIds = [...new Set(((spares || []) as any[]).map((r) => r.assigned_book_id).filter(Boolean))];
      } catch {}
    }
    const spareOr = spareBookIds.length ? `,id.in.(${spareBookIds.join(',')})` : '';
    if (show === 'lowstock') {
      // 低库存预警：口径与 low_stock_view 一致（在售、阈值>0、库存<=阈值）；按库存升序，最缺货的排前面，不截断
      try {
        // 低库存已超 1000 条：视图 id 必须分页拉全（工单 #20 复查），
        // 图书再按 id 分批取，避免单次查询被 PostgREST 1000 行上限截断。
        const lowRows = await fetchAllPages<any>(async (from, to) => {
          const res = await supabase
            .from('low_stock_view')
            .select('book_id')
            .order('book_id', { ascending: true })
            .range(from, to);
          return { data: res.data as any[] | null, error: res.error };
        });
        const lowIds = [...new Set(((lowRows || []) as any[]).map((r) => r.book_id).filter(Boolean))];
        totalCount = lowIds.length;
        if (lowIds.length) {
          const fetched: any[] = [];
          for (let i = 0; i < lowIds.length; i += 200) {
            let query = supabase.from('books').select('*, inventory_batches(quantity_remaining)').in('id', lowIds.slice(i, i + 200));
            if (q) {
              query = query.or(`title.ilike.%${q}%,title_en.ilike.%${q}%,title_simplified.ilike.%${q}%,title_traditional.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%,shelf_position.ilike.%${q}%,warehouse_location.ilike.%${q}%${spareOr}`);
            }
            const { data } = await query;
            if (data) fetched.push(...(data as any[]));
          }
          books = fetched.map((b: any) => ({
            ...b,
            on_hand: Array.isArray(b.inventory_batches) ? b.inventory_batches.reduce((s: number, batch: any) => s + (batch.quantity_remaining || 0), 0) : 0,
          })).sort((a: any, b: any) => a.on_hand - b.on_hand);
          if (q) totalCount = books.length;
        }
        mode = 'live';
      } catch {}
    } else {
    // 列表只展示前 80 种（性能），但顶部总数必须用 count 查询取真实总数：
    // 直接拿 books.length 当总数会恒显示「80 种图书」（工单 #20 复查）。
    try {
      let countQuery = supabase.from('books').select('id', { count: 'exact', head: true });
      if (show === 'active') countQuery = countQuery.eq('is_active', true);
      if (show === 'inactive') countQuery = countQuery.eq('is_active', false);
      if (q) {
        countQuery = countQuery.or(`title.ilike.%${q}%,title_en.ilike.%${q}%,title_simplified.ilike.%${q}%,title_traditional.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%,shelf_position.ilike.%${q}%,warehouse_location.ilike.%${q}%${spareOr}`);
      }
      const { count } = await countQuery;
      if (typeof count === 'number') totalCount = count;
    } catch {}
    try {
      let query = supabase.from('books').select('*, inventory_batches(quantity_remaining)').order('title');
      if (show === 'active') query = query.eq('is_active', true);
      if (show === 'inactive') query = query.eq('is_active', false);
      if (q) {
        query = query.or(`title.ilike.%${q}%,title_en.ilike.%${q}%,title_simplified.ilike.%${q}%,title_traditional.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%,shelf_position.ilike.%${q}%,warehouse_location.ilike.%${q}%${spareOr}`);
      }
      const { data } = await query.limit(80);
      if (data) {
        books = data.map((b: any) => ({
          ...b,
          on_hand: Array.isArray(b.inventory_batches) ? b.inventory_batches.reduce((s: number, batch: any) => s + (batch.quantity_remaining || 0), 0) : 0,
        }));
        mode = 'live';
      }
    } catch (e) {
      try {
        let query2 = supabase.from('books').select('*').order('title');
        if (show === 'active') query2 = query2.eq('is_active', true);
        if (show === 'inactive') query2 = query2.eq('is_active', false);
        if (q) {
          query2 = query2.or(`title.ilike.%${q}%,publisher.ilike.%${q}%,sku.ilike.%${q}%,author.ilike.%${q}%${spareOr}`);
        }
        const { data } = await query2.limit(80);
        if (data) {
          books = data.map((b: any) => ({
            ...b,
            on_hand: 0,
            title_en: b.title_en || b.metadata?.title_en || null,
            title_simplified: b.title_simplified || b.metadata?.title_simplified || null,
            title_traditional: b.title_traditional || b.metadata?.title_traditional || null,
            shelf_position: b.shelf_position || b.metadata?.shelf_position || null,
          }));
          mode = 'live';
        }
      } catch {}
    }
    }
  }

  return <BooksClient books={books} q={q} mode={mode} show={show} totalCount={totalCount} />;
}
