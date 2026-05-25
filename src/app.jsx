// app.jsx — Main shell: state, tabs, modals, onboarding.

import React from 'react';
import {
  levelFromXP, TODAY_ISO, parseISO, dayDiff, isoDate, addDays, nextDueFor,
  SAMPLE_HABITS, SAMPLE_CHORES, SAMPLE_ACHIEVEMENTS,
  SAMPLE_QUESTS_DAILY, SAMPLE_QUESTS_WEEKLY,
} from './data.jsx';
import { IOSDevice } from './iosFrame.jsx';
import { Confetti } from './pixel.jsx';
import {
  TodayScreen, HabitsListScreen, HabitDetailScreen,
  ChoresListScreen, ChoreDetailScreen, CharacterScreen, BottomTabBar,
} from './screens.jsx';
import {
  OnboardingScreen, AddItemModal, AchievementModal,
  LevelUpModal, PerfectDayModal, UndoToast,
} from './modals.jsx';

// Default app configuration (was wired to the Claude Design "Tweaks" panel in the
// prototype; here it is just the app's fixed defaults).
const TWEAK_DEFAULTS = {
  todayLayout: 'hybrid',
  palette: 'warm',
  decayDrama: 20,
  appName: 'Pixie',
  showOnboarding: false,
  scanlines: true,
};

// A lightweight stand-in for the prototype's useTweaks (drops the design-host
// postMessage protocol — keeps a simple local config the UI can update).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
  }, []);
  return [values, setTweak];
}

// Palette presets — affect the wall + accent tokens
const PALETTES = {
  warm:  { bg: '#f0e2c0', paper: '#fbf3df', accent: '#d96f47', wall: '#f4dca0', subtitle: 'warm cozy · terracotta' },
  cool:  { bg: '#dce7e5', paper: '#f3f9f7', accent: '#4d8aa0', wall: '#c8dfd8', subtitle: 'cool calm · slate teal' },
  pastel:{ bg: '#f0dcec', paper: '#fbe9f3', accent: '#d97a8f', wall: '#f5d0dc', subtitle: 'soft pastel · rose lilac' },
  sun:   { bg: '#fde7a8', paper: '#fff5cc', accent: '#e89020', wall: '#f4d875', subtitle: 'playful · sunny coral' },
  night: { bg: '#2b2540', paper: '#3a3158', accent: '#e5a93a', wall: '#3a3158', subtitle: 'dark cozy · amber on night' },
};

function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.warm;
  const root = document.documentElement;
  root.style.setProperty('--bg', p.bg);
  root.style.setProperty('--paper', p.paper);
  root.style.setProperty('--accent', p.accent);
  root.style.setProperty('--wall', p.wall);
  if (name === 'night') {
    root.style.setProperty('--ink', '#fbf3df');
    root.style.setProperty('--ink-soft', '#c9b683');
    root.style.setProperty('--paper-deep', '#2e2745');
    root.style.setProperty('--bg-deep', '#231d35');
  } else {
    root.style.setProperty('--ink', '#2a1d12');
    root.style.setProperty('--ink-soft', '#5d4632');
    root.style.setProperty('--paper-deep', '#f5e9c8');
    root.style.setProperty('--bg-deep', '#e6d4a8');
  }
}

