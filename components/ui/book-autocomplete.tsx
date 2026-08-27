'use client';
import { useState, useEffect, useMemo } from 'react';
import { Input } from './input';

type BookOpt = { id: string; title: string; sku: string; title_en?: string; shelf_position?: string; current_price?: number };

export function BookAutocomplete({ 
  books, 
  value, 
  onChange,
  placeholder,
  isZh
}: { 
  books: BookOpt[]; 
  value: string; 
  onChange: (id: string) => void;
  placeholder?: string;
  isZh?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<BookOpt | null>(null);

  useEffect(() => {
    if (value) {
      const found = books.find(b => b.id === value);
      if (found) setSelected(found);
    }
  }, [value, books]);

  const filtered = useMemo(() => {
    if (!query) return books.slice(0, 20);
    const q = query.toLowerCase();
    return books.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.sku.toLowerCase().includes(q) ||
      b.title_en?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query, books]);

  const handleSelect = (book: BookOpt) => {
    setSelected(book);
    onChange(book.id);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    setSelected(null);
    onChange('');
    setQuery('');
  };

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center gap-2 rounded-[12px] border border-[#0f3d2e]/10 bg-[#faf6ee] px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate">{selected.title} <span className="text-[#4f7a5c]">({selected.sku})</span></p>
            {selected.shelf_position && <p className="text-[10px] text-[#4f7a5c]">{isZh ? '书架' : 'Shelf'}: {selected.shelf_position}</p>}
          </div>
          <button type="button" onClick={handleClear} className="text-[12px] px-2 py-1 rounded-full bg-white hover:bg-red-50">{isZh ? '清除' : 'Clear'}</button>
        </div>
      ) : (
        <>
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder || (isZh ? '输入书名/代号缩小范围...' : 'Type to filter books...')}
            className="mt-1"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-[200px] overflow-auto rounded-[12px] border border-[#0f3d2e]/10 bg-white shadow-lg">
              {filtered.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b)}
                  className="w-full text-left px-3 py-2 hover:bg-[#faf6ee] text-[12px] border-b border-[#0f3d2e]/5 last:border-0"
                >
                  <span className="font-medium">{b.title}</span> <span className="text-[#4f7a5c]">({b.sku})</span>
                  {b.shelf_position && <span className="ml-2 text-[10px] bg-[#faf6ee] px-1.5 py-0.5 rounded-full">{isZh ? '书架' : 'Shelf'} {b.shelf_position}</span>}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <p className="mt-1 text-[10px] text-[#4f7a5c]">{isZh ? '输入时自动缩小范围，避免长列表' : 'Type to narrow down long lists'}</p>
    </div>
  );
}
