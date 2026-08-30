-- Fix sale full edit - addresses review issues from migration 13
-- 1. Proper record types, duplicate check, strict validation, allow clearing

-- Drop existing functions to recreate cleanly
drop function if exists public.apply_sale_content_edit(uuid,jsonb,text,text,text,numeric,date,text,numeric,text);
drop function if exists public.apply_sale_metadata_edit(uuid,text,text,text,numeric,date,text,numeric,text);

-- Recreate main content edit with fixes
create or replace function public.apply_sale_content_edit(
  p_sale_id uuid,
  p_items jsonb,
  p_customer_name text default null,
  p_payment_method text default null,
  p_payment_status text default null,
  p_discount_amount numeric default null,
  p_sale_date date default null,
  p_notes text default null,
  p_shipping_cost numeric default null,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_sale public.sales_transactions%rowtype;
  v_old_lines jsonb;
  v_old_allocs jsonb;
  v_new_subtotal numeric(14,2) := 0;
  v_new_total_cost numeric(14,2) := 0;
  v_group_id uuid := gen_random_uuid();
  v_item jsonb;
  v_book public.books%rowtype;
  v_batch public.inventory_batches%rowtype;
  v_book_id uuid;
  v_line_id uuid;
  v_qty integer;
  v_needed integer;
  v_take integer;
  v_unit_price numeric(12,2);
  v_line_cost numeric(14,2);
  v_allocations jsonb;
  v_new_alloc jsonb;
  v_old_alloc record;
  v_discount numeric(12,2);
  v_old_json jsonb;
  v_new_json jsonb;
  v_new_lines jsonb := '[]'::jsonb;
  v_reason_trim text;
  v_payment_method public.sale_payment_method;
  v_seen_book_ids uuid[] := '{}';
begin
  -- 1. Auth - admin/super_admin only
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);
  if not public.has_any_role(array['admin','super_admin']) then
    raise exception '只有管理员可以改动已确认的订单' using errcode='42501';
  end if;

  v_reason_trim := nullif(btrim(p_reason), '');
  if v_reason_trim is null then
    raise exception '请填写改动原因，会写入操作记录';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '改后购物车不能为空';
  end if;

  -- Duplicate book_id check
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_book_id := (v_item ->> 'book_id')::uuid;
    if v_book_id = any(v_seen_book_ids) then
      raise exception '同一本书不能出现两次，请合并数量：%', v_book_id;
    end if;
    v_seen_book_ids := array_append(v_seen_book_ids, v_book_id);
  end loop;

  -- 2. Lock sale
  select * into v_sale from public.sales_transactions where id = p_sale_id for update;
  if not found then raise exception '订单不存在'; end if;
  if v_sale.status = 'voided' then raise exception '已作废的订单不可编辑'; end if;

  -- Validate discount
  if p_discount_amount is not null then
    if p_discount_amount < 0 then raise exception '折扣不能为负数'; end if;
  end if;
  if p_shipping_cost is not null and p_shipping_cost < 0 then
    raise exception '运费不能为负数';
  end if;

  -- Validate payment_method - must be valid enum if provided and non-empty
  if p_payment_method is not null and btrim(p_payment_method) <> '' then
    begin
      v_payment_method := p_payment_method::public.sale_payment_method;
    exception when others then
      raise exception '付款方式不合法：%', p_payment_method;
    end;
  end if;

  -- Validate payment_status - strict to allowed values
  if p_payment_status is not null and btrim(p_payment_status) <> '' then
    if p_payment_status not in ('paid','pending','voided') then
      raise exception '付款状态不合法：%，只能是 paid/pending/voided', p_payment_status;
    end if;
  end if;

  -- Validate sale_date - not too far future, not too old
  if p_sale_date is not null then
    if p_sale_date > current_date + interval '1 day' then
      raise exception '销售日期不能是未来日期';
    end if;
    if p_sale_date < date '2000-01-01' then
      raise exception '销售日期不合法';
    end if;
  end if;

  -- 3. Capture old values for audit
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', stl.id,
    'book_id', stl.book_id,
    'book_title', b.title,
    'sku', b.sku,
    'quantity', stl.quantity,
    'unit_price', stl.unit_price,
    'line_total', stl.line_total,
    'cost_of_goods_sold', stl.cost_of_goods_sold
  ) order by stl.created_at), '[]'::jsonb)
  into v_old_lines
  from public.sales_transaction_lines stl
  left join public.books b on b.id = stl.book_id
  where stl.sale_id = p_sale_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sale_line_id', sba.sale_line_id,
    'batch_id', sba.batch_id,
    'batch_code', ib.batch_code,
    'quantity', sba.quantity,
    'unit_cost', sba.unit_cost
  )), '[]'::jsonb)
  into v_old_allocs
  from public.sales_batch_allocations sba
  join public.sales_transaction_lines stl on stl.id = sba.sale_line_id
  left join public.inventory_batches ib on ib.id = sba.batch_id
  where stl.sale_id = p_sale_id;

  v_old_json := jsonb_build_object(
    'sale_number', v_sale.sale_number,
    'customer_name', v_sale.customer_name,
    'payment_method', v_sale.payment_method,
    'payment_status', v_sale.payment_status,
    'discount_amount', v_sale.discount_amount,
    'sale_date', v_sale.sale_date,
    'notes', v_sale.notes,
    'customer_note', v_sale.customer_note,
    'shipping_cost', v_sale.shipping_cost,
    'subtotal', v_sale.subtotal,
    'total_cost', v_sale.total_cost,
    'lines', v_old_lines,
    'allocations', v_old_allocs
  );

  -- 4. Restore old inventory (reverse FIFO) - use proper record type
  for v_old_alloc in
    select sba.quantity, sba.batch_id, sba.unit_cost, stl.book_id
    from public.sales_batch_allocations sba
    join public.sales_transaction_lines stl on stl.id = sba.sale_line_id
    where stl.sale_id = p_sale_id
  loop
    update public.inventory_batches
    set quantity_remaining = quantity_remaining + v_old_alloc.quantity
    where id = v_old_alloc.batch_id;

    insert into public.inventory_transactions(
      transaction_group_id, transaction_type, book_id, quantity,
      destination_location_id, destination_batch_id, unit_cost,
      reference_type, reference_id, reason, actor_profile_id, occurred_at, metadata
    ) values (
      v_group_id, 'return_in', v_old_alloc.book_id, v_old_alloc.quantity,
      v_sale.location_id, v_old_alloc.batch_id, v_old_alloc.unit_cost,
      'sale_edit', p_sale_id, v_reason_trim, v_actor, now(),
      jsonb_build_object('edit_type','restore','sale_number', v_sale.sale_number)
    );
  end loop;

  -- Delete old allocations and lines (SECURITY DEFINER as postgres bypasses immutable trigger)
  delete from public.sales_batch_allocations
  where sale_line_id in (select id from public.sales_transaction_lines where sale_id = p_sale_id);

  delete from public.sales_transaction_lines where sale_id = p_sale_id;

  -- 5. Apply new items with FIFO deduction
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_book_id := (v_item ->> 'book_id')::uuid;
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then raise exception '数量必须大于0'; end if;

    select * into v_book from public.books where id = v_book_id and is_active;
    if not found then raise exception '图书不存在或已停用: %', v_book_id; end if;

    v_unit_price := coalesce((v_item ->> 'unit_price')::numeric, v_book.current_price);
    if v_unit_price < 0 then raise exception '售价不可为负数'; end if;

    v_needed := v_qty;
    v_line_cost := 0;
    v_allocations := '[]'::jsonb;

    for v_batch in
      select * from public.inventory_batches
      where book_id = v_book_id and location_id = v_sale.location_id and quantity_remaining > 0
      order by received_at asc, id asc
      for update
    loop
      exit when v_needed <= 0;
      v_take := least(v_needed, v_batch.quantity_remaining);
      update public.inventory_batches set quantity_remaining = quantity_remaining - v_take where id = v_batch.id;
      v_allocations := v_allocations || jsonb_build_array(jsonb_build_object('batch_id', v_batch.id, 'quantity', v_take, 'unit_cost', v_batch.unit_cost));
      v_line_cost := v_line_cost + (v_take * v_batch.unit_cost);
      v_needed := v_needed - v_take;
    end loop;

    if v_needed > 0 then
      raise exception '库存不足：% 仅剩 % 本，需要 % 本', v_book.title, (v_qty - v_needed), v_qty;
    end if;

    v_line_id := gen_random_uuid();
    insert into public.sales_transaction_lines(
      id, sale_id, book_id, quantity, unit_price, cost_of_goods_sold
    ) values (
      v_line_id, p_sale_id, v_book_id, v_qty, v_unit_price, v_line_cost
    );

    for v_new_alloc in select * from jsonb_array_elements(v_allocations)
    loop
      insert into public.sales_batch_allocations(
        sale_line_id, batch_id, quantity, unit_cost
      ) values (
        v_line_id, (v_new_alloc ->> 'batch_id')::uuid, (v_new_alloc ->> 'quantity')::integer, (v_new_alloc ->> 'unit_cost')::numeric
      );

      insert into public.inventory_transactions(
        transaction_group_id, transaction_type, book_id, quantity,
        source_location_id, source_batch_id, unit_cost, unit_price,
        reference_type, reference_id, actor_profile_id, occurred_at, metadata
      ) values (
        v_group_id, 'sale', v_book_id, (v_new_alloc ->> 'quantity')::integer,
        v_sale.location_id, (v_new_alloc ->> 'batch_id')::uuid,
        (v_new_alloc ->> 'unit_cost')::numeric, v_unit_price,
        'sale', p_sale_id, v_actor, now(),
        jsonb_build_object('edit_type','rededuct','sale_number', v_sale.sale_number)
      );
    end loop;

    v_new_subtotal := v_new_subtotal + (v_qty * v_unit_price);
    v_new_total_cost := v_new_total_cost + v_line_cost;
    v_new_lines := v_new_lines || jsonb_build_array(jsonb_build_object(
      'book_id', v_book_id,
      'book_title', v_book.title,
      'sku', v_book.sku,
      'quantity', v_qty,
      'unit_price', v_unit_price,
      'line_total', (v_qty * v_unit_price),
      'cost', v_line_cost
    ));
  end loop;

  -- 6. Validate discount against new subtotal
  v_discount := coalesce(p_discount_amount, v_sale.discount_amount, 0);
  if v_discount < 0 then raise exception '折扣不能为负数'; end if;
  if v_discount > v_new_subtotal then
    raise exception '折扣 £% 不能大于小计 £%', v_discount, v_new_subtotal;
  end if;

  -- 7. Update sale header (preserve sale_number, created_by, sold_at, location_id)
  -- Empty string means clear to null, null means keep old
  update public.sales_transactions
  set
    customer_name = case when p_customer_name is null then customer_name when btrim(p_customer_name) = '' then null else p_customer_name end,
    payment_method = coalesce(v_payment_method, payment_method),
    payment_status = case when p_payment_status is null then payment_status when btrim(p_payment_status) = '' then payment_status else p_payment_status end,
    discount_amount = v_discount,
    sale_date = coalesce(p_sale_date, sale_date),
    notes = case when p_notes is null then notes when btrim(p_notes) = '' then null else p_notes end,
    customer_note = case when p_notes is null then customer_note when btrim(p_notes) = '' then null else p_notes end,
    shipping_cost = coalesce(p_shipping_cost, shipping_cost),
    subtotal = v_new_subtotal,
    total_cost = v_new_total_cost
  where id = p_sale_id;

  -- 8. Build new json for audit
  select jsonb_build_object(
    'sale_number', sale_number,
    'customer_name', customer_name,
    'payment_method', payment_method,
    'payment_status', payment_status,
    'discount_amount', discount_amount,
    'sale_date', sale_date,
    'notes', notes,
    'customer_note', customer_note,
    'shipping_cost', shipping_cost,
    'subtotal', subtotal,
    'total_cost', total_cost,
    'lines', v_new_lines
  ) into v_new_json
  from public.sales_transactions where id = p_sale_id;

  insert into public.sale_edits(sale_id, edited_by, reason, change_type, old_values, new_values)
  values (p_sale_id, v_actor, v_reason_trim, 'content', v_old_json, v_new_json);

