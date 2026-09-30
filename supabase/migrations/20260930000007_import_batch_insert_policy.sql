-- 批量导入建初始库存批次：补上 inventory_batches 的 INSERT 策略
-- （之前只有 SELECT 策略，导入页直接插入批次被 RLS 静默拒绝，导致 initial_stock 从未真正入库）
-- 注意：光有策略不够，authenticated 角色原本对这表只有 SELECT 的表级 GRANT，
-- 还必须 GRANT INSERT，否则报 permission denied for table（行级权限仍由下面的策略卡 staff+）
GRANT INSERT ON inventory_batches TO authenticated;
CREATE POLICY inventory_batches_staff_insert ON inventory_batches
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(ARRAY['staff'::text, 'admin'::text, 'super_admin'::text]));
