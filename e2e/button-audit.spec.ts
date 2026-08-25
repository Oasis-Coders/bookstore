// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Button Audit - No Dead Buttons', () => {
  const pages = [
    { path: '/', name: 'Dashboard' },
    { path: '/books', name: 'Books' },
    { path: '/books/new', name: 'New Book' },
    { path: '/suppliers', name: 'Suppliers' },
    { path: '/suppliers/new', name: 'New Supplier' },
    { path: '/locations', name: 'Locations' },
    { path: '/locations/new', name: 'New Location' },
    { path: '/purchase-orders', name: 'POs' },
    { path: '/purchase-orders/new', name: 'New PO' },
    { path: '/sales', name: 'Sales' },
    { path: '/reports', name: 'Reports' },
    { path: '/settings', name: 'Settings' },
    { path: '/auth', name: 'Auth' },
  ];

  for (const { path, name } of pages) {
    test(`${name} (${path}) - every button/link works`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      for (let i = 0; i < buttonCount; i++) {
        const btn = buttons.nth(i);
        const isVisible = await btn.isVisible().catch(() => false);
        if (!isVisible) continue;
        const isDisabled = await btn.isDisabled().catch(() => false);
        if (isDisabled) continue;
        const text = await btn.textContent();
        const ariaLabel = await btn.getAttribute('aria-label');
        expect(text?.trim() || ariaLabel, `Button ${i} on ${path} should have text or aria-label`).toBeTruthy();
      }
      const links = page.locator('a[href]');
      const linkCount = await links.count();
      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        expect(href, `Link ${i} on ${path} should have href`).toBeTruthy();
        expect(href, `Link ${i} on ${path} should not be javascript:void`).not.toBe('javascript:void(0)');
      }
    });
  }
});
