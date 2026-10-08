import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 批量导入图书时，把表格里出现的新分类同步进 categories 表，
 * 免得书进了系统、分类却没进分类表（管理分类/下拉里看不到）。
 *
 * 权限：categories 表的 INSERT 需要 staff 及以上角色；权限不足时只返回 warning，
 * 不抛错 —— 图书本身的保存不受影响。
 */
export type CategorySyncResult = {
  created: string[];
  warnings: string[];
};

export async function ensureCategories(
  supabase: SupabaseClient,
  categories: (string | null | undefined)[],
): Promise<CategorySyncResult> {
  const names = [...new Set(categories.map((c) => (c || '').trim()).filter(Boolean))];
  const created: string[] = [];
  const warnings: string[] = [];
  if (names.length === 0) return { created, warnings };

  for (const name of names) {
    try {
      const { data: existing, error: selErr } = await supabase
        .from('categories')
        .select('id')
        .eq('name', name)
        .maybeSingle();
      if (selErr) {
        warnings.push(`${name}：查询分类失败（${selErr.message}）`);
        continue;
      }
      if (existing) continue;

      const { error } = await supabase.from('categories').insert({ name });
      if (!error) {
        created.push(name);
      } else if (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate')) {
        // 并发建了同样的分类，忽略
      } else if (error.code === '42501' || String(error.message || '').toLowerCase().includes('row-level security')) {
        warnings.push(`${name}：权限不足，无法自动创建分类`);
        break;
      } else {
        warnings.push(`${name}：创建失败（${error.message}）`);
        break;
      }
    } catch (e: any) {
      warnings.push(`${name}：${e?.message || '未知错误'}`);
    }
  }
  return { created, warnings };
}
