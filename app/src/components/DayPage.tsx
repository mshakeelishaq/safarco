// One day of the plan as its own page: timeline, places to add or remove, fuel, flight and where to sleep.
// Swipe or use the arrows to move between days.
import { useEffect, useRef } from 'react';
import { css } from '../lib/css';
import { t } from '../i18n';
import type { View } from '../view';
import { Ratings } from './TripTab';

export function DayPage({ v }: { v: View }) {
  const p = v.dayPage, scroller = useRef<HTMLDivElement>(null), touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { scroller.current?.scrollTo(0, 0); }, [p?.i]);
  useEffect(() => {
    if (!p) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') p.close(); else if (e.key === 'ArrowLeft') p.prev?.(); else if (e.key === 'ArrowRight') p.next?.(); };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, [p]);
  if (!p) return null;
  const d = v.plan.days[p.i], total = v.plan.days.length;
  const onEnd = (e: React.TouchEvent) => {
    const s = touch.current; touch.current = null; if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? p.next : p.prev)?.();
  };
  const nav = 'width:44px;height:44px;flex:none;border-radius:15px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center';
  return (
    <div role="dialog" aria-modal="true" aria-label={t('Day {n} of {total}', { n: p.i + 1, total })} style={css('position:absolute;inset:0;z-index:30;background:var(--bg);color:var(--ink);display:flex;flex-direction:column')}
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={onEnd}>
      <div style={css('flex:none;padding:calc(54px + env(safe-area-inset-top)) 16px 12px;border-bottom:1px solid var(--line);background:var(--sheet)')}>
        <div style={css('display:flex;align-items:center;gap:8px')}>
          <button onClick={p.close} aria-label={t('Back to the plan')} style={css(nav)}><i className="ph-bold ph-arrow-left" /></button>
          <div style={css('flex:1;min-width:0;text-align:center')}>
            <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)')}>{t('Day {n} of {total}', { n: p.i + 1, total })} · {d.kindLabel}</div>
            <div style={css('font-size:12px;font-weight:700;color:var(--amb2);margin-top:2px')}>{d.date}</div>
          </div>
          <button onClick={p.prev || undefined} disabled={!p.prev} aria-label={t('Previous day')} style={css(nav + (p.prev ? '' : ';opacity:.35'))}><i className="ph-bold ph-caret-left" /></button>
          <button onClick={p.next || undefined} disabled={!p.next} aria-label={t('Next day')} style={css(nav + (p.next ? '' : ';opacity:.35'))}><i className="ph-bold ph-caret-right" /></button>
        </div>
        <div style={css('display:flex;align-items:center;gap:10px;margin-top:12px')}>
          <div style={css(`width:40px;height:40px;flex:none;border-radius:13px;background:${d.tile};color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--fontH);font-size:16px;font-weight:600`)}>{d.num}</div>
          <h1 style={css('margin:0;font-family:var(--fontH);font-weight:600;font-size:21px;letter-spacing:-.02em;line-height:1.2')}>{d.title}</h1>
        </div>
        <div style={css('display:flex;gap:4px;margin-top:12px')} aria-hidden="true">{v.plan.days.map((x, i) => <div key={i} style={css(`flex:1;height:4px;border-radius:2px;background:${i === p.i ? 'var(--g)' : 'var(--fill2)'}`)} />)}</div>
      </div>
      <div ref={scroller} key={p.i} className="sc-fadein" style={css('flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px 16px calc(40px + env(safe-area-inset-bottom))')}>
      <div style={css('font-size:12px;color:var(--ink2);font-weight:600;line-height:1.45')}>{d.meta}</div>
      {d.note && <div style={css('font-size:12px;color:var(--amb2);font-weight:600;margin-top:5px;line-height:1.45')}>{d.note}</div>}
      {d.departCtl && <div style={css('margin-top:10px;padding:10px 12px;border-radius:16px;background:var(--card);border:1px solid var(--line)')}>
        <div style={css('display:flex;align-items:center;gap:10px')}>
          <i className="ph-fill ph-clock" style={css('font-size:20px;color:var(--g);flex:none')} />
          <div style={css('flex:1;min-width:0')}>
            <div style={css('font-size:11px;font-weight:800;color:var(--mute);text-transform:uppercase;letter-spacing:.05em')}>{t('Leave at')}</div>
            <div style={css('font-size:18px;font-weight:800;font-variant-numeric:tabular-nums')}>{d.departCtl.time}</div>
          </div>
          <button onClick={d.departCtl.earlier} aria-label={t('Leave 15 minutes earlier')} style={css('width:44px;height:44px;flex:none;border-radius:13px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:18px;cursor:pointer')}><i className="ph-bold ph-minus" /></button>
          <button onClick={d.departCtl.later} aria-label={t('Leave 15 minutes later')} style={css('width:44px;height:44px;flex:none;border-radius:13px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:18px;cursor:pointer')}><i className="ph-bold ph-plus" /></button>
        </div>
        <div style={css('display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;font-weight:700;color:var(--mute)')}>
          <span>{d.departCtl.suggested}</span>
          {d.departCtl.reset && <button onClick={d.departCtl.reset} style={css('padding:0;border:0;background:none;color:var(--g);font-size:12px;font-weight:800;cursor:pointer;text-decoration:underline')}>{t('Use suggested')}</button>}
        </div>
        {d.departCtl.warn && <div style={css('font-size:12px;font-weight:700;color:var(--cor);margin-top:6px;line-height:1.4')}>{d.departCtl.warn}</div>}
      </div>}
      {d.stayOffer && <div style={css('display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;border-radius:16px;background:rgba(46,229,157,.1);border:1px solid rgba(46,229,157,.35)')}>
        <i className="ph-fill ph-bed" style={css('font-size:20px;color:var(--g);flex:none')} />
        <div style={css('flex:1;min-width:0;font-size:13px;font-weight:700;line-height:1.4')}>{d.stayOffer.text}</div>
        <button onClick={d.stayOffer.apply} style={css('flex:none;height:38px;padding:0 12px;border-radius:12px;border:0;background:var(--ink);color:var(--bg);font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap')}>{d.stayOffer.cta}</button>
      </div>}
      {d.roadOffer && <div style={css('margin-top:10px;padding:10px 12px;border-radius:16px;background:rgba(46,229,157,.1);border:1px solid rgba(46,229,157,.35)')}>
        <div style={css('display:flex;align-items:center;gap:10px')}>
          <i className="ph-fill ph-bed" style={css('font-size:20px;color:var(--g);flex:none')} />
          <div style={css('flex:1;min-width:0;font-size:13px;font-weight:700;line-height:1.4')}>{d.roadOffer.text}</div>
        </div>
        <div style={css('display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;padding-left:30px')}>
          {d.roadOffer.chips.map(c => <button key={c.label} onClick={c.apply} style={css('height:38px;padding:0 14px;border-radius:12px;border:0;background:var(--ink);color:var(--bg);font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap')}>{c.label}</button>)}
        </div>
      </div>}
      {d.destWx && <div style={css('display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px;font-weight:700;color:var(--ink2)')}><i className={`ph-duotone ${d.destWx.icon}`} style={css(`font-size:17px;color:${d.destWx.color}`)} />{d.destWx.typical ? t('Usually') + ' ' : ''}{d.destWx.hi}° / {d.destWx.lo}°{d.destWx.wet ? ` · ${d.destWx.wet}` : ''}</div>}
      {d.strip && d.strip.samples.length > 0 && (
        <div style={css('margin-top:10px')}>
          <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)')}>{d.strip.typical ? t('Typical weather on the road') : t('Weather on the road')}</div>
          {d.strip.flags.map(f => <div key={f.key} style={css(`display:flex;gap:6px;align-items:flex-start;margin-top:6px;font-size:12px;font-weight:700;line-height:1.4;color:${f.level === 'danger' ? 'var(--cor)' : 'var(--amb2)'}`)}><i className={`ph-fill ${f.icon}`} style={css('margin-top:2px;flex:none')} />{f.text}</div>)}
          <div style={css('display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:8px 0 0;padding-bottom:2px')}>
            {d.strip.samples.map(w => (
              <div key={w.key} title={w.text} style={css(`flex:none;width:86px;padding:8px 6px;border-radius:14px;background:var(--card);border-top:3px solid ${w.flags.some(f => f.level === 'danger') ? '#E5484D' : w.flags.length ? '#F2A007' : 'transparent'};display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center`)}>
                <div style={css('font-size:10px;font-weight:800;color:var(--mute);font-variant-numeric:tabular-nums')}>{w.time}</div>
                <i className={`ph-duotone ${w.icon}`} style={css(`font-size:22px;color:${w.color}`)} />
                <div style={css('font-size:14px;font-weight:800;font-variant-numeric:tabular-nums')}>{w.temp}</div>
                <div style={css('font-size:10px;font-weight:700;color:var(--ink2);line-height:1.2;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical')}>{w.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {d.stops.length > 0 && (
        <div style={css('display:flex;flex-direction:column;gap:9px;margin-top:12px;padding:12px;border-radius:16px;background:var(--card)')}>
          {d.stops.map(st => st.isDrive ? (
            <div key={st.key} style={css('display:flex;gap:10px;align-items:center;min-height:26px')}>
              <div style={css('width:58px;flex:none;display:flex;justify-content:center')}><div style={css('width:2px;height:24px;border-radius:1px;background:repeating-linear-gradient(180deg,var(--fill2) 0 4px,transparent 4px 8px)')} /></div>
              <i className={`ph-fill ${st.walk ? 'ph-person-simple-walk' : 'ph-car-simple'}`} style={css('font-size:15px;color:var(--mute);flex:none')} />
              <div style={css('flex:1;min-width:0;font-size:12px;font-weight:800;color:var(--ink2);line-height:1.4')}>{st.label}{st.note && <span style={css('font-weight:500;color:var(--mute)')}> · {st.note}</span>}</div>
            </div>
          ) : (
            <div key={st.key} className={st.added ? 'sc-fadein' : undefined} style={css('display:flex;gap:10px;align-items:flex-start')}>
              <div style={css('width:58px;flex:none;font-size:11px;font-weight:800;color:var(--mute);padding-top:2px;font-variant-numeric:tabular-nums;white-space:nowrap')}>{st.time}</div>
              <i className={`ph-fill ${st.icon}`} style={css(`font-size:16px;color:${st.color};flex:none;margin-top:1px`)} />
              <div style={css('flex:1;min-width:0')}>
                <div style={css('display:flex;align-items:baseline;justify-content:space-between;gap:8px')}><span style={css('font-size:13px;font-weight:700;line-height:1.3')}>{st.label}</span>{st.dur && <span style={css('flex:none;padding:2px 7px;border-radius:7px;background:rgba(255,181,71,.14);color:var(--amb2);font-size:10px;font-weight:800;white-space:nowrap')}>{st.dur}</span>}</div>
                {st.note && <div style={css('font-size:12px;color:var(--mute);font-weight:500;line-height:1.4;margin-top:1px')}>{st.note}</div>}
                {st.href && <a href={st.href} target="_blank" rel="noopener" style={css('display:inline-flex;align-items:center;gap:4px;min-height:28px;font-size:12px;font-weight:700;color:var(--g);text-decoration:none')}>{t('Open in Google Maps')}<i className="ph-bold ph-arrow-up-right" /></a>}
              </div>
              {st.remove && <button onClick={st.remove} aria-label={t('Remove {name}', { name: st.label })} title={t('Remove')} style={css('flex:none;width:34px;height:34px;margin:-4px -4px 0 0;border-radius:11px;border:1px solid var(--line2);background:var(--fill);color:var(--mute);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center')}><i className="ph-bold ph-x" /></button>}
            </div>
          ))}
        </div>
      )}
      {d.busy && <div style={css('display:flex;gap:6px;align-items:flex-start;margin-top:8px;font-size:12px;font-weight:700;line-height:1.45;color:var(--amb2)')}><i className="ph-fill ph-warning" style={css('margin-top:2px;flex:none')} />{d.busy}</div>}
      {d.savedMin > 0 && <div style={css('font-size:12px;font-weight:700;color:var(--g);margin-top:8px')}>{t('Skipped stops save about {n} min. Times above are updated.', { n: d.savedMin })}</div>}
      {(d.suggest.list.length > 0 || d.suggest.loading) && (
        <div style={css('margin-top:12px')}>
          <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)')}>{d.suggest.title}</div>
          {d.suggest.loading && <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:8px')}>{t('Finding places nearby…')}</div>}
          <div style={css('display:flex;flex-direction:column;gap:6px;margin-top:8px')}>
            {d.suggest.list.map(p => (
              <div key={p.key} style={css('display:flex;align-items:center;gap:10px;padding:8px 8px 8px 12px;border-radius:14px;background:var(--card);border:1px dashed var(--line2)')}>
                <i className="ph-fill ph-map-pin" style={css('font-size:17px;color:var(--vio);flex:none')} />
                <a href={p.href} target="_blank" rel="noopener" style={css('flex:1;min-width:0;text-decoration:none;color:var(--ink)')}><span style={css('display:block;font-size:13px;font-weight:700;line-height:1.3')}>{p.name}</span><span style={css('display:block;font-size:11px;font-weight:600;color:var(--mute);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{p.note}</span></a>
                <button onClick={p.add} aria-label={t('Add {name} to this day', { name: p.name })} style={css('flex:none;height:36px;padding:0 12px;border-radius:12px;border:0;background:var(--cta);color:var(--onCta);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px')}><i className="ph-bold ph-plus" />{t('Add')}</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {d.fuel && (
        <div style={css('margin-top:10px;padding:12px;border-radius:16px;background:var(--card);border:1px solid var(--line)')}>
          <div style={css('display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800')}><i className="ph-fill ph-gas-pump" style={css('font-size:18px;color:var(--vio)')} />{t('Fuel on the way')}</div>
          {[...d.fuel.notes, ...d.fuel.gaps].map(n => <div key={n} style={css('display:flex;gap:6px;align-items:flex-start;margin-top:8px;font-size:12px;font-weight:700;line-height:1.45;color:var(--amb2)')}><i className="ph-fill ph-warning" style={css('margin-top:2px;flex:none')} />{n}</div>)}
          {d.fuel.stops.length > 0 && <>
            <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:8px')}>{t('Pumps on this road, from the start of the day:')}</div>
            <div style={css('display:flex;flex-wrap:wrap;gap:6px;margin-top:6px')}>
              {d.fuel.stops.map(x => (
                <a key={x.key} href={x.href} target="_blank" rel="noopener" style={css('display:inline-flex;align-items:center;gap:5px;min-height:32px;padding:4px 10px;border-radius:10px;background:var(--fill);border:1px solid var(--line);color:var(--ink);font-size:12px;font-weight:700;text-decoration:none')}>
                  {x.label}<span style={css('color:var(--mute);font-weight:600;font-variant-numeric:tabular-nums')}>{x.km}</span>
                </a>
              ))}
            </div>
          </>}
          {d.fuel.loading && !d.fuel.stops.length && <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:8px')}>{t('Finding fuel pumps on the road…')}</div>}
          {d.fuel.live && <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:8px;line-height:1.4')}>{t('Pumps from OpenStreetMap. Small village pumps may be missing, so fill up when you can.')}</div>}
        </div>
      )}
      {d.flight && (
        <a href={d.flight.href} target="_blank" rel="noopener" style={css('display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;border-radius:16px;background:var(--card);border:1px solid var(--line);text-decoration:none;color:var(--ink)')}>
          <i className="ph-fill ph-airplane-tilt" style={css('font-size:20px;color:var(--g);flex:none')} />
          <span style={css('flex:1;min-width:0;display:flex;flex-direction:column')}>
            <span style={css('font-size:11px;font-weight:700;color:var(--mute)')}>{t('Flight')}</span>
            <span style={css('font-size:14px;font-weight:800;margin-top:2px')}>{d.flight.from} → {d.flight.to}</span>
            <span style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px')}>{d.flight.fare}</span>
            <span style={css('font-size:12px;color:var(--g);font-weight:700;margin-top:3px')}>{t('Check live fares for this day')}</span>
          </span>
          <i className="ph-bold ph-arrow-up-right" style={css('font-size:15px;color:var(--mute);flex:none')} />
        </a>
      )}
      {d.stay && (
        <div style={css('margin-top:12px;padding:12px;border-radius:16px;background:var(--card);border:1px solid var(--line)')}>
          <div style={css('display:flex;align-items:center;gap:10px')}>
            <i className="ph-fill ph-bed" style={css('font-size:20px;color:var(--g);flex:none')} />
            <div style={css('flex:1;min-width:0')}>
              <div style={css('font-size:14px;font-weight:800')}>{t('Night in {place}', { place: d.stay.place })}</div>
              <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:1px')}>{d.stay.range}</div>
            </div>
          </div>
          {d.stay.loading && <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:10px')}>{t('Finding hotels…')}</div>}
          <div style={css('display:flex;flex-direction:column;gap:8px;margin-top:10px')}>
            {d.stay.options.map(h => h.trusted ? (
              <div key={h.key} style={css('padding:10px;border-radius:14px;background:rgba(46,229,157,.08);border:1px solid rgba(46,229,157,.35)')}>
                <div style={css('display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;color:var(--g);letter-spacing:.04em;text-transform:uppercase')}><i className="ph-fill ph-seal-check" />{t('Recommended by SafarCo')}</div>
                <div style={css('font-size:14px;font-weight:800;line-height:1.3;margin-top:2px')}>{h.name}</div>
                <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:1px;line-height:1.4')}>{h.note}</div>
                <Ratings r={h.rating} onRate={h.review} />
                <div style={css('display:flex;gap:6px;margin-top:8px')}>
                  {h.wa && <a href={h.wa} target="_blank" rel="noopener" style={css('flex:1;height:38px;border-radius:12px;background:#25D366;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none')}><i className="ph-fill ph-whatsapp-logo" style={css('font-size:17px')} />WhatsApp</a>}
                  <a href={h.mapUrl} target="_blank" rel="noopener" aria-label={t('{name} on Google Maps', { name: h.name })} style={css('flex:none;width:38px;height:38px;border-radius:12px;background:var(--fill);border:1px solid var(--line);color:var(--ink2);display:flex;align-items:center;justify-content:center;font-size:16px')}><i className="ph-fill ph-map-pin" /></a>
                  <a href={h.checkUrl} target="_blank" rel="noopener" style={css('flex:1;height:38px;border-radius:12px;background:var(--fill);border:1px solid var(--line2);color:var(--ink);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;text-decoration:none;white-space:nowrap')}>{t('Check prices')}</a>
                </div>
              </div>
            ) : (
              <div key={h.key} style={css('display:flex;align-items:center;gap:8px')}>
                <div style={css('flex:1;min-width:0')}><div style={css('font-size:13px;font-weight:700;line-height:1.3')}>{h.name}</div><div style={css('font-size:11px;color:var(--mute);font-weight:600;margin-top:1px')}>{h.note}</div></div>
                <a href={h.mapUrl} target="_blank" rel="noopener" aria-label={t('{name} on Google Maps', { name: h.name })} style={css('flex:none;width:38px;height:38px;border-radius:12px;background:var(--fill);border:1px solid var(--line);color:var(--ink2);display:flex;align-items:center;justify-content:center;font-size:16px')}><i className="ph-fill ph-map-pin" /></a>
                <a href={h.checkUrl} target="_blank" rel="noopener" style={css('flex:none;height:38px;padding:0 10px;border-radius:12px;background:var(--fill);border:1px solid var(--line2);color:var(--ink);font-size:12px;font-weight:800;display:flex;align-items:center;text-decoration:none;white-space:nowrap')}>{t('Check prices')}</a>
              </div>
            ))}
          </div>
          <a href={d.stay.href} target="_blank" rel="noopener" style={css('display:flex;align-items:center;gap:6px;min-height:36px;margin-top:6px;font-size:12px;font-weight:800;color:var(--g);text-decoration:none')}><i className="ph-fill ph-tag" />{t('See all stays in {town} for this night', { town: d.stay.town })}<i className="ph-bold ph-arrow-up-right" /></a>
          {d.stay.source && <div style={css('font-size:10px;font-weight:600;color:var(--mute)')}>{t('Places: {source}. Prices on Booking.com.', { source: d.stay.source })}</div>}
        </div>
      )}
        {p.next && <button onClick={p.next} style={css('margin-top:16px;width:100%;height:52px;border-radius:18px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px')}>{t('Next: Day {n}', { n: p.i + 2 })}<i className="ph-bold ph-arrow-right" /></button>}
      </div>
    </div>
  );
}
