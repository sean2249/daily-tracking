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
      // documentElement.scrollWidth is clipped by the html/body overflow:hidden
      // lock, so it hides a phone-frame that overflows the viewport; body's
      // scrollWidth still reflects that overflow, so we assert on both.
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));

    // ±1px tolerance for sub-pixel rounding.
    expect(metrics.scrollWidth, 'horizontal overflow (跑版)').toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.bodyScrollWidth, 'frame overflow (跑版)').toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.scrollHeight, 'document scrolls vertically').toBeLessThanOrEqual(metrics.innerHeight + 1);
  });

  // Structural guard for the chore-detail 跑版 bug: the phone frame is a flex
  // item of the flex `body`, so without `#root { min-width: 0 }` a long
  // unbreakable label (e.g. a chore name) forces the frame wider than the
  // viewport — and because the page is overflow:hidden-locked, the shift can't
  // scroll back and persists until reload. Inject such content and assert the
  // frame still cannot exceed the viewport.
  test(`phone frame stays within viewport under overflowing content at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(APP);
    await expect(page.getByText('PIXIE', { exact: true })).toBeVisible();

    const m = await page.evaluate(() => {
      const frame = document.querySelector('.phone-frame');
      const probe = document.createElement('div');
      probe.style.cssText = 'white-space:nowrap; font-size:17px;';
      probe.textContent = 'overflowprobewithnobreaks'.repeat(4);
      (frame.querySelector('div') || frame).appendChild(probe);
      void document.body.offsetWidth; // force reflow
      const r = {
        frameWidth: frame.getBoundingClientRect().width,
        bodyScrollWidth: document.body.scrollWidth,
        innerWidth: window.innerWidth,
      };
      probe.remove();
      return r;
    });

    expect(m.frameWidth, 'phone frame wider than viewport (跑版)').toBeLessThanOrEqual(m.innerWidth + 1);
    expect(m.bodyScrollWidth, 'content overflows viewport (跑版)').toBeLessThanOrEqual(m.innerWidth + 1);
  });
}
