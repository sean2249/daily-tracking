import { test, expect } from '@playwright/test';

// Tier 2 — boot smoke test. Loads the app shell and confirms the sign-in
// screen renders without an uncaught runtime error. Does NOT log in or touch
// Supabase data (getSession with no stored session resolves to null offline).
const APP = '/daily-tracking/';

test('app boots to the sign-in screen without crashing', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e));

  await page.goto(APP);

  await expect(page.getByText('PIXIE', { exact: true })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /SIGN IN/ })).toBeVisible();

  expect(
    pageErrors,
    `uncaught page errors:\n${pageErrors.map((e) => e.stack || String(e)).join('\n')}`,
  ).toHaveLength(0);
});
