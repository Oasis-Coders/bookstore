'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import JsBarcode from 'jsbarcode';
import { useT } from '@/lib/i18n/use-t';

/**
 * 备用条码打印页 —— 按 LL21 不干胶标签纸排版。
 * 标签 63.5mm × 38.1mm，A4 每页 3 列 × 7 行 = 21 张。
 * 打印时请选择：A4、纵向、边距"无"、缩放 100%。
 */
const COLS = 3;
const ROWS = 7;
const PER_PAGE = COLS * ROWS; // 21

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function PrintBarcodesClient({ codes }: { codes: string[] }) {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.querySelectorAll('svg[data-code]').forEach((el) => {
      const code = (el as SVGElement).dataset.code || '';
      try {
        JsBarcode(el as SVGElement, code, {
          format: 'EAN13',
          displayValue: false,
          width: 1.6, // 窄条约 0.42mm，EAN-13 允差范围内
          height: 56,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch {
        /* 无效条码则留空 */
      }
    });
  }, [codes]);

  const pages = chunk(codes, PER_PAGE);

  return (
    <div className="min-h-screen bg-[#e9ebf5] py-6 text-[#1a1c40] print:bg-white print:py-0">
      <style>{`
        .label-sheet {
          width: 210mm;
          height: 297mm;
          box-sizing: border-box;
          background: #ffffff;
          padding: 15.15mm 9.75mm;
          display: grid;
          grid-template-columns: repeat(3, 63.5mm);
          grid-template-rows: repeat(7, 38.1mm);
          margin: 0 auto 10mm;
          box-shadow: 0 4px 24px rgba(45,47,146,0.12);
        }
        .label-cell {
          width: 63.5mm;
          height: 38.1mm;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5mm 2mm;
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
        <span className="text-[13px] text-[#5b5f94]">
          {isZh
            ? `共 ${codes.length} 个条码，${pages.length} 页（LL21 标签纸 63.5×38.1mm，每页 21 张）`
            : `${codes.length} codes, ${pages.length} pages (LL21 63.5×38.1mm, 21 per sheet)`}
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
          ? '打印设置：纸张 A4、纵向，边距选"无"，缩放 100%。建议先用普通纸打一页，对着标签纸透光比对位置再批量打。'
          : 'Print settings: A4 portrait, margins "None", scale 100%. Test one page on plain paper against the label sheet first.'}
      </p>

      {codes.length === 0 ? (
        <p className="mx-auto max-w-[900px] px-4 text-[13px] text-[#5b5f94]">
          {isZh ? '没有可打印的条码' : 'No barcodes to print'}
        </p>
      ) : (
        <div ref={wrapRef} className="overflow-x-auto px-4 print:overflow-visible print:px-0">
          {pages.map((pageCodes, pi) => (
            <div key={pi} className="label-sheet">
              {pageCodes.map((code) => (
                <div key={code} className="label-cell">
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
