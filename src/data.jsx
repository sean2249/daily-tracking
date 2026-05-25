// data.jsx — sample data + state helpers + date utilities

// ─────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(d) {
  // YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dayDiff(a, b) {
  // calendar-day diff, ignoring time
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((A - B) / DAY_MS);
}

function fmtMonthDay(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// Build a completion history string-set from a recipe like {weeklyHits: 0.85, weeks: 14}
function buildHistory({ days = 60, prob = 0.8, gapWeeks = 0, today = new Date() }) {
  const hits = new Set();
  for (let i = 1; i <= days; i++) {  // skip today (i=0) by default
    const d = addDays(today, -i);
    // simulate a brief lapse window mid-history
    const inGap = gapWeeks > 0 && i > 14 && i < 14 + gapWeeks * 7;
    if (inGap) continue;
    if (Math.random() < prob) hits.add(isoDate(d));
  }
  return hits;
}

// ─────────────────────────────────────────────────────────────
// SAMPLE DATA — using the user's content (Traditional Chinese)
// ─────────────────────────────────────────────────────────────
const TODAY = new Date();
const TODAY_ISO = isoDate(TODAY);

// Use a deterministic seed-free history but stable for the demo
function deterministicHistory(seed, days = 90) {
  const hits = new Set();
  let s = seed;
  for (let i = 1; i <= days; i++) {
    // simple LCG
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    if (r < 0.78) {
      const d = addDays(TODAY, -i);
      hits.add(isoDate(d));
    }
  }
  return hits;
}

const SAMPLE_HABITS = [
  {
    id: 'h-meditate',
    name: '靜坐',
    nameEn: 'Meditate',
    emoji: '🧘',
    color: '#9989c5',
    schedule: 'daily',  // every day
    weekdays: [0,1,2,3,4,5,6],
    reminderTime: '07:00',
    streak: 12,
    longestStreak: 21,
    totalCompletions: 64,
    completions: deterministicHistory(13, 90),
  },
  {
    id: 'h-music',
    name: '聽音樂',
    nameEn: 'Listen to music',
    emoji: '🎵',
    color: '#d97a8f',
    schedule: 'daily',
    weekdays: [0,1,2,3,4,5,6],
    reminderTime: null,
    streak: 3,
    longestStreak: 18,
    totalCompletions: 41,
    completions: deterministicHistory(47, 90),
  },
  {
    id: 'h-read',
    name: '閱讀',
    nameEn: 'Read',
    emoji: '📖',
    color: '#6a9c4a',
    schedule: 'weekdays',
    weekdays: [1,2,3,4,5],
    reminderTime: '21:30',
    streak: 5,
    longestStreak: 11,
    totalCompletions: 28,
    completions: deterministicHistory(101, 90),
  },
];

// Mark today completed for one of the habits (to seed "in progress" today)
SAMPLE_HABITS[1].completions.add(TODAY_ISO); // 聽音樂 done today

const SAMPLE_CHORES = [
  {
    id: 'c-clean',
    name: '打掃房間',
    nameEn: 'Clean the room',
    emoji: '🧹',
    notes: 'Vacuum + dust desk + tidy',
    frequency: 'weekly',
    interval: 1,
    weekdays: [6],  // Saturday
    dayOfMonth: null,
    nextDue: isoDate(addDays(TODAY, -1)),   // overdue by 1 day
    lastCompleted: isoDate(addDays(TODAY, -8)),
    last3: [
      addDays(TODAY, -8),
      addDays(TODAY, -15),
      addDays(TODAY, -22),
    ].map(isoDate),
    totalCompletions: 9,
    overdue: true,
  },
  {
    id: 'c-razor',
    name: '更換刮鬍刀',
    nameEn: 'Change razor blade',
    emoji: '🪒',
    notes: '',
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: 1,
    nextDue: isoDate(addDays(TODAY, 4)),
    lastCompleted: isoDate(addDays(TODAY, -26)),
    last3: [
      addDays(TODAY, -26),
      addDays(TODAY, -57),
      addDays(TODAY, -88),
    ].map(isoDate),
    totalCompletions: 3,
    overdue: false,
  },
  {
    id: 'c-trash',
    name: '倒垃圾',
    nameEn: 'Take out trash',
    emoji: '🗑️',
    notes: 'Mon + Thu evening',
    frequency: 'weekly',
    interval: 1,
    weekdays: [1, 4],
    nextDue: TODAY_ISO,  // due today
    lastCompleted: isoDate(addDays(TODAY, -3)),
    last3: [
      addDays(TODAY, -3),
      addDays(TODAY, -7),
      addDays(TODAY, -10),
    ].map(isoDate),
    totalCompletions: 18,
    overdue: false,
  },
  {
    id: 'c-wash',
    name: '洗衣服',
    nameEn: 'Wash clothes',
    emoji: '🧺',
    notes: '',
    frequency: 'weekly',
    interval: 1,
    weekdays: [0],  // Sunday
    nextDue: isoDate(addDays(TODAY, 2)),
    lastCompleted: isoDate(addDays(TODAY, -5)),
    last3: [
      addDays(TODAY, -5),
      addDays(TODAY, -12),
      addDays(TODAY, -19),
    ].map(isoDate),
    totalCompletions: 11,
    overdue: false,
  },
  {
    id: 'c-collect',
    name: '收衣服',
    nameEn: 'Bring in laundry',
    emoji: '👕',
    notes: 'After sunset',
    frequency: 'weekly',
    interval: 1,
    weekdays: [0],
    nextDue: TODAY_ISO,
    lastCompleted: isoDate(addDays(TODAY, -7)),
    last3: [
      addDays(TODAY, -7),
      addDays(TODAY, -14),
      addDays(TODAY, -21),
    ].map(isoDate),
    totalCompletions: 9,
    overdue: false,
  },
];

const SAMPLE_ACHIEVEMENTS = [
  { id: 'first_habit',    title: 'First Steps',    desc: 'Create your first habit', emoji: '🌱', unlocked: true,  unlockedAt: '2025-08-12' },
  { id: 'streak_7',       title: 'Lucky Seven',    desc: 'Reach a 7-day streak',     emoji: '🔥', unlocked: true,  unlockedAt: '2025-09-04' },
  { id: 'streak_30',      title: 'Iron Will',      desc: 'Reach a 30-day streak',    emoji: '💎', unlocked: false },
  { id: 'habit_total_50', title: 'Half Century',   desc: '50 habit check-ins',       emoji: '🏅', unlocked: true,  unlockedAt: '2025-10-22' },
  { id: 'chore_master_10',title: 'House Hero',     desc: 'Complete 10 chores',       emoji: '🧹', unlocked: true,  unlockedAt: '2025-10-30' },
  { id: 'perfect_day',    title: 'Perfect Day',    desc: 'All habits + all chores',  emoji: '⭐', unlocked: false },
  { id: 'level_5',        title: 'Level 5',        desc: 'Reach level 5',            emoji: '🎖️', unlocked: false },
  { id: 'spotless_week',  title: 'Spotless Week',  desc: '7 days of a clean room',   emoji: '✨', unlocked: false },
];

const SAMPLE_QUESTS_DAILY = [
  { id: 'q-2habits', title: 'Check off 2 habits', progress: 1, target: 2, xp: 25, coins: 5 },
  { id: 'q-1chore',  title: 'Finish 1 chore',     progress: 0, target: 1, xp: 30, coins: 10 },
  { id: 'q-tidy',    title: 'Keep room above 50% tidy', progress: 1, target: 1, xp: 20, coins: 5 },
];

const SAMPLE_QUESTS_WEEKLY = [
  { id: 'wq-checkins', title: '20 habit check-ins this week', progress: 11, target: 20, xp: 100, coins: 25 },
  { id: 'wq-overdue',  title: 'Zero overdue chores',          progress: 0,  target: 1,  xp: 80,  coins: 20 },
];

// ─────────────────────────────────────────────────────────────
// XP / Level
// ─────────────────────────────────────────────────────────────
function levelFromXP(totalXP) {
  // n such that 50 * n^2 <= xp
  let n = 0;
  while (50 * (n + 1) * (n + 1) <= totalXP) n++;
  return Math.max(1, n);
}
function xpForLevel(n) { return 50 * n * n; }

// ─────────────────────────────────────────────────────────────
// SCHEDULE HELPERS
// ─────────────────────────────────────────────────────────────
function isHabitScheduledOn(habit, date) {
  const dow = date.getDay();  // 0=Sun
  return habit.weekdays.includes(dow);
}

function chorelDueText(chore, today = TODAY) {
  const due = parseISO(chore.nextDue);
  const diff = dayDiff(due, today);
  if (diff < 0) return `${-diff}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff < 7) return `Due in ${diff}d`;
  return `Due ${fmtMonthDay(due)}`;
}

function scheduleSummary(habit) {
  if (habit.schedule === 'daily') return 'Every day';
  if (habit.schedule === 'weekdays') return 'Weekdays';
  const dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return habit.weekdays.map(d => dn[d]).join(' ');
}

function cadenceSummary(chore) {
  if (chore.frequency === 'daily') return chore.interval === 1 ? 'Every day' : `Every ${chore.interval}d`;
  if (chore.frequency === 'weekly') {
    const dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const days = chore.weekdays.map(d => dn[d]).join(' ');
    return chore.interval === 1 ? days : `Every ${chore.interval}w · ${days}`;
  }
  if (chore.frequency === 'monthly') return `Monthly · day ${chore.dayOfMonth}`;
  return '—';
}

// Compute next due date given a chore's frequency config, starting from `from`.
function nextDueFor(chore, from = new Date()) {
  if (chore.frequency === 'daily') {
    return isoDate(addDays(from, chore.interval || 1));
  }
  if (chore.frequency === 'weekly') {
    const wds = (chore.weekdays && chore.weekdays.length) ? chore.weekdays : [from.getDay()];
    // find the next day in `from + 1..14` whose dow is in wds, biased by interval (weeks)
    const intv = chore.interval || 1;
    for (let i = 1; i <= 7 * intv + 7; i++) {
      const d = addDays(from, i);
      if (wds.includes(d.getDay())) {
        // for interval > 1, skip occurrences in earlier weeks until interval*7 days reached
        if (intv === 1 || i >= 7 * (intv - 1)) return isoDate(d);
      }
    }
    return isoDate(addDays(from, 7));
  }
  if (chore.frequency === 'monthly') {
    const dom = chore.dayOfMonth || 1;
    const d = new Date(from.getFullYear(), from.getMonth(), dom);
    if (d <= from) d.setMonth(d.getMonth() + (chore.interval || 1));
    return isoDate(d);
  }
  return isoDate(addDays(from, 1));
}

export {
  DAY_MS, isoDate, parseISO, addDays, dayDiff, fmtMonthDay,
  buildHistory, deterministicHistory,
  SAMPLE_HABITS, SAMPLE_CHORES, SAMPLE_ACHIEVEMENTS,
  SAMPLE_QUESTS_DAILY, SAMPLE_QUESTS_WEEKLY,
  levelFromXP, xpForLevel,
  isHabitScheduledOn, chorelDueText, scheduleSummary, cadenceSummary, nextDueFor,
  TODAY, TODAY_ISO,
};
