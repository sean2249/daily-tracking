import { describe, it, expect } from 'vitest';
import {
  pad, ymd, parseYMD, todayYMD, addDays, dow, relLabel, fmtMonDay, fmtSlash,
  DOW_SHORT, MON_SHORT, SCALES, bucket,
  itemActiveOn, activeItemsOn, makeLogIndex, isDone, dayCompletion, earliestStart,
  itemCurrentStreak, itemLongestStreak, itemCompletion, itemTotalDone, fullComboStreak,
} from '../../src/data.jsx';

// Stable anchor: 2026-06-03 is a Wednesday.
const TODAY = '2026-06-03';

// build a log index from {item_id, date, is_completed?} tuples
function idxOf(...logs) {
  return makeLogIndex(logs.map((l, i) => ({ id: 'l' + i, is_completed: true, ...l })));
}
const item = (over) => ({ id: 'i', name: 'x', type: 'habits', status: 'active', start_date: '2026-05-01', archive_date: null, ...over });

describe('date helpers', () => {
  it('pad / ymd / parseYMD round-trip', () => {
    expect(pad(5)).toBe('05');
    expect(pad(12)).toBe('12');
    expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(ymd(new Date(2026, 11, 31))).toBe('2026-12-31');
    const d = parseYMD('2026-03-15');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 15]);
    expect(ymd(parseYMD('2026-07-09'))).toBe('2026-07-09');
  });

  it('todayYMD returns a YYYY-MM-DD string', () => {
    expect(todayYMD()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('addDays rolls over month/year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-10', -1)).toBe('2026-01-09');
  });

  it('dow returns 0..6 (Sun=0)', () => {
    expect(dow('2026-01-01')).toBe(4); // Thursday
    expect(DOW_SHORT[dow('2026-01-01')]).toBe('Thu');
  });

  it('fmtMonDay / fmtSlash', () => {
    expect(fmtMonDay('2026-06-03')).toBe('Jun 3');
    expect(MON_SHORT[5]).toBe('Jun');
    expect(fmtSlash('2026-06-03')).toBe('2026/06/03');
  });

  it('relLabel: Today / Yesterday / weekday', () => {
    expect(relLabel(TODAY, TODAY)).toBe('Today');
    expect(relLabel(addDays(TODAY, -1), TODAY)).toBe('Yesterday');
    const three = addDays(TODAY, -3);
    expect(relLabel(three, TODAY)).toBe(DOW_SHORT[dow(three)]);
  });
});

describe('SCALES / bucket', () => {
  it('every scale has at least 7 steps', () => {
    for (const key of Object.keys(SCALES)) {
      expect(SCALES[key].c.length).toBeGreaterThanOrEqual(7);
    }
  });
  it('bucket maps pct into 0..6 within scale bounds', () => {
    for (let pct = 0; pct <= 100; pct++) {
      const b = bucket(pct);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(SCALES.green.c.length);
    }
  });
  it('bucket boundaries 0 / <20 / <40 / <60 / <80 / <100 / 100', () => {
    expect(bucket(0)).toBe(0);
    expect(bucket(1)).toBe(1);
    expect(bucket(19)).toBe(1);
    expect(bucket(20)).toBe(2);
    expect(bucket(39)).toBe(2);
    expect(bucket(40)).toBe(3);
    expect(bucket(59)).toBe(3);
    expect(bucket(60)).toBe(4);
    expect(bucket(79)).toBe(4);
    expect(bucket(80)).toBe(5);
    expect(bucket(99)).toBe(5);
    expect(bucket(100)).toBe(6);
  });
});

describe('itemActiveOn / activeItemsOn', () => {
  it('tracked iff start_date <= s < archive_date (exclusive)', () => {
    const a = item({ start_date: '2026-06-01' });
    expect(itemActiveOn(a, '2026-05-31')).toBe(false); // before start
    expect(itemActiveOn(a, '2026-06-01')).toBe(true);
    expect(itemActiveOn(a, TODAY)).toBe(true);
    const arch = item({ start_date: '2026-06-01', status: 'archived', archive_date: '2026-06-03' });
    expect(itemActiveOn(arch, '2026-06-02')).toBe(true);
    expect(itemActiveOn(arch, '2026-06-03')).toBe(false); // archive is exclusive
  });
  it('deleted items are never active', () => {
    expect(itemActiveOn(item({ status: 'deleted' }), TODAY)).toBe(false);
  });
  it('activeItemsOn filters', () => {
    const items = [item({ id: 'a', start_date: '2026-06-01' }), item({ id: 'b', start_date: '2026-12-01' })];
    expect(activeItemsOn(items, TODAY).map((i) => i.id)).toEqual(['a']);
  });
});

describe('makeLogIndex / isDone / dayCompletion', () => {
  const A = item({ id: 'a' });
  const B = item({ id: 'b' });
  it('isDone reads the index', () => {
    const idx = idxOf({ item_id: 'a', date: TODAY });
    expect(isDone(idx, 'a', TODAY)).toBe(true);
    expect(isDone(idx, 'b', TODAY)).toBe(false);
  });
  it('is_completed:false is not done', () => {
    const idx = idxOf({ item_id: 'a', date: TODAY, is_completed: false });
    expect(isDone(idx, 'a', TODAY)).toBe(false);
  });
  it('dayCompletion: num/denom/pct', () => {
    const idx = idxOf({ item_id: 'a', date: TODAY });
    expect(dayCompletion([A, B], idx, TODAY)).toEqual({ denom: 2, num: 1, pct: 50 });
  });
  it('dayCompletion: no tracked items -> denom 0, pct null', () => {
    const future = item({ id: 'f', start_date: '2026-12-01' });
    expect(dayCompletion([future], makeLogIndex([]), TODAY)).toEqual({ denom: 0, num: 0, pct: null });
  });
});

