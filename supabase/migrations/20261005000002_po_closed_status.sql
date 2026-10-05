-- 2026-10-05: 采购单新增 closed（已结束）状态
-- 背景：供应商短装（实收 < 订购）是常态；部分收货后剩余数量永不到货时，
-- 采购单会永远卡在 partially_received，且收货表单要求必须填写数量才能继续。
-- 新增 closed 状态 + finalizePO 动作，允许将短装的采购单标记为结束。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'purchase_order_status' AND e.enumlabel = 'closed'
  ) THEN
    ALTER TYPE public.purchase_order_status ADD VALUE 'closed';
  END IF;
END
$$;
