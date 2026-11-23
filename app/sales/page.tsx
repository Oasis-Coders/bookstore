import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SalesClient } from './sales-client';
import { fetchSalesPageData } from './sales-data';

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ q?: string; edited?: string }> }) {
  const { q: qRaw, edited: editedRaw } = await searchParams;
  const q = (qRaw || '').trim();
  const onlyEdited = editedRaw === '1';
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <SalesClient
        books={[]}
        recentSales={[]}
        stockMap={{}}
        isAdmin={false}
        canEdit={false}
        editedSaleIds={[]}
        onlyEdited={onlyEdited}
        salesQuery={q}
        spareMap={{}}
      />
    );
  }

  const { books, recentSales, stockMap, isAdmin, canEdit, editedSaleIds, spareMap } = await fetchSalesPageData(
    supabase,
    { q, onlyEdited }
  );

  return (
    <SalesClient
      books={books}
      recentSales={recentSales}
      stockMap={stockMap}
      isAdmin={isAdmin}
      canEdit={canEdit}
      editedSaleIds={editedSaleIds}
      onlyEdited={onlyEdited}
      salesQuery={q}
      spareMap={spareMap}
    />
  );
}
