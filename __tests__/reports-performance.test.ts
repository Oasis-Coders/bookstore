import { describe, expect, it } from 'vitest';
import {
  fetchInventoryOverview,
  fetchMonthlyFinancialData,
  fetchSalesRangeData,
  fetchEditedSalesData,
  fetchPublisherReportData,
  getMonthRange,
  shiftDay,
  type SupabaseLike,
} from '../app/reports/reports-data';

/**
 * Creates a simulated Supabase client with configurable per-query network latency (`delayMs`).
 * Records every query / RPC call and timestamps so tests can verify concurrency vs sequential execution.
 */
function createLatencyMockSupabase(delayMs: number) {
  const calls: { type: 'table' | 'rpc'; name: string; startMs: number; endMs: number }[] = [];
  const origin = performance.now();

  const wait = <T>(name: string, type: 'table' | 'rpc', data: T) => {
    const startMs = performance.now() - origin;
    return new Promise<{ data: T; error: null }>((resolve) => {
      setTimeout(() => {
        const endMs = performance.now() - origin;
        calls.push({ type, name, startMs, endMs });
        resolve({ data, error: null });
      }, delayMs);
    });
  };

  const mockDataForTable = (table: string): any => {
    switch (table) {
      case 'inventory_valuation_view':
        return [
          {
            book_id: 'b1',
            sku: 'BK-001',
            title: 'Book One',
            publisher: '活水出版社',
            category: 'Theology',
            quantity_on_hand: 10,
            current_price: 15,
            weighted_average_cost: 8,
            inventory_value: 80,
            retail_value: 150,
            shelf_position: 'A1',
          },
          {
            book_id: 'b2',
            sku: 'BK-002',
            title: 'Book Two',
            publisher: '海天书楼',
            category: 'Life',
            quantity_on_hand: 5,
            current_price: 12,
            weighted_average_cost: 6,
            inventory_value: 30,
            retail_value: 60,
            shelf_position: 'B2',
          },
        ];
      case 'low_stock_view':
        return [{ book_id: 'b2', sku: 'BK-002', title: 'Book Two', low_stock_threshold: 5, quantity_on_hand: 5, reorder_shortage: 0 }];
      case 'sales_transactions':
        return [
          {
            id: 's1',
            sale_number: 'C100011',
            sale_date: '2026-10-05',
            sold_at: '2026-10-05T10:00:00Z',
            payment_method: 'cash',
            payment_status: 'paid',
            subtotal: 30,
            discount_amount: 0,
            shipping_cost: 0,
            customer_name: 'Alice',
            status: 'completed',
            created_by: 'u1',
          },
        ];
      case 'sales_transaction_lines':
        return [
          {
            sale_id: 's1',
            quantity: 2,
            unit_price: 15,
            cost_of_goods_sold: 16,
            sales_transactions: {
              sale_date: '2026-10-05',
              sale_number: 'C100011',
              payment_method: 'cash',
              customer_name: 'Alice',
              created_by: 'u1',
            },
            books: {
              sku: 'BK-001',
              title: 'Book One',
              title_en: 'Book One EN',
              shelf_position: 'A1',
              warehouse_location: 'W1',
            },
          },
        ];
      case 'profiles':
        return [{ id: 'u1', display_name: 'Staff One' }];
      case 'sale_edits':
        return [
          {
            id: 'e1',
            sale_id: 's1',
            change_type: 'metadata',
            reason: 'Fix customer name',
            edited_at: '2026-10-06T12:00:00Z',
            edited_by: 'u1',
          },
        ];
      case 'books':
        return [
          { id: 'b1', sku: 'BK-001', title: 'Book One', publisher: '活水出版社' },
          { id: 'b2', sku: 'BK-002', title: 'Book Two', publisher: '海天书楼' },
        ];
      case 'inventory_transactions':
        return [{ book_id: 'b1', quantity: 4 }];
      case 'monthly_financial_view':
        return {
          month_start: '2026-10-01',
          order_count: 1,
          sales_total: 30,
          sales_subtotal: 30,
          cogs_total: 16,
          purchases_total: 50,
          opening_stock: 100,
          closing_stock: 110,
        };
      default:
        return [];
    }
  };

  const makeBuilder = (table: string) => {
    const builder: any = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      eq: () => builder,
      neq: () => builder,
      gte: () => builder,
      lte: () => builder,
      lt: () => builder,
      in: () => builder,
      maybeSingle: () => wait(`${table}.maybeSingle`, 'table', mockDataForTable(table)),
      single: () => wait(`${table}.single`, 'table', mockDataForTable(table)),
      then: (onfulfilled?: any, onrejected?: any) =>
        wait(table, 'table', mockDataForTable(table)).then(onfulfilled, onrejected),
    };
    return builder;
  };

  const client = {
    from: (table: string) => makeBuilder(table),
    rpc: (fn: string) => {
      if (fn === 'inventory_qty_at') {
        return wait(fn, 'rpc', [
          { book_id: 'b1', qty_on_hand: 6 },
          { book_id: 'b2', qty_on_hand: 5 },
        ]);
      }
      if (fn === 'inventory_value_at') {
        return wait(fn, 'rpc', 100);
      }
      return wait(fn, 'rpc', null);
    },
  } as unknown as SupabaseLike;

  return { client, calls };
}

