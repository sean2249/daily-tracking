// db.js — Supabase data layer. Maps dt_* rows to the shapes the screens expect,
// and runs each mutation as a read-modify-write (gamification math reused from data.jsx).

import { supabase } from './supabase.js';
import { isoDate, parseISO, dayDiff, levelFromXP, nextDueFor } from '../data.jsx';

const todayISO = () => isoDate(new Date());
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round1 = (n) => Math.round(n * 10) / 10;

// Throw on Supabase errors so the caller (App) can surface a real message,
// instead of letting an undefined `data` blow up later with a confusing error.
function ok({ data, error }) {
  if (error) throw error;
  return data;
}

// chore row -> the shape nextDueFor() expects
function choreShape(c) {
  return { frequency: c.frequency, interval: c.interval_n, weekdays: c.weekdays || [], dayOfMonth: c.day_of_month };
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

async function ensureProfile(user) {
  const { data: prof } = await supabase
    .from('dt_profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (prof) return prof;
  const fallbackName = user.email ? user.email.split('@')[0] : 'You';
  const { data: created, error } = await supabase
    .from('dt_profiles')
    .insert({ user_id: user.id, display_name: fallbackName })
    .select('*').single();
  if (error) throw error;
  return created;
}

// ─────────────────────────────────────────────────────────────
// READ — assemble the full app state
// ─────────────────────────────────────────────────────────────
export async function getState() {
  const user = await currentUser();
  const profile = await ensureProfile(user);

  const [habitsR, hcR, choresR, ccR, defsR, uaR] = await Promise.all([
    supabase.from('dt_habits').select('*').order('sort_order').order('created_at'),
    supabase.from('dt_habit_completions').select('habit_id, completed_date'),
    supabase.from('dt_chores').select('*').order('sort_order').order('created_at'),
    supabase.from('dt_chore_completions').select('chore_id, due_date').order('due_date', { ascending: false }),
    supabase.from('dt_achievement_defs').select('*').order('sort_order'),
    supabase.from('dt_user_achievements').select('achievement_key, unlocked_at'),
  ]);
  for (const r of [habitsR, hcR, choresR, ccR, defsR, uaR]) {
    if (r.error) throw r.error;
  }

  const tISO = todayISO();
  const today = new Date();

  // habit completions -> per-habit Set of iso dates
  const compByHabit = {};
  for (const r of hcR.data) (compByHabit[r.habit_id] ||= new Set()).add(r.completed_date);

  const habits = habitsR.data.map(h => ({
    id: h.id,
    name: h.name,
    nameEn: h.name_en || '',
    emoji: h.emoji,
    color: h.color,
    schedule: h.schedule,
    weekdays: h.weekdays || [],
    reminderTime: h.reminder_time,
    streak: h.streak,
    longestStreak: h.longest_streak,
    totalCompletions: h.total_completions,
    completions: compByHabit[h.id] || new Set(),
  }));

  // chore completions -> per-chore list (desc)
  const compByChore = {};
  for (const r of ccR.data) (compByChore[r.chore_id] ||= []).push(r.due_date);

  const chores = choresR.data.map(c => {
    const overdue = c.next_due ? dayDiff(parseISO(c.next_due), today) < 0 : false;
    return {
      id: c.id,
      name: c.name,
      nameEn: c.name_en || '',
      emoji: c.emoji,
      notes: c.notes || '',
      frequency: c.frequency,
      interval: c.interval_n,
      weekdays: c.weekdays || [],
      dayOfMonth: c.day_of_month,
      nextDue: c.next_due,
      lastCompleted: c.last_completed_date,
      last3: (compByChore[c.id] || []).slice(0, 3),
      totalCompletions: c.total_completions,
      overdue,
    };
  });

  const completedChoreIds = new Set(
    choresR.data.filter(c => (compByChore[c.id] || []).includes(tISO)).map(c => c.id)
  );

  const unlockedAt = {};
  for (const r of uaR.data) unlockedAt[r.achievement_key] = r.unlocked_at;
  const achievements = defsR.data.map(d => ({
    id: d.key, title: d.title, desc: d.description, emoji: d.emoji,
    unlocked: d.key in unlockedAt, unlockedAt: unlockedAt[d.key] || null,
  }));

  const profileOut = {
    name: profile.display_name || (user.email ? user.email.split('@')[0] : 'You'),
    timezone: profile.timezone,
    level: profile.level,
    xp: profile.xp,
    coins: profile.coins,
    reminderEnabled: profile.reminder_enabled,
    reminderTime: profile.reminder_time,
    pushEnabled: profile.push_enabled,
  };

  const hairTier = Number(profile.hair_tier);
  const messTier = Number(profile.mess_tier);

  // derived quests (computed from current data; not persisted in v1)
  const habitsDoneToday = habits.filter(h => h.completions.has(tISO)).length;
  const choresDoneToday = completedChoreIds.size;
  const overdueCount = chores.filter(c => c.overdue).length;
  const dow = today.getDay();
  const weekStart = isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - dow));
  const weekCheckins = hcR.data.filter(r => r.completed_date >= weekStart).length;

  const questsDaily = [
    { id: 'q-2habits', title: 'Check off 2 habits', progress: Math.min(2, habitsDoneToday), target: 2, xp: 25, coins: 5 },
    { id: 'q-1chore', title: 'Finish 1 chore', progress: Math.min(1, choresDoneToday), target: 1, xp: 30, coins: 10 },
    { id: 'q-tidy', title: 'Keep room above 50% tidy', progress: messTier < 2 ? 1 : 0, target: 1, xp: 20, coins: 5 },
  ];
  const questsWeekly = [
    { id: 'wq-checkins', title: '20 habit check-ins this week', progress: Math.min(20, weekCheckins), target: 20, xp: 100, coins: 25 },
    { id: 'wq-overdue', title: 'Zero overdue chores', progress: overdueCount === 0 ? 1 : 0, target: 1, xp: 80, coins: 20 },
  ];

  return { profile: profileOut, habits, chores, completedChoreIds, achievements, questsDaily, questsWeekly, hairTier, messTier };
}

