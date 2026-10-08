'use client';

import { Fragment, useMemo, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';

const PAGE_SIZE = 50;
const UNCATEGORIZED = '__uncategorized__';

type BookSortKey = 'sku' | 'title' | 'quantity_on_hand' | 'current_price' | 'weighted_average_cost' | 'inventory_value' | 'retail_value';
type CatSortKey = 'titles' | 'qty' | 'cost' | 'retail';

const num = (v: any) => Number(v || 0);

function compareVals(a: string | number, b: string | number): number {
  if (typeof a === 'string' || typeof b === 'string') return String(a).localeCompare(String(b), 'zh');
  return (a as number) - (b as number);
}

export function ValuationSection({ valuation, onExport }: { valuation: any[]; onExport: () => void }) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bookSort, setBookSort] = useState<{ key: BookSortKey; dir: 1 | -1 }>({ key: 'inventory_value', dir: -1 });
  const [catSort, setCatSort] = useState<{ key: CatSortKey; dir: 1 | -1 }>({ key: 'cost', dir: -1 });
  const [page, setPage] = useState(1);

  const totalValue = useMemo(() => valuation.reduce((s, r) => s + num(r.inventory_value), 0), [valuation]);
  const totalRetail = useMemo(() => valuation.reduce((s, r) => s + num(r.retail_value), 0), [valuation]);

  const categories = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of valuation) {
      const raw = (r.category || '').trim();
      const key = raw || UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const list = [...map.entries()].map(([key, rows]) => ({
      key,
      name: key === UNCATEGORIZED ? null : key,
      titles: new Set(rows.map((r) => r.book_id)).size,
      qty: rows.reduce((s, r) => s + num(r.quantity_on_hand), 0),
      cost: rows.reduce((s, r) => s + num(r.inventory_value), 0),
      retail: rows.reduce((s, r) => s + num(r.retail_value), 0),
      rows,
    }));
    list.sort((a, b) => compareVals(a[catSort.key], b[catSort.key]) * catSort.dir);
    return list;
  }, [valuation, catSort]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const searchRows = useMemo(() => {
    if (!searching) return [];
    return valuation.filter(
      (r) => String(r.title || '').toLowerCase().includes(q) || String(r.sku || '').toLowerCase().includes(q)
    );
  }, [valuation, q, searching]);

  const activeRows: any[] = searching
    ? searchRows
    : expanded
      ? (categories.find((c) => c.key === expanded)?.rows ?? [])
      : [];

  const sortedRows = useMemo(() => {
    const k = bookSort.key;
    const isText = k === 'title' || k === 'sku';
    return [...activeRows].sort((a, b) => {
      const va = isText ? String(a[k] || '') : num(a[k]);
      const vb = isText ? String(b[k] || '') : num(b[k]);
      return compareVals(va, vb) * bookSort.dir;
    });
  }, [activeRows, bookSort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleBookSort = (k: BookSortKey) => {
    setBookSort((s) => (s.key === k ? { key: k, dir: s.dir === 1 ? -1 : 1 } : { key: k, dir: k === 'title' || k === 'sku' ? 1 : -1 }));
    setPage(1);
  };
  const toggleCatSort = (k: CatSortKey) => {
    setCatSort((s) => (s.key === k ? { key: k, dir: s.dir === 1 ? -1 : 1 } : { key: k, dir: -1 }));
  };

  const Th = ({ k, label, numeric }: { k: BookSortKey; label: string; numeric?: boolean }) => (
    <th className={`pb-2 font-medium ${numeric ? 'text-right' : 'text-left'}`}>
      <button type="button" onClick={() => toggleBookSort(k)} className="inline-flex items-center gap-1 hover:text-cocm-ink">
        {label}
        <span className="text-[9px] text-cocm-ink/50">{bookSort.key === k ? (bookSort.dir === 1 ? '▲' : '▼') : '△'}</span>
      </button>
    </th>
  );

  const CatTh = ({ k, label }: { k: CatSortKey; label: string }) => (
    <th className="pb-2 text-right font-medium">
      <button type="button" onClick={() => toggleCatSort(k)} className="inline-flex items-center gap-1 hover:text-cocm-ink">
        {label}
        <span className="text-[9px] text-cocm-ink/50">{catSort.key === k ? (catSort.dir === 1 ? '▲' : '▼') : '△'}</span>
      </button>
    </th>
  );

  const pager = (total: number) =>
    total <= PAGE_SIZE ? null : (
      <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-[#5b5f94]">
        <span>{isZh ? `共 ${total} 本，第 ${safePage} / ${totalPages} 页` : `${total} items, page ${safePage} of ${totalPages}`}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="rounded-[10px]">
            {tt('reports.prevPage')}
          </Button>
          <Button size="sm" variant="ghost" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="rounded-[10px]">
            {tt('reports.nextPage')}
          </Button>
        </div>
      </div>
    );

  const bookTable = (rows: any[]) => (
    <div className="overflow-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-cocm-ink/10 text-left text-[#5b5f94]">
            {searching && <th className="pb-2 font-medium">{tt('reports.category')}</th>}
            <Th k="sku" label={tt('reports.sku')} />
            <Th k="title" label={tt('reports.bookTitle')} />
            <th className="pb-2 font-medium">{tt('reports.shelfPosition')}</th>
            <th className="pb-2 font-medium">{tt('reports.warehouseLocation')}</th>
            <Th k="quantity_on_hand" label={tt('reports.onHand')} numeric />
            <Th k="current_price" label={tt('reports.retailUnitPrice')} numeric />
            <Th k="weighted_average_cost" label={tt('reports.weightedAvg')} numeric />
            <Th k="inventory_value" label={tt('reports.costValue')} numeric />
            <Th k="retail_value" label={tt('reports.retailValue')} numeric />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.book_id}-${r.location_id}-${i}`} className="border-b border-cocm-ink/5">
              {searching && <td className="py-2 pr-2 text-[#5b5f94]">{r.category || tt('reports.uncategorized')}</td>}
              <td className="py-2 pr-2 font-mono text-[11px]">{r.sku}</td>
              <td className="py-2 pr-2">{r.title}</td>
              <td className="py-2 pr-2 text-[#5b5f94]">{r.shelf_position || '-'}</td>
              <td className="py-2 pr-2 text-[#5b5f94]">{r.warehouse_location || '-'}</td>
              <td className="py-2 text-right">{r.quantity_on_hand}</td>
              <td className="py-2 text-right">{formatCurrency(num(r.current_price))}</td>
              <td className="py-2 text-right">{formatCurrency(num(r.weighted_average_cost))}</td>
              <td className="py-2 text-right font-medium">{formatCurrency(num(r.inventory_value))}</td>
              <td className="py-2 text-right text-[#5b5f94]">{formatCurrency(num(r.retail_value))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-[14px]">{tt('reports.valuationTitle')}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={tt('reports.searchBooks')}
            className="h-9 w-[210px] rounded-full text-[12px]"
          />
          <div className="flex gap-2 text-[12px]">
            <span>
              {tt('reports.costTotal')} {formatCurrency(totalValue)}
            </span>
            <span className="text-[#5b5f94]">
              {tt('reports.retailTotal')} {formatCurrency(totalRetail)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {searching ? (
          <>
            {sortedRows.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-[#5b5f94]">{isZh ? '没有找到匹配的书' : 'No matching books'}</p>
            ) : (
              <>
                {bookTable(pageRows)}
                {pager(sortedRows.length)}
              </>
            )}
          </>
        ) : categories.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-[#5b5f94]">{isZh ? '暂无数据' : 'No data'}</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-cocm-ink/10 text-left text-[#5b5f94]">
                  <th className="w-8 pb-2" />
                  <th className="pb-2 font-medium">{tt('reports.category')}</th>
                  <CatTh k="titles" label={tt('reports.titleCount')} />
                  <CatTh k="qty" label={tt('reports.totalQty')} />
                  <CatTh k="cost" label={tt('reports.costValue')} />
                  <CatTh k="retail" label={tt('reports.retailValue')} />
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <Fragment key={c.key}>
                    <tr
                      onClick={() => {
                        setExpanded((x) => (x === c.key ? null : c.key));
                        setPage(1);
                      }}
                      className="cursor-pointer border-b border-cocm-ink/5 hover:bg-cocm-ink/[0.03]"
                    >
                      <td className="py-2 pr-1 text-[10px] text-[#5b5f94]">{expanded === c.key ? '▼' : '▶'}</td>
                      <td className="py-2 pr-2 font-medium">{c.name || tt('reports.uncategorized')}</td>
                      <td className="py-2 text-right">{c.titles}</td>
                      <td className="py-2 text-right">{c.qty}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(c.cost)}</td>
                      <td className="py-2 text-right text-[#5b5f94]">{formatCurrency(c.retail)}</td>
                    </tr>
                    {expanded === c.key && (
                      <tr className="border-b border-cocm-ink/5">
                        <td />
                        <td colSpan={5} className="py-3 pl-2">
                          {bookTable(pageRows)}
                          {pager(sortedRows.length)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="secondary" onClick={onExport}>
          {isZh ? '导出估值 CSV' : 'Export Valuation CSV'}
        </Button>
        <p className="py-2 text-[11px] text-[#5b5f94]">{tt('reports.sqlHint')}</p>
      </div>
    </Card>
  );
}
