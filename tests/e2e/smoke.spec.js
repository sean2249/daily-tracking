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

// Layout regression guard: on phone-sized viewports the app shell must neither
// overflow horizontally (跑版 / clipped edges) nor let the document scroll
// vertically (only the inner ScreenScroll list scrolls). The smoke test runs
// offline, so this exercises the Auth/PIXIE shell — same phone-frame + media
// query that every screen uses. (env(safe-area-inset-*) resolve to 0 in
// headless Chromium, so this validates the 100vw→100% / document-lock fixes,
// not the visual notch padding.)
const mobileViewports = [
  { width: 390, height: 844 }, // iPhone 12/13/14-class
  { width: 360, height: 740 }, // common small Android
];

for (const vp of mobileViewports) {
  test(`no horizontal/vertical document overflow at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(APP);
    await expect(page.getByText('PIXIE', { exact: true })).toBeVisible();

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      frameWidth: document.querySelector('.phone-frame')?.getBoundingClientRect().width ?? 0,
    }));

    // ±1px tolerance for sub-pixel rounding.
    expect(metrics.scrollWidth, 'horizontal overflow (跑版)').toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.scrollHeight, 'document scrolls vertically').toBeLessThanOrEqual(metrics.innerHeight + 1);
    // The phone frame must FILL the viewport width — not shrink-wrap to its
    // content and leave dead space on the right (the width-collapse 跑版).
    expect(metrics.frameWidth, 'phone frame narrower than viewport').toBeGreaterThanOrEqual(metrics.innerWidth - 1);
  });
}
