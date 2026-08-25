alter table public.books add column if not exists shelf_position text;
comment on column public.books.shelf_position is '书在书架的位置，如 A-3-2';
