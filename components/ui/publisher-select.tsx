'use client';

import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { getSupplierOptions, type SupplierOption } from '@/app/books/actions';

/**
 * 1A: 出版社下拉（选项与供应商搜索一致：供应商中英名/代号），同时允许手动输入。
 * 用原生 datalist 实现：点右侧箭头即下拉选择，也可直接打字过滤或输入新出版社。
 */
export function PublisherSelect({
  id,
  name,
  defaultValue,
  className,
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  const listId = useId();
  const [options, setOptions] = useState<SupplierOption[]>([]);
  const [value, setValue] = useState(defaultValue || '');

  useEffect(() => {
    let cancelled = false;
    getSupplierOptions().then((opts) => {
      if (!cancelled) setOptions(opts);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { setValue(defaultValue || ''); }, [defaultValue]);

  return (
    <>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        list={listId}
        autoComplete="off"
        placeholder="选择或输入出版社…"
        className={className}
      />
      <datalist id={listId}>
        {options.map((s) => (
          <option key={s.id} value={s.name_zh}>
            {s.name_en ? `${s.name_en} · ` : ''}{s.code}
          </option>
        ))}
      </datalist>
    </>
  );
}
