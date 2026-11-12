// Pure helpers for the low-stock warning list on the reports page (工单 #14).
// Kept free of React/DB so the export mapping is unit-testable.
// The data comes from low_stock_view, which already carries publisher per book.

export interface LowStockRow {
  sku?: string | null;
  title?: string | null;
  publisher?: string | null;
  low_stock_threshold?: number | null;
  quantity_on_hand?: number | null;
  reorder_shortage?: number | null;
}

export const LOW_STOCK_CSV_HEADERS = ['SKU', 'Title', 'Publisher', 'Threshold', 'On Hand', 'Shortage'];

export function buildLowStockCsvRows(lowStock: LowStockRow[]): (string | number)[][] {
  return lowStock.map((r) => [
    r.sku ?? '',
    r.title ?? '',
    r.publisher || '',
    r.low_stock_threshold ?? '',
    r.quantity_on_hand ?? '',
    r.reorder_shortage ?? '',
  ]);
}
