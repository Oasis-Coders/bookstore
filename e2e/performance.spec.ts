// @ts-nocheck
import { test, expect, type Page } from '@playwright/test';

/**
 * Industry-standard Web Vitals & Lighthouse "Good" thresholds (Google Web Vitals / W3C):
 * - TTFB (Time to First Byte): <= 800ms
 * - FCP (First Contentful Paint): <= 1800ms
 * - LCP (Largest Contentful Paint): <= 2500ms
 * - CLS (Cumulative Layout Shift): <= 0.1
 * - TBT (Total Blocking Time, Long Tasks > 50ms): <= 200ms
 * - DOMContentLoaded: <= 2000ms
 */
export const WEB_VITALS_BUDGETS = {
  TTFB_MS: 800,
  FCP_MS: 1800,
  LCP_MS: 2500,
  CLS: 0.1,
  TBT_MS: 200,
  DOM_CONTENT_LOADED_MS: 2000,
} as const;

interface WebVitalsMetrics {
  ttfbMs: number;
  fcpMs: number;
  lcpMs: number;
  cls: number;
  tbtMs: number;
  domInteractiveMs: number;
  domContentLoadedMs: number;
  domCompleteMs: number;
}

/**
 * Injects PerformanceObservers before navigation to capture LCP, CLS, and Long Tasks (TBT)
 * accurately from the start of the page lifecycle.
 */
async function installWebVitalsObservers(page: Page) {
  await page.addInitScript(() => {
    (window as any).__webVitals = {
      lcp: 0,
      cls: 0,
      tbt: 0,
    };

    try {
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const last = entries[entries.length - 1];
        if (last) {
          (window as any).__webVitals.lcp = last.startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    try {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            (window as any).__webVitals.cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}

    try {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const blockingTime = entry.duration - 50;
          if (blockingTime > 0) {
            (window as any).__webVitals.tbt += blockingTime;
          }
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });
}

async function collectWebVitals(page: Page): Promise<WebVitalsMetrics> {
  // Allow buffered paint / LCP / layout-shift observers a brief frame to flush
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find((p) => p.name === 'first-contentful-paint');
    const vitals = (window as any).__webVitals || { lcp: 0, cls: 0, tbt: 0 };

    return {
      ttfbMs: nav ? Math.max(0, Math.round(nav.responseStart - nav.requestStart)) : 0,
      fcpMs: fcp ? Math.round(fcp.startTime) : 0,
      lcpMs: Math.round(vitals.lcp || (fcp ? fcp.startTime : 0)),
      cls: Number((vitals.cls || 0).toFixed(4)),
      tbtMs: Math.round(vitals.tbt || 0),
      domInteractiveMs: nav ? Math.round(nav.domInteractive - nav.startTime) : 0,
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0,
      domCompleteMs: nav ? Math.round(nav.domComplete - nav.startTime) : 0,
    };
  });
}

test.describe('Core Web Vitals & Industry-Standard Performance Budgets', () => {
  test.beforeEach(async ({ page }) => {
    await installWebVitalsObservers(page);
  });

  test('/reports meets Google Core Web Vitals "Good" thresholds (TTFB <= 800ms, FCP <= 1.8s, LCP <= 2.5s, CLS <= 0.1, TBT <= 200ms)', async ({
    page,
  }) => {
    const response = await page.goto('/reports', { waitUntil: 'load' });
    expect(response?.status()).toBeLessThan(400);

    await expect(page.getByText(/会计报表|Reports|登录|Sign In/).first()).toBeVisible({ timeout: 5000 });

    const metrics = await collectWebVitals(page);
    console.log('[Web Vitals /reports]', metrics);

    expect(
      metrics.ttfbMs,
      `/reports TTFB (${metrics.ttfbMs}ms) exceeded industry-standard ${WEB_VITALS_BUDGETS.TTFB_MS}ms threshold`
    ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.TTFB_MS);

    expect(
      metrics.fcpMs,
      `/reports FCP (${metrics.fcpMs}ms) exceeded industry-standard ${WEB_VITALS_BUDGETS.FCP_MS}ms threshold`
    ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.FCP_MS);

    expect(
      metrics.lcpMs,
      `/reports LCP (${metrics.lcpMs}ms) exceeded industry-standard ${WEB_VITALS_BUDGETS.LCP_MS}ms threshold`
    ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.LCP_MS);

    expect(
      metrics.cls,
      `/reports CLS (${metrics.cls}) exceeded industry-standard ${WEB_VITALS_BUDGETS.CLS} threshold`
    ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.CLS);

    expect(
      metrics.tbtMs,
      `/reports Total Blocking Time (${metrics.tbtMs}ms) exceeded industry-standard ${WEB_VITALS_BUDGETS.TBT_MS}ms threshold`
    ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.TBT_MS);

    expect(
      metrics.domContentLoadedMs,
      `/reports DOMContentLoaded (${metrics.domContentLoadedMs}ms) exceeded ${WEB_VITALS_BUDGETS.DOM_CONTENT_LOADED_MS}ms threshold`
    ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.DOM_CONTENT_LOADED_MS);
  });

  test('core application routes meet Google Core Web Vitals thresholds', async ({ page }) => {
    const routes = ['/', '/books', '/sales', '/purchase-orders', '/reports'];
    const summary: Record<string, WebVitalsMetrics & { status: number | undefined }> = {};

    for (const route of routes) {
      const res = await page.goto(route, { waitUntil: 'load' });
      const metrics = await collectWebVitals(page);
      summary[route] = { status: res?.status(), ...metrics };

      expect(
        metrics.ttfbMs,
        `${route} TTFB (${metrics.ttfbMs}ms) > ${WEB_VITALS_BUDGETS.TTFB_MS}ms`
      ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.TTFB_MS);

      expect(
        metrics.fcpMs,
        `${route} FCP (${metrics.fcpMs}ms) > ${WEB_VITALS_BUDGETS.FCP_MS}ms`
      ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.FCP_MS);

      expect(
        metrics.lcpMs,
        `${route} LCP (${metrics.lcpMs}ms) > ${WEB_VITALS_BUDGETS.LCP_MS}ms`
      ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.LCP_MS);

      expect(
        metrics.cls,
        `${route} CLS (${metrics.cls}) > ${WEB_VITALS_BUDGETS.CLS}`
      ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.CLS);

      expect(
        metrics.tbtMs,
        `${route} TBT (${metrics.tbtMs}ms) > ${WEB_VITALS_BUDGETS.TBT_MS}ms`
      ).toBeLessThanOrEqual(WEB_VITALS_BUDGETS.TBT_MS);
    }

    console.table(summary);
  });
});
