import { css } from '../lib/css';
import { t } from '../i18n';
import type { Api, View } from '../view';
import { DateInput, RoomOpts, SearchBox } from './Onboarding';

const Label = ({ children, style = '' }: { children: React.ReactNode; style?: string }) =>
  <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);' + style)}>{children}</div>;

export const sheet = (h: number, open: boolean) => css(`position:absolute;left:0;right:0;bottom:0;height:${h}px;max-height:92%;z-index:20;background:linear-gradient(180deg,var(--sheet),var(--sheet));backdrop-filter:blur(24px);border-radius:36px 36px 0 0;border-top:1px solid var(--line);box-shadow:${open ? '0 -30px 60px -20px rgba(0,0,0,.6)' : 'none'};visibility:${open ? 'visible' : 'hidden'};transform:${open ? 'translateY(0)' : 'translateY(105%)'};transition:transform .5s cubic-bezier(.2,.8,.2,1),visibility 0s linear ${open ? '0s' : '.5s'},box-shadow 0s linear ${open ? '0s' : '.5s'};display:flex;flex-direction:column`);
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
          <Label>{t('Destination')}</Label>
          <button onClick={v.openDestChange} style={css('display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 12px;border-radius:16px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);text-align:left;cursor:pointer')}>
            <i className="ph-fill ph-map-pin" style={css('font-size:20px;color:var(--cor);flex:none')} />
            <span style={css('flex:1;min-width:0;font-size:15px;font-weight:800')}>{v.c.to}</span>
            <span style={css('flex:none;font-size:13px;font-weight:800;color:var(--g)')}>{t('Change')}</span>
          </button>
          <Label style="margin-top:4px">{t('Transport')}</Label>
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

