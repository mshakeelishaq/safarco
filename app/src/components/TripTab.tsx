import { useEffect, useState } from 'react';
import { cloudEnabled } from '../cloud';
import { IG_HANDLE, IG_MESSAGE, IG_PROFILE } from '../contact';
import { css } from '../lib/css';
import { t } from '../i18n';
import type { Api, View } from '../view';
import { Notes, WishNote } from './Onboarding';

const card = 'border-radius:30px;padding:18px 18px 16px;background:var(--card);border:1px solid var(--line)';

type Banner = { bg?: string; border?: string; tile?: string; icon?: string; title?: string; msg?: string };
/** Star rating, review count, latest comments and a "Rate" link for a trusted hotel or driver. */
export function Ratings({ r, onRate }: { r: { avg: number; count: number; text: string; latest: { key: string; stars: number; comment: string; author: string; date: string }[] } | null; onRate: (() => void) | null }) {
  if (!r) return null;
  return (
    <div style={css('margin-top:6px')}>
      <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
        <span aria-label={r.count ? t('Rated {avg} out of 5', { avg: r.avg }) : t('No reviews yet')} style={css('display:inline-flex;gap:1px;color:#F2A007;font-size:13px')}>{[1, 2, 3, 4, 5].map(i => <i key={i} className={`${r.count && i <= Math.round(r.avg) ? 'ph-fill' : 'ph-bold'} ph-star`} style={css(r.count && i <= Math.round(r.avg) ? '' : 'color:var(--line2)')} />)}</span>
        <span style={css('font-size:12px;font-weight:700;color:var(--mute)')}>{r.text}</span>
        {onRate ? <button onClick={onRate} style={css('margin-left:auto;min-height:32px;padding:0 10px;border-radius:10px;border:1px solid var(--line2);background:var(--card);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px')}><i className="ph-bold ph-star" />{t('Rate')}</button>
        : <span style={css('margin-left:auto;font-size:11px;font-weight:700;color:var(--mute)')}>{t('Rate after your stay')}</span>}
      </div>
      {r.latest.map(c => <div key={c.key} style={css('font-size:12px;font-weight:500;color:var(--ink2);line-height:1.45;margin-top:6px')}>“{c.comment}” <span style={css('color:var(--mute);font-weight:700')}>· {c.author}, {c.date} · {c.stars}★</span></div>)}
    </div>
  );
}

/** A card with a title row (icon, title, short summary) and its content. */
export function Fold({ icon, iconColor, title, summary, summaryColor, children, label }: { icon: string; iconColor?: string; title: string; summary?: React.ReactNode; summaryColor?: string; children: React.ReactNode; label?: string }) {
  return (
    <section aria-label={label || title} style={css('border-radius:24px;background:var(--card);border:1px solid var(--line);padding:14px 16px 16px')}>
      <div style={css('display:flex;align-items:center;gap:10px;margin-bottom:12px')}>
        <i className={`ph-fill ${icon}`} style={css(`font-size:19px;color:${iconColor || 'var(--g)'};flex:none`)} />
        <h2 style={css('flex:1;min-width:0;margin:0;font-size:15px;font-weight:800')}>{title}</h2>
        {summary != null && <span style={css(`flex:none;max-width:50%;font-size:12px;font-weight:700;color:${summaryColor || 'var(--mute)'};text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`)}>{summary}</span>}
      </div>
      {children}
    </section>
  );
}

export const BannerCard = ({ b, children, center }: { b: Banner; children?: React.ReactNode; center?: boolean }) => (
  <div style={css(`display:flex;${center ? 'align-items:center;' : ''}gap:12px;padding:14px;border-radius:24px;background:${b.bg};border:1px solid ${b.border}`)}>
    <div style={css(`width:42px;height:42px;flex:none;border-radius:14px;background:${b.tile};display:flex;align-items:center;justify-content:center;font-size:${center ? 21 : 22}px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)`)}><i className={`ph-fill ${b.icon}`} /></div>
    <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:800;line-height:1.3')}>{b.title}</div><div style={css(`font-size:13px;color:var(--ink2);margin-top:${center ? 3 : 4}px;line-height:${center ? 1.4 : 1.45};font-weight:500`)}>{b.msg}</div></div>
    {children}
  </div>
);

