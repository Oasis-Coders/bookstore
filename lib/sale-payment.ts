// 改单页：选了付款方式 = 已经付款，待付自动变已付（工单 #15）。
// 纯函数，方便单元测试；UI 里由 handleMethodChange 调用。

export type PaymentStatus = 'paid' | 'pending';

/** 选付款方式后应有的付款状态。未选（''）不改变状态。 */
export function resolvePaymentStatusAfterMethodChange(
  currentStatus: PaymentStatus,
  newMethod: string,
): PaymentStatus {
  if (newMethod !== '' && currentStatus === 'pending') return 'paid';
  return currentStatus;
}
