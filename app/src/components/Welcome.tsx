// First-visit welcome: what SafarCo is for, before the planning questions start.
// Shown once per device; "About SafarCo" in My trips opens it again.
import { IG_HANDLE, IG_PROFILE } from '../contact';
import { css } from '../lib/css';
import { t } from '../i18n';

export const WELCOMED = 'safarco-welcomed';
export const seenWelcome = () => { try { return localStorage.getItem(WELCOMED) === '1'; } catch { return true; } };

// A function so the text is translated at render time (the language can change).
const points = (): [string, string, string][] => [
  ['ph-wallet', t('Places that fit your budget'), t('Tell it your money and days. It shows where you can really go, with the full cost in rupees and dollars.')],
  ['ph-calendar-check', t('A plan for every day'), t('Route, stops, food breaks, sights and a hotel for each night, worked out for your family or group.')],
  ['ph-cloud-sun', t('Know before you go'), t('Weather along the road, mountain passes, road closures, sunset times and what to pack.')],
  ['ph-wifi-slash', t('Ready for no signal'), t('Save the route map on your phone for valleys with no coverage.')]
];

export function Welcome({ open, onStart, onGuide, langLabel, onLang }: { open: boolean; onStart: () => void; onGuide: () => void; langLabel: string; onLang: () => void }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={t('Welcome to SafarCo')} style={css('position:absolute;inset:0;z-index:40;overflow-y:auto;scrollbar-width:none;background:radial-gradient(120% 70% at 50% 0%,#12809F 0%,#0B5F7C 50%,#08435A 100%);color:#fff')}>
      <div className="sc-flow" style={css('min-height:100%;box-sizing:border-box;display:flex;flex-direction:column;padding:calc(48px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))')}>
        <div style={css('display:flex;align-items:flex-start;justify-content:space-between;gap:12px')}>
        <img src="/icon.svg" alt="" width="76" height="76" style={css('border-radius:20px;box-shadow:0 20px 40px -16px rgba(0,0,0,.6)')} />
        <button onClick={onLang} style={css('min-height:40px;padding:0 14px;border-radius:14px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px')}><i className="ph-bold ph-translate" />{langLabel}</button>
        </div>
        <h1 style={css('margin:22px 0 0;font-family:var(--fontH);font-weight:600;font-size:30px;line-height:1.15;letter-spacing:-.02em')}>{t('Want to travel, but not sure where you can go?')}</h1>
        <p style={css('margin:12px 0 0;font-size:16px;line-height:1.5;font-weight:500;opacity:.9')}>{t('SafarCo plans your trip across Pakistan around what you have: your budget, your days and who’s coming. You see where you can go and exactly what it takes, before you leave home.')}</p>
        <div style={css('display:flex;flex-direction:column;gap:14px;margin-top:24px')}>
          {points().map(([icon, title, text]) => (
            <div key={icon} style={css('display:flex;gap:14px;align-items:flex-start')}>
              <div style={css('width:42px;height:42px;flex:none;border-radius:14px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:21px;color:#FFD27A')}><i className={`ph-fill ${icon}`} /></div>
              <div><div style={css('font-size:15px;font-weight:800')}>{title}</div><div style={css('font-size:13px;line-height:1.45;font-weight:500;opacity:.85;margin-top:2px')}>{text}</div></div>
            </div>
          ))}
        </div>
        <a href={IG_PROFILE} target="_blank" rel="noopener" style={css('align-self:flex-start;display:inline-flex;align-items:center;gap:6px;min-height:40px;margin-top:16px;color:rgba(255,255,255,.85);font-size:12px;font-weight:700;text-decoration:none')}><i className="ph-bold ph-instagram-logo" />© {IG_HANDLE}</a>
        <div style={css('flex:1;min-height:16px')} />
        <div style={css('position:sticky;bottom:calc(-24px - env(safe-area-inset-bottom));margin:0 -24px calc(-24px - env(safe-area-inset-bottom));padding:16px 24px calc(16px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(8,67,90,0),#08435A 30%)')}>
        <button onClick={onStart} style={css('width:100%;height:56px;border-radius:18px;border:0;background:#FFC75F;color:#2A1A00;font-size:16px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 16px 32px -14px rgba(255,199,95,.8)')}>{t('Start planning')}<i className="ph-bold ph-arrow-right" /></button>
        <button onClick={onGuide} style={css('width:100%;margin-top:8px;height:46px;border-radius:16px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px')}><i className="ph-fill ph-leaf" />{t('Where’s best this season?')}</button>
        <div style={css('margin-top:10px;text-align:center;font-size:12px;font-weight:600;opacity:.75')}>{t('Free for everyone. No sign-up needed.')}</div>
        </div>
      </div>
    </div>
  );
}
