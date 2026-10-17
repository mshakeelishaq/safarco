import { css } from '../lib/css';
import { t } from '../i18n';
import type { View } from '../view';
import type { Api } from '../view';

const Spinner = () => <i className="ph-bold ph-circle-notch" style={{ display: 'inline-block', animation: 'spin .8s linear infinite' }} />;
const SectionLabel = ({ children, style = '' }: { children: React.ReactNode; style?: string }) =>
  <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);' + style)}>{children}</div>;

const Slider = ({ v, set }: { v: View; set: Api['set'] }) => (
  <div style={css('position:relative;height:44px;margin-top:12px')}>
    <div style={css('position:absolute;left:0;right:0;top:19px;height:6px;border-radius:3px;background:var(--fill2)')} />
    <div style={css(`position:absolute;left:0;top:19px;height:6px;border-radius:3px;width:${v.sliderPct}%;background:var(--bar);box-shadow:var(--barGlow)`)} />
    <div style={css(`position:absolute;top:8px;left:${v.sliderPct}%;width:28px;height:28px;margin-left:-14px;border-radius:50%;background:#FFFFFF;border:1px solid var(--line2);box-shadow:0 6px 16px rgba(0,0,0,.45),0 0 0 7px rgba(46,229,157,.22);pointer-events:none`)} />
    <input type="range" min={20000} max={500000} step={5000} value={v.s.cap} onChange={e => set({ cap: +e.target.value, pickId: null })} aria-label={t('Budget')} style={css('position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer')} />
  </div>
);

export const SearchBox = ({ value, onChange, onClear, placeholder, label, focus }: { value: string; onChange: (v: string) => void; onClear: () => void; placeholder: string; label: string; focus: string }) => (
  <div style={css('position:relative')}>
    <i className="ph-bold ph-magnifying-glass" style={css('position:absolute;left:16px;top:50%;margin-top:-9px;font-size:18px;color:var(--mute);pointer-events:none')} />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={label} className={focus} enterKeyHint="search"
      style={css('width:100%;box-sizing:border-box;height:54px;border-radius:18px;border:1px solid var(--line2);background:var(--fill);padding:0 48px 0 46px;font-size:15px;font-weight:600;color:var(--ink);outline:none')} />
    {value && <button onClick={onClear} aria-label={t('Clear search')} style={css('position:absolute;right:5px;top:5px;width:44px;height:44px;border:0;background:none;color:var(--mute);font-size:17px;cursor:pointer')}><i className="ph-fill ph-x-circle" /></button>}
  </div>
);

