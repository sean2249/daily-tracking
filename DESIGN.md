# Product Design Specification — "Daily Tracking" (working title)

> A personal, mobile-first habit & chore tracker with a light RPG layer: you grow an
> avatar that visibly reflects how consistent you've been. Stay on top of your habits
> and chores and your character levels up, earns rewards, and lives in a tidy room.
> Slip, and your hair grows shaggy and the room gets messy. Self-contained spec intended
> as input to a design/prototyping tool.

---

## 1. Product Vision
A single-user app that turns the chore of "remembering to do things" into a small,
rewarding game. Two practical engines underneath — **daily habits** and **recurring
chores** — feed one emotional surface: a **character + room** that grows or decays based
on your consistency. The app proactively reminds you (push notifications) so it works
even when you forget to open it.

**One-line pitch:** *Tamagotchi meets your to-do list.*

## 2. Goals & Non-Goals
**Goals**
- Make daily habit check-ins and recurring chores effortless on a phone.
- Provide intrinsic + extrinsic motivation via a living avatar, levels, achievements, and quests.
- Proactively remind the user at times they control.
- Installable, app-like (PWA), works offline-ish for viewing.

**Non-Goals (v1)**
- No multi-user / family / sharing features. Strictly personal.
- **Habits keep their full daily check history** so the user can see a calendar of stamps —
  the "traces of time" (歲月的痕跡). **Chores** stay lightweight (only the **last 3
  completions** retained). No heavy analytics/reporting dashboards beyond the habit calendar.
- No social feed, no marketplace, no real-money purchases.

## 3. Target User & Context
A single individual managing their own routines on their phone. Logs in with email +
password; their data is private to them. Primary usage is quick daily glances and
check-ins, plus occasional setup/editing.

## 4. Core Concepts
- **Habit** — something done (ideally) every scheduled day; tracked by a daily check + a
  streak. e.g. "Drink water", "Read 20 min", "Stretch".
- **Chore** — a recurring task on a fixed cadence (every N days / specific weekdays /
  monthly day). Completing it schedules the next occurrence. e.g. "Take out trash" (weekly),
  "Change sheets" (every 2 weeks), "Pay rent" (monthly).
- **Character (Avatar)** — the player's on-screen persona. Has a **level**, **XP**,
  **coins**, **hair length**, and lives in a **room** with a **cleanliness** level.
- **Decay** — neglect has visible consequences: missed habit days grow the avatar's hair;
  overdue chores make the room messy.
- **Quests** — auto-generated daily & weekly objectives that grant bonus rewards.
- **Achievements** — one-time unlockable milestones.

---

## 5. Feature Set (overview)
1. **Habit tracking** — create/edit/delete habits, daily check-off, streak & totals, plus a
   **completion calendar** (stamps on every day done — see your history grow over time).
2. **Chore management** — create/edit/delete recurring chores, mark done, auto-reschedule, overdue tracking.
3. **Gamification** — XP/levels, coins, avatar growth, hair-growth & room-mess decay,
   achievements, daily/weekly quests, on-time bonuses.
4. **Notifications** — configurable daily summary time + optional per-item reminder times.
5. **Account** — email/password auth, profile & settings.

---

## 6. Detailed CRUD Specifications

### 6.1 Habits
**Fields:** name (required), emoji/icon, color, schedule (`days_of_week`; empty = every
day), optional reminder time, active flag, sort order. **Derived/maintained:** current
streak, longest streak, total completions, last completed date, and the **full
completion-date history** (one record per completed day, powering the calendar view).

- **Create** — Form: name, emoji picker, color, schedule selector (Everyday / pick weekdays),
  optional reminder time. Saving the very first habit unlocks the `first_habit` achievement.
- **Read** —
  - *List view* (Habits tab): all habits with icon, name, schedule summary, current streak,
    total completions.
  - *Today view*: only habits scheduled for the selected day, each with a check control and streak badge.
  - *Detail*: full config + the **completion calendar** — a stamp on every day the habit was
    done, so the user literally watches their consistency accumulate over weeks/months
    (the "traces of time"). Plus current/longest streak and totals.
- **Update** — Same form as create, pre-filled; any field editable.
- **Delete** — With confirm; removes the habit and its completion records.
- **Check / Uncheck (for a given day)** — Tapping the check toggles completion for that date:
  - On check: record completion (kept permanently), increment total, update streak
    (consecutive scheduled day → +1, otherwise reset to 1), update longest streak, award XP,
    advance relevant quests, evaluate achievements, recompute level. Trim avatar hair slightly.
  - On uncheck (same day): reverse the above (simplified rollback in v1).

### 6.2 Chores
**Fields:** name (required), emoji, notes, frequency (`daily` | `weekly` | `monthly`),
interval N (e.g. every 2 weeks), weekdays (for weekly), day-of-month (for monthly), start
date, optional reminder time, active flag, sort order. **Maintained:** total completions,
last completed date, last 3 completion timestamps, next due date, overdue flag.

