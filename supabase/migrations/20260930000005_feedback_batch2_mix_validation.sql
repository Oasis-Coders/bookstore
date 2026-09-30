-- 反馈批2补丁: apply_sale 混合支付服务端校验（两条明细/方式不同/金额为正/合计等于应付）

CREATE OR REPLACE FUNCTION public.apply_sale(p_location_id uuid, p_items jsonb, p_external_reference text DEFAULT NULL::text, p_sold_at timestamp with time zone DEFAULT now(), p_notes text DEFAULT NULL::text, p_payment_method text DEFAULT 'cash'::text, p_payment_status text DEFAULT 'paid'::text, p_discount_amount numeric DEFAULT 0, p_customer_name text DEFAULT NULL::text, p_sale_date date DEFAULT NULL::date, p_shipping_cost numeric DEFAULT 0, p_customer_note text DEFAULT NULL::text, p_payment_mix jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  v_mix_sum numeric(14,2) := 0;
  v_mix_net numeric(14,2) := 0;
  v_mix_i integer;
BEGIN
  v_actor := public.require_inventory_role(array['staff','admin','super_admin']);

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION '购物车不能为空';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.locations WHERE id = p_location_id AND is_active) THEN
    RAISE EXCEPTION '销售库位不存在或已停用';
  END IF;

  -- 混合支付服务端校验：两条明细、方式不同、金额为正
  IF p_payment_method = 'mix' THEN
    IF p_payment_mix IS NULL OR jsonb_typeof(p_payment_mix) <> 'array' OR jsonb_array_length(p_payment_mix) <> 2 THEN
      RAISE EXCEPTION '混合支付需要填写两种付款方式及金额';
    END IF;
    IF (p_payment_mix->0->>'method') = (p_payment_mix->1->>'method') THEN
      RAISE EXCEPTION '混合支付的两种付款方式不能相同';
    END IF;
    FOR v_mix_i IN 0..1 LOOP
      IF (p_payment_mix->v_mix_i->>'method') NOT IN ('cash','card','bank_transfer','shopify','paypal','other') THEN
        RAISE EXCEPTION '混合支付方式不合法：%', (p_payment_mix->v_mix_i->>'method');
      END IF;
      IF COALESCE((p_payment_mix->v_mix_i->>'amount')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION '混合支付金额必须大于 0';
      END IF;
    END LOOP;
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
    CASE WHEN p_payment_method = 'mix' THEN p_payment_mix ELSE NULL END
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

  -- 混合支付金额之和必须等于应付（小计 - 折扣 + 运费）
  IF p_payment_method = 'mix' THEN
    v_mix_sum := COALESCE((p_payment_mix->0->>'amount')::numeric, 0) + COALESCE((p_payment_mix->1->>'amount')::numeric, 0);
    v_mix_net := v_subtotal - COALESCE(p_discount_amount, 0) + COALESCE(p_shipping_cost, 0);
    IF abs(v_mix_sum - v_mix_net) >= 0.005 THEN
      RAISE EXCEPTION '混合支付金额之和（£%）必须等于应付（£%）', v_mix_sum, v_mix_net;
    END IF;
  END IF;

  RETURN v_sale_id;
END;
$function$
;
