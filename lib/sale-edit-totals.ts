// 改单页：改后金额计算与混合支付校验。
// 工单 #17：允许清空全部图书（整单退货），此时本单金额为 0。
// 纯函数，方便单元测试；UI 里由 edit-client 调用。

export type EditCartItem = { qty: number; price: number };

/** 改后小计 / 折扣 / 邮费 / 实付。购物车为空时邮费也清零，实付为 0。 */
export function computeEditTotals(
  cart: EditCartItem[],
  discountPercent: number,
  shippingCost: number,
): { subtotal: number; discountAmount: number; shipping: number; netTotal: number } {
  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const pct = Math.min(100, Math.max(0, Number(discountPercent || 0)));
  const discountAmount = (subtotal * pct) / 100;
  // 空单 = 整单退货：没有书可寄，邮费也清零，实付为 0
  const shipping = cart.length === 0 ? 0 : Math.max(0, Number(shippingCost || 0));
  const netTotal = Math.max(0, subtotal - discountAmount + shipping);
  return { subtotal, discountAmount, shipping, netTotal };
}

/** 混合支付校验：两种方式、金额为正、之和等于应付；实付为 0（空单）时无需填明细，直接通过。 */
export function isMixPaymentValid(
  paymentMethod: string,
  mixA: string,
  mixB: string,
  mixAmtA: string,
  mixAmtB: string,
  netTotal: number,
): boolean {
  if (paymentMethod !== 'mix') return true;
  if (netTotal === 0) return true;
  const sum = Number(mixAmtA || 0) + Number(mixAmtB || 0);
  return (
    mixA !== '' &&
    mixB !== '' &&
    mixA !== mixB &&
    Number(mixAmtA) > 0 &&
    Number(mixAmtB) > 0 &&
    Math.abs(sum - netTotal) < 0.005
  );
}
