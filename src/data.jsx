// data.jsx — pure model + completion/streak math.
// Single source of truth so the Today board, Calendar, and Detail page agree.
// Deliberately free of React/storage so it stays unit-testable; all functions
// take explicit args (never read `new Date()` implicitly except todayYMD()).
//
// Model:
//   item = { id, name, type:'habits'|'principles', status:'active'|'archived',
//            start_date:'YYYY-MM-DD', archive_date:'YYYY-MM-DD'|null }
//   log  = { id, item_id, date:'YYYY-MM-DD', is_completed:boolean }

// ---------- date helpers (local time, YYYY-MM-DD strings) ----------
export function pad(n) { return n < 10 ? '0' + n : '' + n; }
export function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function parseYMD(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function todayYMD() { return ymd(new Date()); }
export function addDays(s, n) { const d = parseYMD(s); d.setDate(d.getDate() + n); return ymd(d); }
export function dow(s) { return parseYMD(s).getDay(); } // 0=Sun

export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtTopDate(s) { const d = parseYMD(s); return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()); }
export function fmtMonDay(s) { const d = parseYMD(s); return MON_SHORT[d.getMonth()] + ' ' + d.getDate(); }
export function fmtSlash(s) { const d = parseYMD(s); return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()); }

// relative day label for the 7-day board
export function relLabel(s, today) {
  if (s === today) return 'Today';
  if (s === addDays(today, -1)) return 'Yesterday';
  return DOW_SHORT[dow(s)];
}

