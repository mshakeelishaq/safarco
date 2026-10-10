import { css } from '../lib/css';
import type { Api, View } from '../view';
import { Notes } from './Onboarding';

const card = 'border-radius:30px;padding:18px 18px 16px;background:var(--card);border:1px solid var(--line)';

type Banner = { bg?: string; border?: string; tile?: string; icon?: string; title?: string; msg?: string };
const BannerCard = ({ b, children, center }: { b: Banner; children?: React.ReactNode; center?: boolean }) => (
  <div style={css(`display:flex;${center ? 'align-items:center;' : ''}gap:12px;padding:14px;border-radius:24px;background:${b.bg};border:1px solid ${b.border}`)}>
    <div style={css(`width:42px;height:42px;flex:none;border-radius:14px;background:${b.tile};display:flex;align-items:center;justify-content:center;font-size:${center ? 21 : 22}px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)`)}><i className={`ph-fill ${b.icon}`} /></div>
    <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:800;line-height:1.3')}>{b.title}</div><div style={css(`font-size:13px;color:var(--ink2);margin-top:${center ? 3 : 4}px;line-height:${center ? 1.4 : 1.45};font-weight:500`)}>{b.msg}</div></div>
    {children}
  </div>
);

export function TripTab({ v, api }: { v: View; api: Api }) {
  const { s, c, plan } = v, { set } = api;
  const openSettings = () => set({ settings: true });
  return (
    <div data-screen-label="Trip builder">
      <div style={css('height:318px;position:relative;pointer-events:none')}>
        <div className="sc-col" style={css('position:absolute;left:22px;right:22px;top:52px;text-shadow:var(--tsh)')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:10px')}>
            <div style={css('min-width:0;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--amb2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{c.region}</div>
            <div style={css('flex:none;display:flex;gap:6px;pointer-events:auto;text-shadow:none')}>
              <button onClick={() => set({ sheet: 'save', settings: false })} aria-label={s.savedId ? 'Saved trip' : 'Save trip'} title={s.savedId ? 'Saved' : 'Save'} style={css(`width:44px;height:44px;border-radius:15px;border:1px solid ${s.savedId ? 'transparent' : 'var(--line2)'};background:${s.savedId ? 'var(--cta)' : 'var(--fill2)'};backdrop-filter:blur(12px);color:${s.savedId ? 'var(--onCta)' : 'var(--ink)'};font-size:18px;cursor:pointer`)}><i className={`${s.savedId ? 'ph-fill' : 'ph-bold'} ph-bookmark-simple`} /></button>
              <button onClick={api.share} aria-label="Share trip" title="Share" style={css('width:44px;height:44px;border-radius:15px;border:1px solid var(--line2);background:var(--fill2);backdrop-filter:blur(12px);color:var(--ink);font-size:18px;cursor:pointer')}><i className="ph-bold ph-share-network" /></button>
              <button onClick={openSettings} aria-label="Edit trip" style={css('height:44px;padding:0 12px;border-radius:15px;border:1px solid var(--line2);background:var(--fill2);backdrop-filter:blur(12px);color:var(--ink);font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px')}><i className="ph-fill ph-sliders-horizontal" style={css('font-size:17px')} />Edit</button>
            </div>
          </div>
          <h1 style={css('margin:8px 0 0;font-family:var(--fontH);font-weight:600;font-size:23px;letter-spacing:-.02em;line-height:1.15')}>{c.from} → {c.to}</h1>
          <div style={css('display:flex;flex-wrap:wrap;gap:6px;margin-top:10px')}>
            <span style={css('padding:5px 10px;border-radius:10px;background:var(--fill2);backdrop-filter:blur(10px);font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px')}><i className={`ph-fill ${v.pillIcon}`} />{v.pillA}</span>
            <span style={css('padding:5px 10px;border-radius:10px;background:var(--fill2);backdrop-filter:blur(10px);font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px')}><i className="ph-fill ph-clock" />{v.pillB}</span>
          </div>
          <button onClick={openSettings} style={css('pointer-events:auto;margin-top:8px;padding:0;border:0;background:none;color:var(--ink2);font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;text-align:left;min-height:28px')}><i className="ph-fill ph-users-three" />{v.tripSummary}<i className="ph-bold ph-pencil-simple" style={css('font-size:12px')} /></button>
        </div>
        <div className="sc-colp" style={css('position:absolute;left:0;right:0;bottom:4px;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:4px 22px 8px;pointer-events:auto')}>
          {v.corridorChips.map(ch => <button key={ch.key} onClick={ch.onClick} aria-pressed={ch.key === s.corridor} style={css(`flex:none;height:40px;padding:0 15px;border-radius:14px;white-space:nowrap;border:1px solid ${ch.border};background:${ch.bg};color:${ch.fg};backdrop-filter:blur(12px);font-size:13px;font-weight:800;cursor:pointer;box-shadow:${ch.shadow};transition:all .25s`)}>{ch.label}</button>)}
        </div>
      </div>

      <div className="sc-flow" style={css('padding:4px 16px 150px;display:flex;flex-direction:column;gap:14px;pointer-events:auto;background:var(--bg)')}>
        {v.gate.show && <BannerCard b={v.gate} />}
        {v.tip.show && <BannerCard b={v.tip} center><button onClick={v.tip.apply} style={css('flex:none;height:44px;padding:0 14px;border-radius:14px;border:0;background:var(--ink);color:var(--bg);font-size:13px;font-weight:800;cursor:pointer')}>{v.tip.cta}</button></BannerCard>}
        {(v.wiki.info || v.wiki.loading) && (
          <section aria-label={`About ${c.name}`} style={css('border-radius:30px;overflow:hidden;background:var(--card);border:1px solid var(--line)')}>
            {v.wiki.info?.image && <img src={v.wiki.info.image} alt="" loading="lazy" style={css('display:block;width:100%;height:150px;object-fit:cover')} />}
            <div style={css('padding:16px 18px 16px')}>
              <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>About {c.name}</h2>
              {v.wiki.loading && !v.wiki.info && <div style={css('font-size:13px;font-weight:600;color:var(--mute);margin-top:10px')}>Loading guide…</div>}
              {v.wiki.info && <>
                <p style={css('margin:8px 0 0;font-size:13px;font-weight:500;line-height:1.55;color:var(--ink2)')}>{v.wiki.info.extract}</p>
                <a href={v.wiki.info.url} target="_blank" rel="noopener" style={css('display:inline-flex;align-items:center;gap:4px;min-height:32px;margin-top:4px;font-size:12px;font-weight:700;color:var(--g);text-decoration:none')}>Read more on {v.wiki.info.source}<i className="ph-bold ph-arrow-up-right" /></a>
                <div style={css('font-size:10px;font-weight:600;color:var(--mute)')}>Text from {v.wiki.info.source}, CC BY-SA 4.0</div>
              </>}
            </div>
          </section>
        )}

        <section data-screen-label="Dates and season" style={css(card)}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
            <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>Dates &amp; season</h2>
            <button onClick={openSettings} style={css('height:36px;padding:0 12px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);color:var(--amb2);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap')}><i className="ph-fill ph-calendar-blank" />{v.dateRange}</button>
          </div>
          <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:14px')}><Notes notes={[...v.seasonNotes, ...v.liveRoadNotes]} /></div>
        </section>

        <section data-screen-label="Weather" style={css(card)}>
          <div style={css('display:flex;align-items:baseline;justify-content:space-between;gap:8px')}>
            <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>Weather in {v.wx.place}</h2>
            <div style={css('font-size:11px;font-weight:700;color:var(--mute);white-space:nowrap')}>{v.wx.source}</div>
          </div>
          {v.wx.hasSummary && <div style={css('font-size:13px;font-weight:600;color:var(--ink2);margin-top:8px;line-height:1.45')}>{v.wx.summary}</div>}
          {v.wx.loading && <div style={css('font-size:13px;font-weight:600;color:var(--mute);margin-top:10px')}>Loading weather…</div>}
          {v.wx.failed && <div style={css('font-size:13px;font-weight:600;color:var(--mute);margin-top:10px')}>Weather is unavailable right now.</div>}
          <div style={css('display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:14px -18px 0;padding:0 18px 2px')}>
            {v.wx.days.map((w, i) => (
              <div key={i} style={css('flex:none;width:68px;padding:10px 4px;border-radius:16px;background:var(--fill);display:flex;flex-direction:column;align-items:center;gap:5px')}>
                <div style={css('font-size:11px;font-weight:800;color:var(--mute);white-space:nowrap')}>{w.day}</div>
                <i className={`ph-duotone ${w.icon}`} style={css(`font-size:26px;color:${w.color}`)} />
                <div style={css('font-size:15px;font-weight:800;font-variant-numeric:tabular-nums')}>{w.hi}°</div>
                <div style={css('font-size:12px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums')}>{w.lo}°</div>
                {w.hasWet && <div style={css('font-size:10px;font-weight:800;color:var(--sky);text-align:center;line-height:1.2')}>{w.wet}</div>}
              </div>
            ))}
          </div>
        </section>

        <section data-screen-label="Route plan" style={css('border-radius:30px;padding:20px 18px 8px;background:var(--card);border:1px solid var(--line)')}>
          <div style={css('display:flex;justify-content:space-between;align-items:center;gap:8px')}>
            <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>Route plan</h2>
            <div style={css('padding:5px 10px;border-radius:11px;background:var(--fill);font-size:12px;font-weight:800')}>{plan.summary}</div>
          </div>
          <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:6px;line-height:1.45')}>{plan.via}</div>
          {plan.hasDep && <>
            <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin-top:16px')}>Leave at</div>
            <div style={css('display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:8px -18px 0;padding:0 18px 2px')}>
              {plan.depChips.map(p => <button key={p.key} onClick={p.onClick} style={css(`flex:none;height:40px;padding:0 12px;border-radius:13px;border:1px solid ${p.border};background:${p.bg};color:${p.fg};font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;transition:all .2s`)}>{p.label}</button>)}
            </div>
            <div style={css(`font-size:12px;color:${plan.depNoteC};font-weight:600;margin-top:8px;line-height:1.45`)}>{plan.depNote}</div>
          </>}
          <ol style={css('display:flex;flex-direction:column;margin:16px 0 0;padding:0;list-style:none')}>
            {plan.days.map(d => (
              <li key={d.num} style={css('display:flex;gap:12px')}>
                <div style={css('display:flex;flex-direction:column;align-items:center;flex:none;width:34px')}>
                  <div style={css(`width:34px;height:34px;border-radius:12px;background:${d.tile};color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--fontH);font-size:13px;font-weight:600;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)`)}>{d.num}</div>
                  <div style={css(`flex:1;width:2px;min-height:12px;margin:4px 0;border-radius:1px;background:var(--fill2);opacity:${d.lineOp}`)} />
                </div>
                <div style={css('flex:1;min-width:0;padding-bottom:16px')}>
                  <div style={css('font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)')}>Day {d.num} · {d.date} · {d.kindLabel}</div>
                  <div style={css('font-size:15px;font-weight:800;margin-top:3px;line-height:1.3')}>{d.title}</div>
                  <div style={css('font-size:12px;color:var(--ink2);font-weight:600;margin-top:3px;line-height:1.45')}>{d.meta}</div>
                  {d.note && <div style={css('font-size:12px;color:var(--amb2);font-weight:600;margin-top:5px;line-height:1.45')}>{d.note}</div>}
                  {d.stops.length > 0 && (
                    <div style={css('display:flex;flex-direction:column;gap:9px;margin-top:12px;padding:12px;border-radius:16px;background:var(--deep)')}>
                      {d.stops.map((t, j) => t.isDrive ? (
                        <div key={j} style={css('display:flex;gap:10px;align-items:center;min-height:26px')}>
                          <div style={css('width:58px;flex:none;display:flex;justify-content:center')}><div style={css('width:2px;height:24px;border-radius:1px;background:repeating-linear-gradient(180deg,var(--fill2) 0 4px,transparent 4px 8px)')} /></div>
                          <i className="ph-fill ph-car-simple" style={css('font-size:15px;color:var(--mute);flex:none')} />
                          <div style={css('flex:1;min-width:0;font-size:12px;font-weight:800;color:var(--ink2);line-height:1.4')}>{t.label}<span style={css('font-weight:500;color:var(--mute)')}> · {t.note}</span></div>
                        </div>
                      ) : (
                        <div key={j} style={css('display:flex;gap:10px;align-items:flex-start')}>
                          <div style={css('width:58px;flex:none;font-size:11px;font-weight:800;color:var(--mute);padding-top:2px;font-variant-numeric:tabular-nums;white-space:nowrap')}>{t.time}</div>
                          <i className={`ph-fill ${t.icon}`} style={css(`font-size:16px;color:${t.color};flex:none;margin-top:1px`)} />
                          <div style={css('flex:1;min-width:0')}>
                            <div style={css('display:flex;align-items:baseline;justify-content:space-between;gap:8px')}><span style={css('font-size:13px;font-weight:700;line-height:1.3')}>{t.label}</span>{t.dur && <span style={css('flex:none;padding:2px 7px;border-radius:7px;background:rgba(255,181,71,.14);color:var(--amb2);font-size:10px;font-weight:800;white-space:nowrap')}>{t.dur}</span>}</div>
                            {t.note && <div style={css('font-size:12px;color:var(--mute);font-weight:500;line-height:1.4;margin-top:1px')}>{t.note}</div>}
                            {t.href && <a href={t.href} target="_blank" rel="noopener" style={css('display:inline-flex;align-items:center;gap:4px;min-height:28px;font-size:12px;font-weight:700;color:var(--g);text-decoration:none')}>Open in Google Maps<i className="ph-bold ph-arrow-up-right" /></a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {d.stay && <>
                    <a href={d.stay.href} target="_blank" rel="noopener" style={css('display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;border-radius:16px;background:var(--deep);border:1px solid var(--line);text-decoration:none;color:var(--ink)')}>
                      <i className="ph-fill ph-bed" style={css('font-size:20px;color:var(--g);flex:none')} />
                      <span style={css('flex:1;min-width:0;display:flex;flex-direction:column')}>
                        <span style={css('font-size:11px;font-weight:700;color:var(--mute)')}>Night in {d.stay.place}</span>
                        <span style={css('font-size:14px;font-weight:800;margin-top:2px')}>{d.stay.name}</span>
                        <span style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px')}>{d.stay.range}</span>
                        <span style={css('font-size:12px;color:var(--g);font-weight:700;margin-top:3px')}>Check prices for this night</span>
                      </span>
                      <i className="ph-bold ph-arrow-up-right" style={css('font-size:15px;color:var(--mute);flex:none')} />
                    </a>
                    {d.stay.nearby && <div style={css('font-size:11px;color:var(--mute);font-weight:600;margin-top:6px;line-height:1.4')}>{d.stay.nearby}</div>}
                  </>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label={`Where to stay in ${v.stays.town}`} style={css('border-radius:30px;padding:20px 18px 18px;background:var(--card);border:1px solid var(--line)')}>
          <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>Where to stay in {v.stays.town}</h2>
          <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:4px;line-height:1.45')}>Typical prices a night in {v.stays.month}. Live prices aren’t available for free, so tap Check prices for real rates.</div>
          <div style={css('display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px')}>
            {v.stays.ranges.map(r => (
              <div key={r.key} style={css(`padding:10px 8px;border-radius:16px;background:${r.on ? 'rgba(46,229,157,.12)' : 'var(--fill)'};border:1px solid ${r.on ? 'rgba(46,229,157,.45)' : 'transparent'}`)}>
                <div style={css('font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--mute)')}>{r.label}</div>
                <div style={css('font-size:12px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums;line-height:1.3')}>{r.text}</div>
                <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:2px;font-variant-numeric:tabular-nums')}>{r.usd}</div>
              </div>
            ))}
          </div>
          {v.stays.loading && <div style={css('font-size:13px;font-weight:600;color:var(--mute);margin-top:14px')}>Finding places to stay…</div>}
          <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
            {v.stays.list.map(h => (
              <div key={h.key} style={css('display:flex;align-items:center;gap:10px')}>
                <i className="ph-fill ph-bed" style={css('font-size:20px;color:var(--g);flex:none')} />
                <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{h.name}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px')}>{h.note}</div></div>
                <a href={h.mapUrl} target="_blank" rel="noopener" aria-label={`${h.name} on Google Maps`} style={css('flex:none;width:40px;height:40px;border-radius:13px;background:var(--fill);border:1px solid var(--line);color:var(--ink2);display:flex;align-items:center;justify-content:center;font-size:17px')}><i className="ph-fill ph-map-pin" /></a>
                <a href={h.checkUrl} target="_blank" rel="noopener" style={css('flex:none;height:40px;padding:0 12px;border-radius:13px;background:var(--fill);border:1px solid var(--line2);color:var(--ink);font-size:12px;font-weight:800;display:flex;align-items:center;text-decoration:none;white-space:nowrap')}>Check prices</a>
              </div>
            ))}
          </div>
          <a href={v.stays.searchUrl} target="_blank" rel="noopener" style={css('margin-top:14px;height:46px;border-radius:15px;background:var(--fill);border:1px solid var(--line);color:var(--ink);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none')}><i className="ph-fill ph-tag" style={css('color:var(--g)')} />See all stays and prices in {v.stays.town}<i className="ph-bold ph-arrow-up-right" /></a>
          {v.stays.source && <div style={css('font-size:10px;font-weight:600;color:var(--mute);margin-top:8px')}>Places: {v.stays.source}{v.stays.source === 'OpenStreetMap' ? ' contributors, via Geoapify' : ''}. Prices on Booking.com.</div>}
        </section>

        {v.nearby.list.length > 0 && (
          <section aria-label="More places nearby" style={css('border-radius:30px;padding:20px 18px 16px;background:var(--card);border:1px solid var(--line)')}>
            <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>More places nearby</h2>
            <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:12px')}>
              {v.nearby.list.map(x => (
                <a key={x.key} href={x.href} target="_blank" rel="noopener" style={css('display:flex;align-items:center;gap:10px;min-height:40px;text-decoration:none;color:var(--ink)')}>
                  <i className="ph-fill ph-binoculars" style={css('font-size:18px;color:var(--sky);flex:none')} />
                  <span style={css('flex:1;min-width:0')}><span style={css('display:block;font-size:14px;font-weight:700')}>{x.name}</span><span style={css('display:block;font-size:12px;color:var(--mute);font-weight:500;margin-top:1px')}>{x.note}</span></span>
                  <i className="ph-bold ph-arrow-up-right" style={css('font-size:14px;color:var(--mute);flex:none')} />
                </a>
              ))}
            </div>
            <div style={css('font-size:10px;font-weight:600;color:var(--mute);margin-top:10px')}>Places: OpenStreetMap contributors, via Geoapify</div>
          </section>
        )}

        <section aria-label="Projected budget" style={css(`border-radius:30px;padding:20px;background:var(--card);border:1px solid var(--line);box-shadow:${v.budgetShadow};transition:box-shadow .4s`)}>
          <div style={css('display:flex;justify-content:space-between;align-items:center')}>
            <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>Projected budget</h2>
            <div style={css(`display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:11px;background:${v.health.bg};color:${v.health.fg};font-size:12px;font-weight:800`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:${v.health.fg};box-shadow:0 0 10px ${v.health.fg}`)} />{v.health.label}</div>
          </div>
          <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:8px')}>
            <span style={css('font-size:15px;font-weight:800;color:var(--mute)')}>PKR</span>
            <span style={css('font-family:var(--fontH);font-weight:600;font-size:38px;letter-spacing:-.03em;font-variant-numeric:tabular-nums;background:var(--ng3);-webkit-background-clip:text;background-clip:text;color:transparent')}>{v.totalNum}</span>
            <span style={css('font-size:15px;font-weight:800;color:var(--mute);font-variant-numeric:tabular-nums')}>≈ {v.totalUsd}</span>
          </div>
          <div style={css('font-size:13px;color:var(--mute);font-weight:600;font-variant-numeric:tabular-nums')}>{v.perPersonStr} per person · {v.capPct}% of {v.capStr} cap</div>
          <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v.barPct)} aria-label="Share of budget cap" style={css('height:8px;border-radius:4px;background:var(--fill2);margin:14px 0 18px;overflow:hidden')}><div style={css(`height:100%;width:${v.barPct}%;border-radius:4px;background:${v.health.fg};box-shadow:0 0 14px ${v.health.fg};transition:width .6s cubic-bezier(.2,.8,.2,1)`)} /></div>
          <div style={css('display:flex;flex-direction:column;gap:12px;margin-top:4px')}>
            {v.rows.map(r => (
              <div key={r.label} style={css('display:flex;align-items:center;gap:12px')}>
                <div style={css(`width:40px;height:40px;flex:none;border-radius:13px;background:${r.grad};display:flex;align-items:center;justify-content:center;font-size:19px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 8px 16px -8px ${r.color}`)}><i className={`ph-fill ${r.icon}`} /></div>
                <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{r.label}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px;font-variant-numeric:tabular-nums')}>{r.detail}</div></div>
                <div style={css('text-align:right')}><div style={css('font-size:14px;font-weight:800;font-variant-numeric:tabular-nums')}>{r.amount}</div><div style={css('font-size:11px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums')}>{r.amountUsd}</div></div>
              </div>
            ))}
          </div>
          <div style={css('font-size:10px;font-weight:600;color:var(--mute);margin-top:14px')}>{v.fxNote} · <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener" style={css('color:inherit')}>Rates by Exchange Rate API</a></div>
        </section>

        {(v.rates.length > 0 || v.hasJeeps) && (
          <section data-screen-label="Market rates" style={css('border-radius:30px;padding:20px;background:var(--card);border:1px solid var(--line)')}>
            {v.rates.length > 0 && <>
              <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>Rates for your transport</h2>
              <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:4px;line-height:1.45')}>Prices {v.ratesChecked}. Confirm with the operator before you book.</div>
              <div style={css('display:flex;flex-direction:column;gap:14px;margin-top:16px')}>
                {v.rates.map(r => (
                  <div key={r.label} style={css('display:flex;align-items:center;gap:12px')}>
                    <div style={css('width:38px;height:38px;flex:none;border-radius:12px;background:var(--fill);display:flex;align-items:center;justify-content:center;font-size:19px;color:var(--sky)')}><i className={`ph-fill ${r.icon}`} /></div>
                    <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{r.label}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px;line-height:1.4')}>{r.sub}</div></div>
                    <div style={css('flex:none;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap')}>{r.amount}</div>
                  </div>
                ))}
              </div>
            </>}
            {v.hasJeeps && <>
              <h2 style={css(`margin:${v.rates.length ? '24px' : '0px'} 0 0;font-size:14px;font-weight:700;color:var(--mute)`)}>Local jeeps (added automatically for places in your plan)</h2>
              <div style={css('display:flex;flex-direction:column;gap:12px;margin-top:12px')}>
                {v.jeeps.map(j => (
                  <div key={j.key} style={css('display:flex;align-items:center;gap:12px')}>
                    <div style={css('width:38px;height:38px;flex:none;border-radius:12px;background:linear-gradient(135deg,#FFB547,#FF7A3D);display:flex;align-items:center;justify-content:center;font-size:19px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)')}><i className="ph-fill ph-jeep" /></div>
                    <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{j.label}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px;line-height:1.4')}>{j.sub}</div></div>
                    <span style={css(`flex:none;height:44px;padding:0 14px;border-radius:14px;border:${j.border};background:${j.bg};color:${j.fg};font-size:12px;font-weight:800;white-space:nowrap;display:flex;align-items:center;box-sizing:border-box`)}>{j.cta}</span>
                  </div>
                ))}
              </div>
            </>}
          </section>
        )}

        <section aria-label="About these numbers" style={css('border-radius:30px;padding:18px;background:var(--card);border:1px solid var(--line)')}>
          <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>About these numbers</h2>
          <div style={css('font-size:12px;font-weight:600;color:var(--ink2);margin-top:6px;line-height:1.5')}>Live: road distance and route (OpenRouteService), weather (Open-Meteo), places and hotels (OpenStreetMap), dollar rate. Prices that change by operator come from SafarCo’s price list:</div>
          <div style={css('display:flex;flex-direction:column;gap:8px;margin-top:12px')}>
            {v.priceNotes.map(n => (
              <div key={n.key} style={css('display:flex;gap:10px;align-items:flex-start')}>
                <i className={`ph-fill ${n.ok ? 'ph-seal-check' : 'ph-clock-countdown'}`} style={css(`font-size:17px;color:${n.ok ? 'var(--g)' : 'var(--amb)'};flex:none;margin-top:1px`)} />
                <div style={css('font-size:12px;font-weight:600;line-height:1.45;color:var(--ink2)')}><b>{n.label}</b> · {n.checked} · {n.source}</div>
              </div>
            ))}
          </div>
          <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:12px;line-height:1.5')}>Mountain roads, passes and prices change quickly. Check road status with local police or NHA before you leave. <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></div>
        </section>
      </div>
    </div>
  );
}
