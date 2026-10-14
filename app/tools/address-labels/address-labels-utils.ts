/** 地址标签打印用的纯函数（供 client 和 vitest 共用） */

/** 按行拆分地址，去掉空白行，最多保留 5 行 */
export function normalizeAddressLines(address: string): string[] {
  return address
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 5);
}

/** 将地址按份数展开成标签数组（供打印分页用）；非法份数回退到 1，上限 999 */
export function expandAddressCopies(lines: string[], copies: number): string[][] {
  const n = Math.min(999, Math.max(1, Math.floor(copies) || 1));
  return Array.from({ length: n }, () => lines);
}
