// ui.jsx — shared presentational components.
import React from 'react';
import { parseYMD, MON_SHORT } from './data.jsx';
import { HabitIcon, PrincipleIcon, AlertIcon, RestoreIcon } from './icons.jsx';

// ---------- Segmented control ----------
export function Segmented({ value, options, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} role="tab" aria-selected={active}
            className={active ? 'active' : ''}
            onClick={() => onChange(o.value)}
            style={active ? { background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,.1)' } : {}}>
            {o.icon}{o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Create / Edit bottom sheet ----------
export function ItemSheet({ open, mode, initialName, initialType, nameTaken, onSave, onClose }) {
  const [name, setName] = React.useState(initialName || '');
  const [type, setType] = React.useState(initialType || 'habits');
  const [err, setErr] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setName(initialName || ''); setType(initialType || 'habits'); setErr('');
      const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 340);
      return () => clearTimeout(t);
    }
  }, [open]);

  const trimmed = name.trim();
  const over = name.length > 10;
  const canSave = trimmed.length > 0 && !over;

  function submit() {
    if (!canSave) return;
    if (nameTaken(trimmed, mode === 'edit')) {
      setErr('An item with this name already exists.');
      return;
    }
    onSave(trimmed, type);
  }

  return (
    <React.Fragment>
      <div className={'scrim' + (open ? ' show' : '')} style={{ pointerEvents: open ? 'auto' : 'none' }} onClick={onClose} />
      <div className={'sheet' + (open ? ' show' : '')} role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        <h3>{mode === 'edit' ? 'Edit name' : 'New challenge'}</h3>

        <div className="field-label">Name</div>
        <input ref={inputRef} className="text-input" value={name} maxLength={11}
          placeholder="e.g. Read 30 minutes" enterKeyHint="done"
          onChange={(e) => { setName(e.target.value); setErr(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        <div className={'charcount' + (over ? ' over' : '')}>{name.length}/10</div>

        {mode !== 'edit' && (
          <div style={{ marginTop: 8 }}>
            <div className="field-label">Type</div>
            <Segmented value={type} onChange={setType}
              options={[
                { value: 'habits', label: 'Habits', icon: <HabitIcon size={17} /> },
                { value: 'principles', label: 'Principles', icon: <PrincipleIcon size={17} /> },
              ]} />
          </div>
        )}

        {err && <div style={{ color: '#d4493f', fontSize: 13, marginTop: 14 }}>{err}</div>}

        <div className="sheet-actions">
          <button className="btn-block btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-block btn-fill" disabled={!canSave} onClick={submit}>
            {mode === 'edit' ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

// ---------- Toast with single-slot + Undo ----------
export function Toast({ toast, onUndo }) {
  const show = !!toast;
  return (
    <div className="toast-wrap">
      <div className={'toast' + (show ? ' show' : '')}>
        <span>{toast ? toast.msg : ''}</span>
        {toast && toast.undo && <button className="undo" onClick={onUndo}>Undo</button>}
      </div>
    </div>
  );
}

// ---------- Confirm dialog ----------
export function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <React.Fragment>
      <div className={'scrim' + (open ? ' show' : '')} style={{ pointerEvents: open ? 'auto' : 'none', zIndex: 50 }} onClick={onCancel} />
      <div className={'dialog' + (open ? ' show' : '')}>
        <h4>{title}</h4>
        <p>{body}</p>
        <div className="sheet-actions" style={{ marginTop: 0 }}>
          <button className="btn-block btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={'btn-block ' + (danger ? 'btn-danger' : 'btn-fill')} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </React.Fragment>
  );
}

// ---------- Overflow menu ----------
export function OverflowMenu({ items, onClose }) {
  React.useEffect(() => {
    const h = () => onClose();
    const t = setTimeout(() => document.addEventListener('click', h), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', h); };
  }, [onClose]);
  return (
    <div className="menu" style={{ top: 92, right: 16 }} onClick={(e) => e.stopPropagation()}>
      {items.map((it, i) => it.sep
        ? <div key={i} className="menu-sep" />
        : <button key={i} className={it.danger ? 'danger' : ''} onClick={() => { onClose(); it.onClick(); }}>{it.icon}{it.label}</button>
      )}
    </div>
  );
}

// ---------- Month grid (reused by calendar page + detail mini-cal) ----------
export function MonthGrid({ year, month, classify }) {
  const first = new Date(year, month, 1);
  const lead = first.getDay(); // 0=Sun
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(<div key={'b' + i} />);
  for (let d = 1; d <= days; d++) {
    const ds = year + '-' + (month + 1 < 10 ? '0' : '') + (month + 1) + '-' + (d < 10 ? '0' : '') + d;
    const info = classify(ds);
    let cls = 'cal-cell', style = {};
    if (info.kind === 'today') cls += ' today';
    else if (info.kind === 'empty') { cls += ' empty-day'; }
    else style.background = info.fill;
    cells.push(
      <div key={d} className={cls} style={style} title={info.title || ''}>
        <span className="dnum" style={info.kind === 'fill' && info.dark ? { color: '#fff', opacity: .8 } : {}}>{d}</span>
      </div>
    );
  }
  return <div className="cal-grid">{cells}</div>;
}

export function MonthsView({ fromYMD, toYMD, classify, gap, radius }) {
  // newest month first, older months below
  const blocks = [];
  const end = parseYMD(toYMD);
  const start = parseYMD(fromYMD);
  let y = end.getFullYear(), m = end.getMonth();
  const startKey = start.getFullYear() * 12 + start.getMonth();
  let key = y * 12 + m;
  while (key >= startKey) {
    blocks.push({ y, m });
    m--; if (m < 0) { m = 11; y--; }
    key = y * 12 + m;
  }
  return (
    <div style={{ '--cal-gap': (gap || 6) + 'px', '--cal-radius': (radius || 6) + 'px' }}>
      {blocks.map(({ y, m }) => (
        <div className="month-block" key={y + '-' + m}>
          <div className="month-title">{MON_SHORT[m]} {y}</div>
          <div className="dow-row">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div className="dow-cell" key={i}>{d}</div>)}</div>
          <MonthGrid year={y} month={m} classify={classify} />
        </div>
      ))}
    </div>
  );
}

// =====================================================================
// State components — loading / error / generic message
// =====================================================================
export function StateMessage({ icon, danger, title, body, children }) {
  return (
    <div className="state-msg">
      {icon && <div className={'state-icon' + (danger ? ' danger' : '')}>{icon}</div>}
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ title, body, onRetry }) {
  return (
    <StateMessage danger icon={<AlertIcon size={30} />}
      title={title || 'Something went wrong'}
      body={body || "We couldn't load your data. Check your connection and try again."}>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          <RestoreIcon size={18} /> Try again
        </button>
      )}
    </StateMessage>
  );
}

