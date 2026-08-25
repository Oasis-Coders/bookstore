# 活水书室管理系统 | Living Water Bookstore

> Next.js 15 + Supabase + Tailwind，复用 COCM Camp App 设计系统  
> cream `#faf6ee` • forest `#0f3d2e` • ember `#d26a39` • DM Serif Display + Inter + Noto Sans SC

生产版图书库存、采购、销售、会计报表系统，支持中文书名、批次进价、FIFO 自动估值。

## 功能

- **书库**：中文书名/出版社/代号/SKU 搜索，分类、现售价、阈值
- **供应商**：中英文名称、联系人、账期
- **库位**：门店/仓库多地点，调拨保留批次成本
- **采购单**：草稿→已批准→已下单→部分收货→已收货，支持同书不同批次不同价
- **收货入库**：`apply_purchase_receipt()` 原子操作，自动建批次、写流水、更新 PO 状态
- **销售出库**：`apply_sale()` FIFO 扣减，自动算 COGS 和毛利
- **会计报表**：库存价值、加权均价、低库存预警、库存变动、销售毛利，全部基于视图实时计算
- **尽量减少人工**：PO 一键收货、销售自动扣减、价值自动汇总

## 技术栈

- Next.js 15 (App Router, Server Components)
- Supabase (Postgres + Auth + RLS)
- Tailwind CSS 3.4 + COCM 三层阴影 + 28px 卡片圆角
- pnpm

## 快速开始

### 1. 克隆 & 安装

```bash
git clone git@github.com:Oasis-Coders/bookstore.git
cd bookstore
pnpm install
```

### 2. Supabase

#### 创建项目

去 [supabase.com](https://supabase.com) 建新项目（单独一个，别复用 COCM 的）。

#### 跑 Schema

Dashboard → SQL Editor → New query → 把 `supabase/migrations/20250825000000_bookstore_schema.sql` 全文粘贴 → Run。

> 文件已包含：suppliers/books/locations/PO/批次/流水/销售表、4 个原子函数、5 个报表视图、RLS、示例 seed。

或者用 Supabase CLI：

```bash
npx supabase link --project-ref <你的ref>
npx supabase db push
```

#### 示例数据

SQL 文件末尾含示例供应商/库位/图书（标注 `示例`），可替换为真实数据后生产使用。

### 3. 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
SUPABASE_SERVICE_ROLE_KEY=<service_role>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. 本地跑

```bash
pnpm dev
# 打开 http://localhost:3000
```

### 5. 首位管理员

1. 先去 Supabase Auth 注册一个用户（或用 Dashboard Invite）
2. 复制它的 UUID
3. SQL Editor 跑：

```sql
insert into user_roles(user_id, role_id)
select '<你的UUID>'::uuid, id from roles where name='super_admin';
```

## 部署到 Vercel

1. Vercel → Add New Project → Import `Oasis-Coders/bookstore`
2. Framework Preset: Next.js
3. Environment Variables 加：

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL = https://你的域名.vercel.app
```

4. Deploy

### Supabase 邀请链接跳 localhost 修复

**问题**：收到 `You've been invited` 邮件，点 Accept 跳到 localhost。

**原因**：Supabase 默认 Site URL 是 localhost。

**修复**：

1. Supabase Dashboard → Authentication → URL Configuration
2. **Site URL** 改成你的 Vercel 域名，例如 `https://huoshui-bookstore.vercel.app`
3. **Additional Redirect URLs** 加：
   - `http://localhost:3000/*`
   - `https://你的域名/*`（含 `/auth/callback`）
4. 保存后重发邀请（旧 token 已绑定旧 URL，删掉用户重邀）

代码中发邀请时带 `redirectTo`：

```ts
supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: 'https://你的域名/auth/callback'
})
```

## 核心 RPC

```sql
-- 收货
select apply_purchase_receipt(
  '<PO_UUID>', '<STORE_UUID>',
  '[{"purchase_order_line_id":"<行>","quantity":10}]'::jsonb
);

-- 销售
select apply_sale(
  '<STORE_UUID>',
  '[{"book_id":"<id>","quantity":2,"unit_price":12.50}]'::jsonb,
  'POS-0001'
);

-- 调拨
select apply_stock_transfer('<book_id>','<STORE>','<WH>',5,'补仓');

-- 盘点
select apply_inventory_adjustment('<book_id>','<STORE>',-1,'盘亏');
select apply_inventory_adjustment('<book_id>','<STORE>',2,'盘盈',5.20);
```

## 报表视图

```sql
select * from inventory_valuation_view order by location_name, title;
select * from low_stock_view order by reorder_shortage desc;
select * from inventory_movement_report_view where occurred_at >= date_trunc('month', now());
select * from sales_margin_report_view order by sold_at desc;
```

## 设计系统

复用 `~/workspace/COCM-Camp-App/DESIGN.md`：

- 页面背景 `camp-cream #faf6ee`，卡片白底
- 主色 `forest #0f3d2e`，CTA `ember #d26a39`
- 字体：DM Serif Display 标题 + Inter/Noto Sans SC 正文
- 圆角：按钮 12px，输入 20px，卡片 20px，大面板 28px
- 阴影：三层 `card` + hover `card-hover` + 模态 `panel`
- 中文友好：Noto Sans SC + Inter 双 fallback

## 目录

```
app/
  books/           书库
  suppliers/       供应商
  locations/       库位
  purchase-orders/ 采购单
  sales/           销售
  reports/         报表
  auth/            登录说明
components/
  layout/          AppShell, SidebarNav, MobileSidebar
  ui/              Button, Card, Input, Badge
lib/
  supabase/        client, server, env
  books/           types, queries
  inventory/       RPC wrappers
supabase/
  migrations/      完整 Schema
  config.toml
docs/
  architecture.md
```

## License

MIT — Oasis-Coders
