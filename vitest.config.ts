import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // e2e/ 下的是 Playwright 用例（pnpm test:e2e），不让 vitest 跑它们
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
