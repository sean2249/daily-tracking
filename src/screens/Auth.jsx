import React from 'react';
import { supabase } from '../lib/supabase.js';
import { SCALES } from '../data.jsx';

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

function BrandMark() {
  const c = SCALES.green.c;
  const sq = (bg) => <span style={{ width: 13, height: 13, borderRadius: 4, background: bg, display: 'block' }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
        {sq(c[2])}{sq(c[4])}{sq(c[3])}{sq(c[1])}
      </div>
      <span style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 27, letterSpacing: '-0.03em', color: 'var(--text)' }}>Daily</span>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, onEnter }) {
  return (
    <label style={{ display: 'block' }}>
      <div className="field-label">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        className="text-input"
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
    <div className="screen" style={{ justifyContent: 'center' }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 26, padding: 'calc(var(--safe-top) + 40px) 28px calc(28px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <BrandMark />
          <div style={{ fontFamily: 'var(--font)', fontSize: 14, color: 'var(--text-2)' }}>Habit &amp; principle tracker</div>
        </div>

        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" onEnter={submit} />
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" onEnter={submit} />

          {msg && (
            <div style={{
              fontFamily: 'var(--font)', fontSize: 13.5, lineHeight: 1.45, padding: '11px 13px', borderRadius: 12,
              color: msg.kind === 'error' ? '#fff' : 'var(--text)',
              background: msg.kind === 'error' ? '#d4493f' : 'var(--surface-2)',
              border: msg.kind === 'error' ? 'none' : '1px solid var(--border)',
            }}>{msg.text}</div>
          )}

          <button className="btn-block btn-fill" onClick={submit} disabled={busy} style={{ marginTop: 4, opacity: busy ? 0.7 : 1 }}>
            {busy ? '···' : (mode === 'signup' ? 'Create account' : 'Sign in')}
          </button>

          <button
            onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMsg(null); }}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)', marginTop: 2,
            }}>
            {mode === 'signup' ? 'Have an account? Sign in' : 'New here? Create account'}
          </button>
        </div>

        <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text-3)', textAlign: 'center', maxWidth: 260, lineHeight: 1.4 }}>
          Your habits and principles stay private to your account.
        </div>
      </div>
    </div>
  );
}
