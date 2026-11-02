import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReportsClient } from './reports-client';
import { PublisherReportSection } from './publisher-report-section';
import {
  fetchInventoryOverview,
  fetchMonthlyFinancialData,
  fetchSalesRangeData,
  fetchEditedSalesData,
  fetchPublisherReportData,
  getMonthRange,
  type SupabaseLike,
} from './reports-data';

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div
      className="mt-4 rounded-[20px] border border-cocm-ink/10 bg-white p-6 shadow-sm"
      data-testid="publisher-report-skeleton"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold text-cocm-ink">{title}</span>
        <div className="h-8 w-24 animate-pulse rounded-[10px] bg-cocm-ink/10" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-10 w-full animate-pulse rounded-[12px] bg-cocm-ink/10" />
        <div className="h-10 w-full animate-pulse rounded-[12px] bg-cocm-ink/5" />
        <div className="h-10 w-full animate-pulse rounded-[12px] bg-cocm-ink/5" />
      </div>
    </div>
  );
}

async function AsyncPublisherReport({
  supabase,
  valuationPromise,
  params,
}: {
  supabase: SupabaseLike | null;
  valuationPromise: Promise<any[]>;
  params: { pub_from?: string; pub_to?: string; pub_publisher?: string };
}) {
  if (!supabase) {
    const year = new Date().getUTCFullYear();
    const todayStr = new Date().toISOString().slice(0, 10);
    return (
      <PublisherReportSection
        rows={[]}
        publishers={[]}
        initialFilters={{
          from: params.pub_from || `${year}-01-01`,
          to: params.pub_to || todayStr,
          publisher: params.pub_publisher && params.pub_publisher !== 'all' ? params.pub_publisher : 'all',
        }}
      />
    );
  }
  const publisherReport = await fetchPublisherReportData(supabase, valuationPromise, params);
  return (
    <PublisherReportSection
      rows={publisherReport.rows}
      publishers={publisherReport.publishers}
      initialFilters={publisherReport.initialFilters}
    />
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    month?: string;
    pay?: string;
    pstatus?: string;
    pub_from?: string;
    pub_to?: string;
    pub_publisher?: string;
  }>;
}) {
  const { from, to, month, pay, pstatus, pub_from, pub_to, pub_publisher } = await searchParams;
  const payFilter = pay && pay !== 'all' ? pay : null;
  const payStatusFilter = pstatus && pstatus !== 'all' ? pstatus : null;
  const supabase = await createSupabaseServerClient();

  const { targetMonth, monthStart, monthEnd } = getMonthRange(month);

  let valuation: any[] = [];
  let lowStock: any[] = [];
  let salesList: any[] = [];
  let salesBooksList: any[] = [];
  let editedSalesList: any[] = [];
  let monthlyFinancial: any = null;
  let currentInventoryValue = 0;
  let autoOpeningStock: number | null = null;
  let autoClosingStock: number | null = null;

  let valuationPromise: Promise<any[]> = Promise.resolve([]);

  if (supabase) {
    try {
      // Kick off inventory overview immediately and share its promise with downstream tasks
      const inventoryTask = fetchInventoryOverview(supabase).catch(() => ({
        valuation: [] as any[],
        lowStock: [] as any[],
        currentInventoryValue: 0,
        mode: 'empty' as const,
      }));
      valuationPromise = inventoryTask.then((r) => r.valuation);
      const currentValPromise = inventoryTask.then((r) => r.currentInventoryValue);

      // Run all above-the-fold report sections in parallel instead of a sequential waterfall
      const [invResult, salesResult, editsResult, financialResult] = await Promise.all([
        inventoryTask,
        fetchSalesRangeData(supabase, { from, to, payFilter, payStatusFilter }),
        fetchEditedSalesData(supabase),
        fetchMonthlyFinancialData(supabase, targetMonth, monthStart, monthEnd, currentValPromise),
      ]);

      valuation = invResult.valuation;
      lowStock = invResult.lowStock;
      currentInventoryValue = invResult.currentInventoryValue;
      salesList = salesResult.salesList;
      salesBooksList = salesResult.salesBooksList;
      editedSalesList = editsResult;
      monthlyFinancial = financialResult.monthlyFinancial;
      autoOpeningStock = financialResult.autoOpeningStock;
      autoClosingStock = financialResult.autoClosingStock;
    } catch {}
  }

  // Stream the heavy below-the-fold Publisher Inventory Movement Report (20,000 inventory_transactions + inventory_qty_at RPC)
  // via its own Suspense boundary so the main page shell & financial report render without waiting on it.
  const publisherReportSlot = (
    <Suspense fallback={<SectionSkeleton title="按出版社进出货报表 / Publisher Inventory Report" />}>
      <AsyncPublisherReport
        supabase={supabase}
        valuationPromise={valuationPromise}
        params={{ pub_from, pub_to, pub_publisher }}
      />
    </Suspense>
  );

  return (
    <Suspense fallback={<div className="p-6 text-[12px] text-[#7e84ad]">Loading...</div>}>
      <ReportsClient
        valuation={valuation}
        lowStock={lowStock}
        salesList={salesList}
        salesBooksList={salesBooksList}
        editedSalesList={editedSalesList}
        monthlyFinancial={monthlyFinancial}
        currentInventoryValue={currentInventoryValue}
        autoOpeningStock={autoOpeningStock}
        autoClosingStock={autoClosingStock}
        publisherReportSlot={publisherReportSlot}
        initialFilters={{
          from,
          to,
          month: targetMonth,
          pay: payFilter ? payFilter : 'all',
          pstatus: payStatusFilter ? payStatusFilter : 'all',
        }}
      />
    </Suspense>
  );
}
