import { useEffect, useState } from 'react';
import { cloudEnabled } from '../cloud';
import { css } from '../lib/css';
import type { Api, View } from '../view';
import { Notes } from './Onboarding';

const card = 'border-radius:30px;padding:18px 18px 16px;background:var(--card);border:1px solid var(--line)';

type Banner = { bg?: string; border?: string; tile?: string; icon?: string; title?: string; msg?: string };
/** Star rating, review count, latest comments and a "Rate" link for a trusted hotel or driver. */
function Ratings({ r, onRate }: { r: { avg: number; count: number; text: string; latest: { key: string; stars: number; comment: string; author: string; date: string }[] } | null; onRate: (() => void) | null }) {
  if (!r) return null;
  return (
    <div style={css('margin-top:6px')}>
      <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
        <span aria-label={r.count ? `Rated ${r.avg} out of 5` : 'No reviews yet'} style={css('display:inline-flex;gap:1px;color:#F2A007;font-size:13px')}>{[1, 2, 3, 4, 5].map(i => <i key={i} className={`${r.count && i <= Math.round(r.avg) ? 'ph-fill' : 'ph-bold'} ph-star`} style={css(r.count && i <= Math.round(r.avg) ? '' : 'color:var(--line2)')} />)}</span>
        <span style={css('font-size:12px;font-weight:700;color:var(--mute)')}>{r.text}</span>
        {onRate ? <button onClick={onRate} style={css('margin-left:auto;min-height:32px;padding:0 10px;border-radius:10px;border:1px solid var(--line2);background:var(--card);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px')}><i className="ph-bold ph-star" />Rate</button>
        : <span style={css('margin-left:auto;font-size:11px;font-weight:700;color:var(--mute)')}>Rate after your stay</span>}
      </div>
      {r.latest.map(c => <div key={c.key} style={css('font-size:12px;font-weight:500;color:var(--ink2);line-height:1.45;margin-top:6px')}>“{c.comment}” <span style={css('color:var(--mute);font-weight:700')}>· {c.author}, {c.date} · {c.stars}★</span></div>)}
    </div>
  );
}

