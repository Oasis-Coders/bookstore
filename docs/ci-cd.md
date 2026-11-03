# CI/CD Pipeline & Performance Gate | 持续集成与持续部署文档

> Workflow file: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

This document explains how the GitHub Actions CI/CD pipeline validates code quality, unit logic, production builds, E2E workflows, and industry-standard **Google Core Web Vitals** performance budgets before deploying to production.

---

## 1. Pipeline Overview

```
      [ Push / PR to main, master or Manual Dispatch ]
                             │
                             ▼
      ┌──────────────────────────────────────────────┐
      │ 1. test-and-perf-unit                        │
      │    - TypeScript Typecheck (pnpm typecheck)   │
      │    - Vitest Unit Tests (pnpm test)           │
      │    - Concurrency Benchmarks (pnpm test:perf) │
      └──────────────────────┬───────────────────────┘
                             │
                             ▼
      ┌──────────────────────────────────────────────┐
      │ 2. build-and-e2e-perf                        │
      │    - Production Build (pnpm build)           │
      │    - Core Web Vitals Gate (test:e2e:perf)    │
      │    - Full E2E Test Suite (pnpm test:e2e)     │
      └──────────────────────┬───────────────────────┘
                             │ (on push to main/master)
                             ▼
      ┌──────────────────────────────────────────────┐
      │ 3. deploy                                    │
      │    - Production Deployment to Vercel         │
      └──────────────────────────────────────────────┘
```

### Triggers & Concurrency
- **Triggers**:
  - `push` to `main` or `master`
  - `pull_request` targeting `main` or `master`
  - `workflow_dispatch` (manual trigger from the GitHub Actions tab)
- **Concurrency Control**:
  - Grouped by `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`. Pushing a new commit to the same branch or PR automatically cancels any older in-flight run to save runner minutes.
- **Runtime Environment**:
  - Ubuntu Latest (`ubuntu-latest`)
  - Node.js `22`
  - `pnpm@10.0.0` with store caching enabled

---

## 2. Stage-by-Stage Breakdown

### Job 1: `test-and-perf-unit` (Typecheck, Unit & Concurrency Perf Tests)
Fast feedback stage (typically completes in < 1 minute) that verifies static types, business logic, and database query concurrency:

1. **`pnpm typecheck` (`tsc --noEmit`)**:
   - Validates TypeScript types across all Server Components, Client Components, API routes, and Supabase helpers.
