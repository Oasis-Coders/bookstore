'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from './input';

type BookOpt = { id: string; title: string; sku: string; title_en?: string; shelf_position?: string; current_price?: number };

export function BookAutocomplete({ 
  books, 
  value, 
  onChange,
  placeholder,
  isZh,
  id
}: { 
  books: BookOpt[]; 
  value: string; 
  onChange: (id: string) => void;
  placeholder?: string;
  isZh?: boolean;
  id?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<BookOpt | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useRef(`book-autocomplete-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    if (value) {
      const found = books.find(b => b.id === value);
      if (found) setSelected(found);
    }
  }, [value, books]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

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
    setActiveIndex(-1);
  };

  const handleClear = () => {
    setSelected(null);
    onChange('');
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        handleSelect(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const showEmpty = open && query.trim().length > 0 && filtered.length === 0;

  return (
    <div className="relative" ref={wrapRef}>
      {selected ? (
        <div className="flex items-center gap-2 rounded-[12px] border border-[#0f3d2e]/10 bg-[#faf6ee] px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate">{selected.title} <span className="text-[#4f7a5c]">({selected.sku})</span></p>
            {selected.shelf_position && <p className="text-[10px] text-[#4f7a5c]">{isZh ? '书架' : 'Shelf'}: {selected.shelf_position}</p>}
          </div>
          <button
            type="button"
            onClick={handleClear}
            aria-label={isZh ? '清除所选图书' : 'Clear selected book'}
            className="text-[12px] px-2 py-1 rounded-full bg-white hover:bg-red-50"
          >
            {isZh ? '清除' : 'Clear'}
          </button>
        </div>
      ) : (
        <>
          <Input
            id={id}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
            aria-label={isZh ? '搜索图书（书名/代号）' : 'Search books (title/Code)'}
            placeholder={placeholder || (isZh ? '输入书名/代号缩小范围…' : 'Type to filter books…')}
            className="mt-1"
          />
          {open && filtered.length > 0 && (
            <div id={listId} role="listbox" className="absolute z-10 mt-1 w-full max-h-[200px] overflow-auto rounded-[12px] border border-[#0f3d2e]/10 bg-white shadow-lg">
              {filtered.map((b, i) => (
                <button
                  key={b.id}
                  id={`${listId}-opt-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onClick={() => handleSelect(b)}
                  onMouseMove={() => setActiveIndex(i)}
                  className={`w-full text-left px-3 py-2 text-[12px] border-b border-[#0f3d2e]/5 last:border-0 ${i === activeIndex ? 'bg-[#faf6ee]' : 'hover:bg-[#faf6ee]'}`}
                >
                  <span className="font-medium">{b.title}</span> <span className="text-[#4f7a5c]">({b.sku})</span>
                  {b.shelf_position && <span className="ml-2 text-[10px] bg-[#faf6ee] px-1.5 py-0.5 rounded-full">{isZh ? '书架' : 'Shelf'} {b.shelf_position}</span>}
                </button>
              ))}
            </div>
          )}
          {showEmpty && (
            <div className="absolute z-10 mt-1 w-full rounded-[12px] border border-[#0f3d2e]/10 bg-white shadow-lg px-3 py-3 text-[12px] text-[#4f7a5c] text-center">
              {isZh ? '无结果' : 'No results'}
            </div>
          )}
        </>
      )}
      <p className="mt-1 text-[10px] text-[#4f7a5c]">{isZh ? '输入时自动缩小范围，避免长列表' : 'Type to narrow down long lists'}</p>
    </div>
  );
}