// ─────────────────────────────────────────────────────────────
// Achievements — unlock any newly-met ones; return defs for display
// ─────────────────────────────────────────────────────────────
async function unlockAchievements(checks) {
  const met = [];
  if (checks.firstHabit) met.push('first_habit');
  if ((checks.streak || 0) >= 7) met.push('streak_7');
  if ((checks.streak || 0) >= 30) met.push('streak_30');
  if ((checks.habitTotal || 0) >= 50) met.push('habit_total_50');
  if ((checks.choreTotal || 0) >= 10) met.push('chore_master_10');
  if ((checks.level || 0) >= 5) met.push('level_5');
  if (checks.perfectDay) met.push('perfect_day');
  if (met.length === 0) return [];

  const existing = ok(await supabase
    .from('dt_user_achievements').select('achievement_key').in('achievement_key', met));
  const have = new Set(existing.map(r => r.achievement_key));
  const toAdd = met.filter(k => !have.has(k));
  if (toAdd.length === 0) return [];

  ok(await supabase.from('dt_user_achievements').insert(toAdd.map(k => ({ achievement_key: k }))));
  const defs = ok(await supabase.from('dt_achievement_defs').select('*').in('key', toAdd));
  return defs.map(d => ({ id: d.key, title: d.title, desc: d.description, emoji: d.emoji }));
}