type PlanDay = View['plan']['days'][number];

/** One line, the weather and any warning for a collapsed day row. */
function dayQuick(d: PlanDay) {
  const flags = d.strip?.flags || [], last = d.strip?.samples[d.strip.samples.length - 1];
  const wx = d.destWx ? { icon: d.destWx.icon, color: d.destWx.color, temp: `${d.destWx.hi}°` } : last ? { icon: last.icon, color: last.color, temp: last.temp } : null;
  const warn = flags.some(f => f.level === 'danger') ? 'danger' : flags.length ? 'caution' : null;
  const line = d.track ? d.meta.replace(/ \+ .*$/, '') : d.stops.length ? d.stops.filter(t => !t.isDrive).map(t => t.label).slice(0, 3).join(', ') : d.meta;
  return { wx, warn, line };
}

/** What the summary card and folded rows need: weather range and the warnings worth seeing first. */
export function tripGlance(v: View) {
  const dd = v.wx.destDays, warnings: string[] = [];
  // The season badge already explains an off-season month, so skip the destination's own season warning here.
  v.seasonNotes.filter(n => n.color === 'var(--cor)' && !(v.tripSeason && n.icon === 'ph-warning')).forEach(n => warnings.push(n.text));
  v.plan.days.forEach((d, i) => { const f = d.strip?.flags.find(x => x.level === 'danger'); if (f) warnings.push(t('Day {n}: {text}', { n: i + 1, text: f.text })); });
  v.wx.aq.rows.filter(r => r.bad).slice(0, 1).forEach(r => warnings.push(t('Unhealthy air in {place}: carry N95 masks', { place: r.place })));
  const lo = dd.map(d => d.lo).filter((x): x is number => x != null), hi = dd.map(d => d.hi).filter((x): x is number => x != null);
  const wx = dd.length && lo.length && hi.length ? { icon: dd[0].icon, color: dd[0].color, range: t('{lo}° to {hi}°', { lo: Math.min(...lo), hi: Math.max(...hi) }), text: t('{lo}° to {hi}° in {town}', { lo: Math.min(...lo), hi: Math.max(...hi), town: v.c.town }) } : null;
  return { warnings, wx, passWarn: v.wx.passes.reduce((a, p) => a + p.flags.filter(f => f.level === 'danger').length, 0), seasonWarn: [...v.seasonNotes, ...v.liveRoadNotes].filter(n => n.color === 'var(--cor)').length };
}

export function PackingCard({ v }: { v: View }) {
  const key = 'safarco-pack:' + v.s.corridor + '|' + v.s.startDate;
  const [done, setDone] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } });
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(key) || '[]')); } catch { setDone([]); } }, [key]);
  const toggle = (k: string) => { const n = done.includes(k) ? done.filter(x => x !== k) : [...done, k]; setDone(n); try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* storage blocked */ } };
  const packed = done.filter(k => v.wx.pack.some(p => p.key === k)).length;
  return (
    <Fold icon="ph-backpack" title={t('Packing list')} summary={t('{packed} of {total} packed', { packed, total: v.wx.pack.length })} summaryColor={packed === v.wx.pack.length ? 'var(--g)' : undefined}>
      <div style={css('display:flex;flex-direction:column;gap:2px')}>
        {v.wx.pack.map(p => {
          const on = done.includes(p.key);
          return (
            <button key={p.key} onClick={() => toggle(p.key)} role="checkbox" aria-checked={on} style={css('display:flex;align-items:flex-start;gap:10px;min-height:44px;padding:6px 4px;border:0;background:none;color:var(--ink);text-align:left;cursor:pointer')}>
              <i className={`${on ? 'ph-fill ph-check-square' : 'ph-bold ph-square'}`} style={css(`font-size:20px;flex:none;margin-top:1px;color:${on ? 'var(--g)' : 'var(--mute)'}`)} />
              <span style={css('flex:1;min-width:0')}><span style={css(`display:block;font-size:14px;font-weight:700;${on ? 'text-decoration:line-through;color:var(--mute)' : ''}`)}>{p.item}</span><span style={css('display:block;font-size:12px;font-weight:600;color:var(--mute);margin-top:1px')}>{p.why}</span></span>
            </button>
          );
        })}
      </div>
    </Fold>
  );
}

