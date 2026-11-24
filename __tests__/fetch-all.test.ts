import { describe, expect, it, vi } from 'vitest';
// 相对路径导入：vitest 下 @/ 别名曾出现解析失败（见 AGENTS.md 记录）
import { fetchAllPages, sumInventoryValue, sumRetailValue } from '../lib/supabase/fetch-all';

describe('fetchAllPages', () => {
  it('拉完所有分页，而不是停在第一页 1000 行（工单 #20 回归）', async () => {
    const pages = [
      Array.from({ length: 1000 }, (_, i) => i),
      Array.from({ length: 1000 }, (_, i) => 1000 + i),
      Array.from({ length: 37 }, (_, i) => 2000 + i),
    ];
    const fetchPage = vi.fn(async (from: number) => ({
      data: pages[from / 1000] ?? [],
      error: null,
    }));
    const rows = await fetchAllPages<number>(fetchPage);
    expect(rows).toHaveLength(2037);
    expect(rows[2036]).toBe(2036);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 2000, 2999);
  });

  it('总数恰好是页大小整数倍时，多拉一页空页后停止', async () => {
    const fetchPage = vi.fn(async (from: number) => ({
      data: from === 0 ? Array.from({ length: 1000 }, (_, i) => i) : [],
      error: null,
    }));
    const rows = await fetchAllPages<number>(fetchPage);
    expect(rows).toHaveLength(1000);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('第一页就为空时返回空数组', async () => {
    const rows = await fetchAllPages<number>(async () => ({ data: [], error: null }));
    expect(rows).toEqual([]);
  });

  it('null data 视为空页', async () => {
    const rows = await fetchAllPages<number>(async () => ({ data: null, error: null }));
    expect(rows).toEqual([]);
  });

  it('任一页出错就抛出，不返回残缺汇总', async () => {
    const boom = new Error('postgrest boom');
    await expect(
      fetchAllPages<number>(async () => ({ data: null, error: boom })),
    ).rejects.toBe(boom);
  });
});

describe('sumInventoryValue', () => {
  it('汇总所有行，含第 1000 行之后（截断场景）', () => {
    const rows = Array.from({ length: 1199 }, () => ({ inventory_value: 10 }));
    expect(sumInventoryValue(rows)).toBe(11990);
  });

  it('兼容字符串数字与空值', () => {
    expect(
      sumInventoryValue([
        { inventory_value: '12.50' },
        { inventory_value: 7.5 },
        { inventory_value: null },
        { inventory_value: undefined },
        {},
      ]),
    ).toBe(20);
  });
});

describe('sumRetailValue', () => {
  it('报表页零售总值汇总所有行，含第 1000 行之后（工单 #20 复查回归）', () => {
    const rows = Array.from({ length: 1199 }, () => ({ retail_value: 10 }));
    expect(sumRetailValue(rows)).toBe(11990);
  });

  it('兼容字符串数字与空值', () => {
    expect(
      sumRetailValue([
        { retail_value: '3.25' },
        { retail_value: 1.75 },
        { retail_value: null },
        {},
      ]),
    ).toBe(5);
  });
});
