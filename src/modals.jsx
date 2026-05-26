// modals.jsx — Onboarding, AddForm, Achievement modal, LevelUp modal

import React from 'react';
import { Avatar, Room } from './pixel.jsx';
import { parseISO, addDays, isoDate } from './data.jsx';
import { pushSupported, pushPermission, enablePush, disablePush } from './lib/push.js';

// Backdrop with pixel feel
function ModalBackdrop({ children, onClose }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(42,29,18,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
    onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ONBOARDING — sign-up + first habit prompt
// ─────────────────────────────────────────────────────────────
function OnboardingScreen({ onFinish }) {
  const [step, setStep] = React.useState(0);  // 0 = title, 1 = signup, 2 = first habit
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [habit, setHabit] = React.useState({ name: '', emoji: '✨', schedule: 'daily' });

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: `
        radial-gradient(600px 400px at 50% 18%, #fff3c4 0%, transparent 60%),
        linear-gradient(180deg, #f4dca0 0%, #e6c989 100%)
      `,
      paddingTop: 64,
      paddingBottom: 28,
    }}>
      <div className="scanlines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {step === 0 && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, gap: 14,
          textAlign: 'center',
        }}>
          <div style={{ animation: 'bob 2s ease-in-out infinite' }}>
            <Avatar hairTier={0} mood="happy" scale={5} />
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36, color: 'var(--ink)',
            letterSpacing: '0.04em',
            marginTop: 10,
          }}>PIXIE</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 11, color: 'var(--ink-soft)',
            letterSpacing: '0.12em',
          }}>DAILY · 我的每日</div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15, color: 'var(--ink)',
            marginTop: 12, maxWidth: 260, lineHeight: 1.45,
          }}>
            A tiny tracker for your habits and chores.<br/>
            Be consistent, and Pixie thrives.
          </div>
          <button
            className="px-btn"
            style={{ marginTop: 24, padding: '14px 28px', fontSize: 14 }}
            onClick={() => setStep(1)}>
            ▶ BEGIN
          </button>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10, color: 'var(--ink-soft)',
            position: 'absolute', bottom: 90, left: 0, right: 0,
            textAlign: 'center',
          }}>v0.1 · PRESS START</div>
        </div>
      )}

      {step === 1 && (
        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => setStep(0)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: 10,
              color: 'var(--ink-soft)', alignSelf: 'flex-start',
              padding: 4, letterSpacing: '0.06em',
            }}>← BACK</button>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20, color: 'var(--ink)',
          }}>Welcome, traveler.</div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14, color: 'var(--ink-soft)',
            marginBottom: 12,
          }}>Pick a display name. Your data stays private to you.</div>
          <PixField label="Display name" value={name} onChange={setName} placeholder="Pixie's owner" />
          <PixField label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <PixField label="Password" value="●●●●●●●●" onChange={()=>{}} type="text" disabled />
          <button
            className="px-btn"
            style={{ marginTop: 14, padding: 14, fontSize: 14 }}
            onClick={() => setStep(2)}>
            ▶ CONTINUE
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => setStep(1)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: 10,
              color: 'var(--ink-soft)', alignSelf: 'flex-start',
              padding: 4, letterSpacing: '0.06em',
            }}>← BACK</button>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18, color: 'var(--ink)',
          }}>Your first habit</div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45,
          }}>One small thing you'd like to do <i>every day</i>. Pick a quick one.</div>

          {/* preset chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0' }}>
            {[
              {emoji: '💧', name: 'Drink water', en: 'Drink water'},
              {emoji: '📖', name: '閱讀', en: 'Read'},
              {emoji: '🧘', name: '靜坐', en: 'Meditate'},
              {emoji: '🚶', name: 'Walk', en: 'Walk 20 min'},
              {emoji: '🛌', name: '早睡', en: 'Sleep by 11'},
            ].map(p => (
              <button
                key={p.name}
                onClick={() => setHabit({ ...habit, emoji: p.emoji, name: p.name, en: p.en })}
                style={{
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  background: habit.name === p.name ? 'var(--accent)' : 'var(--paper)',
                  color: habit.name === p.name ? '#fff' : 'var(--ink)',
                  border: '2px solid var(--ink)',
                  boxShadow: '2px 2px 0 var(--ink)',
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}>{p.emoji} {p.name}</button>
            ))}
          </div>

          <PixField label="Habit name" value={habit.name} onChange={v => setHabit({...habit, name: v})} placeholder="e.g. 閱讀" />

          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 9,
            color: 'var(--ink-soft)', letterSpacing: '0.08em',
            marginTop: 4,
          }}>SCHEDULE</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              {key:'daily', label:'EVERY DAY'},
              {key:'weekdays', label:'WEEKDAYS'},
              {key:'custom', label:'PICK DAYS'},
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setHabit({...habit, schedule: s.key})}
                style={{
                  flex: 1, padding: '8px 4px',
                  fontFamily: 'var(--font-display)', fontSize: 9,
                  background: habit.schedule === s.key ? 'var(--accent)' : 'var(--paper)',
                  color: habit.schedule === s.key ? '#fff' : 'var(--ink)',
                  border: '2px solid var(--ink)',
                  boxShadow: '2px 2px 0 var(--ink)',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}>{s.label}</button>
            ))}
          </div>

          <button
            className="px-btn"
            style={{ marginTop: 'auto', padding: 14, fontSize: 14 }}
            onClick={() => onFinish({ name: name || 'Pixie\'s Owner', firstHabit: habit })}>
            ▶ CREATE & ENTER
          </button>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--ink-soft)', textAlign: 'center',
          }}>You'll unlock 🌱 First Steps</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Form field — pixel style
// ─────────────────────────────────────────────────────────────
function PixField({ label, value, onChange, placeholder, type = 'text', disabled = false }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 9, letterSpacing: '0.08em',
        color: 'var(--ink-soft)', marginBottom: 4,
      }}>{label.toUpperCase()}</div>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          background: disabled ? 'var(--paper-deep)' : 'var(--paper)',
          color: 'var(--ink)',
          border: '2px solid var(--ink)',
          boxShadow: '2px 2px 0 var(--ink)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD/EDIT FORM (habit or chore)
// ─────────────────────────────────────────────────────────────
const HABIT_EMOJI = ['📖','🧘','🎵','💧','🚶','🛌','🏃','🪥','🍎','💪','🌱','✍️','🎨','📝','🎮','☕','🧠','💊'];
const CHORE_EMOJI = ['🧹','🧺','🗑️','🪒','👕','🧴','🛒','🧽','🚿','🔥','🍳','🧯','🛏️','🪴','📦','📬','💡','🔧'];
const COLORS = ['#d96f47','#e5a93a','#6a9c4a','#88c4d9','#d97a8f','#9989c5','#5d8aa8','#c95a32'];

function AddItemModal({ kind, onClose, onSave }) {
  const isHabit = kind === 'habit';
  const [form, setForm] = React.useState({
    name: '',
    emoji: isHabit ? '📖' : '🧹',
    color: COLORS[0],
    schedule: isHabit ? 'daily' : null,
    weekdays: [0,1,2,3,4,5,6],
    frequency: isHabit ? null : 'weekly',
    interval: 1,
    dayOfMonth: 1,
    reminderTime: '',
    notes: '',
  });

  const emojiSet = isHabit ? HABIT_EMOJI : CHORE_EMOJI;
  const dn = ['S','M','T','W','T','F','S'];

  const toggleWeekday = (i) => {
    const ws = form.weekdays.includes(i)
      ? form.weekdays.filter(d => d !== i)
      : [...form.weekdays, i];
    setForm({ ...form, weekdays: ws });
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{
        width: 340, maxWidth: '100%',
        background: 'var(--bg)',
        border: '3px solid var(--ink)',
        boxShadow: '6px 6px 0 var(--ink)',
      }}>
        {/* title bar */}
        <div style={{
          padding: '10px 14px',
          background: 'var(--accent)',
          borderBottom: '3px solid var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13, color: '#fff',
            letterSpacing: '0.06em',
          }}>NEW {isHabit ? 'HABIT' : 'CHORE'}</div>
          <button onClick={onClose} aria-label="Close dialog" style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#fff', fontFamily: 'var(--font-display)',
            fontSize: 13,
          }}><span aria-hidden="true">✕</span></button>
        </div>

        <div style={{
          padding: 16,
          maxHeight: 540, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <PixField label="Name" value={form.name} onChange={v => setForm({...form, name: v})}
                    placeholder={isHabit ? '靜坐 / Read / Meditate' : '打掃 / Trash / Laundry'} />

          {/* Emoji */}
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 9,
              color: 'var(--ink-soft)', letterSpacing: '0.08em',
              marginBottom: 4,
            }}>ICON</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(9, 1fr)',
              gap: 4,
              padding: 6,
              background: 'var(--paper)',
              border: '2px solid var(--ink)',
              boxShadow: '2px 2px 0 var(--ink)',
            }}>
              {emojiSet.map(e => (
                <button
                  key={e}
                  onClick={() => setForm({...form, emoji: e})}
                  style={{
                    aspectRatio: '1',
                    fontSize: 17,
                    background: form.emoji === e ? form.color : 'transparent',
                    border: form.emoji === e ? '2px solid var(--ink)' : '2px solid transparent',
                    cursor: 'pointer',
                  }}>{e}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          {isHabit && (
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 9,
                color: 'var(--ink-soft)', letterSpacing: '0.08em',
                marginBottom: 4,
              }}>COLOR</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm({...form, color: c})}
                    style={{
                      flex: 1, height: 28,
                      background: c,
                      border: form.color === c ? '3px solid var(--ink)' : '2px solid var(--ink)',
                      boxShadow: form.color === c ? '0 0 0 2px #fbf3df, 2px 2px 0 var(--ink)' : '2px 2px 0 var(--ink)',
                      cursor: 'pointer',
                    }}/>
                ))}
              </div>
            </div>
          )}

          {/* Schedule / Frequency */}
          {isHabit ? (
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 9,
                color: 'var(--ink-soft)', letterSpacing: '0.08em',
                marginBottom: 4,
              }}>SCHEDULE</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[{k:'daily', l:'EVERY DAY'},{k:'weekdays', l:'WEEKDAYS'},{k:'custom', l:'CUSTOM'}].map(o => (
                  <button key={o.k}
                    onClick={() => {
                      const wd = o.k === 'daily' ? [0,1,2,3,4,5,6]
                              : o.k === 'weekdays' ? [1,2,3,4,5]
                              : form.weekdays;
                      setForm({...form, schedule: o.k, weekdays: wd});
                    }}
                    style={{
                      flex: 1, padding: '6px 0',
                      fontFamily: 'var(--font-display)', fontSize: 8,
                      letterSpacing: '0.04em',
                      background: form.schedule === o.k ? 'var(--accent)' : 'var(--paper)',
                      color: form.schedule === o.k ? '#fff' : 'var(--ink)',
                      border: '2px solid var(--ink)',
                      boxShadow: '2px 2px 0 var(--ink)',
                      cursor: 'pointer',
                    }}>{o.l}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {dn.map((d, i) => (
                  <button key={i}
                    disabled={form.schedule !== 'custom'}
                    onClick={() => toggleWeekday(i)}
                    style={{
                      flex: 1, height: 32,
                      fontFamily: 'var(--font-display)', fontSize: 11,
                      background: form.weekdays.includes(i) ? 'var(--leaf)' : 'var(--paper)',
                      color: form.weekdays.includes(i) ? '#fff' : 'var(--ink)',
                      border: '2px solid var(--ink)',
                      boxShadow: '2px 2px 0 var(--ink)',
                      opacity: form.schedule === 'custom' ? 1 : 0.65,
                      cursor: form.schedule === 'custom' ? 'pointer' : 'default',
                    }}>{d}</button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 9,
                color: 'var(--ink-soft)', letterSpacing: '0.08em',
                marginBottom: 4,
              }}>FREQUENCY</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[{k:'daily', l:'DAILY'},{k:'weekly', l:'WEEKLY'},{k:'monthly', l:'MONTHLY'}].map(o => (
                  <button key={o.k}
                    onClick={() => setForm({...form, frequency: o.k})}
                    style={{
                      flex: 1, padding: '8px 0',
                      fontFamily: 'var(--font-display)', fontSize: 9,
                      letterSpacing: '0.04em',
                      background: form.frequency === o.k ? 'var(--accent)' : 'var(--paper)',
                      color: form.frequency === o.k ? '#fff' : 'var(--ink)',
                      border: '2px solid var(--ink)',
                      boxShadow: '2px 2px 0 var(--ink)',
                      cursor: 'pointer',
                    }}>{o.l}</button>
                ))}
              </div>
              {form.frequency === 'weekly' && (
                <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                  {dn.map((d, i) => (
                    <button key={i} onClick={() => toggleWeekday(i)}
                      style={{
                        flex: 1, height: 32,
                        fontFamily: 'var(--font-display)', fontSize: 11,
                        background: form.weekdays.includes(i) ? 'var(--leaf)' : 'var(--paper)',
                        color: form.weekdays.includes(i) ? '#fff' : 'var(--ink)',
                        border: '2px solid var(--ink)',
                        boxShadow: '2px 2px 0 var(--ink)',
                        cursor: 'pointer',
                      }}>{d}</button>
                  ))}
                </div>
              )}
              {form.frequency === 'monthly' && (
                <div style={{ marginTop: 6 }}>
                  <PixField label="Day of month" value={String(form.dayOfMonth)}
                    onChange={v => setForm({...form, dayOfMonth: Math.max(1, Math.min(28, +v||1))})} />
                </div>
              )}
            </div>
          )}

          <PixField label="Reminder time (optional)" value={form.reminderTime} placeholder="07:00"
                    onChange={v => setForm({...form, reminderTime: v})} />

          {!isHabit && (
            <PixField label="Notes" value={form.notes} onChange={v => setForm({...form, notes: v})}
                      placeholder="(optional)" />
          )}
        </div>

        <div style={{
          padding: 12,
          borderTop: '3px solid var(--ink)',
          background: 'var(--paper-deep)',
          display: 'flex', gap: 8,
        }}>
          <button className="px-btn ghost" onClick={onClose} style={{ flex: 1, fontSize: 12 }}>CANCEL</button>
          <button className="px-btn" onClick={() => onSave(form)} style={{ flex: 2, fontSize: 12 }} disabled={!form.name}>
            CREATE
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENT MODAL
// ─────────────────────────────────────────────────────────────
function AchievementModal({ achievement, onClose }) {
  if (!achievement) return null;
  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{
        width: 280,
        background: 'var(--paper)',
        border: '4px solid var(--ink)',
        boxShadow: '6px 6px 0 var(--ink)',
        position: 'relative',
        animation: 'pop-in 0.4s cubic-bezier(.4,1.6,.5,1)',
      }}>
        <div style={{
          padding: '10px 12px',
          background: 'var(--gold)',
          borderBottom: '3px solid var(--ink)',
          fontFamily: 'var(--font-display)',
          fontSize: 12, color: 'var(--ink)',
          letterSpacing: '0.06em',
          textAlign: 'center',
        }}>★ ACHIEVEMENT UNLOCKED ★</div>
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            width: 84, height: 84,
            background: 'var(--paper-deep)',
            border: '3px solid var(--ink)',
            boxShadow: '3px 3px 0 var(--ink)',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 44,
            animation: 'glow 1.4s ease-in-out infinite',
          }}>{achievement.emoji}</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 18,
            color: 'var(--ink)', marginTop: 14,
            letterSpacing: '0.02em',
          }}>{achievement.title}</div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 14,
            color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.4,
          }}>{achievement.desc}</div>
          <button className="px-btn" style={{ marginTop: 18, padding: '10px 20px' }} onClick={onClose}>NICE</button>
        </div>
        {/* sparkles around */}
        {[[-6,-6],[280,-6],[-6,200],[280,200]].map(([x,y], i) => (
          <div key={i} style={{
            position: 'absolute', left: x, top: y,
            width: 14, height: 14,
            background: 'var(--gold)',
            transform: 'rotate(45deg)',
            animation: `sparkle 1.8s ease-in-out ${i*0.3}s infinite`,
          }} />
        ))}
      </div>
    </ModalBackdrop>
  );
}

