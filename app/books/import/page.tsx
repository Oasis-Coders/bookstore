'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function BulkImportPage() {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((h, i) => obj[h] = vals[i] || '');
        return obj;
      });
      setPreview(rows);
      setResult('');
      setImportErrors([]);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = 'sku,title,title_en,title_simplified,title_traditional,author,publisher,category,shelf_position,current_price,low_stock_threshold,initial_stock\nBOOK-001,活水得胜之路,The Way of Victory,活水得胜之路,活水得勝之路,张牧师,活水出版社,灵修,A-3-2,12.5,5,10\nBOOK-002,认识真理,Knowing the Truth,认识真理,認識真理,李弟兄,福音出版社,神学,B-1-5,9.99,3,5';
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
          errors.push(`${row.sku || '?' }: ${isZh ? '缺少SKU或书名' : 'Missing SKU or title'}`);
          continue;
        }
        const { data: existing } = await supabase.from('books').select('id').eq('sku', row.sku).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('books').update({
            title: row.title,
            title_en: row.title_en || null,
            title_simplified: row.title_simplified || null,
            title_traditional: row.title_traditional || null,
            author: row.author || null,
            publisher: row.publisher || null,
            category: row.category || null,
            shelf_position: row.shelf_position || null,
            current_price: row.current_price ? Number(row.current_price) : 0,
            low_stock_threshold: row.low_stock_threshold ? Number(row.low_stock_threshold) : 5,
          }).eq('id', existing.id);
          if (error) errors.push(`${row.sku}: ${error.message}`);
          else successCount++;
        } else {
          const { data: newBook, error } = await supabase.from('books').insert({
            sku: row.sku,
            title: row.title,
            title_en: row.title_en || null,
            title_simplified: row.title_simplified || null,
            title_traditional: row.title_traditional || null,
            author: row.author || null,
            publisher: row.publisher || null,
            category: row.category || null,
            shelf_position: row.shelf_position || null,
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
              await supabase.from('inventory_batches').insert({
                book_id: newBook.id,
                location_id: loc.id,
                batch_code: `IMPORT-${row.sku}-${Date.now()}`,
                unit_cost: row.current_price ? Number(row.current_price) * 0.6 : 5,
                quantity_received: initStock,
                quantity_remaining: initStock,
                created_by: userId,
                source_type: 'purchase',
              });
            }
          }
        }
      }
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
        <Link href="/books" className="inline-flex items-center text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">{isZh ? '← 返回书库' : '← Back to Books'}</Link>
        
        <Card>
          <CardTitle>{isZh ? '从表格批量导入图书' : 'Bulk Import from Spreadsheet'}</CardTitle>
          <div className="mt-4 space-y-4 text-[13px]">
            <div className="rounded-[12px] bg-[#faf6ee] p-4">
              <p className="font-semibold text-[#0f3d2e]">{isZh ? '步骤：' : 'Steps:'}</p>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-[#4f7a5c]">
                <li>{isZh ? '在表格中整理好书库，按模板格式保存为CSV' : 'Organize books in spreadsheet, save as CSV per template'}</li>
                <li>{isZh ? '点击下载模板查看必填字段' : 'Download template to see required fields'}</li>
                <li>{isZh ? '上传CSV文件，预览后确认导入' : 'Upload CSV, preview, then confirm import'}</li>
                <li>{isZh ? '支持中英文、简繁体、书架位置、初始库存' : 'Supports EN/ZH, simplified/traditional, shelf position, initial stock'}</li>
                <li>{isZh ? '外接扫码枪：USB扫码器可直接扫ISBN，自动填入代号' : 'Barcode: USB scanners work directly, scanning ISBN auto-fills code'}</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={downloadTemplate}>{isZh ? '下载模板' : 'Download Template'}</Button>
              <label className="inline-flex h-9 items-center rounded-[12px] border border-[#0f3d2e]/15 px-4 text-[13px] font-semibold cursor-pointer hover:bg-[#faf6ee]">
                {isZh ? '选择文件' : 'Choose File'}
                <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
              </label>
              {preview.length > 0 && <Button size="sm" onClick={handleImport} disabled={importing}>{importing ? (isZh ? '导入中...' : 'Importing...') : (isZh ? `确认导入 ${preview.length} 本` : `Confirm Import ${preview.length} books`)}</Button>}
            </div>

            {result && <div className={`rounded-[10px] px-3 py-2 text-[12px] ${result.includes('失败') || result.toLowerCase().includes('fail') ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>{result}</div>}
            {importErrors.length > 0 && <div className="rounded-[10px] bg-red-50 p-3 text-[11px] text-red-700 max-h-[120px] overflow-auto">{importErrors.map((e,i)=><div key={i}>{e}</div>)}</div>}

            {preview.length > 0 && (
              <div>
                <p className="font-semibold mb-2">{isZh ? `预览前 ${Math.min(20, preview.length)} 条（共 ${preview.length} 条）：` : `Preview first ${Math.min(20, preview.length)} rows (total ${preview.length}):`}</p>
                <div className="overflow-auto border rounded-[12px]">
                  <table className="w-full text-[11px]">
                    <thead className="bg-[#faf6ee]">
                      <tr>{Object.keys(preview[0] || {}).map(k => <th key={k} className="px-2 py-1 text-left font-semibold">{k}</th>)}</tr>
                    </thead>
                    <tbody>{preview.slice(0,20).map((r, i) => <tr key={i} className="border-t">{Object.values(r).map((v: any, j) => <td key={j} className="px-2 py-1 truncate max-w-[120px]">{v}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-[12px] border border-[#0f3d2e]/10 bg-white p-3">
              <p className="text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '扫码枪支持' : 'Barcode Scanner Support'}</p>
              <p className="mt-1 text-[11px] text-[#4f7a5c]">{isZh ? '系统支持标准USB扫码器（键盘模式）。扫码枪扫出的条码会自动输入到搜索框并回车搜索，无需额外驱动。建议扫码枪设置为以回车结尾。' : 'System supports standard USB barcode scanners (keyboard mode). Scanner input auto-enters search box and submits. No driver needed. Set scanner to suffix with Enter.'}</p>
            </div>

            <div className="rounded-[12px] border border-[#0f3d2e]/10 bg-white p-3">
              <p className="text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '售价改动说明' : 'Price Change Note'}</p>
              <p className="mt-1 text-[11px] text-[#4f7a5c]">{isZh ? '每本书的现售价改动不会影响已售出的书。已售订单的单价在销售时已保存，改价只影响新订单。库存成本按批次进货价独立计算，与现售价无关。' : 'Changing current price does NOT affect past sales. Past orders have unit_price saved at sale time. Price change only affects new orders. Inventory cost is per-batch purchase cost, independent of current price.'}</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
