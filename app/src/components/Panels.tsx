// Bottom sheets for saving and sharing trips, signing in, and sending feedback.
import { useEffect, useState } from 'react';
import type { User } from '../cloud';
import { cloudEnabled } from '../cloud';
import { DST } from '../engine/places';
import { dayLabel } from '../engine/format';
import { css } from '../lib/css';
import { t } from '../i18n';
import type { SavedTrip } from '../trips';
import { IG_HANDLE, IG_MESSAGE, IG_PROFILE } from '../contact';
import { Grip, scrim, sheet } from './Sheets';

const btn = (primary: boolean) => css(`height:50px;padding:0 18px;border-radius:16px;border:${primary ? '0' : '1px solid var(--line2)'};background:${primary ? 'var(--cta)' : 'var(--fill)'};color:${primary ? 'var(--onCta)' : 'var(--ink)'};font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;width:100%`);
const input = css('width:100%;box-sizing:border-box;height:50px;border-radius:16px;border:1px solid var(--line2);background:var(--fill);padding:0 14px;font-size:15px;font-weight:600;color:var(--ink);outline:none');

function Panel({ open, onClose, title, sub, height, children }: { open: boolean; onClose: () => void; title: string; sub?: string; height: number; children: React.ReactNode }) {
  return <>
    <div onClick={onClose} style={scrim(open)} />
    <div role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open} inert={!open} className="sc-sheet" style={sheet(height, open)}>
      <Grip />
      <div style={css('display:flex;align-items:center;gap:12px;padding:12px 16px 8px 20px')}>
        <div style={css('flex:1;min-width:0')}><h2 style={css('margin:0;font-family:var(--fontH);font-size:17px;font-weight:600')}>{title}</h2>{sub && <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:3px;line-height:1.4')}>{sub}</div>}</div>
        <button onClick={onClose} aria-label={t('Close')} style={css('width:44px;height:44px;flex:none;border-radius:15px;border:1px solid var(--line);background:var(--fill);color:var(--ink);font-size:17px;cursor:pointer')}><i className="ph-bold ph-x" /></button>
      </div>
      <div style={css('flex:1;overflow-y:auto;scrollbar-width:none;padding:8px 20px calc(28px + env(safe-area-inset-bottom))')}>{children}</div>
    </div>
  </>;
}

const GoogleButton = ({ onClick, busy }: { onClick: () => void; busy?: boolean }) => (
  <button onClick={onClick} disabled={busy} style={css('height:52px;width:100%;border-radius:16px;border:1px solid var(--line2);background:#FFFFFF;color:#1F1F1F;font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px')}>
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
    {busy ? t('Opening Google…') : t('Continue with Google')}
  </button>
);

export function SaveSheet({ open, defaultName, isSaved, onSave, onClose }: { open: boolean; defaultName: string; isSaved: boolean; onSave: (name: string, asNew: boolean) => void; onClose: () => void }) {
  const [name, setName] = useState(defaultName);
  useEffect(() => { if (open) setName(defaultName); }, [open, defaultName]);
  return (
    <Panel open={open} onClose={onClose} height={330} title={isSaved ? t('Saved trip') : t('Save this trip')} sub={isSaved ? t('Changes you make are saved automatically.') : t('Keep it to open again later, even offline.')}>
      <label style={css('display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:6px 4px 8px')} htmlFor="trip-name">{t('Trip name')}</label>
      <input id="trip-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} style={input} className="focus-g" />
      <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:16px')}>
        <button onClick={() => onSave(name.trim() || defaultName, false)} style={btn(true)}><i className="ph-fill ph-bookmark-simple" />{isSaved ? t('Rename') : t('Save trip')}</button>
        {isSaved && <button onClick={() => onSave(name.trim() || defaultName, true)} style={btn(false)}><i className="ph-bold ph-copy" />{t('Save as a new trip')}</button>}
      </div>
    </Panel>
  );
}

