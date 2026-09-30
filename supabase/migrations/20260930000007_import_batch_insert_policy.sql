-- 批量导入建初始库存批次：补上 inventory_batches 的 INSERT 策略
-- （之前只有 SELECT 策略，导入页直接插入批次被 RLS 静默拒绝，导致 initial_stock 从未真正入库）
CREATE POLICY inventory_batches_staff_insert ON inventory_batches
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(ARRAY['staff'::text, 'admin'::text, 'super_admin'::text]));
