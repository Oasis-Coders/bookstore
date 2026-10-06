'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ensurePublisherSuppliers } from '@/lib/ensure-publisher-supplier';

export default function BulkImportPage() {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [syncNotes, setSyncNotes] = useState<string[]>([]);
  const [detectedEncoding, setDetectedEncoding] = useState('');
  const [encodingWarning, setEncodingWarning] = useState('');

  // Decode an uploaded CSV buffer: BOM sniffing first (UTF-8 / UTF-16),
  // then strict UTF-8, fall back to GBK (Excel on Chinese Windows saves CSV
  // as GBK/ANSI by default).
  const decodeCsvBuffer = (buf: ArrayBuffer): { text: string; encoding: string } => {
    const bytes = new Uint8Array(buf);
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
      return { text: new TextDecoder('utf-8').decode(bytes.slice(3)), encoding: 'UTF-8' }; // strip UTF-8 BOM
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe)
      return { text: new TextDecoder('utf-16le').decode(bytes.slice(2)), encoding: 'UTF-16' };
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff)
      return { text: new TextDecoder('utf-16be').decode(bytes.slice(2)), encoding: 'UTF-16' };
    try {
      return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'UTF-8' };
    } catch {
      return { text: new TextDecoder('gbk').decode(bytes), encoding: 'GBK' };
    }
  };

  // 标准 CSV 解析：正确处理引号字段内的逗号、转义引号（""）和换行。
  // 之前用的 line.split(',') 会把 "李道生 Lee Tao Shen" 这样的作者拆散，
  // 导致后面所有列整体错位（出版社变成 8.4 这种数字）。
  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else if (c === '\r') {
        // 忽略 \r，\n 会处理换行
      } else {
        field += c;
      }
    }
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { text, encoding } = decodeCsvBuffer(ev.target?.result as ArrayBuffer);
      setDetectedEncoding(encoding);
      // The file itself may already carry corrupted chars (e.g. saved through a
      // lossy encoding step in Excel, turning Chinese into "?"). Flag it early.
      const corruptedCells = (text.match(/[?�]{2,}/g) || []).length;
      setEncodingWarning(
        text.includes('�')
          ? (isZh ? '文件中已包含损坏字符（�），原表格可能在保存时编码出错，请检查后重新保存再上传。' : 'File already contains corrupted characters (�). Re-save the spreadsheet with the correct encoding and upload again.')
          : corruptedCells > 3
            ? (isZh ? '文件中出现较多连续问号，书名可能已在表格保存时损坏，请核对原表格。' : 'Many consecutive "?" found — titles may have been corrupted when the spreadsheet was saved. Please verify the source file.')
            : ''
      );
      const grid = parseCsv(text);
      const headers = (grid[0] || []).map(h => h.trim().toLowerCase());
      const rows: any[] = [];
      const badRows: number[] = [];
      grid.slice(1).forEach((vals, idx) => {
        if (vals.length === 1 && vals[0].trim() === '') return; // 空行跳过
        if (vals.length !== headers.length) { badRows.push(idx + 2); return; } // 列数不对的行跳过并提示
        const obj: any = {};
        headers.forEach((h, i) => obj[h] = (vals[i] ?? '').trim());
        rows.push(obj);
      });
      if (badRows.length > 0) {
        const colWarning = isZh
          ? `第 ${badRows.slice(0, 10).join('、')} 行${badRows.length > 10 ? `等共 ${badRows.length} 行` : ''}列数与表头不符，已跳过未导入，请检查这些行的逗号/引号。`
          : `Row ${badRows.slice(0, 10).join(', ')}${badRows.length > 10 ? ` (${badRows.length} rows total)` : ''} have wrong column counts and were skipped. Check commas/quotes in those rows.`;
        setEncodingWarning((prev) => prev ? `${prev}\n${colWarning}` : colWarning);
      }
      setPreview(rows);
      setResult('');
      setImportErrors([]);
      setSyncNotes([]);
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    // BOM (\uFEFF) 让 Excel 直接按 UTF-8 打开，中文不再乱码。
    // unit_cost（进货价）只用于首次启用系统时把现有库存一起导入；之后每笔采购的进货价在收货时手动填写。
    // isbn 会写入图书的 ISBN 栏（扫码枪扫出的条码也可直接用作代号）。
    const csv = '\uFEFF' + 'sku,isbn,title,title_en,title_simplified,title_traditional,author,publisher,category,shelf_position,warehouse_location,current_price,unit_cost,low_stock_threshold,initial_stock\nBOOK-001,9781234567890,活水得胜之路,The Way of Victory,活水得胜之路,活水得勝之路,张牧师,活水出版社,灵修,A-3-2,仓库A-1,12.5,7.8,5,10\nBOOK-002,,认识真理,Knowing the Truth,认识真理,認識真理,李弟兄,福音出版社,神学,B-1-5,仓库B-3,9.99,6.0,3,5';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setResult('');
    setImportErrors([]);
    setSyncNotes([]);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error(isZh ? '未连接数据库' : 'Not connected to database');
      
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error(isZh ? '请先登录' : 'Please login first');

      let successCount = 0;
      const errors: string[] = [];

      for (const row of preview) {
        if (!row.sku || !row.title) {
          errors.push(`${row.sku || '?' }: ${isZh ? '缺少代号或书名' : 'Missing Code or title'}`);
          continue;
        }
        const { data: existing } = await supabase.from('books').select('id').eq('sku', row.sku).maybeSingle();
        if (existing) {
          const updatePayload: any = {
            title: row.title,
            title_en: row.title_en || null,
            title_simplified: row.title_simplified || null,
            title_traditional: row.title_traditional || null,
            author: row.author || null,
            publisher: row.publisher || null,
            category: row.category || null,
            shelf_position: row.shelf_position || null,
            warehouse_location: row.warehouse_location || null,
            current_price: row.current_price ? Number(row.current_price) : 0,
            low_stock_threshold: row.low_stock_threshold ? Number(row.low_stock_threshold) : 5,
          };
          // ISBN 只在表格里填了时才更新，避免复导入把已有的 ISBN 清空
          if (row.isbn) updatePayload.isbn13 = row.isbn;
          const { error } = await supabase.from('books').update(updatePayload).eq('id', existing.id);
          if (error) errors.push(`${row.sku}: ${error.message}`);
          else successCount++;
        } else {
          const { data: newBook, error } = await supabase.from('books').insert({
            sku: row.sku,
            isbn13: row.isbn || null,
            title: row.title,
            title_en: row.title_en || null,
            title_simplified: row.title_simplified || null,
            title_traditional: row.title_traditional || null,
            author: row.author || null,
            publisher: row.publisher || null,
            category: row.category || null,
            shelf_position: row.shelf_position || null,
            warehouse_location: row.warehouse_location || null,
            current_price: row.current_price ? Number(row.current_price) : 0,
            low_stock_threshold: row.low_stock_threshold ? Number(row.low_stock_threshold) : 5,
            is_active: true,
          }).select('id').single();
          if (error) {
            errors.push(`${row.sku}: ${error.message}`);
            continue;
          }
          successCount++;
          // Handle initial stock via inventory batch if provided
          const initStock = Number(row.initial_stock || 0);
          if (initStock > 0 && newBook?.id) {
            // Create a simple inventory batch - needs a location, use first active location or fallback
            const { data: loc } = await supabase.from('locations').select('id').eq('is_active', true).limit(1).maybeSingle();
            if (loc?.id) {
              const { error: batchError } = await supabase.from('inventory_batches').insert({
                book_id: newBook.id,
                location_id: loc.id,
                batch_code: `IMPORT-${row.sku}-${Date.now()}`,
                // 进货价：优先用表格里的 unit_cost（首次启用导入现有库存）；没填则沿用旧的估算
                unit_cost: row.unit_cost ? Number(row.unit_cost) : (row.current_price ? Number(row.current_price) * 0.6 : 5),
                quantity_received: initStock,
                quantity_remaining: initStock,
                created_by: userId,
                source_type: 'purchase',
              });
              if (batchError) errors.push(`${row.sku}: ${isZh ? '初始库存入库失败：' : 'Initial stock failed: '}${batchError.message}`);
            } else {
              errors.push(`${row.sku}: ${isZh ? '初始库存未入库：没有可用库位' : 'Initial stock skipped: no active location'}`);
            }
          }
        }
      }
      // 出版社自动同步为供应商：模板里 Publisher 列出现的新出版社名，
      // 自动建进供应商表，之后在采购单/供应商页面的下拉里可直接选用，免去手动添加。
      const notes: string[] = [];
      try {
        const publishers = preview.map(r => r.publisher).filter(Boolean);
        const { created, warnings } = await ensurePublisherSuppliers(supabase, publishers);
        if (created.length > 0) {
          notes.push(`${isZh ? '以下出版社已自动同步为供应商：' : 'Auto-synced as suppliers: '}${created.join('、')}`);
        }
        for (const w of warnings) notes.push(`${isZh ? '供应商同步提醒：' : 'Supplier sync note: '}${w}`);
      } catch (e: any) {
        notes.push(`${isZh ? '供应商同步失败：' : 'Supplier sync failed: '}${e?.message || ''}`);
      }
      setSyncNotes(notes);
      setImportErrors(errors);
      setResult(isZh ? `导入完成：成功 ${successCount} 本，失败 ${errors.length} 本` : `Import complete: ${successCount} succeeded, ${errors.length} failed`);
    } catch (e: any) {
      setResult(e.message || (isZh ? '导入失败' : 'Import failed'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell title={isZh ? '批量导入' : 'Bulk Import'} titleZh="批量导入" eyebrow={isZh ? '从表格导入图书' : 'Import from Spreadsheet'}>
      <div className="mx-auto max-w-[800px] space-y-4">
        <Link href="/books" className="inline-flex items-center text-[13px] text-[#5b5f94] hover:text-cocm-ink">{isZh ? '← 返回书库' : '← Back to Books'}</Link>
        
        <Card>
          <CardTitle>{isZh ? '从表格批量导入图书' : 'Bulk Import from Spreadsheet'}</CardTitle>
          <div className="mt-4 space-y-4 text-[13px]">
            <div className="rounded-[12px] bg-cocm-paper p-4">
              <p className="font-semibold text-cocm-ink">{isZh ? '步骤：' : 'Steps:'}</p>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-[#5b5f94]">
                <li>{isZh ? '在表格中整理好书库，按模板格式保存为CSV' : 'Organize books in spreadsheet, save as CSV per template'}</li>
                <li>{isZh ? '点击下载模板查看必填字段' : 'Download template to see required fields'}</li>
                <li>{isZh ? '上传CSV文件（自动识别 UTF-8 / UTF-16 / GBK 编码），预览后确认导入' : 'Upload CSV (auto-detects UTF-8 / UTF-16 / GBK encoding), preview, then confirm import'}</li>
                <li>{isZh ? '支持中英文、简繁体、书架位置、初始库存、进货价、ISBN' : 'Supports EN/ZH, simplified/traditional, shelf position, initial stock, unit cost, ISBN'}</li>
                <li>{isZh ? '进货价（unit_cost）只用于首次启用时导入现有库存；之后每笔采购的进货价在收货时手动填写' : 'unit_cost is only for the initial go-live import; later purchase costs are entered at receipt'}</li>
                <li>{isZh ? '外接扫码枪：USB扫码器可直接扫ISBN，自动填入代号' : 'Barcode: USB scanners work directly, scanning ISBN auto-fills code'}</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={downloadTemplate}>{isZh ? '下载模板' : 'Download Template'}</Button>
              <label className="inline-flex h-9 items-center rounded-[12px] border border-cocm-ink/15 px-4 text-[13px] font-semibold cursor-pointer hover:bg-cocm-paper">
                {isZh ? '选择文件' : 'Choose File'}
                <input type="file" accept=".csv" onChange={handleFile} className="sr-only" />
              </label>
              {preview.length > 0 && <Button size="sm" onClick={handleImport} disabled={importing}>{importing ? (isZh ? '导入中...' : 'Importing...') : (isZh ? `确认导入 ${preview.length} 本` : `Confirm Import ${preview.length} books`)}</Button>}
            </div>
            {detectedEncoding && (
              <p className="text-[11px] text-[#5b5f94]">{isZh ? `检测到文件编码：${detectedEncoding}` : `Detected file encoding: ${detectedEncoding}`}</p>
            )}
            {encodingWarning && (
              <div className="rounded-[10px] bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-800">{encodingWarning}</div>
            )}

            {result && <div className={`rounded-[10px] px-3 py-2 text-[12px] ${result.includes('失败') || result.toLowerCase().includes('fail') ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>{result}</div>}
            {syncNotes.length > 0 && <div className="rounded-[10px] bg-blue-50 border border-blue-200 px-3 py-2 text-[12px] text-blue-800">{syncNotes.map((n,i)=><div key={i}>{n}</div>)}</div>}
            {importErrors.length > 0 && <div className="rounded-[10px] bg-red-50 p-3 text-[11px] text-red-700 max-h-[120px] overflow-auto">{importErrors.map((e,i)=><div key={i}>{e}</div>)}</div>}

            {preview.length > 0 && (
              <div>
                <p className="font-semibold mb-2">{isZh ? `预览（共 ${preview.length} 条）：` : `Preview (total ${preview.length} rows):`}</p>
                <div className="overflow-auto border rounded-[12px] max-h-[480px]">
                  <table className="w-full text-[11px]">
                    <thead className="bg-cocm-paper">
                      <tr>{Object.keys(preview[0] || {}).map(k => <th key={k} className="px-2 py-1 text-left font-semibold">{k}</th>)}</tr>
                    </thead>
                    <tbody>{preview.map((r, i) => <tr key={i} className="border-t">{Object.values(r).map((v: any, j) => <td key={j} className="px-2 py-1 truncate max-w-[120px]">{v}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-[12px] border border-cocm-ink/10 bg-white p-3">
              <p className="text-[12px] font-semibold text-cocm-ink">{isZh ? '扫码枪支持' : 'Barcode Scanner Support'}</p>
              <p className="mt-1 text-[11px] text-[#5b5f94]">{isZh ? '系统支持标准USB扫码器（键盘模式）。扫码枪扫出的条码会自动输入到搜索框并回车搜索，无需额外驱动。建议扫码枪设置为以回车结尾。' : 'System supports standard USB barcode scanners (keyboard mode). Scanner input auto-enters search box and submits. No driver needed. Set scanner to suffix with Enter.'}</p>
            </div>

            <div className="rounded-[12px] border border-cocm-ink/10 bg-white p-3">
              <p className="text-[12px] font-semibold text-cocm-ink">{isZh ? '售价改动说明' : 'Price Change Note'}</p>
              <p className="mt-1 text-[11px] text-[#5b5f94]">{isZh ? '每本书的现售价改动不会影响已售出的书。已售订单的单价在销售时已保存，改价只影响新订单。库存成本按批次进货价独立计算，与现售价无关。' : 'Changing current price does NOT affect past sales. Past orders have unit_price saved at sale time. Price change only affects new orders. Inventory cost is per-batch purchase cost, independent of current price.'}</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
