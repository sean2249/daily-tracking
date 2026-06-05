// pages.jsx — TodayBoard, CalendarPage, DetailPage.
import React from 'react';
import {
  todayYMD, addDays, makeLogIndex, isDone, activeItemsOn, dayCompletion,
  bucket, SCALES, fmtMonDay, fmtSlash, relLabel, earliestStart, fullComboStreak,
  itemCurrentStreak, itemLongestStreak, itemCompletion, itemTotalDone,
} from './data.jsx';
import {
  ChartIcon, BackIcon, ChevronIcon, ComboIcon, HabitIcon, PrincipleIcon, AddIcon,
  EmptyArt, StreakIcon, CheckIcon, MoreIcon, EditIcon, ArchiveIcon, DeleteIcon,
  RestoreIcon, SearchIcon,
} from './icons.jsx';
import {
  MonthsView, ErrorState, StateMessage, OverflowMenu,
  TodaySkeletonBody, CalendarSkeletonBody, DetailSkeletonBody,
} from './ui.jsx';

// =====================================================================
// Shared bits
// =====================================================================
function scaleColors(t) { return (SCALES[t.palette] || SCALES.green).c; }

function BrandLogo({ colors }) {
  return (
    <div className="brand" aria-label="Daily">
      <div className="brand-mark">
        <span style={{ background: colors[2] }} />
        <span style={{ background: colors[4] }} />
        <span style={{ background: colors[3] }} />
        <span style={{ background: colors[1] }} />
      </div>
      <span className="brand-name">Daily</span>
    </div>
  );
}

function ItemCheckRow({ item, done, streak, feel, flashId, onToggle, onOpen }) {
  return (
    <div className={'item-row' + (flashId === item.id ? ' flash' : '')}>
      <div className={'checkbox ' + feel + (done ? ' checked' : '')}
        role="checkbox" aria-checked={done} aria-label={item.name} tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(); } }}>
        {done && <CheckIcon size={17} />}
      </div>
      <div className={'item-name' + (done ? ' done' : '')} onClick={onOpen}>{item.name}</div>
      {streak > 0 && (
        <div className="item-streak"><StreakIcon size={14} /><span className="streak-n">{streak}</span></div>
      )}
    </div>
  );
}

function DayGroups({ items, date, logIdx, feel, showStreak, today, onToggle, onOpen, checkFill, flashId }) {
  const habits = items.filter((i) => i.type === 'habits');
  const principles = items.filter((i) => i.type === 'principles');
  const section = (label, Icon, list) => list.length === 0 ? null : (
    <div>
      <div className="group-head"><Icon size={15} />{label}</div>
      {list.map((it) => (
        <ItemCheckRow key={it.id} item={it}
          done={isDone(logIdx, it.id, date)}
          streak={showStreak ? itemCurrentStreak(it, logIdx, today) : 0}
          feel={feel} flashId={flashId} onToggle={() => onToggle(it.id, date)} onOpen={() => onOpen(it.id)} />
      ))}
    </div>
  );
  return (
    <div className="day-body-pad" style={{ '--check-fill': checkFill }}>
      {section('Habits', HabitIcon, habits)}
      {section('Principles', PrincipleIcon, principles)}
    </div>
  );
}

