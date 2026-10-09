import { listSpareBarcodes } from '../actions';
import { PrintBarcodesClient } from './print-client';

/** 打印备用条码：?codes=xxx,yyy 打印指定条码；缺省打印前 300 个可用条码 */
export default async function PrintBarcodesPage({
  searchParams,
}: {
  searchParams: Promise<{ codes?: string }>;
}) {
  const { codes } = await searchParams;
  let list: string[] = [];
  if (codes) {
    list = codes
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^\d{13}$/.test(s));
  } else {
    const rows = await listSpareBarcodes('available', 300);
    list = rows.map((r) => r.code);
  }
  return <PrintBarcodesClient codes={list} />;
}
