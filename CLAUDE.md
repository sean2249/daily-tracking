# CLAUDE.md

Guidance for working in this repo. Read before adding/removing features.

## What this is

**Daily** — a minimalist habit & **principle** tracker. Two kinds of daily
commitments tracked side by side with one check-in mechanic and a GitHub-style
completion heatmap:

- **Habits** — things you *do* (Read 30 minutes, Meditate).
- **Principles** — lines you *hold* (No added sugar, No phone at meals).

Intentionally small: **max 7 active items**, names ≤10 chars, one accent-color
family. No gamification — the goal is consistency, not feature breadth. (This
replaced an earlier pixel-art RPG version; see git history for the rewrite.)

- **Frontend:** React 18 + Vite 6, plain JS/JSX (no TypeScript).
- **PWA:** `vite-plugin-pwa` (injectManifest, custom `src/sw.js` — offline shell
  only, no push); base path `/daily-tracking/` for GitHub Pages.
- **Backend:** Supabase (Postgres + Auth), project `xwqgrpfcuohpstqinkxb`.
- **Deploy:** `.github/workflows/deploy.yml` builds on push and deploys `main`
  to GitHub Pages.

## Architecture

- `src/main.jsx` — React root + service-worker registration; imports `styles.css`.
- `src/app.jsx` — app shell: auth session, data load (`loading → live/error`), a
  navigation **stack** (`today` / `calendar` / `detail`), and all
  create/edit/archive/restore/delete flows. Mutations go through an **optimistic
  `api`** (apply locally now → persist via `db.js` in the background → resync +
  toast on failure). Enforces the 7-item cap, single-slot toast + Undo, and the
  fixed theme. Renders a centered max-width phone column (`.app-shell`).
- `src/pages.jsx` — `TodayBoard` (7-day check-in list), `CalendarPage`
  (Full-Combo banner + month heatmap + archived list), `DetailPage` (streak hero
  + stats + per-day history). Each page renders live/loading/error/empty states.
- `src/ui.jsx` — shared UI: `ItemSheet` (create/edit), `Toast`, `ConfirmDialog`,
  `OverflowMenu`, `MonthGrid`/`MonthsView`, `StateMessage`/`ErrorState`,
  skeletons, `Segmented`.
- `src/icons.jsx` — inline line-SVG icon set (no emoji).
- `src/data.jsx` — **pure logic** (date math, `dayCompletion`, per-item streaks,
  `itemCompletion`, `fullComboStreak`, `bucket`, `SCALES`). No React/storage so
  it stays unit-testable; this is the most test-worthy code. `makeSeed` is dev-only.
- `src/lib/db.js` — Supabase data layer: plain CRUD (`getState`, `addItem`,
  `renameItem`, `toggle`, `archive`, `restore`, `remove`). Maps `dt_*` rows ↔ the
  `{item}`/`{log}` shapes. **Completion/streak math is NOT here** — it runs
  client-side in `data.jsx` from the loaded `{items, logs}`.
- `src/lib/{supabase,config}.js` — client init + public env config.
- `src/screens/Auth.jsx` — email/password sign-in gate (kept from the previous
  app; minimally restyled to the new tokens). There is intentionally **no
  sign-out / settings UI** yet.
- `src/styles.css` — the whole design system with the shipping-default tokens
  (swiss / light / **green** / sharp) baked into `:root`.
- `supabase/` — version-controlled schema. `migrations/0003_dt_items.sql` defines
  the live model. (The old push-reminder Edge Function / cron / push tables were
  removed in the rewrite.)

**Data model:**

```
item = { id, name, type:'habits'|'principles', status:'active'|'archived',
         start_date:'YYYY-MM-DD', archive_date:'YYYY-MM-DD'|null }
log  = { id, item_id, date:'YYYY-MM-DD', is_completed }   // one row per (item, day)
```

Tables: `dt_items`, `dt_item_logs`. Both have an `ALL` RLS policy keyed on
`user_id = auth.uid()`, and `user_id` defaults to `auth.uid()`, so the client
does direct table CRUD (no RPC layer). `remove()` hard-deletes the item and (via
`ON DELETE CASCADE`) all its logs. Dates are stored as `date` and computed from
the client's **local** `todayYMD()` to avoid timezone drift.

> Note: this Supabase project is shared with other apps — tables `restaurants`,
> `mood_logs`, `telegram_sessions`, `recommendation_logs` belong to those. Never
> touch them.

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
   - pure logic (`data.jsx`) → a unit test in `tests/unit/`;
   - new screen/flow/UI → assertions in the Tier 3 spec `tests/e2e/full.spec.js`
     (and, if it affects the boot shell, the Tier 2 `smoke.spec.js`).
2. **Run all three tiers and make them pass** before merge:
   - **Tier 1** `npm test` + `npm run build` — also enforced by
     `.github/workflows/ci.yml` on every PR (the merge gate).
   - **Tier 2** `npm run test:e2e:smoke`.
   - **Tier 3** `npm run test:e2e` (account + network requirements below).

### Running Tier 3 (full live E2E)

The spec signs in to the real Supabase project and exercises: create habit +
principle, check off (streak), open detail → archive, calendar archived list →
restore, rename, and **delete** (it cleans up its own items). It **skips itself**
unless these env vars point at a **confirmed** account:

```bash
E2E_TEST_EMAIL=...  E2E_TEST_PASSWORD=...  npm run test:e2e
```

Use a **throwaway account**. As an agent with Supabase MCP, the safest way to
make one is **pure SQL** (no confirmation email is sent): insert a confirmed row
into `auth.users` (bcrypt `crypt(pw, gen_salt('bf'))`) plus a matching
`auth.identities` row with `provider='email'`, then delete the user's `dt_*` rows
+ the `auth.users` row afterwards. (Do not sign a real address up via the REST
endpoint — it emails that person.)

**Network requirement:** the browser must reach `*.supabase.co`. Some sandboxes
block it (MCP still works on a separate channel) — run Tier 3 locally or in CI.

## Conventions

- Pure, deterministic logic belongs in `data.jsx`, takes explicit args (never
  reads `new Date()` except `todayYMD()`), and is unit-tested.
- Screens dispatch through `app.jsx`'s optimistic `api`; they never talk to
  Supabase directly. Keep all Supabase access in `db.js` as plain CRUD.
- The theme ships as a **single fixed variant** (green/light/sharp) baked into
  `styles.css :root`. The token system (`SCALES` in `data.jsx`) is kept modular
  so dark mode / colorblind palettes can be added later, but no switcher exists.
- Any `position:absolute` overlay anchors to `.app-shell`; keep hidden overlays
  `pointer-events:none` so they don't intercept clicks (see `.dialog`/`.toast`).
- Playwright is pinned to an exact version (`1.56.1`) to match the CI browser
  build; bump deliberately.
