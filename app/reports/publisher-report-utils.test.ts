import { describe, expect, it } from 'vitest';
import {
  buildPublisherReportRows,
  distinctPublishers,
  type PublisherReportBook,
} from './publisher-report-utils';

const books: PublisherReportBook[] = [
  { id: 'b1', sku: 'BK-002', title: 'Book Two', publisher: '活水出版社' },
  { id: 'b2', sku: 'BK-001', title: 'Book One', publisher: '海天书楼' },
  { id: 'b3', sku: 'BK-003', title: 'Book Three', publisher: ' ' },
];

describe('buildPublisherReportRows', () => {
  it('merges valuation/opening/purchased into rows sorted by sku', () => {
    const rows = buildPublisherReportRows(
      books,
      {
        b1: { quantity_on_hand: 7, current_price: 12.5, weighted_average_cost: 6.2, shelf_position: 'A1' },
        b2: { quantity_on_hand: 3, current_price: 20, weighted_average_cost: 9, shelf_position: null },
      },
      { b1: 5, b2: 2 },
      { b1: 4 }
    );
    expect(rows.map((r) => r.sku)).toEqual(['BK-001', 'BK-002', 'BK-003']);
    const two = rows.find((r) => r.book_id === 'b1')!;
    expect(two.opening).toBe(5);
    expect(two.purchased).toBe(4);
    expect(two.current).toBe(7);
    expect(two.weighted_average_cost).toBe(6.2);
    expect(two.retail_price).toBe(12.5);
    expect(two.shelf_position).toBe('A1');
  });

  it('defaults missing data to zero/null', () => {
    const rows = buildPublisherReportRows(books, {}, {}, {});
    for (const r of rows) {
      expect(r.opening).toBe(0);
      expect(r.purchased).toBe(0);
      expect(r.current).toBe(0);
      expect(r.weighted_average_cost).toBe(0);
      expect(r.retail_price).toBe(0);
      expect(r.shelf_position).toBeNull();
    }
  });
});

describe('distinctPublishers', () => {
  it('returns sorted unique non-empty publisher names', () => {
    expect(distinctPublishers(books)).toEqual(['海天书楼', '活水出版社']);
  });
});
