-- Bookstore feedback batch 2026-09-30 (part 2)
-- 1C 备用条码库（内部 EAN-13，27 开头）/ 2A PayPal + Mix 付款明细 / 3A 采购行勾选 / 3B 阶段经手人 / 3C 收货时录入进货价

-- ============ 2A: sale_payment_method 增加 paypal ============
-- ALTER TYPE ... ADD VALUE 不能在事务块中执行；直接写 pg_enum（事务安全、幂等），提交后生效。
-- 注意：经 Management API 应用时无 pg_enum 写权限，此时请单独执行
--   ALTER TYPE public.sale_payment_method ADD VALUE 'paypal';
-- （已于 2026-09-30 单独执行成功）
do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'sale_payment_method' and t.typnamespace = 'public'::regnamespace
      and e.enumlabel = 'paypal'
  ) then
    begin
      insert into pg_enum (enumtypid, enumlabel)
      values ('public.sale_payment_method'::regtype, 'paypal');
    exception when insufficient_privilege then
      raise notice 'skip pg_enum insert (insufficient privilege): run ALTER TYPE ... ADD VALUE separately';
    end;
  end if;
end $$;

-- ============ 2A: Mix 付款明细 ============
alter table public.sales_transactions add column if not exists payment_mix jsonb;
comment on column public.sales_transactions.payment_mix is 'Mix付款明细：[{"method":"cash","amount":12.5},{"method":"card","amount":3}]，非 Mix 时为 null';

-- ============ 1C: 备用条码库 ============
create table if not exists public.spare_barcodes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'available' check (status in ('available','assigned','retired')),
  assigned_book_id uuid references public.books(id),
  assigned_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
comment on table public.spare_barcodes is '备用条码库：无原厂条码图书的内部 EAN-13 条码（27 开头内部号段），为 2027-01-10 年度盘点后批量导入做准备';

alter table public.spare_barcodes enable row level security;
drop policy if exists spare_barcodes_read on public.spare_barcodes;
create policy spare_barcodes_read on public.spare_barcodes for select to authenticated
  using (public.has_any_role(array['staff','admin','super_admin']));
drop policy if exists spare_barcodes_write on public.spare_barcodes;
create policy spare_barcodes_write on public.spare_barcodes for insert to authenticated
  with check (public.has_any_role(array['staff','admin','super_admin']));
drop policy if exists spare_barcodes_update on public.spare_barcodes;
create policy spare_barcodes_update on public.spare_barcodes for update to authenticated
  using (public.has_any_role(array['staff','admin','super_admin']))
  with check (public.has_any_role(array['staff','admin','super_admin']));
drop policy if exists spare_barcodes_delete on public.spare_barcodes;
create policy spare_barcodes_delete on public.spare_barcodes for delete to authenticated
  using (public.has_any_role(array['admin','super_admin']));

-- EAN-13 校验位（前 12 位 -> 第 13 位）
create or replace function public.ean13_check_digit(p12 text)
returns text language plpgsql immutable set search_path = public, pg_temp as $$
declare
  i int; d int; s int := 0;
begin
  if p12 !~ '^\d{12}$' then raise exception 'ean13_check_digit 需要 12 位数字'; end if;
  for i in 1..12 loop
    d := substring(p12 from i for 1)::int;
    s := s + d * (case when i % 2 = 1 then 1 else 3 end);
  end loop;
  return ((10 - (s % 10)) % 10)::text;
end $$;

