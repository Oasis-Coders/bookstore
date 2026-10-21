// Pure helpers for the publisher inventory movement report (工单 #13).
// Kept free of React/DB so the aggregation logic is unit-testable.

export interface PublisherReportBook {
  id: string;
  sku: string;
  title: string;
  publisher: string | null;
}

export interface PublisherReportValuation {
  quantity_on_hand: number;
  current_price: number;
  weighted_average_cost: number;
  shelf_position: string | null;
}

export interface PublisherReportRow {
  book_id: string;
  sku: string;
  title: string;
  opening: number;
  purchased: number;
  current: number;
  weighted_average_cost: number;
  retail_price: number;
  shelf_position: string | null;
}

const num = (v: unknown) => Number(v || 0);

/** Merge book list + valuation snapshot + opening/purchased quantity maps into report rows. */
export function buildPublisherReportRows(
  books: PublisherReportBook[],
  valuationById: Record<string, PublisherReportValuation>,
  openingById: Record<string, number>,
  purchasedById: Record<string, number>
): PublisherReportRow[] {
  const rows = books.map((b) => {
    const v = valuationById[b.id];
    return {
      book_id: b.id,
      sku: b.sku,
      title: b.title,
      opening: num(openingById[b.id]),
      purchased: num(purchasedById[b.id]),
      current: num(v?.quantity_on_hand),
      weighted_average_cost: num(v?.weighted_average_cost),
      retail_price: num(v?.current_price),
      shelf_position: v?.shelf_position ?? null,
    };
  });
  rows.sort((a, b) => String(a.sku).localeCompare(String(b.sku), 'zh'));
  return rows;
}

/** Distinct non-empty publisher names, sorted. */
export function distinctPublishers(books: PublisherReportBook[]): string[] {
  const set = new Set<string>();
  for (const b of books) {
    const p = (b.publisher || '').trim();
    if (p) set.add(p);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh'));
}