export function Skel({ w, h, r, style }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function TodaySkeletonBody() {
  const rows = [0, 1, 2, 3, 4, 5];
  return (
    <div className="scroll">
      <div className="skel-board">
        <div className="skel-day" style={{ minHeight: 68 }}>
          <Skel w={20} h={20} r="var(--radius-cell)" />
          <div className="skel-lines"><Skel w="42%" h={13} /><Skel w="28%" h={10} /></div>
          <Skel w={34} h={12} />
        </div>
        {rows.map((i) => (
          <div className="skel-day" key={i}>
            <Skel w={20} h={20} r="var(--radius-cell)" />
            <div className="skel-lines"><Skel w={`${52 - i * 4}%`} h={12} /><Skel w="22%" h={9} /></div>
            <Skel w={30} h={11} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarSkeletonBody() {
  return (
    <div className="scroll">
      <div className="cal-wrap">
        <div className="combo-banner">
          <Skel w={44} h={44} r={12} />
          <div style={{ flex: 1 }}>
            <Skel w={90} h={26} /><div style={{ height: 8 }} /><Skel w={150} h={11} />
          </div>
        </div>
        <Skel w={110} h={15} style={{ margin: '0 2px 14px' }} />
        <div className="skel-cal-grid">
          {Array.from({ length: 35 }).map((_, i) => <div className="skel" key={i} />)}
        </div>
      </div>
    </div>
  );
}

export function DetailSkeletonBody() {
  return (
    <div className="scroll">
      <div className="detail-body">
        <Skel w="62%" h={26} />
        <div style={{ height: 10 }} />
        <Skel w={70} h={13} />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0 30px' }}>
          <Skel w={140} h={84} r={16} />
        </div>
        <Skel w="100%" h={74} r="var(--radius)" />
        <div style={{ height: 30 }} />
        <Skel w={90} h={13} style={{ marginBottom: 14 }} />
        <div className="skel-cal-grid">
          {Array.from({ length: 35 }).map((_, i) => <div className="skel" key={i} />)}
        </div>
      </div>
    </div>
  );
}
