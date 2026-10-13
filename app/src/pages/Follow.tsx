// /follow: the page family open from "Follow our trip". It shows where the travellers are in
// their plan, the latest check-ins, tonight's stay and emergency numbers. No sign-in needed.
// ?id=… reads a live link (supabase/follow.sql); ?trip=… is a plain copy of the plan.
import { useEffect, useState } from 'react';
import { getFollow, type FollowView } from '../cloud';
import { buildPlan } from '../engine/engine';
import { dayLabel, isoAdd } from '../engine/format';
import { DST } from '../engine/places';
import { css } from '../lib/css';
import { t } from '../i18n';
import { cleanTrip, tripFromUrl, type TripData } from '../trips';
import { daysBetween, phaseOf } from '../run';

const card = 'border-radius:22px;padding:16px;background:var(--card);border:1px solid var(--line)';
const ago = (iso: string) => {
  const m = Math.round((Date.now() - +new Date(iso)) / 60000);
  return m < 1 ? t('just now') : m < 60 ? t('{n} min ago', { n: m }) : m < 60 * 24 ? t('{n} h ago', { n: Math.round(m / 60) }) : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export function Follow() {
  const q = new URLSearchParams(location.search), id = q.get('id');
  const [st, setSt] = useState<{ status: 'loading' | 'ok' | 'gone' | 'error'; data?: TripData; checkins?: FollowView['checkins'] }>(() => {
    if (id) return { status: 'loading' };
    const d = tripFromUrl(); return d ? { status: 'ok', data: d, checkins: [] } : { status: 'gone' };
  });
  useEffect(() => {
    if (!id) return;
    const load = () => getFollow(id).then(v => {
      const d = v && !v.expired ? cleanTrip(v.data) : null;
      setSt(d ? { status: 'ok', data: d, checkins: v!.checkins } : { status: 'gone' });
    }).catch(() => setSt(s => s.status === 'ok' ? s : { status: 'error' }));
    load();
    // Check again every two minutes while the page is open.
    const timer = setInterval(load, 120000); return () => clearInterval(timer);
  }, [id]);

  const wrap = (children: React.ReactNode) => (
    <div data-sc="1" data-theme="paper" style={css('min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--font)')}>
      <main style={css('max-width:520px;margin:0 auto;padding:24px 16px 48px;display:flex;flex-direction:column;gap:12px')}>
        <div style={css('display:flex;align-items:center;gap:8px')}><img src="/icon.svg" alt="" width="32" height="32" style={css('border-radius:9px')} /><span style={css('font-family:var(--fontH);font-size:18px;font-weight:700')}>SafarCo</span></div>
        {children}
        <a href="/" style={css('align-self:center;margin-top:8px;font-size:13px;font-weight:800;color:var(--g);text-decoration:none')}>{t('Plan your own trip with SafarCo')} →</a>
      </main>
    </div>
  );
  if (st.status === 'loading') return wrap(<div style={css(card)}>{t('Loading the trip…')}</div>);
  if (st.status !== 'ok' || !st.data) return wrap(<div style={css(card)}><h1 style={css('margin:0;font-size:20px')}>{st.status === 'error' ? t('Couldn’t load the trip') : t('This link has ended')}</h1><p style={css('margin:8px 0 0;color:var(--mute);font-size:14px;line-height:1.5')}>{st.status === 'error' ? t('Check your connection and open the link again.') : t('The traveller stopped sharing, or the trip finished a few days ago.')}</p></div>);

  const d = st.data, D = DST(d.corridor), plan = buildPlan(d), today = isoAdd(0), n = plan.days.length;
  const phase = phaseOf(d.startDate, n, today), i = Math.max(0, Math.min(n - 1, daysBetween(d.startDate, today))), day = plan.days[i];
  const last = st.checkins?.[0];
  const status = phase === 'before' ? t('Leaves in {n} days', { n: daysBetween(today, d.startDate) }) : phase === 'after' ? t('The trip has finished') : t('Day {n} of {total}: {title}', { n: i + 1, total: n, title: day.title });
  return wrap(<>
    <section style={css(card)}>
      <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--amb2)')}>{t('Follow our trip')}</div>
      <h1 style={css('margin:6px 0 0;font-family:var(--fontH);font-size:26px;font-weight:600;line-height:1.15')}>{d.origin} → {D.name}</h1>
      <div style={css('font-size:14px;font-weight:700;color:var(--ink2);margin-top:6px')}>{dayLabel(d.startDate, 0)} → {dayLabel(d.startDate, n - 1)}</div>
      <div style={css('margin-top:12px;padding:10px 12px;border-radius:14px;background:var(--fill);font-size:15px;font-weight:800')}>{status}</div>
    </section>
    {last && <section style={css(card + ';border-color:rgba(46,229,157,.45)')}>
      <div style={css('display:flex;align-items:center;gap:10px')}>
        <i className="ph-fill ph-check-circle" style={css('font-size:28px;color:var(--g);flex:none')} />
        <div style={css('flex:1;min-width:0')}><div style={css('font-size:12px;font-weight:800;color:var(--mute)')}>{t('Last check-in')}</div><div style={css('font-size:17px;font-weight:800')}>{last.place}</div><div style={css('font-size:12px;font-weight:600;color:var(--mute)')}>{ago(last.created_at)}</div></div>
        {last.lat != null && last.lon != null && <a href={`https://maps.google.com/?q=${last.lat},${last.lon}`} target="_blank" rel="noopener" style={css('flex:none;height:40px;padding:0 12px;border-radius:12px;background:var(--fill);border:1px solid var(--line2);color:var(--ink);font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px;text-decoration:none')}><i className="ph-fill ph-map-pin" />{t('Map')}</a>}
      </div>
      {(st.checkins || []).slice(1, 5).map(c => <div key={c.created_at} style={css('font-size:13px;font-weight:600;color:var(--ink2);margin-top:8px')}>✓ {c.place} · {ago(c.created_at)}</div>)}
    </section>}
    {phase === 'during' && day.stay && <section style={css(card)}>
      <div style={css('display:flex;align-items:center;gap:10px')}><i className="ph-fill ph-bed" style={css('font-size:24px;color:var(--g)')} /><div><div style={css('font-size:12px;font-weight:800;color:var(--mute)')}>{t('Tonight')}</div><div style={css('font-size:16px;font-weight:800')}>{day.stay.place}</div></div></div>
    </section>}
    <section style={css(card)}>
      <h2 style={css('margin:0 0 10px;font-size:15px;font-weight:800')}>{t('The plan')}</h2>
      {plan.days.map((x, k) => (
        <div key={k} style={css(`display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:${k ? '1px solid var(--line)' : '0'};opacity:${phase === 'during' && k < i ? .55 : 1}`)}>
          <span style={css(`flex:none;width:28px;height:28px;border-radius:9px;background:${phase === 'during' && k === i ? 'var(--cta)' : 'var(--fill)'};color:${phase === 'during' && k === i ? 'var(--onCta)' : 'var(--ink)'};font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center`)}>{k + 1}</span>
          <div style={css('min-width:0')}><div style={css('font-size:11px;font-weight:800;color:var(--mute);text-transform:uppercase;letter-spacing:.05em')}>{x.date}</div><div style={css('font-size:14px;font-weight:800')}>{x.title}</div>{x.stay && <div style={css('font-size:12px;font-weight:600;color:var(--mute)')}>{t('Night in {place}', { place: x.stay.place })}</div>}</div>
        </div>
      ))}
    </section>
    <section style={css(card)}>
      <h2 style={css('margin:0 0 10px;font-size:15px;font-weight:800')}>{t('Emergency')}</h2>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:8px')}>
        {[['1122', t('Rescue')], ['15', t('Police')], ['130', t('Motorway Police')], ['115', t('Edhi Ambulance')]].map(([num, label]) => <a key={num} href={`tel:${num}`} style={css('padding:10px 12px;border-radius:14px;background:rgba(255,107,91,.1);border:1px solid rgba(255,107,91,.3);color:var(--ink);text-decoration:none')}><div style={css('font-size:17px;font-weight:800')}>{num}</div><div style={css('font-size:12px;font-weight:600;color:var(--ink2)')}>{label}</div></a>)}
      </div>
    </section>
  </>);
}
