# Product Design — "Daily" (Habit & Principle Tracker)

> A mobile (iOS-sized) app for tracking two kinds of commitments side by side:
> **Habits** (things you *do*) and **Principles** (lines you *hold*). Both share
> one daily yes/no check-in and one GitHub-style completion heatmap. The product
> is intentionally small — consistency over feature breadth.

This file is a concise product summary. The **canonical high-fidelity reference**
is the Claude Design handoff bundle that drove the rewrite (`README.md`,
`styles.css`, `pages.jsx`, `ui.jsx`, `data.jsx`, `icons.jsx`). The shipped tokens
and per-screen layout variants below are baked into the app.

## 1. Vision

Track up to **7 active items** (habits + principles), check them off each day
(today *and* backfill the last 6 days), and watch a completion heatmap build up
over weeks. A "Full Combo" streak counts consecutive days where *every* tracked
item hit 100%. No XP, levels, coins, avatars, or reminders — just the streak math
and the heatmap.

## 2. Screens

- **Today** — a 7-day list. Today is a highlighted, auto-expanded row; the past 6
  days are collapsible. Each day splits into **Habits** / **Principles** sections
  with checkboxes; checking one updates its fill %, streak pills, and the heatmap.
- **Calendar** — a Full-Combo banner, a month-by-month completion heatmap (newest
  first) with a Less→More legend, and an **Archived** list.
- **Detail** — one item's current-streak hero, a 3-stat strip (Longest /
  Completion / Total done), a per-day history heatmap, and a ⋯ menu (Edit name /
  Archive / Delete, or Restore / Delete when archived).

## 3. Rules & rationale

- **Two tracks, one mechanic.** Habits and Principles look and check identically;
  they only differ at the *grouping* level.
- **Cap at 7 active items**, enforced on add *and* restore. Names ≤10 chars.
- **Streaks treat today as pending, not broken** — an unchecked item today
  doesn't reset the streak; a day only breaks it once it's in the past.
  No-tracking days are skipped, not broken (combo too).
- **Archive vs Delete are distinct.** Archive preserves history (read-only in
  Calendar, restorable, offers Undo); Delete is a confirmed, irreversible purge
  of the item *and* its logs.
- **Single-slot toast + Undo** for reversible actions (check toggle, archive).
- **One accent color family.** The UI accent is a mid step of the completion
  scale, so logo, buttons, today-highlight, and heatmap stay one family.

## 4. Completion scale (`bucket` → color)

7 buckets: `0` / `<20` / `<40` / `<60` / `<80` / `<100` / `100`. Shipping palette
is **GitHub green** (`#EBEDF0 #C6F0D0 #9BE9A8 #57D27C #30A14E #1E7E3C #0E4429`);
accent = step 4 (`#30A14E`). Ocean (colorblind-safe) and Plum scales also have 7
steps in `SCALES` (`data.jsx`) but are not exposed via UI.

## 5. Type & tokens

- **Hanken Grotesk** for UI, **JetBrains Mono** (tabular) for all numbers/dates.
- Shipping theme: swiss vibe · light · green · **sharp** corners (radii 4/4/3/3).
- Full token source of truth: `src/styles.css` `:root`.

## 6. Data model

```
item = { id, name, type:'habits'|'principles', status:'active'|'archived',
         start_date, archive_date }
log  = { id, item_id, date, is_completed }   // one row per (item, day)
```

Persisted to Supabase (`dt_items`, `dt_item_logs`); all completion/streak math is
pure and lives in `src/data.jsx`. See [CLAUDE.md](CLAUDE.md) for architecture.
