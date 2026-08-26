-- Monthly financial snapshots for opening/closing stock
create table if not exists public.monthly_stock_snapshots (
  id uuid primary key default gen_random_uuid(),
  month_start date not null unique, -- first day of month e.g. 2026-02-01
  opening_stock numeric(14,2) not null default 0,
  closing_stock numeric(14,2),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.set_monthly_snapshot_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_monthly_snapshot_updated on public.monthly_stock_snapshots;
create trigger trg_monthly_snapshot_updated before update on public.monthly_stock_snapshots for each row execute function public.set_monthly_snapshot_updated_at();

-- Enable RLS (reuse existing policy pattern: authenticated can read, staff+ can write)
alter table public.monthly_stock_snapshots enable row level security;

drop policy if exists "allow_read_monthly_snapshots" on public.monthly_stock_snapshots;
create policy "allow_read_monthly_snapshots" on public.monthly_stock_snapshots for select using (auth.role() = 'authenticated');

drop policy if exists "allow_write_monthly_snapshots" on public.monthly_stock_snapshots;
create policy "allow_write_monthly_snapshots" on public.monthly_stock_snapshots for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin','super_admin'))
);

-- Monthly financial view: sales + purchases + cogs per month
create or replace view public.monthly_financial_view as
with sales_monthly as (
  select
    date_trunc('month', sale_date)::date as month_start,
    count(*) as order_count,
    coalesce(sum(subtotal - coalesce(discount_amount,0)),0) as sales_total,
    coalesce(sum(subtotal),0) as sales_subtotal
  from public.sales_transactions
  where status = 'completed'
  group by 1
),
cogs_monthly as (
  select
    date_trunc('month', st.sale_date)::date as month_start,
    coalesce(sum(stl.cost_of_goods_sold),0) as cogs_total
  from public.sales_transaction_lines stl
  join public.sales_transactions st on st.id = stl.sale_id
  where st.status = 'completed'
  group by 1
),
purchases_monthly as (
  select
    date_trunc('month', po.order_date)::date as month_start,
    coalesce(sum(pol.quantity_ordered * pol.unit_cost),0) as purchases_total
  from public.purchase_orders po
  join public.purchase_order_lines pol on pol.purchase_order_id = po.id
  where po.status != 'draft' and po.status != 'cancelled'
  group by 1
)
select
  coalesce(s.month_start, c.month_start, p.month_start) as month_start,
  coalesce(s.order_count,0) as order_count,
  coalesce(s.sales_total,0) as sales_total,
  coalesce(s.sales_subtotal,0) as sales_subtotal,
  coalesce(c.cogs_total,0) as cogs_total,
  coalesce(p.purchases_total,0) as purchases_total,
  ms.opening_stock,
  ms.closing_stock
from sales_monthly s
full outer join cogs_monthly c on c.month_start = s.month_start
full outer join purchases_monthly p on p.month_start = coalesce(s.month_start, c.month_start)
left join public.monthly_stock_snapshots ms on ms.month_start = coalesce(s.month_start, c.month_start, p.month_start);

comment on view public.monthly_financial_view is '每月财务汇总：销售额、采购额、COGS，开闭库存来自快照表';
