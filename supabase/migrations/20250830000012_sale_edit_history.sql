-- Sale edit audit - allows admin to edit order info with history

-- 1. Edit history table
create table if not exists public.sale_edits (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales_transactions(id) on delete cascade,
  edited_by uuid not null references public.profiles(id),
  edited_at timestamptz not null default now(),
  reason text,
  change_type text not null default 'metadata' check (change_type in ('metadata','content','void')),
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb
);

create index if not exists idx_sale_edits_sale on public.sale_edits(sale_id, edited_at desc);
create index if not exists idx_sale_edits_editor on public.sale_edits(edited_by);

alter table public.sale_edits enable row level security;

drop policy if exists staff_read on public.sale_edits;
create policy staff_read on public.sale_edits for select to authenticated
using (public.has_any_role(array['staff','admin','super_admin']));

revoke all on table public.sale_edits from anon, authenticated;
grant select on table public.sale_edits to authenticated;
grant insert on table public.sale_edits to authenticated;

-- 2. Secure function to edit sale metadata (no inventory change)
create or replace function public.apply_sale_metadata_edit(
  p_sale_id uuid,
  p_customer_name text default null,
  p_payment_method text default null,
  p_payment_status text default null,
  p_discount_amount numeric default null,
  p_sale_date date default null,
  p_notes text default null,
  p_shipping_cost numeric default null,
  p_reason text default null
) returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_old public.sales_transactions%rowtype;
  v_new jsonb;
  v_old_json jsonb;
begin
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);
  -- Only admin/super_admin can edit completed sales per business rule
  if not public.has_any_role(array['admin','super_admin']) then
    raise exception '只有管理员可以改动已确认的订单' using errcode='42501';
  end if;

  select * into v_old from public.sales_transactions where id = p_sale_id for update;
  if not found then raise exception '订单不存在'; end if;
  if v_old.status = 'voided' then raise exception '已作废的订单不可编辑'; end if;

  v_old_json := jsonb_build_object(
    'customer_name', v_old.customer_name,
    'payment_method', v_old.payment_method,
    'payment_status', v_old.payment_status,
    'discount_amount', v_old.discount_amount,
    'sale_date', v_old.sale_date,
    'notes', v_old.notes,
    'shipping_cost', v_old.shipping_cost,
    'customer_note', v_old.customer_note
  );

  -- Build new values, coalesce to old if null passed (allow explicit null for customer_name/notes)
  update public.sales_transactions
  set
    customer_name = coalesce(p_customer_name, customer_name),
    payment_method = coalesce(p_payment_method::public.sale_payment_method, payment_method),
    payment_status = coalesce(p_payment_status, payment_status),
    discount_amount = coalesce(p_discount_amount, discount_amount),
    sale_date = coalesce(p_sale_date, sale_date),
    notes = coalesce(p_notes, notes),
    customer_note = coalesce(p_notes, customer_note),
    shipping_cost = coalesce(p_shipping_cost, shipping_cost)
  where id = p_sale_id;

  select jsonb_build_object(
    'customer_name', customer_name,
    'payment_method', payment_method,
    'payment_status', payment_status,
    'discount_amount', discount_amount,
    'sale_date', sale_date,
    'notes', notes,
    'shipping_cost', shipping_cost
  ) into v_new from public.sales_transactions where id = p_sale_id;

  insert into public.sale_edits(sale_id, edited_by, reason, change_type, old_values, new_values)
  values (p_sale_id, v_actor, nullif(btrim(p_reason),''), 'metadata', v_old_json, v_new);

end;
$$;

revoke all on function public.apply_sale_metadata_edit(uuid,text,text,text,numeric,date,text,numeric,text) from public;
grant execute on function public.apply_sale_metadata_edit(uuid,text,text,text,numeric,date,text,numeric,text) to authenticated;

comment on function public.apply_sale_metadata_edit(uuid,text,text,text,numeric,date,text,numeric,text) is '管理员编辑已确认销售的客户/付款/折扣/日期/备注，写审计到 sale_edits';

-- 3. View for history
create or replace view public.sale_edits_view with (security_invoker=true) as
select
  se.id,
  se.sale_id,
  st.sale_number,
  se.edited_at,
  se.change_type,
  se.reason,
  se.old_values,
  se.new_values,
  p.display_name as editor_name,
  p.email as editor_email
from public.sale_edits se
join public.sales_transactions st on st.id = se.sale_id
left join public.profiles p on p.id = se.edited_by
order by se.edited_at desc;

grant select on public.sale_edits_view to authenticated;

-- 4. Notify PostgREST to reload schema
notify pgrst, 'reload schema';
