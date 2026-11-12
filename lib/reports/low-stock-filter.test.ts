import { describe, expect, it } from 'vitest';
import {
  NO_PUBLISHER_KEY,
  filterLowStockByPublishers,
  lowStockPublishers,
  publisherKeyOf,
} from './low-stock-filter';

const rows = [
  { sku: 'A1', title: 'Book A', publisher: '活水出版社' },
  { sku: 'A2', title: 'Book B', publisher: '活水出版社' },
  { sku: 'B1', title: 'Book C', publisher: '基道' },
  { sku: 'C1', title: 'Book D', publisher: null },
  { sku: 'C2', title: 'Book E', publisher: '  ' },
];

describe('publisherKeyOf', () => {
  it('returns the trimmed publisher', () => {
    expect(publisherKeyOf(rows[0])).toBe('活水出版社');
  });

  it('maps null / blank publisher to the no-publisher key', () => {
    expect(publisherKeyOf(rows[3])).toBe(NO_PUBLISHER_KEY);
    expect(publisherKeyOf(rows[4])).toBe(NO_PUBLISHER_KEY);
  });
});

describe('lowStockPublishers', () => {
  it('groups by publisher with counts, most books first, no-publisher last', () => {
    expect(lowStockPublishers(rows)).toEqual([
      { key: '活水出版社', label: '活水出版社', count: 2 },
      { key: '基道', label: '基道', count: 1 },
      { key: NO_PUBLISHER_KEY, label: NO_PUBLISHER_KEY, count: 2 },
    ]);
  });

  it('returns an empty list when there is no low stock', () => {
    expect(lowStockPublishers([])).toEqual([]);
  });
});

describe('filterLowStockByPublishers', () => {
  it('keeps only books from the checked publishers', () => {
    const out = filterLowStockByPublishers(rows, new Set(['活水出版社']));
    expect(out.map((r) => r.sku)).toEqual(['A1', 'A2']);
  });

  it('the no-publisher option matches null and blank publishers', () => {
    const out = filterLowStockByPublishers(rows, new Set([NO_PUBLISHER_KEY]));
    expect(out.map((r) => r.sku)).toEqual(['C1', 'C2']);
  });

  it('an empty selection shows nothing', () => {
    expect(filterLowStockByPublishers(rows, new Set())).toEqual([]);
  });

  it('selecting every publisher shows the whole list', () => {
    const all = new Set(lowStockPublishers(rows).map((p) => p.key));
    expect(filterLowStockByPublishers(rows, all)).toHaveLength(rows.length);
  });
});