-- 批量生成备用条码（27 开头内部号段），返回新增数量；已生成的号段不会重复
create or replace function public.generate_spare_barcodes(p_count int default 500)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_start bigint; v_added int := 0; v_i bigint; v12 text; v13 text;
begin
  perform public.require_inventory_role(array['staff','admin','super_admin']);
  if p_count is null or p_count <= 0 or p_count > 10000 then
    raise exception '一次最多生成 10000 个条码';
  end if;
  select coalesce(max((substring(code from 3 for 10))::bigint), 0) into v_start
    from public.spare_barcodes where code ~ '^27\d{11}$';
  for v_i in (v_start+1)..(v_start+p_count) loop
    v12 := '27' || lpad(v_i::text, 10, '0');
    v13 := v12 || public.ean13_check_digit(v12);
    insert into public.spare_barcodes(code) values (v13)
    on conflict (code) do nothing;
    v_added := v_added + 1;
  end loop;
  return v_added;
end $$;
revoke all on function public.generate_spare_barcodes(int) from public;
grant execute on function public.generate_spare_barcodes(int) to authenticated;

-- 为一本书分配下一个可用条码（并发安全 skip locked）
create or replace function public.allocate_spare_barcode(p_book_id uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.spare_barcodes%rowtype;
begin
  perform public.require_inventory_role(array['staff','admin','super_admin']);
  if not exists (select 1 from public.books where id = p_book_id) then
    raise exception '图书不存在';
  end if;
  select * into v_row from public.spare_barcodes
    where status = 'available' order by code limit 1 for update skip locked;
  if not found then raise exception '备用条码已用完，请先批量生成'; end if;
  update public.spare_barcodes
    set status = 'assigned', assigned_book_id = p_book_id, assigned_at = now()
    where id = v_row.id;
  return v_row.code;
end $$;
revoke all on function public.allocate_spare_barcode(uuid) from public;
grant execute on function public.allocate_spare_barcode(uuid) to authenticated;

-- 预置 1000 个备用条码（migration 内无登录用户，直接插入）
do $$
declare v_i bigint; v12 text; v13 text;
begin
  for v_i in 1..1000 loop
    v12 := '27' || lpad(v_i::text, 10, '0');
    v13 := v12 || public.ean13_check_digit(v12);
    insert into public.spare_barcodes(code) values (v13)
    on conflict (code) do nothing;
  end loop;
end $$;

-- ============ 3A: 采购行勾选（Tick/Untick） ============
alter table public.purchase_order_lines add column if not exists is_selected boolean not null default true;
comment on column public.purchase_order_lines.is_selected is '是否纳入收货/新批次：未勾选的行不会进入收货批次';

-- ============ 3B: 采购单阶段经手人 ============
alter table public.purchase_orders add column if not exists stage_handlers jsonb not null default '{}'::jsonb;
comment on column public.purchase_orders.stage_handlers is '各阶段经手人：{"draft":"Mandy","approved":"KAM",...}，值为 Staff 显示名';

-- ============ 采购单号序列（替代客户端随机后缀，避免碰撞） ============
create sequence if not exists public.po_number_seq;
create or replace function public.generate_po_number()
returns text language plpgsql set search_path = public, pg_temp as $$
begin
  return 'PO-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.po_number_seq')::text, 4, '0');
end $$;

-- ============ 原子创建采购单草稿（多书行，一次提交） ============
create or replace function public.create_purchase_order_draft(
  p_supplier_id uuid,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_actor uuid; v_name text; v_po_id uuid; v_po_number text; v_entry jsonb;
  v_book_id uuid; v_qty int; v_selected boolean;
begin
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);
  if not exists (select 1 from public.suppliers where id = p_supplier_id and is_active) then
    raise exception '供应商不存在或已停用';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception '采购单至少要包含一种书';
  end if;
  select display_name into v_name from public.profiles where id = v_actor;
  v_po_id := gen_random_uuid();
  v_po_number := public.generate_po_number();
  insert into public.purchase_orders(id, po_number, supplier_id, status, notes, created_by, stage_handlers)
  values (v_po_id, v_po_number, p_supplier_id, 'draft',
          nullif(btrim(coalesce(p_notes,'')), ''),
          v_actor,
          jsonb_build_object('draft', coalesce(nullif(btrim(coalesce(v_name,'')), ''), 'Staff')));
  for v_entry in select value from jsonb_array_elements(p_lines) loop
    v_book_id := (v_entry ->> 'book_id')::uuid;
    v_qty := (v_entry ->> 'quantity')::int;
    v_selected := coalesce((v_entry ->> 'is_selected')::boolean, true);
    if v_book_id is null then raise exception '缺少 book_id'; end if;
    if v_qty is null or v_qty <= 0 then raise exception '数量必须大于 0'; end if;
    if not exists (select 1 from public.books where id = v_book_id and is_active) then
      raise exception '图书不存在或已停用';
    end if;
    insert into public.purchase_order_lines(purchase_order_id, book_id, quantity_ordered, unit_cost, is_selected)
    values (v_po_id, v_book_id, v_qty, 0, v_selected);
  end loop;
  return v_po_id;
