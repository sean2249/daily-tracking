// app.jsx — shell: auth session, data load, navigation stack, and all
// create/edit/archive/restore/delete flows with optimistic writes + toast/undo.

import React from 'react';
import { supabase } from './lib/supabase.js';
import * as db from './lib/db.js';
import { AuthScreen } from './screens/Auth.jsx';
import { todayYMD, activeItemsOn } from './data.jsx';
import { TodayBoard, CalendarPage, DetailPage } from './pages.jsx';
import { ItemSheet, ConfirmDialog, Toast } from './ui.jsx';
import { AddIcon } from './icons.jsx';

const MAX_ACTIVE = 7;

// Fixed shipping theme (the prototype's Tweaks panel is gone). Tokens are baked
// into styles.css :root; this only drives the per-screen layout variants.
const THEME = { palette: 'green', todayLayout: 'minimal', checkFeel: 'crisp', calDensity: 'cozy', detailHero: 'big' };

function newId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id_' + Math.random().toString(36).slice(2, 12);
}

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return <pre style={{ padding: 40, color: '#b00', fontSize: 12, whiteSpace: 'pre-wrap' }}>{String((this.state.err && this.state.err.stack) || this.state.err)}</pre>;
    }
    return this.props.children;
  }
}

function CenterSplash({ text }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontFamily: 'var(--font)', fontSize: 14 }}>
      {text}
    </div>
  );
}

