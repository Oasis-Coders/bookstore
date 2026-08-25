-- 活水书室图书管理系统 — Supabase / PostgreSQL Schema
-- 可直接粘贴到 Supabase SQL Editor 执行。
-- 设计原则：批次成本、FIFO 出库、不可变库存流水、staff/admin 角色权限。
-- 注意：文件末尾含明确标注的通用示例数据，可按需删除。

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- 1. 枚举类型
-- ============================================================
do $$ begin
  create type public.bookstore_location_type as enum ('store', 'warehouse');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.purchase_order_status as enum (
    'draft', 'approved', 'ordered', 'partially_received', 'received', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_transaction_type as enum (
    'purchase_receipt', 'sale', 'transfer', 'count_adjustment_in',
    'count_adjustment_out', 'return_in', 'write_off'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sale_status as enum ('completed', 'voided');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2. 用户与角色（与 COCM Camp App 的 staff/admin 模型一致）
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('staff', 'admin', 'super_admin')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create or replace function public.current_profile_id()
returns uuid language sql stable security invoker
set search_path = public
as $$ select auth.uid() $$;

create or replace function public.has_any_role(role_names text[])
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = any(role_names)
  );
$$;

revoke all on function public.has_any_role(text[]) from public;
grant execute on function public.has_any_role(text[]) to authenticated;

-- 新 Auth 用户自动建立 profile；角色需由管理员分配。
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- ============================================================
-- 3. 核心目录表
-- ============================================================
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_zh text not null,
  name_en text,
  contact_name text,
  email text,
  phone text,
  address text,
  payment_terms text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  title text not null,
  subtitle text,
  author text,
  publisher text,
  isbn13 text unique,
  category text,
  current_price numeric(12,2) not null default 0 check (current_price >= 0),
  currency char(3) not null default 'GBP',
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location_type public.bookstore_location_type not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 4. 采购单
-- ============================================================
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid not null references public.suppliers(id),
  status public.purchase_order_status not null default 'draft',
  currency char(3) not null default 'GBP',
  order_date date not null default current_date,
  expected_date date,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  notes text,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  book_id uuid not null references public.books(id),
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0
    check (quantity_received >= 0 and quantity_received <= quantity_ordered),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 5. FIFO 库存批次与不可变库存流水
-- ============================================================
create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  book_id uuid not null references public.books(id),
  location_id uuid not null references public.locations(id),
  purchase_order_line_id uuid references public.purchase_order_lines(id),
  parent_batch_id uuid references public.inventory_batches(id),
  source_type text not null default 'purchase'
    check (source_type in ('purchase', 'transfer', 'adjustment', 'return')),
  received_at timestamptz not null default now(),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  quantity_received integer not null check (quantity_received > 0),
  quantity_remaining integer not null
    check (quantity_remaining >= 0 and quantity_remaining <= quantity_received),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_group_id uuid not null default gen_random_uuid(),
  transaction_type public.inventory_transaction_type not null,
  book_id uuid not null references public.books(id),
  quantity integer not null check (quantity > 0),
  source_location_id uuid references public.locations(id),
  destination_location_id uuid references public.locations(id),
  source_batch_id uuid references public.inventory_batches(id),
  destination_batch_id uuid references public.inventory_batches(id),
  unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  unit_price numeric(12,2) check (unit_price is null or unit_price >= 0),
  reference_type text,
  reference_id uuid,
  reason text,
  actor_profile_id uuid not null references public.profiles(id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check (source_location_id is not null or destination_location_id is not null)
);

-- ============================================================
-- 6. 销售、行项目与 FIFO 成本分配
-- ============================================================
create table if not exists public.sales_transactions (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique,
  location_id uuid not null references public.locations(id),
  status public.sale_status not null default 'completed',
  external_reference text,
  sold_at timestamptz not null default now(),
  currency char(3) not null default 'GBP',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  total_cost numeric(14,2) not null default 0 check (total_cost >= 0),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sales_transaction_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales_transactions(id),
  book_id uuid not null references public.books(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(14,2) generated always as (quantity * unit_price) stored,
  cost_of_goods_sold numeric(14,2) not null check (cost_of_goods_sold >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.sales_batch_allocations (
  id uuid primary key default gen_random_uuid(),
  sale_line_id uuid not null references public.sales_transaction_lines(id),
  batch_id uuid not null references public.inventory_batches(id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  allocated_cost numeric(14,2) generated always as (quantity * unit_cost) stored,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. 通用触发器、采购金额维护、不可变审计保护
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create or replace function public.refresh_purchase_order_subtotal()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_po_id uuid;
begin
  v_po_id := coalesce(new.purchase_order_id, old.purchase_order_id);
  update public.purchase_orders po
  set subtotal = coalesce((
    select sum(pol.quantity_ordered * pol.unit_cost)
    from public.purchase_order_lines pol
    where pol.purchase_order_id = v_po_id
  ), 0), updated_at = now()
  where po.id = v_po_id;
  return coalesce(new, old);
end;
$$;

create or replace function public.prevent_immutable_change()
returns trigger language plpgsql set search_path = public
as $$
begin
  -- SECURITY DEFINER RPC 由 postgres 所有者执行，可在同一原子事务内完成汇总；
  -- 普通 authenticated 请求仍不可修改或删除审计记录。
  if current_user in ('postgres', 'supabase_admin') then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  raise exception '该记录属于不可变审计数据；请通过新的冲销/调整交易修正';
end;
$$;

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','suppliers','books','locations','purchase_orders','purchase_order_lines']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

drop trigger if exists refresh_po_subtotal_after_line on public.purchase_order_lines;
create trigger refresh_po_subtotal_after_line
after insert or update or delete on public.purchase_order_lines
for each row execute function public.refresh_purchase_order_subtotal();

-- 销售与流水均 append-only。作废/退货必须另记新交易，不修改旧账。
do $$
declare t text;
begin
  foreach t in array array['inventory_transactions','sales_transactions','sales_transaction_lines','sales_batch_allocations']
  loop
    execute format('drop trigger if exists prevent_%I_change on public.%I', t, t);
    execute format('create trigger prevent_%I_change before update or delete on public.%I for each row execute function public.prevent_immutable_change()', t, t);
  end loop;
end $$;

-- ============================================================
-- 8. 索引
-- ============================================================
create index if not exists idx_books_title on public.books(title);
create index if not exists idx_books_publisher on public.books(publisher);
create index if not exists idx_books_category on public.books(category);
create index if not exists idx_po_supplier_date on public.purchase_orders(supplier_id, order_date desc);
create index if not exists idx_po_status on public.purchase_orders(status);
create index if not exists idx_po_lines_po on public.purchase_order_lines(purchase_order_id);
create index if not exists idx_batches_fifo on public.inventory_batches(book_id, location_id, received_at, id)
  where quantity_remaining > 0;
create index if not exists idx_batches_po_line on public.inventory_batches(purchase_order_line_id);
create index if not exists idx_inventory_tx_book_time on public.inventory_transactions(book_id, occurred_at desc);
create index if not exists idx_inventory_tx_location_time on public.inventory_transactions(source_location_id, destination_location_id, occurred_at desc);
create index if not exists idx_inventory_tx_group on public.inventory_transactions(transaction_group_id);
create index if not exists idx_sales_time on public.sales_transactions(sold_at desc);
create index if not exists idx_sales_location_time on public.sales_transactions(location_id, sold_at desc);
create index if not exists idx_sale_lines_sale on public.sales_transaction_lines(sale_id);
create index if not exists idx_allocations_line on public.sales_batch_allocations(sale_line_id);
create index if not exists idx_allocations_batch on public.sales_batch_allocations(batch_id);

-- ============================================================
-- 9. 权限校验与核心原子写入函数
-- ============================================================
create or replace function public.require_inventory_role(allowed_roles text[])
returns uuid language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.has_any_role(allowed_roles) then
    raise exception '没有执行此库存操作的权限' using errcode = '42501';
  end if;
  return v_actor;
end;
$$;
revoke all on function public.require_inventory_role(text[]) from public;

-- 入参示例：
-- select apply_purchase_receipt(
--   '<采购单UUID>', '<收货库位UUID>',
--   '[{"purchase_order_line_id":"<行UUID>","quantity":10}]'::jsonb
-- );
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
    if v_line.quantity_received + v_qty > v_line.quantity_ordered then
      raise exception '收货数量超过未收数量（书籍 %）', v_line.book_id;
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

-- 销售入参示例：
-- select apply_sale(
--   '<门店UUID>',
--   '[{"book_id":"<书UUID>","quantity":2,"unit_price":12.50}]'::jsonb,
--   'POS-0001'
-- );
-- unit_price 可省略，届时快照 books.current_price。FIFO 按 received_at、id 扣批次。
create or replace function public.apply_sale(
  p_location_id uuid,
  p_items jsonb,
  p_external_reference text default null,
  p_sold_at timestamptz default now(),
  p_notes text default null
) returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
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
begin
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'p_items 必须是非空 JSON 数组';
  end if;
  if not exists(select 1 from public.locations where id = p_location_id and is_active) then
    raise exception '销售库位不存在或已停用';
  end if;

  v_sale_number := 'SAL-' || to_char(p_sold_at, 'YYYYMMDD-HH24MISS') || '-' ||
    upper(substr(replace(v_sale_id::text, '-', ''), 1, 8));
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

    if v_needed > 0 then
      raise exception '库存不足：书籍 % 还缺 % 本', v_book.title, v_needed;
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
        v_line_id,
        (v_alloc ->> 'batch_id')::uuid,
        (v_alloc ->> 'quantity')::integer,
        (v_alloc ->> 'unit_cost')::numeric
      );

      insert into public.inventory_transactions(
        transaction_group_id, transaction_type, book_id, quantity,
        source_location_id, source_batch_id, unit_cost, unit_price,
        reference_type, reference_id, actor_profile_id, occurred_at
      ) values (
        v_group_id, 'sale', v_book_id,
        (v_alloc ->> 'quantity')::integer, p_location_id,
        (v_alloc ->> 'batch_id')::uuid,
        (v_alloc ->> 'unit_cost')::numeric, v_unit_price,
        'sale', v_sale_id, v_actor, p_sold_at
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

revoke all on function public.apply_sale(uuid,jsonb,text,timestamptz,text) from public;
grant execute on function public.apply_sale(uuid,jsonb,text,timestamptz,text) to authenticated;

-- FIFO 调拨：在目标库位建立保留原成本的子批次。
create or replace function public.apply_stock_transfer(
  p_book_id uuid,
  p_source_location_id uuid,
  p_destination_location_id uuid,
  p_quantity integer,
  p_reason text default null,
  p_occurred_at timestamptz default now()
) returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_group_id uuid := gen_random_uuid();
  v_batch public.inventory_batches%rowtype;
  v_needed integer := p_quantity;
  v_take integer;
  v_new_batch_id uuid;
  v_code text;
begin
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);
  if p_quantity <= 0 then raise exception '调拨数量必须大于 0'; end if;
  if p_source_location_id = p_destination_location_id then
    raise exception '来源与目标库位不能相同';
  end if;
  if (select count(*) from public.locations
      where id in (p_source_location_id,p_destination_location_id) and is_active) <> 2 then
    raise exception '来源或目标库位不存在/已停用';
  end if;

  for v_batch in
    select * from public.inventory_batches
    where book_id = p_book_id and location_id = p_source_location_id
      and quantity_remaining > 0
    order by received_at, id for update
  loop
    exit when v_needed = 0;
    v_take := least(v_needed, v_batch.quantity_remaining);
    update public.inventory_batches
      set quantity_remaining = quantity_remaining - v_take where id = v_batch.id;

    v_new_batch_id := gen_random_uuid();
    v_code := 'TRF-' || to_char(p_occurred_at, 'YYYYMMDD') || '-' ||
      upper(substr(replace(v_new_batch_id::text, '-', ''), 1, 10));
    insert into public.inventory_batches(
      id, batch_code, book_id, location_id, parent_batch_id, source_type,
      received_at, unit_cost, quantity_received, quantity_remaining, created_by
    ) values (
      v_new_batch_id, v_code, p_book_id, p_destination_location_id,
      v_batch.id, 'transfer', p_occurred_at, v_batch.unit_cost,
      v_take, v_take, v_actor
    );

    insert into public.inventory_transactions(
      transaction_group_id, transaction_type, book_id, quantity,
      source_location_id, destination_location_id, source_batch_id,
      destination_batch_id, unit_cost, reason, actor_profile_id, occurred_at
    ) values (
      v_group_id, 'transfer', p_book_id, v_take, p_source_location_id,
      p_destination_location_id, v_batch.id, v_new_batch_id,
      v_batch.unit_cost, p_reason, v_actor, p_occurred_at
    );
    v_needed := v_needed - v_take;
  end loop;

  if v_needed > 0 then raise exception '来源库位库存不足，还缺 % 本', v_needed; end if;
  return v_group_id;
end;
$$;

revoke all on function public.apply_stock_transfer(uuid,uuid,uuid,integer,text,timestamptz) from public;
grant execute on function public.apply_stock_transfer(uuid,uuid,uuid,integer,text,timestamptz) to authenticated;

-- 盘点差异：p_quantity_delta > 0 为盘盈，< 0 为盘亏；盘盈须提供成本。
create or replace function public.apply_inventory_adjustment(
  p_book_id uuid,
  p_location_id uuid,
  p_quantity_delta integer,
  p_reason text,
  p_unit_cost numeric default null,
  p_occurred_at timestamptz default now()
) returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_group_id uuid := gen_random_uuid();
  v_batch public.inventory_batches%rowtype;
  v_needed integer;
  v_take integer;
  v_batch_id uuid;
  v_code text;
begin
  v_actor := public.require_inventory_role(array['admin','super_admin']);
  if p_quantity_delta = 0 then raise exception '调整数量不能为 0'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception '盘点调整必须填写原因'; end if;
  if not exists(select 1 from public.locations where id = p_location_id and is_active) then
    raise exception '库位不存在或已停用';
  end if;
  if not exists(select 1 from public.books where id = p_book_id and is_active) then
    raise exception '书籍不存在或已停用';
  end if;

  if p_quantity_delta > 0 then
    if p_unit_cost is null or p_unit_cost < 0 then
      raise exception '盘盈必须提供非负单位成本';
    end if;
    v_batch_id := gen_random_uuid();
    v_code := 'ADJ-' || to_char(p_occurred_at, 'YYYYMMDD') || '-' ||
      upper(substr(replace(v_batch_id::text, '-', ''), 1, 10));
    insert into public.inventory_batches(
      id, batch_code, book_id, location_id, source_type, received_at,
      unit_cost, quantity_received, quantity_remaining, created_by
    ) values (
      v_batch_id, v_code, p_book_id, p_location_id, 'adjustment', p_occurred_at,
      p_unit_cost, p_quantity_delta, p_quantity_delta, v_actor
    );
    insert into public.inventory_transactions(
      transaction_group_id, transaction_type, book_id, quantity,
      destination_location_id, destination_batch_id, unit_cost,
      reason, actor_profile_id, occurred_at
    ) values (
      v_group_id, 'count_adjustment_in', p_book_id, p_quantity_delta,
      p_location_id, v_batch_id, p_unit_cost, p_reason, v_actor, p_occurred_at
    );
  else
    v_needed := abs(p_quantity_delta);
    for v_batch in
      select * from public.inventory_batches
      where book_id = p_book_id and location_id = p_location_id
        and quantity_remaining > 0
      order by received_at, id for update
    loop
      exit when v_needed = 0;
      v_take := least(v_needed, v_batch.quantity_remaining);
      update public.inventory_batches
        set quantity_remaining = quantity_remaining - v_take where id = v_batch.id;
      insert into public.inventory_transactions(
        transaction_group_id, transaction_type, book_id, quantity,
        source_location_id, source_batch_id, unit_cost,
        reason, actor_profile_id, occurred_at
      ) values (
        v_group_id, 'count_adjustment_out', p_book_id, v_take,
        p_location_id, v_batch.id, v_batch.unit_cost,
        p_reason, v_actor, p_occurred_at
      );
      v_needed := v_needed - v_take;
    end loop;
    if v_needed > 0 then raise exception '库存不足，无法完成盘亏；还缺 % 本', v_needed; end if;
  end if;
  return v_group_id;
end;
$$;

revoke all on function public.apply_inventory_adjustment(uuid,uuid,integer,text,numeric,timestamptz) from public;
grant execute on function public.apply_inventory_adjustment(uuid,uuid,integer,text,numeric,timestamptz) to authenticated;

-- ============================================================
-- 10. 库存、估值、低库存与会计报表视图
-- ============================================================
create or replace view public.current_inventory_view
with (security_invoker = true) as
select
  b.book_id,
  bk.sku,
  bk.title,
  b.location_id,
  l.code as location_code,
  l.name as location_name,
  sum(b.quantity_remaining)::bigint as quantity_on_hand
from public.inventory_batches b
join public.books bk on bk.id = b.book_id
join public.locations l on l.id = b.location_id
where b.quantity_remaining > 0
group by b.book_id, bk.sku, bk.title, b.location_id, l.code, l.name;

create or replace view public.inventory_valuation_view
with (security_invoker = true) as
select
  b.book_id,
  bk.sku,
  bk.title,
  bk.publisher,
  bk.category,
  b.location_id,
  l.code as location_code,
  l.name as location_name,
  sum(b.quantity_remaining)::bigint as quantity_on_hand,
  round(sum(b.quantity_remaining * b.unit_cost), 2) as inventory_value,
  round(
    sum(b.quantity_remaining * b.unit_cost)
      / nullif(sum(b.quantity_remaining), 0), 2
  ) as weighted_average_cost,
  bk.current_price,
  bk.currency,
  round(sum(b.quantity_remaining * bk.current_price), 2) as retail_value
from public.inventory_batches b
join public.books bk on bk.id = b.book_id
join public.locations l on l.id = b.location_id
where b.quantity_remaining > 0
group by b.book_id, bk.sku, bk.title, bk.publisher, bk.category,
         b.location_id, l.code, l.name, bk.current_price, bk.currency;

-- 低库存按全公司总库存判断；零库存图书也会出现。
create or replace view public.low_stock_view
with (security_invoker = true) as
select
  bk.id as book_id,
  bk.sku,
  bk.title,
  bk.publisher,
  bk.low_stock_threshold,
  coalesce(sum(ib.quantity_remaining), 0)::bigint as quantity_on_hand,
  greatest(
    bk.low_stock_threshold - coalesce(sum(ib.quantity_remaining), 0), 0
  )::bigint as reorder_shortage
from public.books bk
left join public.inventory_batches ib
  on ib.book_id = bk.id and ib.quantity_remaining > 0
where bk.is_active and bk.low_stock_threshold > 0
group by bk.id, bk.sku, bk.title, bk.publisher, bk.low_stock_threshold
having coalesce(sum(ib.quantity_remaining), 0) <= bk.low_stock_threshold;

-- 会计可按日期、库位、书籍筛选；value_change 入库为正，销售/盘亏为负。
create or replace view public.inventory_movement_report_view
with (security_invoker = true) as
select
  it.id,
  it.transaction_group_id,
  it.occurred_at,
  it.transaction_type,
  bk.sku,
  bk.title,
  sl.name as source_location,
  dl.name as destination_location,
  it.quantity,
  case
    when it.transaction_type in ('purchase_receipt','count_adjustment_in','return_in')
      then it.quantity
    when it.transaction_type in ('sale','count_adjustment_out','write_off')
      then -it.quantity
    else 0
  end as net_quantity_change,
  it.unit_cost,
  case
    when it.transaction_type in ('purchase_receipt','count_adjustment_in','return_in')
      then it.quantity * coalesce(it.unit_cost, 0)
    when it.transaction_type in ('sale','count_adjustment_out','write_off')
      then -(it.quantity * coalesce(it.unit_cost, 0))
    else 0
  end as value_change,
  it.unit_price,
  it.reference_type,
  it.reference_id,
  it.reason,
  p.display_name as actor_name
from public.inventory_transactions it
join public.books bk on bk.id = it.book_id
left join public.locations sl on sl.id = it.source_location_id
left join public.locations dl on dl.id = it.destination_location_id
left join public.profiles p on p.id = it.actor_profile_id;

create or replace view public.sales_margin_report_view
with (security_invoker = true) as
select
  s.id as sale_id,
  s.sale_number,
  s.sold_at,
  l.name as location_name,
  s.subtotal as sales_revenue,
  s.total_cost as cost_of_goods_sold,
  s.subtotal - s.total_cost as gross_profit,
  case when s.subtotal = 0 then null
    else round(((s.subtotal - s.total_cost) / s.subtotal) * 100, 2)
  end as gross_margin_percent,
  s.currency,
  s.external_reference
from public.sales_transactions s
join public.locations l on l.id = s.location_id
where s.status = 'completed';

-- ============================================================
-- 11. Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.suppliers enable row level security;
alter table public.books enable row level security;
alter table public.locations enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.sales_transactions enable row level security;
alter table public.sales_transaction_lines enable row level security;
alter table public.sales_batch_allocations enable row level security;

-- 自己可读 profile；staff 以上可读操作员姓名。
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (id = auth.uid() or public.has_any_role(array['staff','admin','super_admin']));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
using (id = auth.uid() or public.has_any_role(array['admin','super_admin']))
with check (id = auth.uid() or public.has_any_role(array['admin','super_admin']));

drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select to authenticated using (true);
drop policy if exists user_roles_read on public.user_roles;
create policy user_roles_read on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_any_role(array['admin','super_admin']));
drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert on public.user_roles for insert to authenticated
with check (public.has_any_role(array['super_admin']));
drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete on public.user_roles for delete to authenticated
using (public.has_any_role(array['super_admin']));

-- 全部业务表：staff/admin/super_admin 可读。
do $$
declare t text;
begin
  foreach t in array array[
    'suppliers','books','locations','purchase_orders','purchase_order_lines',
    'inventory_batches','inventory_transactions','sales_transactions',
    'sales_transaction_lines','sales_batch_allocations'
  ] loop
    execute format('drop policy if exists staff_read on public.%I', t);
    execute format(
      'create policy staff_read on public.%I for select to authenticated using (public.has_any_role(array[''staff'',''admin'',''super_admin'']))', t
    );
  end loop;
end $$;

-- 供应商、书籍、库位仅 admin/super_admin 可维护。
do $$
declare t text;
begin
  foreach t in array array['suppliers','books','locations'] loop
    execute format('drop policy if exists admin_insert on public.%I', t);
    execute format('drop policy if exists admin_update on public.%I', t);
    execute format('drop policy if exists admin_delete on public.%I', t);
    execute format('create policy admin_insert on public.%I for insert to authenticated with check (public.has_any_role(array[''admin'',''super_admin'']))', t);
    execute format('create policy admin_update on public.%I for update to authenticated using (public.has_any_role(array[''admin'',''super_admin''])) with check (public.has_any_role(array[''admin'',''super_admin'']))', t);
    execute format('create policy admin_delete on public.%I for delete to authenticated using (public.has_any_role(array[''admin'',''super_admin'']))', t);
  end loop;
end $$;

-- staff 可草拟和更新采购单；删除仅 admin/super_admin。
do $$
declare t text;
begin
  foreach t in array array['purchase_orders','purchase_order_lines'] loop
    execute format('drop policy if exists staff_insert on public.%I', t);
    execute format('drop policy if exists staff_update on public.%I', t);
    execute format('drop policy if exists admin_delete on public.%I', t);
    execute format('create policy staff_insert on public.%I for insert to authenticated with check (public.has_any_role(array[''staff'',''admin'',''super_admin'']))', t);
    execute format('create policy staff_update on public.%I for update to authenticated using (public.has_any_role(array[''staff'',''admin'',''super_admin''])) with check (public.has_any_role(array[''staff'',''admin'',''super_admin'']))', t);
    execute format('create policy admin_delete on public.%I for delete to authenticated using (public.has_any_role(array[''admin'',''super_admin'']))', t);
  end loop;
end $$;

-- 表级权限：库存批次、流水和销售账只可通过 SECURITY DEFINER RPC 写入。
revoke all on table public.suppliers, public.books, public.locations,
  public.purchase_orders, public.purchase_order_lines,
  public.inventory_batches, public.inventory_transactions,
  public.sales_transactions, public.sales_transaction_lines,
  public.sales_batch_allocations from anon, authenticated;

grant select on table public.suppliers, public.books, public.locations,
  public.purchase_orders, public.purchase_order_lines,
  public.inventory_batches, public.inventory_transactions,
  public.sales_transactions, public.sales_transaction_lines,
  public.sales_batch_allocations to authenticated;

grant insert, update, delete on table public.suppliers, public.books, public.locations to authenticated;
grant insert, update, delete on table public.purchase_orders, public.purchase_order_lines to authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.roles to authenticated;
grant select, insert, delete on table public.user_roles to authenticated;

grant select on public.current_inventory_view,
  public.inventory_valuation_view,
  public.low_stock_view,
  public.inventory_movement_report_view,
  public.sales_margin_report_view to authenticated;

-- ============================================================
-- 12. 注释（Supabase Table Editor 可见）
-- ============================================================
comment on table public.suppliers is '供应商主数据；支持中英文名称和付款条款';
comment on table public.books is '图书目录；title 使用 PostgreSQL UTF-8，完整支持中文';
comment on column public.books.sku is '内部代号/SKU，必须唯一';
comment on column public.books.current_price is '当前建议售价；每次销售会在销售行中保存价格快照';
comment on column public.books.low_stock_threshold is '全库总库存低于或等于此值时触发低库存视图';
comment on table public.locations is '实体门店或仓库库位';
comment on table public.purchase_orders is '采购单头；subtotal 由采购单行自动汇总';
comment on table public.purchase_order_lines is '采购单行；unit_cost 是本次采购成本，允许同书不同批次不同成本';
comment on table public.inventory_batches is 'FIFO 成本层；每次收货、调拨或盘盈生成独立批次';
comment on column public.inventory_batches.quantity_remaining is '该成本批次尚未售出/调出的数量，是实时库存核心';
comment on table public.inventory_transactions is '不可变库存流水；所有入库、出库、调拨和盘点调整的审计来源';
comment on table public.sales_transactions is '销售出库单头；保存收入与实际 FIFO 销货成本汇总';
comment on table public.sales_transaction_lines is '销售行；unit_price 是成交时的售价快照';
comment on table public.sales_batch_allocations is '销售行到 FIFO 批次的成本分配明细';
comment on function public.apply_purchase_receipt(uuid,uuid,jsonb,timestamptz) is
  '原子收货：更新采购已收数量、建立成本批次、写入不可变库存流水';
comment on function public.apply_sale(uuid,jsonb,text,timestamptz,text) is
  '原子销售：按 FIFO 锁定并扣减批次，保存售价快照、COGS 和库存流水';
comment on function public.apply_stock_transfer(uuid,uuid,uuid,integer,text,timestamptz) is
  '原子调拨：按 FIFO 从来源扣减，并在目标库位创建保留成本的子批次';
comment on function public.apply_inventory_adjustment(uuid,uuid,integer,text,numeric,timestamptz) is
  '盘点调整：admin 盘盈建立成本批次，盘亏按 FIFO 扣减';
comment on view public.inventory_valuation_view is '会计库存估值：按书籍和库位汇总实际剩余批次成本';
comment on view public.low_stock_view is '低库存清单：按书籍全库库存与阈值比较，包含零库存';
comment on view public.inventory_movement_report_view is '会计库存变动明细；含带符号数量与成本价值变动';
comment on view public.sales_margin_report_view is '销售收入、FIFO 销货成本、毛利和毛利率';

-- ============================================================
-- 13. 通用示例 Seed 数据（全部标注“示例”，请替换后再用于生产）
-- ============================================================
insert into public.roles(id, name, description) values
  ('10000000-0000-0000-0000-000000000001', 'staff', '日常采购、收货、销售与查询'),
  ('10000000-0000-0000-0000-000000000002', 'admin', '目录、供应商、库位及盘点管理'),
  ('10000000-0000-0000-0000-000000000003', 'super_admin', '系统及角色管理')
on conflict (name) do update set description = excluded.description;

insert into public.suppliers(
  id, code, name_zh, name_en, contact_name, email, payment_terms, notes
) values (
  '20000000-0000-0000-0000-000000000001',
  'SUP-DEMO-001', '示例供应商（请替换）', 'Demo Supplier — Replace Me',
  '示例联系人', 'demo@example.invalid', '收到发票后 30 天', '仅用于演示数据结构'
) on conflict (code) do nothing;

insert into public.locations(id, code, name, location_type, address) values
  ('30000000-0000-0000-0000-000000000001', 'STORE-DEMO', '示例书店门店（请替换）', 'store', null),
  ('30000000-0000-0000-0000-000000000002', 'WH-DEMO', '示例仓库（请替换）', 'warehouse', null)
on conflict (code) do nothing;

insert into public.books(
  id, sku, title, author, publisher, isbn13, category,
  current_price, currency, low_stock_threshold, metadata
) values
  (
    '40000000-0000-0000-0000-000000000001', 'BOOK-DEMO-001',
    '示例中文书名（请替换）', '示例作者', '示例出版社', null, '示例分类',
    12.50, 'GBP', 5, '{"is_demo":true}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000002', 'BOOK-DEMO-002',
    '第二本示例书（请替换）', '示例作者', '示例出版社', null, '示例分类',
    9.99, 'GBP', 3, '{"is_demo":true}'::jsonb
  )
on conflict (sku) do nothing;

-- 首位管理员设置方法（创建 Auth 用户后，在 SQL Editor 手动执行一次）：
-- insert into public.user_roles(user_id, role_id)
-- select '<AUTH_USER_UUID>'::uuid, id from public.roles where name = 'super_admin';

commit;

-- ============================================================
-- 14. 常用调用与报表示例（注释，不会自动执行）
-- ============================================================
-- 库存价值：
-- select * from public.inventory_valuation_view order by location_name, title;
--
-- 低库存：
-- select * from public.low_stock_view order by reorder_shortage desc, title;
--
-- 月末库存变动：
-- select * from public.inventory_movement_report_view
-- where occurred_at >= date_trunc('month', now()) order by occurred_at;
--
-- 销售毛利：
-- select * from public.sales_margin_report_view order by sold_at desc;