// ─────────────────────────────────────────────────────────────
// LEVEL-UP MODAL
// ─────────────────────────────────────────────────────────────
function LevelUpModal({ level, onClose }) {
  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{
        width: 280, textAlign: 'center',
        background: 'var(--paper)',
        border: '4px solid var(--ink)',
        boxShadow: '6px 6px 0 var(--ink)',
        padding: '24px 16px',
        animation: 'pop-in 0.45s cubic-bezier(.4,1.6,.5,1)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 12,
          color: 'var(--accent-2)', letterSpacing: '0.1em',
        }}>★ LEVEL UP ★</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 64,
          color: 'var(--ink)', marginTop: 8, lineHeight: 1,
          textShadow: '4px 4px 0 var(--accent)',
        }}>LV.{level}</div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
          <Avatar hairTier={0} mood="happy" scale={4} bob />
        </div>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 13,
          color: 'var(--ink-soft)', marginTop: 14,
        }}>Pixie grew a little stronger.</div>
        <button className="px-btn" onClick={onClose} style={{ marginTop: 18 }}>CONTINUE</button>
      </div>
    </ModalBackdrop>
  );
}

// ─────────────────────────────────────────────────────────────
// PERFECT DAY BANNER (in-flow celebration)
// ─────────────────────────────────────────────────────────────
function PerfectDayModal({ onClose }) {
  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{
        width: 300, textAlign: 'center',
        background: 'var(--paper)',
        border: '4px solid var(--ink)',
        boxShadow: '6px 6px 0 var(--ink)',
        padding: '24px 16px',
        animation: 'pop-in 0.5s cubic-bezier(.4,1.6,.5,1)',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.1em' }}>★ PERFECT DAY ★</div>
        <div style={{ marginTop: 10 }}>
          <Room messTier={0} hairTier={0} scale={2.6} mood="happy" />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', marginTop: 14 }}>EVERY TASK CLEAR!</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)', marginTop: 6 }}>+50 XP bonus · ⭐ achievement</div>
        <button className="px-btn gold" onClick={onClose} style={{ marginTop: 18 }}>WONDERFUL</button>
      </div>
    </ModalBackdrop>
  );
}

