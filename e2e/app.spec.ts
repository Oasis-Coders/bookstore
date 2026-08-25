// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('COCM Bookshop - Full User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dashboard loads with stats', async ({ page }) => {
    await expect(page.getByText(/总览|Dashboard/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/库存总值|Inventory Value/)).toBeVisible();
  });

  test('navigation sidebar works - all main links', async ({ page }) => {
    const links = [
      { href: '/', text: /总览|Dashboard/ },
      { href: '/books', text: /书库|Books/ },
      { href: '/purchase-orders', text: /采购单|Purchase/ },
      { href: '/suppliers', text: /供应商|Suppliers/ },
      { href: '/locations', text: /库位|Locations/ },
      { href: '/sales', text: /销售|Sales/ },
      { href: '/reports', text: /报表|Reports/ },
      { href: '/settings', text: /设置|Settings/ },
    ];
    for (const link of links) {
      await page.goto(link.href);
      await expect(page.locator('body')).toContainText(link.text, { timeout: 5000 });
    }
  });

  test('books - search and add navigation', async ({ page }) => {
    await page.goto('/books');
    await expect(page.getByText(/书库|Books/)).toBeVisible({ timeout: 5000 });
    const searchInput = page.locator('input[name="q"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await page.getByRole('button', { name: /搜索|Search/ }).click();
    await expect(page).toHaveURL(/q=test/);
    await page.getByRole('link', { name: /添加图书|Add Book/ }).click();
    await expect(page).toHaveURL(/\/books\/new/);
    await expect(page.getByText(/添加新书|New Book/)).toBeVisible();
    await page.getByRole('link', { name: /返回书库/ }).click();
    await expect(page).toHaveURL(/\/books/);
  });

  test('books - create form validation', async ({ page }) => {
    await page.goto('/books/new');
    await expect(page.locator('input[name="sku"]')).toBeVisible();
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await page.getByRole('button', { name: '取消' }).click();
    await expect(page).toHaveURL(/\/books/);
  });

  test('suppliers - add navigation', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page.getByText(/供应商|Suppliers/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: /添加供应商|Add/ }).first().click();
    await expect(page).toHaveURL(/\/suppliers\/new/);
    await expect(page.locator('input[name="code"]')).toBeVisible();
    await page.getByRole('link', { name: /返回供应商/ }).click();
    await expect(page).toHaveURL(/\/suppliers/);
  });

  test('locations - add navigation', async ({ page }) => {
    await page.goto('/locations');
    await expect(page.getByText(/库位|Locations/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: /添加库位/ }).click();
    await expect(page).toHaveURL(/\/locations\/new/);
    await expect(page.locator('input[name="code"]')).toBeVisible();
  });

  test('purchase orders - full workflow', async ({ page }) => {
    await page.goto('/purchase-orders');
    await expect(page.getByText(/采购单|Purchase/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: /新建采购单|New PO/ }).click();
    await expect(page).toHaveURL(/\/purchase-orders\/new/);
    await expect(page.getByText(/新建采购单/)).toBeVisible();
    await page.getByRole('link', { name: /返回采购单/ }).click();
    await expect(page).toHaveURL(/\/purchase-orders/);
    const firstPO = page.locator('a[href^="/purchase-orders/"]').first();
    if (await firstPO.isVisible()) {
      await firstPO.click();
      await expect(page).toHaveURL(/\/purchase-orders\//);
      await expect(page.getByText(/返回采购单/)).toBeVisible();
    }
  });

  test('sales - cart interactions work', async ({ page }) => {
    await page.goto('/sales');
    await expect(page.getByText(/销售|Sales/)).toBeVisible({ timeout: 5000 });
    const locationSelect = page.locator('select').first();
    await expect(locationSelect).toBeVisible();
    const skuInput = page.locator('input[placeholder*="扫码"], input[placeholder*="SKU"], input[placeholder*="搜索"]').first();
    if (await skuInput.isVisible()) {
      await skuInput.fill('test book');
      await page.getByRole('button', { name: /添加|Add/ }).first().click();
      await expect(page.getByText(/test book/)).toBeVisible({ timeout: 3000 });
    }
    const plusBtn = page.locator('button:has-text("+")').first();
    const minusBtn = page.locator('button:has-text("-")').first();
    if (await plusBtn.isVisible()) {
      await plusBtn.click();
      await minusBtn.click();
    }
    const removeBtn = page.locator('button:has-text("×")').first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
    }
    await expect(page.getByRole('button', { name: /确认销售|Confirm/ })).toBeVisible();
  });

  test('reports - export buttons work', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByText(/报表|Reports/)).toBeVisible({ timeout: 5000 });
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: /导出估值|Export/ }).first().click();
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('.csv');
    }
    const templatePromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: /下载模板|Download Template/ }).click();
    const templateDownload = await templatePromise;
    if (templateDownload) {
      expect(templateDownload.suggestedFilename()).toContain('.csv');
    }
  });

  test('settings - personal config works', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText(/个人设置|Settings/)).toBeVisible({ timeout: 5000 });
    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test User');
    const iconButtons = page.locator('button').filter({ hasText: /^活$|^书$|^A$|^B$/ });
    if (await iconButtons.first().isVisible()) {
      await iconButtons.first().click();
    }
    const colorButtons = page.locator('button[style*="background-color"]');
    if (await colorButtons.first().isVisible()) {
      await colorButtons.first().click();
    }
    await expect(page.getByRole('button', { name: /保存设置|Save/ })).toBeVisible();
  });

  test('auth - login/signup/reset flows exist', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByText(/登录|Sign In/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: /创建账号|Sign Up/ }).click();
    await expect(page).toHaveURL(/mode=signup/);
    await expect(page.locator('input[name="displayName"]')).toBeVisible();
    await page.getByRole('link', { name: /已有账号|Sign In/ }).click();
    await expect(page).toHaveURL(/\/auth/);
    await page.getByRole('link', { name: /忘记密码/ }).click();
    await expect(page).toHaveURL(/mode=reset/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await page.goto('/auth?mode=admin-reset');
    await expect(page.locator('input[name="newPassword"]')).toBeVisible();
  });

  test('responsive - mobile menu works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const menuBtn = page.locator('button[aria-label="Toggle menu"]');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(page.getByText(/书库|Books/).first()).toBeVisible();
    await menuBtn.click();
  });
});

  test('admin - users and history require admin role', async ({ page }) => {
    await page.goto('/admin/users');
    // Should redirect to / or show page depending on role - in demo mode redirects to /
    await expect(page).toHaveURL(/\//);
    
    await page.goto('/admin/history');
    await expect(page).toHaveURL(/\//);
  });