describe('earliestStart', () => {
  it('min start among non-deleted', () => {
    const items = [item({ id: 'a', start_date: '2026-05-10' }), item({ id: 'b', start_date: '2026-04-01' }), item({ id: 'c', start_date: '2026-03-01', status: 'deleted' })];
    expect(earliestStart(items)).toBe('2026-04-01');
  });
  it('null when nothing', () => {
    expect(earliestStart([])).toBe(null);
  });
});

describe('itemCurrentStreak', () => {
  const A = item({ id: 'a', start_date: '2026-05-01' });
  it('today pending does not break the streak', () => {
    const idx = idxOf({ item_id: 'a', date: '2026-06-01' }, { item_id: 'a', date: '2026-06-02' });
    expect(itemCurrentStreak(A, idx, TODAY)).toBe(2); // 06-01, 06-02; today (06-03) skipped
  });
  it('today done counts', () => {
    const idx = idxOf({ item_id: 'a', date: '2026-06-01' }, { item_id: 'a', date: '2026-06-02' }, { item_id: 'a', date: TODAY });
    expect(itemCurrentStreak(A, idx, TODAY)).toBe(3);
  });
  it('a past gap breaks it', () => {
    const idx = idxOf({ item_id: 'a', date: '2026-06-02' }); // 06-01 missing
    expect(itemCurrentStreak(A, idx, TODAY)).toBe(1);
  });
  it('archived: counts back from archive_date-1', () => {
    const arch = item({ id: 'a', status: 'archived', archive_date: '2026-06-03' });
    const idx = idxOf({ item_id: 'a', date: '2026-06-01' }, { item_id: 'a', date: '2026-06-02' });
    expect(itemCurrentStreak(arch, idx, TODAY)).toBe(2);
  });
});

describe('itemLongestStreak', () => {
  const A = item({ id: 'a', start_date: '2026-06-01' });
  it('longest run within window (excl. today when pending)', () => {
    const idx = idxOf({ item_id: 'a', date: '2026-06-01' }, { item_id: 'a', date: '2026-06-02' });
    expect(itemLongestStreak(A, idx, TODAY)).toBe(2);
  });
  it('resets across gaps', () => {
    const idx = idxOf({ item_id: 'a', date: '2026-06-01' }, { item_id: 'a', date: TODAY });
    expect(itemLongestStreak(A, idx, TODAY)).toBe(1);
  });
});

describe('itemCompletion', () => {
  it('excludes today; rounds done/total', () => {
    const A = item({ id: 'a', start_date: '2026-06-01' });
    const idx = idxOf({ item_id: 'a', date: '2026-06-01' }); // 06-01 done, 06-02 not, today excluded
    expect(itemCompletion(A, idx, TODAY)).toBe(50); // 1 of {06-01, 06-02}
  });
  it('brand-new (started today) -> null, not 0%/NaN', () => {
    const A = item({ id: 'a', start_date: TODAY });
    expect(itemCompletion(A, makeLogIndex([]), TODAY)).toBe(null);
  });
  it('archived window uses archive_date-1', () => {
    const arch = item({ id: 'a', start_date: '2026-06-01', status: 'archived', archive_date: '2026-06-03' });
    const idx = idxOf({ item_id: 'a', date: '2026-06-01' }, { item_id: 'a', date: '2026-06-02' });
    expect(itemCompletion(arch, idx, TODAY)).toBe(100);
  });
});

describe('itemTotalDone', () => {
  it('counts only completed logs for the item', () => {
    const logs = [
      { id: '1', item_id: 'a', date: '2026-06-01', is_completed: true },
      { id: '2', item_id: 'a', date: '2026-06-02', is_completed: false },
      { id: '3', item_id: 'b', date: '2026-06-01', is_completed: true },
    ];
    expect(itemTotalDone(item({ id: 'a' }), logs)).toBe(1);
  });
});

describe('fullComboStreak', () => {
  const A = item({ id: 'a', start_date: '2026-05-01' });
  const B = item({ id: 'b', start_date: '2026-05-01' });
  it('counts consecutive all-100% days; today pending skipped', () => {
    const idx = idxOf(
      { item_id: 'a', date: '2026-06-01' }, { item_id: 'b', date: '2026-06-01' },
      { item_id: 'a', date: '2026-06-02' }, { item_id: 'b', date: '2026-06-02' },
      { item_id: 'a', date: TODAY }, // today only A -> 50%, not counted, not broken
    );
    expect(fullComboStreak([A, B], idx, TODAY)).toBe(2);
  });
  it('today 100% counts', () => {
    const idx = idxOf(
      { item_id: 'a', date: '2026-06-02' }, { item_id: 'b', date: '2026-06-02' },
      { item_id: 'a', date: TODAY }, { item_id: 'b', date: TODAY },
    );
    expect(fullComboStreak([A, B], idx, TODAY)).toBe(2); // today + 06-02; 06-01 is 0% -> break
  });
  it('no-tracking days are skipped, not breaking', () => {
    // A active only on 06-01 (archived 06-02); B starts today.
    const a = item({ id: 'a', start_date: '2026-06-01', status: 'archived', archive_date: '2026-06-02' });
    const b = item({ id: 'b', start_date: TODAY });
    const idx = idxOf({ item_id: 'a', date: '2026-06-01' }, { item_id: 'b', date: TODAY });
    // today: B only, done -> 100% (streak 1); 06-02: no items -> skip; 06-01: A done -> 100% (streak 2)
    expect(fullComboStreak([a, b], idx, TODAY)).toBe(2);
  });
  it('no items -> 0', () => {
    expect(fullComboStreak([], makeLogIndex([]), TODAY)).toBe(0);
  });
});