- **Create** — Form adapts to frequency: daily→interval N; weekly→interval N + weekday(s);
  monthly→day-of-month. Plus start date, notes, reminder time.
- **Read** —
  - *List view* (Chores tab): name, cadence summary, next due date, **overdue** highlight, total completions.
  - *Today view*: chores due on/before the selected day (incl. overdue), each with a done control.
  - *Detail*: full config + last 3 completion times.
- **Update / Delete** — As habits.
- **Mark done (for due date)** — Records completion (prune to last 3), increments total,
  computes next occurrence, awards XP (extra if it was overdue), restores room cleanliness,
  advances quests, evaluates achievements, recomputes level.

### 6.3 Profile / Character & Settings
- **Read** — level, XP (and XP-to-next-level), coins, hair length, room cleanliness,
  display name, timezone, daily-reminder enabled/time.
- **Update settings** — display name, timezone, daily reminder on/off + time, enable push
  notifications (request permission → subscribe), sign out.

---

## 7. Gamification Mechanics (initial version, concrete)

### 7.1 XP & Levels
- Habit checked on time: **+10 XP**. Chore done on time: **+15 XP**. Late completion: **half XP**.
- Quests grant bonus XP/coins on completion.
- **Level curve:** cumulative XP for level *n* ≈ `50 × n²` (level derived from total XP).
- Leveling up triggers a celebration and may unlock level-based achievements/cosmetics later.

### 7.2 Coins
Soft currency earned from quests and streak milestones. v1: earned & displayed; spending
(cosmetics/room décor) is a future hook — keep the balance visible to set up the loop.

### 7.3 Avatar — Hair Growth (habit neglect)
- `hair_length` integer, starts neat (0). Each day a **scheduled habit is missed**, hair
  grows (+1 per missed habit-day), applied during daily sync/decay.
- Completing habits trims hair (e.g. −1 per check, floor 0).
- **Visual tiers (design):** Neat → Slightly shaggy → Overgrown → Wild. Rendered as a simple,
  friendly avatar (SVG/CSS layers) so tiers swap a hair layer; no heavy art assets in v1.

### 7.4 Room — Cleanliness (chore neglect)
- `room_cleanliness` 0–100, starts spotless (100). Overdue chores reduce it (a fixed
  amount per overdue chore-day during decay); completing chores restores it (more for
  clearing an overdue one).
- **Visual tiers (design):** Spotless → Tidy → Cluttered → Messy. Room background swaps
  clutter overlays (stray items, dust) by tier.

### 7.5 Achievements (initial catalog)
One-time unlocks with title, description, emoji; unlocking fires a notification + on-screen
celebration. Initial set:
- `first_habit` — create your first habit.
- `streak_7` / `streak_30` — reach a 7-/30-day streak on any habit.
- `habit_total_50` — 50 total habit check-ins.
- `chore_master_10` — complete 10 chores.
- `perfect_day` — complete every scheduled habit AND every due chore in one day.
- `level_5` — reach level 5.
- `spotless_week` — keep the room at high cleanliness for 7 days.
The catalog is extensible; an **achievements wall** shows locked (silhouette) vs unlocked.

### 7.6 Quests
- **Daily (2–3 auto-generated):** e.g. "Check off 2 habits", "Do 1 chore", "Keep the room tidy".
- **Weekly (1–2):** e.g. "20 habit check-ins this week", "Zero overdue chores this week".
- Each shows progress (x/target) and a reward; completion grants XP/coins. Quests regenerate
  per period and are idempotent (created once per day/week).

### 7.7 On-Time Rewards
- A **perfect day** (all scheduled habits + due chores done) grants bonus XP and unlocks
  `perfect_day`. Streak milestones grant coins. The avatar reacts positively (happy state,
  sparkles) when fully on-track.

---

## 8. Screens & User Flows

### 8.1 Navigation
Bottom tab bar, 4 tabs: **Today · Habits · Chores · Character**. Mobile-first portrait layout.

### 8.2 Auth
- Email + password sign-in / sign-up. Minimal, friendly. After auth → Today.

### 8.3 Today (home)
The emotional + functional hub.
- **Top:** avatar in its room, reflecting current hair length & cleanliness; level badge +
  XP progress bar; coins.
- **Daily quests** strip with progress.
- **Today's Habits:** list with check controls + streak badges.
- **Today's Chores:** list (incl. overdue, visually flagged) with done controls.
- Date switcher (look back/forward a few days).
- Empty/encouraging states; celebration animations on check-off, level-up, and perfect day.

### 8.4 Habits
- List of all habits (icon, name, schedule, streak, totals). FAB to add.
- Tap → detail with edit/delete. Add/edit form (§6.1). Detail centers on the **completion
  calendar** (see §9.1): a stamped calendar/heatmap of every day the habit was done, plus
  streak and totals.

### 8.5 Chores
- List of all chores (icon, name, cadence, next due, overdue highlight). FAB to add.
- Tap → detail (config + last 3 completions) with edit/delete. Add/edit form (§6.2).

