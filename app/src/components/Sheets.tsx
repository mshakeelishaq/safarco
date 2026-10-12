import { css } from '../lib/css';
import { t } from '../i18n';
import type { Api, View } from '../view';
import { DateInput, RoomOpts } from './Onboarding';

const Label = ({ children, style = '' }: { children: React.ReactNode; style?: string }) =>
  <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);' + style)}>{children}</div>;

export const sheet = (h: number, open: boolean) => css(`position:absolute;left:0;right:0;bottom:0;height:${h}px;z-index:20;background:linear-gradient(180deg,var(--sheet),var(--sheet));backdrop-filter:blur(24px);border-radius:36px 36px 0 0;border-top:1px solid var(--line);box-shadow:${open ? '0 -30px 60px -20px rgba(0,0,0,.6)' : 'none'};visibility:${open ? 'visible' : 'hidden'};transform:${open ? 'translateY(0)' : 'translateY(105%)'};transition:transform .5s cubic-bezier(.2,.8,.2,1),visibility 0s linear ${open ? '0s' : '.5s'},box-shadow 0s linear ${open ? '0s' : '.5s'};display:flex;flex-direction:column`);
export const scrim = (open: boolean) => css(`position:absolute;inset:0;z-index:18;background:var(--scrim);opacity:${open ? 1 : 0};pointer-events:${open ? 'auto' : 'none'};transition:opacity .35s`);
export const Grip = () => <div style={css('width:40px;height:5px;border-radius:3px;background:var(--fill2);margin:10px auto 0')} />;


