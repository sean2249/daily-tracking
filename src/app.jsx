// app.jsx — Main shell: auth session, data loading, async action routing.

import React from 'react';
import { supabase } from './lib/supabase.js';
import * as db from './lib/db.js';
import { isoDate } from './data.jsx';
import { IOSDevice } from './iosFrame.jsx';
import { Confetti } from './pixel.jsx';
import {
  TodayScreen, HabitsListScreen, HabitDetailScreen,
  ChoresListScreen, ChoreDetailScreen, CharacterScreen, BottomTabBar,
} from './screens.jsx';
import {
  AddItemModal, AchievementModal, LevelUpModal, PerfectDayModal, UndoToast,
} from './modals.jsx';
import { AuthScreen } from './screens/Auth.jsx';

const todayISO = () => isoDate(new Date());

// Fixed app config (the prototype's Tweaks panel is gone; these are the defaults).
const TWEAKS = { todayLayout: 'hybrid', palette: 'warm', appName: 'Pixie', scanlines: true };

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
  root.style.setProperty('--ink', '#2a1d12');
  root.style.setProperty('--ink-soft', '#5d4632');
  root.style.setProperty('--paper-deep', '#f5e9c8');
  root.style.setProperty('--bg-deep', '#e6d4a8');
}

// Simple full-phone status view (loading / error)
function CenterView({ title, subtitle, action }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32,
      background: 'var(--bg)', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)' }}>{title}</div>
      {subtitle && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{subtitle}</div>}
      {action}
    </div>
  );
}