### 8.6 Character (profile + settings)
- Large avatar in room; level, XP bar, coins.
- **Achievements wall** (locked/unlocked).
- **Weekly quests** with progress.
- Settings: display name, timezone, daily reminder on/off + time, enable notifications,
  sign out. Help text re: iOS "Add to Home Screen" requirement for push.

### 8.7 Key flows
1. **Onboarding:** sign up → prompted to create first habit → `first_habit` unlock → land on Today.
2. **Daily loop:** open → see avatar/room state → check habits & chores → quests progress → rewards/celebration.
3. **Setup loop:** add/edit habits & chores; set reminders.
4. **Notification loop:** receive reminder → tap → opens Today (or relevant item).

---

## 9. Visual & Character Design Direction

### 9.1 Habit Completion Calendar ("traces of time")
The signature view of a habit's history. Two complementary layouts:
- **Monthly calendar** — a familiar month grid where each completed day carries a **stamp**
  (the habit's emoji/color, like ink pressed onto the date). Scheduled-but-missed days read
  faintly; off-schedule days are neutral. The user flips back through months to relive the journey.
- **Year heatmap** (compact) — a GitHub-style contribution grid for the long view; intensity
  reflects activity, letting months of consistency become a single satisfying picture.
Design goal: make accumulated effort feel **tangible and earned** — patina, not just data.
Streak and totals sit alongside as headline numbers.

### 9.2 General
- **Tone:** warm, friendly, cozy; gently encouraging (never punishing). Rounded shapes,
  soft shadows, playful but legible.
- **Avatar:** a simple stylized character buildable from layered parts; the **hair layer**
  swaps across 4 tiers (neat→wild). Mood/expression shifts with overall on-track state.
- **Room:** a single cozy room as background; **clutter overlay** swaps across 4 cleanliness
  tiers (spotless→messy: stray clothes, dishes, dust). Optional day/night ambiance later.
- **Color:** a friendly primary + accent; positive states use bright/sparkle accents, decay
  states desaturate slightly (still cute, not grim).
- **Feedback:** micro-animations for check-off (pop/sparkle), level-up (burst), perfect-day
  (confetti), achievement unlock (modal/banner).
- **Constraints (v1):** prefer SVG/CSS composition over large image assets to keep the PWA light.

---

## 10. Notifications
Fully **user-configurable**:
- **Daily summary** at a time the user sets (toggle + time): "You have N habits and M chores
  left today" + a character-flavored nudge ("Your room's getting messy — 2 chores left!").
- **Per-item reminders** (optional): each habit/chore can carry its own reminder time; fires
  only if still incomplete.
- Tapping a notification opens the app (Today). Times respect the user's timezone. Sending is
  de-duplicated so the user isn't pinged twice for the same item/day.

---

## 11. Data Model (concise, supporting)
Single-user; every row scoped to the authenticated user.
- **profile** — display name, timezone, daily-reminder settings, level, xp, coins,
  hair_length, room_cleanliness, last_sync_date.
- **habit** — config + current_streak, longest_streak, total_completions, last_completed_date.
- **habit_completion** — **full history**: one row per completed day (date + timestamp),
  powering the calendar/heatmap. Never pruned.
- **chore** — config (frequency/interval/weekdays/day-of-month/start_date) + total_completions, last_completed_date.
- **chore_completion** — keep only the **last 3** per chore (due date + timestamp).
- **achievement_def** (catalog) + **user_achievement** (unlocked).
- **user_quest** — period (daily/weekly), key, title, target, progress, rewards, completed.
- **push_subscription**, **notification_log** (de-dup).

> Habits retain full completion history (cheap for a single user) so streaks can be computed
> exactly and the calendar/heatmap is fully accurate. Chores keep only the last 3 completions;
> their counters are maintained on the row.

---

## 12. Platform & Technical Constraints (supporting)
- **Client:** installable **PWA** (mobile-first), offline-capable for viewing.
- **Backend:** Supabase (Postgres + Auth + Edge Functions). All data access via a locked-down
  RPC layer; row-level security keeps data private per user.
- **Push:** Web Push (VAPID); a scheduled job evaluates due reminders each minute and sends.
  iOS requires 16.4+ and "Add to Home Screen" before granting push permission (surface this in UI).
- **Hosting:** static hosting (GitHub Pages) under a sub-path; no client-side router (use
  tab state) to avoid deep-link 404s.

---

## 13. Out of Scope / Future Hooks
- Spending coins on cosmetics / room décor; avatar customization shop.
- Richer history/analytics; calendar heatmaps.
- More avatar moods, pets, seasonal themes, day/night room.
- Multi-device sync nuances beyond basic auth session.

## 14. Open Questions (for design)
- Art style for avatar & room (illustrated vs. flat/iconographic)?
- How prominent should decay (hair/mess) be — subtle vs. dramatic?
- Should the Today screen lead with the avatar (emotional) or the task lists (functional)?
- Number/cadence of quests that feels motivating, not nagging?