export function App() {
  const today = todayYMD();

  // auth: undefined = checking, null = signed out, object = signed in
  const [session, setSession] = React.useState(undefined);

  // working data + its async load state
  const [state, setState] = React.useState({ items: [], logs: [] });
  const [dataState, setDataState] = React.useState('loading'); // 'loading' | 'live' | 'error'
  const stateRef = React.useRef(state);
  React.useEffect(() => { stateRef.current = state; }, [state]);

  // navigation stack
  const [stack, setStack] = React.useState([{ p: 'today' }]);
  const cur = stack[stack.length - 1];
  const push = (p, params) => setStack((s) => [...s, { p, ...params }]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const goToday = () => setStack([{ p: 'today' }]);

  // ephemeral UI
  const [expanded, setExpanded] = React.useState(() => new Set([today]));
  const [flashId, setFlashId] = React.useState(null);
  const [sheet, setSheet] = React.useState({ open: false, mode: 'create', itemId: null, name: '', type: 'habits' });
  const [confirm, setConfirm] = React.useState({ open: false });
  const [toast, setToast] = React.useState(null);
  const toastTimer = React.useRef(null);

  // ---- auth subscription ----
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- data load (drives loading -> live / error) ----
  const load = React.useCallback(() => {
    setDataState('loading');
    db.getState()
      .then((s) => { setState(s); setDataState('live'); })
      .catch((e) => { console.error('load failed', e); setDataState('error'); });
  }, []);
  React.useEffect(() => {
    if (session) load();
    else setState({ items: [], logs: [] });
  }, [session?.user?.id]);

  // ---- toast (single slot, 3s) ----
  function showToast(msg, undo) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo, id: Math.random() });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }
  const toastApi = { show: showToast };
  function runUndo() {
    if (toast && toast.undo) toast.undo();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }

  // ---- optimistic mutation: apply locally now, persist in background,
  //      resync from the server + toast if it fails ----
  function commit(applyFn, op, errMsg) {
    setState(applyFn);
    Promise.resolve().then(op).catch((e) => {
      console.error('mutation failed', e);
      showToast(errMsg, null);
      load();
    });
  }

  const api = {
    addItem(name, type) {
      const id = newId();
      const item = { id, name: name.trim(), type, status: 'active', start_date: today, archive_date: null };
      commit((s) => ({ ...s, items: [...s.items, item] }), () => db.addItem(item), "Couldn't add. Try again.");
      return id;
    },
    renameItem(id, name) {
      const nm = name.trim();
      commit((s) => ({ ...s, items: s.items.map((it) => (it.id === id ? { ...it, name: nm } : it)) }), () => db.renameItem(id, nm), "Couldn't save the name.");
    },
    // `desired` is the explicit target completion value, supplied by the caller
    // from the same state read that decides the toast — so the local change and
    // the persisted value can't diverge under rapid toggles.
    toggle(itemId, date, desired) {
      commit(
        (s) => {
          const ex = s.logs.find((l) => l.item_id === itemId && l.date === date);
          const logs = ex
            ? s.logs.map((l) => (l === ex ? { ...l, is_completed: desired } : l))
            : [...s.logs, { id: newId(), item_id: itemId, date, is_completed: desired }];
          return { ...s, logs };
        },
        () => db.toggle(itemId, date, desired),
        "Couldn't save your check-in.",
      );
    },
    archive(id) {
      commit((s) => ({ ...s, items: s.items.map((it) => (it.id === id ? { ...it, status: 'archived', archive_date: today } : it)) }), () => db.archive(id, today), "Couldn't archive.");
    },
    restore(id) {
      commit((s) => ({ ...s, items: s.items.map((it) => (it.id === id ? { ...it, status: 'active', archive_date: null } : it)) }), () => db.restore(id), "Couldn't restore.");
    },
    remove(id) {
      commit((s) => ({ items: s.items.filter((it) => it.id !== id), logs: s.logs.filter((l) => l.item_id !== id) }), () => db.remove(id), "Couldn't delete.");
    },
  };

  const activeCount = state.items.filter((i) => i.status === 'active').length;
  const activeTodayCount = activeItemsOn(state.items, today).length;

  // ---- name uniqueness (active items, case-insensitive) ----
  function nameTaken(name, isEdit) {
    const n = name.trim().toLowerCase();
    const exclude = isEdit ? sheet.itemId : null;
    return state.items.some((it) => it.status === 'active' && it.id !== exclude && it.name.trim().toLowerCase() === n);
  }

  // ---- flows ----
  function requestAdd() {
    if (activeCount >= MAX_ACTIVE) {
      showToast("You've reached the limit of 7 active items. Archive one to add a new challenge.", null);
      return;
    }
    setSheet({ open: true, mode: 'create', itemId: null, name: '', type: 'habits' });
  }
  function onSheetSave(name, type) {
    if (sheet.mode === 'create') {
      const id = api.addItem(name, type);
      setSheet((sh) => ({ ...sh, open: false }));
      setExpanded((e) => new Set(e).add(today));
      goToday();
      setFlashId(id);
      setTimeout(() => setFlashId(null), 1600);
      showToast('Added.', null);
    } else {
      api.renameItem(sheet.itemId, name);
      setSheet((sh) => ({ ...sh, open: false }));
      showToast('Saved.', null);
    }
  }
  function requestEdit(item) {
    if (!item) return;
    setSheet({ open: true, mode: 'edit', itemId: item.id, name: item.name, type: item.type });
  }
  function requestArchive(item) {
    if (!item) return;
    api.archive(item.id);
    goToday();
    showToast('Archived. Find it in the calendar.', () => api.restore(item.id));
  }
  function requestDelete(item) {
    if (!item) return;
    setConfirm({
      open: true, danger: true, confirmLabel: 'Delete',
      title: 'Delete ' + item.name + '?',
      body: "Deleting this removes all its past check-in data permanently. This can't be undone.",
      onConfirm: () => { setConfirm({ open: false }); api.remove(item.id); goToday(); },
    });
  }
  function requestRestore(item) {
    if (!item) return;
    if (activeCount >= MAX_ACTIVE) {
      showToast("You've reached the limit of 7 active items. Archive one before restoring.", null);
      return;
    }
    const n = item.name.trim().toLowerCase();
    if (state.items.some((it) => it.status === 'active' && it.name.trim().toLowerCase() === n)) {
      showToast('An item with this name already exists. Rename before restoring.', null);
      return;
    }
    api.restore(item.id);
    goToday();
    showToast('Restored.', null);
  }

  const showFab = cur.p === 'today' && activeTodayCount > 0;
  const curItem = () => state.items.find((i) => i.id === cur.itemId);

  // ---- body ----
  let body;
  if (session === undefined) {
    body = <CenterSplash text="Loading…" />;
  } else if (!session) {
    body = <AuthScreen />;
  } else {
    body = (
      <React.Fragment>
        <ErrorBoundary>
          {cur.p === 'today' && (
            <TodayBoard state={state} api={api} t={THEME} expanded={expanded} setExpanded={setExpanded}
              flashId={flashId} toast={toastApi} dataState={dataState} onRetry={load}
              onOpenItem={(id) => push('detail', { itemId: id })}
              onOpenCalendar={() => push('calendar')}
              onAddRequest={requestAdd} />
          )}
          {cur.p === 'calendar' && (
            <CalendarPage state={state} t={THEME} onBack={back} dataState={dataState} onRetry={load}
              onOpenItem={(id) => push('detail', { itemId: id })} />
          )}
          {cur.p === 'detail' && (
            <DetailPage itemId={cur.itemId} state={state} t={THEME} onBack={back}
              dataState={dataState} onRetry={load}
              requestEdit={() => requestEdit(curItem())}
              requestArchive={() => requestArchive(curItem())}
              requestDelete={() => requestDelete(curItem())}
              requestRestore={() => requestRestore(curItem())} />
          )}
        </ErrorBoundary>

        {showFab && (
          <button className="fab" aria-label="New challenge" onClick={requestAdd}><AddIcon size={26} /></button>
        )}

        <ItemSheet open={sheet.open} mode={sheet.mode} initialName={sheet.name} initialType={sheet.type}
          nameTaken={nameTaken} onSave={onSheetSave} onClose={() => setSheet((sh) => ({ ...sh, open: false }))} />

        <ConfirmDialog open={confirm.open} title={confirm.title} body={confirm.body}
          confirmLabel={confirm.confirmLabel} danger={confirm.danger}
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm({ open: false })} />

        <Toast toast={toast} onUndo={runUndo} />
      </React.Fragment>
    );
  }

  return (
    <div className="app-root">
      <div className="app-shell">{body}</div>
    </div>
  );
}
