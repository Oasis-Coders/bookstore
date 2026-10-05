-- 2026-10-05: suppliers.contact_name -> contact_person
-- 根因：建表 migration 里列名是 contact_name，但全部应用代码（表单字段、
-- server action payload、列表/详情展示）用的都是 contact_person，导致供应商
-- 新增/编辑每次都报 "column contact_person does not exist" (42703)，被
-- friendlyDbError 吞成通用的"操作失败，请重试"。
-- RENAME COLUMN 保留已有数据（SUP-HUOSHUI 等 2 条记录的联系人信息不受影响）。
ALTER TABLE public.suppliers RENAME COLUMN contact_name TO contact_person;
