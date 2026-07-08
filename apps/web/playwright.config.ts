import { defineConfig, devices } from '@playwright/test';

const PORT = 3010;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Requires a production build first (`pnpm build`) — mirrors what actually
  // ships, and avoids dev-mode noise (HMR, eval-source-map) in assertions.
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { NEXT_PUBLIC_USE_MOCKS: 'true' },
  },
});
