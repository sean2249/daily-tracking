// screens.jsx — Today / Habits / Chores / Character screens.
// All screens render inside the iOS device frame (402×874).

import React from 'react';
import {
  PixelCheck, Room, AvatarBust, XPBar, PixCoin, PixStar, StampPolaroid,
} from './pixel.jsx';
import {
  parseISO, dayDiff, TODAY_ISO, addDays, isoDate,
  cadenceSummary, scheduleSummary, chorelDueText, xpForLevel, fmtMonthDay,
} from './data.jsx';
import { EditCompletionModal, SettingsModal } from './modals.jsx';

const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const dayNamesFull = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─────────────────────────────────────────────────────────────
// Tiny reusable bits
// ─────────────────────────────────────────────────────────────
function ScreenScroll({ children, padBottom = 100, style = {} }) {
  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      // clear the tab bar + the home-indicator safe area
      paddingBottom: typeof padBottom === 'number'
        ? `calc(${padBottom}px + var(--sab))`
        : padBottom,
      WebkitOverflowScrolling: 'touch',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHeader({ children, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '14px 18px 8px',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 12,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink)',
      }}>{children}</div>
      {right}
    </div>
  );
}

function PixBadge({ children, bg = 'var(--gold)', color = 'var(--ink)', size = 11 }) {
  return (
    <span style={{
      fontFamily: 'var(--font-display)',
      fontSize: size,
      color, background: bg,
      borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
      boxShadow: '0 2px 6px rgba(42,29,18,0.06)',
      padding: '3px 6px',
      letterSpacing: '0.04em',
      display: 'inline-flex',
      alignItems: 'center', gap: 4,
      lineHeight: 1,
    }}>{children}</span>
  );
}

