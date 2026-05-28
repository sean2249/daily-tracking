import React from 'react';
import { supabase } from '../lib/supabase.js';
import { Avatar } from '../pixel.jsx';

// Where Supabase should send users after they click an email confirmation /
// recovery link. Must match this app's deployed path (GitHub Pages serves it
// under import.meta.env.BASE_URL, e.g. /daily-tracking/) and be present in the
// project's Auth "Redirect URLs" allowlist — otherwise Supabase falls back to
// the Site URL and the link lands on the wrong page (a 404).
const EMAIL_REDIRECT_TO = window.location.origin + import.meta.env.BASE_URL;

// Map a returned auth error (e.g. from an expired email link) to friendly copy.
function readAuthErrorFromUrl() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  if (!hash) return null;
  const p = new URLSearchParams(hash);
  const code = p.get('error_code');
  const desc = p.get('error_description');
  if (!p.get('error') && !code && !desc) return null;
  if (code === 'otp_expired') {
    return 'That email link has expired or was already used. Sign in below, or create your account again to get a fresh link.';
  }
  return desc || 'Sign-in link could not be used. Please try again.';
}

function Field({ label, type, value, onChange, placeholder, onEnter }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '0.08em',
        color: 'var(--ink-soft)', marginBottom: 4,
      }}>{label.toUpperCase()}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        style={{
          width: '100%', padding: '10px 12px',
          fontFamily: 'var(--font-body)', fontSize: 15,
          background: 'var(--paper)', color: 'var(--ink)',
          border: '2px solid var(--ink)', boxShadow: '2px 2px 0 var(--ink)',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    </label>
  );
}

export function AuthScreen() {
  const [mode, setMode] = React.useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null); // { kind: 'error'|'info', text }

  // Surface an error carried back in the URL (e.g. an expired confirmation link
  // redirected here as #error=...&error_code=otp_expired), then clean the URL.
  React.useEffect(() => {
    const text = readAuthErrorFromUrl();
    if (text) {
      setMsg({ kind: 'error', text });
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const submit = async () => {
    if (busy) return;
    if (!email || !password) { setMsg({ kind: 'error', text: 'Enter an email and password.' }); return; }
    setBusy(true); setMsg(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: EMAIL_REDIRECT_TO },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg({ kind: 'info', text: 'Account created! Check your email to confirm, then sign in.' });
          setMode('signin');
        }
        // if a session exists, the onAuthStateChange listener in App routes us in
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setMsg({ kind: 'error', text: e?.message || 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      background: `
        radial-gradient(600px 400px at 50% 16%, #fff3c4 0%, transparent 60%),
        linear-gradient(180deg, #f4dca0 0%, #e6c989 100%)
      `,
      padding: 'var(--auth-pad) 24px calc(var(--sab) + 28px)', position: 'relative',
    }}>
      <div className="scanlines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <div style={{ animation: 'bob 2s ease-in-out infinite' }}>
        <Avatar hairTier={0} mood="happy" scale={4} />
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--ink)',
        letterSpacing: '0.04em', marginTop: 12,
      }}>PIXIE</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--ink-soft)',
        letterSpacing: '0.12em', marginTop: 4,
      }}>DAILY · 我的每日</div>

      <div style={{ width: '100%', maxWidth: 300, marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" onEnter={submit} />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" onEnter={submit} />

        {msg && (
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.4,
            padding: '8px 10px',
            color: msg.kind === 'error' ? '#fff' : 'var(--ink)',
            background: msg.kind === 'error' ? 'var(--accent-2)' : 'var(--paper)',
            border: '2px solid var(--ink)', boxShadow: '2px 2px 0 var(--ink)',
          }}>{msg.text}</div>
        )}

        <button className="px-btn" onClick={submit} disabled={busy}
          style={{ marginTop: 4, padding: 14, fontSize: 14, opacity: busy ? 0.7 : 1 }}>
          {busy ? '···' : (mode === 'signup' ? '▶ CREATE ACCOUNT' : '▶ SIGN IN')}
        </button>

        <button
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMsg(null); }}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.06em',
            color: 'var(--ink-soft)', marginTop: 2,
          }}>
          {mode === 'signup' ? 'HAVE AN ACCOUNT? SIGN IN' : 'NEW HERE? CREATE ACCOUNT'}
        </button>
      </div>

      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-soft)',
        textAlign: 'center', marginTop: 'auto', maxWidth: 260, lineHeight: 1.4,
      }}>
        Your habits and chores stay private to your account.
      </div>
    </div>
  );
}
