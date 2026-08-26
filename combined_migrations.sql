alter table public.books add column if not exists shelf_position text;
comment on column public.books.shelf_position is '书在书架的位置，如 A-3-2';
-- Bookstore enhancements 2026-08-26: daily sales, bilingual search, simplified/traditional, payment methods, C-number, shelf position already done

-- 1. Books: add simplified/traditional titles
alter table public.books add column if not exists title_simplified text;
alter table public.books add column if not exists title_traditional text;
comment on column public.books.title_simplified is '简体标题';
comment on column public.books.title_traditional is '繁体标题';

-- 2. Payment method enum for sales
do $$ begin
  create type public.sale_payment_method as enum (
    'deferral', 'cash', 'card', 'bank_transfer', 'shopify', 'mix', 'other'
  );
exception when duplicate_object then null; end $$;

-- 3. Extend sales_transactions with new fields
alter table public.sales_transactions add column if not exists payment_method public.sale_payment_method default 'cash';
alter table public.sales_transactions add column if not exists payment_status text default 'paid';
alter table public.sales_transactions add column if not exists discount_amount numeric(12,2) default 0 check (discount_amount >= 0);
alter table public.sales_transactions add column if not exists customer_name text;
alter table public.sales_transactions add column if not exists customer_note text;
alter table public.sales_transactions add column if not exists sale_date date default current_date;

-- Backfill sale_date from sold_at
update public.sales_transactions set sale_date = (sold_at at time zone 'UTC')::date where sale_date is null;

-- 4. Sale number: keep existing but add function to generate C-prefixed numbers
create or replace function public.generate_sale_number()
returns text language plpgsql as $$
declare
  v_seq int;
  v_num text;
begin
  -- Use max of existing C numbers + 1, or 6-digit random if none
  select coalesce(max((substring(sale_number from 'C(\d+)'))::int), 0) + 1
    into v_seq
    from public.sales_transactions
    where sale_number ~ '^C\d+$';
  
  if v_seq is null or v_seq = 1 then
    -- No C-numbers yet, start from 100001 or max existing numeric + 1
    select coalesce(max((regexp_replace(sale_number, '\D', '', 'g'))::int), 100000) + 1
      into v_seq
      from public.sales_transactions;
    if v_seq < 100001 then v_seq := 100001; end if;
  end if;
  
  v_num := 'C' || lpad(v_seq::text, 6, '0');
  return v_num;
end;
$$;

-- 5. Daily sales view for dashboard
create or replace view public.daily_sales_summary with (security_invoker = true) as
select
  current_date as sale_date,
  count(*) as total_orders,
  coalesce(sum(case when payment_method = 'cash' then subtotal - coalesce(discount_amount,0) else 0 end), 0) as cash_total,
  coalesce(sum(case when payment_method = 'card' then subtotal - coalesce(discount_amount,0) else 0 end), 0) as card_total,
  coalesce(sum(case when payment_method = 'bank_transfer' then subtotal - coalesce(discount_amount,0) else 0 end), 0) as bank_transfer_total,
  coalesce(sum(case when payment_method = 'shopify' then subtotal - coalesce(discount_amount,0) else 0 end), 0) as shopify_total,
  coalesce(sum(case when payment_method = 'mix' then subtotal - coalesce(discount_amount,0) else 0 end), 0) as mix_total,
  coalesce(sum(case when payment_method = 'deferral' then subtotal - coalesce(discount_amount,0) else 0 end), 0) as deferral_total,
  coalesce(sum(subtotal - coalesce(discount_amount,0)), 0) as grand_total
from public.sales_transactions
where sale_date = current_date and status = 'completed';

-- 6. Sales list view for reports with date range
create or replace view public.sales_report_view with (security_invoker = true) as
select
  st.id,
  st.sale_number,
  st.sale_date,
  st.sold_at,
  st.payment_method,
  st.payment_status,
  st.subtotal,
  st.discount_amount,
  (st.subtotal - coalesce(st.discount_amount,0)) as net_total,
  st.customer_name,
  st.customer_note,
  st.status,
  st.created_by,
  p.display_name as cashier_name,
  p.email as cashier_email
from public.sales_transactions st
left join public.profiles p on p.id = st.created_by
order by st.sold_at desc;

-- 7. Sales books view for Shopify stock sync (all books sold in period)
create or replace view public.sales_books_report_view with (security_invoker = true) as
select
  st.sale_date,
  st.sale_number,
  b.sku,
  b.title,
  b.title_en,
  b.title_simplified,
  b.title_traditional,
  b.shelf_position,
  stl.quantity,
  stl.unit_price,
  st.payment_method,
  st.customer_name
from public.sales_transaction_lines stl
join public.sales_transactions st on st.id = stl.sale_id
join public.books b on b.id = stl.book_id
order by st.sale_date desc, st.sale_number;

-- 8. Ensure books searchable bilingual - create trigram index if not exists (for ilike performance)
create extension if not exists pg_trgm;
create index if not exists idx_books_title_trgm on public.books using gin (title gin_trgm_ops);
create index if not exists idx_books_title_en_trgm on public.books using gin (title_en gin_trgm_ops);
create index if not exists idx_books_sku_trgm on public.books using gin (sku gin_trgm_ops);

-- 9. Grant access to new views
grant select on public.daily_sales_summary to authenticated;
grant select on public.sales_report_view to authenticated;
grant select on public.sales_books_report_view to authenticated;