// ─────────────────────────────────────────────────────────────
// HEADER BAR — bespoke pixel header (not iOS large title)
// ─────────────────────────────────────────────────────────────
function ScreenHeader({ title, subtitle, right }) {
  return (
    <div style={{
      padding: 'var(--header-pad) 18px 10px',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 10,
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 30, fontWeight: 700,
          lineHeight: 1.05,
          color: 'var(--ink)',
          letterSpacing: '0.01em',
        }}>{title}</div>
        {subtitle && (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13, color: 'var(--ink-soft)',
            marginTop: 4,
          }}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TASK ROW — habit or chore line
// ─────────────────────────────────────────────────────────────
function TaskRow({ icon, name, sub, badge, checked, color, onCheck, dim = false, danger = false, animate = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: checked ? '#d8e8c4' : (danger ? '#fbe2d6' : 'var(--paper)'),
      borderRadius: 12,
      border: danger && !checked ? '1.5px solid rgba(201,90,50,0.45)' : '1.5px solid rgba(42,29,18,0.18)',
      boxShadow: checked ? '0 2px 6px rgba(42,29,18,0.06)' : '0 4px 10px rgba(42,29,18,0.08)',
      transform: checked ? 'translate(1px,1px)' : 'translate(0,0)',
      margin: '0 16px 10px',
      opacity: dim ? 0.55 : 1,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* DONE rubber-stamp overlay */}
      {checked && (
        <div style={{
          position: 'absolute',
          top: 6, right: 56,
          padding: '4px 8px',
          fontFamily: 'var(--font-display)',
          fontSize: 13, letterSpacing: '0.1em',
          color: 'var(--leaf-dark)',
          border: '3px solid var(--leaf-dark)',
          transform: 'rotate(-10deg)',
          opacity: 0.85,
          pointerEvents: 'none',
          background: 'rgba(255,255,255,0.4)',
          animation: animate ? 'pop-in 0.45s cubic-bezier(.4,1.7,.5,1)' : 'none',
          zIndex: 2,
        }}>DONE!</div>
      )}
      {/* danger state shown via row color + "Nd late" in sub line */}
      <div style={{
        width: 38, height: 38,
        background: color || 'var(--paper-deep)',
        borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
        boxShadow: '0 2px 6px rgba(42,29,18,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, lineHeight: 1,
        flexShrink: 0,
        filter: checked ? 'saturate(0.6)' : 'none',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 17, fontWeight: 600,
          color: checked ? 'var(--ink-soft)' : 'var(--ink)',
          textDecoration: checked ? 'line-through' : 'none',
          textDecorationColor: 'var(--ink-soft)',
          lineHeight: 1.15,
        }}>{name}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 11, color: 'var(--ink-soft)',
          marginTop: 4,
        }}>
          {sub}
          {badge}
        </div>
      </div>
      <PixelCheck checked={checked} color={checked ? 'var(--leaf)' : (color || 'var(--accent)')} onClick={onCheck} animate={animate} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TODAY SCREEN — supports 3 layout variants
// ─────────────────────────────────────────────────────────────
function TodayScreen({ state, dispatch, layout = 'hybrid' }) {
  const { profile, habits, chores, questsDaily } = state;
  const todayDow = new Date().getDay();
  const narrow = typeof window !== 'undefined' && window.innerWidth <= 380;

  const todayHabits = habits.filter(h => h.weekdays.includes(todayDow));
  const todayChores = chores.filter(c => {
    const due = parseISO(c.nextDue);
    return dayDiff(due, new Date()) <= 0;  // due or overdue
  });

  const habitsDone = todayHabits.filter(h => h.completions.has(TODAY_ISO)).length;
  const choresDone = todayChores.filter(c => state.completedChoreIds.has(c.id)).length;
  const allDone = habitsDone === todayHabits.length && choresDone === todayChores.length;

  const xpToNext = xpForLevel(profile.level + 1);
  const xpAtLevel = xpForLevel(profile.level);

  // ── Hero: avatar + room + level/xp/coin HUD
  const Hero = ({ compact }) => (
    <div style={{
      position: 'relative',
      padding: compact ? 'var(--status-pad) 14px 18px' : 'var(--status-pad) 12px 20px',
      background: `
        linear-gradient(180deg, #f8e8b5 0%, #f0d896 100%)
      `,
      borderBottom: '1.5px solid rgba(42,29,18,0.18)',
    }}>
      {/* clouds */}
      <div style={{
        position: 'absolute', top: 36, right: 18, fontSize: 18, opacity: 0.7,
      }}>☁️</div>
      {/* HUD: level / xp / coins / heart */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 8, flexWrap: 'wrap',
      }}>
        <PixBadge bg="var(--accent)" color="#fff" size={10}>LV {profile.level}</PixBadge>
        <div style={{ flex: 1, minWidth: 100 }}>
          <XPBar
            value={profile.xp - xpAtLevel}
            max={xpToNext - xpAtLevel}
            height={10}
          />
        </div>
        <PixBadge bg="var(--gold)" size={10}>
          <PixCoin size={11}/> {profile.coins}
        </PixBadge>
      </div>

      {/* Room */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <Room
          messTier={state.messTier}
          hairTier={state.hairTier}
          mood={allDone ? 'happy' : (state.messTier >= 2 ? 'sad' : 'smile')}
          scale={compact ? (narrow ? 1.7 : 1.85) : (narrow ? 2.6 : 3.0)}
          bobChar={true}
        />
      </div>

      {/* Status nudge */}
      {!compact && (
        <div style={{
          marginTop: 8,
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--ink-soft)',
          textAlign: 'center',
          padding: '0 16px',
        }}>
          {allDone
            ? <span><b style={{color: 'var(--leaf-dark)'}}>Perfect day in sight</b> — Pixie is glowing ✨</span>
            : state.messTier >= 2
              ? <span>The room's getting messy — <b>{todayChores.length - choresDone} chores left</b>.</span>
              : <span>{habitsDone}/{todayHabits.length} habits · {choresDone}/{todayChores.length} chores done today</span>
          }
        </div>
      )}
    </div>
  );

  // ── Daily quests strip
  const QuestsStrip = () => (
    <div style={{ padding: '0 16px' }}>
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        paddingBottom: 6,
      }}>
        {questsDaily.map(q => {
          const pct = Math.min(1, q.progress / q.target);
          const done = q.progress >= q.target;
          return (
            <div key={q.id} style={{
              flex: '0 0 clamp(150px, 46%, 180px)',
              padding: 10,
              background: done ? '#e8f0d8' : 'var(--paper)',
              borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
              boxShadow: '0 4px 10px rgba(42,29,18,0.08)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-display)',
                fontSize: 9, letterSpacing: '0.06em',
                color: 'var(--ink)',
                marginBottom: 4,
              }}>
                <PixStar size={11}/> DAILY QUEST
              </div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13, fontWeight: 600,
                lineHeight: 1.2,
                marginBottom: 6,
                color: 'var(--ink)',
                minHeight: 32,
              }}>{q.title}</div>
              <XPBar value={q.progress} max={q.target} height={8} color={done ? 'var(--leaf)' : 'var(--gold)'} />
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10, marginTop: 4,
                display: 'flex', justifyContent: 'space-between',
                color: 'var(--ink-soft)',
              }}>
                <span>{q.progress}/{q.target}</span>
                <span>+{q.xp}xp · {q.coins}🪙</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const HabitsList = () => (
    <>
      <SectionHeader right={
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)',
        }}>{habitsDone}/{todayHabits.length}</span>
      }>Today's Habits</SectionHeader>
      {todayHabits.map(h => {
        const done = h.completions.has(TODAY_ISO);
        return (
          <TaskRow
            key={h.id}
            icon={h.emoji}
            name={h.name}
            sub={<>
              <span>{h.nameEn}</span>
              <span style={{ opacity: 0.6 }}>· 🔥{h.streak}d</span>
            </>}
            checked={done}
            color={h.color}
            animate={state.activeCheck === h.id}
            onCheck={() => dispatch({ type: 'TOGGLE_HABIT', id: h.id })}
          />
        );
      })}
    </>
  );

  const ChoresList = () => (
    <>
      <SectionHeader right={
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)',
        }}>{choresDone}/{todayChores.length}</span>
      }>Today's Chores</SectionHeader>
      {todayChores.length === 0 && (
        <div style={{
          margin: '0 18px 10px',
          fontFamily: 'var(--font-body)',
          fontSize: 13, color: 'var(--ink-soft)',
          padding: 12,
          border: '2px dashed var(--line-strong)',
        }}>No chores due today. Enjoy the calm. 🌿</div>
      )}
      {todayChores.map(c => {
        const done = state.completedChoreIds.has(c.id);
        const due = parseISO(c.nextDue);
        const diff = dayDiff(due, new Date());
        return (
          <TaskRow
            key={c.id}
            icon={c.emoji}
            name={c.name}
            sub={<>
              <span>{cadenceSummary(c)}</span>
              {diff < 0 && <span style={{ color: 'var(--accent-2)', fontWeight: 700 }}>· {-diff}d late</span>}
            </>}
            checked={done}
            color={diff < 0 ? '#f4c2a8' : '#ddc88e'}
            danger={diff < 0 && !done}
            animate={state.activeCheck === c.id}
            onCheck={() => dispatch({ type: 'COMPLETE_CHORE', id: c.id })}
          />
        );
      })}
    </>
  );

  // Date strip (compact)
  const DateStrip = () => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = addDays(new Date(), i);
      const isToday = i === 0;
      days.push(
        <div key={i} style={{
          flex: 1,
          textAlign: 'center',
          padding: '6px 0',
          background: isToday ? 'var(--accent)' : 'transparent',
          borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
          color: isToday ? '#fff' : 'var(--ink)',
          fontFamily: 'var(--font-display)',
          fontSize: 9,
          letterSpacing: '0.04em',
          boxShadow: isToday ? '0 2px 6px rgba(42,29,18,0.06)' : 'none',
        }}>
          <div style={{ opacity: 0.7 }}>{dayNames[d.getDay()].slice(0,1)}</div>
          <div style={{ fontSize: 13, marginTop: 2 }}>{d.getDate()}</div>
        </div>
      );
    }
    return (
      <div style={{
        display: 'flex', gap: 4,
        padding: '4px 16px 12px',
      }}>{days}</div>
    );
  };

  // ── LAYOUT VARIANTS
  if (layout === 'task-led') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ScreenScroll>
          <ScreenHeader
            title="Today"
            subtitle={`${dayNamesFull[new Date().getDay()]} · ${fmtMonthDay(new Date())}`}
            right={<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PixBadge bg="var(--accent)" color="#fff" size={10}>LV {profile.level}</PixBadge>
              <div style={{
                background: 'var(--paper)', borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
                boxShadow: '0 2px 6px rgba(42,29,18,0.06)', padding: 4,
              }}>
                <AvatarBust hairTier={state.hairTier} scale={1.4} mood={allDone ? 'happy' : 'smile'} />
              </div>
            </div>}
          />
          <div style={{ padding: '0 16px 10px' }}>
            <XPBar
              value={profile.xp - xpAtLevel}
              max={xpToNext - xpAtLevel}
              height={10}
              label={`${profile.xp - xpAtLevel}/${xpToNext - xpAtLevel} XP · ${profile.coins} coins`}
            />
          </div>
          <SectionHeader>Daily Quests</SectionHeader>
          <QuestsStrip />
          <HabitsList />
          <ChoresList />
          <div style={{ padding: '18px 16px 0' }}>
            <div style={{
              padding: 12,
              background: 'var(--paper-deep)',
              borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
              boxShadow: '0 4px 10px rgba(42,29,18,0.08)',
              display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <Room messTier={state.messTier} hairTier={state.hairTier} scale={1.2} showCharacter={true} bobChar={false} />
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 13,
                color: 'var(--ink-soft)',
              }}>
                <b style={{ color: 'var(--ink)' }}>Pixie's home</b><br/>
                Open Character tab to visit the room
              </div>
            </div>
          </div>
        </ScreenScroll>
      </div>
    );
  }

  if (layout === 'avatar-led') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ScreenScroll>
          <Hero compact={false} />
          <DateStrip />
          <SectionHeader>Daily Quests</SectionHeader>
          <QuestsStrip />
          <HabitsList />
          <ChoresList />
        </ScreenScroll>
      </div>
    );
  }

  // hybrid (default) — avatar peeks behind sticky sheet
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <ScreenScroll>
        <Hero compact={true} />
        <div style={{
          background: 'var(--bg)',
          borderTop: '1.5px solid rgba(42,29,18,0.18)',
          position: 'relative',
          zIndex: 2,
          paddingTop: 6,
        }}>
          <DateStrip />
          <SectionHeader>Daily Quests</SectionHeader>
          <QuestsStrip />
          <HabitsList />
          <ChoresList />
        </div>
      </ScreenScroll>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HABITS SCREEN — list + detail
