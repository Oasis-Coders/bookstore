-- Add optional English title for bilingual display
alter table public.books add column if not exists title_en text;
comment on column public.books.title_en is 'Optional English title for display when UI is in English';

-- Backfill: if metadata has title_en, copy it (no data currently, but safe)
-- No index needed for now, but could add GIN for search later
