-- Invoice enhancements: shipping cost, line discount
alter table public.sales_transactions add column if not exists shipping_cost numeric(12,2) default 0 check (shipping_cost >= 0);
alter table public.sales_transaction_lines add column if not exists discount_percent numeric(5,2) default 0 check (discount_percent >= 0 and discount_percent <= 100);
alter table public.sales_transaction_lines add column if not exists discount_amount numeric(12,2) default 0 check (discount_amount >= 0);

-- Ensure sale_date exists index already
