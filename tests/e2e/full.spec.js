import { test, expect } from '@playwright/test';

// Tier 3 — full live E2E against the real Supabase backend.
// Requires a CONFIRMED test account exposed via env vars; skips otherwise.
//
// Delete IS supported now (Detail → ⋯ → Delete), so this spec cleans up the
// items it creates. Still run it against a THROWAWAY account (see CLAUDE.md).
const APP = '/daily-tracking/';
const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

// Unique per run; names must be <= 10 chars (enforced by the create sheet).
const SUFFIX = Date.now().toString().slice(-5);
const HABIT = `H${SUFFIX}`;
const PRIN = `P${SUFFIX}`;
const RENAME = `R${SUFFIX}`;

async function signIn(page) {
  await page.goto(APP);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /Sign in/i }).click();
  // app finished loading once the Today top bar's Calendar button is present
  await expect(page.getByRole('button', { name: 'Calendar' })).toBeVisible({ timeout: 20_000 });
}

async function openCreateSheet(page) {
  // FAB when today has items, "New challenge" button in the empty state.
  await page.getByRole('button', { name: 'New challenge' }).first().click();
  await expect(page.getByRole('heading', { name: 'New challenge' })).toBeVisible();
}

test.describe('full live E2E (real Supabase)', () => {
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run.');

  test('create habit + principle, check off, archive→restore, rename, delete', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);

    // ── create a habit ───────────────────────────────────────
    await openCreateSheet(page);
    await page.getByPlaceholder('e.g. Read 30 minutes').fill(HABIT);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText(HABIT)).toBeVisible();

    // ── create a principle ───────────────────────────────────
    await openCreateSheet(page);
    await page.getByPlaceholder('e.g. Read 30 minutes').fill(PRIN);
    await page.getByRole('tab', { name: 'Principles' }).click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText(PRIN)).toBeVisible();

    // ── check the habit off today (streak pill appears) ──────
    const box = page.getByRole('checkbox', { name: HABIT });
    await box.click();
    await expect(box).toBeChecked();

    // ── open detail, then archive ────────────────────────────
    await page.getByText(HABIT).click();
    await expect(page.getByText('Current streak')).toBeVisible();
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByRole('button', { name: 'Calendar' })).toBeVisible(); // back on Today

    // ── calendar shows it under Archived; open + restore ─────
    await page.getByRole('button', { name: 'Calendar' }).click();
    await expect(page.getByRole('button', { name: 'History' }).or(page.getByText('History'))).toBeVisible();
    await page.getByText(HABIT).click();
    await expect(page.getByText('Archived', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('button', { name: 'Restore' }).click();
    await expect(page.getByRole('button', { name: 'Calendar' })).toBeVisible(); // back on Today
    await expect(page.getByText(HABIT)).toBeVisible();

    // ── rename via detail ────────────────────────────────────
    await page.getByText(HABIT).click();
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('button', { name: 'Edit name' }).click();
    const nameInput = page.getByPlaceholder ? page.getByPlaceholder('e.g. Read 30 minutes') : page.locator('.text-input');
    await nameInput.fill(RENAME);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(RENAME)).toBeVisible();

    // ── clean up: delete both items ──────────────────────────
    for (const name of [RENAME, PRIN]) {
      await page.getByText(name).click();
      await page.getByRole('button', { name: 'More' }).click();
      await page.getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click(); // confirm
      await expect(page.getByRole('button', { name: 'Calendar' })).toBeVisible();
    }
  });

  // Layout regression guard on the real Today board at a phone viewport: no
  // horizontal overflow (跑版) and the document itself must not scroll vertically
  // — only the inner .scroll list scrolls.
  test('no layout overflow on the Today board at phone viewport', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);

    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
      sh: document.documentElement.scrollHeight,
      ih: window.innerHeight,
    }));
    expect(m.sw, 'horizontal overflow').toBeLessThanOrEqual(m.iw + 1);
    expect(m.sh, 'document scrolls vertically').toBeLessThanOrEqual(m.ih + 1);
  });
});