/** Change destination: pick the new place, then say what happens to this plan (saving it is the suggestion). */
export function DestSheet({ v, api }: { v: View; api: Api }) {
  const dc = v.destChange, open = !!dc;
  const choice = (key: string, icon: string, title: string, sub: string, onClick: () => void, first = false) => (
    <button key={key} onClick={onClick} style={css(`display:flex;gap:12px;align-items:flex-start;width:100%;padding:14px;border-radius:18px;border:1px solid ${first ? 'rgba(46,229,157,.55)' : 'var(--line2)'};background:${first ? 'rgba(46,229,157,.10)' : 'var(--fill)'};color:var(--ink);text-align:left;cursor:pointer`)}>
      <i className={`ph-fill ${icon}`} style={css(`font-size:22px;color:${first ? 'var(--g)' : 'var(--ink2)'};flex:none;margin-top:1px`)} />
      <span style={css('flex:1;min-width:0')}>
        <span style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:14px;font-weight:800;line-height:1.35')}>{title}{first && <span style={css('font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:7px;background:var(--g);color:#04210F')}>{t('Suggested')}</span>}</span>
        <span style={css('display:block;font-size:12px;font-weight:600;color:var(--mute);margin-top:3px;line-height:1.4')}>{sub}</span>
      </span>
    </button>
  );
  return <>
    <div onClick={dc?.close} style={scrim(open)} />
    <div data-screen-label="Change destination" role="dialog" aria-modal="true" aria-label={t('Change destination')} aria-hidden={!open} inert={!open} className="sc-sheet" style={sheet(660, open)}>
      <Grip />
      <div style={css('display:flex;align-items:center;gap:12px;padding:12px 16px 8px 20px')}>
        {dc?.pick && <button onClick={dc.back} aria-label={t('Pick another place')} style={css('width:44px;height:44px;flex:none;border-radius:15px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);cursor:pointer')}><i className="ph-bold ph-caret-left" /></button>}
        <div style={css('flex:1;min-width:0')}><h2 style={css('margin:0;font-family:var(--fontH);font-size:17px;font-weight:600')}>{t('Change destination')}</h2><div style={css('font-size:12px;font-weight:700;color:var(--mute);margin-top:3px')}>{dc ? t('Now: {place}', { place: dc.cur }) : ''}</div></div>
        <button onClick={dc?.close} style={css('height:44px;padding:0 16px;border-radius:15px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:14px;font-weight:800;cursor:pointer')}>{t('Close')}</button>
      </div>
      <div style={css('flex:1;overflow-y:auto;scrollbar-width:none;padding:4px 20px 30px')}>
        {dc && !dc.pick && <>
          <SearchBox value={v.s.dq} onChange={dq => api.set({ dq })} onClear={() => api.set({ dq: '' })} placeholder={t('Search any place, e.g. Neelum, Ziarat')} label={t('Search destination')} focus="focus-amb" />
          <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:16px 4px 6px')}>{v.destListLabel}</div>
          <div style={css('display:flex;flex-direction:column;gap:2px')}>
            {v.destRows.map(r => (
              <button key={r.key} onClick={r.onClick} className="hov-fill" style={css('display:flex;align-items:center;gap:12px;min-height:56px;padding:6px 12px;border-radius:16px;border:1px solid transparent;background:transparent;color:var(--ink);text-align:left;cursor:pointer')}>
                <i className={`ph-fill ${r.icon}`} style={css('font-size:20px;color:var(--mute);flex:none')} />
                <span style={css('flex:1;min-width:0;display:flex;flex-direction:column')}><span style={css('font-size:15px;font-weight:700')}>{r.name}</span><span style={css('font-size:12px;font-weight:600;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{r.sub}</span>{r.risk && <span style={css('font-size:11px;font-weight:700;color:var(--cor)')}>{r.risk}</span>}</span>
                <span style={css('flex:none;font-size:12px;font-weight:700;color:var(--ink2);font-variant-numeric:tabular-nums;white-space:nowrap')}>{r.meta}</span>
              </button>
            ))}
          </div>
          {v.noDest && <div style={css('padding:16px 12px;font-size:14px;color:var(--mute);font-weight:600;line-height:1.45')}>{t('No place found. Try the nearest town or district city.')}</div>}
        </>}
        {dc && dc.pick && <div style={css('display:flex;flex-direction:column;gap:10px')}>
          <div style={css('font-size:15px;font-weight:800;line-height:1.4;margin:4px 2px 4px')}>{dc.during ? t('You’re on your {place} trip now. Add {next} as a stop?', { place: dc.cur, next: dc.pick }) : t('Your {place} plan: what should we do with it?', { place: dc.cur })}</div>
          {!dc.during && choice('new', 'ph-bookmark-simple', dc.saved ? t('{place} is saved. Plan {next} as a new trip', { place: dc.cur, next: dc.pick }) : t('Save {place} and plan {next} as a new trip', { place: dc.cur, next: dc.pick }),
            t('Your {place} plan stays in My trips, just as it is. {next} starts with the same dates, people, car and budget.', { place: dc.cur, next: dc.pick }), () => api.changeDest?.('new'), true)}
          {!dc.during && choice('switch', 'ph-arrows-left-right', t('Switch this trip to {next}', { next: dc.pick }),
            t('{place} is replaced. Dates, people, car and budget stay; places you added and nights on the road start fresh.', { place: dc.cur }), () => api.changeDest?.('switch'))}
          {dc.canAdd && choice('add', 'ph-plus-circle', t('Add {next} to this trip', { next: dc.pick }),
            dc.during ? t('Your days so far stay as they are; the rest of the trip goes on to {next}.', { next: dc.pick }) : t('{place}, then {next}, in one trip.', { place: dc.cur, next: dc.pick }), () => api.changeDest?.('add'), dc.during)}
          {dc.need && <div style={css('display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border-radius:14px;background:rgba(255,181,71,.12);font-size:12px;font-weight:700;line-height:1.45;color:var(--ink2)')}><i className="ph-fill ph-calendar-plus" style={css('font-size:16px;color:var(--amb);flex:none;margin-top:1px')} />{dc.need}</div>}
        </div>}
      </div>
    </div>
  </>;
}