// ─────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────
export async function toggleHabit(habitId, dateISO) {
  const date = dateISO || todayISO();
  const user = await currentUser();
  const habit = ok(await supabase.from('dt_habits').select('*').eq('id', habitId).single());
  const existing = ok(await supabase
    .from('dt_habit_completions').select('id').eq('habit_id', habitId).eq('completed_date', date).maybeSingle());
  const prof = await ensureProfile(user);

  let leveledUp = null;
  let newAchievements = [];

  if (existing) {
    ok(await supabase.from('dt_habit_completions').delete().eq('id', existing.id));
    const streak = Math.max(0, habit.streak - 1);
    const total = Math.max(0, habit.total_completions - 1);
    ok(await supabase.from('dt_habits').update({ streak, total_completions: total }).eq('id', habitId));
    const xp = Math.max(0, prof.xp - 10);
    ok(await supabase.from('dt_profiles').update({
      xp, level: levelFromXP(xp), hair_tier: round1(clamp(Number(prof.hair_tier) + 0.34, 0, 3)),
    }).eq('user_id', user.id));
  } else {
    ok(await supabase.from('dt_habit_completions').insert({ habit_id: habitId, completed_date: date }));
    const streak = habit.streak + 1;
    const longest = Math.max(habit.longest_streak, streak);
    const total = habit.total_completions + 1;
    ok(await supabase.from('dt_habits').update({
      streak, longest_streak: longest, total_completions: total, last_completed_date: date,
    }).eq('id', habitId));
    const xp = prof.xp + 10;
    const level = levelFromXP(xp);
    if (level > prof.level) leveledUp = level;
    ok(await supabase.from('dt_profiles').update({
      xp, level, hair_tier: round1(clamp(Number(prof.hair_tier) - 0.5, 0, 3)),
    }).eq('user_id', user.id));
    newAchievements = await unlockAchievements({ streak, habitTotal: total, level });
  }
  return { state: await getState(), leveledUp, newAchievements };
}

async function pruneChoreCompletions(choreId) {
  const rows = ok(await supabase
    .from('dt_chore_completions').select('id, due_date').eq('chore_id', choreId).order('due_date', { ascending: false }));
  const extra = rows.slice(3).map(r => r.id);
  if (extra.length) ok(await supabase.from('dt_chore_completions').delete().in('id', extra));
}

export async function completeChore(choreId) {
  const date = todayISO();
  const user = await currentUser();
  const chore = ok(await supabase.from('dt_chores').select('*').eq('id', choreId).single());
  const existsToday = ok(await supabase
    .from('dt_chore_completions').select('id').eq('chore_id', choreId).eq('due_date', date).maybeSingle());
  if (existsToday) return { state: await getState() };

  const overdue = chore.next_due ? dayDiff(parseISO(chore.next_due), new Date()) < 0 : false;

  ok(await supabase.from('dt_chore_completions').insert({ chore_id: choreId, due_date: date }));
  await pruneChoreCompletions(choreId);

  const total = chore.total_completions + 1;
  ok(await supabase.from('dt_chores').update({
    total_completions: total, last_completed_date: date, next_due: nextDueFor(choreShape(chore), new Date()),
  }).eq('id', choreId));

  const prof = await ensureProfile(user);
  const xp = prof.xp + (overdue ? 22 : 15);
  const level = levelFromXP(xp);
  const leveledUp = level > prof.level ? level : null;
  ok(await supabase.from('dt_profiles').update({
    xp, level, coins: prof.coins + 3, mess_tier: round1(clamp(Number(prof.mess_tier) - 0.6, 0, 3)),
  }).eq('user_id', user.id));

  const newAchievements = await unlockAchievements({ choreTotal: total, level });
  return { state: await getState(), leveledUp, newAchievements, undo: { id: choreId, label: chore.name } };
}

