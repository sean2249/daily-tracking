import { test, expect } from '@playwright/test';

// Tier 3 — full live E2E against the real Supabase backend.
// Requires a CONFIRMED test account exposed via env vars; skips otherwise.
//
// NOTE: the app currently exposes no UI to delete a habit or chore, so this
// spec cannot remove the items it creates. Run it against a THROWAWAY account
// and tear the account down at the data layer afterwards (see CLAUDE.md).
const APP = '/daily-tracking/';
const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

// Unique per run so repeated runs against the same account don't collide.
const SUFFIX = Date.now().toString().slice(-6);
const HABIT = `E2E Habit ${SUFFIX}`;
const CHORE = `E2E Chore ${SUFFIX}`;
const NEW_NAME = `E2E ${SUFFIX}`;

test.describe('full live E2E (real Supabase)', () => {
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run.');

  test('sign in, navigate tabs, create + check habit, complete + undo chore, edit settings', async ({ page }) => {
    test.setTimeout(120_000);

    // ── sign in ──────────────────────────────────────────────
    await page.goto(APP);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: /SIGN IN/ }).click();

    // app finished loading once the bottom tabs are present
    await expect(page.getByRole('button', { name: 'HABITS' })).toBeVisible({ timeout: 20_000 });

    // ── create a habit ───────────────────────────────────────
    await page.getByRole('button', { name: 'HABITS' }).click();
    await page.getByRole('button', { name: '+ NEW' }).click();
    await expect(page.getByText('NEW HABIT')).toBeVisible();
    await page.getByPlaceholder('靜坐 / Read / Meditate').fill(HABIT);
    await page.getByRole('button', { name: 'CREATE', exact: true }).click();

    // a fresh account unlocks the "First Steps" achievement -> dismiss it
    const nice = page.getByRole('button', { name: 'NICE' });
    await nice.waitFor({ state: 'visible', timeout: 4000 }).then(() => nice.click()).catch(() => {});

    await expect(page.getByText(HABIT)).toBeVisible();

    // ── check the habit off (detail screen) ──────────────────
    await page.getByText(HABIT).click();
    const checkBtn = page.getByRole('button', { name: 'CHECK OFF TODAY' });
    await expect(checkBtn).toBeVisible();
    await checkBtn.click();
    await expect(page.getByRole('button', { name: /DONE TODAY/ })).toBeVisible();
    await expect(page.getByText('1d').first()).toBeVisible(); // streak 0 -> 1
    await page.getByRole('button', { name: /BACK/ }).click();

    // ── create a chore ───────────────────────────────────────
    await page.getByRole('button', { name: 'CHORES' }).click();
    await page.getByRole('button', { name: '+ NEW' }).click();
    await expect(page.getByText('NEW CHORE')).toBeVisible();
    await page.getByPlaceholder('打掃 / Trash / Laundry').fill(CHORE);
    await page.getByRole('button', { name: 'CREATE', exact: true }).click();
    await expect(page.getByText(CHORE)).toBeVisible();

    // ── complete then undo the chore ─────────────────────────
    await page.getByText(CHORE).click();
    const markDone = page.getByRole('button', { name: 'MARK AS DONE' });
    await expect(markDone).toBeVisible();
    await markDone.click();
    await expect(page.getByRole('button', { name: /DONE TODAY/ })).toBeVisible();

    const undo = page.getByRole('button', { name: 'UNDO' });
    await expect(undo).toBeVisible();
    await undo.click();
    await expect(page.getByRole('button', { name: 'MARK AS DONE' })).toBeVisible();
    await page.getByRole('button', { name: /BACK/ }).click();

    // ── settings: rename the profile ─────────────────────────
    await page.getByRole('button', { name: 'PIXIE' }).click();
    await page.getByRole('button', { name: /DISPLAY NAME/ }).click();
    // the display-name field only exists inside the Settings modal, so waiting
    // on it confirms the modal opened (without an ambiguous "SETTINGS" text match
    // that also hits the Character screen's "Settings" section header).
    const nameField = page.getByPlaceholder('You');
    await expect(nameField).toBeVisible();
    await nameField.fill(NEW_NAME);
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    await expect(page.getByText(new RegExp(NEW_NAME)).first()).toBeVisible();
  });

  // Layout regression guard on the real Today / Chores screens at a phone
  // viewport: no horizontal overflow (跑版) and the document itself must not
  // scroll vertically — only the inner ScreenScroll list scrolls. (Chores is
  // the near-empty screen where the vertical over-scroll was most visible.)
  test('no layout overflow on Today / Chores at phone viewport', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(APP);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: /SIGN IN/ }).click();
    await expect(page.getByRole('button', { name: 'CHORES' })).toBeVisible({ timeout: 20_000 });

    const assertNoOverflow = async (label) => {
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        // documentElement.scrollWidth is clipped by the html/body overflow:hidden
        // lock and hides a phone-frame wider than the viewport; body's scrollWidth
        // still reflects it, so assert on both.
        bsw: document.body.scrollWidth,
        iw: window.innerWidth,
        sh: document.documentElement.scrollHeight,
        ih: window.innerHeight,
      }));
      expect(m.sw, `${label}: horizontal overflow`).toBeLessThanOrEqual(m.iw + 1);
      expect(m.bsw, `${label}: frame overflow (跑版)`).toBeLessThanOrEqual(m.iw + 1);
      expect(m.sh, `${label}: document scrolls vertically`).toBeLessThanOrEqual(m.ih + 1);
    };

    await assertNoOverflow('Today');
    await page.getByRole('button', { name: 'CHORES' }).click();
    await assertNoOverflow('Chores');

    // Opening a chore detail and returning must not leave the layout shifted
    // (the 跑版 bug this guard was added for). Uses the chore created earlier
    // in this run; skips gracefully if it isn't present.
    if (await page.getByText(CHORE).count()) {
      await page.getByText(CHORE).first().click();
      await expect(page.getByRole('button', { name: 'MARK AS DONE' })).toBeVisible();
      await assertNoOverflow('Chore detail');
      await page.getByRole('button', { name: /BACK/ }).click();
      await expect(page.getByRole('button', { name: '+ NEW' })).toBeVisible();
      await assertNoOverflow('Chores after BACK');
    }
  });
});
