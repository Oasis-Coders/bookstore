// PostgREST 单次查询最多返回 1000 行（服务端默认上限）。
// 不分页的 select 会被静默截断：2026-11-23 工单 #20 —— 导入后库存估值
// 超过 1000 行，首页库存总值少算了约 £5,400。凡是「拉全量再汇总/计数」
// 的查询都必须走这里分页拉完，或改用 count 查询。

export const POSTGREST_PAGE_SIZE = 1000;

export type PageFetcher<T> = (
  from: number,
  to: number,
) => Promise<{ data: T[] | null; error?: unknown }>;

/** 分页拉取全部行，直到某页不满 pageSize 为止。 */
export async function fetchAllPages<T>(
  fetchPage: PageFetcher<T>,
  pageSize: number = POSTGREST_PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

/** 库存估值行求和（inventory_value 可能是字符串数字）。 */
export function sumInventoryValue(
  rows: { inventory_value?: unknown }[],
): number {
  return rows.reduce((sum, r) => sum + (Number(r.inventory_value) || 0), 0);
}

/** 库存零售总值求和（retail_value 可能是字符串数字）。 */
export function sumRetailValue(
  rows: { retail_value?: unknown }[],
): number {
  return rows.reduce((sum, r) => sum + (Number(r.retail_value) || 0), 0);
}