end;
$$;

revoke all on function public.apply_sale_content_edit(uuid,jsonb,text,text,text,numeric,date,text,numeric,text) from public;
grant execute on function public.apply_sale_content_edit(uuid,jsonb,text,text,text,numeric,date,text,numeric,text) to authenticated;

-- Proper metadata-only edit - does NOT touch inventory
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
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_sale public.sales_transactions%rowtype;
  v_old_json jsonb;
  v_new_json jsonb;
  v_reason_trim text;
  v_payment_method public.sale_payment_method;
  v_discount numeric(12,2);
begin
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);
  if not public.has_any_role(array['admin','super_admin']) then
    raise exception '只有管理员可以改动已确认的订单' using errcode='42501';
  end if;

  v_reason_trim := nullif(btrim(p_reason), '');
  if v_reason_trim is null then
    raise exception '请填写改动原因，会写入操作记录';
  end if;

  select * into v_sale from public.sales_transactions where id = p_sale_id for update;
  if not found then raise exception '订单不存在'; end if;
  if v_sale.status = 'voided' then raise exception '已作废的订单不可编辑'; end if;

  if p_discount_amount is not null and p_discount_amount < 0 then
    raise exception '折扣不能为负数';
  end if;
  if p_shipping_cost is not null and p_shipping_cost < 0 then
    raise exception '运费不能为负数';
  end if;

  if p_payment_method is not null and btrim(p_payment_method) <> '' then
    begin
      v_payment_method := p_payment_method::public.sale_payment_method;
    exception when others then
      raise exception '付款方式不合法：%', p_payment_method;
    end;
  end if;

  if p_payment_status is not null and btrim(p_payment_status) <> '' then
    if p_payment_status not in ('paid','pending','voided') then
      raise exception '付款状态不合法：%，只能是 paid/pending/voided', p_payment_status;
    end if;
  end if;

  if p_sale_date is not null then
    if p_sale_date > current_date + interval '1 day' then
      raise exception '销售日期不能是未来日期';
    end if;
    if p_sale_date < date '2000-01-01' then
      raise exception '销售日期不合法';
    end if;
  end if;

  -- Capture old for audit (without lines change)
  select jsonb_build_object(
    'sale_number', sale_number,
    'customer_name', customer_name,
    'payment_method', payment_method,
    'payment_status', payment_status,
    'discount_amount', discount_amount,
    'sale_date', sale_date,
    'notes', notes,
    'customer_note', customer_note,
    'shipping_cost', shipping_cost,
    'subtotal', subtotal,
    'total_cost', total_cost
  ) into v_old_json from public.sales_transactions where id = p_sale_id;

  -- Validate discount against current subtotal
  v_discount := coalesce(p_discount_amount, v_sale.discount_amount, 0);
  if v_discount > v_sale.subtotal then
    raise exception '折扣 £% 不能大于小计 £%', v_discount, v_sale.subtotal;
  end if;

  update public.sales_transactions
  set
    customer_name = case when p_customer_name is null then customer_name when btrim(p_customer_name) = '' then null else p_customer_name end,
    payment_method = coalesce(v_payment_method, payment_method),
    payment_status = case when p_payment_status is null then payment_status when btrim(p_payment_status) = '' then payment_status else p_payment_status end,
    discount_amount = v_discount,
    sale_date = coalesce(p_sale_date, sale_date),
    notes = case when p_notes is null then notes when btrim(p_notes) = '' then null else p_notes end,
    customer_note = case when p_notes is null then customer_note when btrim(p_notes) = '' then null else p_notes end,
    shipping_cost = coalesce(p_shipping_cost, shipping_cost)
  where id = p_sale_id;

  select jsonb_build_object(
    'sale_number', sale_number,
    'customer_name', customer_name,
    'payment_method', payment_method,
    'payment_status', payment_status,
    'discount_amount', discount_amount,
    'sale_date', sale_date,
    'notes', notes,
    'customer_note', customer_note,
    'shipping_cost', shipping_cost,
    'subtotal', subtotal,
    'total_cost', total_cost
  ) into v_new_json from public.sales_transactions where id = p_sale_id;

  insert into public.sale_edits(sale_id, edited_by, reason, change_type, old_values, new_values)
  values (p_sale_id, v_actor, v_reason_trim, 'metadata', v_old_json, v_new_json);
end;
$$;

revoke all on function public.apply_sale_metadata_edit(uuid,text,text,text,numeric,date,text,numeric,text) from public;
grant execute on function public.apply_sale_metadata_edit(uuid,text,text,text,numeric,date,text,numeric,text) to authenticated;

-- Ensure view is security_invoker
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
  p.email as editor_email,
  se.edited_by
from public.sale_edits se
join public.sales_transactions st on st.id = se.sale_id
left join public.profiles p on p.id = se.edited_by
order by se.edited_at desc;

grant select on public.sale_edits_view to authenticated;

notify pgrst, 'reload schema';
