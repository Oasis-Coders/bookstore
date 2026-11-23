# 活水书室架构 | Architecture

> 复用 COCM Camp App 模式，针对图书批次成本优化

## 数据模型

```
suppliers ──< purchase_orders ──< purchase_order_lines
                                          │
                                          ▼
books ──< inventory_batches (FIFO 核心) ──< inventory_transactions (不可变流水)
  │                ▲
  │                │
  └─< sales_transaction_lines ──< sales_transactions
              │
              └─< sales_batch_allocations (成本分配)

locations (store / warehouse)
```

- **books**: sku/代号唯一，title 支持中文 UTF-8，current_price 波动，low_stock_threshold 全库判断
- **inventory_batches**: 每次收货/调拨/盘盈建一批，保留 unit_cost，quantity_remaining 为实时库存核心
- **purchase_order_lines**: quantity_ordered vs quantity_received，unit_cost 允许同书不同价
- **inventory_transactions**: append-only，transaction_group_id 关联一次收货/销售的多行
- **sales**: POS 出库，sold_at、subtotal、total_cost、gross_profit 自动算

## 核心流程

### 采购收货

1. 建 suppliers
2. 建 books（中文书名、SKU、出版社）
3. 建 PO：选 supplier，添行（book_id, qty, unit_cost）
4. 批准 PO → status approved
5. 收货：`apply_purchase_receipt(po_id, location_id, [{line_id, qty}])`
   - 原子：建批次、写流水、更新 PO 行已收、更新 PO 状态

### 销售

1. POS 选库位，添书（qty, unit_price 快照 current_price）
2. `apply_sale(location_id, [{book_id, qty, unit_price}], external_ref)`
   - FIFO：按 received_at, id 顺序扣批次
   - 扣减 quantity_remaining，建 allocations，写流水，算 COGS

### 调拨

`apply_stock_transfer(book_id, src, dst, qty, reason)` — 源扣减、目标建保留成本子批次

### 盘点

`apply_inventory_adjustment(book_id, loc, delta, reason, unit_cost)` — 正数盘盈需成本，负数盘亏 FIFO 扣

## 报表视图

- `current_inventory_view`: 按 book+location 汇总在库
- `inventory_valuation_view`: 成本价值、加权均价、零售价值
- `low_stock_view`: 全库总库存 ≤ threshold 的书，含零库存
- `inventory_movement_report_view`: 带符号数量/价值变动，按日期/库位/书过滤
- `sales_margin_report_view`: 收入、COGS、毛利、毛利率

## 并发与流式加载

- **`app/reports/reports-data.ts`**: 首屏四路数据（库存估值/低库存、财务月报 RPC、区间销售、改单记录）`Promise.all` 并发，复用 `valuationPromise` 与 `profileMap`
- **`app/reports/page.tsx`**: 屏下重查询「按出版社进出货报表」（`fetchPublisherReportData`）通过 `<Suspense>` (`publisherReportSlot`) 独立流式渲染，不阻塞首屏
- **`app/sales/sales-data.ts`**: 销售页五路数据（权限、单次 `locations` 库位解析+批次库存、全量在售书、近期销售+改单标记、备用条码映射）`Promise.all` 并发
- **性能门禁**: `__tests__/reports-performance.test.ts`（并发延迟单测）+ `e2e/performance.spec.ts`（Core Web Vitals E2E 阈值校验）

## RLS

沿用 COCM 的 staff/admin/super_admin：

- profiles: 自己可读，staff 以上可读他人
- suppliers/books/locations: staff 读，admin 写
- PO: staff 读写，admin 删
- 批次/流水/销售：只可通过 SECURITY DEFINER RPC 写入，表级 revoke authenticated 写权限

## 前端

- `app/`: Server Components 读 Supabase，Client Components 调 RPC
- `components/layout/app-shell.tsx`: 复用 COCM 的森林侧边栏 + 奶油背景
- `components/ui/`: Button/Card/Input/Badge — 12/20/28 圆角 + 三层阴影（`BookAutocomplete` 使用 React `useId()` 保证 SSR/CSR 水合一致性）
- `lib/supabase/`: browser/server/client 工厂，`proxy.ts` 刷新 session（未配置 Supabase 环境变量时自动进入 Demo 模式）
- `lib/inventory/rpc.ts`: RPC 封装，带类型

## 设计

- `globals.css`: Inter + Noto Sans SC，cream #faf6ee 背景
- `tailwind.config.ts`: camp.cream/forest/ember 色，card/panel 阴影
- 卡片：白底、20px 圆角、card 阴影、hover 上浮
- 大面板：28px 圆角、panel 阴影
- 按钮：ember 主 CTA，forest 次级，ghost 边框

## 部署

- Vercel 环境变量见 README
- Supabase Site URL 必须设为 Vercel 域名，否则邀请跳 localhost
- 首位 super_admin 手动插 user_roles
- GitHub Actions CI/CD 流水线详见 [`docs/ci-cd.md`](./ci-cd.md)
