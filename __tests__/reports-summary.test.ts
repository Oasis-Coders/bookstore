import { describe, it, expect } from 'vitest';
import { saleNetTotal, summarizeSalesList } from '../lib/sales-summary';

describe('saleNetTotal', () => {
  it('prefers net_total when present', () => {
    expect(saleNetTotal({ net_total: 120.5, subtotal: 100 })).toBe(120.5);
  });
  it('falls back to subtotal when net_total is missing', () => {
    expect(saleNetTotal({ subtotal: 88 })).toBe(88);
  });
  it('keeps an explicit zero net_total instead of falling back', () => {
    expect(saleNetTotal({ net_total: 0, subtotal: 50 })).toBe(0);
  });
  it('returns 0 for an empty row', () => {
    expect(saleNetTotal({})).toBe(0);
  });
});

describe('summarizeSalesList', () => {
  it('returns count and total for a normal list', () => {
    const res = summarizeSalesList([
      { net_total: 100, subtotal: 100 },
      { net_total: 55.25, subtotal: 60 },
      { subtotal: 30 },
    ]);
    expect(res.count).toBe(3);
    expect(res.total).toBeCloseTo(185.25, 2);
  });
  it('returns zeros for an empty list', () => {
    expect(summarizeSalesList([])).toEqual({ count: 0, total: 0 });
  });
});
