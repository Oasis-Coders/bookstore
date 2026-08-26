-- Allow sale even if no inventory batches, with cost 0, and create batches if needed for demo books
create or replace function public.apply_sale(
  p_location_id uuid,
  p_items jsonb,
  p_external_reference text,
  p_sold_at timestamptz default now(),
  p_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
  v_sale_id uuid := gen_random_uuid();
  v_sale_number text;
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
  v_subtotal numeric(14,2) := 0;
  v_total_cost numeric(14,2) := 0;
  v_allocations jsonb;
  v_alloc jsonb;
  v_has_stock boolean;
begin
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'p_items 必须是非空 JSON 数组';
  end if;
  if not exists(select 1 from public.locations where id = p_location_id and is_active) then
    raise exception '销售库位不存在或已停用';
  end if;

  v_sale_number := coalesce(p_external_reference, 'SAL-' || to_char(p_sold_at, 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(v_sale_id::text, '-', ''), 1, 8)));
  insert into public.sales_transactions(
    id, sale_number, location_id, external_reference, sold_at, notes, created_by
  ) values (
    v_sale_id, v_sale_number, p_location_id, p_external_reference,
    p_sold_at, p_notes, v_actor
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_book_id := (v_item ->> 'book_id')::uuid;
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then raise exception '销售数量必须大于 0'; end if;

    select * into v_book from public.books where id = v_book_id and is_active;
    if not found then raise exception '书籍不存在或已停用：%', v_book_id; end if;
    v_unit_price := coalesce((v_item ->> 'unit_price')::numeric, v_book.current_price);
    if v_unit_price < 0 then raise exception '售价不可为负数'; end if;

    v_needed := v_qty;
    v_line_cost := 0;
    v_allocations := '[]'::jsonb;
    v_has_stock := exists(select 1 from public.inventory_batches where book_id = v_book_id and location_id = p_location_id and quantity_remaining > 0);

    if v_has_stock then
      for v_batch in
        select * from public.inventory_batches
        where book_id = v_book_id and location_id = p_location_id
          and quantity_remaining > 0
        order by received_at, id
        for update
      loop
        exit when v_needed = 0;
        v_take := least(v_needed, v_batch.quantity_remaining);
        update public.inventory_batches
        set quantity_remaining = quantity_remaining - v_take
        where id = v_batch.id;
        v_line_cost := v_line_cost + (v_take * v_batch.unit_cost);
        v_allocations := v_allocations || jsonb_build_array(jsonb_build_object(
          'batch_id', v_batch.id, 'quantity', v_take, 'unit_cost', v_batch.unit_cost
        ));
        v_needed := v_needed - v_take;
      end loop;
    end if;

    -- If still need stock but no batches, allow sale with 0 cost (for POS quick sale)
    if v_needed > 0 then
      if v_has_stock then
        -- Had some stock but insufficient - this is real stockout, should fail
        raise exception '库存不足：书籍 % 还缺 % 本', v_book.title, v_needed;
      else
        -- No stock at all, allow zero-cost sale for demo/empty inventory
        v_line_cost := 0;
        v_needed := 0;
      end if;
    end if;

    v_line_id := gen_random_uuid();
    insert into public.sales_transaction_lines(
      id, sale_id, book_id, quantity, unit_price, cost_of_goods_sold
    ) values (
      v_line_id, v_sale_id, v_book_id, v_qty, v_unit_price, v_line_cost
    );

    for v_alloc in select value from jsonb_array_elements(v_allocations)
    loop
      insert into public.sales_batch_allocations(
        sale_line_id, batch_id, quantity, unit_cost
      ) values (
        v_line_id, (v_alloc ->> 'batch_id')::uuid, (v_alloc ->> 'quantity')::int, (v_alloc ->> 'unit_cost')::numeric
      );
    end loop;

    v_subtotal := v_subtotal + (v_qty * v_unit_price);
    v_total_cost := v_total_cost + v_line_cost;
  end loop;

  update public.sales_transactions
  set subtotal = v_subtotal, total_cost = v_total_cost
  where id = v_sale_id;

  return v_sale_id;
end;
$$;

-- Seed inventory for demo books if not exists
insert into public.inventory_batches (id, batch_code, book_id, location_id, source_type, received_at, unit_cost, quantity_received, quantity_remaining, created_by)
select gen_random_uuid(), 'SEED-'||b.id::text, b.id, l.id, 'adjustment', now(), 5.00, 20, 20, p.id
from public.books b
cross join (select id from public.locations limit 1) l
cross join (select id from public.profiles limit 1) p
where b.sku in ('BOOK-DEMO-001','BOOK-DEMO-002','BOOK-SAMPLE-003')
and not exists (select 1 from public.inventory_batches where book_id = b.id and location_id = l.id);

