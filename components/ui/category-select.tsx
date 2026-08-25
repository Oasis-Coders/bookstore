'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/use-t';
import { Input } from './input';
import { Button } from './button';

type Props = {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
};

export function CategorySelect({ name, defaultValue, required, className }: Props) {
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
      const { data } = await supabase.from('books').select('category').not('category', 'is', null);
      if (data) {
        const uniq = Array.from(new Set(data.map((d: any) => d.category).filter(Boolean))) as string[];
        setCategories(uniq.length > 0 ? uniq : ['灵修', '神学', '见证', '儿童', '音乐']);
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

  const handleAdd = () => {
    const trimmed = customCat.trim();
    if (trimmed) {
      if (!categories.includes(trimmed)) {
        setCategories((prev) => [...prev, trimmed]);
      }
      setSelected(trimmed);
      setShowAdd(false);
      setCustomCat('');
    }
  };

  return (
    <div className={className}>
      {!showAdd ? (
        <select
          value={selected}
          onChange={handleSelectChange}
          className="mt-1 flex h-10 w-full rounded-[12px] border border-[#0f3d2e]/10 bg-white px-3 py-2 text-[13px] ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3d2e]/20"
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
            autoFocus
          />
          <Button type="button" size="sm" onClick={handleAdd} disabled={!customCat.trim()}>
            {isZh ? '添加' : 'Add'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setCustomCat(''); }}>
            {isZh ? '取消' : 'Cancel'}
          </Button>
        </div>
      )}
      {/* Hidden input to submit the actual value */}
      <input type="hidden" name={name} value={selected} />
    </div>
  );
}
