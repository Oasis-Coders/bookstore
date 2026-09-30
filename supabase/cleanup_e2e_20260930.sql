-- E2E 测试数据清理 (2026-09-30 feedback batch)
-- 只删除 E2E-20260930 测试数据；8 月历史测试销售 (test-staff@abc.com) 不动

-- 0. 先删除引用测试批次/测试书的库存流水
delete from inventory_transactions
where destination_batch_id in (select id from inventory_batches where batch_code like 'E2E-BATCH-%')
   or source_batch_id in (select id from inventory_batches where batch_code like 'E2E-BATCH-%')
   or book_id in (select id from books where sku like 'E2E-%');

-- 1. 恢复销售占用的库存
update inventory_batches b set quantity_remaining = b.quantity_remaining + a.quantity
from sales_batch_allocations a
join sales_transaction_lines l on l.id = a.sale_line_id
join sales_transactions s on s.id = l.sale_id
where a.batch_id = b.id and s.sale_number in ('C100035','C100036','C100037');

-- 2. 删除销售分配、明细、审计、销售单
delete from sales_batch_allocations a using sales_transaction_lines l, sales_transactions s
where a.sale_line_id = l.id and l.sale_id = s.id and s.sale_number in ('C100035','C100036','C100037');

delete from sales_transaction_lines l using sales_transactions s
where l.sale_id = s.id and s.sale_number in ('C100035','C100036','C100037');

delete from sale_edits e using sales_transactions s
where e.sale_id = s.id and s.sale_number in ('C100035','C100036','C100037');

delete from sales_transactions where sale_number in ('C100035','C100036','C100037');

-- 3. 删除采购收货产生的批次
delete from inventory_batches
where purchase_order_line_id in (
  select l.id from purchase_order_lines l
  join purchase_orders p on p.id = l.purchase_order_id
  where p.notes like '%E2E测试采购单-20260930%'
);

-- 4. 删除采购单行和采购单
delete from purchase_order_lines
where purchase_order_id in (select id from purchase_orders where notes like '%E2E测试采购单-20260930%');

delete from purchase_orders where notes like '%E2E测试采购单-20260930%';

-- 5. 备用条码解除分配
update spare_barcodes set assigned_book_id = null, assigned_at = null, status = 'available'
where code = '2700000000014';

-- 6. 删除测试图书（52 本）
delete from inventory_batches where batch_code like 'E2E-BATCH-%';

delete from books where sku like 'E2E-%';

-- 7. 核验：应全部为 0（条码池多出的 10 个可用码保留，属于正常池库存）
select (select count(*) from books where sku like 'E2E-%') as books_left,
       (select count(*) from sales_transactions where sale_number in ('C100035','C100036','C100037')) as sales_left,
       (select count(*) from purchase_orders where notes like '%E2E测试采购单-20260930%') as po_left,
       (select count(*) from inventory_batches where batch_code like 'E2E-BATCH-%') as batches_left,
       (select count(*) from spare_barcodes where code='2700000000014' and status='available') as barcode_freed;