describe('Reports Route Data Fetching Performance & Concurrency', () => {
  it('computes month boundaries and day shifts accurately', () => {
    expect(shiftDay('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01');
    const range = getMonthRange('2026-02');
    expect(range).toEqual({
      targetMonth: '2026-02',
      monthStart: '2026-02-01',
      monthEnd: '2026-02-28',
    });
  });

  it('executes above-the-fold report sections in parallel rather than a >3s sequential waterfall', async () => {
    // Suppose each DB round-trip takes 50ms (representing ~250ms in production).
    // A 12-step sequential waterfall would take 12 * 50ms = 600ms (or >3000ms at 250ms/query).
    // With parallel execution + streaming separation, the critical path is at most 2 round-trips (~100ms).
    const delayMs = 50;
    const { client, calls } = createLatencyMockSupabase(delayMs);
    const { targetMonth, monthStart, monthEnd } = getMonthRange('2026-10');

    const start = performance.now();

    const inventoryTask = fetchInventoryOverview(client);
    const currentValPromise = inventoryTask.then((r) => r.currentInventoryValue);

    const [invResult, salesResult, editsResult, financialResult] = await Promise.all([
      inventoryTask,
      fetchSalesRangeData(client, { from: '2026-10-01', to: '2026-10-31' }),
      fetchEditedSalesData(client),
      fetchMonthlyFinancialData(client, targetMonth, monthStart, monthEnd, currentValPromise),
    ]);

    const elapsedMs = performance.now() - start;

    // Verify correctness of fetched data
    expect(invResult.currentInventoryValue).toBe(110);
    expect(invResult.lowStock).toHaveLength(1);
    expect(salesResult.salesList).toHaveLength(1);
    expect(salesResult.salesBooksList).toHaveLength(1);
    expect(salesResult.salesBooksList[0].staff_name).toBe('Staff One');
    expect(editsResult).toHaveLength(1);
    expect(editsResult[0].edited_by_name).toBe('Staff One');
    expect(financialResult.monthlyFinancial?.sales_total).toBe(30);
    expect(financialResult.autoOpeningStock).toBe(100);

    // Total sequential time of all queries executed would be calls.length * delayMs (>= 450ms)
    const sequentialEquivalentMs = calls.length * delayMs;
    expect(calls.length).toBeGreaterThanOrEqual(8);

    // Parallel execution should complete in ~2-3 round-trips, well under half the sequential time
    expect(elapsedMs).toBeLessThan(sequentialEquivalentMs * 0.5);
  });

  it('fetches publisher report queries (books, inventory_qty_at RPC, inventory_transactions) in parallel', async () => {
    const delayMs = 50;
    const { client, calls } = createLatencyMockSupabase(delayMs);
    const valuation = [
      {
        book_id: 'b1',
        quantity_on_hand: 10,
        current_price: 15,
        weighted_average_cost: 8,
        shelf_position: 'A1',
      },
    ];

    const start = performance.now();
    const pubReport = await fetchPublisherReportData(client, Promise.resolve(valuation), {
      pub_from: '2026-01-01',
      pub_to: '2026-10-31',
      pub_publisher: 'all',
    });
    const elapsedMs = performance.now() - start;

    expect(pubReport.rows).toHaveLength(2);
    expect(pubReport.publishers).toEqual(['海天书楼', '活水出版社']);
    expect(calls.length).toBe(3); // books + inventory_qty_at + inventory_transactions

    // All 3 queries run concurrently in 1 round-trip (~50ms), not 3 sequential round-trips (150ms)
    expect(elapsedMs).toBeLessThan(delayMs * 2.2);
  });

  it('reuses profileMap in fetchSalesRangeData to avoid redundant profiles query', async () => {
    const { client, calls } = createLatencyMockSupabase(10);
    await fetchSalesRangeData(client, { from: '2026-10-01', to: '2026-10-31' });

    const profileCalls = calls.filter((c) => c.name === 'profiles');
    // Because sales_transaction_lines has the same created_by ('u1') as sales_transactions,
    // profiles should only be queried once!
    expect(profileCalls).toHaveLength(1);
  });
});

