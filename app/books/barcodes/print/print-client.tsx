'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import JsBarcode from 'jsbarcode';
import { useT } from '@/lib/i18n/use-t';

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
          height: 52,
          margin: 4,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch {
        /* 无效条码则留空 */
      }
    });
  }, [codes]);

  return (
    <div className="min-h-screen bg-white p-6 text-[#1a1c40]">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 8mm; }
          body { -webkit-print-color-adjust: exact; }
        }
        .barcode-label { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      <div className="no-print mx-auto mb-6 flex max-w-[900px] flex-wrap items-center gap-3">
        <Link href="/books/barcodes" className="text-[13px] text-[#5b5f94] hover:text-cocm-ink">
          {isZh ? '← 返回备用条码库' : '← Back to spare barcodes'}
        </Link>
        <span className="text-[13px] text-[#5b5f94]">
          {isZh ? `共 ${codes.length} 个条码` : `${codes.length} codes`}
        </span>
        <button
          onClick={() => window.print()}
          className="ml-auto rounded-full bg-cocm-ink px-5 py-2 text-[13px] font-medium text-white hover:opacity-90"
        >
          {isZh ? '打印' : 'Print'}
        </button>
      </div>

      {codes.length === 0 ? (
        <p className="mx-auto max-w-[900px] text-[13px] text-[#5b5f94]">
          {isZh ? '没有可打印的条码' : 'No barcodes to print'}
        </p>
      ) : (
        <div ref={wrapRef} className="mx-auto grid max-w-[900px] grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3">
          {codes.map((code) => (
            <div
              key={code}
              className="barcode-label flex flex-col items-center rounded-[8px] border border-black/10 px-2 py-3 print:border-black/20"
            >
              <svg data-code={code} className="h-[56px] w-full" role="img" aria-label={code} />
              <span className="mt-1 font-mono text-[13px] font-semibold tracking-wider">{code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
