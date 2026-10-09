'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n/use-t';
import { LABEL_FORMATS, chunk } from '../barcodes/print/label-format';

/**
 * 价格标签打印 —— LL21 版式，每张标签手动填写书代码 + 售价。
 * 打印时请选择：A4、纵向、边距"无"、缩放 100%。
 */
type Tag = { code: string; price: string; qty: number };

const emptyRow = (): Tag => ({ code: '', price: '', qty: 1 });

export function PriceTagsClient() {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [formatId, setFormatId] = useState(LABEL_FORMATS[0].id);
  const [rows, setRows] = useState<Tag[]>(() => Array.from({ length: 6 }, emptyRow));

  const fmt = LABEL_FORMATS.find((f) => f.id === formatId) || LABEL_FORMATS[0];
  const perPage = fmt.cols * fmt.rows;

  // 只打印至少填了一项的行，每行按数量重复
  const tags = rows.flatMap((r) =>
    r.code.trim() || r.price.trim()
      ? Array.from({ length: Math.min(999, Math.max(1, r.qty || 1)) }, () => ({ code: r.code, price: r.price }))
      : []
  );
  const pages = chunk(tags, perPage);

  const padTopMm = (297 - fmt.rows * fmt.hMm) / 2;
  const padSideMm = (210 - fmt.cols * fmt.wMm) / 2;
  const priceFontMm = fmt.wMm >= 90 ? 9 : 7.5;

  const setRow = (i: number, field: keyof Tag, v: string | number) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: v } : r)));
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, j) => j !== i));
  const clearAll = () => setRows([emptyRow()]);

  const cleanPrice = (p: string) => p.trim().replace(/^£\s*/, '');

  return (
    <div className="text-[#1a1c40]">
      <style>{`
        .label-sheet {
          background: #ffffff;
          box-sizing: border-box;
          margin: 0 auto 10mm;
          box-shadow: 0 4px 24px rgba(45,47,146,0.12);
        }
        .price-cell {
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2mm 3mm;
        }
        .price-code {
          font-size: 3.2mm;
          font-weight: 600;
          color: #33334d;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: 0.04em;
        }
        .price-value {
          margin-top: 1mm;
          font-weight: 800;
          color: #000000;
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .no-print { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
          .label-sheet { margin: 0 auto; box-shadow: none; break-after: page; page-break-after: always; }
          .label-sheet:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex w-full max-w-[900px] flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[13px] text-[#5b5f94]">
          {isZh ? '版式' : 'Format'}
          <select
            value={formatId}
            onChange={(e) => setFormatId(e.target.value)}
            className="h-9 rounded-[10px] border border-cocm-ink/10 bg-white px-2 text-[13px] text-cocm-ink"
          >
            {LABEL_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>{isZh ? f.nameZh : f.nameEn}</option>
            ))}
          </select>
        </label>
        <span className="text-[13px] text-[#5b5f94]">
          {isZh ? `将打印 ${tags.length} 张标签，${pages.length} 页` : `${tags.length} tags, ${pages.length} pages`}
        </span>
        <button
          onClick={() => window.print()}
          disabled={tags.length === 0}
          className="ml-auto rounded-full bg-cocm-ink px-5 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isZh ? '打印' : 'Print'}
        </button>
      </div>

      <div className="no-print mx-auto mb-4 w-full max-w-[900px] px-4">
        <div className="rounded-[14px] bg-white p-4 shadow-[0_2px_12px_rgba(45,47,146,0.08)]">
          <p className="mb-3 text-[12px] leading-relaxed text-[#5b5f94]">
            {isZh
              ? '每行一张标签：填写书代码和售价，"× 数量"可重复打印同一张（只填了一项的行也会打印，完全空着的行不打印）。'
              : 'One row per tag: enter the book code and price; "× copies" repeats the same tag. Rows with at least one field are printed; fully empty rows are skipped.'}
          </p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right text-[12px] text-[#5b5f94]">{i + 1}</span>
                <input
                  value={r.code}
                  onChange={(e) => setRow(i, 'code', e.target.value)}
                  placeholder={isZh ? '书代码（如 BOOK-330683）' : 'Book code'}
                  className="h-9 min-w-0 flex-1 rounded-[10px] border border-cocm-ink/10 bg-white px-3 text-[13px] text-cocm-ink outline-none focus:border-cocm-ink/40"
                />
                <input
                  value={r.price}
                  onChange={(e) => setRow(i, 'price', e.target.value)}
                  placeholder={isZh ? '售价（如 12.99）' : 'Price'}
                  inputMode="decimal"
                  className="h-9 w-32 shrink-0 rounded-[10px] border border-cocm-ink/10 bg-white px-3 text-[13px] text-cocm-ink outline-none focus:border-cocm-ink/40"
                />
                <label className="flex shrink-0 items-center gap-1 text-[12px] text-[#5b5f94]" title={isZh ? '打印数量' : 'Copies'}>
                  ×
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={r.qty}
                    onChange={(e) => setRow(i, 'qty', Math.min(999, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                    className="h-9 w-16 rounded-[10px] border border-cocm-ink/10 bg-white px-2 text-[13px] text-cocm-ink outline-none focus:border-cocm-ink/40"
                  />
                </label>
                <button
                  onClick={() => removeRow(i)}
                  title={isZh ? '删除此行' : 'Remove row'}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[16px] text-[#5b5f94] hover:bg-cocm-paper hover:text-cocm-ink"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={addRow}
              className="rounded-[10px] border border-cocm-ink/15 px-3 py-1.5 text-[12px] font-medium text-cocm-ink hover:bg-white"
            >
              {isZh ? '＋ 添加一行' : '+ Add row'}
            </button>
            <button
              onClick={clearAll}
              className="rounded-[10px] px-3 py-1.5 text-[12px] text-[#5b5f94] hover:text-cocm-ink"
            >
              {isZh ? '清空' : 'Clear'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[#5b5f94]">
          {isZh
            ? `打印设置：纸张 A4、纵向，边距选"无"，缩放 100%（${fmt.nameZh}）。建议先用普通纸打一页，对着标签纸透光比对位置再批量打。`
            : `Print settings: A4 portrait, margins "None", scale 100% (${fmt.nameEn}). Test one page on plain paper first.`}
        </p>
      </div>

      {tags.length === 0 ? (
        <p className="no-print mx-auto max-w-[900px] px-4 text-[13px] text-[#5b5f94]">
          {isZh ? '上面填写后，这里会显示标签预览' : 'Fill in rows above to preview the tags'}
        </p>
      ) : (
        <div className="overflow-x-auto px-4 print:overflow-visible print:px-0">
          {pages.map((pageTags, pi) => (
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
              {pageTags.map((t, ci) => (
                <div
                  key={`${pi}-${ci}`}
                  className="price-cell"
                  style={{ width: `${fmt.wMm}mm`, height: `${fmt.hMm}mm` }}
                >
                  {t.code.trim() && <span className="price-code">{t.code.trim()}</span>}
                  {t.price.trim() && (
                    <span className="price-value" style={{ fontSize: `${priceFontMm}mm` }}>
                      £{cleanPrice(t.price)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
