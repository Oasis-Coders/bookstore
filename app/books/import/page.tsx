'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/use-t';
import Link from 'next/link';

export default function BulkImportPage() {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState('');

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
      setPreview(rows.slice(0, 20));
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

  return (
    <AppShell title={isZh ? '批量导入' : 'Bulk Import'} titleZh="批量导入" eyebrow={isZh ? '从Excel导入库存' : 'Import from Excel'}>
      <div className="mx-auto max-w-[800px] space-y-4">
        <Link href="/books" className="inline-flex items-center text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">{isZh ? '← 返回书库' : '← Back to Books'}</Link>
        
        <Card>
          <CardTitle>{isZh ? '从Excel批量导入库存' : 'Bulk Import from Excel'}</CardTitle>
          <div className="mt-4 space-y-4 text-[13px]">
            <div className="rounded-[12px] bg-[#faf6ee] p-4">
              <p className="font-semibold text-[#0f3d2e]">{isZh ? '步骤：' : 'Steps:'}</p>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-[#4f7a5c]">
                <li>{isZh ? '在Excel中整理好书库，按模板格式保存为CSV' : 'Organize books in Excel, save as CSV per template'}</li>
                <li>{isZh ? '点击下载模板查看必填字段' : 'Download template to see required fields'}</li>
                <li>{isZh ? '上传CSV文件，预览后确认导入' : 'Upload CSV, preview, then confirm import'}</li>
                <li>{isZh ? '支持中英文、简繁体、书架位置、初始库存' : 'Supports EN/ZH, simplified/traditional, shelf position, initial stock'}</li>
                <li>{isZh ? '外接扫码枪：USB扫码器可直接扫ISBN/条码，自动填入SKU' : 'Barcode: USB scanners work directly, scanning ISBN auto-fills SKU'}</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={downloadTemplate}>{isZh ? '下载模板CSV' : 'Download Template CSV'}</Button>
              <label className="inline-flex h-9 items-center rounded-[12px] border border-[#0f3d2e]/15 px-4 text-[13px] font-semibold cursor-pointer hover:bg-[#faf6ee]">
                {isZh ? '选择CSV文件' : 'Choose CSV File'}
                <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
              </label>
            </div>

            {preview.length > 0 && (
              <div>
                <p className="font-semibold mb-2">{isZh ? `预览前 ${preview.length} 条：` : `Preview first ${preview.length} rows:`}</p>
                <div className="overflow-auto border rounded-[12px]">
                  <table className="w-full text-[11px]">
                    <thead className="bg-[#faf6ee]">
                      <tr>{Object.keys(preview[0] || {}).map(k => <th key={k} className="px-2 py-1 text-left font-semibold">{k}</th>)}</tr>
                    </thead>
                    <tbody>{preview.map((r, i) => <tr key={i} className="border-t">{Object.values(r).map((v: any, j) => <td key={j} className="px-2 py-1 truncate max-w-[120px]">{v}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                <p className="mt-3 text-[11px] text-[#4f7a5c]">{isZh ? '确认无误后，请联系管理员通过Supabase导入或使用下方API。完整导入功能需连接数据库。' : 'After confirming, contact admin to import via Supabase or use API below. Full import requires DB connection.'}</p>
                <div className="mt-3 rounded-[10px] bg-[#0f3d2e]/5 p-3 text-[11px] font-mono">
                  {`// API import example (service_role)
const books = csvData.map(row => ({
  sku: row.sku,
  title: row.title,
  title_en: row.title_en,
  title_simplified: row.title_simplified,
  title_traditional: row.title_traditional,
  shelf_position: row.shelf_position,
  current_price: parseFloat(row.current_price),
  // ... then supabase.from('books').insert(books)
}))`}
                </div>
              </div>
            )}

            <div className="rounded-[12px] border border-[#d26a39]/20 bg-[#d26a39]/5 p-3">
              <p className="text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '📷 扫码枪支持' : '📷 Barcode Scanner Support'}</p>
              <p className="mt-1 text-[11px] text-[#4f7a5c]">{isZh ? '系统支持标准USB条码扫描器（HID键盘模式）。扫码枪扫出的条码会自动输入到搜索框并回车搜索，无需额外驱动。建议扫码枪设置为以回车结尾。' : 'System supports standard USB barcode scanners (HID keyboard mode). Scanner input auto-enters search box and submits. No driver needed. Set scanner to suffix with Enter.'}</p>
            </div>

            <div className="rounded-[12px] border border-[#1a5c46]/20 bg-[#1a5c46]/5 p-3">
              <p className="text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '💰 现售价改动说明' : '💰 Price Change Note'}</p>
              <p className="mt-1 text-[11px] text-[#4f7a5c]">{isZh ? '每本书的现售价改动不会影响已售出的书。已售订单的单价在销售时已快照保存到 sales_transaction_lines.unit_price，改价只影响新订单。库存成本按批次进货价独立计算，与现售价无关。' : 'Changing current price does NOT affect past sales. Past orders have unit_price snapshotted in sales_transaction_lines. Price change only affects new orders. Inventory cost is per-batch purchase cost, independent of current price.'}</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
