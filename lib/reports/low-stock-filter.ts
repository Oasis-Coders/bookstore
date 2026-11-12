// Helpers for the low-stock publisher filter on /reports.
// Pure functions (no React) so they can be unit-tested directly.

export type LowStockRow = {
  publisher?: string | null;
  [key: string]: unknown;
};

/** Key used for rows whose book has no publisher recorded. */
export const NO_PUBLISHER_KEY = '__no_publisher__';

export function publisherKeyOf(row: LowStockRow): string {
  const p = typeof row.publisher === 'string' ? row.publisher.trim() : '';
  return p === '' ? NO_PUBLISHER_KEY : p;
}

export type PublisherOption = { key: string; label: string; count: number };

/**
 * Distinct publishers present in the low-stock list, most books first.
 * Rows without a publisher collapse into a single "no publisher" option.
 */
export function lowStockPublishers(rows: LowStockRow[]): PublisherOption[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = publisherKeyOf(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => {
      // Books with no publisher recorded always sort last.
      if (a.key === NO_PUBLISHER_KEY) return 1;
      if (b.key === NO_PUBLISHER_KEY) return -1;
      return b.count - a.count || a.label.localeCompare(b.label, 'zh-CN');
    });
}

/** Keep only rows whose publisher is in the selected set. Empty selection = show none. */
export function filterLowStockByPublishers<T extends LowStockRow>(
  rows: T[],
  selected: ReadonlySet<string>,
): T[] {
  if (selected.size === 0) return [];
  return rows.filter((r) => selected.has(publisherKeyOf(r)));
}
