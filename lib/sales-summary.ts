/** Pure helpers for the reports page sales list summary (ticket #12). */

/** Net total of a sales row: server-set net_total, else fall back to subtotal. */
export function saleNetTotal(r: { net_total?: unknown; subtotal?: unknown } | null | undefined): number {
  return Number(r?.net_total ?? r?.subtotal ?? 0);
}

/** Summary shown above the sales list: order count + total sales of the filtered list. */
export function summarizeSalesList(
  list: { net_total?: unknown; subtotal?: unknown }[],
): { count: number; total: number } {
  return {
    count: list.length,
    total: list.reduce((s, r) => s + saleNetTotal(r), 0),
  };
}
