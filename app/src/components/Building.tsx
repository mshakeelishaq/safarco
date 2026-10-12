// "Your plan is getting ready": shown once when a new plan is built, while the live road,
// weather, hotels and fuel load. It closes when they are in (at least ~3 s), or after 10 s regardless.
import { useEffect, useState } from 'react';
import { css } from '../lib/css';
import { t } from '../i18n';
import type { View } from '../view';

const ROAD = 'M14 128 C 54 132, 66 104, 108 108 S 168 134, 196 104 S 236 60, 286 42';
const MIN_MS = 2800, MAX_MS = 10000;

export function Building({ v, started, onDone }: { v: View; started: number; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 300); return () => clearInterval(id); }, []);
  const elapsed = now - started, allDone = v.buildSteps.every(x => x.done);
  const finished = (allDone && elapsed >= MIN_MS) || elapsed >= MAX_MS;
  useEffect(() => { if (finished) onDone(); }, [finished, onDone]);
  const tips = v.buildTips, tip = tips.length ? tips[Math.floor(elapsed / 3200) % tips.length] : '';
  const done = v.buildSteps.filter(x => x.done).length;

  return (
    <div role="dialog" aria-modal="true" aria-label={t('Your plan is getting ready…')} style={css('position:absolute;inset:0;z-index:45;background:var(--bg);color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 22px calc(30px + env(safe-area-inset-bottom));text-align:center')}>
      <div style={css('font-family:var(--fontH);font-weight:700;font-size:20px;letter-spacing:-.02em')}>Safar<span style={css('background:var(--wm);-webkit-background-clip:text;background-clip:text;color:transparent')}>Co</span></div>

      <div aria-hidden="true" style={css('position:relative;width:300px;height:160px;margin-top:22px;flex:none')}>
        <svg width="300" height="160" viewBox="0 0 300 160" style={css('position:absolute;inset:0')}>
          <g className="sc-cloud"><ellipse cx="70" cy="30" rx="22" ry="7" fill="var(--fill2)" /><ellipse cx="230" cy="20" rx="16" ry="5" fill="var(--fill2)" /></g>
          <path d="M0 150 L58 62 L92 104 L140 34 L188 98 L222 58 L300 150 Z" fill="var(--fill2)" />
          <path d="M140 34 L152 52 L146 50 L140 58 L134 50 L128 52 Z" fill="#FFFFFF" opacity=".85" />
          <path d="M58 62 L66 74 L58 72 L52 76 Z" fill="#FFFFFF" opacity=".7" />
          <path d="M0 160 L40 116 L86 140 L132 108 L176 144 L224 112 L300 160 Z" fill="var(--line2)" opacity=".7" />
          <path d={ROAD} fill="none" stroke="var(--line2)" strokeWidth="7" strokeLinecap="round" />
          <path d={ROAD} fill="none" stroke="var(--card)" strokeWidth="1.5" strokeDasharray="5 6" strokeLinecap="round" />
          <path d={ROAD} pathLength={1} className="sc-draw" fill="none" stroke="var(--g)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="1" />
          <circle cx="14" cy="128" r="5" fill="var(--g)" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="286" cy="42" r="5" fill="#FF5A72" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
        <div className="sc-drive" style={{ position: 'absolute', left: 0, top: 0, offsetPath: `path('${ROAD}')`, offsetAnchor: '50% 85%' } as React.CSSProperties}>
          <div className="sc-bob" style={css('width:34px;height:34px;border-radius:12px;background:var(--card);border:1px solid var(--line2);box-shadow:0 6px 14px -6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:21px;color:var(--g)')}><i className={`ph-fill ${v.vehIcon}`} /></div>
        </div>
        <div style={css('position:absolute;left:0;top:140px;font-size:11px;font-weight:800;color:var(--ink2);white-space:nowrap')}>{v.c.from}</div>
        <div style={css('position:absolute;right:0;top:14px;font-size:11px;font-weight:800;color:var(--ink2);white-space:nowrap')}>{v.c.to}</div>
      </div>

      <h1 style={css('margin:22px 0 0;font-family:var(--fontH);font-weight:600;font-size:24px;letter-spacing:-.02em')}>{t('Your plan is getting ready…')}</h1>
      <div style={css('font-size:13px;font-weight:600;color:var(--mute);margin-top:6px')}>{t('Checking live roads, weather and hotels. Just a few seconds.')}</div>

      <ul aria-live="polite" style={css('list-style:none;margin:20px 0 0;padding:14px 16px;border-radius:20px;background:var(--card);border:1px solid var(--line);width:100%;max-width:320px;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;text-align:left')}>
        {v.buildSteps.map(x => (
          <li key={x.key} style={css('display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;line-height:1.35')}>
            {x.done ? <i className="ph-fill ph-check-circle" style={css('font-size:19px;color:var(--g);flex:none')} />
              : <i className="ph-bold ph-circle-notch" style={css('font-size:17px;color:var(--mute);flex:none;margin:0 1px;animation:spin .8s linear infinite')} />}
            <span style={css(x.done ? '' : 'color:var(--ink2)')}>{x.label}</span>
          </li>
        ))}
      </ul>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={v.buildSteps.length} aria-valuenow={done} style={css('width:100%;max-width:320px;height:4px;border-radius:2px;background:var(--fill2);margin-top:12px;overflow:hidden')}>
        <div style={css(`height:100%;width:${Math.max(8, done / Math.max(1, v.buildSteps.length) * 100)}%;background:var(--g);border-radius:2px;transition:width .4s`)} />
      </div>

      {tip && <div key={tip} className="sc-fadein" style={css('margin-top:18px;max-width:320px;font-size:13px;font-weight:600;color:var(--ink2);line-height:1.5;display:flex;gap:8px;text-align:left')}><i className="ph-fill ph-lightbulb" style={css('font-size:17px;color:var(--amb);flex:none;margin-top:1px')} />{tip}</div>}
      <button onClick={onDone} style={css('margin-top:14px;min-height:40px;padding:0 14px;border:0;background:none;color:var(--mute);font-size:12px;font-weight:800;cursor:pointer')}>{t('Show my plan now')}</button>
    </div>
  );
}
