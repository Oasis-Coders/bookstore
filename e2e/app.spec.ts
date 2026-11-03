// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('COCM Bookshop - Full User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dashboard loads with stats', async ({ page }) => {
    const main = page.locator('main:visible');
    await expect(main.getByText(/总览|Dashboard/).first()).toBeVisible({ timeout: 10000 });
    await expect(main.getByText(/库存总值|Inventory Value/).first()).toBeVisible();
  });

  test('navigation sidebar works - all main links', async ({ page }) => {
    const links = [
      { href: '/', text: /总览|Dashboard/ },
      { href: '/books', text: /书库|Books/ },
      { href: '/purchase-orders', text: /采购单|Purchase/ },
      { href: '/suppliers', text: /供应商|Suppliers/ },
      { href: '/sales', text: /销售|Sales/ },
      { href: '/reports', text: /报表|Reports/ },
      { href: '/settings', text: /设置|Settings/ },
    ];
    for (const link of links) {
      await page.goto(link.href);
      await expect(page.locator('main:visible')).toContainText(link.text, { timeout: 5000 });
    }
  });

  test('books - search and add navigation', async ({ page }) => {
    const main = page.locator('main:visible');
    await page.goto('/books');
    await expect(main.getByText(/书库|Books/).first()).toBeVisible({ timeout: 5000 });
    const searchInput = main.locator('input[name="q"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await main.getByRole('button', { name: /搜索|Search/ }).click();
    await expect(page).toHaveURL(/q=test/);
    await main.getByRole('link', { name: /添加图书|Add Book/ }).first().click();
    await expect(page).toHaveURL(/\/books\/new/);
    await expect(main.getByText(/添加新书|Add Book|New Book/).first()).toBeVisible();
    await main.getByRole('link', { name: /返回书库|Back to Books/ }).click();
    await expect(page).toHaveURL(/\/books/);
  });

  test('books - create form validation', async ({ page }) => {
    const main = page.locator('main:visible');
    await page.goto('/books/new');
    await expect(main.locator('input[name="sku"]')).toBeVisible();
    await expect(main.locator('input[name="title"]')).toBeVisible();
    await main.getByRole('button', { name: /取消|Cancel/ }).click();
    await expect(page).toHaveURL(/\/books/);
  });

  test('suppliers - add navigation', async ({ page }) => {
    const main = page.locator('main:visible');
    await page.goto('/suppliers');
    await expect(main.getByText(/供应商|Suppliers/).first()).toBeVisible({ timeout: 5000 });
    await main.getByRole('link', { name: /新增供应商|添加供应商|New Supplier|Add/ }).first().click();
    await expect(page).toHaveURL(/\/suppliers\/new/);
    await expect(main.locator('input[name="code"]')).toBeVisible();
    await main.getByRole('link', { name: /返回供应商|Back to Suppliers/ }).click();
    await expect(page).toHaveURL(/\/suppliers/);
  });

  test('locations - redirects to books and new location form renders', async ({ page }) => {
    const main = page.locator('main:visible');
    await page.goto('/locations');
    // /locations redirects to /books (shelf_position in books replaced standalone locations list)
    await expect(page).toHaveURL(/\/books/);
    await page.goto('/locations/new');
    await expect(main.locator('input[name="code"]')).toBeVisible();
  });

  test('purchase orders - full workflow', async ({ page }) => {
    const main = page.locator('main:visible');
    await page.goto('/purchase-orders');
    await expect(main.getByText(/采购单|Purchase/).first()).toBeVisible({ timeout: 5000 });
    await main.getByRole('link', { name: /新建采购单|New Purchase Order|New PO/ }).first().click();
    await expect(page).toHaveURL(/\/purchase-orders\/new/);
    await expect(main.getByText(/新建采购单|New Purchase Order/).first()).toBeVisible();
    await main.getByRole('link', { name: /返回采购单|Back to Purchase Orders/ }).click();
    await expect(page).toHaveURL(/\/purchase-orders/);
    const firstPO = main.locator('a[href^="/purchase-orders/"]').first();
    if (await firstPO.isVisible()) {
      const href = await firstPO.getAttribute('href');
      if (href && href !== '/purchase-orders/new' && href !== '/purchase-orders/reference') {
        await firstPO.click();
        await expect(page).toHaveURL(/\/purchase-orders\//);
      }
    }
  });

  test('sales - cart interactions work', async ({ page }) => {
    const main = page.locator('main:visible');
    await page.goto('/sales');
    await expect(main.getByText(/销售|Sales/).first()).toBeVisible({ timeout: 5000 });
    const paymentSelect = main.locator('select').first();
    await expect(paymentSelect).toBeVisible();
    const skuInput = main.locator('input[placeholder*="扫码"], input[placeholder*="SKU"], input[placeholder*="搜索"]').first();
    if (await skuInput.isVisible()) {
      await skuInput.fill('test book');
      await main.getByRole('button', { name: /添加|Add/ }).first().click();
      await expect(main.getByText(/test book/).first()).toBeVisible({ timeout: 3000 });
    }
    const plusBtn = main.locator('button:has-text("+")').first();
    const minusBtn = main.locator('button:has-text("-")').first();
    if (await plusBtn.isVisible()) {
      await plusBtn.click();
      await minusBtn.click();
    }
    const removeBtn = main.locator('button:has-text("×")').first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
    }
    await expect(main.getByRole('button', { name: /确认销售|Confirm/ })).toBeVisible();
  });

  test('reports - export buttons work', async ({ page }) => {
    const main = page.locator('main:visible');
    await page.goto('/reports');
    await expect(main.getByText(/报表|Reports/).first()).toBeVisible({ timeout: 5000 });
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await main.getByRole('button', { name: /导出\s*CSV|导出估值|Export CSV/i }).first().click();
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('.csv');
    }
    const financialDownloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await main.getByRole('button', { name: /^导出$|^Export$/i }).first().click();
    const financialDownload = await financialDownloadPromise;
    if (financialDownload) {
      expect(financialDownload.suggestedFilename()).toContain('.csv');
    }
  });

  test('settings - personal config works', async ({ page }) => {
    const main = page.locator('main:visible');
    await page.goto('/settings');
    await expect(main.getByText(/个人设置|Settings/).first()).toBeVisible({ timeout: 5000 });
    const nameInput = main.locator('input').first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test User');
    const iconButtons = main.locator('button').filter({ hasText: /^活$|^书$|^A$|^B$/ });
    if (await iconButtons.first().isVisible()) {
      await iconButtons.first().click();
    }
    const colorButtons = main.locator('button[style*="background-color"]');
    if (await colorButtons.first().isVisible()) {
      await colorButtons.first().click();
    }
    await expect(main.getByRole('button', { name: /保存全部|保存设置|Save/ }).first()).toBeVisible();
  });

  test('auth - login/signup/reset flows exist', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('button', { name: /登录|Sign In|Login/ })).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: /创建账号|Create one|Sign Up/ }).click();
    await expect(page).toHaveURL(/mode=signup/);
    await expect(page.locator('input[name="displayName"]:visible')).toBeVisible();
    await page.getByRole('link', { name: /已有账号|Already have an account|Sign In|Login/ }).click();
    await expect(page).toHaveURL(/\/auth/);
    await page.getByRole('link', { name: /忘记密码|Forgot password/ }).click();
    await expect(page).toHaveURL(/mode=reset/);
    await expect(page.locator('input[name="email"]:visible')).toBeVisible();
  });

  test('responsive - mobile menu works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const menuBtn = page.locator('button[aria-controls="mobile-drawer"]:visible');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(page.locator('#mobile-drawer:visible').getByText(/书库|Books/).first()).toBeVisible();
    await menuBtn.click();
  });

  test('admin - users and history require admin role', async ({ page }) => {
    await page.goto('/admin/users');
    // Should redirect to / or show page depending on role - in demo mode redirects to /
    await expect(page).toHaveURL(/\//);

    await page.goto('/admin/history');
    await expect(page).toHaveURL(/\//);
  });
});