/** The small print at the bottom of each tab: road advice, legal links, contact and credit. */
export const Footer = () => (
  <div style={css('font-size:11px;font-weight:600;color:var(--mute);line-height:1.5;padding:0 6px')}>{t('Mountain roads, passes and prices change quickly. Check road status with local police or NHA before you leave.')} <a href="/terms">{t('Terms')}</a> · <a href="/privacy">{t('Privacy')}</a> · <a href={IG_MESSAGE} target="_blank" rel="noopener" style={css('font-weight:800;color:var(--g)')}>{t('Contact us')}</a> · <a href={IG_PROFILE} target="_blank" rel="noopener" style={css('display:inline-flex;align-items:center;gap:5px;color:inherit;text-decoration:none')}><i className="ph-bold ph-instagram-logo" />© {IG_HANDLE}</a></div>
);

/** The title area at the top of the Budget and Prepare tabs, over the 3D scene. */
export const TabHero = ({ v, title, sub }: { v: View; title: string; sub?: string }) => (
  <div style={css('height:230px;position:relative;pointer-events:none')}>
    <div className="sc-col" style={css('position:absolute;left:22px;right:22px;top:58px;text-shadow:var(--tsh)')}>
      <div style={css('font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--amb2)')}>{v.c.from} → {v.c.to}</div>
      <h1 style={css('margin:6px 0 0;font-family:var(--fontH);font-weight:600;font-size:26px;letter-spacing:-.02em')}>{title}</h1>
      {sub && <div style={css('font-size:13px;font-weight:700;color:var(--ink2);margin-top:8px;line-height:1.45')}>{sub}</div>}
    </div>
  </div>
);

const tile = 'flex:1;min-width:0;padding:10px 10px 9px;border-radius:16px;background:var(--fill);border:0;color:var(--ink);text-align:left';