export function EditSheet({ v, api }: { v: View; api: Api }) {
  const open = v.s.settings, close = () => api.set({ settings: false });
  return <>
    <div onClick={close} style={scrim(open)} />
    <div data-screen-label="Edit trip" role="dialog" aria-modal="true" aria-label={t('Edit trip')} aria-hidden={!open} inert={!open} className="sc-sheet" style={sheet(660, open)}>
      <Grip />
      <div style={css('display:flex;align-items:center;gap:12px;padding:12px 16px 12px 20px')}>
        <div style={css('flex:1;min-width:0')}><h2 style={css('margin:0;font-family:var(--fontH);font-size:17px;font-weight:600')}>{t('Edit trip')}</h2><div style={css('font-size:12px;font-weight:700;color:var(--mute);margin-top:3px;font-variant-numeric:tabular-nums')}>PKR {v.totalNum} ({v.totalUsd}) · {v.health.label}</div></div>
        <button onClick={close} style={css('height:44px;padding:0 18px;border-radius:15px;border:0;background:var(--cta);color:var(--onCta);font-size:14px;font-weight:800;cursor:pointer')}>{t('Done')}</button>
      </div>
      <div style={css('flex:1;overflow-y:auto;scrollbar-width:none;padding:4px 20px 30px')}>
        <div style={css('display:flex;flex-direction:column;gap:16px')}>
          <Label>{t('Transport')}</Label>
          <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
            {v.vehChips.map(c => <button key={c.key} onClick={c.onClick} title={c.full} aria-label={c.full} aria-pressed={v.s.vehicle === c.key} aria-disabled={c.op < 1} style={css(`height:64px;border-radius:17px;border:1px solid ${c.border};background:${c.bg};color:${c.fg};cursor:pointer;box-shadow:${c.shadow};opacity:${c.op};transition:all .25s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:0 2px`)}><i className={`ph-fill ${c.icon}`} style={css('font-size:22px')} /><span style={css('font-size:11px;font-weight:800;white-space:nowrap')}>{c.label}</span></button>)}
          </div>
          <Label style="margin-top:4px">{t('Stays')}</Label>
          <div style={css('display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;border-radius:17px;background:var(--deep)')}>
            {v.tierChips.map(t => <button key={t.key} onClick={t.onClick} aria-pressed={v.s.tier === t.key} style={css(`height:44px;border-radius:13px;border:0;background:${t.bg};color:${t.fg};font-size:13px;font-weight:800;cursor:pointer;transition:all .25s`)}>{t.label}</button>)}
          </div>
          <RoomOpts v={v} compact />
          {v.hasFamilyNote && <div style={css('font-size:12px;color:var(--amb2);font-weight:600;line-height:1.45')}>{v.familyNote}</div>}
          <Label style="margin-top:4px">{t('Travellers, days & budget')}</Label>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:10px')}><div style={css('font-size:15px;font-weight:700')}>{t('Start date')}</div><DateInput v={v} set={api.set} /></div>
          {v.steppers.map(st => (
            <div key={st.key} style={css('display:flex;align-items:center;justify-content:space-between')}>
              <div style={css('font-size:15px;font-weight:700')}>{st.label}</div>
              <div style={css('display:flex;align-items:center;gap:10px')}>
                <button onClick={st.dec} aria-label={t('Decrease {label}', { label: st.label })} style={css('width:44px;height:44px;border-radius:50%;border:1px solid var(--line2);background:var(--fill);color:var(--ink);cursor:pointer;font-size:15px')}><i className="ph-bold ph-minus" /></button>
                <div style={css('min-width:52px;text-align:center;font-family:var(--fontH);font-size:16px;font-weight:600;font-variant-numeric:tabular-nums')}>{st.value}</div>
                <button onClick={st.inc} aria-label={t('Increase {label}', { label: st.label })} style={css('width:44px;height:44px;border-radius:50%;border:0;background:var(--cta);color:var(--onCta);cursor:pointer;font-size:15px')}><i className="ph-bold ph-plus" /></button>
              </div>
            </div>
          ))}
          <button onClick={() => api.set({ lite: !v.s.lite })} role="switch" aria-checked={v.s.lite} style={css('display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 12px;border-radius:16px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);text-align:left;cursor:pointer')}>
            <i className="ph-fill ph-lightning" style={css('font-size:20px;color:var(--amb);flex:none')} />
            <span style={css('flex:1;min-width:0')}><span style={css('display:block;font-size:14px;font-weight:800')}>{t('Data saver')}</span><span style={css('display:block;font-size:12px;font-weight:600;color:var(--mute);margin-top:1px')}>{t('Turns off the 3D mountains. Faster on slow phones and networks.')}</span></span>
            <span aria-hidden="true" style={css(`flex:none;width:46px;height:28px;border-radius:14px;background:${v.s.lite ? 'var(--g)' : 'var(--line2)'};position:relative;transition:background .2s`)}><span style={css(`position:absolute;top:3px;left:${v.s.lite ? 21 : 3}px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .2s`)} /></span>
          </button>
          <Label style="margin-top:4px">{t('Theme')}</Label>
          <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:4px;border-radius:17px;background:var(--deep)')}>
            {v.themeChips.map(t => <button key={t.key} onClick={t.onClick} aria-pressed={v.s.theme === t.key} style={css(`height:44px;border-radius:13px;border:0;background:${t.bg};color:${t.fg};font-size:13px;font-weight:800;cursor:pointer;transition:all .25s`)}>{t.label}</button>)}
          </div>
          <Label style="margin-top:14px">{t('Language')}</Label>
          <div style={css('display:grid;grid-template-columns:repeat(2,1fr);gap:4px;padding:4px;border-radius:17px;background:var(--deep)')}>
            {v.langChips.map(t => <button key={t.key} onClick={t.onClick} aria-pressed={t.on} style={css(`height:44px;border-radius:13px;border:0;background:${t.bg};color:${t.fg};font-size:13px;font-weight:800;cursor:pointer;transition:all .25s`)}>{t.label}</button>)}
          </div>
        </div>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:22px')}>
          <button onClick={() => api.set({ settings: false, sheet: 'trips' })} style={css('height:50px;border-radius:16px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px')}><i className="ph-fill ph-bookmarks-simple" />{t('My trips')}</button>
          <button onClick={() => api.set({ settings: false, sheet: 'feedback' })} style={css('height:50px;border-radius:16px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px')}><i className="ph-fill ph-chat-circle-text" />{t('Feedback')}</button>
        </div>
        <button onClick={v.restart} style={css('margin-top:10px;width:100%;height:50px;border-radius:16px;border:1px solid var(--line2);background:var(--fill);color:var(--ink2);font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px')}><i className="ph-bold ph-plus" />{t('Plan a new trip')}</button>
      </div>
    </div>
  </>;
}
