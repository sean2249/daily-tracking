# Daily — Habit & Principle Tracker

A minimalist, mobile-first tracker for two kinds of daily commitments:

- **Habits** — things you *do* (Read 30 minutes, Meditate).
- **Principles** — lines you *hold* (No added sugar, No phone at meals).

One daily check-in mechanic, a GitHub-style completion heatmap, per-item streaks,
and a "Full Combo" streak across every item. Intentionally small: **max 7 active
items**, short names, one accent color. React 18 + Vite + Supabase, shipped as a
PWA to GitHub Pages.

See [CLAUDE.md](CLAUDE.md) for architecture, commands, and the verification policy.

```bash
npm install
npm run dev      # http://localhost:5173/daily-tracking/
npm run verify   # unit tests + production build
```
