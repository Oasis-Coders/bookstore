'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n/use-t';
import { LABEL_FORMATS, chunk } from '../barcodes/print/label-format';
import { normalizeAddressLines, expandAddressCopies } from './address-labels-utils';

/**
 * 地址标签打印 —— LL21 版式。
 * 手动填写最多 5 行的标准英国邮寄地址，选择打印份数；同张地址重复打印。
 * 打印时请选择：A4、纵向、边距"无"、缩放 100%。
 */
const COPY_PRESETS = [1, 2, 3, 4, 5, 6, 7, 14, 21];

export function AddressLabelsClient() {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [address, setAddress] = useState('');
  const [preset, setPreset] = useState('1');
  const [customCopies, setCustomCopies] = useState('2');

  const copies = preset === 'custom' ? parseInt(customCopies, 10) || 1 : parseInt(preset, 10) || 1;
  const lines = normalizeAddressLines(address);
  const tags = expandAddressCopies(lines, copies);

  const fmt = LABEL_FORMATS[0]; // LL21 63.5×38.1mm，每页 21 张
  const perPage = fmt.cols * fmt.rows;
  const pages = chunk(tags, perPage);

  const padTopMm = (297 - fmt.rows * fmt.hMm) / 2;
  const padSideMm = (210 - fmt.cols * fmt.wMm) / 2;
  const lineFontMm = 4;

  return (
    <div className="text-[#1a1c40]">
      <style>{`
        .label-sheet {
          background: #ffffff;
          box-sizing: border-box;
          margin: 0 auto 10mm;
          box-shadow: 0 4px 24px rgba(45,47,146,0.12);
        }
        .addr-cell {
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 1.5mm 2.5mm;
        }
        .addr-line {
          font-weight: 600;
          color: #000000;
          line-height: 1.35;
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

      <div className="no-print mx-auto mb-4 w-full max-w-[900px] px-4">
        <div className="rounded-[14px] bg-white p-4 shadow-[0_2px_12px_rgba(45,47,146,0.08)]">
          <p className="mb-2 text-[13px] font-medium text-cocm-ink">
            {isZh ? '邮寄地址（最多 5 行，例如：收件人、门牌+街道、区、市、邮编）' : 'Postal address (up to 5 lines, e.g. name, street, district, city, postcode)'}
          </p>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={5}
            placeholder={
              isZh
                ? '张三\nFlat 3, 12 Baker Street\nWestminster\nLondon\nNW1 6XE'
                : 'John Smith\nFlat 3, 12 Baker Street\nWestminster\nLondon\nNW1 6XE'
            }
            className="w-full rounded-[10px] border border-cocm-ink/10 bg-white px-3 py-2 text-[13px] leading-relaxed text-cocm-ink outline-none focus:border-cocm-ink/40"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[13px] text-[#5b5f94]">
              {isZh ? '打印份数' : 'Copies'}
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="h-9 rounded-[10px] border border-cocm-ink/10 bg-white px-2 text-[13px] text-cocm-ink"
              >
                {COPY_PRESETS.map((n) => (
                  <option key={n} value={String(n)}>
                    ×{n}
                  </option>
                ))}
                <option value="custom">{isZh ? '自定义…' : 'Custom…'}</option>
              </select>
            </label>
            {preset === 'custom' && (
              <input
                type="number"
                min={1}
                max={999}
                value={customCopies}
                onChange={(e) =>
                  setCustomCopies(e.target.value.replace(/\D/g, '').slice(0, 3))
                }
                placeholder={isZh ? '手动填写份数' : 'Enter copies'}
                inputMode="numeric"
                className="h-9 w-32 rounded-[10px] border border-cocm-ink/10 bg-white px-3 text-[13px] text-cocm-ink outline-none focus:border-cocm-ink/40"
              />
            )}
            <span className="text-[13px] text-[#5b5f94]">
              {isZh ? `将打印 ${tags.length} 张标签，${pages.length} 页` : `${tags.length} labels, ${pages.length} pages`}
            </span>
            <button
              onClick={() => window.print()}
              disabled={lines.length === 0}
              className="ml-auto rounded-full bg-cocm-ink px-5 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isZh ? '打印' : 'Print'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[#5b5f94]">
          {isZh
            ? `打印设置：纸张 A4、纵向，边距选"无"，缩放 100%（${fmt.nameZh}）。建议先用普通纸打一页，对着标签纸透光比对位置再批量打。`
            : `Print settings: A4 portrait, margins "None", scale 100% (${fmt.nameEn}). Test one page on plain paper first.`}
        </p>
      </div>

      {lines.length === 0 ? (
        <p className="no-print mx-auto max-w-[900px] px-4 text-[13px] text-[#5b5f94]">
          {isZh ? '上面填写地址后，这里会显示标签预览' : 'Enter the address above to preview the labels'}
        </p>
      ) : (
        <div className="overflow-x-auto px-4 print:overflow-visible print:px-0">
          {pages.map((pageTags, pi) => (
            <div
              key={`ll21-${pi}`}
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
              {pageTags.map((tagLines, ci) => (
                <div
                  key={`${pi}-${ci}`}
                  className="addr-cell"
                  style={{ width: `${fmt.wMm}mm`, height: `${fmt.hMm}mm` }}
                >
                  {tagLines.map((line, li) => (
                    <span key={li} className="addr-line" style={{ fontSize: `${lineFontMm}mm` }}>
                      {line}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
