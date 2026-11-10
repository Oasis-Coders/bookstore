import { describe, it, expect } from 'vitest';
import { resolvePaymentStatusAfterMethodChange } from '../lib/sale-payment';

// 工单 #15：改单页选了付款方式，待付自动变已付
describe('resolvePaymentStatusAfterMethodChange', () => {
  it('pending + 选现金 → 已付', () => {
    expect(resolvePaymentStatusAfterMethodChange('pending', 'cash')).toBe('paid');
  });
  it('pending + 选刷卡 → 已付', () => {
    expect(resolvePaymentStatusAfterMethodChange('pending', 'card')).toBe('paid');
  });
  it('pending + 选混合支付 → 已付', () => {
    expect(resolvePaymentStatusAfterMethodChange('pending', 'mix')).toBe('paid');
  });
  it('pending + 未选（空）→ 仍待付', () => {
    expect(resolvePaymentStatusAfterMethodChange('pending', '')).toBe('pending');
  });
  it('已付 + 换付款方式 → 仍已付', () => {
    expect(resolvePaymentStatusAfterMethodChange('paid', 'card')).toBe('paid');
  });
});