2. **`pnpm test` (`vitest run`)**:
   - Runs all unit test suites, including:
     - [`__tests__/reports-summary.test.ts`](../__tests__/reports-summary.test.ts): Sales net total and order count aggregation (工单 #12).
     - [`app/reports/publisher-report-utils.test.ts`](../app/reports/publisher-report-utils.test.ts): Publisher inventory movement report row merging and sorting (工单 #13).
3. **`pnpm test:perf` (`vitest run __tests__/reports-performance.test.ts`)**:
   - Runs [`__tests__/reports-performance.test.ts`](../__tests__/reports-performance.test.ts) using a simulated-latency Supabase client (`createLatencyMockSupabase`) to verify:
     - Above-the-fold sections in [`app/reports/reports-data.ts`](../app/reports/reports-data.ts) (`fetchInventoryOverview`, `fetchSalesRangeData`, `fetchEditedSalesData`, `fetchMonthlyFinancialData`) execute **in parallel** via `Promise.all` rather than a >3s sequential waterfall.
     - Publisher report queries (`books`, `inventory_qty_at` RPC, `inventory_transactions`) run concurrently.
     - Redundant `profiles` table lookups are deduplicated by reusing `profileMap`.

---

### Job 2: `build-and-e2e-perf` (Production Build, E2E & Core Web Vitals Gate)
Runs after `test-and-perf-unit` succeeds. Building and testing in the same job avoids uploading/downloading the ~200MB `.next` directory across runners and ensures Playwright tests run against the exact production build artifact.

1. **Next.js Build Cache**:
   - Caches `.next/cache` keyed by `pnpm-lock.yaml` and source file hashes (`**/*.ts`, `**/*.tsx`) to speed up incremental builds.
2. **Production Build (`pnpm build` -> `next build --webpack`)**:
   - Compiles the application and prerenders static/dynamic App Router routes in Demo Mode (`NEXT_PUBLIC_SUPABASE_URL: ''`, `NEXT_PUBLIC_SUPABASE_ANON_KEY: ''`) so that Next.js middleware (`proxy.ts`) permits unauthenticated Playwright E2E and Core Web Vitals checks across all routes without redirecting to `/auth`.
3. **Playwright Browser Cache**:
   - Caches `~/.cache/ms-playwright` keyed by `pnpm-lock.yaml` so Chromium only downloads when Playwright is upgraded.
4. **Core Web Vitals & Route Performance Gate (`pnpm test:e2e:perf`)**:
   - Starts the compiled production server (`PLAYWRIGHT_WEB_COMMAND="pnpm start"`) and runs [`e2e/performance.spec.ts`](../e2e/performance.spec.ts).
   - Injects browser `PerformanceObserver`s before page navigation to measure and enforce **Google Core Web Vitals & Lighthouse "Good" industry-standard thresholds** on `/reports` and core routes (`/`, `/books`, `/sales`, `/purchase-orders`):

   | Metric | Threshold | Description |
   | :--- | :--- | :--- |
   | **TTFB** (Time to First Byte) | `<= 800ms` | Server / SSR response latency (`responseStart - requestStart`) |
   | **FCP** (First Contentful Paint) | `<= 1800ms` | Time until the first text or UI shell is painted |
   | **LCP** (Largest Contentful Paint) | `<= 2500ms` | Time until the largest above-the-fold element renders |
   | **CLS** (Cumulative Layout Shift) | `<= 0.1` | Visual layout stability during load and `<Suspense>` streaming |
   | **TBT** (Total Blocking Time) | `<= 200ms` | Sum of main-thread blocking time exceeding `50ms` from `longtask` entries |
   | **DOMContentLoaded** | `<= 2000ms` | Time until HTML parsing and deferred scripts complete |

5. **Full E2E Application Suite (`pnpm test:e2e`)**:
   - Runs [`e2e/app.spec.ts`](../e2e/app.spec.ts) (full user workflows across Dashboard, Books, Suppliers, Locations, Purchase Orders, Sales, Reports, Settings, Auth, and mobile responsiveness) and [`e2e/button-audit.spec.ts`](../e2e/button-audit.spec.ts) (dead button/link audit across all pages).
6. **Failure Diagnostics Artifact**:
   - If any Playwright test or performance budget fails (`if: failure()`), uploads `playwright-report/` as an artifact retained for 7 days for inspection.

---

### Job 3: `deploy` (Deploy to Production)
Runs **only** when:
- Both `test-and-perf-unit` and `build-and-e2e-perf` pass (`needs: [test-and-perf-unit, build-and-e2e-perf]`).
- The event is a `push` to `main` or `master` (pull requests never trigger production deployment).

**Behavior**:
- Checks if `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets are configured in GitHub Repository Settings.
  - **If configured**: Pulls production environment settings via `vercel pull`, builds prebuilt artifacts via `vercel build --prod`, and deploys to Vercel Production via `vercel deploy --prebuilt --prod`.
  - **If not configured**: Logs an informational message and exits cleanly with status `0` (supporting setups where Vercel's native GitHub App integration handles deployment after branch protection checks pass).

---

## 3. Running CI Checks Locally

Before pushing or opening a PR, you can run every stage of the CI pipeline locally:

```bash
# 1. Typecheck
pnpm typecheck

# 2. All unit tests (including /reports concurrency benchmarks)
pnpm test

# 3. Only /reports concurrency & data-fetching performance tests
pnpm test:perf

# 4. Production build
pnpm build

# 5. Core Web Vitals & route performance E2E gate
pnpm test:e2e:perf

# 6. Full Playwright E2E test suite
pnpm test:e2e
```

---

## 4. Required & Optional GitHub Secrets

Configure these under **GitHub Repository → Settings → Secrets and variables → Actions**:

| Secret Name | Required? | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional (Recommended) | Supabase project URL for live E2E / build environment |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional (Recommended) | Supabase anonymous public key |
| `NEXT_PUBLIC_SITE_URL` | Optional | Production site URL (defaults to `http://localhost:3000` in CI) |
| `VERCEL_TOKEN` | Optional | Vercel personal access token for CLI deployment in Job 3 |
| `VERCEL_ORG_ID` | Optional | Vercel team/organization ID for CLI deployment |
| `VERCEL_PROJECT_ID` | Optional | Vercel project ID for CLI deployment |

