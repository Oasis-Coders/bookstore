'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';

const PAGE_SIZE = 50;

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PublisherReportSection({
  rows,
  publishers,
  initialFilters,
}: {
  rows: any[];
  publishers: string[];
  initialFilters: { from: string; to: string; publisher: string };
}) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(initialFilters.from);
  const [to, setTo] = useState(initialFilters.to);
  const [publisher, setPublisher] = useState(initialFilters.publisher);
  const [page, setPage] = useState(1);

  const applyFilters = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pub_from', from);
    p.set('pub_to', to);
    p.set('pub_publisher', publisher);
    setPage(1);
    router.push(`/reports?${p.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [rows, safePage]
  );

  const exportCsv = () => {
    downloadCsv(
      `publisher_report_${initialFilters.from}_${initialFilters.to}.csv`,
      ['SKU', 'Title', 'Opening Stock', 'Purchased Qty', 'Current Stock', 'Weighted Avg Cost', 'Retail Price', 'Shelf Position'],
      rows.map((r) => [
        r.sku,
        r.title,
        r.opening,
        r.purchased,
        r.current,
        Number(r.weighted_average_cost || 0).toFixed(2),
        Number(r.retail_price || 0).toFixed(2),
        r.shelf_position || '',
      ])
    );
  };

  const publisherLabel =
    initialFilters.publisher === 'all'
      ? tt('publisherReport.allPublishers')
      : initialFilters.publisher;

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-[14px]">
          {tt('publisherReport.title')} ({initialFilters.from} ~ {initialFilters.to}
          {initialFilters.publisher !== 'all' ? ` · ${publisherLabel}` : ''})
        </CardTitle>
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          {tt('publisherReport.exportCsv')}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="pubrep-from" className="mb-1 block text-[11.5px] text-[#5b5f94]">
            {tt('publisherReport.from')}
          </label>
          <Input id="pubrep-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-[170px]" />
        </div>
        <div>
          <label htmlFor="pubrep-to" className="mb-1 block text-[11.5px] text-[#5b5f94]">
            {tt('publisherReport.to')}
          </label>
          <Input id="pubrep-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-[170px]" />
        </div>
        <div>
          <label htmlFor="pubrep-publisher" className="mb-1 block text-[11.5px] text-[#5b5f94]">
            {tt('publisherReport.publisher')}
          </label>
          <select
            id="pubrep-publisher"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            className="h-10 max-w-[220px] rounded-[12px] border border-[#e9e2d4] bg-white px-3 text-[13px] text-cocm-ink focus:outline-none"
          >
            <option value="all">{tt('publisherReport.allPublishers')}</option>
            {publishers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={applyFilters} className="h-10 rounded-[12px]">
          {tt('publisherReport.search')}
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-[#9aa0bd]">{tt('publisherReport.hint')}</p>

      <div className="mt-4 overflow-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-cocm-ink/10 text-left text-[#5b5f94]">
              <th className="pb-2 font-medium">{tt('publisherReport.sku')}</th>
              <th className="pb-2 font-medium">{tt('publisherReport.bookTitle')}</th>
              <th className="pb-2 text-right font-medium">{tt('publisherReport.openingStock')}</th>
              <th className="pb-2 text-right font-medium">{tt('publisherReport.purchasedQty')}</th>
              <th className="pb-2 text-right font-medium">{tt('publisherReport.currentStock')}</th>
              <th className="pb-2 text-right font-medium">{tt('publisherReport.weightedAvg')}</th>
              <th className="pb-2 text-right font-medium">{tt('publisherReport.retailPrice')}</th>
              <th className="pb-2 font-medium">{tt('publisherReport.shelfPosition')}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.book_id} className="border-b border-cocm-ink/5">
                <td className="py-2 pr-2 font-mono text-[11px]">{r.sku}</td>
                <td className="py-2 pr-2">{r.title}</td>
                <td className="py-2 text-right text-[#5b5f94]">{r.opening}</td>
                <td className="py-2 text-right">{r.purchased}</td>
                <td className="py-2 text-right font-medium">{r.current}</td>
                <td className="py-2 text-right">{formatCurrency(Number(r.weighted_average_cost || 0))}</td>
                <td className="py-2 text-right">{formatCurrency(Number(r.retail_price || 0))}</td>
                <td className="py-2 pr-2">
                  <span className="whitespace-nowrap rounded-full bg-cocm-paper px-1.5 py-0.5 text-[10px]">
                    {r.shelf_position || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-6 text-center text-[12px] text-[#5b5f94]">{tt('publisherReport.noData')}</p>
        )}
      </div>
      {rows.length > PAGE_SIZE && (
        <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-[#5b5f94]">
          <span>
            {isZh ? `共 ${rows.length} 本，第 ${safePage} / ${totalPages} 页` : `${rows.length} items, page ${safePage} of ${totalPages}`}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="rounded-[10px]">
              {tt('reports.prevPage')}
            </Button>
            <Button size="sm" variant="ghost" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="rounded-[10px]">
              {tt('reports.nextPage')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