/** The Plan tab: the trip at a glance, then one row per day (tap for the day's page). */
export function TripTab({ v, api }: { v: View; api: Api }) {
  const { s, c, plan } = v, { set } = api;
  const openSettings = () => set({ settings: true });
  const glance = tripGlance(v);
  const img = v.photo?.src || v.wiki.info?.image;
  return (
    <div data-screen-label="Trip plan">
      <div style={css('height:318px;position:relative;pointer-events:none')}>
        <div className="sc-col" style={css('position:absolute;left:22px;right:22px;top:52px;text-shadow:var(--tsh)')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:10px')}>
            <div style={css('min-width:0;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--amb2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{c.region}</div>
            <div style={css('flex:none;display:flex;gap:6px;pointer-events:auto;text-shadow:none')}>
              <button onClick={() => set({ sheet: 'trips', settings: false })} aria-label={t('My trips')} title={t('My trips')} style={css('width:44px;height:44px;border-radius:15px;border:1px solid var(--line2);background:var(--fill2);backdrop-filter:blur(12px);color:var(--ink);font-size:18px;cursor:pointer')}><i className="ph-bold ph-list-bullets" /></button>
              <button onClick={() => set({ sheet: 'save', settings: false })} aria-label={s.savedId ? t('Saved trip') : t('Save trip')} title={s.savedId ? t('Saved') : t('Save')} style={css(`width:44px;height:44px;border-radius:15px;border:1px solid ${s.savedId ? 'transparent' : 'var(--line2)'};background:${s.savedId ? 'var(--cta)' : 'var(--fill2)'};backdrop-filter:blur(12px);color:${s.savedId ? 'var(--onCta)' : 'var(--ink)'};font-size:18px;cursor:pointer`)}><i className={`${s.savedId ? 'ph-fill' : 'ph-bold'} ph-bookmark-simple`} /></button>
              <button onClick={api.share} aria-label={t('Share trip')} title={t('Share')} style={css('width:44px;height:44px;border-radius:15px;border:1px solid var(--line2);background:var(--fill2);backdrop-filter:blur(12px);color:var(--ink);font-size:18px;cursor:pointer')}><i className="ph-bold ph-share-network" /></button>
              <button onClick={openSettings} aria-label={t('Edit trip')} style={css('height:44px;padding:0 12px;border-radius:15px;border:1px solid var(--line2);background:var(--fill2);backdrop-filter:blur(12px);color:var(--ink);font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px')}><i className="ph-fill ph-sliders-horizontal" style={css('font-size:17px')} />{t('Edit')}</button>
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

      <div className="sc-flow" style={css('padding:4px 16px 150px;display:flex;flex-direction:column;gap:12px;pointer-events:auto;background:var(--bg)')}>
        {v.afterTrip && cloudEnabled && (
          <section aria-label={t('How was your trip?')} style={css('border-radius:24px;padding:16px;background:rgba(46,229,157,.10);border:1px solid rgba(46,229,157,.4)')}>
            <div style={css('display:flex;align-items:center;gap:10px')}>
              <i className="ph-fill ph-suitcase-rolling" style={css('font-size:24px;color:var(--g);flex:none')} />
              <div style={css('flex:1;min-width:0')}><h2 style={css('margin:0;font-size:16px;font-weight:800')}>{t('Welcome back! How was your trip?')}</h2><div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:2px')}>{t('Your rating helps the next traveller choose.')}</div></div>
            </div>
            <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:12px')}>
              {v.afterTrip.items.map(x => (
                <div key={x.key} style={css('display:flex;align-items:center;gap:8px;padding:10px;border-radius:14px;background:var(--card)')}>
                  <i className={`ph-fill ${x.kind === 'hotel' ? 'ph-bed' : 'ph-jeep'}`} style={css('font-size:18px;color:var(--g);flex:none')} />
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:800;line-height:1.3')}>{x.name}</div><div style={css('font-size:11px;font-weight:600;color:var(--mute)')}>{x.when}</div></div>
                  <button onClick={x.rate} style={css('flex:none;height:36px;padding:0 12px;border-radius:12px;border:0;background:var(--cta);color:var(--onCta);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px')}><i className="ph-fill ph-star" />{t('Rate')}</button>
                  <button onClick={x.skip} style={css('flex:none;height:36px;padding:0 10px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);color:var(--ink2);font-size:12px;font-weight:700;cursor:pointer')}>{t('Didn’t use')}</button>
                </div>
              ))}
            </div>
            <button onClick={v.afterTrip.dismiss} style={css('margin-top:8px;min-height:36px;padding:0 4px;border:0;background:none;color:var(--mute);font-size:12px;font-weight:700;cursor:pointer')}>{t('Not now')}</button>
          </section>
        )}

        {v.gate.show && <BannerCard b={v.gate} />}
        {v.tip.show && <BannerCard b={v.tip} center><button onClick={v.tip.apply} style={css('flex:none;height:44px;padding:0 14px;border-radius:14px;border:0;background:var(--ink);color:var(--bg);font-size:13px;font-weight:800;cursor:pointer')}>{v.tip.cta}</button></BannerCard>}

        <section aria-label={t('Trip at a glance')} style={css(`border-radius:30px;overflow:hidden;background:var(--card);border:1px solid var(--line);box-shadow:${v.budgetShadow};transition:box-shadow .4s`)}>
          <div style={css(`position:relative;height:${img ? (v.photo ? 190 : 150) : 96}px;background:${img ? 'var(--fill)' : 'linear-gradient(135deg,#2EE59D,#19C2B8 55%,#3B8DFF)'}`)}>
            {img && <img src={img} alt="" loading="lazy" style={css('display:block;width:100%;height:100%;object-fit:cover')} />}
            {v.photo && <a href={IG_PROFILE} target="_blank" rel="noopener" style={css('position:absolute;top:8px;right:8px;z-index:1;display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:9px;background:rgba(0,0,0,.4);color:#fff;font-size:10px;font-weight:700;text-decoration:none')}><i className="ph-bold ph-instagram-logo" />{IG_HANDLE}</a>}
            {img && <div style={css('position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.6))')} />}
            <div style={css('position:absolute;left:16px;right:16px;bottom:12px;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.4)')}>
              <div style={css('font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.9')}>{c.region}</div>
              <div style={css('font-family:var(--fontH);font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.15;margin-top:2px')}>{c.name}</div>
            </div>
          </div>
          <div style={css('padding:14px 16px 16px')}>
            <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
              <button onClick={openSettings} style={css('height:36px;padding:0 12px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);color:var(--amb2);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap')}><i className="ph-fill ph-calendar-blank" />{v.dateRange}</button>
              {glance.wx && <span style={css('display:flex;align-items:center;gap:5px;font-size:12px;font-weight:800;color:var(--ink2)')}><i className={`ph-duotone ${glance.wx.icon}`} style={css(`font-size:18px;color:${glance.wx.color}`)} />{glance.wx.range}</span>}
            </div>
            <div style={css('display:flex;gap:8px;margin-top:12px')}>
              <div style={css(tile)}><i className="ph-fill ph-calendar-check" style={css('font-size:17px;color:var(--g)')} /><div style={css('font-size:16px;font-weight:800;margin-top:4px')}>{t('{n} days', { n: plan.days.length })}</div><div style={css('font-size:11px;font-weight:600;color:var(--mute)')}>{t('{n} nights', { n: Math.max(0, plan.days.length - 1) })}</div></div>
              <div style={css(tile)}><i className={`ph-fill ${v.isAir ? 'ph-airplane-tilt' : 'ph-path'}`} style={css('font-size:17px;color:var(--sky)')} /><div style={css('font-size:16px;font-weight:800;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{v.isAir ? t('By air') : t('{km} km', { km: c.kmStr })}</div><div style={css('font-size:11px;font-weight:600;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{v.isAir ? v.pillB : t('each way')}</div></div>
              <button onClick={() => set({ tab: 'budget' })} style={css(tile + ';cursor:pointer')}><i className="ph-fill ph-wallet" style={css(`font-size:17px;color:${v.health.fg}`)} /><div style={css('font-size:16px;font-weight:800;margin-top:4px;white-space:nowrap;font-variant-numeric:tabular-nums')}>{v.totalShort}</div><div style={css(`font-size:11px;font-weight:700;color:${v.health.fg}`)}>{v.health.label}</div></button>
            </div>
            {v.tripSeason && (() => { const ts = v.tripSeason, c = ts.tone === 'good' ? 'var(--g)' : ts.tone === 'care' ? 'var(--amb2)' : 'var(--cor)';
            return (
              <div style={css(`margin-top:12px;padding:10px 12px;border-radius:14px;background:var(--fill);border-left:4px solid ${c}`)}>
                <div style={css(`display:flex;gap:8px;align-items:flex-start;font-size:13px;font-weight:700;line-height:1.45;color:${ts.tone === 'good' ? 'var(--ink)' : c}`)}><i className={`ph-fill ${ts.tone === 'good' ? 'ph-calendar-check' : ts.tone === 'care' ? 'ph-snowflake' : 'ph-calendar-x'}`} style={css(`margin-top:2px;flex:none;color:${c}`)} />{ts.text}</div>
                {ts.note && <div style={css('font-size:12px;font-weight:700;color:var(--g);margin-top:4px;line-height:1.4')}>{ts.note}</div>}
                {ts.alts.length > 0 && <div style={css('margin-top:8px')}>
                  <div style={css('font-size:12px;font-weight:800;color:var(--mute)')}>{ts.altLabel}</div>
                  <div style={css('display:flex;flex-direction:column;gap:6px;margin-top:6px')}>
                    {ts.alts.map(a => <button key={a.key} onClick={a.onClick} style={css('display:flex;align-items:center;gap:8px;min-height:40px;padding:6px 10px;border-radius:12px;border:1px solid var(--line2);background:var(--card);color:var(--ink);text-align:left;cursor:pointer')}><span style={css('flex:1;min-width:0;font-size:13px;line-height:1.35')}><b>{a.name}</b> <span style={css('color:var(--mute);font-weight:600')}>· {a.text}</span></span><i className="ph-bold ph-caret-right" style={css('flex:none;color:var(--mute)')} /></button>)}
                  </div>
                </div>}
                <button onClick={v.guide.open} style={css('margin-top:6px;min-height:32px;padding:0;border:0;background:none;color:var(--g);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px')}><i className="ph-fill ph-leaf" />{t('Best places by season')}</button>
              </div>
            ); })()}
            {v.wishNote && !v.wishNote.good && <WishNote n={v.wishNote} />}
            {glance.warnings.length > 0 && <button onClick={() => set({ tab: 'prepare' })} style={css('display:flex;flex-direction:column;gap:6px;margin-top:12px;padding:0;border:0;background:none;color:var(--ink);text-align:left;cursor:pointer;width:100%')}>
              {glance.warnings.slice(0, 2).map(w => <span key={w} style={css('display:flex;gap:8px;align-items:flex-start;font-size:13px;font-weight:700;line-height:1.4;color:var(--cor)')}><i className="ph-fill ph-warning" style={css('margin-top:2px;flex:none')} />{w}</span>)}
              <span style={css('font-size:12px;font-weight:800;color:var(--g);display:flex;align-items:center;gap:4px')}>{glance.warnings.length > 2 ? t('{n} more things to know in Prepare', { n: glance.warnings.length - 2 }) : t('Precautions in Prepare')}<i className="ph-bold ph-caret-right" /></span>
            </button>}
          </div>
        </section>

        <section data-screen-label="Route plan" aria-label={t('Your route, day by day')} style={css('border-radius:30px;padding:18px 14px 10px;background:var(--card);border:1px solid var(--line)')}>
          <div style={css('padding:0 4px')}>
            <h2 style={css('margin:0;font-size:16px;font-weight:800')}>{t('Your route, day by day')}</h2>
            <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:4px;line-height:1.45')}>{plan.via}</div>
          </div>
          <ol style={css('display:flex;flex-direction:column;margin:10px 0 0;padding:0;list-style:none;position:relative')}>
            {plan.days.map((d, i) => {
              const q = dayQuick(d);
              return (
                <li key={i} style={css('position:relative')}>
                  {i < plan.days.length - 1 && <div aria-hidden="true" style={css('position:absolute;left:24px;top:46px;bottom:-10px;width:2px;background:var(--fill2)')} />}
                  <button onClick={() => v.openDay(i)} style={css('position:relative;width:100%;display:flex;align-items:center;gap:12px;padding:8px;border:0;border-radius:18px;background:none;color:var(--ink);text-align:left;cursor:pointer;min-height:64px')} className="hov-fill">
                    <div style={css(`width:34px;height:34px;flex:none;border-radius:12px;background:${d.tile};color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--fontH);font-size:13px;font-weight:600;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)`)}>{d.num}</div>
                    <div style={css('flex:1;min-width:0')}>
                      <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)')}>{d.date} · {d.kindLabel}</div>
                      <div style={css('font-size:14px;font-weight:800;margin-top:2px;line-height:1.3')}>{d.title}</div>
                      <div style={css('font-size:12px;color:var(--ink2);font-weight:600;margin-top:2px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{q.line}</div>
                    </div>
                    {q.wx && <div style={css('flex:none;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:38px')}><i className={`ph-duotone ${q.wx.icon}`} style={css(`font-size:20px;color:${q.wx.color}`)} /><span style={css('font-size:12px;font-weight:800;font-variant-numeric:tabular-nums')}>{q.wx.temp}</span></div>}
                    {q.warn && <i className="ph-fill ph-warning" aria-label={t('Warning on this day')} style={css(`font-size:18px;flex:none;color:${q.warn === 'danger' ? 'var(--cor)' : 'var(--amb)'}`)} />}
                    <i className="ph-bold ph-caret-right" style={css('font-size:14px;color:var(--mute);flex:none')} />
                  </button>
                </li>
              );
            })}
          </ol>
          <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin:6px 4px 8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap')}>
            <i className="ph-fill ph-hand-tap" style={css('font-size:15px')} />{t('Tap a day to see its plan, and add or remove places.')}
            {v.editNote && <button onClick={v.editNote.undo} style={css('min-height:30px;padding:0 8px;border-radius:9px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:11px;font-weight:800;cursor:pointer')}>{v.editNote.text} · {t('Undo all')}</button>}
          </div>
          {plan.hasDep && <div style={css('padding:4px 4px 8px;border-top:1px solid var(--line);margin-top:4px')}>
            <div style={css('display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:12px -18px 0;padding:0 18px 2px;align-items:center')}>
              <span style={css('flex:none;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)')}>{t('Leave at')}</span>
              {plan.depChips.map(p => <button key={p.key} onClick={p.onClick} style={css(`flex:none;height:36px;padding:0 11px;border-radius:12px;border:1px solid ${p.border};background:${p.bg};color:${p.fg};font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;transition:all .2s`)}>{p.label}</button>)}
            </div>
            <div style={css(`font-size:12px;color:${plan.depNoteC};font-weight:600;margin-top:6px;line-height:1.45`)}>{plan.depNote}</div>
            {plan.wxDepart && (
              <div style={css('display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;border-radius:16px;background:rgba(91,184,245,.12);border:1px solid rgba(91,184,245,.4)')}>
                <i className="ph-fill ph-cloud-sun" style={css('font-size:20px;color:var(--sky);flex:none')} />
                <div style={css('flex:1;min-width:0;font-size:12px;font-weight:700;line-height:1.45;color:var(--ink2)')}>{plan.wxDepart.text}</div>
                <button onClick={plan.wxDepart.apply} style={css('flex:none;height:36px;padding:0 12px;border-radius:12px;border:0;background:var(--ink);color:var(--bg);font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap')}>{t('Use {label}', { label: plan.wxDepart.label })}</button>
              </div>
            )}
          </div>}
        </section>

        <Fold icon="ph-cloud-sun" iconColor="var(--sky)" title={t('Weather in {town}', { town: c.town })} summary={v.wx.destLoading ? t('Loading…') : glance.wx?.range}>
          {v.wx.destSummary && <div style={css('font-size:13px;font-weight:600;color:var(--ink2);line-height:1.45')}>{v.wx.destSummary}</div>}
          <div style={css('display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:12px -16px 0;padding:0 16px 2px')}>
            {v.wx.destDays.map(w => (
              <div key={w.key} title={w.typical ? t('Typical for this date') : t('Forecast')} style={css(`flex:none;width:68px;padding:10px 4px;border-radius:16px;background:var(--fill);border:1px ${w.typical ? 'dashed var(--line2)' : 'solid transparent'};display:flex;flex-direction:column;align-items:center;gap:5px`)}>
                <div style={css('font-size:11px;font-weight:800;color:var(--mute);white-space:nowrap')}>{w.day}</div>
                <i className={`ph-duotone ${w.icon}`} style={css(`font-size:26px;color:${w.color}`)} />
                <div style={css('font-size:15px;font-weight:800;font-variant-numeric:tabular-nums')}>{w.hi}°</div>
                <div style={css('font-size:12px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums')}>{w.lo}°</div>
                {w.wet && <div style={css('font-size:10px;font-weight:800;color:var(--sky);text-align:center;line-height:1.2')}>{w.wet}</div>}
              </div>
            ))}
          </div>
          <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:10px;line-height:1.45')}>{v.wx.destSource}. {v.wx.note}{v.wx.destDays.some(d => d.typical) ? ' ' + t('Dashed boxes are typical, not forecast.') : ''}</div>
        </Fold>

        {(v.wiki.info || v.wiki.loading) && (
          <Fold icon="ph-book-open-text" title={t('About {name}', { name: c.name })} summary={v.wiki.info ? v.wiki.info.source : t('Loading…')}>
            {v.wiki.info && <>
              <p style={css('margin:0;font-size:13px;font-weight:500;line-height:1.55;color:var(--ink2)')}>{v.wiki.info.extract}</p>
              <a href={v.wiki.info.url} target="_blank" rel="noopener" style={css('display:inline-flex;align-items:center;gap:4px;min-height:32px;margin-top:4px;font-size:12px;font-weight:700;color:var(--g);text-decoration:none')}>{t('Read more on {source}', { source: v.wiki.info.source })}<i className="ph-bold ph-arrow-up-right" /></a>
              <div style={css('font-size:10px;font-weight:600;color:var(--mute)')}>{t('Text from {source}, CC BY-SA 4.0', { source: v.wiki.info.source })}</div>
            </>}
          </Fold>
        )}

        <Footer />
      </div>
    </div>
  );
}