export function SignInSheet({ open, onGoogle, onClose }: { open: boolean; onGoogle: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) setBusy(false); }, [open]);
  return (
    <Panel open={open} onClose={onClose} height={430} title={t('Keep your trips safe')} sub={t('Your trip is saved on this phone.')}>
      <div style={css('display:flex;flex-direction:column;gap:12px;margin-top:6px')}>
        {[['ph-devices', t('Open your trips on any phone or computer')], ['ph-shield-check', t('Don’t lose them if you clear your browser or change phone')], ['ph-lock-simple', t('Only you can see them')]].map(([icon, text]) => (
          <div key={icon} style={css('display:flex;gap:12px;align-items:center')}><i className={`ph-fill ${icon}`} style={css('font-size:22px;color:var(--g);flex:none')} /><div style={css('font-size:14px;font-weight:600;line-height:1.4;color:var(--ink2)')}>{text}</div></div>
        ))}
      </div>
      <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:20px')}>
        <GoogleButton busy={busy} onClick={() => { setBusy(true); onGoogle(); }} />
        <button onClick={onClose} style={btn(false)}>{t('Not now')}</button>
      </div>
      <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:12px;line-height:1.5;text-align:center')}>{t('By signing in you agree to the')} <a href="/terms">{t('Terms')}</a> {t('and')} <a href="/privacy">{t('Privacy policy')}</a>.</div>
    </Panel>
  );
}

export function TripsSheet({ open, trips, user, currentId, onOpen, onDelete, onShare, onNew, onSignIn, onSignOut, onFeedback, onAbout, onGuide, onClose }: {
  open: boolean; trips: SavedTrip[]; user: User | null; currentId: string | null;
  onOpen: (t: SavedTrip) => void; onDelete: (t: SavedTrip) => void; onShare: (t: SavedTrip) => void; onNew: () => void; onSignIn: () => void; onSignOut: () => void; onFeedback: () => void; onAbout: () => void; onGuide: () => void; onClose: () => void;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <Panel open={open} onClose={() => { setConfirm(null); onClose(); }} height={640} title={t('My trips')} sub={user ? t('Signed in as {email} · saved to your account', { email: user.email }) : t('Saved on this device')}>
      <button onClick={onNew} style={btn(true)}><i className="ph-bold ph-plus" />{t('Plan a new trip')}</button>
      {!trips.length && <div style={css('padding:24px 6px;font-size:14px;font-weight:600;color:var(--mute);line-height:1.5;text-align:center')}>{t('No saved trips yet. Tap')} <b>{t('Save')}</b> {t('on a trip to keep it here.')}</div>}
      <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
        {trips.map(tr => (
          <div key={tr.id} style={css(`border-radius:20px;padding:12px 14px;background:var(--fill);border:1px solid ${tr.id === currentId ? 'rgba(46,229,157,.5)' : 'var(--line)'}`)}>
            <button onClick={() => onOpen(tr)} style={css('display:block;width:100%;padding:0;border:0;background:none;color:var(--ink);text-align:left;cursor:pointer')}>
              <div style={css('font-size:15px;font-weight:800;line-height:1.3')}>{tr.name}</div>
              <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:3px')}>{dayLabel(tr.data.startDate, 0)} · {t('{n} days', { n: tr.data.days })} · {tr.data.groupSize > 1 ? t('{n} travellers', { n: tr.data.groupSize }) : t('{n} traveller', { n: tr.data.groupSize })} · {DST(tr.data.corridor).region}</div>
              <div style={css('font-size:11px;font-weight:700;color:var(--mute);margin-top:4px;display:flex;align-items:center;gap:5px')}><i className={`ph-fill ${tr.cloudId ? 'ph-cloud-check' : 'ph-device-mobile'}`} />{tr.cloudId ? t('In your account') : t('On this device')}{tr.id === currentId ? ' · ' + t('open now') : ''}</div>
            </button>
            <div style={css('display:flex;gap:8px;margin-top:10px')}>
              <button onClick={() => onOpen(tr)} style={css('flex:1;height:40px;border-radius:13px;border:0;background:var(--cta);color:var(--onCta);font-size:13px;font-weight:800;cursor:pointer')}>{t('Open')}</button>
              <button onClick={() => onShare(tr)} aria-label={t('Share {name}', { name: tr.name })} style={css('width:44px;height:40px;border-radius:13px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:16px;cursor:pointer')}><i className="ph-bold ph-share-network" /></button>
              {confirm === tr.id
                ? <button onClick={() => { setConfirm(null); onDelete(tr); }} style={css('height:40px;padding:0 12px;border-radius:13px;border:0;background:var(--cor);color:#fff;font-size:13px;font-weight:800;cursor:pointer')}>{t('Delete?')}</button>
                : <button onClick={() => setConfirm(tr.id)} aria-label={t('Delete {name}', { name: tr.name })} style={css('width:44px;height:40px;border-radius:13px;border:1px solid var(--line2);background:var(--fill);color:var(--ink2);font-size:16px;cursor:pointer')}><i className="ph-bold ph-trash" /></button>}
            </div>
          </div>
        ))}
      </div>
      {cloudEnabled && (
        <div style={css('margin-top:18px;padding-top:16px;border-top:1px solid var(--line)')}>
          {user
            ? <button onClick={onSignOut} style={btn(false)}><i className="ph-bold ph-sign-out" />{t('Sign out')}</button>
            : <><div style={css('font-size:13px;font-weight:600;color:var(--ink2);margin:0 4px 10px;line-height:1.45')}>{t('Sign in to keep trips on all your devices.')}</div><GoogleButton onClick={onSignIn} /></>}
        </div>
      )}
      <a href={IG_MESSAGE} target="_blank" rel="noopener" style={css('margin-top:18px;height:50px;border-radius:16px;background:linear-gradient(90deg,#F58529,#DD2A7B 45%,#8134AF 75%,#515BD4);color:#fff;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none')}><i className="ph-bold ph-instagram-logo" style={css('font-size:20px')} />{t('Contact us on Instagram')}</a>
      <div style={css('display:flex;flex-wrap:wrap;justify-content:center;gap:2px 10px;margin-top:18px;font-size:12px;font-weight:700')}>
        <button onClick={onGuide} style={css('padding:8px;border:0;background:none;color:var(--g);font-size:12px;font-weight:700;cursor:pointer')}>{t('Best time to go')}</button>
        <button onClick={onAbout} style={css('padding:8px;border:0;background:none;color:var(--g);font-size:12px;font-weight:700;cursor:pointer')}>{t('About SafarCo')}</button>
        <button onClick={onFeedback} style={css('padding:8px;border:0;background:none;color:var(--g);font-size:12px;font-weight:700;cursor:pointer')}>{t('Send feedback')}</button>
        <a href="/privacy" style={css('padding:8px;text-decoration:none')}>{t('Privacy')}</a>
        <a href="/terms" style={css('padding:8px;text-decoration:none')}>{t('Terms')}</a>
      </div>
      <div style={css('text-align:center;font-size:12px;font-weight:700;color:var(--mute);margin-top:4px')}><a href={IG_PROFILE} target="_blank" rel="noopener" style={css('display:inline-flex;align-items:center;gap:5px;color:inherit;text-decoration:none')}><i className="ph-bold ph-instagram-logo" />© {IG_HANDLE}</a></div>
    </Panel>
  );
}

