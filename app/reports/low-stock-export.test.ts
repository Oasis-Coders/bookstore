import { describe, expect, it } from 'vitest';
import { LOW_STOCK_CSV_HEADERS, buildLowStockCsvRows } from './low-stock-export';

describe('LOW_STOCK_CSV_HEADERS', () => {
  it('includes a Publisher column after Title', () => {
    expect(LOW_STOCK_CSV_HEADERS).toEqual(['SKU', 'Title', 'Publisher', 'Threshold', 'On Hand', 'Shortage']);
  });
});

describe('buildLowStockCsvRows', () => {
  it('puts publisher in the third column', () => {
    const rows = buildLowStockCsvRows([
      { sku: 'T123', title: '青春期孩子的心，我懂！', publisher: '上海天梯书屋', low_stock_threshold: 2, quantity_on_hand: 0, reorder_shortage: 2 },
    ]);
    expect(rows).toEqual([['T123', '青春期孩子的心，我懂！', '上海天梯书屋', 2, 0, 2]]);
  });

  it('falls back to an empty string when publisher is missing', () => {
    const rows = buildLowStockCsvRows([
      { sku: 'BC239', title: '直到地极', publisher: null, low_stock_threshold: 1, quantity_on_hand: 1, reorder_shortage: 0 },
    ]);
    expect(rows[0][2]).toBe('');
  });

  it('returns an empty array for an empty list', () => {
    expect(buildLowStockCsvRows([])).toEqual([]);
  });
});
