import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 出版社 → 供应商 自动同步。
 *
 * 背景：书库的"出版社"下拉选项与供应商列表是同一份名单（都取自 suppliers 表），
 * 但用户在图书表单/批量导入里手动输入一个新出版社时，它只会存进 books.publisher，
 * 不会出现在采购单的供应商下拉和供应商页面里。本函数把一批出版社名按 name_zh
 * 精确匹配去重后同步进 suppliers 表，不存在的就自动创建（代号自动生成）。
 *
 * 权限：suppliers 表的 INSERT 需要 admin 角色；非 admin 调用时只返回 warning，
 * 不抛错 —— 图书本身的保存不受影响。
 */
export type PublisherSyncResult = {
  created: string[]; // 本次新建的供应商名
  warnings: string[]; // 未能同步的原因（逐条中文）
};

function genSupplierCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SUP-${ts}${rand}`;
}

export async function ensurePublisherSuppliers(
  supabase: SupabaseClient,
  publishers: (string | null | undefined)[],
): Promise<PublisherSyncResult> {
  const names = [...new Set(publishers.map((p) => (p || '').trim()).filter(Boolean))];
  const created: string[] = [];
  const warnings: string[] = [];
  if (names.length === 0) return { created, warnings };

  for (const name of names) {
    try {
      const { data: existing, error: selErr } = await supabase
        .from('suppliers')
        .select('id')
        .eq('name_zh', name)
        .maybeSingle();
      if (selErr) {
        warnings.push(`${name}：查询供应商失败（${selErr.message}）`);
        continue;
      }
      if (existing) continue; // 已存在（无论是否停用）就不重复建

      let code = genSupplierCode();
      let done = false;
      for (let attempt = 0; attempt < 3 && !done; attempt++) {
        const { error } = await supabase.from('suppliers').insert({
          code,
          name_zh: name,
          notes: '由图书出版社自动同步创建',
        });
        if (!error) {
          done = true;
          created.push(name);
        } else if (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate')) {
          code = genSupplierCode(); // 代号撞车就换一个再试
        } else if (error.code === '42501' || String(error.message || '').toLowerCase().includes('row-level security')) {
          warnings.push(`${name}：权限不足，只有管理员可以自动创建供应商`);
          break;
        } else {
          warnings.push(`${name}：创建失败（${error.message}）`);
          break;
        }
      }
      if (!done && !warnings.some((w) => w.startsWith(name))) {
        warnings.push(`${name}：创建失败，请重试`);
      }
    } catch (e: any) {
      warnings.push(`${name}：${e?.message || '未知错误'}`);
    }
  }
  return { created, warnings };
}
