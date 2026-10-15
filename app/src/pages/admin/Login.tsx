// The admin's sign-in: email and password (set in Supabase), a reset link by email, and setting a new password.
// Signing in alone gives nothing: only emails in the Supabase "admins" table can read the admin data or save.
import { useState } from 'react';
import { css } from '../../lib/css';
import { sendPasswordReset, signInWithGoogle, signInWithPassword, updatePassword } from '../../cloud';
import { btn, lbl, text } from './ui';

const card = css('max-width:420px;margin-top:20px;padding:22px;border-radius:20px;background:var(--card);border:1px solid var(--line);display:grid;gap:14px');
const msg = (bad: boolean) => css(`margin:0;font-size:14px;font-weight:700;line-height:1.45;color:${bad ? 'var(--cor)' : 'var(--g)'}`);
/** Supabase's messages, in plain words. */
const plain = (e: unknown) => {
  const m = (e as Error)?.message || '';
  if (/invalid login/i.test(m)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(m)) return 'This email isn’t confirmed yet. In Supabase, open Authentication → Users and confirm it.';
  if (/rate|too many/i.test(m)) return 'Too many tries. Wait a few minutes, then try again.';
  if (/weak|at least|characters/i.test(m)) return 'Use a longer password: at least 10 characters, with letters and numbers.';
  return m || 'Something went wrong. Try again.';
};

export function Login() {
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false), [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const go = async () => {
    if (!email.trim() || !pw) { setNote({ text: 'Enter your email and password.', bad: true }); return; }
    setBusy(true); setNote(null);
    try { await signInWithPassword(email, pw); } catch (e) { setNote({ text: plain(e), bad: true }); setPw(''); }
    setBusy(false);
  };
  const reset = async () => {
    if (!email.trim()) { setNote({ text: 'Enter your email first, then tap “Forgot password?”.', bad: true }); return; }
    setBusy(true);
    try { await sendPasswordReset(email); setNote({ text: 'If this email is an admin account, a link to set a new password is on its way.', bad: false }); }
    catch (e) { setNote({ text: plain(e), bad: true }); }
    setBusy(false);
  };
  return (
    <form onSubmit={e => { e.preventDefault(); go(); }} style={card}>
      <h2 style={css('margin:0;font-size:20px')}>Admin sign-in</h2>
      <label style={lbl}>Email<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={text} autoFocus /></label>
      <div style={css('display:flex;gap:6px;align-items:flex-end')}>
        <label style={{ ...lbl, flex: 1 }}>Password<input type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} style={text} /></label>
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} style={btn(false)}>{show ? 'Hide' : 'Show'}</button>
      </div>
      {note && <p role="status" style={msg(note.bad)}>{note.text}</p>}
      <button type="submit" disabled={busy} style={btn(true)}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <div style={css('display:flex;gap:14px;flex-wrap:wrap;font-size:14px')}>
        <button type="button" onClick={reset} disabled={busy} style={css('border:0;background:none;padding:0;color:var(--g);font-weight:700;cursor:pointer')}>Forgot password?</button>
        <button type="button" onClick={() => signInWithGoogle('/admin')} style={css('border:0;background:none;padding:0;color:var(--mute);font-weight:700;cursor:pointer')}>Use Google instead</button>
      </div>
    </form>
  );
}

/** After the reset link: choose a new password. */
export function NewPassword({ done }: { done: () => void }) {
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [note, setNote] = useState<{ text: string; bad: boolean } | null>(null), [busy, setBusy] = useState(false);
  const strong = pw.length >= 10 && /[a-z]/i.test(pw) && /\d/.test(pw);
  const go = async () => {
    if (!strong) { setNote({ text: 'Use at least 10 characters, with letters and numbers.', bad: true }); return; }
    if (pw !== pw2) { setNote({ text: 'The two passwords don’t match.', bad: true }); return; }
    setBusy(true);
    try { await updatePassword(pw); setNote({ text: 'Password changed.', bad: false }); setTimeout(done, 800); } catch (e) { setNote({ text: plain(e), bad: true }); }
    setBusy(false);
  };
  return (
    <form onSubmit={e => { e.preventDefault(); go(); }} style={card}>
      <h2 style={css('margin:0;font-size:20px')}>Set a new password</h2>
      <label style={lbl}>New password<input type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} style={text} autoFocus /></label>
      <label style={lbl}>The same again<input type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} style={text} /></label>
      <p style={css(`margin:0;font-size:13px;font-weight:600;color:${strong ? 'var(--g)' : 'var(--mute)'}`)}>At least 10 characters, with letters and numbers.</p>
      {note && <p role="status" style={msg(note.bad)}>{note.text}</p>}
      <button type="submit" disabled={busy} style={btn(true)}>Save new password</button>
    </form>
  );
}
