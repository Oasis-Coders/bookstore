import { describe, it, expect } from 'vitest';
import { latestPurchaseCost, listPurchaseCosts, resolvePurchaseCost } from '../lib/books/queries';

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

// 工单 #18 跟进：多个批次不同进货价都要显示出来（按收货时间倒序）
describe('listPurchaseCosts', () => {
  it('返回全部有效批次，按 received_at 倒序', () => {
    expect(
      listPurchaseCosts([
        { unit_cost: 5.2, received_at: '2026-02-01T00:00:00Z', quantity_received: 10, quantity_remaining: 3 },
        { unit_cost: 5.8, received_at: '2026-05-10T00:00:00Z', quantity_received: 10, quantity_remaining: 10 },
        { unit_cost: 4.0, received_at: '2026-05-10T12:00:00Z', quantity_received: 5, quantity_remaining: 5 },
      ]),
    ).toEqual([
      { unit_cost: 4.0, received_at: '2026-05-10T12:00:00Z', quantity_received: 5, quantity_remaining: 5 },
      { unit_cost: 5.8, received_at: '2026-05-10T00:00:00Z', quantity_received: 10, quantity_remaining: 10 },
      { unit_cost: 5.2, received_at: '2026-02-01T00:00:00Z', quantity_received: 10, quantity_remaining: 3 },
    ]);
  });

  it('跳过收货量为 0 与单价缺失的批次', () => {
    expect(
      listPurchaseCosts([
        { unit_cost: 9.9, received_at: '2026-06-01T00:00:00Z', quantity_received: 0, quantity_remaining: 0 },
        { unit_cost: null, received_at: '2026-06-02T00:00:00Z', quantity_received: 5, quantity_remaining: 5 },
        { unit_cost: 4.5, received_at: '2026-03-01T00:00:00Z', quantity_received: 5, quantity_remaining: 5 },
      ]),
    ).toEqual([
      { unit_cost: 4.5, received_at: '2026-03-01T00:00:00Z', quantity_received: 5, quantity_remaining: 5 },
    ]);
  });

  it('无批次返回空数组', () => {
    expect(listPurchaseCosts([])).toEqual([]);
    expect(listPurchaseCosts(null)).toEqual([]);
  });
});

// 工单 #18 跟进：无收货批次时用导入文件里的 Unit cost 兜底
describe('resolvePurchaseCost', () => {
  const batches = [
    { unit_cost: 5.8, received_at: '2026-05-10T00:00:00Z', quantity_received: 10, quantity_remaining: 10 },
  ];

  it('有批次时列全部批次价，导入价不参与', () => {
    expect(resolvePurchaseCost(batches, 7.8)).toEqual({
      kind: 'batches',
      entries: [{ unit_cost: 5.8, received_at: '2026-05-10T00:00:00Z', quantity_received: 10, quantity_remaining: 10 }],
    });
  });

  it('无批次、有导入价时显示导入价', () => {
    expect(resolvePurchaseCost([], 7.8)).toEqual({ kind: 'import', unit_cost: 7.8 });
    expect(resolvePurchaseCost(null, 7.8)).toEqual({ kind: 'import', unit_cost: 7.8 });
  });

  it('两者都没有时返回 none（界面显示暂无进货记录）', () => {
    expect(resolvePurchaseCost([], null)).toEqual({ kind: 'none' });
    expect(resolvePurchaseCost([], undefined)).toEqual({ kind: 'none' });
    expect(resolvePurchaseCost(null, null)).toEqual({ kind: 'none' });
  });
});
