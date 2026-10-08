'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';
import { PurchasingTabs } from '../purchasing-tabs';

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

export function ReferenceClient({
  rows,
  suppliers,
  initialFilters,
}: {
  rows: any[];
  suppliers: any[];
  initialFilters: { from: string; to: string; supplier: string };
}) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const router = useRouter();

  const [from, setFrom] = useState(initialFilters.from);
  const [to, setTo] = useState(initialFilters.to);
  const [supplier, setSupplier] = useState(initialFilters.supplier);
  const [page, setPage] = useState(1);

  const supplierName = (s: any) => s.name_zh || s.name_en || s.code || s.id;

  const applyFilters = () => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    p.set('supplier', supplier);
    router.push(`/purchase-orders/reference?${p.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [rows, safePage]
  );

  const exportCsv = () => {
    downloadCsv(
      `purchase_reference_${initialFilters.from}_${initialFilters.to}.csv`,
      ['SKU', 'Title', 'Price', 'Opening Stock', 'Purchased', 'Sold', 'Current Stock'],
      rows.map((r) => [r.sku, r.title, Number(r.price || 0).toFixed(2), r.opening, r.purchased, r.sold, r.current])
    );
  };

  return (
    <AppShell title={tt('purchaseReference.title')} titleZh={tt('purchaseReference.title')}>
      <PurchasingTabs active="reference" />

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="ref-from" className="mb-1 block text-[11.5px] text-[#5b5f94]">
              {tt('purchaseReference.from')}
            </label>
            <Input id="ref-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-[170px]" />
          </div>
          <div>
            <label htmlFor="ref-to" className="mb-1 block text-[11.5px] text-[#5b5f94]">
              {tt('purchaseReference.to')}
            </label>
            <Input id="ref-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-[170px]" />
          </div>
          <div>
            <label htmlFor="ref-supplier" className="mb-1 block text-[11.5px] text-[#5b5f94]">
              {tt('purchaseReference.supplier')}
            </label>
            <select
              id="ref-supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="h-10 rounded-[12px] border border-[#e9e2d4] bg-white px-3 text-[13px] text-cocm-ink focus:outline-none"
            >
              <option value="all">{tt('purchaseReference.allSuppliers')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {supplierName(s)}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={applyFilters} className="h-10 rounded-[12px]">
            {tt('purchaseReference.search')}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-[#9aa0bd]">{tt('purchaseReference.hint')}</p>
      </Card>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-[14px]">
            {tt('purchaseReference.title')} ({initialFilters.from} ~ {initialFilters.to})
          </CardTitle>
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            {tt('purchaseReference.exportCsv')}
          </Button>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-cocm-ink/10 text-left text-[#5b5f94]">
                <th className="pb-2 font-medium">{tt('purchaseReference.sku')}</th>
                <th className="pb-2 font-medium">{tt('purchaseReference.bookTitle')}</th>
                <th className="pb-2 text-right font-medium">{tt('purchaseReference.price')}</th>
                <th className="pb-2 text-right font-medium">{tt('purchaseReference.openingStock')}</th>
                <th className="pb-2 text-right font-medium">{tt('purchaseReference.purchasedQty')}</th>
                <th className="pb-2 text-right font-medium">{tt('purchaseReference.soldQty')}</th>
                <th className="pb-2 text-right font-medium">{tt('purchaseReference.currentStock')}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.book_id} className="border-b border-cocm-ink/5">
                  <td className="py-2 pr-2 font-mono text-[11px]">{r.sku}</td>
                  <td className="py-2 pr-2">{r.title}</td>
                  <td className="py-2 text-right">{formatCurrency(Number(r.price || 0))}</td>
                  <td className="py-2 text-right text-[#5b5f94]">{r.opening}</td>
                  <td className="py-2 text-right">{r.purchased}</td>
                  <td className="py-2 text-right font-medium">{r.sold}</td>
                  <td className="py-2 text-right font-medium">{r.current}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-6 text-center text-[12px] text-[#5b5f94]">{tt('purchaseReference.noData')}</p>
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
    </AppShell>
  );
}
