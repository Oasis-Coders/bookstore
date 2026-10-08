-- Per-book quantity on hand as of end of p_as_of (mirrors inventory_value_at logic).
CREATE OR REPLACE FUNCTION public.inventory_qty_at(p_as_of date)
RETURNS TABLE (book_id uuid, qty_on_hand integer)
LANGUAGE sql STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  select b.book_id,
    sum(greatest(0, b.quantity_remaining + coalesce(sold.qty, 0) - coalesce(ret.qty, 0)))::int as qty_on_hand
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
  where b.received_at < (p_as_of + 1)::date
  group by b.book_id;
$function$;