export function FeedbackSheet({ open, onSend, onClose }: { open: boolean; onSend: (message: string, contact: string) => Promise<void>; onClose: () => void }) {
  const [msg, setMsg] = useState(''), [contact, setContact] = useState(''), [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  useEffect(() => { if (open) setState('idle'); }, [open]);
  return (
    <Panel open={open} onClose={onClose} height={520} title={t('Send feedback')} sub={t('Found a wrong road, price or place? Tell us and we’ll fix it.')}>
      {state === 'sent' ? (
        <div style={css('padding:30px 6px;text-align:center')}><i className="ph-fill ph-check-circle" style={css('font-size:44px;color:var(--g)')} /><div style={css('font-size:16px;font-weight:800;margin-top:10px')}>{t('Thank you!')}</div><div style={css('font-size:13px;color:var(--mute);font-weight:600;margin-top:4px')}>{t('We read every message.')}</div><div style={css('margin-top:18px')}><button onClick={onClose} style={btn(true)}>{t('Done')}</button></div></div>
      ) : <>
        <label htmlFor="fb-msg" style={css('display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:6px 4px 8px')}>{t('Your message')}</label>
        <textarea id="fb-msg" value={msg} onChange={e => setMsg(e.target.value)} maxLength={2000} rows={5} placeholder={t('e.g. The road to Kumrat is closed after Thal this month')} style={css('width:100%;box-sizing:border-box;border-radius:16px;border:1px solid var(--line2);background:var(--fill);padding:12px 14px;font:600 15px/1.45 var(--font);color:var(--ink);outline:none;resize:vertical')} className="focus-g" />
        <label htmlFor="fb-contact" style={css('display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:14px 4px 8px')}>{t('Email or WhatsApp (optional)')}</label>
        <input id="fb-contact" value={contact} onChange={e => setContact(e.target.value)} maxLength={200} placeholder={t('So we can reply')} style={input} className="focus-g" />
        {state === 'error' && <div role="alert" style={css('font-size:13px;font-weight:700;color:var(--cor);margin-top:10px')}>{t('Couldn’t send. Check your connection and try again.')}</div>}
        <div style={css('margin-top:16px')}><button disabled={!msg.trim() || state === 'sending'} onClick={() => { setState('sending'); onSend(msg.trim(), contact.trim()).then(() => { setState('sent'); setMsg(''); setContact(''); }, () => setState('error')); }} style={{ ...btn(true), opacity: msg.trim() ? 1 : .5 }}><i className="ph-fill ph-paper-plane-right" />{state === 'sending' ? t('Sending…') : t('Send')}</button></div>
              <a href={IG_MESSAGE} target="_blank" rel="noopener" style={css('display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;margin-top:8px;font-size:13px;font-weight:800;color:var(--g);text-decoration:none')}><i className="ph-bold ph-instagram-logo" />{t('Or message us on Instagram')}</a>
      </>}
    </Panel>
  );
}

export function ReviewSheet({ open, target, user, onGoogle, onSend, onClose }: {
  open: boolean; target: { kind: 'hotel' | 'driver'; name: string } | null; user: User | null;
  onGoogle: () => void; onSend: (rating: number, comment: string) => Promise<void>; onClose: () => void;
}) {
  const [stars, setStars] = useState(0), [text, setText] = useState(''), [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle'), [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setState('idle'); setStars(0); setText(''); setBusy(false); } }, [open, target?.name]);
  return (
    <Panel open={open} onClose={onClose} height={500} title={target ? t('Rate {name}', { name: target.name }) : t('Rate')} sub={t('Your review helps other travellers. SafarCo checks every review before it shows.')}>
      {!cloudEnabled ? <div style={css('font-size:14px;font-weight:600;color:var(--mute);padding:12px 4px')}>{t('Reviews aren’t set up yet.')}</div>
      : !user ? (
        <div style={css('display:flex;flex-direction:column;gap:12px;margin-top:6px')}>
          <div style={css('font-size:14px;font-weight:600;line-height:1.5;color:var(--ink2)')}>{t('Sign in with Google to leave a review. Only your first name is shown with it.')}</div>
          <GoogleButton busy={busy} onClick={() => { setBusy(true); onGoogle(); }} />
          <button onClick={onClose} style={btn(false)}>{t('Not now')}</button>
        </div>
      ) : state === 'sent' ? (
        <div style={css('padding:30px 6px;text-align:center')}><i className="ph-fill ph-check-circle" style={css('font-size:44px;color:var(--g)')} /><div style={css('font-size:16px;font-weight:800;margin-top:10px')}>{t('Thank you!')}</div><div style={css('font-size:13px;color:var(--mute);font-weight:600;margin-top:4px')}>{t('Your review shows once SafarCo has checked it.')}</div><div style={css('margin-top:18px')}><button onClick={onClose} style={btn(true)}>{t('Done')}</button></div></div>
      ) : <>
        <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:6px 4px 8px')}>{target?.kind === 'driver' ? t('How was your driver?') : t('How was your stay?')}</div>
        <div role="radiogroup" aria-label={t('Stars')} style={css('display:flex;gap:6px')}>
          {[1, 2, 3, 4, 5].map(i => <button key={i} role="radio" aria-checked={stars === i} aria-label={i > 1 ? t('{n} stars', { n: i }) : t('1 star')} onClick={() => setStars(i)} style={css(`width:52px;height:52px;border-radius:16px;border:1px solid var(--line2);background:var(--fill);font-size:26px;cursor:pointer;color:${i <= stars ? '#F2A007' : 'var(--line2)'}`)}><i className={`${i <= stars ? 'ph-fill' : 'ph-bold'} ph-star`} /></button>)}
        </div>
        <label htmlFor="rv-text" style={css('display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:16px 4px 8px')}>{t('What should others know? (optional)')}</label>
        <textarea id="rv-text" value={text} onChange={e => setText(e.target.value)} maxLength={600} rows={4} placeholder={target?.kind === 'driver' ? t('e.g. Safe driver, on time, fair price') : t('e.g. Clean rooms, hot water, friendly staff')} style={css('width:100%;box-sizing:border-box;border-radius:16px;border:1px solid var(--line2);background:var(--fill);padding:12px 14px;font:600 15px/1.45 var(--font);color:var(--ink);outline:none;resize:vertical')} className="focus-g" />
        {state === 'error' && <div role="alert" style={css('font-size:13px;font-weight:700;color:var(--cor);margin-top:10px')}>{t('Couldn’t send. Check your connection and try again.')}</div>}
        <div style={css('margin-top:16px')}><button disabled={!stars || state === 'sending'} onClick={() => { setState('sending'); onSend(stars, text.trim()).then(() => setState('sent'), () => setState('error')); }} style={{ ...btn(true), opacity: stars ? 1 : .5 }}><i className="ph-fill ph-paper-plane-right" />{state === 'sending' ? t('Sending…') : t('Send review')}</button></div>
      </>}
    </Panel>
  );
}
