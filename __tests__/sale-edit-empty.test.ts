import { describe, it, expect } from 'vitest';
import { computeEditTotals, isMixPaymentValid } from '../lib/sale-edit-totals';

// 工单 #17：改单允许删除全部图书（整单退货），本单金额变为 0
describe('computeEditTotals', () => {
  it('空购物车：小计/折扣/邮费/实付全为 0', () => {
    expect(computeEditTotals([], 10, 5)).toEqual({
      subtotal: 0,
      discountAmount: 0,
      shipping: 0,
      netTotal: 0,
    });
  });

  it('空购物车：原来填了邮费也会清零', () => {
    const t = computeEditTotals([], 0, 3.5);
    expect(t.shipping).toBe(0);
    expect(t.netTotal).toBe(0);
  });

  it('有书：邮费保留，正常计价', () => {
    const t = computeEditTotals([{ qty: 2, price: 10 }], 10, 3);
    expect(t.subtotal).toBe(20);
    expect(t.discountAmount).toBe(2);
    expect(t.shipping).toBe(3);
    expect(t.netTotal).toBe(21);
  });

  it('有书：折扣百分比超过 100 按 100 计', () => {
    const t = computeEditTotals([{ qty: 1, price: 10 }], 150, 0);
    expect(t.discountAmount).toBe(10);
    expect(t.netTotal).toBe(0);
  });
});

describe('isMixPaymentValid', () => {
  it('空单（实付 0）：混合支付无需填明细，直接通过', () => {
    expect(isMixPaymentValid('mix', 'cash', 'card', '', '', 0)).toBe(true);
  });

  it('非混合支付：不校验', () => {
    expect(isMixPaymentValid('cash', '', '', '', '', 20)).toBe(true);
  });

  it('混合支付：两笔金额之和等于应付 → 通过', () => {
    expect(isMixPaymentValid('mix', 'cash', 'card', '12.50', '7.50', 20)).toBe(true);
  });

  it('混合支付：金额之和不等于应付 → 不通过', () => {
    expect(isMixPaymentValid('mix', 'cash', 'card', '12', '7', 20)).toBe(false);
  });

  it('混合支付：两种方式相同 → 不通过', () => {
    expect(isMixPaymentValid('mix', 'cash', 'cash', '10', '10', 20)).toBe(false);
  });
});