/** A card with a title row (icon, title, short summary) and its content. */
function Fold({ icon, iconColor, title, summary, summaryColor, children, label }: { icon: string; iconColor?: string; title: string; summary?: React.ReactNode; summaryColor?: string; children: React.ReactNode; label?: string }) {
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

const BannerCard = ({ b, children, center }: { b: Banner; children?: React.ReactNode; center?: boolean }) => (
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
function tripGlance(v: View) {
  const dd = v.wx.destDays, warnings: string[] = [];
  v.seasonNotes.filter(n => n.color === 'var(--cor)').forEach(n => warnings.push(n.text));
  v.plan.days.forEach((d, i) => { const f = d.strip?.flags.find(x => x.level === 'danger'); if (f) warnings.push(`Day ${i + 1}: ${f.text}`); });
  v.wx.aq.rows.filter(r => r.bad).slice(0, 1).forEach(r => warnings.push(`Unhealthy air in ${r.place}: carry N95 masks`));
  const lo = dd.map(d => d.lo).filter((x): x is number => x != null), hi = dd.map(d => d.hi).filter((x): x is number => x != null);
  const wx = dd.length && lo.length && hi.length ? { icon: dd[0].icon, color: dd[0].color, range: `${Math.min(...lo)}° to ${Math.max(...hi)}°`, text: `${Math.min(...lo)}° to ${Math.max(...hi)}° in ${v.c.town}` } : null;
  return { warnings, wx, passWarn: v.wx.passes.reduce((a, p) => a + p.flags.filter(f => f.level === 'danger').length, 0), seasonWarn: [...v.seasonNotes, ...v.liveRoadNotes].filter(n => n.color === 'var(--cor)').length };
}

function PackingCard({ v }: { v: View }) {
  const key = 'safarco-pack:' + v.s.corridor + '|' + v.s.startDate;
  const [done, setDone] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } });
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(key) || '[]')); } catch { setDone([]); } }, [key]);
  const toggle = (k: string) => { const n = done.includes(k) ? done.filter(x => x !== k) : [...done, k]; setDone(n); try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* storage blocked */ } };
  const packed = done.filter(k => v.wx.pack.some(p => p.key === k)).length;
  return (
    <Fold icon="ph-backpack" title="Packing list" summary={`${packed} of ${v.wx.pack.length} packed`} summaryColor={packed === v.wx.pack.length ? 'var(--g)' : undefined}>
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

export function TripTab({ v, api }: { v: View; api: Api }) {
  const { s, c, plan } = v, { set } = api;
  const openSettings = () => set({ settings: true });
  const [openDays, setOpenDays] = useState<number[]>([]);
  useEffect(() => { setOpenDays([]); }, [s.corridor, s.startDate]);
  const allOpen = plan.days.length > 0 && plan.days.every((_, i) => openDays.includes(i));
  const glance = tripGlance(v);
  return (
    <div data-screen-label="Trip builder">
      <div style={css('height:318px;position:relative;pointer-events:none')}>
        <div className="sc-col" style={css('position:absolute;left:22px;right:22px;top:52px;text-shadow:var(--tsh)')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:10px')}>
            <div style={css('min-width:0;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--amb2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{c.region}</div>
            <div style={css('flex:none;display:flex;gap:6px;pointer-events:auto;text-shadow:none')}>
              <button onClick={() => set({ sheet: 'trips', settings: false })} aria-label="My trips" title="My trips" style={css('width:44px;height:44px;border-radius:15px;border:1px solid var(--line2);background:var(--fill2);backdrop-filter:blur(12px);color:var(--ink);font-size:18px;cursor:pointer')}><i className="ph-bold ph-list-bullets" /></button>
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

      <div className="sc-flow" style={css('padding:4px 16px 150px;display:flex;flex-direction:column;gap:12px;pointer-events:auto;background:var(--bg)')}>
        {v.afterTrip && cloudEnabled && (
          <section aria-label="How was your trip?" style={css('border-radius:24px;padding:16px;background:rgba(46,229,157,.10);border:1px solid rgba(46,229,157,.4)')}>
            <div style={css('display:flex;align-items:center;gap:10px')}>
              <i className="ph-fill ph-suitcase-rolling" style={css('font-size:24px;color:var(--g);flex:none')} />
              <div style={css('flex:1;min-width:0')}><h2 style={css('margin:0;font-size:16px;font-weight:800')}>Welcome back! How was your trip?</h2><div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:2px')}>Your rating helps the next traveller choose.</div></div>
            </div>
            <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:12px')}>
              {v.afterTrip.items.map(x => (
                <div key={x.key} style={css('display:flex;align-items:center;gap:8px;padding:10px;border-radius:14px;background:var(--card)')}>
                  <i className={`ph-fill ${x.kind === 'hotel' ? 'ph-bed' : 'ph-jeep'}`} style={css('font-size:18px;color:var(--g);flex:none')} />
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:800;line-height:1.3')}>{x.name}</div><div style={css('font-size:11px;font-weight:600;color:var(--mute)')}>{x.when}</div></div>
                  <button onClick={x.rate} style={css('flex:none;height:36px;padding:0 12px;border-radius:12px;border:0;background:var(--cta);color:var(--onCta);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px')}><i className="ph-fill ph-star" />Rate</button>
                  <button onClick={x.skip} style={css('flex:none;height:36px;padding:0 10px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);color:var(--ink2);font-size:12px;font-weight:700;cursor:pointer')}>Didn’t use</button>
                </div>
              ))}
            </div>
            <button onClick={v.afterTrip.dismiss} style={css('margin-top:8px;min-height:36px;padding:0 4px;border:0;background:none;color:var(--mute);font-size:12px;font-weight:700;cursor:pointer')}>Not now</button>
          </section>
        )}

        {v.gate.show && <BannerCard b={v.gate} />}
        {v.tip.show && <BannerCard b={v.tip} center><button onClick={v.tip.apply} style={css('flex:none;height:44px;padding:0 14px;border-radius:14px;border:0;background:var(--ink);color:var(--bg);font-size:13px;font-weight:800;cursor:pointer')}>{v.tip.cta}</button></BannerCard>}

        <section aria-label="Trip at a glance" style={css(`border-radius:30px;padding:18px;background:var(--card);border:1px solid var(--line);box-shadow:${v.budgetShadow};transition:box-shadow .4s`)}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
            <button onClick={openSettings} style={css('height:36px;padding:0 12px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);color:var(--amb2);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap')}><i className="ph-fill ph-calendar-blank" />{v.dateRange}</button>
            <div style={css(`display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:11px;background:${v.health.bg};color:${v.health.fg};font-size:12px;font-weight:800`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:${v.health.fg}`)} />{v.health.label}</div>
          </div>
          <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:12px;flex-wrap:wrap')}>
            <span style={css('font-size:15px;font-weight:800;color:var(--mute)')}>PKR</span>
            <span style={css('font-family:var(--fontH);font-weight:600;font-size:34px;letter-spacing:-.03em;font-variant-numeric:tabular-nums;background:var(--ng3);-webkit-background-clip:text;background-clip:text;color:transparent')}>{v.totalNum}</span>
            <span style={css('font-size:15px;font-weight:800;color:var(--mute);font-variant-numeric:tabular-nums')}>≈ {v.totalUsd}</span>
          </div>
          <div style={css('font-size:13px;color:var(--mute);font-weight:600;font-variant-numeric:tabular-nums')}>{v.perPersonStr} per person · {v.capPct}% of {v.capStr} budget</div>
          <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v.barPct)} aria-label="Share of budget" style={css('height:6px;border-radius:3px;background:var(--fill2);margin:12px 0 4px;overflow:hidden')}><div style={css(`height:100%;width:${v.barPct}%;border-radius:3px;background:${v.health.fg};transition:width .6s cubic-bezier(.2,.8,.2,1)`)} /></div>
          <div style={css('display:flex;flex-wrap:wrap;gap:6px;margin-top:12px')}>
            <span style={css('padding:6px 10px;border-radius:10px;background:var(--fill);font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px')}><i className="ph-fill ph-calendar-check" />{plan.summary}</span>
            {glance.wx && <span style={css('padding:6px 10px;border-radius:10px;background:var(--fill);font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px')}><i className={`ph-duotone ${glance.wx.icon}`} style={css(`color:${glance.wx.color}`)} />{glance.wx.text}</span>}
          </div>
          {glance.warnings.length > 0 && <div style={css('display:flex;flex-direction:column;gap:6px;margin-top:12px')}>
            {glance.warnings.slice(0, 3).map(w => <div key={w} style={css('display:flex;gap:8px;align-items:flex-start;font-size:13px;font-weight:700;line-height:1.4;color:var(--cor)')}><i className="ph-fill ph-warning" style={css('margin-top:2px;flex:none')} />{w}</div>)}
            {glance.warnings.length > 3 && <div style={css('font-size:12px;font-weight:700;color:var(--mute)')}>+{glance.warnings.length - 3} more in the plan below</div>}
          </div>}
        </section>

        <section data-screen-label="Route plan" style={css('border-radius:30px;padding:18px 14px 10px;background:var(--card);border:1px solid var(--line)')}>
          <div style={css('display:flex;justify-content:space-between;align-items:center;gap:8px;padding:0 4px')}>
            <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>Day by day</h2>
            <button onClick={() => setOpenDays(allOpen ? [] : plan.days.map((_, i) => i))} style={css('height:32px;padding:0 10px;border-radius:10px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer')}>{allOpen ? 'Close all' : 'Open all'}</button>
          </div>
          <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:4px;line-height:1.45;padding:0 4px')}>{plan.via}</div>
          {plan.hasDep && <div style={css('padding:0 4px')}>
            <div style={css('display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:12px -18px 0;padding:0 18px 2px;align-items:center')}>
              <span style={css('flex:none;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)')}>Leave at</span>
              {plan.depChips.map(p => <button key={p.key} onClick={p.onClick} style={css(`flex:none;height:36px;padding:0 11px;border-radius:12px;border:1px solid ${p.border};background:${p.bg};color:${p.fg};font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;transition:all .2s`)}>{p.label}</button>)}
            </div>
            <div style={css(`font-size:12px;color:${plan.depNoteC};font-weight:600;margin-top:6px;line-height:1.45`)}>{plan.depNote}</div>
            {plan.wxDepart && (
              <div style={css('display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;border-radius:16px;background:rgba(91,184,245,.12);border:1px solid rgba(91,184,245,.4)')}>
                <i className="ph-fill ph-cloud-sun" style={css('font-size:20px;color:var(--sky);flex:none')} />
                <div style={css('flex:1;min-width:0;font-size:12px;font-weight:700;line-height:1.45;color:var(--ink2)')}>{plan.wxDepart.text}</div>
                <button onClick={plan.wxDepart.apply} style={css('flex:none;height:36px;padding:0 12px;border-radius:12px;border:0;background:var(--ink);color:var(--bg);font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap')}>Use {plan.wxDepart.label}</button>
              </div>
            )}
          </div>}
          <ol style={css('display:flex;flex-direction:column;gap:6px;margin:12px 0 0;padding:0;list-style:none')}>
            {plan.days.map((d, i) => {
              const open = openDays.includes(i), q = dayQuick(d);
              return (
              <li key={i} style={css(`border-radius:20px;background:${open ? 'var(--fill)' : 'transparent'};transition:background .2s`)}>
                <button onClick={() => setOpenDays(open ? openDays.filter(n => n !== i) : [...openDays, i])} aria-expanded={open} style={css('width:100%;display:flex;align-items:center;gap:12px;padding:10px 8px;border:0;background:none;color:var(--ink);text-align:left;cursor:pointer;min-height:60px')}>
                  <div style={css(`width:34px;height:34px;flex:none;border-radius:12px;background:${d.tile};color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--fontH);font-size:13px;font-weight:600;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)`)}>{d.num}</div>
                  <div style={css('flex:1;min-width:0')}>
                    <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)')}>{d.date} · {d.kindLabel}</div>
                    <div style={css('font-size:14px;font-weight:800;margin-top:2px;line-height:1.3')}>{d.title}</div>
                    <div style={css('font-size:12px;color:var(--ink2);font-weight:600;margin-top:2px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{q.line}</div>
                  </div>
                  {q.wx && <div style={css('flex:none;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:38px')}><i className={`ph-duotone ${q.wx.icon}`} style={css(`font-size:20px;color:${q.wx.color}`)} /><span style={css('font-size:12px;font-weight:800;font-variant-numeric:tabular-nums')}>{q.wx.temp}</span></div>}
                  {q.warn && <i className="ph-fill ph-warning" aria-label="Warning on this day" style={css(`font-size:18px;flex:none;color:${q.warn === 'danger' ? 'var(--cor)' : 'var(--amb)'}`)} />}
                  <i className="ph-bold ph-caret-down" style={css(`font-size:13px;color:var(--mute);flex:none;transition:transform .2s;transform:rotate(${open ? 180 : 0}deg)`)} />
                </button>
                {open && <div style={css('padding:0 10px 12px')}>
                  <div style={css('font-size:12px;color:var(--ink2);font-weight:600;line-height:1.45')}>{d.meta}</div>
                  {d.note && <div style={css('font-size:12px;color:var(--amb2);font-weight:600;margin-top:5px;line-height:1.45')}>{d.note}</div>}
                  {d.destWx && <div style={css('display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px;font-weight:700;color:var(--ink2)')}><i className={`ph-duotone ${d.destWx.icon}`} style={css(`font-size:17px;color:${d.destWx.color}`)} />{d.destWx.typical ? 'Usually ' : ''}{d.destWx.hi}° / {d.destWx.lo}°{d.destWx.wet ? ` · ${d.destWx.wet}` : ''}</div>}
                  {d.strip && d.strip.samples.length > 0 && (
                    <div style={css('margin-top:10px')}>
                      <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)')}>{d.strip.typical ? 'Typical weather on the road' : 'Weather on the road'}</div>
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
                  {d.flight && (
                    <a href={d.flight.href} target="_blank" rel="noopener" style={css('display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;border-radius:16px;background:var(--card);border:1px solid var(--line);text-decoration:none;color:var(--ink)')}>
                      <i className="ph-fill ph-airplane-tilt" style={css('font-size:20px;color:var(--g);flex:none')} />
                      <span style={css('flex:1;min-width:0;display:flex;flex-direction:column')}>
                        <span style={css('font-size:11px;font-weight:700;color:var(--mute)')}>Flight</span>
                        <span style={css('font-size:14px;font-weight:800;margin-top:2px')}>{d.flight.from} → {d.flight.to}</span>
                        <span style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px')}>{d.flight.fare}</span>
                        <span style={css('font-size:12px;color:var(--g);font-weight:700;margin-top:3px')}>Check live fares for this day</span>
                      </span>
                      <i className="ph-bold ph-arrow-up-right" style={css('font-size:15px;color:var(--mute);flex:none')} />
                    </a>
                  )}
                  {d.stay && (
                    <div style={css('margin-top:12px;padding:12px;border-radius:16px;background:var(--card);border:1px solid var(--line)')}>
                      <div style={css('display:flex;align-items:center;gap:10px')}>
                        <i className="ph-fill ph-bed" style={css('font-size:20px;color:var(--g);flex:none')} />
                        <div style={css('flex:1;min-width:0')}>
                          <div style={css('font-size:14px;font-weight:800')}>Night in {d.stay.place}</div>
                          <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:1px')}>{d.stay.range}</div>
                        </div>
                      </div>
                      {d.stay.loading && <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:10px')}>Finding hotels…</div>}
                      <div style={css('display:flex;flex-direction:column;gap:8px;margin-top:10px')}>
                        {d.stay.options.map(h => h.trusted ? (
                          <div key={h.key} style={css('padding:10px;border-radius:14px;background:rgba(46,229,157,.08);border:1px solid rgba(46,229,157,.35)')}>
                            <div style={css('display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;color:var(--g);letter-spacing:.04em;text-transform:uppercase')}><i className="ph-fill ph-seal-check" />Recommended by SafarCo</div>
                            <div style={css('font-size:14px;font-weight:800;line-height:1.3;margin-top:2px')}>{h.name}</div>
                            <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:1px;line-height:1.4')}>{h.note}</div>
                            <Ratings r={h.rating} onRate={h.review} />
                            <div style={css('display:flex;gap:6px;margin-top:8px')}>
                              {h.wa && <a href={h.wa} target="_blank" rel="noopener" style={css('flex:1;height:38px;border-radius:12px;background:#25D366;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none')}><i className="ph-fill ph-whatsapp-logo" style={css('font-size:17px')} />WhatsApp</a>}
                              <a href={h.mapUrl} target="_blank" rel="noopener" aria-label={`${h.name} on Google Maps`} style={css('flex:none;width:38px;height:38px;border-radius:12px;background:var(--fill);border:1px solid var(--line);color:var(--ink2);display:flex;align-items:center;justify-content:center;font-size:16px')}><i className="ph-fill ph-map-pin" /></a>
                              <a href={h.checkUrl} target="_blank" rel="noopener" style={css('flex:1;height:38px;border-radius:12px;background:var(--fill);border:1px solid var(--line2);color:var(--ink);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;text-decoration:none;white-space:nowrap')}>Check prices</a>
                            </div>
                          </div>
                        ) : (
                          <div key={h.key} style={css('display:flex;align-items:center;gap:8px')}>
                            <div style={css('flex:1;min-width:0')}><div style={css('font-size:13px;font-weight:700;line-height:1.3')}>{h.name}</div><div style={css('font-size:11px;color:var(--mute);font-weight:600;margin-top:1px')}>{h.note}</div></div>
                            <a href={h.mapUrl} target="_blank" rel="noopener" aria-label={`${h.name} on Google Maps`} style={css('flex:none;width:38px;height:38px;border-radius:12px;background:var(--fill);border:1px solid var(--line);color:var(--ink2);display:flex;align-items:center;justify-content:center;font-size:16px')}><i className="ph-fill ph-map-pin" /></a>
                            <a href={h.checkUrl} target="_blank" rel="noopener" style={css('flex:none;height:38px;padding:0 10px;border-radius:12px;background:var(--fill);border:1px solid var(--line2);color:var(--ink);font-size:12px;font-weight:800;display:flex;align-items:center;text-decoration:none;white-space:nowrap')}>Check prices</a>
                          </div>
                        ))}
                      </div>
                      <a href={d.stay.href} target="_blank" rel="noopener" style={css('display:flex;align-items:center;gap:6px;min-height:36px;margin-top:6px;font-size:12px;font-weight:800;color:var(--g);text-decoration:none')}><i className="ph-fill ph-tag" />See all stays in {d.stay.town} for this night<i className="ph-bold ph-arrow-up-right" /></a>
                      {d.stay.source && <div style={css('font-size:10px;font-weight:600;color:var(--mute)')}>Places: {d.stay.source}. Prices on Booking.com.</div>}
                    </div>
                  )}
                </div>}
              </li>
            ); })}
          </ol>
        </section>

        {v.drivers.length > 0 && (
          <Fold icon="ph-jeep" iconColor="var(--amb2)" title="Trusted drivers and jeeps" summary={`${v.drivers.length} on your route`}>
            <div style={css('display:flex;flex-direction:column;gap:12px')}>
              {v.drivers.map(x => (
                <div key={x.key}>
                <div style={css('display:flex;align-items:center;gap:10px')}>
                  <div style={css('flex:1;min-width:0')}>
                    <div style={css('display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;color:var(--g);letter-spacing:.04em;text-transform:uppercase')}><i className="ph-fill ph-seal-check" />Recommended by SafarCo</div>
                    <div style={css('font-size:14px;font-weight:800;line-height:1.3')}>{x.name} <span style={css('font-weight:600;color:var(--mute);font-size:12px')}>· {x.area}</span></div>
                    <div style={css('font-size:12px;color:var(--ink2);font-weight:600;margin-top:1px')}>{x.vehicle}{x.rate ? ` · ${x.rate}` : ''}</div>
                    {x.note && <div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px;line-height:1.4')}>{x.note}</div>}
                  </div>
                  {x.tel && <a href={x.tel} aria-label={`Call ${x.name}`} style={css('flex:none;width:40px;height:40px;border-radius:13px;background:var(--fill);border:1px solid var(--line);color:var(--ink);display:flex;align-items:center;justify-content:center;font-size:18px')}><i className="ph-fill ph-phone" /></a>}
                  {x.wa && <a href={x.wa} target="_blank" rel="noopener" aria-label={`WhatsApp ${x.name}`} style={css('flex:none;width:40px;height:40px;border-radius:13px;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px')}><i className="ph-fill ph-whatsapp-logo" /></a>}
                </div>
                <Ratings r={x.rating} onRate={x.review} />
                </div>
              ))}
            </div>
            <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:12px;line-height:1.45')}>Drivers SafarCo knows. Agree the price and route before you set off.</div>
          </Fold>
        )}

        <Fold icon="ph-wallet" title="Budget breakdown" summary={`PKR ${v.totalNum}`} summaryColor="var(--ink)">
          <div style={css('display:flex;flex-direction:column;gap:12px')}>
            {v.rows.map(r => (
              <div key={r.label} style={css('display:flex;align-items:center;gap:12px')}>
                <div style={css(`width:38px;height:38px;flex:none;border-radius:12px;background:${r.grad};display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)`)}><i className={`ph-fill ${r.icon}`} /></div>
                <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{r.label}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px;font-variant-numeric:tabular-nums')}>{r.detail}</div></div>
                <div style={css('text-align:right')}><div style={css('font-size:14px;font-weight:800;font-variant-numeric:tabular-nums')}>{r.amount}</div><div style={css('font-size:11px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums')}>{r.amountUsd}</div></div>
              </div>
            ))}
          </div>
          {v.rates.length > 0 && <>
            <h3 style={css('margin:20px 0 0;font-size:13px;font-weight:700;color:var(--mute)')}>Rates for your transport</h3>
            <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:4px;line-height:1.45')}>Prices {v.ratesChecked}. Confirm with the operator before you book.</div>
            <div style={css('display:flex;flex-direction:column;gap:12px;margin-top:12px')}>
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
            <h3 style={css('margin:20px 0 0;font-size:13px;font-weight:700;color:var(--mute)')}>Local jeeps (added for places in your plan)</h3>
            <div style={css('display:flex;flex-direction:column;gap:12px;margin-top:12px')}>
              {v.jeeps.map(j => (
                <div key={j.key} style={css('display:flex;align-items:center;gap:12px')}>
                  <div style={css('width:38px;height:38px;flex:none;border-radius:12px;background:linear-gradient(135deg,#FFB547,#FF7A3D);display:flex;align-items:center;justify-content:center;font-size:19px;color:#fff')}><i className="ph-fill ph-jeep" /></div>
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{j.label}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px;line-height:1.4')}>{j.sub}</div></div>
                  <span style={css(`flex:none;height:40px;padding:0 12px;border-radius:13px;border:${j.border};background:${j.bg};color:${j.fg};font-size:12px;font-weight:800;white-space:nowrap;display:flex;align-items:center;box-sizing:border-box`)}>{j.cta}</span>
                </div>
              ))}
            </div>
          </>}
          <div style={css('font-size:10px;font-weight:600;color:var(--mute);margin-top:14px')}>{v.fxNote} · <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener" style={css('color:inherit')}>Rates by Exchange Rate API</a></div>
        </Fold>

        <Fold icon="ph-cloud-sun" iconColor="var(--sky)" title={`Weather in ${c.town}`} summary={v.wx.destLoading ? 'Loading…' : glance.wx?.range}>
          {v.wx.destSummary && <div style={css('font-size:13px;font-weight:600;color:var(--ink2);line-height:1.45')}>{v.wx.destSummary}</div>}
          <div style={css('display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:12px -16px 0;padding:0 16px 2px')}>
            {v.wx.destDays.map(w => (
              <div key={w.key} title={w.typical ? 'Typical for this date' : 'Forecast'} style={css(`flex:none;width:68px;padding:10px 4px;border-radius:16px;background:var(--fill);border:1px ${w.typical ? 'dashed var(--line2)' : 'solid transparent'};display:flex;flex-direction:column;align-items:center;gap:5px`)}>
                <div style={css('font-size:11px;font-weight:800;color:var(--mute);white-space:nowrap')}>{w.day}</div>
                <i className={`ph-duotone ${w.icon}`} style={css(`font-size:26px;color:${w.color}`)} />
                <div style={css('font-size:15px;font-weight:800;font-variant-numeric:tabular-nums')}>{w.hi}°</div>
                <div style={css('font-size:12px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums')}>{w.lo}°</div>
                {w.wet && <div style={css('font-size:10px;font-weight:800;color:var(--sky);text-align:center;line-height:1.2')}>{w.wet}</div>}
              </div>
            ))}
          </div>
          <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:10px;line-height:1.45')}>{v.wx.destSource}. {v.wx.note}{v.wx.destDays.some(d => d.typical) ? ' Dashed boxes are typical, not forecast.' : ''}</div>
        </Fold>

        {v.wx.passes.length > 0 && (
          <Fold icon="ph-mountains" title="Mountain passes" summary={glance.passWarn ? `${glance.passWarn} warning${glance.passWarn > 1 ? 's' : ''}` : `${v.wx.passes.length} on route`} summaryColor={glance.passWarn ? 'var(--cor)' : undefined}>
            <div style={css('display:flex;flex-direction:column;gap:12px')}>
              {v.wx.passes.map(p => (
                <div key={p.key} style={css(`padding:12px;border-radius:18px;background:var(--fill);border-left:4px solid ${p.color}`)}>
                  <div style={css('display:flex;align-items:center;gap:10px')}>
                    <i className={`ph-duotone ${p.icon}`} style={css(`font-size:28px;color:${p.color};flex:none`)} />
                    <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:800')}>{p.name} <span style={css('font-weight:600;color:var(--mute);font-size:12px')}>· {p.ft}</span></div><div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:1px')}>{p.when}</div></div>
                    <div style={css('flex:none;font-family:var(--fontH);font-size:22px;font-weight:600')}>{p.temp}</div>
                  </div>
                  <div style={css('font-size:12px;font-weight:600;color:var(--ink2);margin-top:8px;line-height:1.45')}>{p.text}</div>
                  {p.flags.map(f => <div key={f.text} style={css(`display:flex;gap:6px;align-items:center;margin-top:6px;font-size:12px;font-weight:800;color:${f.level === 'danger' ? 'var(--cor)' : 'var(--amb2)'}`)}><i className={`ph-fill ${f.icon}`} />{f.text}</div>)}
                </div>
              ))}
            </div>
            <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:10px;line-height:1.45')}>Weather at each pass's real height. Passes can close at short notice: check with local police before you set off.</div>
          </Fold>
        )}

        <Fold icon="ph-calendar-blank" iconColor="var(--amb2)" title="Season and road notes" summary={glance.seasonWarn ? `${glance.seasonWarn} warning${glance.seasonWarn > 1 ? 's' : ''}` : `${v.seasonNotes.length + v.liveRoadNotes.length} notes`} summaryColor={glance.seasonWarn ? 'var(--cor)' : undefined}>
          <div style={css('display:flex;flex-direction:column;gap:10px')}><Notes notes={[...v.seasonNotes, ...v.liveRoadNotes]} /></div>
        </Fold>

        {(v.wx.aq.rows.length > 0 || v.wx.aq.note) && (
          <Fold icon="ph-wind" iconColor="var(--sky)" title="Air quality" summary={v.wx.aq.rows.some(r => r.bad) ? 'Unhealthy' : v.wx.aq.rows[0]?.label || 'Smog season'} summaryColor={v.wx.aq.rows.some(r => r.bad) ? 'var(--cor)' : undefined}>
            {v.wx.aq.rows.length > 0 && <div style={css('display:flex;flex-direction:column;gap:8px')}>
              {v.wx.aq.rows.map(r => (
                <div key={r.key} style={css('display:flex;align-items:center;gap:10px')}>
                  <span style={css(`flex:none;min-width:44px;padding:4px 6px;border-radius:9px;background:var(--fill);color:${r.color};font-size:13px;font-weight:800;text-align:center;font-variant-numeric:tabular-nums`)}>{r.aqi}</span>
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{r.place} <span style={css('font-weight:600;color:var(--mute);font-size:12px')}>· {r.date}</span></div><div style={css(`font-size:12px;font-weight:700;color:${r.color}`)}>{r.label} · PM2.5 {r.pm} µg/m³</div></div>
                </div>
              ))}
            </div>}
            {v.wx.aq.note && <div style={css('font-size:13px;font-weight:600;color:var(--ink2);margin-top:8px;line-height:1.45')}>{v.wx.aq.note}</div>}
            {v.wx.aq.rows.some(r => r.bad) && <div style={css('font-size:12px;font-weight:700;color:var(--cor);margin-top:8px;line-height:1.45')}>Unhealthy air: wear N95 masks outdoors, keep car windows closed, and take care with children and elders.</div>}
            <div style={css('font-size:10px;font-weight:600;color:var(--mute);margin-top:8px')}>US AQI, highest of the day · Open-Meteo (CAMS)</div>
          </Fold>
        )}

        <PackingCard v={v} />

        {(v.wiki.info || v.wiki.loading) && (
          <Fold icon="ph-book-open-text" title={`About ${c.name}`} summary={v.wiki.info ? v.wiki.info.source : 'Loading…'}>
            {v.wiki.info?.image && <img src={v.wiki.info.image} alt="" loading="lazy" style={css('display:block;width:100%;height:150px;object-fit:cover;border-radius:16px')} />}
            {v.wiki.info && <>
              <p style={css('margin:10px 0 0;font-size:13px;font-weight:500;line-height:1.55;color:var(--ink2)')}>{v.wiki.info.extract}</p>
              <a href={v.wiki.info.url} target="_blank" rel="noopener" style={css('display:inline-flex;align-items:center;gap:4px;min-height:32px;margin-top:4px;font-size:12px;font-weight:700;color:var(--g);text-decoration:none')}>Read more on {v.wiki.info.source}<i className="ph-bold ph-arrow-up-right" /></a>
              <div style={css('font-size:10px;font-weight:600;color:var(--mute)')}>Text from {v.wiki.info.source}, CC BY-SA 4.0</div>
            </>}
          </Fold>
        )}

        {v.nearby.list.length > 0 && (
          <Fold icon="ph-binoculars" iconColor="var(--sky)" title="More places nearby" summary={`${v.nearby.list.length} places`}>
            <div style={css('display:flex;flex-direction:column;gap:10px')}>
              {v.nearby.list.map(x => (
                <a key={x.key} href={x.href} target="_blank" rel="noopener" style={css('display:flex;align-items:center;gap:10px;min-height:40px;text-decoration:none;color:var(--ink)')}>
                  <i className="ph-fill ph-binoculars" style={css('font-size:18px;color:var(--sky);flex:none')} />
                  <span style={css('flex:1;min-width:0')}><span style={css('display:block;font-size:14px;font-weight:700')}>{x.name}</span><span style={css('display:block;font-size:12px;color:var(--mute);font-weight:500;margin-top:1px')}>{x.note}</span></span>
                  <i className="ph-bold ph-arrow-up-right" style={css('font-size:14px;color:var(--mute);flex:none')} />
                </a>
              ))}
            </div>
            <div style={css('font-size:10px;font-weight:600;color:var(--mute);margin-top:10px')}>Places: OpenStreetMap contributors, via Geoapify</div>
          </Fold>
        )}

        <Fold icon="ph-seal-check" title="About these numbers" summary={v.priceNotes.every(n => n.ok) ? 'Prices checked' : 'Some not checked'} summaryColor={v.priceNotes.every(n => n.ok) ? 'var(--g)' : 'var(--amb2)'}>
          <div style={css('font-size:12px;font-weight:600;color:var(--ink2);line-height:1.5')}>Live: road distance and route (OpenRouteService), weather (Open-Meteo), places and hotels (OpenStreetMap), dollar rate. Prices that change by operator come from SafarCo’s price list:</div>
          <div style={css('display:flex;flex-direction:column;gap:8px;margin-top:12px')}>
            {v.priceNotes.map(n => (
              <div key={n.key} style={css('display:flex;gap:10px;align-items:flex-start')}>
                <i className={`ph-fill ${n.ok ? 'ph-seal-check' : 'ph-clock-countdown'}`} style={css(`font-size:17px;color:${n.ok ? 'var(--g)' : 'var(--amb)'};flex:none;margin-top:1px`)} />
                <div style={css('font-size:12px;font-weight:600;line-height:1.45;color:var(--ink2)')}><b>{n.label}</b> · {n.checked} · {n.source}</div>
              </div>
            ))}
          </div>
        </Fold>
        <div style={css('font-size:11px;font-weight:600;color:var(--mute);line-height:1.5;padding:0 6px')}>Mountain roads, passes and prices change quickly. Check road status with local police or NHA before you leave. <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></div>
      </div>
    </div>
  );
}
