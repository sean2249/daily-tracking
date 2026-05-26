import { defineConfig, devices } from '@playwright/test';

// The app is served under a base path (GitHub Pages project site). Tests
// navigate to APP_PATH; baseURL is just the origin.
const PORT = 5173;
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  timeout: 60_000,
  use: {
    baseURL: ORIGIN,
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    // Tier 2 — boot smoke. No login, no DB writes. Safe to run anywhere.
    {
      name: 'smoke',
      testMatch: /smoke\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1000, height: 1300 } },
    },
    // Tier 3 — full flow against real Supabase. Skips itself unless
    // E2E_TEST_EMAIL / E2E_TEST_PASSWORD are set (a confirmed test account).
    {
      name: 'full',
      testMatch: /full\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1000, height: 1300 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `${ORIGIN}/daily-tracking/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