// ---------- completion color scales ----------
export const SCALES = {
  green: { name: 'GitHub green', c: ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'] },
  ocean: { name: 'Ocean (colorblind-safe)', c: ['#EBEDF0', '#BBD6F2', '#74A9E8', '#3B6FD4', '#1B3F8F'] },
  plum: { name: 'Plum', c: ['#EFEAF2', '#D9BCE6', '#B97FCE', '#9447B0', '#5E2178'] },
};

// pct 0..100 -> 0..4 index into a completion scale
export function bucket(pct) {
  if (pct === 0) return 0;
  if (pct < 34) return 1;
  if (pct < 67) return 2;
  if (pct < 100) return 3;
  return 4;
}

// ---------- item time-window ----------
// item is "tracked" on day s  iff  start_date <= s < archive_date (exclusive)
export function itemActiveOn(item, s) {
  if (item.status === 'deleted') return false;
  if (s < item.start_date) return false;
  if (item.archive_date && s >= item.archive_date) return false;
  return true;
}
export function activeItemsOn(items, s) { return items.filter((it) => itemActiveOn(it, s)); }

// ---------- log index ----------
export function makeLogIndex(logs) {
  const m = new Map();
  for (const l of logs) m.set(l.item_id + '|' + l.date, l.is_completed);
  return m;
}
export function isDone(logIdx, itemId, date) { return logIdx.get(itemId + '|' + date) === true; }

// ---------- day completion ----------
// returns { denom, num, pct } ; denom 0 (pct null) = no-tracking day
export function dayCompletion(items, logIdx, s) {
  const act = activeItemsOn(items, s);
  if (act.length === 0) return { denom: 0, num: 0, pct: null };
  let num = 0;
  for (const it of act) if (isDone(logIdx, it.id, s)) num++;
  return { denom: act.length, num, pct: Math.round((num / act.length) * 100) };
}

// earliest start among all non-deleted items (lower bound for streak walks)
export function earliestStart(items) {
  let e = null;
  for (const it of items) {
    if (it.status === 'deleted') continue;
    if (e === null || it.start_date < e) e = it.start_date;
  }
  return e;
}

// ---------- per-item current streak ----------
// Today is treated as pending (skipped, not breaking) for active items.
export function itemCurrentStreak(item, logIdx, today) {
  if (item.status === 'deleted') return 0;
  let end = today;
  let countToday = true;
  if (item.status === 'archived' && item.archive_date) {
    end = addDays(item.archive_date, -1); // last determined active day
    countToday = false;
  }
  let streak = 0;
  let d = end;
  if (countToday) {
    if (isDone(logIdx, item.id, d)) streak++;
    d = addDays(d, -1);
  }
  while (d >= item.start_date) {
    if (isDone(logIdx, item.id, d)) { streak++; d = addDays(d, -1); }
    else break;
  }
  return streak;
}

// longest run of completed days within the item's determined window
export function itemLongestStreak(item, logIdx, today) {
  if (item.status === 'deleted') return 0;
  const last = item.status === 'archived' && item.archive_date
    ? addDays(item.archive_date, -1)
    : (isDone(logIdx, item.id, today) ? today : addDays(today, -1));
  let best = 0, run = 0, d = item.start_date;
  while (d <= last) {
    if (isDone(logIdx, item.id, d)) { run++; if (run > best) best = run; }
    else run = 0;
    d = addDays(d, 1);
  }
  return best;
}

// completion rate: completed determined days / total determined days (excl. today)
export function itemCompletion(item, logIdx, today) {
  const last = item.status === 'archived' && item.archive_date
    ? addDays(item.archive_date, -1)
    : addDays(today, -1);
  if (last < item.start_date) return null; // no determined days yet
  let done = 0, total = 0, d = item.start_date;
  while (d <= last) { total++; if (isDone(logIdx, item.id, d)) done++; d = addDays(d, 1); }
  if (total === 0) return null;
  return Math.round((done / total) * 100);
}

export function itemTotalDone(item, logs) {
  return logs.filter((l) => l.item_id === item.id && l.is_completed).length;
}

// ---------- full combo streak (calendar header) ----------
// Consecutive days where every tracked item hit 100%. Today counts only if
// already 100% (else skipped, not broken); no-tracking days are skipped too.
export function fullComboStreak(items, logIdx, today) {
  const floor = earliestStart(items);
  if (!floor) return 0;
  let streak = 0;
  const t = dayCompletion(items, logIdx, today);
  if (t.denom > 0 && t.pct === 100) streak++;
  let d = addDays(today, -1);
  while (d >= floor) {
    const c = dayCompletion(items, logIdx, d);
    if (c.denom === 0) { d = addDays(d, -1); continue; } // no-tracking day: skip
    if (c.pct === 100) { streak++; d = addDays(d, -1); }
    else break;
  }
  return streak;
}

// ---------- demo seed (dev only — not on the production data path) ----------
function seedUid() { return 'id_' + Math.random().toString(36).slice(2, 10); }

export function makeSeed() {
  const today = todayYMD();
  const start = addDays(today, -72);
  const defs = [
    { name: 'Read 30 minutes', type: 'habits', p: 0.82, off: 0 },
    { name: 'Meditate', type: 'habits', p: 0.74, off: 5 },
    { name: 'Free writing', type: 'habits', p: 0.55, off: 12 },
    { name: 'No added sugar', type: 'principles', p: 0.7, off: 0 },
    { name: 'No phone at meals', type: 'principles', p: 0.6, off: 20 },
  ];
  const items = defs.map((d) => ({
    id: seedUid(), name: d.name, type: d.type, status: 'active',
    start_date: addDays(start, d.off), archive_date: null,
  }));
  const archived = {
    id: seedUid(), name: 'Cold shower', type: 'habits', status: 'archived',
    start_date: addDays(start, 3), archive_date: addDays(today, -16),
  };
  items.push(archived);

  const logs = [];
  const all = [...defs.map((d, i) => ({ it: items[i], p: d.p })), { it: archived, p: 0.65 }];
  for (const { it, p } of all) {
    let d = it.start_date;
    const end = it.archive_date ? addDays(it.archive_date, -1) : addDays(today, -1);
    let momentum = p;
    while (d <= end) {
      momentum += (Math.random() - 0.5) * 0.18;
      momentum = Math.max(0.15, Math.min(0.97, momentum * 0.7 + p * 0.3));
      if (Math.random() < momentum) logs.push({ id: seedUid(), item_id: it.id, date: d, is_completed: true });
      d = addDays(d, 1);
    }
  }
  for (const it of items) {
    if (it.status !== 'active') continue;
    for (let k = 1; k <= 4; k++) {
      const dd = addDays(today, -k);
      if (dd >= it.start_date && !logs.find((l) => l.item_id === it.id && l.date === dd))
        logs.push({ id: seedUid(), item_id: it.id, date: dd, is_completed: true });
    }
  }
  logs.push({ id: seedUid(), item_id: items[0].id, date: today, is_completed: true });
  logs.push({ id: seedUid(), item_id: items[3].id, date: today, is_completed: true });
  return { items, logs };
}