// ─────────────────────────────────────────────────────────────
function HabitsListScreen({ state, dispatch, onSelect, onAdd }) {
  const { habits } = state;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenScroll>
        <ScreenHeader
          title="Habits"
          subtitle={`${habits.length} active · ${habits.reduce((a,h)=>a+h.totalCompletions,0)} total check-ins`}
          right={<button className="px-btn" onClick={onAdd} style={{ padding: '8px 12px' }}>+ NEW</button>}
        />
        <div style={{ padding: '6px 16px 0' }}>
          {habits.map(h => {
            const todayDone = h.completions.has(TODAY_ISO);
            return (
              <div
                key={h.id}
                onClick={() => onSelect(h.id)}
                style={{
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  marginBottom: 10,
                  background: todayDone ? '#d8e8c4' : 'var(--paper)',
                  borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
                  boxShadow: '0 6px 14px rgba(42,29,18,0.10)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                {todayDone && (
                  <div style={{
                    position: 'absolute',
                    top: 8, right: 14,
                    padding: '3px 8px',
                    fontFamily: 'var(--font-display)',
                    fontSize: 12, letterSpacing: '0.1em',
                    color: 'var(--leaf-dark)',
                    border: '3px solid var(--leaf-dark)',
                    transform: 'rotate(-12deg)',
                    opacity: 0.85,
                    pointerEvents: 'none',
                    background: 'rgba(255,255,255,0.4)',
                    zIndex: 2,
                  }}>DONE!</div>
                )}
                <div style={{
                  width: 44, height: 44,
                  background: h.color,
                  borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
                  boxShadow: '0 2px 6px rgba(42,29,18,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                  filter: todayDone ? 'saturate(0.6)' : 'none',
                }}>{h.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 17, fontWeight: 600,
                    color: todayDone ? 'var(--ink-soft)' : 'var(--ink)',
                  }}>{h.name} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: 14 }}>{h.nameEn}</span></div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11, color: 'var(--ink-soft)',
                    marginTop: 4,
                    display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                  }}>
                    <span>{scheduleSummary(h)}</span>
                    <span>· 🔥 {h.streak}d streak</span>
                    <span>· {h.totalCompletions} total</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScreenScroll>
    </div>
  );
}

