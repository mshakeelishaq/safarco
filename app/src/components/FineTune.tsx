// "Fine tune your trip": every choice the plan already made for you, one row each, opened only when wanted.
import { useState } from 'react';
import { css } from '../lib/css';
import { t } from '../i18n';
import type { Api, View } from '../view';
import { RoomRate } from './RoomRate';
import { DST } from '../engine/places';

/** One choice: what it is, what the plan uses now, and (tapped) the way to change it. */
export function TuneRow({ icon, title, value, children, first }: { icon: string; title: string; value: string; children: React.ReactNode; first?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={css(first ? '' : 'border-top:1px solid var(--line)')}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={css('width:100%;display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 2px;border:0;background:none;color:var(--ink);text-align:left;cursor:pointer;font:inherit')}>
        <i className={`ph-fill ${icon}`} style={css('font-size:19px;color:var(--g);flex:none')} />
        <span style={css('flex:1;min-width:0')}>
          <span style={css('display:block;font-size:14px;font-weight:800')}>{title}</span>
          <span style={css('display:block;font-size:12px;font-weight:600;color:var(--mute);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{value}</span>
        </span>
        <i className={`ph-bold ${open ? 'ph-caret-up' : 'ph-caret-down'}`} style={css('color:var(--mute);flex:none')} />
      </button>
      {open && <div style={css('padding:0 2px 14px')}>{children}</div>}
    </div>
  );
}

const small = 'min-height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:13px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px';

export function FineTune({ v, api, road, places, ideas }: { v: View; api: Api; road?: React.ReactNode; places?: React.ReactNode; ideas: React.ReactNode[] }) {
  const { s, plan } = v, set = api.set, rows: { key: string; icon: string; title: string; value: string; body: React.ReactNode }[] = [];
  if (road && v.roadChoice) rows.push({ key: 'road', icon: 'ph-road-horizon', title: t('Road'), value: v.roadChoice.fastest ? t('{road}, fastest', { road: v.roadChoice.current.label }) : v.roadChoice.current.label, body: road });
  // Nights on the way: each drive day that ends short of the destination, opened on its own page to change.
  const towns = [s.corridor, ...(s.extra || [])].map(k => DST(k).town), town = (p: string) => p.split(' · ')[0];
  const nights = plan.days.map((d, i) => ({ d, i })).filter(x => (x.d.kind === 'drive' || x.d.kind === 'return') && x.d.roadNight?.options.length && x.d.stay && !towns.includes(town(x.d.stay.place)));
  if (nights.length) rows.push({ key: 'nights', icon: 'ph-bed', title: t('Nights on the road'), value: [...new Set(nights.map(x => town(x.d.stay!.place)))].join(', '),
    body: <div style={css('display:flex;flex-direction:column;gap:6px')}>
      {nights.map(x => <button key={x.i} onClick={() => v.openDay(x.i)} style={css('display:flex;align-items:center;gap:10px;min-height:44px;padding:8px 12px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);text-align:left;cursor:pointer;font:inherit')}>
        <span style={css('flex:1;min-width:0;font-size:13px;font-weight:700;line-height:1.35')}>{t('Day {n}: night in {place}', { n: x.i + 1, place: town(x.d.stay!.place) })}</span>
        <span style={css('flex:none;font-size:12px;font-weight:800;color:var(--g)')}>{t('Change')}</span>
      </button>)}
    </div> });
  if (!v.isAir) rows.push({ key: 'len', icon: 'ph-calendar-blank', title: t('Trip length'), value: s.days === 1 ? t('1 day') : t('{n} days', { n: s.days }),
    body: <div style={css('display:flex;gap:8px;flex-wrap:wrap')}>
      {s.days < 14 && <button onClick={() => set({ sheet: 'moredays', addDays: 1 })} style={css(small)}><i className="ph-bold ph-plus" />{t('More days')}</button>}
      {s.days > 1 && <button onClick={() => set({ sheet: 'lessdays', lessTo: s.days - 1 })} style={css(small)}><i className="ph-bold ph-minus" />{t('Fewer days')}</button>}
    </div> });
  if (places) rows.push({ key: 'places', icon: 'ph-map-pin-plus', title: t('Places'), value: v.c.to, body: places });
  if (plan.hasDep) {
    const cur = plan.depChips.find(p => p.key === String(s.depart ?? null));
    rows.push({ key: 'dep', icon: 'ph-clock', title: t('Leave at'), value: cur ? cur.label : t('Auto · each day'), body: <>
      <div style={css('display:flex;gap:6px;flex-wrap:wrap')}>
        {plan.depChips.map(p => <button key={p.key} onClick={p.onClick} style={css(`flex:none;height:36px;padding:0 11px;border-radius:12px;border:1px solid ${p.border};background:${p.bg};color:${p.fg};font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap`)}>{p.label}</button>)}
      </div>
      <div style={css(`font-size:12px;color:${plan.depNoteC};font-weight:600;margin-top:6px;line-height:1.45`)}>{plan.depNote}</div>
      {plan.wxDepart && <button onClick={plan.wxDepart.apply} style={css(small + ';margin-top:8px')}><i className="ph-fill ph-cloud-sun" />{t('Use {label}', { label: plan.wxDepart.label })}</button>}
    </> });
  }
  if (v.comfort) rows.push({ key: 'comfort', icon: 'ph-buildings', title: t('Comfort: fewer hotel changes'), value: v.comfort.on ? t('On') : t('Off'), body: <>
    <div style={css('font-size:12px;font-weight:600;color:var(--mute);line-height:1.45')}>{v.comfort.sub}</div>
    <button onClick={v.comfort.toggle} role="switch" aria-checked={v.comfort.on} style={css(small + ';margin-top:8px')}><i className={`ph-fill ${v.comfort.on ? 'ph-toggle-right' : 'ph-toggle-left'}`} style={css(`font-size:20px;color:${v.comfort.on ? 'var(--g)' : 'var(--mute)'}`)} />{v.comfort.on ? t('Turn off') : t('Turn on')}</button>
  </> });
  rows.push({ key: 'rate', icon: 'ph-wallet', title: t('Room rate'), value: t('{amount} a night', { amount: v.roomRate.value }), body: <RoomRate v={v} /> });
  if (ideas.length) rows.push({ key: 'ideas', icon: 'ph-lightbulb', title: t('More ideas'), value: ideas.length === 1 ? t('1 more idea') : t('{n} more ideas', { n: ideas.length }), body: <div style={css('display:flex;flex-direction:column;gap:10px')}>{ideas}</div> });
  return (
    <section aria-label={t('Fine tune your trip')} style={css('border-radius:26px;padding:14px 16px 6px;background:var(--card);border:1px solid var(--line)')}>
      <h2 style={css('margin:0;font-size:16px;font-weight:800;display:flex;align-items:center;gap:8px')}><i className="ph-fill ph-sliders-horizontal" style={css('color:var(--g)')} />{t('Fine tune your trip')}</h2>
      <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin:3px 0 4px;line-height:1.4')}>{t('SafarCo already chose the best for you. Change anything here if you like.')}</div>
      {rows.map((r, i) => <TuneRow key={r.key} icon={r.icon} title={r.title} value={r.value} first={i === 0}>{r.body}</TuneRow>)}
    </section>
  );
}
