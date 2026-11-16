-- 工单 #18 跟进：批量导入文件里的 Unit cost 单独存一份（books.import_unit_cost）。
-- 背景：导入时只有填了 initial_stock 才会建库存批次并带上 unit_cost；没填库存的书
-- 虽然文件里有 Unit cost，书卡上却显示「暂无进货记录」。此列只用于展示兜底：
-- 有收货批次时以实际批次价为准；无批次时显示导入价；两者都没有才显示暂无进货记录。
-- 加法式、向后兼容（可空列，旧数据不受影响），导入流程写入，编辑页不提供修改入口。
ALTER TABLE books ADD COLUMN IF NOT EXISTS import_unit_cost numeric;
COMMENT ON COLUMN books.import_unit_cost IS '批量导入时文件里的 Unit cost（进货价）；仅当没有任何收货批次时用于展示，收货后以实际批次价为准';