// Polaroid sticker-book calendar
function PolaroidCalendar({ habit }) {
  // Show last ~60 days as a sticker book. Only days actually completed appear as polaroids.
  // Off days are gaps. Render in chronological rows.
  const polaroids = [];
  for (let i = 0; i < 60; i++) {
    const d = addDays(new Date(), -i);
    const iso = isoDate(d);
    if (habit.completions.has(iso)) {
      polaroids.push({
        date: d,
        rotate: (Math.sin(i * 1.7) * 6),
        offsetY: Math.sin(i * 0.9) * 2,
      });
    }
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap',
      gap: 12, rowGap: 18,
      justifyContent: 'flex-start',
      padding: '8px 4px 24px',
    }}>
      {polaroids.map((p, i) => (
        <div key={i} style={{ marginTop: p.offsetY }}>
          <StampPolaroid
            emoji={habit.emoji}
            dateLabel={`${p.date.getMonth()+1}/${p.date.getDate()}`}
            rotate={p.rotate}
            stampColor={habit.color}
          />
        </div>
      ))}
      {polaroids.length === 0 && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 13,
          color: 'var(--ink-soft)', padding: 12,
        }}>No stamps yet — check off today's habit to start your collection.</div>
      )}
    </div>
  );
}

function HabitDetailScreen({ habit, state, dispatch, onBack, onEdit }) {
  if (!habit) return null;
  const todayDone = habit.completions.has(TODAY_ISO);

  // year heatmap: 7 rows (days of week) × 26 cols (~6 months)
  const cols = 26;
  const weeks = [];
  const today = new Date();
  for (let w = cols - 1; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(today, -(w * 7) - (6 - d));
      week.push({
        date,
        done: habit.completions.has(isoDate(date)),
        future: date > today,
      });
    }
    weeks.push(week);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: 'var(--status-pad) 14px 8px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button className="px-btn ghost" onClick={onBack} style={{ padding: '6px 10px', fontSize: 11 }}>← BACK</button>
        <div style={{ flex: 1 }} />
        <button className="px-btn ghost" onClick={onEdit} style={{ padding: '6px 10px', fontSize: 11 }}>EDIT</button>
      </div>
      <ScreenScroll>
        <div style={{ padding: '4px 18px 12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 56, height: 56,
              background: habit.color,
              borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
              boxShadow: '0 4px 10px rgba(42,29,18,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>{habit.emoji}</div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22, color: 'var(--ink)',
              }}>{habit.name}</div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13, color: 'var(--ink-soft)',
              }}>{habit.nameEn} · {scheduleSummary(habit)}</div>
            </div>
          </div>

          {/* stats trio */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8, marginTop: 14,
          }}>
            {[
              {label: 'STREAK',   val: `${habit.streak}d`, sub: '🔥'},
              {label: 'BEST',     val: `${habit.longestStreak}d`, sub: '👑'},
              {label: 'TOTAL',    val: habit.totalCompletions,    sub: '📚'},
            ].map((s, i) => (
              <div key={i} style={{
                padding: '8px 10px',
                background: 'var(--paper)',
                borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
                boxShadow: '0 4px 10px rgba(42,29,18,0.08)',
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 9, letterSpacing: '0.08em',
                  color: 'var(--ink-soft)',
                }}>{s.label}</div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20, color: 'var(--ink)',
                  marginTop: 2,
                }}>{s.val}</div>
                <div style={{ fontSize: 14, marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* check-off CTA */}
          <button
            className="px-btn"
            style={{
              width: '100%',
              marginTop: 14,
              padding: 14,
              background: todayDone ? 'var(--leaf)' : habit.color,
              fontSize: 15,
            }}
            onClick={() => dispatch({ type: 'TOGGLE_HABIT', id: habit.id })}>
            {todayDone ? '✓ DONE TODAY · TAP TO UNDO' : 'CHECK OFF TODAY'}
          </button>

          {/* heatmap */}
          <div style={{ marginTop: 18 }}>
            <SectionHeader>Year Heatmap</SectionHeader>
            <div style={{
              display: 'flex', gap: 2,
              padding: '4px 0',
              overflowX: 'auto',
            }}>
              {weeks.map((w, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {w.map((c, di) => (
                    <div key={di} style={{
                      width: 11, height: 11,
                      background: c.future
                        ? 'transparent'
                        : c.done
                          ? habit.color
                          : 'var(--paper-deep)',
                      border: c.future ? 'none' : '1px solid var(--ink)',
                      opacity: c.future ? 0.3 : 1,
                    }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScreenScroll>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHORES SCREEN — list + detail
// ─────────────────────────────────────────────────────────────
function ChoresListScreen({ state, dispatch, onSelect, onAdd }) {
  const { chores } = state;
  // sort: overdue first, then due-today, then upcoming
  const sorted = [...chores].sort((a, b) => {
    const da = dayDiff(parseISO(a.nextDue), new Date());
    const db = dayDiff(parseISO(b.nextDue), new Date());
    return da - db;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenScroll>
        <ScreenHeader
          title="Chores"
          subtitle={`${chores.filter(c => dayDiff(parseISO(c.nextDue), new Date()) < 0).length} overdue`}
          right={<button className="px-btn" onClick={onAdd} style={{ padding: '8px 12px' }}>+ NEW</button>}
        />
        <div style={{ padding: '6px 16px 0' }}>
          {sorted.map(c => {
            const due = parseISO(c.nextDue);
            const diff = dayDiff(due, new Date());
            const overdue = diff < 0;
            const done = state.completedChoreIds.has(c.id);
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                style={{
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  marginBottom: 10,
                  background: done ? '#d8e8c4' : (overdue ? '#fbe2d6' : 'var(--paper)'),
                  borderRadius: 12, border: overdue && !done ? '1.5px solid rgba(201,90,50,0.45)' : '1.5px solid rgba(42,29,18,0.18)',
                  boxShadow: '0 6px 14px rgba(42,29,18,0.10)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                {done && (
                  <div style={{
                    position: 'absolute',
                    top: 8, right: 14,
                    padding: '3px 8px',
                    fontFamily: 'var(--font-display)',
                    fontSize: 12, letterSpacing: '0.1em',
                    color: 'var(--leaf-dark)',
                    border: '3px solid var(--leaf-dark)',
                    transform: 'rotate(-12deg)',
                    opacity: 0.85,
                    pointerEvents: 'none',
                    background: 'rgba(255,255,255,0.4)',
                    zIndex: 2,
                  }}>DONE!</div>
                )}
                {/* overdue state shown via row tint + due text color */}
                <div style={{
                  width: 44, height: 44,
                  background: 'var(--paper-deep)',
                  borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
                  boxShadow: '0 2px 6px rgba(42,29,18,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                  filter: done ? 'saturate(0.6)' : 'none',
                }}>{c.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 17, fontWeight: 600,
                    color: done ? 'var(--ink-soft)' : 'var(--ink)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>{c.name} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: 14 }}>{c.nameEn}</span></div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11, color: overdue && !done ? 'var(--accent-2)' : 'var(--ink-soft)',
                    marginTop: 4,
                    fontWeight: overdue && !done ? 700 : 400,
                  }}>{cadenceSummary(c)} · {chorelDueText(c)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </ScreenScroll>
    </div>
  );
}

function ChoreDetailScreen({ chore, state, dispatch, onBack, onEdit }) {
  if (!chore) return null;
  const done = state.completedChoreIds.has(chore.id);
  const due = parseISO(chore.nextDue);
  const diff = dayDiff(due, new Date());
  const overdue = diff < 0;

  // Local state for which completion entry is being edited
  const [editingISO, setEditingISO] = React.useState(null);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'var(--status-pad) 14px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="px-btn ghost" onClick={onBack} style={{ padding: '6px 10px', fontSize: 11 }}>← BACK</button>
        <div style={{ flex: 1 }} />
        <button className="px-btn ghost" onClick={onEdit} style={{ padding: '6px 10px', fontSize: 11 }}>EDIT</button>
      </div>
      <ScreenScroll>
        <div style={{ padding: '4px 18px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 56, height: 56,
              background: 'var(--paper-deep)',
              borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
              boxShadow: '0 4px 10px rgba(42,29,18,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>{chore.emoji}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>{chore.name}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)' }}>{chore.nameEn} · {cadenceSummary(chore)}</div>
            </div>
          </div>

          {/* due banner */}
          <div style={{
            marginTop: 14,
            padding: 12,
            background: overdue ? '#f4d2c8' : (diff === 0 ? '#f5e9c8' : 'var(--paper)'),
            borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
            boxShadow: '0 4px 10px rgba(42,29,18,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 10, letterSpacing: '0.06em',
                color: 'var(--ink-soft)',
              }}>NEXT DUE</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17, color: overdue ? 'var(--accent-2)' : 'var(--ink)',
                marginTop: 2,
              }}>{chorelDueText(chore)}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textAlign: 'right', color: 'var(--ink-soft)' }}>
              {chore.totalCompletions} total<br/>+{overdue ? 22 : 15} XP
            </div>
          </div>

          <button
            className="px-btn"
            disabled={done}
            style={{
              width: '100%',
              marginTop: 14,
              padding: 14,
              background: done ? 'var(--leaf)' : 'var(--accent)',
              fontSize: 15,
              cursor: done ? 'default' : 'pointer',
              opacity: done ? 0.95 : 1,
            }}
            onClick={() => !done && dispatch({ type: 'COMPLETE_CHORE', id: chore.id })}>
            {done ? '✓ DONE TODAY' : 'MARK AS DONE'}
          </button>
          {done && (
            <div style={{
              marginTop: 6,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--ink-soft)', textAlign: 'center',
            }}>Wrong date? Tap a completion below to edit or delete.</div>
          )}

          {chore.notes && (
            <div style={{
              marginTop: 14,
              padding: 10,
              background: 'var(--paper)',
              border: '2px dashed var(--line-strong)',
              fontFamily: 'var(--font-body)', fontSize: 13,
              color: 'var(--ink)',
            }}>{chore.notes}</div>
          )}

          <SectionHeader right={
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--ink-soft)',
            }}>tap to edit</span>
          }>Last 3 Completions</SectionHeader>
          <div style={{ padding: '0 2px' }}>
            {chore.last3.length === 0 && (
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 13,
                color: 'var(--ink-soft)', padding: 12,
                border: '2px dashed var(--line-strong)',
              }}>No completions yet.</div>
            )}
            {chore.last3.map((iso, i) => {
              const d = parseISO(iso);
              const isToday = iso === TODAY_ISO;
              return (
                <button key={iso + '-' + i}
                  onClick={() => setEditingISO(iso)}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', marginBottom: 6,
                    background: isToday ? '#fff8d8' : 'var(--paper)',
                    borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
                    boxShadow: '0 2px 6px rgba(42,29,18,0.06)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 13,
                    color: 'var(--ink)', minWidth: 56,
                  }}>{d.getMonth()+1}/{d.getDate()}</div>
                  <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)' }}>
                    {dayNamesFull[d.getDay()]}, {(-dayDiff(d, new Date())) === 0 ? 'today' : `${-dayDiff(d, new Date())}d ago`}
                  </div>
                  <div style={{ fontSize: 18 }}>{chore.emoji}</div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 9, color: 'var(--ink-soft)',
                    letterSpacing: '0.04em',
                  }}>EDIT</div>
                </button>
              );
            })}
          </div>

          <SectionHeader>Schedule</SectionHeader>
          <div style={{
            padding: 12,
            background: 'var(--paper)',
            borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
            boxShadow: '0 2px 6px rgba(42,29,18,0.06)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12, color: 'var(--ink)',
            lineHeight: 1.7,
          }}>
            FREQUENCY · {chore.frequency.toUpperCase()}<br/>
            CADENCE   · {cadenceSummary(chore)}<br/>
            LAST DONE · {chore.lastCompleted}<br/>
            NEXT DUE  · {chore.nextDue}
          </div>
        </div>
      </ScreenScroll>

      {editingISO && (
        <EditCompletionModal
          chore={chore}
          oldISO={editingISO}
          onClose={() => setEditingISO(null)}
          onSave={(oldISO, newISO) => {
            dispatch({ type: 'EDIT_COMPLETION', id: chore.id, oldISO, newISO });
            setEditingISO(null);
          }}
          onDelete={(oldISO) => {
            dispatch({ type: 'EDIT_COMPLETION', id: chore.id, oldISO, newISO: null });
            setEditingISO(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHARACTER SCREEN — profile, achievements, quests, settings
// ─────────────────────────────────────────────────────────────
function CharacterScreen({ state, dispatch, onSignOut }) {
  const { profile, achievements, questsWeekly } = state;
  const xpToNext = xpForLevel(profile.level + 1);
  const xpAtLevel = xpForLevel(profile.level);
  const unlocked = achievements.filter(a => a.unlocked);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const narrow = typeof window !== 'undefined' && window.innerWidth <= 380;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenScroll>
        <ScreenHeader title="Character" subtitle={`${profile.name} · ${profile.timezone}`} />

        {/* big hero room */}
        <div style={{
          margin: '0 16px',
          padding: 10,
          background: 'linear-gradient(180deg, #f8e8b5, #f0d896)',
          borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
          boxShadow: '0 6px 14px rgba(42,29,18,0.10)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', transform: 'scale(0.95)', transformOrigin: 'top center' }}>
            <Room messTier={state.messTier} hairTier={state.hairTier} scale={narrow ? 2.8 : 3.4} mood="happy" />
          </div>

          {/* HUD */}
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <PixBadge bg="var(--accent)" color="#fff" size={10}>LV {profile.level}</PixBadge>
            <div style={{ flex: 1 }}>
              <XPBar
                value={profile.xp - xpAtLevel}
                max={xpToNext - xpAtLevel}
                height={10}
                label={`${profile.xp - xpAtLevel} / ${xpToNext - xpAtLevel} XP`}
              />
            </div>
          </div>
          <div style={{
            marginTop: 10,
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: 6,
          }}>
            <div style={{ padding: '6px 4px', background: '#fff8e0', borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--ink)' }}>
              <PixCoin size={12} /> {profile.coins}
              <div style={{ fontSize: 8, opacity: 0.7, marginTop: 2 }}>COINS</div>
            </div>
            <div style={{ padding: '6px 4px', background: '#fff8e0', borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--ink)' }}>
              💇 LV {state.hairTier}
              <div style={{ fontSize: 8, opacity: 0.7, marginTop: 2 }}>HAIR</div>
            </div>
            <div style={{ padding: '6px 4px', background: '#fff8e0', borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--ink)' }}>
              ✨ {100 - state.messTier * 25}%
              <div style={{ fontSize: 8, opacity: 0.7, marginTop: 2 }}>ROOM</div>
            </div>
          </div>
        </div>

        {/* Weekly Quests */}
        <SectionHeader>Weekly Quests</SectionHeader>
        <div style={{ padding: '0 16px' }}>
          {questsWeekly.map(q => {
            const done = q.progress >= q.target;
            return (
              <div key={q.id} style={{
                padding: 12, marginBottom: 8,
                background: done ? '#e8f0d8' : 'var(--paper)',
                borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
                boxShadow: '0 4px 10px rgba(42,29,18,0.08)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{q.title}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>{q.progress}/{q.target}</div>
                </div>
                <XPBar value={q.progress} max={q.target} height={8} color={done ? 'var(--leaf)' : 'var(--gold)'} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-soft)', marginTop: 4 }}>
                  Reward: +{q.xp} XP · {q.coins} coins
                </div>
              </div>
            );
          })}
        </div>

        {/* Achievements */}
        <SectionHeader right={
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
            {unlocked.length}/{achievements.length}
          </span>
        }>Achievements</SectionHeader>
        <div style={{
          padding: '0 16px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
          gap: 8,
        }}>
          {achievements.map(a => (
            <div key={a.id} style={{
              padding: '10px 6px',
              background: a.unlocked ? 'var(--paper)' : 'var(--paper-deep)',
              borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
              boxShadow: '0 2px 6px rgba(42,29,18,0.06)',
              textAlign: 'center',
              opacity: a.unlocked ? 1 : 0.5,
              filter: a.unlocked ? 'none' : 'grayscale(1)',
            }}>
              <div style={{
                fontSize: 26, lineHeight: 1,
                filter: a.unlocked ? 'none' : 'brightness(0.3)',
              }}>{a.emoji}</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 8, color: 'var(--ink)',
                marginTop: 4, lineHeight: 1.2,
              }}>{a.title.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Settings */}
        <SectionHeader>Settings</SectionHeader>
        <div style={{ padding: '0 16px 24px' }}>
          {[
            { label: 'DAILY REMINDER', value: profile.reminderEnabled ? (profile.reminderTime || '').slice(0, 5) : 'Off', edit: true },
            { label: 'PUSH ENABLED',   value: profile.pushEnabled ? 'On' : 'Tap to enable', edit: true },
            { label: 'TIMEZONE',       value: profile.timezone, edit: false },
            { label: 'DISPLAY NAME',   value: profile.name, edit: true },
          ].map((s, i) => (
            <div key={i}
              onClick={s.edit ? () => setSettingsOpen(true) : undefined}
              role={s.edit ? 'button' : undefined}
              tabIndex={s.edit ? 0 : undefined}
              onKeyDown={s.edit ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSettingsOpen(true); }
              } : undefined}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', marginBottom: 6,
                background: 'var(--paper)',
                borderRadius: 12, border: '1.5px solid rgba(42,29,18,0.18)',
                boxShadow: '0 2px 6px rgba(42,29,18,0.06)',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--ink)',
                cursor: s.edit ? 'pointer' : 'default',
              }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.06em' }}>{s.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.value}{s.edit && <span style={{ color: 'var(--ink-soft)' }}>›</span>}
              </span>
            </div>
          ))}
          <button className="px-btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={onSignOut}>SIGN OUT</button>
          <div style={{
            marginTop: 12, padding: 10,
            border: '2px dashed var(--line-strong)',
            fontFamily: 'var(--font-body)', fontSize: 11,
            color: 'var(--ink-soft)', lineHeight: 1.4,
          }}>
            iOS users: add Pixie to your Home Screen first, then come back to enable push notifications. (iOS 16.4+)
          </div>
        </div>
      </ScreenScroll>

      {settingsOpen && (
        <SettingsModal
          profile={profile}
          onClose={() => setSettingsOpen(false)}
          onSave={(patch) => { dispatch({ type: 'SAVE_SETTINGS', patch }); setSettingsOpen(false); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BOTTOM TAB BAR
// ─────────────────────────────────────────────────────────────
function PixTabIcon({ kind, active }) {
  const c = active ? '#fbf3df' : '#2a1d12';
  const common = {
    width: 22, height: 22, viewBox: '0 0 24 24',
    fill: 'none', stroke: c, strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  if (kind === 'today') return (
    <svg {...common}>
      <circle cx={12} cy={12} r={4} />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
  if (kind === 'habits') return (
    <svg {...common}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
  if (kind === 'chores') return (
    <svg {...common}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z" />
      <path d="M5 16l.5 1.5L7 18l-1.5.5L5 20l-.5-1.5L3 18l1.5-.5L5 16z" />
    </svg>
  );
  if (kind === 'character') return (
    <svg {...common}>
      <circle cx={12} cy={8} r={4} />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function BottomTabBar({ active, onChange }) {
  const tabs = [
    { key: 'today',     label: 'TODAY' },
    { key: 'habits',    label: 'HABITS' },
    { key: 'chores',    label: 'CHORES' },
    { key: 'character', label: 'PIXIE' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 'calc(78px + var(--sab))',
      paddingBottom: 'var(--sab)',
      background: 'var(--paper-deep)',
      borderTop: '1.5px solid rgba(42,29,18,0.18)',
      display: 'flex', alignItems: 'flex-start',
      paddingTop: 6,
      zIndex: 30,
    }}>
      {tabs.map(t => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4,
              padding: '6px 0 14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}>
            <div style={{
              width: 44, height: 44,
              borderRadius: 14,
              background: isActive ? 'var(--accent)' : 'transparent',
              border: 'none',
              boxShadow: isActive ? '0 4px 10px rgba(217,111,71,0.35)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s ease, box-shadow 0.15s ease',
            }}>
              <PixTabIcon kind={t.key} active={isActive} />
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
              color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
            }}>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}

export {
  TodayScreen, HabitsListScreen, HabitDetailScreen,
  ChoresListScreen, ChoreDetailScreen, CharacterScreen,
  BottomTabBar, ScreenHeader, SectionHeader, ScreenScroll,
  TaskRow, PixBadge, PolaroidCalendar,
};