// ─────────────────────────────────────────────────────────────
// EDIT COMPLETION MODAL — change a chore's completion date or delete it
// ─────────────────────────────────────────────────────────────
function EditCompletionModal({ chore, oldISO, onClose, onSave, onDelete }) {
  const [date, setDate] = React.useState(() => parseISO(oldISO));
  const todayDate = new Date();

  const shift = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    // don't allow future dates
    if (d > todayDate) return;
    setDate(d);
  };

  const dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  // build a 14-day strip ending today
  const strip = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(todayDate, -i);
    strip.push(d);
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{
        width: 320,
        background: 'var(--bg)',
        border: '3px solid var(--ink)',
        boxShadow: '6px 6px 0 var(--ink)',
      }}>
        {/* title bar */}
        <div style={{
          padding: '10px 14px',
          background: 'var(--accent)',
          borderBottom: '3px solid var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13, color: '#fff', letterSpacing: '0.06em',
          }}>EDIT COMPLETION</div>
          <button onClick={onClose} aria-label="Close dialog" style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: 13,
          }}><span aria-hidden="true">✕</span></button>
        </div>

        <div style={{ padding: 16 }}>
          {/* chore preview */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: 10,
            background: 'var(--paper)',
            border: '2px solid var(--ink)',
            boxShadow: '2px 2px 0 var(--ink)',
            marginBottom: 14,
          }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--paper-deep)',
              border: '2px solid var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>{chore.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{chore.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-soft)' }}>Originally · {oldISO}</div>
            </div>
          </div>

          {/* current date display + ±1 arrows */}
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 9,
            color: 'var(--ink-soft)', letterSpacing: '0.08em',
            marginBottom: 6,
          }}>COMPLETED ON</div>
          <div style={{
            display: 'flex', alignItems: 'stretch', gap: 6,
            marginBottom: 14,
          }}>
            <button onClick={() => shift(-1)} className="px-btn ghost"
                    style={{ padding: '0 14px', fontSize: 16 }}>−</button>
            <div style={{
              flex: 1,
              padding: '12px 10px',
              background: 'var(--paper)',
              border: '2px solid var(--ink)',
              boxShadow: '2px 2px 0 var(--ink)',
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 16, color: 'var(--ink)',
            }}>
              {dn[date.getDay()]} · {date.getMonth()+1}/{date.getDate()} · {date.getFullYear()}
            </div>
            <button onClick={() => shift(1)} className="px-btn ghost"
                    style={{ padding: '0 14px', fontSize: 16 }}
                    disabled={isoDate(date) === isoDate(todayDate)}>+</button>
          </div>

          {/* 14-day strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
            marginBottom: 14,
          }}>
            {strip.map(d => {
              const isSel = isoDate(d) === isoDate(date);
              const isToday = isoDate(d) === isoDate(todayDate);
              return (
                <button key={isoDate(d)}
                  onClick={() => setDate(d)}
                  style={{
                    padding: '6px 0',
                    fontFamily: 'var(--font-display)',
                    fontSize: 9,
                    letterSpacing: '0.04em',
                    background: isSel ? 'var(--accent)' : (isToday ? 'var(--gold)' : 'var(--paper)'),
                    color: isSel ? '#fff' : 'var(--ink)',
                    border: '2px solid var(--ink)',
                    boxShadow: '2px 2px 0 var(--ink)',
                    cursor: 'pointer',
                  }}>
                  <div style={{ opacity: 0.7 }}>{dn[d.getDay()].slice(0,1)}</div>
                  <div style={{ fontSize: 11, marginTop: 1 }}>{d.getDate()}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{
          padding: 12,
          borderTop: '3px solid var(--ink)',
          background: 'var(--paper-deep)',
          display: 'flex', gap: 8,
        }}>
          <button className="px-btn ghost" onClick={() => onDelete(oldISO)}
                  style={{ flex: 1, fontSize: 11, background: '#f4c2b8' }}>
            DELETE
          </button>
          <button className="px-btn" onClick={() => onSave(oldISO, isoDate(date))}
                  style={{ flex: 2, fontSize: 12 }}>
            SAVE
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

// ─────────────────────────────────────────────────────────────
// UNDO TOAST — appears briefly after a chore is completed
// ─────────────────────────────────────────────────────────────
function UndoToast({ toast, onUndo, onDismiss }) {
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [toast?.ts]);

  if (!toast) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 92,  // above bottom tab bar
      left: 16, right: 16,
      zIndex: 150,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      background: 'var(--ink)',
      color: '#fbf3df',
      border: '3px solid var(--ink)',
      boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
      animation: 'drop-in 0.3s ease-out',
    }}>
      <div style={{ fontSize: 20 }}>✓</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
        }}>{toast.label} · marked done</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          opacity: 0.6, marginTop: 2,
        }}>Wrong date? Tap UNDO or edit in history.</div>
      </div>
      <button
        onClick={() => onUndo(toast.id)}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11, letterSpacing: '0.06em',
          background: 'var(--gold)',
          color: 'var(--ink)',
          border: '2px solid var(--gold)',
          padding: '6px 10px',
          cursor: 'pointer',
        }}>UNDO</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SETTINGS — display name, daily reminder, push notifications
// ─────────────────────────────────────────────────────────────
function PixToggle({ on, onClick, label }) {
  return (
    <button onClick={onClick} aria-pressed={on} aria-label={label} style={{
      width: 52, height: 28, padding: 3,
      background: on ? 'var(--leaf, #6a9c4a)' : 'var(--paper-deep)',
      border: '2px solid var(--ink)', boxShadow: '2px 2px 0 var(--ink)',
      cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: on ? 'flex-end' : 'flex-start',
    }}>
      <span aria-hidden="true" style={{ width: 18, height: 18, background: 'var(--ink)' }} />
    </button>
  );
}

function SettingsModal({ profile, onClose, onSave, onPushChange }) {
  const [name, setName] = React.useState(profile.name || '');
  const [remOn, setRemOn] = React.useState(!!profile.reminderEnabled);
  const [remTime, setRemTime] = React.useState((profile.reminderTime || '07:00').slice(0, 5));
  const [pushOn, setPushOn] = React.useState(!!profile.pushEnabled);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  const supported = pushSupported();
  const perm = supported ? pushPermission() : 'unsupported';

  const handlePush = async () => {
    setBusy(true); setMsg('');
    try {
      if (!pushOn) {
        const r = await enablePush();
        if (r.ok) { setPushOn(true); if (onPushChange) onPushChange(true); setMsg('Notifications are on.'); }
        else setMsg(r.reason || 'Could not enable notifications.');
      } else {
        await disablePush();
        setPushOn(false); if (onPushChange) onPushChange(false); setMsg('Notifications are off.');
      }
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{
        width: 340, maxWidth: '100%',
        background: 'var(--bg)', border: '3px solid var(--ink)', boxShadow: '6px 6px 0 var(--ink)',
      }}>
        <div style={{
          padding: '10px 14px', background: 'var(--accent)', borderBottom: '3px solid var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: '#fff', letterSpacing: '0.06em' }}>SETTINGS</div>
          <button onClick={onClose} aria-label="Close settings" style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: 13,
          }}><span aria-hidden="true">✕</span></button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 560, overflowY: 'auto' }}>
          <PixField label="Display name" value={name} onChange={setName} placeholder="You" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '0.08em', color: 'var(--ink-soft)' }}>DAILY REMINDER</div>
            <PixToggle on={remOn} onClick={() => setRemOn(v => !v)} label="Daily reminder" />
          </div>
          {remOn && <PixField label="Reminder time" type="time" value={remTime} onChange={setRemTime} />}

          <div style={{ borderTop: '2px dashed var(--line-strong)', paddingTop: 12 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '0.08em', color: 'var(--ink-soft)', marginBottom: 8 }}>PUSH NOTIFICATIONS</div>
            {!supported ? (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                Not supported in this browser. On iPhone, add Pixie to your Home Screen first (iOS 16.4+), then reopen and try again.
              </div>
            ) : (
              <>
                <button className="px-btn" disabled={busy} onClick={handlePush} style={{ width: '100%' }}>
                  {busy ? '…' : pushOn ? 'DISABLE NOTIFICATIONS' : 'ENABLE NOTIFICATIONS'}
                </button>
                {perm === 'denied' && !pushOn && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--accent)', marginTop: 6, lineHeight: 1.4 }}>
                    Notifications are blocked in your browser settings — allow them for this site, then try again.
                  </div>
                )}
                {msg && <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.4 }}>{msg}</div>}
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="px-btn ghost" onClick={onClose} style={{ flex: 1, fontSize: 12 }}>CANCEL</button>
            <button className="px-btn" style={{ flex: 2, fontSize: 12 }}
              onClick={() => onSave({
                displayName: name.trim() || 'You',
                reminderEnabled: remOn,
                reminderTime: remTime,
                pushEnabled: pushOn,
              })}>
              SAVE
            </button>
          </div>
        </div>
      </div>
    </ModalBackdrop>
  );
}

export {
  OnboardingScreen,
  ModalBackdrop, PixField,
  AddItemModal, AchievementModal, LevelUpModal, PerfectDayModal,
  EditCompletionModal, UndoToast, SettingsModal,
};