// =====================================================================
// Today board
// =====================================================================
export function TodayBoard({ state, api, t, expanded, setExpanded, flashId, onOpenItem, onOpenCalendar, onAddRequest, toast, dataState, onRetry }) {
  const today = todayYMD();
  const logIdx = React.useMemo(() => makeLogIndex(state.logs), [state.logs]);
  const colors = scaleColors(t);
  const activeToday = activeItemsOn(state.items, today);
  const anyNonDeleted = state.items.some((i) => i.status !== 'deleted');
  const checkFill = 'var(--accent)';

  const TopBar = (
    <div className="topbar">
      <BrandLogo colors={colors} />
      <button className="iconbtn" aria-label="Calendar" onClick={onOpenCalendar}><ChartIcon /></button>
    </div>
  );

  if (dataState === 'loading') {
    return <div className="screen">{TopBar}<TodaySkeletonBody /></div>;
  }
  if (dataState === 'error') {
    return (
      <div className="screen">{TopBar}
        <ErrorState onRetry={onRetry}
          title="Couldn't load today"
          body="Your check-ins didn't sync. Check your connection and try again." />
      </div>
    );
  }

  if (activeToday.length === 0) {
    const brandNew = !anyNonDeleted;
    return (
      <div className="screen">
        {TopBar}
        <div className="empty">
          <div className="empty-art"><EmptyArt size={104} /></div>
          {brandNew ? (
            <React.Fragment>
              <h2>Start your first habit<br />or principle</h2>
              <p>Pick one thing to do — or one line to hold. Keep it to seven.</p>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <h2>No active items</h2>
              <p>Review your past in the calendar, or add one to start again.</p>
            </React.Fragment>
          )}
          <button className="btn-primary" onClick={onAddRequest}><AddIcon size={20} />New challenge</button>
          {!brandNew && (
            <button className="iconbtn" style={{ width: 'auto', padding: '0 14px', height: 38, gap: 7, color: 'var(--text-2)', fontFamily: 'var(--font)', fontSize: 14 }} onClick={onOpenCalendar}>
              <ChartIcon size={18} /> Open calendar
            </button>
          )}
        </div>
      </div>
    );
  }

  const days = [];
  for (let i = 0; i < 7; i++) days.push(addDays(today, -i));
  const layout = t.todayLayout; // 'cards' | 'minimal'

  function onToggleWithToast(id, d) {
    const nowDone = api.toggle(id, d);
    toast.show(nowDone ? 'Saved.' : 'Check-in removed.', () => api.toggle(id, d));
  }

  function DayRow({ date }) {
    const isToday = date === today;
    const open = expanded.has(date);
    const items = activeItemsOn(state.items, date);
    const comp = dayCompletion(state.items, logIdx, date);
    const hasItems = items.length > 0;
    const canExpand = hasItems;

    let cellEl, pctEl;
    if (isToday) {
      const fill = comp.num > 0 ? colors[bucket(comp.pct)] : null;
      cellEl = <div className="cell today" style={fill ? { background: fill } : {}} />;
      const allDone = comp.num === comp.denom;
      pctEl = <span className="day-pct inprog">{allDone ? 'Done' : '' + comp.num + '/' + comp.denom}</span>;
    } else if (!hasItems) {
      cellEl = <div className="cell" style={{ border: '1.5px dashed var(--border-strong)', background: 'transparent' }} />;
      pctEl = <span className="day-pct" style={{ color: 'var(--text-3)' }}>—</span>;
    } else {
      cellEl = <div className="cell" style={{ background: colors[bucket(comp.pct)] }} />;
      pctEl = <span className="day-pct">{comp.pct}%</span>;
    }

    const toggleExpand = () => { if (canExpand) { const n = new Set(expanded); n.has(date) ? n.delete(date) : n.add(date); setExpanded(n); } };

    return (
      <div className={(layout === 'cards' ? 'day-card' : '') + (isToday ? ' is-today' : '')} style={layout === 'minimal' ? { borderBottom: '1px solid var(--border)' } : {}}>
        <div className={'day-head' + (canExpand ? '' : ' readonly')}
          role={canExpand ? 'button' : undefined}
          tabIndex={canExpand ? 0 : undefined}
          aria-expanded={canExpand ? open : undefined}
          onClick={toggleExpand}
          onKeyDown={canExpand ? (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleExpand(); } } : undefined}>
          {cellEl}
          <div className="day-label">
            <div className="d-title">{fmtMonDay(date)}</div>
            <div className="d-sub">{isToday ? relLabel(date, today) + ' · In progress' : relLabel(date, today)}</div>
          </div>
          {pctEl}
          {canExpand && <ChevronIcon size={18} className="chev" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .25s', color: 'var(--text-3)' }} />}
        </div>
        <div className={'day-body' + (open ? ' open' : '')}>
          <div className="day-body-inner">
            <DayGroups items={items} date={date} logIdx={logIdx} feel={t.checkFeel}
              showStreak={isToday} today={today} checkFill={checkFill} flashId={isToday ? flashId : null}
              onToggle={(id, d) => onToggleWithToast(id, d)} onOpen={onOpenItem} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      {TopBar}
      <div className="scroll">
        <div className="board" style={{ gap: layout === 'minimal' ? 0 : 10 }}>
          {days.map((d) => <DayRow key={d} date={d} />)}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Calendar page
// =====================================================================
export function CalendarPage({ state, t, onBack, onOpenItem, dataState, onRetry }) {
  const today = todayYMD();
  const logIdx = React.useMemo(() => makeLogIndex(state.logs), [state.logs]);
  const colors = scaleColors(t);
  const combo = fullComboStreak(state.items, logIdx, today);
  const from = earliestStart(state.items) || today;
  const dens = { cozy: [6, 6], compact: [3, 3], roomy: [9, 7] }[t.calDensity] || [6, 6];
  const archived = state.items.filter((i) => i.status === 'archived');
  const hasHistory = state.items.some((i) => i.status !== 'deleted');

  const TopBar = (
    <div className="topbar">
      <button className="iconbtn" aria-label="Back" onClick={onBack}><BackIcon /></button>
      <div style={{ fontWeight: 650, fontSize: 17, letterSpacing: '-0.01em' }}>History</div>
      <div style={{ width: 40 }} />
    </div>
  );

  if (dataState === 'loading') {
    return <div className="screen fade-page">{TopBar}<CalendarSkeletonBody /></div>;
  }
  if (dataState === 'error') {
    return (
      <div className="screen fade-page">{TopBar}
        <ErrorState onRetry={onRetry}
          title="Couldn't load history"
          body="We couldn't reach your past check-ins. Check your connection and try again." />
      </div>
    );
  }

  if (!hasHistory) {
    return (
      <div className="screen fade-page">{TopBar}
        <StateMessage icon={<ChartIcon size={30} />}
          title="No history yet"
          body="Once you start checking in, your daily completion heatmap and combo streak show up here." />
      </div>
    );
  }

  function classify(ds) {
    if (ds > today) return { kind: 'empty' };
    if (ds === today) return { kind: 'today' };
    const comp = dayCompletion(state.items, logIdx, ds);
    if (comp.denom === 0) return { kind: 'empty' };
    const b = bucket(comp.pct);
    return { kind: 'fill', fill: colors[b], dark: b >= 5, title: comp.pct + '%' };
  }

  return (
    <div className="screen fade-page">
      {TopBar}
      <div className="scroll">
        <div className="cal-wrap">
          <div className="combo-banner">
            <div className="combo-fire"><ComboIcon size={24} /></div>
            <div>
              <div className="combo-num">{combo}<span style={{ fontSize: 15, color: 'var(--text-3)', marginLeft: 6, letterSpacing: 0 }}>{combo === 1 ? 'day' : 'days'}</span></div>
              <div className="combo-label">Full Combo · every item at 100%</div>
            </div>
          </div>

          <MonthsView fromYMD={from} toYMD={today} classify={classify} gap={dens[0]} radius={dens[1]} />

          <div className="cal-legend">
            Less
            {colors.map((c, i) => <div key={i} className="cell" style={{ background: c, borderRadius: dens[1] }} />)}
            More
          </div>

          {archived.length > 0 && (
            <React.Fragment>
              <div className="section-head">Archived</div>
              {archived.map((it) => (
                <div className="arch-row" key={it.id} onClick={() => onOpenItem(it.id)}>
                  {it.type === 'habits' ? <HabitIcon size={18} /> : <PrincipleIcon size={18} />}
                  <span className="a-name">{it.name}</span>
                  <span className="a-meta">{fmtSlash(it.start_date)} – {fmtSlash(addDays(it.archive_date, -1))}</span>
                  <ChevronIcon size={16} style={{ color: 'var(--text-3)' }} />
                </div>
              ))}
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Detail page
// =====================================================================
export function DetailPage({ itemId, state, t, onBack, requestEdit, requestArchive, requestDelete, requestRestore, dataState, onRetry }) {
  const today = todayYMD();
  const item = state.items.find((i) => i.id === itemId);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const logIdx = React.useMemo(() => makeLogIndex(state.logs), [state.logs]);
  const colors = scaleColors(t);

  const BackHead = (
    <div className="detail-head">
      <button className="backbtn" onClick={onBack}><BackIcon size={20} /> Back</button>
    </div>
  );

  if (dataState === 'loading') {
    return <div className="screen fade-page">{BackHead}<DetailSkeletonBody /></div>;
  }
  if (dataState === 'error') {
    return (
      <div className="screen fade-page">{BackHead}
        <ErrorState onRetry={onRetry}
          title="Couldn't load this item"
          body="We couldn't reach its history. Check your connection and try again." />
      </div>
    );
  }

  if (!item) return (
    <div className="screen fade-page">{BackHead}
      <StateMessage icon={<SearchIcon size={28} />}
        title="Item not found"
        body="This habit or principle may have been deleted. Head back to see your current list." />
    </div>
  );

  const archived = item.status === 'archived';
  const cur = itemCurrentStreak(item, logIdx, today);
  const longest = itemLongestStreak(item, logIdx, today);
  const completion = itemCompletion(item, logIdx, today);
  const totalDone = itemTotalDone(item, state.logs);
  const from = item.start_date;
  const calTo = archived ? addDays(item.archive_date, -1) : today;

  function classify(ds) {
    if (ds < item.start_date) return { kind: 'empty' };
    if (archived && ds >= item.archive_date) return { kind: 'empty' };
    if (ds > today) return { kind: 'empty' };
    if (ds === today && !archived) return { kind: 'today' };
    const done = isDone(logIdx, item.id, ds);
    return { kind: 'fill', fill: done ? colors[colors.length - 1] : colors[0], dark: done, title: done ? 'Done' : 'Missed' };
  }

  const heroMode = t.detailHero; // 'big' | 'ring'
  const ringPct = completion == null ? 0 : completion;
  const R = 64, C = 2 * Math.PI * R;

  const menuItems = archived
    ? [
        { icon: <RestoreIcon size={18} />, label: 'Restore', onClick: requestRestore },
        { sep: true },
        { icon: <DeleteIcon size={18} />, label: 'Delete', danger: true, onClick: requestDelete },
      ]
    : [
        { icon: <EditIcon size={18} />, label: 'Edit name', onClick: requestEdit },
        { icon: <ArchiveIcon size={18} />, label: 'Archive', onClick: requestArchive },
        { sep: true },
        { icon: <DeleteIcon size={18} />, label: 'Delete', danger: true, onClick: requestDelete },
      ];

  return (
    <div className="screen fade-page">
      <div className="detail-head">
        <button className="backbtn" onClick={onBack}><BackIcon size={20} /> Back</button>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <button className="iconbtn" aria-label="More" onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}><MoreIcon /></button>
          {menuOpen && <OverflowMenu items={menuItems} onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
      <div className="scroll">
        <div className="detail-body">
          <div className="detail-title-row">
            <span className="detail-title">{item.name}</span>
            {archived && <span className="arch-badge">Archived</span>}
          </div>
          <div className="type-tag">{item.type === 'habits' ? 'Habit' : 'Principle'}</div>

          {heroMode === 'ring' ? (
            <div className="hero">
              <div className="hero-ring">
                <svg width="168" height="168" viewBox="0 0 168 168">
                  <circle cx="84" cy="84" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
                  <circle cx="84" cy="84" r={R} fill="none" stroke="var(--accent)" strokeWidth="10"
                    strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * ringPct) / 100}
                    transform="rotate(-90 84 84)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <div className="hero-num mid" style={{ fontSize: 58 }}>{cur}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>day streak</div>
                </div>
              </div>
              <div className="hero-cap">Current streak</div>
            </div>
          ) : (
            <div className="hero">
              <div className="hero-num big">{cur}</div>
              <div className="hero-cap">Current streak <span className="days">· {cur === 1 ? 'day' : 'days'}</span></div>
            </div>
          )}

          <div className="stats-row">
            <div className="stat"><div className="stat-num">{longest}</div><div className="stat-cap">Longest</div></div>
            <div className="stat"><div className="stat-num">{completion == null ? '—' : completion + '%'}</div><div className="stat-cap">Completion</div></div>
            <div className="stat"><div className="stat-num">{totalDone}</div><div className="stat-cap">Total done</div></div>
          </div>

          <div className="section-head" style={{ marginTop: 30 }}>History</div>
          <MonthsView fromYMD={from} toYMD={calTo} classify={classify} gap={6} radius={6} />

          <div className="meta-line">Started {fmtSlash(item.start_date)}{archived ? '  ·  Archived ' + fmtSlash(item.archive_date) : ''}</div>
        </div>
      </div>
    </div>
  );
}
