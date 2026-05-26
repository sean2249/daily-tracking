import { describe, it, expect } from 'vitest';
import {
  isoDate, parseISO, addDays, dayDiff, fmtMonthDay,
  levelFromXP, xpForLevel, nextDueFor,
  isHabitScheduledOn, scheduleSummary, cadenceSummary, chorelDueText,
} from '../../src/data.jsx';

// 2026-01-01 is a Thursday (getDay() === 4). Used as a stable anchor below.
const THU_JAN1 = new Date(2026, 0, 1);

describe('date helpers', () => {
  it('isoDate formats with zero padding', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('parseISO is the inverse of isoDate (local, no TZ shift)', () => {
    const d = parseISO('2026-03-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(15);
    expect(isoDate(parseISO('2026-07-09'))).toBe('2026-07-09');
  });

  it('addDays rolls over month and year boundaries', () => {
    expect(isoDate(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
    expect(isoDate(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    expect(isoDate(addDays(new Date(2026, 0, 10), -1))).toBe('2026-01-09');
  });

  it('dayDiff counts calendar days and ignores time-of-day', () => {
    expect(dayDiff(parseISO('2026-01-10'), parseISO('2026-01-01'))).toBe(9);
    expect(dayDiff(parseISO('2026-01-01'), parseISO('2026-01-10'))).toBe(-9);
    expect(dayDiff(parseISO('2026-01-01'), parseISO('2025-12-31'))).toBe(1);
    expect(dayDiff(new Date(2026, 0, 10, 23, 59), new Date(2026, 0, 1, 0, 1))).toBe(9);
  });

  it('fmtMonthDay drops leading zeros', () => {
    expect(fmtMonthDay(new Date(2026, 0, 5))).toBe('1/5');
    expect(fmtMonthDay(new Date(2026, 11, 25))).toBe('12/25');
  });
});

describe('levelFromXP / xpForLevel', () => {
  it('xpForLevel follows the 50n^2 curve', () => {
    expect(xpForLevel(1)).toBe(50);
    expect(xpForLevel(2)).toBe(200);
    expect(xpForLevel(3)).toBe(450);
    expect(xpForLevel(5)).toBe(1250);
  });

  it('levelFromXP floors at 1 and steps up at each threshold', () => {
    expect(levelFromXP(0)).toBe(1);
    expect(levelFromXP(49)).toBe(1);
    expect(levelFromXP(50)).toBe(1);   // need 50*(n+1)^2 <= xp; 200 > 50 so still level 1
    expect(levelFromXP(199)).toBe(1);
    expect(levelFromXP(200)).toBe(2);
    expect(levelFromXP(449)).toBe(2);
    expect(levelFromXP(450)).toBe(3);
    expect(levelFromXP(1250)).toBe(5);
  });

  it('is consistent: levelFromXP(xpForLevel(n)) === n for n>=2', () => {
    for (const n of [2, 3, 4, 5, 8]) {
      expect(levelFromXP(xpForLevel(n))).toBe(n);
    }
  });
});

describe('nextDueFor', () => {
  it('daily uses the interval in days', () => {
    expect(nextDueFor({ frequency: 'daily', interval: 1 }, THU_JAN1)).toBe('2026-01-02');
    expect(nextDueFor({ frequency: 'daily', interval: 3 }, THU_JAN1)).toBe('2026-01-04');
    // missing interval defaults to 1
    expect(nextDueFor({ frequency: 'daily' }, THU_JAN1)).toBe('2026-01-02');
  });

  it('weekly (interval 1) returns the soonest matching weekday after `from`', () => {
    // from = Thursday. Next Thursday is +7.
    expect(nextDueFor({ frequency: 'weekly', interval: 1, weekdays: [4] }, THU_JAN1)).toBe('2026-01-08');
    // Next Monday after Thu Jan 1 is Jan 5.
    expect(nextDueFor({ frequency: 'weekly', interval: 1, weekdays: [1] }, THU_JAN1)).toBe('2026-01-05');
    // Multiple weekdays -> nearest one (Mon Jan 5 beats Thu Jan 8).
    expect(nextDueFor({ frequency: 'weekly', interval: 1, weekdays: [1, 4] }, THU_JAN1)).toBe('2026-01-05');
  });

  it('weekly with no weekdays falls back to the same weekday next week', () => {
    expect(nextDueFor({ frequency: 'weekly', interval: 1, weekdays: [] }, THU_JAN1)).toBe('2026-01-08');
  });

  it('monthly targets day-of-month, rolling to next month when already due', () => {
    // dayOfMonth 1 == from's date -> roll to next month.
    expect(nextDueFor({ frequency: 'monthly', interval: 1, dayOfMonth: 1 }, THU_JAN1)).toBe('2026-02-01');
    // dayOfMonth 15 is later this month -> stays in January.
    expect(nextDueFor({ frequency: 'monthly', interval: 1, dayOfMonth: 15 }, THU_JAN1)).toBe('2026-01-15');
  });

  it('always returns a date strictly after `from` and on an allowed weekday (weekly)', () => {
    const wds = [2, 5];
    const out = nextDueFor({ frequency: 'weekly', interval: 1, weekdays: wds }, THU_JAN1);
    expect(dayDiff(parseISO(out), THU_JAN1)).toBeGreaterThan(0);
    expect(wds).toContain(parseISO(out).getDay());
  });
});

describe('schedule / cadence summaries', () => {
  it('scheduleSummary covers daily, weekdays, and custom days', () => {
    expect(scheduleSummary({ schedule: 'daily', weekdays: [0,1,2,3,4,5,6] })).toBe('Every day');
    expect(scheduleSummary({ schedule: 'weekdays', weekdays: [1,2,3,4,5] })).toBe('Weekdays');
    expect(scheduleSummary({ schedule: 'custom', weekdays: [1,3,5] })).toBe('Mon Wed Fri');
  });

  it('cadenceSummary covers daily/weekly/monthly with intervals', () => {
    expect(cadenceSummary({ frequency: 'daily', interval: 1 })).toBe('Every day');
    expect(cadenceSummary({ frequency: 'daily', interval: 3 })).toBe('Every 3d');
    expect(cadenceSummary({ frequency: 'weekly', interval: 1, weekdays: [6] })).toBe('Sat');
    expect(cadenceSummary({ frequency: 'weekly', interval: 2, weekdays: [1,4] })).toBe('Every 2w · Mon Thu');
    expect(cadenceSummary({ frequency: 'monthly', dayOfMonth: 1 })).toBe('Monthly · day 1');
  });

  it('isHabitScheduledOn checks the weekday', () => {
    const habit = { weekdays: [1, 3, 5] }; // Mon Wed Fri
    expect(isHabitScheduledOn(habit, new Date(2026, 0, 5))).toBe(true);  // Mon
    expect(isHabitScheduledOn(habit, new Date(2026, 0, 6))).toBe(false); // Tue
  });
});

describe('chorelDueText', () => {
  const today = new Date(2026, 0, 15);
  it('describes overdue / today / tomorrow / soon / far', () => {
    expect(chorelDueText({ nextDue: '2026-01-13' }, today)).toBe('2d overdue');
    expect(chorelDueText({ nextDue: '2026-01-15' }, today)).toBe('Due today');
    expect(chorelDueText({ nextDue: '2026-01-16' }, today)).toBe('Due tomorrow');
    expect(chorelDueText({ nextDue: '2026-01-19' }, today)).toBe('Due in 4d');
    expect(chorelDueText({ nextDue: '2026-02-10' }, today)).toBe('Due 2/10');
  });
});
