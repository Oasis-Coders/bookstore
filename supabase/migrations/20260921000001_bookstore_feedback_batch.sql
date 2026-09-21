-- Bookstore feedback batch 2026-09-21
-- 1) books.warehouse_location (仓库位置) next to shelf_position (书架位置)
-- 2) inventory_valuation_view: expose shelf_position + warehouse_location
-- 3) inventory_value_at(date): inventory cost value as of end of that day,
--    used to auto-fill monthly report opening stock (上月月末最后一笔交易后的成本总值)

alter table public.books add column if not exists warehouse_location text;

-- Recreate valuation view with shelf/warehouse positions (drop first: column list changes)
drop view if exists public.inventory_valuation_view;
create view public.inventory_valuation_view with (security_invoker = true) as
select
  b.book_id,
  bk.sku,
  bk.title,
  bk.publisher,
  bk.category,
  bk.shelf_position,
  bk.warehouse_location,
  b.location_id,
  l.code as location_code,
  l.name as location_name,
  sum(b.quantity_remaining) as quantity_on_hand,
  round(sum(b.quantity_remaining::numeric * b.unit_cost), 2) as inventory_value,
  round(sum(b.quantity_remaining::numeric * b.unit_cost) / nullif(sum(b.quantity_remaining), 0)::numeric, 2) as weighted_average_cost,
  bk.current_price,
  bk.currency,
  round(sum(b.quantity_remaining::numeric * bk.current_price), 2) as retail_value
from public.inventory_batches b
join public.books bk on bk.id = b.book_id
join public.locations l on l.id = b.location_id
where b.quantity_remaining > 0
group by b.book_id, bk.sku, bk.title, bk.publisher, bk.category,
         bk.shelf_position, bk.warehouse_location,
         b.location_id, l.code, l.name, bk.current_price, bk.currency;

grant select on public.inventory_valuation_view to authenticated;

-- Inventory cost value as of end of day p_as_of (after that day's last transaction).
-- Reconstructs per-batch on-hand: current remaining + sold after p_as_of - restored after p_as_of,
-- excluding batches received after p_as_of.
create or replace function public.inventory_value_at(p_as_of date)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(round(sum(b.unit_cost * greatest(0,
    b.quantity_remaining + coalesce(sold.qty, 0) - coalesce(ret.qty, 0)
  )), 2), 0)
  from public.inventory_batches b
  left join (
    select sba.batch_id, sum(sba.quantity) as qty
    from public.sales_batch_allocations sba
    join public.sales_transaction_lines stl on stl.id = sba.sale_line_id
    join public.sales_transactions st on st.id = stl.sale_id
    where st.sale_date > p_as_of and st.status = 'completed'
    group by sba.batch_id
  ) sold on sold.batch_id = b.id
  left join (
    select destination_batch_id as batch_id, sum(quantity) as qty
    from public.inventory_transactions
    where transaction_type = 'return_in'
      and occurred_at >= (p_as_of + 1)::date
    group by destination_batch_id
  ) ret on ret.batch_id = b.id
  where b.received_at < (p_as_of + 1)::date;
$$;

grant execute on function public.inventory_value_at(date) to authenticated;

-- monthly_financial_view: sales_total should include shipping charged to the customer
-- (invoice 总计 = 小计 - 折扣 + 邮费), keep sales_subtotal books-only for reference
create or replace view public.monthly_financial_view with (security_invoker = true) as
with sales_monthly as (
  select (date_trunc('month', (sales_transactions.sale_date)::timestamptz))::date as month_start,
    count(*) as order_count,
    coalesce(sum((sales_transactions.subtotal - coalesce(sales_transactions.discount_amount, 0) + coalesce(sales_transactions.shipping_cost, 0))), 0) as sales_total,
    coalesce(sum(sales_transactions.subtotal), 0) as sales_subtotal
  from sales_transactions
  where sales_transactions.status = 'completed'
  group by (date_trunc('month', (sales_transactions.sale_date)::timestamptz))::date
), cogs_monthly as (
  select (date_trunc('month', (st.sale_date)::timestamptz))::date as month_start,
    coalesce(sum(stl.cost_of_goods_sold), 0) as cogs_total
  from sales_transaction_lines stl
  join sales_transactions st on st.id = stl.sale_id
  where st.status = 'completed'
  group by (date_trunc('month', (st.sale_date)::timestamptz))::date
), purchases_monthly as (
  select (date_trunc('month', (po.order_date)::timestamptz))::date as month_start,
    coalesce(sum((pol.quantity_ordered::numeric * pol.unit_cost)), 0) as purchases_total
  from purchase_orders po
  join purchase_order_lines pol on pol.purchase_order_id = po.id
  where po.status <> 'draft' and po.status <> 'cancelled'
  group by (date_trunc('month', (po.order_date)::timestamptz))::date
)
select coalesce(s.month_start, c.month_start, p.month_start) as month_start,
  coalesce(s.order_count, 0) as order_count,
  coalesce(s.sales_total, 0) as sales_total,
  coalesce(s.sales_subtotal, 0) as sales_subtotal,
  coalesce(c.cogs_total, 0) as cogs_total,
  coalesce(p.purchases_total, 0) as purchases_total,
  ms.opening_stock,
  ms.closing_stock
from sales_monthly s
full join cogs_monthly c on c.month_start = s.month_start
full join purchases_monthly p on p.month_start = coalesce(s.month_start, c.month_start)
left join monthly_stock_snapshots ms on ms.month_start = coalesce(s.month_start, c.month_start, p.month_start);

grant select on public.monthly_financial_view to authenticated;

notify pgrst, 'reload schema';
