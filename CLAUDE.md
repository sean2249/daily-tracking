# CLAUDE.md

Guidance for working in this repo. Read before adding/removing features.

## What this is

**Pixie · Daily** — a pixel-art habit & chore tracker with light RPG
gamification (XP, levels, coins, an avatar whose hair grows when you slack, a
room that gets messy with overdue chores, achievements, and quests).

- **Frontend:** React 18 + Vite 6, plain JS/JSX (no TypeScript).
- **PWA:** `vite-plugin-pwa` (injectManifest, custom `src/sw.js`); base path
  `/daily-tracking/` for GitHub Pages.
- **Backend:** Supabase (Postgres + Auth), project `xwqgrpfcuohpstqinkxb`.
- **Deploy:** `.github/workflows/deploy.yml` builds on push and deploys `main`
  to GitHub Pages.

## Architecture

- `src/main.jsx` — React root + (no-op in dev) service-worker registration.
- `src/app.jsx` — app shell: auth session, data load, and a `dispatch(action)`
  reducer that routes every user action to a `db.js` function.
- `src/screens.jsx` — Today / Habits / Chores / Character screens + bottom tabs.
- `src/modals.jsx` — add-item, settings, achievement, level-up, edit-completion.
- `src/lib/db.js` — Supabase data layer. Each mutation is a **read-modify-write**
  (fetch row → compute gamification math → write back). Maps `dt_*` rows to the
  shapes screens expect.
- `src/data.jsx` — **pure logic** (date math, XP curve, schedule/next-due
  computation) + demo sample data. This is the most test-worthy code.
- `src/lib/{supabase,config,push}.js` — client init, public env config, Web Push.
- `supabase/` — version-controlled backend for daily reminder push: the
  `dt-send-reminders` Edge Function, migrations for the push tables + the
  `dt_admin_due_reminders` RPC, and the `pg_cron` job that fires the function
  every 5 min. The live objects already exist on the project; these files
  reproduce them (no secrets — the VAPID keypair / cron secret live only in the
  service-role-only `dt_app_config` table).

**Data model / security:** tables are prefixed `dt_` (`dt_profiles`,
`dt_habits`, `dt_habit_completions`, `dt_chores`, `dt_chore_completions`,
`dt_achievement_defs`, `dt_user_achievements`, `dt_user_quests`,
`dt_push_subscriptions`, ...). Every per-user table has an `ALL`-command RLS
policy keyed on `user_id = auth.uid()`, and `user_id` columns default to
`auth.uid()`, so the client does direct table CRUD (no RPC layer).
Caveat: the database also contains a set of unused `SECURITY DEFINER` RPCs
(`dt_save_habit`, `dt_toggle_habit`, `dt_bootstrap`, a "household" concept, …)
from a different design — **the current client does not call them.** Don't
assume they reflect live behaviour. (The one RPC that *is* live is
`dt_admin_due_reminders`, called by the `dt-send-reminders` Edge Function — see
`supabase/`.)

## Commands

```bash
npm run dev              # Vite dev server (http://localhost:5173/daily-tracking/)
npm run build            # production build to dist/
npm run preview          # serve the built dist/

npm test                 # Tier 1 — unit tests (vitest run)
npm run test:watch       # unit tests in watch mode
npm run verify           # Tier 1 gate locally: unit tests + build
npm run test:e2e:smoke   # Tier 2 — Playwright UI smoke (no login, no DB)
npm run test:e2e         # Tier 3 — full live E2E (needs a test account; see below)
```

## Verification policy (READ THIS before merging)

There is **no manual QA gate** — "verifying a feature" means running the layered
test suite. When you **add or remove any feature**, you must:

1. **Add/update tests for the change** at the appropriate layer:
   - pure logic (`data.jsx`, gamification math) → a unit test in `tests/unit/`;
   - new screen/flow/UI → assertions in the Tier 3 spec `tests/e2e/full.spec.js`
     (and, if it affects the boot shell, the Tier 2 `smoke.spec.js`).
2. **Run all three tiers and make them pass** before merge:
   - **Tier 1** `npm test` + `npm run build` — also enforced automatically by
     `.github/workflows/ci.yml` on every PR (this is the merge gate).
   - **Tier 2** `npm run test:e2e:smoke`.
   - **Tier 3** `npm run test:e2e` (see account + network requirements below).

CI (`ci.yml`) runs Tier 1 on every PR. Tiers 2 & 3 are separate
`workflow_dispatch` jobs you trigger manually (Tier 3 self-skips unless the
account secrets are set). To make the gate actually block merges, enable branch
protection on `main` requiring the `verify` check.

### Running Tier 3 (full live E2E)

The spec signs in to the real Supabase project and exercises: tab navigation,
create habit → check off (streak/XP), create chore → complete → undo, and a
settings rename. It **skips itself** unless these env vars point at a
**confirmed** account:

```bash
E2E_TEST_EMAIL=...  E2E_TEST_PASSWORD=...  npm run test:e2e
```

Use a **throwaway account**, not a real one: the app exposes **no UI to delete a
habit or chore** (see Known issues), so the spec cannot clean up the rows it
creates — tear the account down at the data layer instead.

- **As an agent with Supabase MCP:** create the account (Supabase Auth signup),
  confirm it with `update auth.users set email_confirmed_at = now() where …`,
  run the spec, then delete the user's `dt_*` rows and the `auth.users` row.
- **In CI/local:** provide a pre-created confirmed account via the env vars /
  `E2E_TEST_EMAIL` & `E2E_TEST_PASSWORD` secrets.

**Network requirement:** the browser must be able to reach
`*.supabase.co`. Some Claude Code web sandboxes use a restrictive network
allowlist that blocks the Supabase host (MCP still works because it uses a
separate channel) — Tier 3 cannot run there. Run it locally, in GitHub Actions,
or in a web environment whose network policy allowlists the Supabase host.

## Known issues (observed, unfixed — verify before relying on these)

- **No delete UI for habits/chores.** `DELETE_HABIT` / `DELETE_CHORE` exist in
  `app.jsx` and `db.js`, but nothing dispatches them; the detail-screen `EDIT`
  buttons are `onEdit={() => {}}` no-ops. Users currently cannot remove or edit
  a habit/chore from the UI.
- **`nextDueFor` weekly interval > 1 is off by ~one week.** Biweekly behaves
  like weekly and every-3-weeks like every-2-weeks (condition
  `i >= 7*(interval-1)` should likely be `i >= 7*interval`). Unit tests cover
  only the correct interval-1 cases so as not to lock in the bug.

## Conventions

- Pure, deterministic logic belongs in `data.jsx` and should take explicit args
  (don't read `new Date()` implicitly) so it stays unit-testable.
- Keep Supabase writes flowing through `db.js` (read-modify-write); screens
  dispatch actions, they don't talk to Supabase directly.
- Playwright is pinned to an exact version (`1.56.1`) to match the browser build
  available in CI/sandboxes; bump deliberately.
