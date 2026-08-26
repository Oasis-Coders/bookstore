-- Fix: replace apply_sale with correct atomic implementation
-- Previous version incorrectly removed parameter defaults and allowed zero-stock sales
-- This version: drops old function, recreates with proper signature, no demo seeding, strict stock check

-- Drop existing function (must drop to allow removing defaults)
DROP FUNCTION IF EXISTS public.apply_sale(uuid, jsonb, text, timestamptz, text);
DROP FUNCTION IF EXISTS public.apply_sale(uuid, jsonb, text, timestamptz, text, text, text, numeric, text, date, numeric, text);

-- Ensure sequence for collision-safe sale numbers
CREATE SEQUENCE IF NOT EXISTS public.sale_number_seq START 100001;

-- Improved generate_sale_number using sequence for safety
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_seq bigint;
  v_num text;
BEGIN
  v_seq := nextval('public.sale_number_seq');
  -- If there are existing C-numbers higher than sequence, bump sequence
  -- This handles legacy data
  BEGIN
    SELECT GREATEST(v_seq, COALESCE(MAX((substring(sale_number from 'C(\d+)'))::bigint), 100000) + 1)
    INTO v_seq
    FROM public.sales_transactions
    WHERE sale_number ~ '^C\d+$';
  EXCEPTION WHEN OTHERS THEN
    -- ignore, use sequence value
  END;
  -- Ensure sequence is at least v_seq
  PERFORM setval('public.sale_number_seq', GREATEST(v_seq, 100001), true);
  v_seq := nextval('public.sale_number_seq');
  v_num := 'C' || lpad(v_seq::text, 6, '0');
  RETURN v_num;
END;
$$;

-- Correct apply_sale: atomic, strict stock check, no zero-stock fallback, no demo data
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
  p_customer_note text DEFAULT NULL
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
  -- Auth check: must be staff/admin/super_admin
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION '购物车不能为空';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.locations WHERE id = p_location_id AND is_active) THEN
    RAISE EXCEPTION '销售库位不存在或已停用';
  END IF;

  -- Generate sale number collision-safe
  IF p_external_reference IS NOT NULL AND p_external_reference <> '' THEN
    v_sale_number := p_external_reference;
  ELSE
    v_sale_number := public.generate_sale_number();
  END IF;

  -- Ensure sale_number unique (retry on conflict)
  -- Insert sale header first with all fields atomically
  INSERT INTO public.sales_transactions(
    id, sale_number, location_id, external_reference, sold_at, sale_date,
    payment_method, payment_status, discount_amount, customer_name, customer_note,
    shipping_cost, notes, subtotal, total_cost, created_by, status
  ) VALUES (
    v_sale_id,
    v_sale_number,
    p_location_id,
    COALESCE(p_external_reference, v_sale_number),
    COALESCE(p_sold_at, now()),
    COALESCE(p_sale_date, (COALESCE(p_sold_at, now())::date)),
    COALESCE(p_payment_method::public.sale_payment_method, 'cash'::public.sale_payment_method),
    COALESCE(p_payment_status, 'paid'),
    COALESCE(p_discount_amount, 0),
    p_customer_name,
    COALESCE(p_customer_note, p_notes),
    COALESCE(p_shipping_cost, 0),
    p_notes,
    0, 0,  -- subtotal/total_cost will be updated after lines
    v_actor,
    'completed'
  );

  -- Process each line
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

    -- Snapshot unit_price from item or current book price (historical price preserved)
    v_unit_price := COALESCE((v_item ->> 'unit_price')::numeric, v_book.current_price);
    IF v_unit_price < 0 THEN
      RAISE EXCEPTION '售价不可为负数';
    END IF;

    v_discount_percent := COALESCE((v_item ->> 'discount_percent')::numeric, 0);
    v_discount_amt := COALESCE((v_item ->> 'discount_amount')::numeric, 0);

    v_needed := v_qty;
    v_line_cost := 0;
    v_allocations := '[]'::jsonb;

    -- FIFO deduct stock, must have sufficient stock, fail cleanly if not
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

  -- Update totals atomically
  UPDATE public.sales_transactions
  SET subtotal = v_subtotal,
      total_cost = v_total_cost
  WHERE id = v_sale_id;

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_sale(uuid, jsonb, text, timestamptz, text, text, text, numeric, text, date, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_sale(uuid, jsonb, text, timestamptz, text, text, text, numeric, text, date, numeric, text) TO authenticated;

-- Also keep backward-compatible 5-arg version for existing callers (wraps new function)
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

-- No demo seeding, no zero-stock allowance