export function Onboarding({ v, api }: { v: View; api: Api }) {
  const { s } = v, { set } = api;
  return (
    <div data-screen-label="Onboarding" style={css('position:absolute;inset:0;z-index:5;pointer-events:none')}>
      {s.loc === 'ask' && (
        <div style={css('position:absolute;inset:0;z-index:20;background:var(--scrim);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:0 34px;pointer-events:auto')}>
          <div role="dialog" aria-label={t('Location permission')} style={css('width:100%;border-radius:28px;background:var(--sheet);border:1px solid var(--line);box-shadow:0 30px 60px -20px rgba(0,0,0,.7);overflow:hidden;text-align:center')}>
            <div style={css('padding:22px 20px 18px;display:flex;flex-direction:column;align-items:center')}>
              <div style={css('width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,#6FD3FF,#3B8DFF);display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 12px 24px -10px rgba(59,141,255,.8)')}><i className="ph-fill ph-navigation-arrow" /></div>
              <div style={css('font-size:16px;font-weight:800;margin-top:14px;line-height:1.3')}>{t('Allow “SafarCo” to use your location?')}</div>
              <div style={css('font-size:13px;color:var(--ink2);font-weight:500;margin-top:6px;line-height:1.45')}>{t('Used to find your starting city and calculate distance, fuel and tolls. It is not shared.')}</div>
            </div>
            <button onClick={api.locate} style={css('width:100%;height:50px;border:0;border-top:1px solid var(--line);background:none;color:var(--g);font-size:15px;font-weight:800;cursor:pointer')}>{t('Allow While Using App')}</button>
            <button onClick={api.locate} style={css('width:100%;height:50px;border:0;border-top:1px solid var(--line);background:none;color:var(--g);font-size:15px;font-weight:600;cursor:pointer')}>{t('Allow Once')}</button>
            <button onClick={() => set({ loc: 'denied' })} style={css('width:100%;height:50px;border:0;border-top:1px solid var(--line);background:none;color:var(--ink2);font-size:15px;font-weight:600;cursor:pointer')}>{t('Don’t Allow')}</button>
          </div>
        </div>
      )}
      <div className="sc-col" style={css('position:absolute;left:24px;right:24px;top:58px;display:flex;align-items:center;justify-content:space-between')}>
        <div style={css('font-family:var(--fontH);font-weight:700;font-size:22px;letter-spacing:-.02em;text-shadow:var(--tsh)')}>Safar<span style={css('background:var(--wm);-webkit-background-clip:text;background-clip:text;color:transparent')}>Co</span></div>
        <div style={css('display:flex;align-items:center;gap:8px;pointer-events:auto')}>
          <button onClick={v.switchLang} aria-label={v.s.lang === 'ur' ? 'English' : 'Roman Urdu'} style={css('height:32px;padding:0 10px;border-radius:12px;border:0;background:var(--fill2);backdrop-filter:blur(10px);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px')}><i className="ph-bold ph-translate" />{v.s.lang === 'ur' ? 'EN' : 'Urdu'}</button>
          <button onClick={() => set({ sheet: 'trips' })} style={css('height:32px;padding:0 11px;border-radius:12px;border:0;background:var(--fill2);backdrop-filter:blur(10px);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px')}><i className="ph-fill ph-bookmarks-simple" />{t('My trips')}</button>
          <div style={css('padding:6px 11px;border-radius:12px;background:var(--fill2);backdrop-filter:blur(10px);font-size:12px;font-weight:700')}>{v.stepLabel}</div>
        </div>
      </div>
      <div className="sc-col" style={css(`position:absolute;left:24px;right:24px;top:100px;display:grid;grid-template-columns:repeat(${v.stepBars.length},1fr);gap:6px`)}>
        {v.stepBars.map((b, i) => <div key={i} style={css(`height:4px;border-radius:2px;background:${b.bg};box-shadow:${b.glow};transition:all .4s`)} />)}
      </div>
      <div className="sc-colp" style={css('position:absolute;left:0;right:0;top:var(--ob-top,262px);bottom:0;padding:26px 22px calc(30px + env(safe-area-inset-bottom));display:flex;flex-direction:column;pointer-events:auto;background:linear-gradient(180deg,var(--bg0) 0,var(--bg) 44px)')}>
        <h1 style={css('margin:0;font-family:var(--fontH);font-weight:600;font-size:24px;line-height:1.2;letter-spacing:-.02em;text-wrap:pretty')}>{v.ob.title}</h1>
        <div style={css('font-size:14px;color:var(--mute);margin-top:8px;font-weight:500;line-height:1.4')}>{v.ob.sub}</div>
        {/* A new step starts at its top (not where the last step was scrolled to). */}
        <div key={s.step} style={css('flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;margin:16px -22px 12px;padding:2px 22px 8px;perspective:900px')}>

          {s.step === 0 && (
            <div role="radiogroup" aria-label={t('What do you want to see?')} style={css('display:flex;flex-direction:column;gap:10px')}>
              {v.wishOpts.map(w => (
                <button key={w.key} role="radio" aria-checked={w.on} onClick={w.onClick} style={css(`display:flex;align-items:stretch;gap:0;padding:0;border-radius:22px;overflow:hidden;border:2px solid ${w.on ? 'var(--g)' : 'var(--line2)'};background:var(--fill);color:var(--ink);text-align:left;cursor:pointer;box-shadow:${w.on ? '0 14px 30px -16px rgba(46,229,157,.8)' : 'none'};transform:${w.on ? 'scale(1.01)' : 'none'};transition:all .25s`)}>
                  <span style={css(`width:74px;flex:none;background:${w.grad};display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)`)}><i className={`ph-fill ${w.icon}`} /></span>
                  <span style={css('flex:1;min-width:0;padding:11px 12px')}>
                    <span style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}><span style={css('display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0')}><span style={css('font-size:16px;font-weight:800')}>{w.label}</span>{w.now && <span style={css('padding:2px 7px;border-radius:7px;background:rgba(46,229,157,.16);color:var(--g);font-size:10px;font-weight:800;letter-spacing:.03em;text-transform:uppercase')}>{t('In season now')}</span>}</span>{w.on && <i className="ph-fill ph-check-circle" style={css('font-size:20px;color:var(--g);flex:none')} />}</span>
                    <span style={css('display:block;font-size:12px;font-weight:600;color:var(--ink2);line-height:1.4;margin-top:2px')}>{w.tagline}</span>
                    {w.when && <span style={css('display:block;font-size:11px;font-weight:800;color:var(--mute);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{w.when}{w.places ? ` · ${w.places}` : ''}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}

          {s.step === 1 && <>
            {s.quick && <>
              <SectionLabel style="margin:0 4px 8px">{t('How many days?')}</SectionLabel>
              <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:14px')}>
                {v.dayPresets.map(p => <button key={p.key} onClick={p.onClick} aria-pressed={p.bg === 'var(--cta)'} style={css(`height:44px;border-radius:14px;border:1px solid ${p.border};background:${p.bg};color:${p.fg};font-size:13px;font-weight:800;cursor:pointer;transition:all .2s`)}>{p.label}</button>)}
              </div>
              <SectionLabel style="margin:0 4px 8px">{t('Your city')}</SectionLabel>
            </>}
            {v.abroad ? (
              <div style={css('padding:16px;border-radius:22px;background:var(--fill);border:1px solid rgba(111,211,255,.45)')}>
                <div style={css('display:flex;align-items:center;gap:12px')}>
                  <div style={css('width:46px;height:46px;flex:none;border-radius:15px;background:linear-gradient(135deg,#6FD3FF,#3B8DFF);display:flex;align-items:center;justify-content:center;color:#fff;font-size:23px;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -3px 0 rgba(0,0,0,.18)')}><i className="ph-fill ph-airplane-tilt" /></div>
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:16px;font-weight:800')}>{t('Flying in from abroad')}</div><div style={css('font-size:12px;color:var(--mute);margin-top:2px;font-weight:600;line-height:1.4')}>{t('Your trip starts at the airport you land at, with a day to rest.')}</div></div>
                </div>
                <SectionLabel style="margin:16px 0 8px">{t('Landing at')}</SectionLabel>
                <div style={css('display:flex;flex-wrap:wrap;gap:8px')}>
                  {v.abroad.chips.map(c => <button key={c.key} onClick={c.onClick} aria-pressed={c.on} style={css(`min-height:40px;padding:0 14px;border-radius:13px;border:1px solid ${c.on ? 'var(--g)' : 'var(--line2)'};background:${c.on ? 'rgba(46,229,157,.14)' : 'transparent'};color:var(--ink);font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px`)}>{c.key === 'auto' && <i className="ph-fill ph-sparkle" style={css('color:var(--g)')} />}{c.label}</button>)}
                </div>
                <div style={css('font-size:12px;color:var(--ink2);font-weight:600;line-height:1.45;margin-top:10px')}>{v.abroad.note}</div>
                <button onClick={v.abroad.home} style={css('margin-top:12px;min-height:36px;padding:0;border:0;background:none;color:var(--g);font-size:13px;font-weight:800;cursor:pointer')}>{t('I’m already in Pakistan')}</button>
              </div>
            ) : <>
              <button onClick={() => { if (s.loc !== 'locating') set({ loc: 'ask' }); }} style={css(`width:100%;display:flex;align-items:center;gap:14px;min-height:68px;padding:10px 14px;border-radius:22px;border:1px solid ${v.locBtn.border};background:var(--fill);color:var(--ink);text-align:left;cursor:pointer;transition:border-color .3s`)}>
                <div style={css(`width:46px;height:46px;flex:none;border-radius:15px;background:${v.locBtn.tile};display:flex;align-items:center;justify-content:center;color:#fff;font-size:23px;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -3px 0 rgba(0,0,0,.18)`)}>{s.loc === 'locating' ? <Spinner /> : <i className={`ph-fill ${v.locBtn.icon}`} />}</div>
                <div style={css('flex:1;min-width:0')}><div style={css('font-size:16px;font-weight:800')}>{v.locBtn.title}</div><div style={css('font-size:12px;color:var(--mute);margin-top:2px;font-weight:600')}>{v.locBtn.sub}</div></div>
                <i className="ph-bold ph-caret-right" style={css('font-size:16px;color:var(--mute)')} />
              </button>
              <div style={css('margin-top:12px')}><SearchBox value={s.oq} onChange={oq => set({ oq })} onClear={() => set({ oq: '' })} placeholder={t('Search {n} cities, e.g. Sukkur', { n: v.cityCount })} label={t('Search city')} focus="focus-g" /></div>
              <button onClick={v.goAbroad} style={css('margin-top:10px;width:100%;min-height:48px;border-radius:16px;border:1px dashed var(--line2);background:none;color:var(--ink);font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px')}><i className="ph-fill ph-airplane-tilt" style={css('color:var(--g)')} />{t('Flying in from abroad?')}</button>
              <SectionLabel style="margin:16px 4px 6px">{v.listLabel}</SectionLabel>
              <div style={css('display:flex;flex-direction:column;gap:2px')}>
                {v.cityRows.map(r => (
                  <button key={r.key} onClick={r.onClick} className="hov-fill" aria-pressed={r.checkOp === 1} style={css(`display:flex;align-items:center;gap:12px;min-height:52px;padding:6px 12px;border-radius:16px;border:1px solid ${r.border};background:${r.bg};color:var(--ink);text-align:left;cursor:pointer;transition:all .2s`)}>
                    <i className="ph-fill ph-map-pin" style={css(`font-size:19px;color:${r.pinC};flex:none`)} />
                    <span style={css('flex:1;min-width:0;display:flex;align-items:baseline;gap:8px')}><span style={css('font-size:15px;font-weight:700')}>{r.name}</span><span style={css('font-size:12px;font-weight:600;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{r.prov}</span></span>
                    <i className="ph-bold ph-check" style={css(`font-size:16px;color:var(--g);opacity:${r.checkOp}`)} />
                  </button>
                ))}
              </div>
              {v.noCity && <div style={css('padding:16px 12px;font-size:14px;color:var(--mute);font-weight:600;line-height:1.45')}>{t('No city found. Try the nearest district city, or use your current location.')}</div>}
            </>}
          </>}

          {s.step === 2 && <>
            <div style={css('display:flex;flex-direction:column;gap:10px')}>
              {v.modeOpts.map(o => (
                <button key={o.id} onClick={o.onClick} aria-pressed={o.checkOp === 1} style={css(`display:flex;align-items:center;gap:14px;min-height:66px;padding:10px 14px;border-radius:22px;border:1.5px solid transparent;background:${o.bg};text-align:left;cursor:pointer;color:var(--ink);transform:${o.transform};box-shadow:${o.shadow};transition:all .4s cubic-bezier(.2,.8,.2,1)`)}>
                  <div style={css(`width:44px;height:44px;flex:none;border-radius:15px;display:flex;align-items:center;justify-content:center;background:${o.tile};color:#fff;font-size:23px;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -3px 0 rgba(0,0,0,.18),0 8px 18px -8px ${o.glow}`)}><i className={`ph-fill ${o.icon}`} /></div>
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:16px;font-weight:700')}>{o.label}</div><div style={css('font-size:13px;color:var(--mute);margin-top:2px;font-weight:500')}>{o.sub}</div></div>
                  <div style={css(`width:24px;height:24px;flex:none;border-radius:50%;border:2px solid ${o.ringC};display:flex;align-items:center;justify-content:center;background:${o.dotBg};color:var(--onCta);font-size:13px;transition:all .3s`)}><i className="ph-bold ph-check" style={css(`opacity:${o.checkOp}`)} /></div>
                </button>
              ))}
            </div>
            {v.wishPicks && v.wishPicks.picks.length > 0 ? (
              <div style={css('margin-top:16px;padding:12px 0 12px 14px;border-radius:20px;background:var(--fill);border:1px solid var(--line)')}>
                <div style={css('font-size:13px;font-weight:800;padding-right:12px')}>{v.wishPicks.label}</div>
                <div style={css('display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;margin-top:10px;padding:2px 14px 4px 0;scroll-snap-type:x mandatory')}>
                  <PickCards picks={v.wishPicks.picks} />
                </div>
              </div>
            ) : v.bestNow.picks.length > 0 && (
              <div style={css('margin-top:16px;padding:12px 0 12px 14px;border-radius:20px;background:var(--fill);border:1px solid var(--line)')}>
                <div style={css('display:flex;align-items:center;gap:8px;padding-right:12px')}>
                  <div style={css('flex:1;min-width:0;font-size:13px;font-weight:800')}>{t('Best in {month}', { month: v.bestNow.month })}</div>
                  <button onClick={v.guide.open} style={css('flex:none;min-height:32px;padding:0 4px;border:0;background:none;color:var(--g);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px')}>{t('All seasons')}<i className="ph-bold ph-caret-right" /></button>
                </div>
                <div style={css('display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;margin-top:10px;padding:2px 14px 4px 0;scroll-snap-type:x mandatory')}>
                  <PickCards picks={v.bestNow.picks} />
                </div>
              </div>
            )}
            {s.mode === 'know' && <>
              <div style={css('margin-top:14px')}><SearchBox value={s.dq} onChange={dq => set({ dq })} onClear={() => set({ dq: '' })} placeholder={t('Search any place, e.g. Neelum, Ziarat')} label={t('Search destination')} focus="focus-amb" /></div>
              <SectionLabel style="margin:16px 4px 6px">{v.destListLabel}</SectionLabel>
              <div style={css('display:flex;flex-direction:column;gap:2px')}>
                {v.destRows.map(r => (
                  <button key={r.key} onClick={r.onClick} className="hov-fill" aria-pressed={r.checkOp === 1} style={css(`display:flex;align-items:center;gap:12px;min-height:56px;padding:6px 12px;border-radius:16px;border:1px solid ${r.border};background:${r.bg};color:var(--ink);text-align:left;cursor:pointer;transition:all .2s`)}>
                    <i className={`ph-fill ${r.icon}`} style={css(`font-size:20px;color:${r.iconC};flex:none`)} />
                    <span style={css('flex:1;min-width:0;display:flex;flex-direction:column')}><span style={css('font-size:15px;font-weight:700')}>{r.name}</span><span style={css('font-size:12px;font-weight:600;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{r.sub}</span>{r.fit && <span style={css('font-size:11px;font-weight:700;color:var(--amb2);display:flex;align-items:center;gap:4px;margin-top:1px')}><i className="ph-fill ph-jeep" />{r.fit}</span>}{r.risk && <span style={css('font-size:11px;font-weight:700;color:var(--cor);display:flex;align-items:center;gap:4px;margin-top:1px')}><i className="ph-fill ph-shield-warning" />{r.risk}</span>}</span>
                    <span style={css('flex:none;font-size:12px;font-weight:700;color:var(--ink2);font-variant-numeric:tabular-nums;white-space:nowrap')}>{r.meta}</span>
                    <i className="ph-bold ph-check" style={css(`font-size:16px;color:var(--amb);opacity:${r.checkOp};flex:none`)} />
                  </button>
                ))}
              </div>
              {v.noDest && <div style={css('padding:16px 12px;font-size:14px;color:var(--mute);font-weight:600;line-height:1.45')}>{t('No place found. Try the nearest town or district city.')}</div>}
              <div style={css('margin-top:12px')}><TripPlaces v={v} /></div>
            </>}
          </>}

          {s.step === 3 && <>
            <SectionLabel style="margin:0 4px 8px">{t('Month')}</SectionLabel>
            <div style={css('display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -22px;padding:0 22px 4px')}>
              {v.monthChips.map(m => <button key={m.key} onClick={m.onClick} style={css(`flex:none;width:58px;height:56px;border-radius:16px;border:1px solid ${m.border};background:${m.bg};color:${m.fg};cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;transition:all .2s`)}><span style={css('font-size:14px;font-weight:800')}>{m.label}</span><span style={css('font-size:10px;font-weight:700;opacity:.7')}>{m.sub}</span></button>)}
            </div>
            <div style={css('display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:8px 8px 8px 16px;border-radius:18px;background:var(--fill);border:1px solid var(--line)')}>
              <div style={css('font-size:15px;font-weight:700')}>{t('Start date')}</div>
              <DateInput v={v} set={set} />
            </div>
            <SectionLabel style="margin:20px 4px 10px">{t('How many days')}</SectionLabel>
            <div style={css('display:flex;align-items:center;justify-content:center;gap:26px;margin-top:4px')}>
              <button onClick={v.decDays} aria-label={t('Fewer days')} style={css('width:56px;height:56px;border-radius:50%;border:1px solid var(--line2);background:var(--fill);color:var(--ink);cursor:pointer;font-size:20px')}><i className="ph-bold ph-minus" /></button>
              <div style={css('text-align:center;min-width:96px')}><div style={css('font-family:var(--fontH);font-weight:600;font-size:64px;line-height:1;letter-spacing:-.04em;background:var(--ng1);-webkit-background-clip:text;background-clip:text;color:transparent;font-variant-numeric:tabular-nums')}>{s.days}</div><div style={css('font-size:13px;font-weight:700;color:var(--mute);margin-top:6px')}>{v.nightsLabel}</div></div>
              <button onClick={v.incDays} aria-label={t('More days')} style={css('width:56px;height:56px;border-radius:50%;border:0;background:var(--cta);color:var(--onCta);cursor:pointer;font-size:20px;box-shadow:0 12px 26px -10px rgba(46,229,157,.8)')}><i className="ph-bold ph-plus" /></button>
            </div>
            <div style={css('display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:22px')}>
              {v.dayPresets.map(p => <button key={p.key} onClick={p.onClick} style={css(`height:44px;border-radius:14px;border:1px solid ${p.border};background:${p.bg};color:${p.fg};font-size:13px;font-weight:800;cursor:pointer;transition:all .2s`)}>{p.label}</button>)}
            </div>
            <div style={css('text-align:center;font-size:13px;font-weight:800;color:var(--amb2);margin-top:12px')}>{v.dateRange}</div>
            {v.wishNote && <WishNote n={v.wishNote} />}
            <div style={css(`display:flex;align-items:center;gap:12px;margin-top:14px;padding:12px 14px;border-radius:20px;background:${v.dayHint.bg};border:1px solid ${v.dayHint.border}`)}>
              <div style={css(`width:38px;height:38px;flex:none;border-radius:12px;background:${v.dayHint.tile};display:flex;align-items:center;justify-content:center;color:#fff;font-size:19px`)}><i className={`ph-fill ${v.dayHint.icon}`} /></div>
              <div style={css('font-size:13px;font-weight:600;line-height:1.45;color:var(--ink2)')}>{v.dayHint.text}</div>
            </div>
            <div style={css('margin-top:12px;padding:14px;border-radius:20px;background:var(--fill);border:1px solid var(--line);display:flex;flex-direction:column;gap:10px')}>
              <Notes notes={v.whenNotes} />
            </div>
          </>}

          {s.step === 4 && <>
            <div style={css('margin-top:0;padding:4px 12px 4px 14px;border-radius:20px;background:var(--fill);border:1px solid var(--line)')}>
              {v.people.map(p => (
                <div key={p.key} style={css('display:flex;align-items:center;gap:10px;min-height:60px')}>
                  <i className={`ph-fill ${p.icon}`} style={css(`font-size:22px;color:${p.color};flex:none`)} />
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:700')}>{p.label}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500')}>{p.sub}</div></div>
                  <button onClick={p.dec} aria-label={t('Fewer {label}', { label: p.label.toLowerCase() })} style={css('width:44px;height:44px;flex:none;border-radius:50%;border:1px solid var(--line2);background:var(--fill);color:var(--ink);cursor:pointer;font-size:15px')}><i className="ph-bold ph-minus" /></button>
                  <div style={css('min-width:22px;text-align:center;font-family:var(--fontH);font-size:17px;font-weight:600')}>{p.value}</div>
                  <button onClick={p.inc} aria-label={t('More {label}', { label: p.label.toLowerCase() })} style={css('width:44px;height:44px;flex:none;border-radius:50%;border:0;background:var(--cta);color:var(--onCta);cursor:pointer;font-size:15px')}><i className="ph-bold ph-plus" /></button>
                </div>
              ))}
            </div>
            <SectionLabel style="margin:16px 4px 8px">{t('How will you travel?')}</SectionLabel>
            <div role="radiogroup" aria-label={t('How will you travel?')} style={css('display:grid;grid-template-columns:1fr 1fr;gap:8px')}>
              {v.travelOpts.map(o => (
                <button key={o.key} role="radio" aria-checked={o.on} onClick={o.onClick} style={css(`min-height:64px;padding:10px 12px;border-radius:18px;border:1.5px solid ${o.on ? 'var(--g)' : 'var(--line2)'};background:${o.on ? 'rgba(46,229,157,.12)' : 'var(--fill)'};color:var(--ink);text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all .2s`)}>
                  <i className={`ph-fill ${o.icon}`} style={css(`font-size:24px;flex:none;color:${o.on ? 'var(--g)' : 'var(--mute)'}`)} />
                  <span style={css('min-width:0')}><span style={css('display:block;font-size:13px;font-weight:800;line-height:1.25')}>{o.label}</span><span style={css('display:block;font-size:11px;font-weight:600;color:var(--mute);margin-top:2px;line-height:1.3')}>{o.sub}</span></span>
                </button>
              ))}
            </div>
            <SectionLabel style="margin:16px 4px 8px">{t('Rooms')}</SectionLabel>
            <RoomOpts v={v} />
            {v.hasFamilyNote && <div style={css('font-size:12px;color:var(--amb2);font-weight:600;margin:10px 4px 0;line-height:1.45')}>{v.familyNote}</div>}
          </>}

          {s.step === 5 && <>
            <div role="radiogroup" aria-label={t('How do you like to stay?')} style={css('display:flex;flex-direction:column;gap:10px')}>
              {v.stayOpts.map(o => (
                <button key={o.key} role="radio" aria-checked={o.on} onClick={o.onClick} style={css(`display:flex;align-items:center;gap:12px;min-height:76px;padding:12px;border-radius:22px;border:1.5px solid ${o.on ? 'var(--g)' : 'var(--line2)'};background:${o.on ? 'rgba(46,229,157,.12)' : 'var(--fill)'};color:var(--ink);text-align:left;cursor:pointer;transition:all .2s`)}>
                  <div style={css(`width:46px;height:46px;flex:none;border-radius:15px;background:${o.tile};display:flex;align-items:center;justify-content:center;color:#fff;font-size:23px;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -3px 0 rgba(0,0,0,.18)`)}><i className={`ph-fill ${o.icon}`} /></div>
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:16px;font-weight:800')}>{o.label}</div><div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:2px')}>{o.sub}</div></div>
                  <div style={css('flex:none;text-align:right')}><div style={css('font-size:14px;font-weight:800;font-variant-numeric:tabular-nums')}>{o.price}</div><div style={css('font-size:11px;color:var(--mute);font-weight:700;margin-top:2px')}>{o.each}</div></div>
                </button>
              ))}
            </div>
            <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin:8px 4px 0;line-height:1.45')}>{t('Whole group: transport, stays, food and tolls, for {meta}.', { meta: v.tripMeta.toLowerCase() })}</div>
            <button onClick={v.capToggle.onClick} style={css('align-self:flex-start;margin-top:14px;height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:13px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px')}><i className={`ph-fill ${v.capOn ? 'ph-x' : 'ph-wallet'}`} />{v.capToggle.label}</button>
            {v.capOn && <>
              <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:14px')}><span style={css('font-size:15px;font-weight:800;color:var(--mute)')}>PKR</span><span style={css('font-family:var(--fontH);font-weight:600;font-size:36px;letter-spacing:-.03em;font-variant-numeric:tabular-nums;background:var(--ng2);-webkit-background-clip:text;background-clip:text;color:transparent')}>{v.capBig}</span><span style={css('font-size:15px;font-weight:800;color:var(--mute);font-variant-numeric:tabular-nums')}>{v.capUsd}</span></div>
              <div style={css('font-size:13px;color:var(--mute);font-weight:600')}>{v.capPer}</div>
              <Slider v={v} set={set} />
              <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px')}>
                {v.capPresets.map(p => <button key={p.key} onClick={p.onClick} style={css(`height:44px;border-radius:14px;border:1px solid ${p.border};background:${p.bg};color:${p.fg};font-size:13px;font-weight:800;cursor:pointer;transition:all .2s`)}>{p.label}</button>)}
              </div>
              {v.budgetHint && <div style={css('display:flex;align-items:center;gap:12px;margin-top:16px;padding:14px;border-radius:20px;background:linear-gradient(135deg,rgba(46,229,157,.16),rgba(25,194,184,.05));border:1px solid rgba(46,229,157,.3)')}>
                <div style={css('width:40px;height:40px;flex:none;border-radius:13px;background:linear-gradient(135deg,#2EE59D,#0FA678);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px')}><i className="ph-fill ph-sparkle" /></div>
                <div style={css('font-size:14px;font-weight:700;line-height:1.4')}>{v.budgetHint}</div>
              </div>}
            </>}
          </>}

          {s.step === 6 && <>
            {v.capOn ? <><div style={css('display:flex;align-items:baseline;justify-content:space-between;gap:8px')}><div style={css('display:flex;align-items:baseline;gap:6px')}><span style={css('font-size:13px;font-weight:800;color:var(--mute)')}>PKR</span><span style={css('font-family:var(--fontH);font-weight:600;font-size:26px;letter-spacing:-.02em;font-variant-numeric:tabular-nums')}>{v.capBig}</span><span style={css('font-size:12px;font-weight:700;color:var(--mute)')}>{v.capUsd}</span></div><span style={css('font-size:12px;font-weight:700;color:var(--mute)')}>{v.tripMeta}</span></div>
            <Slider v={v} set={set} /></> : <div style={css('font-size:12px;font-weight:700;color:var(--mute)')}>{v.tripMeta}</div>}
            {v.wishFit && <div style={css('display:flex;gap:10px;align-items:center;margin-top:8px;padding:10px 12px;border-radius:18px;background:rgba(255,181,71,.13);border:1px solid rgba(255,181,71,.45)')}>
              <div style={css('flex:1;min-width:0;font-size:13px;font-weight:700;line-height:1.45')}>{v.wishFit.text}</div>
              <button onClick={v.wishFit.apply} style={css('flex:none;height:40px;padding:0 12px;border-radius:12px;border:0;background:var(--ink);color:var(--bg);font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap')}>{v.wishFit.cta}</button>
            </div>}
            <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:8px')}>
              {v.sugg.map(g => (
                <button key={g.key} onClick={g.onClick} style={css(`display:flex;align-items:center;gap:12px;min-height:72px;padding:12px;border-radius:22px;border:1.5px solid transparent;background:${g.bg};color:var(--ink);text-align:left;cursor:pointer;opacity:${g.op};transform:${g.transform};box-shadow:${g.shadow};transition:all .35s cubic-bezier(.2,.8,.2,1)`)}>
                  <div style={css(`width:46px;height:46px;flex:none;border-radius:15px;background:${g.tile};display:flex;align-items:center;justify-content:center;color:#fff;font-size:23px;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -3px 0 rgba(0,0,0,.18)`)}><i className={`ph-fill ${g.icon}`} /></div>
                  <div style={css('flex:1;min-width:0')}>
                    <div style={css('display:flex;align-items:center;gap:6px;flex-wrap:wrap')}><span style={css('font-size:15px;font-weight:800')}>{g.title}</span>{g.best && <span style={css('padding:2px 7px;border-radius:7px;background:linear-gradient(135deg,#FFB547,#FF7A3D);color:#2A1500;font-size:10px;font-weight:800;letter-spacing:.03em;text-transform:uppercase')}>{t('Best match')}</span>}</div>
                    <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:3px')}>{g.sub}</div>
                    {g.fit && <div style={css('font-size:11px;color:var(--amb2);font-weight:700;margin-top:3px;display:flex;align-items:center;gap:4px')}><i className="ph-fill ph-jeep" />{g.fit}</div>}
                  </div>
                  <div style={css('flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:4px')}>
                    <div style={css('font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;text-align:right')}>{g.amount}<div style={css('font-size:11px;font-weight:600;color:var(--mute)')}>{g.amountUsd}</div></div>
                    <div style={css(`padding:2px 7px;border-radius:7px;background:${g.fitBg};color:${g.fitFg};font-size:11px;font-weight:800;font-variant-numeric:tabular-nums`)}>{g.fitLabel}</div>
                  </div>
                </button>
              ))}
            </div>
          </>}
        </div>
        <div style={css('display:flex;gap:10px')}>
          {v.canBack && <button onClick={v.back} aria-label={t('Back')} style={css('width:58px;height:58px;border-radius:20px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);cursor:pointer;font-size:20px')}><i className="ph-bold ph-arrow-left" /></button>}
          <button onClick={v.next} className="press" aria-disabled={v.nextOp < 1} style={css(`flex:1;height:58px;border-radius:20px;border:0;background:linear-gradient(135deg,#2EE59D 0%,#19C2B8 100%);color:var(--onCta);font-size:16px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;opacity:${v.nextOp};box-shadow:0 18px 36px -14px rgba(46,229,157,.75),inset 0 1px 0 rgba(255,255,255,.5);transition:opacity .25s`)}>{v.nextLabel}<i className="ph-bold ph-arrow-right" /></button>
        </div>
      </div>
    </div>
  );
}

export const Notes = ({ notes }: { notes: { icon: string; color: string; text: string }[] }) => <>
  {notes.map((n, i) => <div key={i} style={css('display:flex;gap:10px;align-items:flex-start')}><i className={`ph-fill ${n.icon}`} style={css(`font-size:18px;color:${n.color};flex:none;margin-top:1px`)} /><div style={css('font-size:13px;font-weight:600;line-height:1.45;color:var(--ink2)')}>{n.text}</div></div>)}
</>;

export const DateInput = ({ v, set }: { v: View; set: Api['set'] }) =>
  <input type="date" value={v.s.startDate} min={v.todayIso} onChange={e => { if (e.target.value) set({ startDate: e.target.value, pickId: null }); }} aria-label={t('Start date')}
    style={css(`height:44px;border-radius:14px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);padding:0 12px;font-size:14px;font-weight:700;color-scheme:${v.s.theme === 'dark' ? 'dark' : 'light'};outline:none`)} />;

export const RoomOpts = ({ v, compact }: { v: View; compact?: boolean }) => (<>
  <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:8px')}>
    {v.roomOpts.map(r => <button key={r.key} onClick={r.onClick} aria-pressed={r.bg === 'var(--cta)'} style={css(`min-height:${compact ? 56 : 60}px;padding:${compact ? '8px' : '10px'} 12px;border-radius:${compact ? 16 : 18}px;border:1px solid ${r.border};background:${r.bg};color:${r.fg};text-align:left;cursor:pointer;transition:all .25s`)}><div style={css(`font-size:${compact ? 13 : 14}px;font-weight:800`)}>{r.label}</div><div style={css('font-size:11px;font-weight:600;opacity:.75;margin-top:2px')}>{r.sub}</div></button>)}
  </div>
  <div style={css('display:flex;align-items:center;gap:10px;margin-top:10px;padding:8px 10px 8px 14px;border-radius:16px;background:var(--fill);border:1px solid var(--line2)')}>
    <i className="ph-fill ph-door" style={css('font-size:20px;color:var(--g);flex:none')} />
    <div style={css('flex:1;min-width:0')}>
      <div style={css('font-size:14px;font-weight:800')}>{v.roomCtl.n > 1 ? t('{n} rooms', { n: v.roomCtl.n }) : t('{n} room', { n: v.roomCtl.n })}</div>
      <div style={css('font-size:11px;font-weight:700;color:var(--mute)')}>{v.roomCtl.suggested}{v.roomCtl.reset && <button onClick={v.roomCtl.reset} style={css('margin-left:6px;padding:0;border:0;background:none;color:var(--g);font-size:11px;font-weight:800;cursor:pointer;text-decoration:underline')}>{t('Use suggested')}</button>}</div>
    </div>
    <button onClick={v.roomCtl.dec} disabled={v.roomCtl.n <= 1} aria-label={t('One room fewer')} style={css(`width:40px;height:40px;flex:none;border-radius:12px;border:1px solid var(--line2);background:var(--card);color:var(--ink);font-size:16px;cursor:pointer;opacity:${v.roomCtl.n <= 1 ? .4 : 1}`)}><i className="ph-bold ph-minus" /></button>
    <button onClick={v.roomCtl.inc} aria-label={t('One room more')} style={css('width:40px;height:40px;flex:none;border-radius:12px;border:1px solid var(--line2);background:var(--card);color:var(--ink);font-size:16px;cursor:pointer')}><i className="ph-bold ph-plus" /></button>
  </div>
  {v.roomCtl.note && <div style={css(`font-size:12px;font-weight:700;margin:6px 4px 0;line-height:1.4;color:${v.roomCtl.crowded ? 'var(--cor)' : 'var(--mute)'}`)}>{v.roomCtl.note}</div>}
</>
);

/** Whether the dates (and place) fit what the traveller wants to see, with one-tap fixes. */
export const WishNote = ({ n }: { n: NonNullable<View['wishNote']> }) => (
  <div style={css(`margin-top:12px;padding:12px 14px;border-radius:20px;background:${n.good ? 'rgba(46,229,157,.1)' : 'rgba(255,181,71,.13)'};border:1px solid ${n.good ? 'rgba(46,229,157,.35)' : 'rgba(255,181,71,.45)'}`)}>
    <div style={css('display:flex;gap:10px;align-items:flex-start')}>
      <i className={`ph-fill ${n.icon}`} style={css(`font-size:22px;color:${n.color};flex:none;margin-top:1px`)} />
      <div style={css('flex:1;min-width:0;font-size:13px;font-weight:700;line-height:1.45;color:var(--ink)')}>{n.text}</div>
    </div>
    {n.fix && <button onClick={n.fix.apply} style={css('margin:10px 0 0 32px;height:38px;padding:0 14px;border-radius:12px;border:0;background:var(--ink);color:var(--bg);font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px')}><i className="ph-bold ph-calendar-check" />{n.fix.label}</button>}
    {n.place && <div style={css('margin:10px 0 0 32px')}>
      <div style={css('font-size:12px;font-weight:700;color:var(--ink2)')}>{n.place}</div>
      <div style={css('display:flex;gap:6px;flex-wrap:wrap;margin-top:6px')}>{n.alts.map(a => <button key={a.key} onClick={a.onClick} style={css('height:34px;padding:0 12px;border-radius:11px;border:1px solid var(--line2);background:var(--card);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer')}>{a.name}</button>)}</div>
    </div>}
  </div>
);

/** The places on this trip: the main one plus more nearby, in the order SafarCo drives them. */
export const TripPlaces = ({ v }: { v: View }) => {
  const p = v.tripPlaces;
  return (
    <div style={css('padding:12px 14px;border-radius:20px;background:var(--fill);border:1px solid var(--line)')}>
      <div style={css('font-size:13px;font-weight:800')}>{t('Places on this trip')}</div>
      <div style={css('display:flex;gap:6px;flex-wrap:wrap;margin-top:8px')}>
        {p.list.map((x, i) => <span key={x.key} style={css(`display:inline-flex;align-items:center;gap:4px;height:36px;padding:0 ${x.remove ? 4 : 12}px 0 12px;border-radius:12px;background:var(--cta);color:var(--onCta);font-size:13px;font-weight:800`)}>
          {p.list.length > 1 && <span style={css('opacity:.75')}>{i + 1}.</span>}{x.name}
          {x.remove && <button onClick={x.remove} aria-label={t('Remove {name}', { name: x.name })} style={css('width:28px;height:28px;border:0;background:none;color:inherit;cursor:pointer;font-size:13px')}><i className="ph-bold ph-x" /></button>}
        </span>)}
      </div>
      {p.note && <div style={css('font-size:12px;font-weight:700;color:var(--ink2);margin-top:8px;line-height:1.45')}>{p.note}</div>}
      {p.options.length > 0 && <>
        <div style={css('font-size:12px;font-weight:800;color:var(--mute);margin-top:10px')}>{t('Add another place nearby')}</div>
        <div style={css('display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-top:6px;padding-bottom:2px')}>
          {p.options.map(o => <button key={o.key} onClick={o.onClick} style={css(`flex:none;display:flex;flex-direction:column;align-items:flex-start;min-height:44px;padding:6px 12px;border-radius:12px;border:1px solid ${o.wish ? 'rgba(46,229,157,.5)' : 'var(--line2)'};background:var(--card);color:var(--ink);cursor:pointer;text-align:left`)}>
            <span style={css('font-size:13px;font-weight:800;white-space:nowrap')}>+ {o.name}</span><span style={css('font-size:11px;font-weight:600;color:var(--mute);white-space:nowrap')}>{o.sub}</span>
          </button>)}
        </div>
      </>}
      {p.air && <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:8px')}>{t('Flights cover one place. Drive or hire a car to add more.')}</div>}
    </div>
  );
};

type Pick = { key: string; name: string; icon: string; color: string; photo: string; text: string; when: string; km: string; risk: string; caution: boolean; on: boolean; onClick: () => void };
/** Suggested places as cards: photo, what's special, best months and distance. Tap to choose. */
function PickCards({ picks }: { picks: Pick[] }) {
  return <>{picks.map(p => (
    <button key={p.key} onClick={p.onClick} aria-pressed={p.on} style={css(`flex:none;width:168px;scroll-snap-align:start;padding:0;border-radius:18px;overflow:hidden;border:2px solid ${p.on ? 'var(--g)' : 'var(--line)'};background:var(--card);color:var(--ink);text-align:left;cursor:pointer;display:flex;flex-direction:column;box-shadow:${p.on ? '0 10px 24px -14px rgba(46,229,157,.9)' : '0 6px 16px -12px rgba(0,0,0,.35)'};transition:border-color .2s,box-shadow .2s`)}>
      <div style={css('position:relative;height:96px;background:var(--fill)')}>
        <img src={p.photo} alt="" loading="lazy" style={css('display:block;width:100%;height:100%;object-fit:cover')} />
        <div style={css('position:absolute;inset:auto 0 0 0;height:44px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.55))')} />
        <div style={css('position:absolute;left:10px;bottom:7px;right:10px;color:#fff;font-size:15px;font-weight:800;line-height:1.15;text-shadow:0 1px 3px rgba(0,0,0,.5)')}>{p.name}</div>
        {p.on && <i className="ph-fill ph-check-circle" style={css('position:absolute;top:7px;right:7px;font-size:24px;color:var(--g);background:#fff;border-radius:50%')} />}
      </div>
      <div style={css('flex:1;display:flex;flex-direction:column;gap:6px;padding:8px 10px 10px')}>
        <div style={css('display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;font-weight:600;line-height:1.35;color:var(--ink2);min-height:32px')}>{p.text}</div>
        <div style={css('display:flex;align-items:center;gap:5px;margin-top:auto;font-size:11px;font-weight:800;color:var(--mute)')}>
          <i className={`ph-fill ${p.risk ? 'ph-shield-warning' : p.caution ? 'ph-warning' : p.icon}`} style={css(`font-size:13px;color:${p.risk ? 'var(--cor)' : p.caution ? 'var(--amb2)' : p.color}`)} />
          <span style={css(`white-space:nowrap;overflow:hidden;text-overflow:ellipsis${p.risk ? ';color:var(--cor)' : ''}`)}>{p.risk || [p.when, p.km].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
    </button>
  ))}</>;
}