// ─────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────
function initialState() {
  return {
    profile: {
      name: 'Wei',
      timezone: 'Asia/Taipei',
      level: 4,
      xp: 880,           // levelFromXP(880) = 4, next at 1250
      coins: 142,
      reminderEnabled: true,
      reminderTime: '07:00',
      pushEnabled: false,
    },
    habits: SAMPLE_HABITS,
    chores: SAMPLE_CHORES,
    completedChoreIds: new Set(),  // chores completed today
    achievements: SAMPLE_ACHIEVEMENTS,
    questsDaily: SAMPLE_QUESTS_DAILY,
    questsWeekly: SAMPLE_QUESTS_WEEKLY,
    hairTier: 1,   // slightly shaggy
    messTier: 2,   // some clutter (overdue cleaning)
    pendingAchievement: null,
    pendingLevelUp: null,
    pendingPerfectDay: false,
    confetti: false,
    activeCheck: null,  // id of just-checked item for animation
    undoToast: null,    // { id, label, ts } — chore just completed
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_HABIT': {
      const habits = state.habits.map(h => {
        if (h.id !== action.id) return h;
        const wasDone = h.completions.has(TODAY_ISO);
        const next = new Set(h.completions);
        if (wasDone) next.delete(TODAY_ISO);
        else next.add(TODAY_ISO);
        return {
          ...h,
          completions: next,
          streak: wasDone ? Math.max(0, h.streak - 1) : h.streak + 1,
          totalCompletions: wasDone ? h.totalCompletions - 1 : h.totalCompletions + 1,
        };
      });
      // XP delta
      const habit = state.habits.find(h => h.id === action.id);
      const wasDone = habit.completions.has(TODAY_ISO);
      const xpDelta = wasDone ? -10 : 10;
      const newXP = Math.max(0, state.profile.xp + xpDelta);
      const oldLevel = state.profile.level;
      const newLevel = levelFromXP(newXP);
      // shrink hair tier on check (toward 0); grow toward 3 on uncheck
      const newHair = wasDone ? Math.min(3, state.hairTier + 0.34) : Math.max(0, state.hairTier - 0.5);
      // bump daily quest "2 habits"
      const questsDaily = state.questsDaily.map(q => {
        if (q.id === 'q-2habits') {
          const delta = wasDone ? -1 : 1;
          return { ...q, progress: Math.max(0, q.progress + delta) };
        }
        return q;
      });
      return {
        ...state,
        habits,
        profile: { ...state.profile, xp: newXP, level: newLevel },
        hairTier: Math.round(newHair * 10) / 10,
        pendingLevelUp: newLevel > oldLevel ? newLevel : state.pendingLevelUp,
        questsDaily,
        confetti: !wasDone && state.confetti ? state.confetti : (!wasDone && Math.random() < 0.2),
        activeCheck: !wasDone ? action.id : null,
      };
    }

    case 'EDIT_COMPLETION': {
      // Edit a specific completion entry on a chore (change date or delete).
      // action: { id, oldISO, newISO } — newISO null/undefined = delete
      const { id, oldISO, newISO } = action;
      const chores = state.chores.map(c => {
        if (c.id !== id) return c;
        // Remove oldISO from last3, insert newISO if provided, keep sorted desc, max 3
        const filtered = c.last3.filter(iso => iso !== oldISO);
        const updated = newISO ? [newISO, ...filtered] : filtered;
        // sort descending (most recent first)
        updated.sort((a, b) => (a < b ? 1 : -1));
        const trimmed = updated.slice(0, 3);

        // Recompute lastCompleted as the newest entry
        const lastCompleted = trimmed[0] || null;

        // For an edit (oldISO exists, newISO provided), total stays the same.
        // For a delete (newISO null), total decreases by 1.
        const totalCompletions = newISO
          ? c.totalCompletions
          : Math.max(0, c.totalCompletions - 1);

        // Recompute nextDue from the new lastCompleted (or today if none)
        const fromDate = lastCompleted ? parseISO(lastCompleted) : new Date();
        const nextDue = nextDueFor(c, fromDate);

        return {
          ...c,
          last3: trimmed,
          lastCompleted,
          totalCompletions,
          nextDue,
        };
      });

      // If we deleted today's entry, also clear it from completedChoreIds
      const next = new Set(state.completedChoreIds);
      const todayDeleted = !newISO && oldISO === TODAY_ISO;
      if (todayDeleted) next.delete(id);

      return { ...state, chores, completedChoreIds: next };
    }

    case 'COMPLETE_CHORE': {
      const id = action.id;
      // One-way commit. Re-tapping after already-done is a no-op
      // (user can edit/delete the entry from the completion list instead).
      if (state.completedChoreIds.has(id)) return state;

      const next = new Set(state.completedChoreIds);
      next.add(id);

      const chore = state.chores.find(c => c.id === id);
      const due = parseISO(chore.nextDue);
      const overdue = dayDiff(due, new Date()) < 0;
      const xpGain = overdue ? 22 : 15;
      const newXP = state.profile.xp + xpGain;
      const oldLevel = state.profile.level;
      const newLevel = levelFromXP(newXP);

      const newMess = Math.max(0, state.messTier - 0.6);

      const questsDaily = state.questsDaily.map(q => {
        if (q.id === 'q-1chore') {
          return { ...q, progress: Math.min(q.target, q.progress + 1) };
        }
        return q;
      });

      const chores = state.chores.map(c => {
        if (c.id !== id) return c;
        const newLast3 = [TODAY_ISO, ...c.last3].slice(0, 3);
        return {
          ...c,
          last3: newLast3,
          lastCompleted: TODAY_ISO,
          nextDue: nextDueFor(c, new Date()),
          totalCompletions: c.totalCompletions + 1,
        };
      });

      return {
        ...state,
        completedChoreIds: next,
        chores,
        profile: { ...state.profile, xp: newXP, level: newLevel, coins: state.profile.coins + 3 },
        messTier: Math.round(newMess * 10) / 10,
        pendingLevelUp: newLevel > oldLevel ? newLevel : state.pendingLevelUp,
        questsDaily,
        activeCheck: id,
        undoToast: { id, label: chore.name, action: 'COMPLETE_CHORE', ts: Date.now() },
      };
    }

    case 'UNDO_LAST_CHORE': {
      // Pops today's entry from a chore's last3, restores nextDue, refunds XP/coins.
      const id = action.id;
      if (!state.completedChoreIds.has(id)) return state;

      const next = new Set(state.completedChoreIds);
      next.delete(id);

      const chore = state.chores.find(c => c.id === id);
      const overdue = dayDiff(parseISO(chore._prevNextDue || chore.nextDue), new Date()) < 0;
      const xpRefund = overdue ? 22 : 15;
      const newXP = Math.max(0, state.profile.xp - xpRefund);
      const newLevel = levelFromXP(newXP);

      const chores = state.chores.map(c => {
        if (c.id !== id) return c;
        const filtered = c.last3.filter(iso => iso !== TODAY_ISO);
        const fromDate = filtered[0] ? parseISO(filtered[0]) : new Date();
        return {
          ...c,
          last3: filtered,
          lastCompleted: filtered[0] || null,
          nextDue: nextDueFor(c, fromDate),
          totalCompletions: Math.max(0, c.totalCompletions - 1),
        };
      });

      const questsDaily = state.questsDaily.map(q =>
        q.id === 'q-1chore' ? { ...q, progress: Math.max(0, q.progress - 1) } : q);

      return {
        ...state,
        completedChoreIds: next,
        chores,
        profile: { ...state.profile, xp: newXP, level: newLevel, coins: Math.max(0, state.profile.coins - 3) },
        messTier: Math.min(3, state.messTier + 0.6),
        questsDaily,
        undoToast: null,
      };
    }

    case 'DISMISS_UNDO':
      return { ...state, undoToast: null };

    case 'ADD_HABIT': {
      const f = action.form;
      const id = 'h-' + Date.now();
      const newHabit = {
        id, name: f.name, nameEn: '',
        emoji: f.emoji, color: f.color,
        schedule: f.schedule, weekdays: f.weekdays,
        reminderTime: f.reminderTime || null,
        streak: 0, longestStreak: 0, totalCompletions: 0,
        completions: new Set(),
      };
      // unlock first-habit achievement if not yet
      let achievements = state.achievements;
      let pendingAchievement = state.pendingAchievement;
      const first = achievements.find(a => a.id === 'first_habit');
      if (!first.unlocked) {
        achievements = achievements.map(a => a.id === 'first_habit'
          ? { ...a, unlocked: true, unlockedAt: TODAY_ISO } : a);
        pendingAchievement = { ...first, unlocked: true };
      }
      return { ...state, habits: [...state.habits, newHabit], achievements, pendingAchievement };
    }

    case 'ADD_CHORE': {
      const f = action.form;
      const id = 'c-' + Date.now();
      const nextDue = f.frequency === 'daily'
        ? isoDate(addDays(new Date(), f.interval))
        : f.frequency === 'weekly'
          ? isoDate(addDays(new Date(), 7))
          : isoDate(addDays(new Date(), 30));
      const newChore = {
        id, name: f.name, nameEn: '',
        emoji: f.emoji, notes: f.notes,
        frequency: f.frequency, interval: f.interval,
        weekdays: f.weekdays, dayOfMonth: f.dayOfMonth,
        nextDue, lastCompleted: null, last3: [],
        totalCompletions: 0, overdue: false,
      };
      return { ...state, chores: [...state.chores, newChore] };
    }

    case 'CLEAR_CHECK_ANIM':
      return { ...state, activeCheck: null };
    case 'CLEAR_CONFETTI':
      return { ...state, confetti: false };
    case 'DISMISS_ACHIEVEMENT':
      return { ...state, pendingAchievement: null };
    case 'DISMISS_LEVELUP':
      return { ...state, pendingLevelUp: null };
    case 'DISMISS_PERFECT':
      return { ...state, pendingPerfectDay: false };
    case 'TRIGGER_PERFECT':
      return { ...state, pendingPerfectDay: true, confetti: true };
    case 'SET_DECAY':
      return { ...state, hairTier: action.hair, messTier: action.mess };
    case 'TRIGGER_ACHIEVEMENT':
      return { ...state, pendingAchievement: state.achievements.find(a => a.id === action.id) };
    case 'RESET':
      return initialState();
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [state, dispatch] = React.useReducer(reducer, undefined, initialState);
  const [tab, setTab] = React.useState('today');
  const [habitDetailId, setHabitDetailId] = React.useState(null);
  const [choreDetailId, setChoreDetailId] = React.useState(null);
  const [addModal, setAddModal] = React.useState(null);   // 'habit' | 'chore' | null
  const [showOnboarding, setShowOnboarding] = React.useState(tweaks.showOnboarding);

  // Apply palette when tweak changes
  React.useEffect(() => { applyPalette(tweaks.palette); }, [tweaks.palette]);

  // Sync onboarding from tweak (replay button)
  React.useEffect(() => {
    if (tweaks.showOnboarding) setShowOnboarding(true);
  }, [tweaks.showOnboarding]);

  // Map decayDrama tweak (0-100) to base hairTier/messTier amplification
  React.useEffect(() => {
    const k = tweaks.decayDrama / 100;
    // baseline 1.0/2.0; scale toward 0 or 3 based on slider
    const hair = 1 + (k - 0.2) * 2;
    const mess = 2 + (k - 0.2) * 1.5;
    dispatch({ type: 'SET_DECAY',
      hair: Math.max(0, Math.min(3, hair)),
      mess: Math.max(0, Math.min(3, mess)),
    });
  }, [tweaks.decayDrama]);

  // Clear check anim after a beat
  React.useEffect(() => {
    if (state.activeCheck) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_CHECK_ANIM' }), 700);
      return () => clearTimeout(t);
    }
  }, [state.activeCheck]);

  // Clear confetti
  React.useEffect(() => {
    if (state.confetti) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_CONFETTI' }), 2800);
      return () => clearTimeout(t);
    }
  }, [state.confetti]);

  // Render screen based on tab + detail state
  const renderScreen = () => {
    if (tab === 'today') {
      return <TodayScreen state={state} dispatch={dispatch} layout={tweaks.todayLayout} />;
    }
    if (tab === 'habits') {
      if (habitDetailId) {
        const h = state.habits.find(x => x.id === habitDetailId);
        return <HabitDetailScreen
          habit={h} state={state} dispatch={dispatch}
          onBack={() => setHabitDetailId(null)}
          onEdit={() => {}}/>;
      }
      return <HabitsListScreen
        state={state} dispatch={dispatch}
        onSelect={setHabitDetailId}
        onAdd={() => setAddModal('habit')}/>;
    }
    if (tab === 'chores') {
      if (choreDetailId) {
        const c = state.chores.find(x => x.id === choreDetailId);
        return <ChoreDetailScreen
          chore={c} state={state} dispatch={dispatch}
          onBack={() => setChoreDetailId(null)}
          onEdit={() => {}}/>;
      }
      return <ChoresListScreen
        state={state} dispatch={dispatch}
        onSelect={setChoreDetailId}
        onAdd={() => setAddModal('chore')}/>;
    }
    if (tab === 'character') {
      return <CharacterScreen state={state} dispatch={dispatch} onSignOut={() => setShowOnboarding(true)}/>;
    }
  };

  const phoneInner = (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {tweaks.scanlines && (
        <div className="scanlines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 80 }} />
      )}

      {showOnboarding ? (
        <OnboardingScreen onFinish={({ name, firstHabit }) => {
          setShowOnboarding(false);
          if (tweaks.showOnboarding) setTweak('showOnboarding', false);
          // Add as habit; will trigger achievement if not already
          dispatch({ type: 'ADD_HABIT', form: {
            name: firstHabit.name,
            emoji: firstHabit.emoji,
            color: '#6a9c4a',
            schedule: firstHabit.schedule || 'daily',
            weekdays: firstHabit.schedule === 'weekdays' ? [1,2,3,4,5] : [0,1,2,3,4,5,6],
            reminderTime: '',
          }});
        }}/>
      ) : (
        <>
          {renderScreen()}
          <BottomTabBar active={tab} onChange={(t) => {
            setTab(t);
            setHabitDetailId(null);
            setChoreDetailId(null);
          }}/>
        </>
      )}

      {/* Confetti overlay */}
      <Confetti show={state.confetti} />

      {/* Modals */}
      {state.undoToast && (
        <UndoToast
          toast={state.undoToast}
          onUndo={(id) => dispatch({ type: 'UNDO_LAST_CHORE', id })}
          onDismiss={() => dispatch({ type: 'DISMISS_UNDO' })}
        />
      )}
      {addModal && (
        <AddItemModal
          kind={addModal}
          onClose={() => setAddModal(null)}
          onSave={(form) => {
            dispatch({ type: addModal === 'habit' ? 'ADD_HABIT' : 'ADD_CHORE', form });
            setAddModal(null);
          }}/>
      )}
      {state.pendingAchievement && (
        <AchievementModal achievement={state.pendingAchievement} onClose={() => dispatch({ type: 'DISMISS_ACHIEVEMENT' })} />
      )}
      {state.pendingLevelUp && (
        <LevelUpModal level={state.pendingLevelUp} onClose={() => dispatch({ type: 'DISMISS_LEVELUP' })} />
      )}
      {state.pendingPerfectDay && (
        <PerfectDayModal onClose={() => dispatch({ type: 'DISMISS_PERFECT' })} />
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      {/* Title banner above the phone */}
      <div style={{
        textAlign: 'center', marginBottom: 20,
        fontFamily: 'var(--font-display)', color: '#5d4632',
        letterSpacing: '0.06em',
      }}>
        <div style={{ fontSize: 22, color: '#2a1d12' }}>
          {tweaks.appName.toUpperCase()} · DAILY
        </div>
        <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
          {PALETTES[tweaks.palette].subtitle} · pixel-art habit + chore tracker
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <IOSDevice width={402} height={874} dark={tweaks.palette === 'night'}>
          {phoneInner}
        </IOSDevice>
      </div>
    </div>
  );
}

export { App };
