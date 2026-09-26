// Friendly error translation for DB / RPC failures.
// RPCs raise Chinese messages already; this maps the remaining raw technical
// errors (unique violations, deadlocks, permission denials) to plain language.
// Never leaks raw Postgres text to end users.

export function friendlyDbError(err: any, opts?: { duplicate?: string; fallback?: string }): string {
  const code = String(err?.code || '');
  const raw = String(err?.message || '');
  const lower = raw.toLowerCase();
  const fallback = opts?.fallback || '操作失败，请重试';

  // Duplicate key (concurrent insert of same SKU / supplier code / location code)
  if (code === '23505' || lower.includes('duplicate key') || lower.includes('already exists')) {
    if (opts?.duplicate) return opts.duplicate;
    if (lower.includes('books_sku')) return '图书代号已存在，请换一个代号';
    if (lower.includes('suppliers_code') || lower.includes('supplier')) return '供应商代号已存在，请换一个代号';
    if (lower.includes('locations_code')) return '库位代号已存在，请换一个代号';
    if (lower.includes('sale_number')) return '单号重复，请重试';
    if (lower.includes('isbn')) return '该 ISBN 已存在';
    return '记录已存在，请检查后重试';
  }

  // Deadlock / lock timeout under concurrency -> ask to retry
  if (code === '40P01' || lower.includes('deadlock')) return '系统繁忙，请重试';

  // Permission
  if (code === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return '没有权限执行此操作，请联系管理员';
  }

  // Already-friendly Chinese messages from our RPCs: pass through untouched
  // (they contain no technical jargon). Detect: has CJK chars and none of the
  // technical keywords above.
  if (/[\u4e00-\u9fff]/.test(raw)) return raw || fallback;

  // Anything else technical -> generic fallback, never raw text
  return fallback;
}
