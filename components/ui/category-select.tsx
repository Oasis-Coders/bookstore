'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/use-t';
import { createCategory } from '@/app/books/actions';
import { Input } from './input';
import { Button } from './button';

type Props = {
  name: string;
  id?: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
};

export function CategorySelect({ name, id, defaultValue, required, className }: Props) {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [categories, setCategories] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [customCat, setCustomCat] = useState('');
  const [selected, setSelected] = useState(defaultValue || '');

  useEffect(() => {
    const fetchCats = async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        // Fallback demo categories
        setCategories(['灵修', '神学', '见证', '儿童', '音乐']);
        return;
      }
      const { data } = await supabase.from('categories').select('name').order('sort_order').order('name').limit(1000);
      if (data) {
        const names = (data.map((d: any) => d.name).filter(Boolean)) as string[];
        setCategories(names.length > 0 ? names : ['灵修', '神学', '见证', '儿童', '音乐']);
      } else {
        setCategories(['灵修', '神学', '见证', '儿童', '音乐']);
      }
    };
    fetchCats();
  }, []);

  useEffect(() => {
    if (defaultValue) setSelected(defaultValue);
  }, [defaultValue]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__add_new__') {
      setShowAdd(true);
      setSelected('');
    } else {
      setSelected(val);
      setShowAdd(false);
    }
  };

  const [addingCat, setAddingCat] = useState(false);
  const [addError, setAddError] = useState('');

  const handleAdd = async () => {
    const trimmed = customCat.trim();
    if (!trimmed) return;
    // Persist immediately so the category exists even if the book form is cancelled
    if (!categories.includes(trimmed)) {
      setAddingCat(true);
      setAddError('');
      const r = await createCategory(trimmed);
      setAddingCat(false);
      if (!r.success) {
        // Already exists (e.g. added elsewhere) — just select it
        if (!categories.includes(trimmed)) { setAddError(r.error || ''); return; }
      } else {
        setCategories((prev) => [...prev, trimmed]);
      }
    }
    setSelected(trimmed);
    setShowAdd(false);
    setCustomCat('');
  };

  return (
    <div className={className}>
      {!showAdd ? (
        <select
          id={id}
          value={selected}
          onChange={handleSelectChange}
          className="mt-1 flex h-10 w-full rounded-[12px] border border-cocm-ink/10 bg-white px-3 py-2 text-[13px] text-cocm-ink ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocm-ink/20"
          required={required}
        >
          <option value="">{isZh ? '选择分类' : 'Select category'}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
          <option value="__add_new__">{isZh ? '+ 添加新分类' : '+ Add new category'}</option>
        </select>
      ) : (
        <div className="mt-1 flex gap-2">
          <Input
            placeholder={isZh ? '输入新分类' : 'Enter new category'}
            value={customCat}
            onChange={(e) => setCustomCat(e.target.value)}
            className="flex-1"
            aria-label={isZh ? '新分类名称' : 'New category name'}
          />
          <Button type="button" size="sm" onClick={handleAdd} disabled={!customCat.trim() || addingCat}>
            {addingCat ? (isZh ? '添加中…' : 'Adding…') : (isZh ? '添加' : 'Add')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setCustomCat(''); setAddError(''); }}>
            {isZh ? '取消' : 'Cancel'}
          </Button>
        </div>
      )}
      {addError && <p className="mt-1 text-[11px] text-red-600">{addError}</p>}
      {/* Hidden input to submit the actual value */}
      <input type="hidden" name={name} value={selected} />
    </div>
  );
}