function App() {
  React.useEffect(() => { applyPalette(TWEAKS.palette); }, []);

  // auth session: undefined = checking, null = signed out, object = signed in
  const [session, setSession] = React.useState(undefined);
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // loaded app data from the database
  const [data, setData] = React.useState(null);
  const [loadError, setLoadError] = React.useState(null);

  // ephemeral UI state
  const [tab, setTab] = React.useState('today');
  const [habitDetailId, setHabitDetailId] = React.useState(null);
  const [choreDetailId, setChoreDetailId] = React.useState(null);
  const [addModal, setAddModal] = React.useState(null);
  const [pendingAchievement, setPendingAchievement] = React.useState(null);
  const [pendingLevelUp, setPendingLevelUp] = React.useState(null);
  const [pendingPerfectDay, setPendingPerfectDay] = React.useState(false);
  const [confetti, setConfetti] = React.useState(false);
  const [activeCheck, setActiveCheck] = React.useState(null);
  const [undoToast, setUndoToast] = React.useState(null);

  // load data whenever the signed-in user changes
  React.useEffect(() => {
    let cancelled = false;
    if (session) {
      setData(null); setLoadError(null);
      db.getState()
        .then(s => { if (!cancelled) setData(s); })
        .catch(e => { if (!cancelled) setLoadError(e?.message || String(e)); });
    } else {
      setData(null);
    }
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  React.useEffect(() => {
    if (activeCheck) { const t = setTimeout(() => setActiveCheck(null), 700); return () => clearTimeout(t); }
  }, [activeCheck]);
  React.useEffect(() => {
    if (confetti) { const t = setTimeout(() => setConfetti(false), 2800); return () => clearTimeout(t); }
  }, [confetti]);

  const applyResult = (res) => {
    if (res && res.state) setData(res.state);
    if (res && res.leveledUp) setPendingLevelUp(res.leveledUp);
    if (res && res.newAchievements && res.newAchievements.length) setPendingAchievement(res.newAchievements[0]);
  };

  const dispatch = async (action) => {
    try {
      switch (action.type) {
        case 'TOGGLE_HABIT': {
          setActiveCheck(action.id);
          const habit = data && data.habits.find(h => h.id === action.id);
          const wasDone = habit && habit.completions.has(todayISO());
          const res = await db.toggleHabit(action.id);
          applyResult(res);
          if (!wasDone && Math.random() < 0.2) setConfetti(true);
          break;
        }
        case 'COMPLETE_CHORE': {
          setActiveCheck(action.id);
          const res = await db.completeChore(action.id);
          applyResult(res);
          if (res.undo) setUndoToast({ ...res.undo, ts: Date.now() });
          break;
        }
        case 'UNDO_LAST_CHORE': { setUndoToast(null); applyResult(await db.undoChore(action.id)); break; }
        case 'EDIT_COMPLETION': { applyResult(await db.editChoreCompletion(action.id, action.oldISO, action.newISO)); break; }
        case 'ADD_HABIT': { applyResult(await db.addHabit(action.form)); break; }
        case 'ADD_CHORE': { applyResult(await db.addChore(action.form)); break; }
        case 'DELETE_HABIT': { applyResult(await db.deleteHabit(action.id)); setHabitDetailId(null); break; }
        case 'DELETE_CHORE': { applyResult(await db.deleteChore(action.id)); setChoreDetailId(null); break; }
        case 'CLEAR_CHECK_ANIM': setActiveCheck(null); break;
        case 'CLEAR_CONFETTI': setConfetti(false); break;
        case 'DISMISS_ACHIEVEMENT': setPendingAchievement(null); break;
        case 'DISMISS_LEVELUP': setPendingLevelUp(null); break;
        case 'DISMISS_PERFECT': setPendingPerfectDay(false); break;
        case 'TRIGGER_PERFECT': setPendingPerfectDay(true); setConfetti(true); break;
        default: break;
      }
    } catch (e) {
      console.error('action failed', action, e);
      setLoadError(e?.message || String(e));
    }
  };

  const renderScreen = (screenState) => {
    if (tab === 'today') {
      return <TodayScreen state={screenState} dispatch={dispatch} layout={TWEAKS.todayLayout} />;
    }
    if (tab === 'habits') {
      if (habitDetailId) {
        const h = screenState.habits.find(x => x.id === habitDetailId);
        if (!h) { setHabitDetailId(null); return null; }
        return <HabitDetailScreen habit={h} state={screenState} dispatch={dispatch}
          onBack={() => setHabitDetailId(null)} onEdit={() => {}} />;
      }
      return <HabitsListScreen state={screenState} dispatch={dispatch}
        onSelect={setHabitDetailId} onAdd={() => setAddModal('habit')} />;
    }
    if (tab === 'chores') {
      if (choreDetailId) {
        const c = screenState.chores.find(x => x.id === choreDetailId);
        if (!c) { setChoreDetailId(null); return null; }
        return <ChoreDetailScreen chore={c} state={screenState} dispatch={dispatch}
          onBack={() => setChoreDetailId(null)} onEdit={() => {}} />;
      }
      return <ChoresListScreen state={screenState} dispatch={dispatch}
        onSelect={setChoreDetailId} onAdd={() => setAddModal('chore')} />;
    }
    if (tab === 'character') {
      return <CharacterScreen state={screenState} dispatch={dispatch}
        onSignOut={() => supabase.auth.signOut()} />;
    }
    return null;
  };

  // Decide the phone body
  let body;
  if (session === undefined) {
    body = <CenterView title="···" subtitle="Waking Pixie up…" />;
  } else if (!session) {
    body = <AuthScreen />;
  } else if (loadError) {
    body = <CenterView
      title="Couldn't load your data"
      subtitle={loadError}
      action={<button className="px-btn" style={{ marginTop: 6 }}
        onClick={() => { setLoadError(null); db.getState().then(setData).catch(e => setLoadError(e?.message || String(e))); }}>
        RETRY
      </button>} />;
  } else if (!data) {
    body = <CenterView title="LOADING" subtitle="Tidying your room…" />;
  } else {
    const screenState = { ...data, activeCheck };
    body = (
      <>
        {renderScreen(screenState)}
        <BottomTabBar active={tab} onChange={(t) => { setTab(t); setHabitDetailId(null); setChoreDetailId(null); }} />

        <Confetti show={confetti} />

        {undoToast && (
          <UndoToast toast={undoToast}
            onUndo={(id) => dispatch({ type: 'UNDO_LAST_CHORE', id })}
            onDismiss={() => setUndoToast(null)} />
        )}
        {addModal && (
          <AddItemModal kind={addModal}
            onClose={() => setAddModal(null)}
            onSave={(form) => { setAddModal(null); dispatch({ type: addModal === 'habit' ? 'ADD_HABIT' : 'ADD_CHORE', form }); }} />
        )}
        {pendingAchievement && (
          <AchievementModal achievement={pendingAchievement} onClose={() => setPendingAchievement(null)} />
        )}
        {pendingLevelUp && (
          <LevelUpModal level={pendingLevelUp} onClose={() => setPendingLevelUp(null)} />
        )}
        {pendingPerfectDay && (
          <PerfectDayModal onClose={() => setPendingPerfectDay(false)} />
        )}
      </>
    );
  }

  const phoneInner = (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {TWEAKS.scanlines && (
        <div className="scanlines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 80 }} />
      )}
      {body}
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        textAlign: 'center', marginBottom: 20,
        fontFamily: 'var(--font-display)', color: '#5d4632', letterSpacing: '0.06em',
      }}>
        <div style={{ fontSize: 22, color: '#2a1d12' }}>{TWEAKS.appName.toUpperCase()} · DAILY</div>
        <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
          {PALETTES[TWEAKS.palette].subtitle} · pixel-art habit + chore tracker
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <IOSDevice width={402} height={874} dark={false}>
          {phoneInner}
        </IOSDevice>
      </div>
    </div>
  );
}

export { App };
