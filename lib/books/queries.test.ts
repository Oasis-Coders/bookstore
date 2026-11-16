import { describe, expect, it, vi } from 'vitest';
import { listAllActiveBooks } from './queries';

/** 模拟 supabase 查询链：from().select().eq().order().range() */
function makeFakeClient(total: number) {
  const rangeCalls: Array<[number, number]> = [];
  const selectCalls: string[] = [];
  const rows = Array.from({ length: total }, (_, i) => ({ id: `book-${i}`, title: `书 ${i}` }));
  const client = {
    from: vi.fn(() => ({
      select: vi.fn((columns: string) => {
        selectCalls.push(columns);
        return {
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(async (from: number, to: number) => {
                rangeCalls.push([from, to]);
                return { data: rows.slice(from, to + 1), error: null };
              }),
            })),
          })),
        };
      }),
    })),
  };
  return { client: client as any, rangeCalls, selectCalls };
}

describe('listAllActiveBooks', () => {
  it('一页就能装下时只查一次', async () => {
    const { client, rangeCalls, selectCalls } = makeFakeClient(509);
    const books = await listAllActiveBooks(client, 'id, title, sku');
    expect(books).toHaveLength(509);
    expect(books[0]).toEqual({ id: 'book-0', title: '书 0' });
    expect(rangeCalls).toEqual([[0, 999]]);
    expect(selectCalls).toEqual(['id, title, sku']);
  });

  it('超过 1000 行时分页拉满、不丢书', async () => {
    const { client, rangeCalls } = makeFakeClient(2500);
    const books = await listAllActiveBooks(client);
    expect(books).toHaveLength(2500);
    expect(books[2499]).toEqual({ id: 'book-2499', title: '书 2499' });
    // 1000 + 1000 + 500（不满一页即停，不再多查）
    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('空书库返回空数组', async () => {
    const { client } = makeFakeClient(0);
    expect(await listAllActiveBooks(client)).toEqual([]);
  });
});
