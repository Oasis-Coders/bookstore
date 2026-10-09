'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n/use-t';
import {
  getCategoryStats,
  createCategory,
  renameCategory,
  deleteCategory,
  type CategoryStat,
} from '@/app/books/actions';

/**
 * 1B: 分类管理 — 改名 / 删除。删除分类会把该分类下图书的分类清空（图书保留）。
 */
export function CategoryManager() {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setCats(await getCategoryStats());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) { load(); setMsg(''); setEditing(null); }
  }, [open ]);

  const doAdd = async () => {
    const v = newName.trim();
    if (!v) { setMsg(isZh ? '分类名称不能为空' : 'Name cannot be empty'); return; }
    setAdding(true);
    const r = await createCategory(v);
    setAdding(false);
    if (!r.success) { setMsg(r.error || (isZh ? '添加失败' : 'Add failed')); return; }
    setNewName('');
    setMsg(isZh ? `已添加分类「${v}」` : `Added category "${v}"`);
    load();
  };

  const doRename = async (oldName: string) => {
    const v = editValue.trim();
    if (!v) { setMsg(isZh ? '新名称不能为空' : 'Name cannot be empty'); return; }
    if (v === oldName) { setEditing(null); return; }
    setBusy(oldName);
    const r = await renameCategory(oldName, v);
    setBusy(null);
    if (!r.success) { setMsg(r.error || (isZh ? '改名失败' : 'Rename failed')); return; }
    setEditing(null);
    setMsg(isZh ? `已改名：${oldName} → ${v}` : `Renamed: ${oldName} → ${v}`);
    load();
  };

  const doDelete = async (c: CategoryStat) => {
    const confirmMsg = isZh
      ? `确定删除分类「${c.name}」吗？该分类下 ${c.count} 本书的分类将被清空（图书保留）。`
      : `Delete category "${c.name}"? ${c.count} book(s) will become uncategorized (books are kept).`;
    if (!window.confirm(confirmMsg)) return;
    setBusy(c.name);
    const r = await deleteCategory(c.name);
    setBusy(null);
    if (!r.success) { setMsg(r.error || (isZh ? '删除失败' : 'Delete failed')); return; }
    setMsg(isZh ? `已删除「${c.name}」，${r.affected || 0} 本书已取消分类` : `Deleted "${c.name}"`);
    load();
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="rounded-[12px]" onClick={() => setOpen(true)}>
        {isZh ? '管理分类' : 'Manage categories'}
      </Button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-cocm-ink/30" onClick={() => setOpen(false)}>
          <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="flex h-[540px] max-h-[85vh] w-full max-w-[480px] flex-col rounded-[16px] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={isZh ? '管理分类' : 'Manage categories'}
          >
            <div className="shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-[16px] font-semibold text-cocm-ink">{isZh ? '管理分类' : 'Manage categories'}</h3>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{isZh ? '关闭' : 'Close'}</Button>
            </div>
            <p className="mt-1 text-[11px] text-[#5b5f94]">
              {isZh ? '改名会更新该分类下所有图书；删除分类只清空图书的分类，图书本身保留。' : 'Renaming updates all books in the category; deleting only clears the category from books.'}
            </p>
            {msg && <p className="mt-2 text-[12px] text-cocm-ink">{msg}</p>}
            <div className="mt-3 flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={isZh ? '输入新分类名称' : 'New category name'}
                className="h-9 flex-1 text-[12px]"
                onKeyDown={(e) => { if (e.key === 'Enter') doAdd(); }}
              />
              <Button size="sm" className="h-9 rounded-[10px] px-4" disabled={adding || !newName.trim()} onClick={doAdd}>
                {isZh ? '添加' : 'Add'}
              </Button>
            </div>
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {loading && <p className="text-[12px] text-[#5b5f94]">{isZh ? '加载中…' : 'Loading…'}</p>}
              {!loading && cats.length === 0 && (
                <p className="text-[12px] text-[#5b5f94]">{isZh ? '暂无分类' : 'No categories yet'}</p>
              )}
              {cats.map((c) => (
                <div key={c.name} className="flex items-center gap-2 rounded-[10px] border border-cocm-ink/10 px-3 py-2">
                  {editing === c.name ? (
                    <>
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 flex-1 text-[12px]"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') doRename(c.name); if (e.key === 'Escape') setEditing(null); }}
                      />
                      <Button size="sm" className="h-8 rounded-[8px]" disabled={busy === c.name} onClick={() => doRename(c.name)}>
                        {isZh ? '保存' : 'Save'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 rounded-[8px]" onClick={() => setEditing(null)}>
                        {isZh ? '取消' : 'Cancel'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-cocm-ink" title={c.name}>{c.name}</span>
                      <span className="shrink-0 text-[11px] text-[#5b5f94]">{c.count}{isZh ? ' 本' : ''}</span>
                      <Button
                        size="sm" variant="ghost" className="h-7 shrink-0 rounded-[8px] px-2 text-[11px]"
                        onClick={() => { setEditing(c.name); setEditValue(c.name); setMsg(''); }}
                      >
                        {isZh ? '改名' : 'Rename'}
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 shrink-0 rounded-[8px] px-2 text-[11px] text-red-600 hover:text-red-700"
                        disabled={busy === c.name}
                        onClick={() => doDelete(c)}
                      >
                        {isZh ? '删除' : 'Delete'}
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