export async function undoChore(choreId) {
  const date = todayISO();
  const user = await currentUser();
  const existsToday = ok(await supabase
    .from('dt_chore_completions').select('id').eq('chore_id', choreId).eq('due_date', date).maybeSingle());
  if (!existsToday) return { state: await getState() };

  ok(await supabase.from('dt_chore_completions').delete().eq('id', existsToday.id));
  const chore = ok(await supabase.from('dt_chores').select('*').eq('id', choreId).single());
  const comps = ok(await supabase
    .from('dt_chore_completions').select('due_date').eq('chore_id', choreId).order('due_date', { ascending: false }));
  const last = comps && comps[0] ? comps[0].due_date : null;
  ok(await supabase.from('dt_chores').update({
    last_completed_date: last,
    total_completions: Math.max(0, chore.total_completions - 1),
    next_due: nextDueFor(choreShape(chore), last ? parseISO(last) : new Date()),
  }).eq('id', choreId));

  const prof = await ensureProfile(user);
  const xp = Math.max(0, prof.xp - 15);
  ok(await supabase.from('dt_profiles').update({
    xp, level: levelFromXP(xp), coins: Math.max(0, prof.coins - 3),
    mess_tier: round1(clamp(Number(prof.mess_tier) + 0.6, 0, 3)),
  }).eq('user_id', user.id));

  return { state: await getState() };
}

export async function editChoreCompletion(choreId, oldISO, newISO) {
  ok(await supabase.from('dt_chore_completions').delete().eq('chore_id', choreId).eq('due_date', oldISO));
  if (newISO) {
    ok(await supabase.from('dt_chore_completions')
      .upsert({ chore_id: choreId, due_date: newISO }, { onConflict: 'chore_id,due_date' }));
  }
  await pruneChoreCompletions(choreId);

  const chore = ok(await supabase.from('dt_chores').select('*').eq('id', choreId).single());
  const comps = ok(await supabase
    .from('dt_chore_completions').select('due_date').eq('chore_id', choreId).order('due_date', { ascending: false }));
  const last = comps && comps[0] ? comps[0].due_date : null;
  const total = newISO ? chore.total_completions : Math.max(0, chore.total_completions - 1);
  ok(await supabase.from('dt_chores').update({
    last_completed_date: last, total_completions: total,
    next_due: nextDueFor(choreShape(chore), last ? parseISO(last) : new Date()),
  }).eq('id', choreId));

  return { state: await getState() };
}

export async function addHabit(form) {
  const { error } = await supabase.from('dt_habits').insert({
    name: form.name,
    name_en: form.en || form.nameEn || '',
    emoji: form.emoji,
    color: form.color || '#6a9c4a',
    schedule: form.schedule || 'daily',
    weekdays: (form.weekdays && form.weekdays.length) ? form.weekdays : [0, 1, 2, 3, 4, 5, 6],
    reminder_time: form.reminderTime || null,
  });
  if (error) throw error;
  const newAchievements = await unlockAchievements({ firstHabit: true });
  return { state: await getState(), newAchievements };
}

export async function addChore(form) {
  const today = new Date();
  const shape = { frequency: form.frequency, interval: form.interval || 1, weekdays: form.weekdays || [], dayOfMonth: form.dayOfMonth };
  const { error } = await supabase.from('dt_chores').insert({
    name: form.name,
    emoji: form.emoji,
    notes: form.notes || '',
    frequency: form.frequency,
    interval_n: form.interval || 1,
    weekdays: form.weekdays || [],
    day_of_month: form.dayOfMonth || null,
    start_date: isoDate(today),
    next_due: nextDueFor(shape, today),
    reminder_time: form.reminderTime || null,
  });
  if (error) throw error;
  return { state: await getState() };
}

export async function saveSettings(patch) {
  const user = await currentUser();
  const updates = {};
  if (patch.displayName !== undefined) updates.display_name = patch.displayName;
  if (patch.reminderEnabled !== undefined) updates.reminder_enabled = patch.reminderEnabled;
  if (patch.reminderTime !== undefined) updates.reminder_time = patch.reminderTime || null;
  if (patch.pushEnabled !== undefined) updates.push_enabled = patch.pushEnabled;
  if (Object.keys(updates).length) {
    const { error } = await supabase.from('dt_profiles').update(updates).eq('user_id', user.id);
    if (error) throw error;
  }
  return { state: await getState() };
}

export async function deleteHabit(id) {
  ok(await supabase.from('dt_habits').delete().eq('id', id));
  return { state: await getState() };
}

export async function deleteChore(id) {
  ok(await supabase.from('dt_chores').delete().eq('id', id));
  return { state: await getState() };
}