end $$;
revoke all on function public.create_purchase_order_draft(uuid, text, jsonb) from public;
grant execute on function public.create_purchase_order_draft(uuid, text, jsonb) to authenticated;

-- ============ 3C+3A: 收货（支持收货时录入进货价；仅已勾选行计入完成） ============
drop function if exists public.apply_purchase_receipt(uuid,uuid,jsonb,timestamptz);
create or replace function public.apply_purchase_receipt(
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
  v_unit_cost numeric(12,2);
  v_batch_id uuid;
  v_batch_code text;
begin
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);
  if jsonb_typeof(p_receipt_lines) <> 'array' or jsonb_array_length(p_receipt_lines) = 0 then
    raise exception 'p_receipt_lines 必须是非空 JSON 数组';
  end if;
  if not exists(select 1 from public.locations where id = p_location_id and is_active) then
    raise exception '收货库位不存在或已停用';
  end if;

  select * into v_po from public.purchase_orders
  where id = p_purchase_order_id for update;
  if not found then raise exception '采购单不存在'; end if;
  if v_po.status not in ('approved','ordered','partially_received') then
    raise exception '采购单状态 % 不允许收货', v_po.status;
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
    if not v_line.is_selected then
      raise exception '该行未勾选，不参与收货';
    end if;
    if v_line.quantity_received + v_qty > v_line.quantity_ordered then
      raise exception '收货数量超过未收数量（书籍 %）', v_line.book_id;
    end if;

    -- 3C：收货时录入实际进货价（草稿阶段不再填写）；未提供则沿用行上的价格
    v_unit_cost := coalesce(nullif(v_entry ->> 'unit_cost', '')::numeric, v_line.unit_cost);
    if v_unit_cost is null or v_unit_cost < 0 then raise exception '进货价不能为负数'; end if;

    v_batch_id := gen_random_uuid();
    v_batch_code := 'BAT-' || to_char(p_received_at, 'YYYYMMDD') || '-' ||
      upper(substr(replace(v_batch_id::text, '-', ''), 1, 10));

    insert into public.inventory_batches(
      id, batch_code, book_id, location_id, purchase_order_line_id,
      source_type, received_at, unit_cost, quantity_received,
      quantity_remaining, created_by
    ) values (
      v_batch_id, v_batch_code, v_line.book_id, p_location_id, v_line.id,
      'purchase', p_received_at, v_unit_cost, v_qty, v_qty, v_actor
    );

    insert into public.inventory_transactions(
      transaction_group_id, transaction_type, book_id, quantity,
      destination_location_id, destination_batch_id, unit_cost,
      reference_type, reference_id, actor_profile_id, occurred_at
    ) values (
      v_group_id, 'purchase_receipt', v_line.book_id, v_qty,
      p_location_id, v_batch_id, v_unit_cost,
      'purchase_order', p_purchase_order_id, v_actor, p_received_at
    );

    update public.purchase_order_lines
    set quantity_received = quantity_received + v_qty,
        unit_cost = v_unit_cost
    where id = v_line.id;
  end loop;

  -- 只有被勾选的行才计入"是否收完"
  update public.purchase_orders
  set status = case
    when not exists (
      select 1 from public.purchase_order_lines
      where purchase_order_id = p_purchase_order_id
        and is_selected
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

comment on function public.apply_purchase_receipt(uuid,uuid,jsonb,timestamptz) is
  '原子收货：更新采购已收数量、收货时写入实际进货价、建立成本批次、写入不可变库存流水；仅已勾选行计入完成';


-- Fix: 010 dropped sequence CASCADE which also dropped apply_sale functions
-- Recreate apply_sale (both 12-arg and 5-arg wrapper) after sequence fix
-- Corrected to use live schema: sale_id, cost_of_goods_sold, sales_batch_allocations

-- Ensure sequence exists as bigint
CREATE SEQUENCE IF NOT EXISTS public.sale_number_seq AS bigint START 100010;
GRANT USAGE ON SEQUENCE public.sale_number_seq TO authenticated;

-- Recreate generate_sale_number (safe version from 010)
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_seq bigint;
  v_max bigint;
BEGIN
  SELECT MAX((substring(sale_number from 'C(\d+)'))::bigint)
  INTO v_max
  FROM public.sales_transactions
  WHERE sale_number ~ '^C\d+$';
  IF v_max IS NOT NULL AND v_max >= 100000 THEN
    PERFORM setval('public.sale_number_seq', GREATEST(v_max, 100010), true);
  ELSE
    PERFORM setval('public.sale_number_seq', 100010, false);
  END IF;
  v_seq := nextval('public.sale_number_seq');
  RETURN 'C' || lpad(v_seq::text, 6, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_sale_number() TO authenticated;

-- Recreate apply_sale 12-arg (corrected from 009, with live schema columns)
DROP FUNCTION IF EXISTS public.apply_sale(uuid, jsonb, text, timestamptz, text, text, text, numeric, text, date, numeric, text);
DROP FUNCTION IF EXISTS public.apply_sale(uuid, jsonb, text, timestamptz, text) CASCADE;

CREATE OR REPLACE FUNCTION public.apply_sale(
  p_location_id uuid,
  p_items jsonb,
  p_external_reference text DEFAULT NULL,
  p_sold_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL,
  p_payment_method text DEFAULT 'cash',
  p_payment_status text DEFAULT 'paid',
  p_discount_amount numeric DEFAULT 0,
  p_customer_name text DEFAULT NULL,
  p_sale_date date DEFAULT NULL,
  p_shipping_cost numeric DEFAULT 0,
  p_customer_note text DEFAULT NULL,
  p_payment_mix jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid;
  v_sale_id uuid := gen_random_uuid();
  v_sale_number text;
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
  v_subtotal numeric(14,2) := 0;
  v_total_cost numeric(14,2) := 0;
  v_allocations jsonb;
  v_alloc jsonb;
  v_discount_percent numeric(5,2);
  v_discount_amt numeric(12,2);
  v_line_total numeric(14,2);
BEGIN
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION '购物车不能为空';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.locations WHERE id = p_location_id AND is_active) THEN
    RAISE EXCEPTION '销售库位不存在或已停用';
  END IF;

  IF p_external_reference IS NOT NULL AND p_external_reference <> '' THEN
    v_sale_number := p_external_reference;
  ELSE
    v_sale_number := public.generate_sale_number();
  END IF;

  INSERT INTO public.sales_transactions(
    id, sale_number, location_id, external_reference, sold_at, sale_date,
    payment_method, payment_status, discount_amount, customer_name, customer_note,
    shipping_cost, notes, subtotal, total_cost, created_by, status,
    payment_mix
  ) VALUES (
    v_sale_id,
    v_sale_number,
    p_location_id,
    COALESCE(p_external_reference, v_sale_number),
    COALESCE(p_sold_at, now()),
    COALESCE(p_sale_date, (COALESCE(p_sold_at, now())::date)),
    (p_payment_method::public.sale_payment_method),
    COALESCE(p_payment_status, 'paid'),
    COALESCE(p_discount_amount, 0),
    p_customer_name,
    COALESCE(p_customer_note, p_notes),
    COALESCE(p_shipping_cost, 0),
    p_notes,
    0, 0,
    v_actor,
    'completed',
    p_payment_mix
  );

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_book_id := (v_item ->> 'book_id')::uuid;
    v_qty := COALESCE((v_item ->> 'quantity')::integer, 1);
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION '销售数量必须大于 0';
    END IF;

    SELECT * INTO v_book FROM public.books WHERE id = v_book_id AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION '书籍不存在或已停用';
    END IF;

    v_unit_price := COALESCE((v_item ->> 'unit_price')::numeric, v_book.current_price);
    IF v_unit_price < 0 THEN
      RAISE EXCEPTION '售价不可为负数';
    END IF;

    v_discount_percent := COALESCE((v_item ->> 'discount_percent')::numeric, 0);
    v_discount_amt := COALESCE((v_item ->> 'discount_amount')::numeric, 0);

    v_needed := v_qty;
    v_line_cost := 0;
    v_allocations := '[]'::jsonb;

    FOR v_batch IN
      SELECT * FROM public.inventory_batches
      WHERE book_id = v_book_id AND location_id = p_location_id
        AND quantity_remaining > 0
      ORDER BY received_at, id
      FOR UPDATE
    LOOP
      EXIT WHEN v_needed = 0;
      v_take := LEAST(v_needed, v_batch.quantity_remaining);
      UPDATE public.inventory_batches
      SET quantity_remaining = quantity_remaining - v_take
      WHERE id = v_batch.id;
      v_line_cost := v_line_cost + (v_take * v_batch.unit_cost);
      v_allocations := v_allocations || jsonb_build_array(jsonb_build_object(
        'batch_id', v_batch.id, 'quantity', v_take, 'unit_cost', v_batch.unit_cost
      ));
      v_needed := v_needed - v_take;
    END LOOP;

    IF v_needed > 0 THEN
      RAISE EXCEPTION '库存不足：% 还缺 % 本', v_book.title, v_needed;
    END IF;

    v_line_id := gen_random_uuid();
    v_line_total := v_qty * v_unit_price;

    INSERT INTO public.sales_transaction_lines(
      id, sale_id, book_id, quantity, unit_price, cost_of_goods_sold,
      discount_percent, discount_amount
    ) VALUES (
      v_line_id, v_sale_id, v_book_id, v_qty, v_unit_price, v_line_cost,
      COALESCE(v_discount_percent, 0), COALESCE(v_discount_amt, 0)
    );

    FOR v_alloc IN SELECT value FROM jsonb_array_elements(v_allocations)
    LOOP
      INSERT INTO public.sales_batch_allocations(
        sale_line_id, batch_id, quantity, unit_cost
      ) VALUES (
        v_line_id,
        (v_alloc ->> 'batch_id')::uuid,
        (v_alloc ->> 'quantity')::integer,
        (v_alloc ->> 'unit_cost')::numeric
      );

      INSERT INTO public.inventory_transactions(
        transaction_group_id, transaction_type, book_id, quantity,
        source_location_id, source_batch_id, unit_cost, unit_price,
        reference_type, reference_id, actor_profile_id, occurred_at
      ) VALUES (
        v_group_id, 'sale', v_book_id,
        (v_alloc ->> 'quantity')::integer, p_location_id,
        (v_alloc ->> 'batch_id')::uuid,
        (v_alloc ->> 'unit_cost')::numeric, v_unit_price,
        'sale', v_sale_id, v_actor, COALESCE(p_sold_at, now())
      );
    END LOOP;

    v_subtotal := v_subtotal + v_line_total;
    v_total_cost := v_total_cost + v_line_cost;
  END LOOP;

  UPDATE public.sales_transactions
  SET subtotal = v_subtotal,
      total_cost = v_total_cost
  WHERE id = v_sale_id;

  RETURN v_sale_id;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_sale(uuid, jsonb, text, timestamptz, text, text, text, numeric, text, date, numeric, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_sale(uuid, jsonb, text, timestamptz, text, text, text, numeric, text, date, numeric, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_sale(
  p_location_id uuid,
  p_items jsonb,
  p_external_reference text,
  p_sold_at timestamptz,
  p_notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.apply_sale(
    p_location_id, p_items, p_external_reference, p_sold_at, p_notes,
    'cash', 'paid', 0, NULL, NULL, 0, NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.apply_sale(uuid, jsonb, text, timestamptz, text) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_sale(uuid, jsonb, text, timestamptz, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- 改单 RPC：新增 p_payment_mix；'' 清空付款方式（待付未选）
drop function if exists public.apply_sale_content_edit(uuid,jsonb,text,text,text,numeric,date,text,numeric,text);
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
  p_reason text default null,
  p_payment_mix jsonb default null
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
  v_clear_payment_method boolean := false;
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
  -- null = keep, '' = clear to null （待付未选）, else enum
  if p_payment_method is not null then
    if btrim(p_payment_method) = '' then
      v_clear_payment_method := true;
    else
      begin
        v_payment_method := p_payment_method::public.sale_payment_method;
      exception when others then
        raise exception '付款方式不合法：%', p_payment_method;
      end;
    end if;
  end if;
  if p_payment_mix is not null and jsonb_typeof(p_payment_mix) <> 'array' then
    raise exception '付款明细格式不合法';
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
    payment_method = case when v_clear_payment_method then null else coalesce(v_payment_method, payment_method) end,
    payment_mix = case when p_payment_mix is null then payment_mix
      when jsonb_array_length(p_payment_mix) = 0 then null else p_payment_mix end,
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
revoke all on function public.apply_sale_content_edit(uuid,jsonb,text,text,text,numeric,date,text,numeric,text,jsonb) from public;
grant execute on function public.apply_sale_content_edit(uuid,jsonb,text,text,text,numeric,date,text,numeric,text,jsonb) to authenticated;

drop function if exists public.apply_sale_metadata_edit(uuid,text,text,text,numeric,date,text,numeric,text);
create or replace function public.apply_sale_metadata_edit(
  p_sale_id uuid,
  p_customer_name text default null,
  p_payment_method text default null,
  p_payment_status text default null,
  p_discount_amount numeric default null,
  p_sale_date date default null,
  p_notes text default null,
  p_shipping_cost numeric default null,
  p_reason text default null,
  p_payment_mix jsonb default null
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
  v_clear_payment_method boolean := false;
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

  -- null = keep, '' = clear to null （待付未选）, else enum
  if p_payment_method is not null then
    if btrim(p_payment_method) = '' then
      v_clear_payment_method := true;
    else
      begin
        v_payment_method := p_payment_method::public.sale_payment_method;
      exception when others then
        raise exception '付款方式不合法：%', p_payment_method;
      end;
    end if;
  end if;
  if p_payment_mix is not null and jsonb_typeof(p_payment_mix) <> 'array' then
    raise exception '付款明细格式不合法';
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
    payment_method = case when v_clear_payment_method then null else coalesce(v_payment_method, payment_method) end,
    payment_mix = case when p_payment_mix is null then payment_mix
      when jsonb_array_length(p_payment_mix) = 0 then null else p_payment_mix end,
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
revoke all on function public.apply_sale_metadata_edit(uuid,text,text,text,numeric,date,text,numeric,text,jsonb) from public;
grant execute on function public.apply_sale_metadata_edit(uuid,text,text,text,numeric,date,text,numeric,text,jsonb) to authenticated;

notify pgrst, 'reload schema';
