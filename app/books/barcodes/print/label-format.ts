/** 不干胶标签纸版式（条码打印、价格标签打印共用） */
export type LabelFormat = {
  id: string;
  nameZh: string;
  nameEn: string;
  wMm: number; // 单张标签宽（mm）
  hMm: number; // 单张标签高（mm）
  cols: number; // 每页列数
  rows: number; // 每页行数
};

export const LABEL_FORMATS: LabelFormat[] = [
  { id: 'll21', nameZh: 'LL21 63.5×38.1mm（每页21张）', nameEn: 'LL21 63.5×38.1mm (21/sheet)', wMm: 63.5, hMm: 38.1, cols: 3, rows: 7 },
  { id: 'l7162', nameZh: 'L7162 99.1×38.1mm（每页14张）', nameEn: 'L7162 99.1×38.1mm (14/sheet)', wMm: 99.1, hMm: 38.1, cols: 2, rows: 7 },
];

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
