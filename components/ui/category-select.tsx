'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/use-t';

type Props = {
  name: string;
  id?: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
};

/**
 * 图书表单的分类下拉：只做选择，不在这里新增。
 * 分类的增/删/改统一在「管理分类」弹窗里做。
 */
export function CategorySelect({ name, id, defaultValue, required, className }: Props) {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [categories, setCategories] = useState<string[]>([]);
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

  return (
    <div className={className}>
      <select
        id={id}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="mt-1 flex h-10 w-full rounded-[12px] border border-cocm-ink/10 bg-white px-3 py-2 text-[13px] text-cocm-ink ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocm-ink/20"
        required={required}
      >
        <option value="">{isZh ? '选择分类' : 'Select category'}</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
      {/* Hidden input to submit the actual value */}
      <input type="hidden" name={name} value={selected} />
    </div>
  );
}
