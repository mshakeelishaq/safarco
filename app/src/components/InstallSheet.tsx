// The steps to put SafarCo on the home screen, for this phone: iPhone (Safari or Chrome), Android,
// a laptop, or the Instagram / Facebook in-app browser, which can't install and needs a real browser first.
import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { installHow, onInstallChange, onInstallOpen, type InstallHow } from '../install';

const STEPS: Record<Exclude<InstallHow, 'installed' | 'prompt'>, { icon: string; text: string }[]> = {
  'ios-safari': [
    { icon: 'ph-export', text: 'Tap the Share button at the bottom of Safari (on iPad, at the top).' },
    { icon: 'ph-plus-square', text: 'Scroll down and tap “Add to Home Screen”.' },
    { icon: 'ph-check-circle', text: 'Tap “Add”. SafarCo is now on your home screen.' }
  ],
  'ios-other': [
    { icon: 'ph-export', text: 'Tap the Share button in the address bar, at the top right.' },
    { icon: 'ph-plus-square', text: 'Tap “Add to Home Screen”. If you don’t see it, open safarco.pk in Safari.' },
    { icon: 'ph-check-circle', text: 'Tap “Add”. SafarCo is now on your home screen.' }
  ],
  android: [
    { icon: 'ph-dots-three-vertical', text: 'In Chrome, tap the ⋮ menu at the top right.' },
    { icon: 'ph-download-simple', text: 'Tap “Install app” or “Add to Home screen”.' },
    { icon: 'ph-check-circle', text: 'Tap “Install”. SafarCo is now on your home screen.' }
  ],
  inapp: [
    { icon: 'ph-dots-three', text: 'Tap the ⋯ menu at the top right of this screen.' },
    { icon: 'ph-arrow-square-out', text: 'Tap “Open in browser” (or “Open in Chrome” / “Open in Safari”).' },
    { icon: 'ph-download-simple', text: 'There, tap “Install” again to add SafarCo.' }
  ],
  desktop: [
    { icon: 'ph-browser', text: 'Open safarco.pk in Chrome or Edge.' },
    { icon: 'ph-download-simple', text: 'Click the install icon at the right of the address bar, or the menu → “Install SafarCo”.' },
    { icon: 'ph-check-circle', text: 'SafarCo opens in its own window, like an app.' }
  ]
};
const TITLE: Record<string, string> = { 'ios-safari': 'Add SafarCo to your iPhone', 'ios-other': 'Add SafarCo to your iPhone', android: 'Install SafarCo on Android', inapp: 'Open SafarCo in your browser first', desktop: 'Install SafarCo on this computer' };

/** Mounted once per page; opens when anything calls startInstall() and there's no browser prompt. */
export function InstallHost() {
  const [open, setOpen] = useState(false), [, bump] = useState(0), [copied, setCopied] = useState(false);
  useEffect(() => onInstallOpen(() => { setCopied(false); setOpen(true); }), []);
  useEffect(() => onInstallChange(() => bump(x => x + 1)), []);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [open]);
  const how = installHow();
  if (!open || how === 'installed' || how === 'prompt') return null;
  const copy = () => { navigator.clipboard?.writeText('https://www.safarco.pk/app').then(() => setCopied(true)).catch(() => {}); };
  return (
    <div role="dialog" aria-modal="true" aria-label={t(TITLE[how])} data-sc="1" data-theme="paper" onClick={() => setOpen(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,18,17,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 12 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, boxSizing: 'border-box', borderRadius: 26, background: 'var(--card)', color: 'var(--ink)', padding: 20, fontFamily: 'var(--font)', boxShadow: '0 30px 60px -20px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/icon-192.png" alt="" width={48} height={48} style={{ borderRadius: 12, flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>{t(TITLE[how])}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mute)', marginTop: 2 }}>{how === 'inapp' ? t('This app’s built-in browser can’t install SafarCo.') : t('Free, no app store. Your plan works offline in the mountains.')}</div>
          </div>
          <button onClick={() => setOpen(false)} aria-label={t('Close')} style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, border: '1px solid var(--line2)', background: 'var(--fill)', color: 'var(--ink)', fontSize: 18, cursor: 'pointer' }}><i className="ph-bold ph-x" /></button>
        </div>
        <ol style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS[how].map((s, i) => <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 16, background: 'var(--fill)' }}>
            <span style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', background: '#0B5F7C', color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{t(s.text)}</span>
            <i className={`ph-bold ${s.icon}`} style={{ flex: 'none', fontSize: 24, color: '#0B5F7C' }} />
          </li>)}
        </ol>
        {how === 'inapp' && <button onClick={copy} style={{ marginTop: 12, width: '100%', minHeight: 46, borderRadius: 14, border: '1px solid var(--line2)', background: 'var(--fill)', color: 'var(--ink)', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}><i className={`ph-bold ${copied ? 'ph-check' : 'ph-copy'}`} /> {copied ? t('Link copied. Paste it in Chrome or Safari.') : t('Copy the link')}</button>}
        {how === 'android' && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mute)', marginTop: 12, lineHeight: 1.45 }}>{t('Samsung Internet: tap the ≡ menu, then “Add page to” → “Home screen”.')}</div>}
        <button onClick={() => setOpen(false)} style={{ marginTop: 14, width: '100%', minHeight: 48, borderRadius: 14, border: 0, background: '#0B5F7C', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>{t('Got it')}</button>
      </div>
    </div>
  );
}
