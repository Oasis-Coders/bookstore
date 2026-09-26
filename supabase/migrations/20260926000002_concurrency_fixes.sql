-- Concurrency + error-message fixes 2026-09-26
-- 1) generate_sale_number: previously did MAX-scan + setval on EVERY call, so two
--    simultaneous sales could generate the same C-number -> unique violation with a
--    raw English error. Now serializes generators with an advisory transaction lock
--    (held until the consuming INSERT commits) and only ever moves the sequence
--    forward (self-heals if C-numbers were inserted directly, never backward).
-- 2) apply_purchase_receipt: friendlier Chinese messages (status translated,
--    book title instead of raw UUID).

-- Ensure the app role can operate the sequence in every path
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.sale_number_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_seq bigint;
  v_max bigint;
  v_cur bigint;
BEGIN
  -- Serialize concurrent generators for the whole transaction. The lock is
  -- released at transaction end, which covers the INSERT consuming the number.
  PERFORM pg_advisory_xact_lock(hashtext('bookstore:sale_number'));

  -- Self-heal forward only: if rows carrying higher C-numbers were inserted
  -- directly (import), catch the sequence up. Never move it backward, so
  -- already-issued numbers are never reused.
  SELECT MAX((substring(sale_number from 'C(\d+)'))::bigint)
    INTO v_max
    FROM public.sales_transactions
    WHERE sale_number ~ '^C\d+$';

  IF v_max IS NOT NULL AND v_max >= 100000 THEN
    SELECT last_value INTO v_cur FROM public.sale_number_seq;
    IF v_max > v_cur THEN
      PERFORM setval('public.sale_number_seq', v_max, true);
    END IF;
  END IF;

  v_seq := nextval('public.sale_number_seq');
  -- Fresh sequence guard (should already start at 100010)
  IF v_seq < 100010 THEN
    PERFORM setval('public.sale_number_seq', 100010, false);
    v_seq := nextval('public.sale_number_seq');
  END IF;

  RETURN 'C' || lpad(v_seq::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_sale_number() TO authenticated;

-- Friendlier receipt messages
CREATE OR REPLACE FUNCTION public.apply_purchase_receipt(
  p_purchase_order_id uuid,
  p_location_id uuid,
  p_receipt_lines jsonb,
  p_received_at timestamptz default now()
) returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_group_id uuid := gen_random_uuid();
  v_po public.purchase_orders%rowtype;
  v_line public.purchase_order_lines%rowtype;
  v_entry jsonb;
  v_qty integer;
  v_batch_id uuid;
  v_batch_code text;
  v_book_title text;
  v_status_zh text;
begin
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);
  if jsonb_typeof(p_receipt_lines) <> 'array' or jsonb_array_length(p_receipt_lines) = 0 then
    raise exception '收货明细不能为空';
  end if;
  if not exists(select 1 from public.locations where id = p_location_id and is_active) then
    raise exception '收货库位不存在或已停用';
  end if;

  select * into v_po from public.purchase_orders
  where id = p_purchase_order_id for update;
  if not found then raise exception '采购单不存在'; end if;
  if v_po.status not in ('approved','ordered','partially_received') then
    v_status_zh := case v_po.status::text
      when 'draft' then '草稿'
      when 'received' then '已收货完成'
      when 'cancelled' then '已取消'
      else v_po.status::text end;
    raise exception '采购单当前状态为「%」，不允许收货', v_status_zh;
  end if;

  for v_entry in select value from jsonb_array_elements(p_receipt_lines)
  loop
    v_qty := (v_entry ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then raise exception '收货数量必须大于 0'; end if;

    select * into v_line from public.purchase_order_lines
    where id = (v_entry ->> 'purchase_order_line_id')::uuid
      and purchase_order_id = p_purchase_order_id
    for update;
    if not found then raise exception '采购单行不存在或不属于该采购单'; end if;

    select title into v_book_title from public.books where id = v_line.book_id;

    if v_line.quantity_received + v_qty > v_line.quantity_ordered then
      raise exception '收货数量超过可收数量：「%」已收 % 本，本次 % 本，超出 % 本',
        coalesce(v_book_title, v_line.book_id::text),
        v_line.quantity_received, v_qty,
        (v_line.quantity_received + v_qty - v_line.quantity_ordered);
    end if;

    v_batch_id := gen_random_uuid();
    v_batch_code := 'BAT-' || to_char(p_received_at, 'YYYYMMDD') || '-' ||
      upper(substr(replace(v_batch_id::text, '-', ''), 1, 10));

    insert into public.inventory_batches(
      id, batch_code, book_id, location_id, purchase_order_line_id,
      source_type, received_at, unit_cost, quantity_received,
      quantity_remaining, created_by
    ) values (
      v_batch_id, v_batch_code, v_line.book_id, p_location_id, v_line.id,
      'purchase', p_received_at, v_line.unit_cost, v_qty, v_qty, v_actor
    );

    insert into public.inventory_transactions(
      transaction_group_id, transaction_type, book_id, quantity,
      destination_location_id, destination_batch_id, unit_cost,
      reference_type, reference_id, actor_profile_id, occurred_at
    ) values (
      v_group_id, 'purchase_receipt', v_line.book_id, v_qty,
      p_location_id, v_batch_id, v_line.unit_cost,
      'purchase_order', p_purchase_order_id, v_actor, p_received_at
    );

    update public.purchase_order_lines
    set quantity_received = quantity_received + v_qty
    where id = v_line.id;
  end loop;

  update public.purchase_orders
  set status = case
    when not exists (
      select 1 from public.purchase_order_lines
      where purchase_order_id = p_purchase_order_id
        and quantity_received < quantity_ordered
    ) then 'received'::public.purchase_order_status
    else 'partially_received'::public.purchase_order_status
  end
  where id = p_purchase_order_id;

  return v_group_id;
end;
$$;

revoke all on function public.apply_purchase_receipt(uuid,uuid,jsonb,timestamptz) from public;
grant execute on function public.apply_purchase_receipt(uuid,uuid,jsonb,timestamptz) to authenticated;

NOTIFY pgrst, 'reload schema';
