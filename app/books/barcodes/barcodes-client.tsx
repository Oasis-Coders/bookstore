'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n/use-t';
import {
  assignSpareBarcode,
  generateMoreSpareBarcodes,
  listAllAvailableSpareCodes,
  searchBooksForAssign,
  type SpareBarcodeStat,
  type SpareBarcodeRow,
} from './actions';

type BookHit = { id: string; title: string; sku: string; isbn13: string | null; has_spare: boolean };

export function BarcodesClient({
  stats,
  assigned,
  available,
}: {
  stats: SpareBarcodeStat;
  assigned: SpareBarcodeRow[];
  available: SpareBarcodeRow[];
}) {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [tab, setTab] = useState<'assign' | 'assigned' | 'available'>('assign');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<BookHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [genCount, setGenCount] = useState('500');

  const doSearch = async () => {
    if (!q.trim()) return;
    setSearching(true);
    setMsg('');
    try {
      setHits(await searchBooksForAssign(q));
    } finally {
      setSearching(false);
    }
  };

  const doAssign = async (b: BookHit) => {
    setBusy(b.id);
    setMsg('');
    const r = await assignSpareBarcode(b.id);
    setBusy(null);
    if (!r.success) {
      setMsg(r.error || (isZh ? '分配失败' : 'Assign failed'));
      return;
    }
    setMsg(isZh ? `已为《${b.title}》分配备用条码：${r.code}` : `Assigned ${r.code} to ${b.title}`);
    setHits((prev) => prev.map((h) => (h.id === b.id ? { ...h, has_spare: true } : h)));
  };

  const doGenerate = async () => {
    const n = parseInt(genCount, 10);
    if (!n || n < 1) { setMsg(isZh ? '请输入生成数量' : 'Enter a count'); return; }
    setBusy('gen');
    const r = await generateMoreSpareBarcodes(n);
    setBusy(null);
    if (!r.success) { setMsg(r.error || (isZh ? '生成失败' : 'Generate failed')); return; }
    setMsg(isZh ? `已生成 ${r.generated} 个备用条码` : `Generated ${r.generated} spare barcodes`);
  };

  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const codes = await listAllAvailableSpareCodes();
      const rows = ['code'];
      for (const c of codes) rows.push(c);
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spare-barcodes-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(isZh ? `已导出 ${codes.length} 个可用条码` : `Exported ${codes.length} codes`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell title={isZh ? '备用条码库' : 'Spare Barcodes'} titleZh="备用条码库" eyebrow={isZh ? '27 开头内部码 · 与 ISBN 区分' : 'Internal 27-prefix codes'}>
      <div className="mx-auto max-w-[720px] space-y-5">
        <div>
          <Link href="/books" className="inline-flex items-center text-[13px] text-[#5b5f94] hover:text-cocm-ink">
            {isZh ? '← 返回书库' : '← Back to Books'}
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {([
            [isZh ? '总数' : 'Total', stats.total],
            [isZh ? '可用' : 'Available', stats.available],
            [isZh ? '已分配' : 'Assigned', stats.assigned],
          ] as const).map(([label, n]) => (
            <Card key={label} className="p-4 text-center">
              <p className="text-[11px] text-[#5b5f94]">{label}</p>
              <p className="mt-1 font-serif text-[24px] font-bold text-cocm-ink">{n}</p>
            </Card>
          ))}
        </div>

        <Card className="p-4">
          <p className="text-[12px] leading-relaxed text-[#5b5f94]">
            {isZh
              ? '给没有厂家条码的图书分配内部备用条码（EAN-13，27 开头，与 ISBN 明确区分，可打印、可扫码）。计划在 2027-01 审计盘点确认后配合批量导入使用。'
              : 'Assign internal spare EAN-13 barcodes (27-prefix, clearly distinct from ISBN, printable & scannable) to books without manufacturer barcodes. Planned for bulk import after the Jan 2027 stocktake.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5" role="group" aria-label={isZh ? '切换' : 'Tabs'}>
              {([
                ['assign', isZh ? '分配条码' : 'Assign'],
                ['assigned', isZh ? `已分配 (${assigned.length})` : `Assigned (${assigned.length})`],
                ['available', isZh ? `可用 (${available.length})` : `Available (${available.length})`],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setTab(v)}
                  className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-colors ${tab === v ? 'bg-cocm-ink text-white' : 'bg-white text-[#5b5f94] border border-cocm-ink/10 hover:border-cocm-ink/25'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Input
                value={genCount}
                onChange={(e) => setGenCount(e.target.value)}
                inputMode="numeric"
                className="h-8 w-20 text-[12px]"
                aria-label={isZh ? '生成数量' : 'Count to generate'}
              />
              <Button size="sm" variant="secondary" className="h-8 rounded-[10px] text-[12px]" disabled={busy === 'gen'} onClick={doGenerate}>
                {isZh ? '再生成' : 'Generate'}
              </Button>
            </div>
          </div>
        </Card>

        {msg && (
          <div className="rounded-[12px] bg-cocm-paper px-3 py-2 text-[12px] text-cocm-ink">{msg}</div>
        )}

        {tab === 'assign' && (
          <Card className="p-4">
            <CardTitle>{isZh ? '给图书分配备用条码' : 'Assign a spare barcode'}</CardTitle>
            <div className="mt-3 flex gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
                placeholder={isZh ? '搜书名 / 代号…' : 'Search title / Code…'}
                className="flex-1"
              />
              <Button size="sm" className="rounded-[10px]" disabled={searching} onClick={doSearch}>
                {isZh ? '搜索' : 'Search'}
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {hits.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded-[10px] border border-cocm-ink/10 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[13px] font-medium text-cocm-ink">{b.title}</p>
                    <p className="text-[11px] text-[#5b5f94]">{b.sku}{b.isbn13 ? ` · ISBN ${b.isbn13}` : ''}{b.has_spare ? (isZh ? ' · 已有备用条码' : ' · has spare code') : ''}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={b.has_spare ? 'ghost' : 'secondary'}
                    className="h-8 rounded-[10px] text-[12px]"
                    disabled={busy === b.id || b.has_spare}
                    onClick={() => doAssign(b)}
                  >
                    {b.has_spare ? (isZh ? '已分配' : 'Assigned') : busy === b.id ? (isZh ? '分配中…' : 'Assigning…') : (isZh ? '分配' : 'Assign')}
                  </Button>
                </div>
              ))}
              {!searching && q && hits.length === 0 && (
                <p className="text-[12px] text-[#5b5f94]">{isZh ? '没有找到图书' : 'No books found'}</p>
              )}
            </div>
          </Card>
        )}

        {tab === 'assigned' && (
          <Card className="p-4">
            <CardTitle>{isZh ? '已分配' : 'Assigned'}</CardTitle>
            <div className="mt-3 space-y-1.5">
              {assigned.map((r) => (
                <div key={r.code} className="flex items-center justify-between gap-2 rounded-[8px] bg-cocm-paper/60 px-3 py-1.5">
                  <span className="font-mono text-[13px] font-semibold text-cocm-ink">{r.code}</span>
                  <span className="truncate text-[12px] text-[#5b5f94]">{r.book_title} · {r.book_sku}</span>
                </div>
              ))}
              {assigned.length === 0 && <p className="text-[12px] text-[#5b5f94]">{isZh ? '暂无' : 'None yet'}</p>}
            </div>
          </Card>
        )}

        {tab === 'available' && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <CardTitle>{isZh ? '可用条码（前 300）' : 'Available (first 300)'}</CardTitle>
              <Button size="sm" variant="ghost" className="h-8 rounded-[10px] text-[12px]" onClick={exportCsv} disabled={exporting}>
                {exporting ? '…' : (isZh ? '导出全部可用 CSV（打印用）' : 'Export all available CSV')}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {available.map((r) => (
                <div key={r.code} className="rounded-[8px] bg-cocm-paper/60 px-2 py-1.5 text-center font-mono text-[12px] text-cocm-ink">
                  {r.code}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
