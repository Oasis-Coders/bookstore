'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import JsBarcode from 'jsbarcode';
import { useT } from '@/lib/i18n/use-t';

/**
 * 备用条码打印页 —— 按不干胶标签纸排版，整页打印。
 * 版式可选（默认 LL21）。打印时请选择：A4、纵向、边距"无"、缩放 100%。
 */
type LabelFormat = {
  id: string;
  nameZh: string;
  nameEn: string;
  wMm: number; // 单张标签宽
  hMm: number; // 单张标签高
  cols: number; // 每页列数
  rows: number; // 每页行数
};

const FORMATS: LabelFormat[] = [
  { id: 'll21', nameZh: 'LL21 63.5×38.1mm（每页21张）', nameEn: 'LL21 63.5×38.1mm (21/sheet)', wMm: 63.5, hMm: 38.1, cols: 3, rows: 7 },
  { id: 'l7162', nameZh: 'L7162 99.1×38.1mm（每页14张）', nameEn: 'L7162 99.1×38.1mm (14/sheet)', wMm: 99.1, hMm: 38.1, cols: 2, rows: 7 },
];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function PrintBarcodesClient({ codes }: { codes: string[] }) {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [formatId, setFormatId] = useState(FORMATS[0].id);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fmt = FORMATS.find((f) => f.id === formatId) || FORMATS[0];
  const perPage = fmt.cols * fmt.rows;
  const pages = chunk(codes, perPage);

  // 条码粗细随标签尺寸缩放（EAN-13 允差范围内）
  const barWidth = Math.min(2.2, fmt.wMm / 40);
  const barHeight = Math.min(64, fmt.hMm * 1.5);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.querySelectorAll('svg[data-code]').forEach((el) => {
      const code = (el as SVGElement).dataset.code || '';
      try {
        JsBarcode(el as SVGElement, code, {
          format: 'EAN13',
          displayValue: false,
          width: barWidth,
          height: barHeight,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch {
        /* 无效条码则留空 */
      }
    });
  }, [codes, formatId, barWidth, barHeight]);

  // 标签网格在 A4 纸上居中
  const padTopMm = (297 - fmt.rows * fmt.hMm) / 2;
  const padSideMm = (210 - fmt.cols * fmt.wMm) / 2;

  return (
    <div className="min-h-screen bg-[#e9ebf5] py-6 text-[#1a1c40] print:bg-white print:py-0">
      <style>{`
        .label-sheet {
          background: #ffffff;
          box-sizing: border-box;
          margin: 0 auto 10mm;
          box-shadow: 0 4px 24px rgba(45,47,146,0.12);
        }
        .label-cell {
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .label-cell svg { display: block; max-width: 100%; }
        .label-code {
          margin-top: 1mm;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 3.1mm;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #000000;
          white-space: nowrap;
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .no-print { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .label-sheet { margin: 0 auto; box-shadow: none; break-after: page; page-break-after: always; }
          .label-sheet:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex w-full max-w-[900px] flex-wrap items-center gap-3 px-4">
        <Link href="/books/barcodes" className="text-[13px] text-[#5b5f94] hover:text-cocm-ink">
          {isZh ? '← 返回备用条码库' : '← Back to spare barcodes'}
        </Link>
        <label className="flex items-center gap-2 text-[13px] text-[#5b5f94]">
          {isZh ? '版式' : 'Format'}
          <select
            value={formatId}
            onChange={(e) => setFormatId(e.target.value)}
            className="h-9 rounded-[10px] border border-cocm-ink/10 bg-white px-2 text-[13px] text-cocm-ink"
          >
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>{isZh ? f.nameZh : f.nameEn}</option>
            ))}
          </select>
        </label>
        <span className="text-[13px] text-[#5b5f94]">
          {isZh ? `共 ${codes.length} 个条码，${pages.length} 页` : `${codes.length} codes, ${pages.length} pages`}
        </span>
        <button
          onClick={() => window.print()}
          className="ml-auto rounded-full bg-cocm-ink px-5 py-2 text-[13px] font-medium text-white hover:opacity-90"
        >
          {isZh ? '打印' : 'Print'}
        </button>
      </div>

      <p className="no-print mx-auto mb-6 w-full max-w-[900px] px-4 text-[12px] leading-relaxed text-[#5b5f94]">
        {isZh
          ? `打印设置：纸张 A4、纵向，边距选"无"，缩放 100%（${fmt.nameZh}）。建议先用普通纸打一页，对着标签纸透光比对位置再批量打。`
          : `Print settings: A4 portrait, margins "None", scale 100% (${fmt.nameEn}). Test one page on plain paper first.`}
      </p>

      {codes.length === 0 ? (
        <p className="mx-auto max-w-[900px] px-4 text-[13px] text-[#5b5f94]">
          {isZh ? '没有可打印的条码' : 'No barcodes to print'}
        </p>
      ) : (
        <div ref={wrapRef} className="overflow-x-auto px-4 print:overflow-visible print:px-0">
          {pages.map((pageCodes, pi) => (
            <div
              key={`${formatId}-${pi}`}
              className="label-sheet"
              style={{
                width: '210mm',
                height: '297mm',
                padding: `${padTopMm}mm ${padSideMm}mm`,
                display: 'grid',
                gridTemplateColumns: `repeat(${fmt.cols}, ${fmt.wMm}mm)`,
                gridTemplateRows: `repeat(${fmt.rows}, ${fmt.hMm}mm)`,
              }}
            >
              {pageCodes.map((code) => (
                <div
                  key={code}
                  className="label-cell"
                  style={{ width: `${fmt.wMm}mm`, height: `${fmt.hMm}mm`, padding: '1.5mm 2mm' }}
                >
                  <svg data-code={code} role="img" aria-label={code} />
                  <span className="label-code">{code}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
