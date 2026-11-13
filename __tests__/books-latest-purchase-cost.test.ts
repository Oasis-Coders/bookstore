import { describe, it, expect } from 'vitest';
import { latestPurchaseCost } from '../lib/books/queries';

// 工单 #18：进货价 = 最近一次收货批次的实际单价（派生值，不可手动修改）
describe('latestPurchaseCost', () => {
  it('取 received_at 最晚的批次单价', () => {
    expect(
      latestPurchaseCost([
        { unit_cost: 5.2, received_at: '2026-02-01T00:00:00Z', quantity_received: 10 },
        { unit_cost: 5.8, received_at: '2026-05-10T00:00:00Z', quantity_received: 10 },
      ]),
    ).toEqual({ unit_cost: 5.8, received_at: '2026-05-10T00:00:00Z' });
  });

  it('跳过收货量为 0 的批次（未实际收货不算进货价）', () => {
    expect(
      latestPurchaseCost([
        { unit_cost: 5.2, received_at: '2026-02-01T00:00:00Z', quantity_received: 10 },
        { unit_cost: 9.9, received_at: '2026-06-01T00:00:00Z', quantity_received: 0 },
      ]),
    ).toEqual({ unit_cost: 5.2, received_at: '2026-02-01T00:00:00Z' });
  });

  it('跳过单价缺失的批次', () => {
    expect(
      latestPurchaseCost([
        { unit_cost: null, received_at: '2026-06-01T00:00:00Z', quantity_received: 5 },
        { unit_cost: 4.5, received_at: '2026-03-01T00:00:00Z', quantity_received: 5 },
      ]),
    ).toEqual({ unit_cost: 4.5, received_at: '2026-03-01T00:00:00Z' });
  });

  it('无批次 / 空数组 / null 都返回 null（界面显示暂无进货记录）', () => {
    expect(latestPurchaseCost([])).toBeNull();
    expect(latestPurchaseCost(null)).toBeNull();
    expect(latestPurchaseCost(undefined)).toBeNull();
  });
});
