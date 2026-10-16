// Before, during and after the trip: the get-ready checklist, Today on the road, the trip
// summary, expenses, and the Share / SOS / Expense sheets. Data comes from src/view-trip.ts.
import { useState } from 'react';
import { css } from '../lib/css';
import { t } from '../i18n';
import type { Api, View } from '../view';
import { EXPENSE_CATS } from '../view-trip';
import { Panel, btn, input } from './Panels';

const card = 'border-radius:24px;background:var(--card);border:1px solid var(--line);padding:16px';
const pill = (on: boolean) => css(`min-height:36px;padding:0 12px;border-radius:12px;border:1px solid ${on ? 'transparent' : 'var(--line2)'};background:${on ? 'var(--cta)' : 'var(--fill)'};color:${on ? 'var(--onCta)' : 'var(--ink)'};font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap`);
const Check = ({ on }: { on: boolean }) => <i className={on ? 'ph-fill ph-check-square' : 'ph-bold ph-square'} style={css(`font-size:21px;flex:none;color:${on ? 'var(--g)' : 'var(--mute)'}`)} />;

/** Plan tab: lock the plan, or how long until the trip. */
export function LockChip({ v, api }: { v: View; api: Api }) {
  const g = v.trip.getReady; if (!g) return null;
  return g.locked
    ? <button onClick={() => api.set({ tab: 'prepare' })} style={css('margin-top:12px;width:100%;min-height:44px;padding:0 12px;border-radius:14px;border:1px solid rgba(46,229,157,.4);background:rgba(46,229,157,.1);color:var(--ink);font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:8px')}><i className="ph-fill ph-lock-simple" style={css('color:var(--g)')} />{t('Locked · {countdown}', { countdown: g.countdown })}<span style={css('margin-left:auto;color:var(--g)')}>{t('{done} of {total} ready', { done: g.done, total: g.total })}</span><i className="ph-bold ph-caret-right" /></button>
    : <button onClick={g.lock} style={css('margin-top:12px;width:100%;min-height:46px;border-radius:14px;border:0;background:var(--cta);color:var(--onCta);font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px')}><i className="ph-fill ph-check-circle" />{t('Lock this plan and start the countdown')}</button>;
}

/** Prepare tab: the countdown and what to do when. */
export function GetReadyCard({ v }: { v: View }) {
  const g = v.trip.getReady; if (!g) return null;
  if (!g.locked) return (
    <section aria-label={t('Get ready')} style={css(card + ';display:flex;gap:12px;align-items:flex-start')}>
      <i className="ph-fill ph-calendar-check" style={css('font-size:26px;color:var(--g);flex:none')} />
      <div style={css('flex:1;min-width:0')}>
        <h2 style={css('margin:0;font-size:16px;font-weight:800')}>{t('Happy with the plan? Lock it')}</h2>
        <p style={css('margin:4px 0 0;font-size:13px;font-weight:600;color:var(--ink2);line-height:1.45')}>{t('You get a countdown and a checklist: what to book, check and pack, and when. You can still change the plan.')}</p>
        <button onClick={g.lock} style={css('margin-top:10px;height:42px;padding:0 14px;border-radius:13px;border:0;background:var(--cta);color:var(--onCta);font-size:13px;font-weight:800;cursor:pointer')}>{t('Lock this plan')}</button>
      </div>
    </section>
  );
  return (
    <section aria-label={t('Get ready')} style={css(card)}>
      <div style={css('display:flex;align-items:flex-end;justify-content:space-between;gap:10px')}>
        <div><div style={css('font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)')}>{t('Get ready')}</div><div style={css('font-family:var(--fontH);font-size:28px;font-weight:600;letter-spacing:-.02em;margin-top:2px')}>{g.countdown}</div></div>
        <div style={css('font-size:13px;font-weight:800;color:var(--g)')}>{t('{done} of {total} ready', { done: g.done, total: g.total })}</div>
      </div>
      <div style={css('height:6px;border-radius:3px;background:var(--fill2);margin-top:10px;overflow:hidden')}><div style={css(`height:100%;width:${g.done / Math.max(1, g.total) * 100}%;background:var(--g);border-radius:3px;transition:width .4s`)} /></div>
      {g.groups.map(gr => (
        <div key={gr.key} style={css('margin-top:14px')}>
          <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--amb2)')}>{gr.label}</div>
          {gr.tasks.map(k => (
            <div key={k.key} style={css('display:flex;align-items:center;gap:10px;min-height:46px;padding:4px 0')}>
              <button onClick={k.toggle || undefined} disabled={!k.toggle} role="checkbox" aria-checked={k.done} style={css('flex:1;min-width:0;display:flex;align-items:flex-start;gap:10px;padding:0;border:0;background:none;color:var(--ink);text-align:left;cursor:pointer')}>
                <Check on={k.done} />
                <span style={css('min-width:0')}><span style={css(`display:block;font-size:14px;font-weight:700;line-height:1.35;${k.done ? 'text-decoration:line-through;color:var(--mute)' : ''}`)}>{k.text}{k.late && <span style={css('margin-left:6px;padding:1px 6px;border-radius:6px;background:rgba(255,181,71,.2);color:var(--amb2);font-size:10px;font-weight:800')}>{t('Due')}</span>}</span>{k.sub && <span style={css('display:block;font-size:12px;font-weight:600;color:var(--mute);margin-top:1px')}>{k.sub}</span>}</span>
              </button>
              {k.action && <button onClick={k.action.run} style={css('flex:none;height:34px;padding:0 12px;border-radius:11px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer')}>{k.action.label}</button>}
            </div>
          ))}
        </div>
      ))}
      <button onClick={g.unlock} style={css('margin-top:8px;min-height:32px;padding:0;border:0;background:none;color:var(--mute);font-size:12px;font-weight:700;cursor:pointer')}>{t('Unlock the plan')}</button>
    </section>
  );
}

/** Plan tab during the trip: today's road, the next stop, fuel, sunset and help. */
export function TodayCard({ v, api, onCheckIn }: { v: View; api: Api; onCheckIn: (place: string) => void }) {
  const d = v.trip.today, [picking, setPicking] = useState(false), [all, setAll] = useState(false); if (!d) return null;
  // The next few stops; the rest (and those done) behind "show all".
  const shown = all ? d.stops : d.stops.filter(st => !st.done).slice(0, 4), hidden = d.stops.length - shown.length;
  const stat = (icon: string, label: string, value: string) => <div style={css('flex:1;min-width:0;padding:8px 10px;border-radius:14px;background:var(--fill)')}><div style={css('display:flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:var(--mute)')}><i className={`ph-fill ${icon}`} />{label}</div><div style={css('font-size:13px;font-weight:800;margin-top:2px;line-height:1.3')}>{value}</div></div>;
  return (
    <section aria-label={t('Today')} style={css('border-radius:26px;padding:16px;background:linear-gradient(var(--card),var(--card)) padding-box,linear-gradient(160deg,#2EE59D,#3B8DFF) border-box;border:2px solid transparent')}>
      <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--g)')}>{t('Today · Day {n} of {total}', { n: d.num, total: d.of })}</div>
      <h2 style={css('margin:4px 0 0;font-family:var(--fontH);font-size:22px;font-weight:600;line-height:1.2')}>{d.title}</h2>
      {d.progress ? <div style={css('margin-top:10px')}>
        <div style={css('display:flex;justify-content:space-between;font-size:12px;font-weight:800;color:var(--ink2)')}><span>{t('{done} of {total} km', { done: d.progress.done, total: d.progress.total })}</span><span>{t('{n} km to go', { n: Math.max(0, d.progress.total - d.progress.done) })}</span></div>
        <div style={css('height:8px;border-radius:4px;background:var(--fill2);margin-top:5px;overflow:hidden')}><div style={css(`height:100%;width:${d.progress.pct}%;background:linear-gradient(90deg,#2EE59D,#3B8DFF);border-radius:4px`)} /></div>
        <button onClick={() => v.trip.locate()} style={css('margin-top:4px;min-height:30px;padding:0;border:0;background:none;color:var(--mute);font-size:11px;font-weight:700;cursor:pointer')}>{d.fixAge != null && d.fixAge > 0 ? t('Location from {n} min ago · update', { n: d.fixAge }) : t('Update location')}</button>
      </div> : v.trip.today && (d.kind === 'drive' || d.kind === 'return') && <button onClick={() => v.trip.locate()} style={css('margin-top:10px;width:100%;min-height:42px;border-radius:13px;border:1px dashed var(--line2);background:var(--fill);color:var(--ink);font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px')}><i className="ph-fill ph-crosshair" />{t('Where am I on the road?')}</button>}
      <div style={css('display:flex;gap:6px;margin-top:10px')}>
        {d.next && stat('ph-flag', t('Next'), `${d.next.label}${d.next.time && /\d/.test(d.next.time) ? ` · ${d.next.time}` : ''}`)}
        {d.fuel && stat('ph-gas-pump', t('Fuel'), d.progress ? t('{place} · in {km} km', { place: d.fuel.label, km: Math.max(0, d.fuel.at - d.progress.done) }) : `${d.fuel.label} · ${t('km {km}', { km: d.fuel.at })}`)}
        {stat('ph-sun-horizon', t('Sunset'), d.sunset)}
      </div>
      {d.late && <div style={css('margin-top:10px;padding:10px 12px;border-radius:14px;background:rgba(255,181,71,.13);border:1px solid rgba(255,181,71,.45)')}>
        <div style={css('display:flex;gap:8px;font-size:13px;font-weight:700;line-height:1.45')}><i className="ph-fill ph-clock-countdown" style={css('color:var(--amb2);font-size:18px;flex:none')} />{d.late.text}</div>
        <div style={css('display:flex;gap:6px;flex-wrap:wrap;margin-top:8px')}>
          {d.late.skip && <button onClick={d.late.skip.run} style={css('height:36px;padding:0 12px;border-radius:11px;border:0;background:var(--ink);color:var(--bg);font-size:12px;font-weight:800;cursor:pointer')}>{d.late.skip.label}</button>}
          {d.late.dark && <a href={d.late.hotels} target="_blank" rel="noopener" style={css('height:36px;padding:0 12px;border-radius:11px;border:1px solid var(--line2);background:var(--card);color:var(--ink);font-size:12px;font-weight:800;display:flex;align-items:center;gap:5px;text-decoration:none')}><i className="ph-fill ph-bed" />{t('Find a hotel near you')}</a>}
        </div>
        {d.late.dark && <div style={css('font-size:12px;font-weight:600;color:var(--ink2);margin-top:6px')}>{t('Mountain roads are dangerous after dark. Stopping for the night is the safe choice.')}</div>}
      </div>}
      <div style={css('display:flex;flex-direction:column;gap:2px;margin-top:10px')}>
        {shown.map(st => <button key={st.key} onClick={st.toggle} role="checkbox" aria-checked={st.done} style={css('display:flex;align-items:center;gap:10px;min-height:40px;padding:2px 0;border:0;background:none;color:var(--ink);text-align:left;cursor:pointer')}>
          <Check on={st.done} /><span style={css('width:62px;flex:none;font-size:11px;font-weight:800;color:var(--mute)')}>{st.time}</span><span style={css(`flex:1;min-width:0;font-size:13px;font-weight:700;${st.done ? 'text-decoration:line-through;color:var(--mute)' : ''}`)}>{st.label}</span>
        </button>)}
        {(hidden > 0 || all) && <button onClick={() => setAll(!all)} style={css('align-self:flex-start;min-height:32px;padding:0;border:0;background:none;color:var(--g);font-size:12px;font-weight:800;cursor:pointer')}>{all ? t('Show fewer') : t('Show all {n} stops', { n: d.stops.length })}</button>}
      </div>
      {d.tonight && <div style={css('font-size:12px;font-weight:700;color:var(--ink2);margin-top:6px;display:flex;align-items:center;gap:6px')}><i className="ph-fill ph-bed" style={css('color:var(--g)')} />{t('Tonight: {place}.', { place: d.tonight })}</div>}
      {picking && <div style={css('margin-top:10px;padding:10px;border-radius:14px;background:var(--fill)')}>
        <div style={css('font-size:12px;font-weight:800;color:var(--ink2)')}>{t('Where have you reached?')}</div>
        <div style={css('display:flex;gap:6px;flex-wrap:wrap;margin-top:8px')}>{[...new Set(d.stops.filter(st => st.kind !== 'go').map(st => st.label))].map(p => <button key={p} onClick={() => { setPicking(false); onCheckIn(p); }} style={pill(false)}>{p}</button>)}</div>
      </div>}
      <div style={css('display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:12px')}>
        <button onClick={() => setPicking(!picking)} style={css('min-height:48px;border-radius:14px;border:0;background:var(--cta);color:var(--onCta);font-size:12px;font-weight:800;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px')}><i className="ph-fill ph-check-circle" style={css('font-size:18px')} />{t('Check in')}</button>
        <button onClick={v.trip.shareLocation} style={css('min-height:48px;border-radius:14px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px')}><i className="ph-fill ph-map-pin" style={css('font-size:18px;color:var(--sky)')} />{t('Send location')}</button>
        <button onClick={() => api.set({ sheet: 'sos' })} style={css('min-height:48px;border-radius:14px;border:0;background:linear-gradient(135deg,#FF8A6B,#FF4F7B);color:#fff;font-size:12px;font-weight:800;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px')}><i className="ph-fill ph-first-aid" style={css('font-size:18px')} />{t('Emergency')}</button>
      </div>
    </section>
  );
}

/** Plan tab after the trip: what it came to, the share card, and where to next. */
export function MemoriesCard({ v, onCard, onNext }: { v: View; onCard: () => void; onNext: (wish: string) => void }) {
  const m = v.trip.memories; if (!m) return null;
  return (
    <section aria-label={t('Your trip')} style={css(card)}>
      <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--amb2)')}>{t('Your trip')}</div>
      <h2 style={css('margin:4px 0 0;font-family:var(--fontH);font-size:22px;font-weight:600')}>{t('Welcome back!')}</h2>
      <div style={css('display:flex;gap:6px;margin-top:12px')}>
        {m.stats.map(st => <div key={st.key} style={css('flex:1;min-width:0;padding:10px;border-radius:14px;background:var(--fill)')}><i className={`ph-fill ${st.icon}`} style={css('font-size:17px;color:var(--g)')} /><div style={css('font-size:15px;font-weight:800;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{st.value}</div><div style={css('font-size:11px;font-weight:600;color:var(--mute)')}>{st.label}</div></div>)}
      </div>
      {m.money && <div style={css('font-size:13px;font-weight:700;color:var(--ink2);margin-top:10px')}>{m.money}</div>}
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px')}>
        <button onClick={onCard} style={css('min-height:46px;border-radius:14px;border:0;background:var(--cta);color:var(--onCta);font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px')}><i className="ph-fill ph-instagram-logo" />{t('Share my trip')}</button>
        <button onClick={() => onNext(m.next.wish)} style={css('min-height:46px;border-radius:14px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px')}><i className={`ph-fill ${m.next.icon}`} />{m.next.label}</button>
      </div>
    </section>
  );
}

/** Budget tab: what's been spent against the plan, and who owes whom. */
export function ExpensesCard({ v }: { v: View }) {
  const e = v.trip.expenses, [all, setAll] = useState(false);
  const sub = css('margin:16px 0 6px;font-size:12px;font-weight:800;color:var(--mute);text-transform:uppercase;letter-spacing:.06em');
  const small = css('height:34px;padding:0 11px;border-radius:11px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px');
  return (
    <section aria-label={t('Spent on this trip')} style={css(card)}>
      <div style={css('display:flex;align-items:center;gap:10px')}>
        <i className="ph-fill ph-receipt" style={css('font-size:20px;color:var(--g)')} />
        <h2 style={css('flex:1;margin:0;font-size:15px;font-weight:800')}>{t('Spent on this trip')}</h2>
        <button onClick={e.open} style={css('height:36px;padding:0 12px;border-radius:12px;border:0;background:var(--cta);color:var(--onCta);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px')}><i className="ph-bold ph-plus" />{t('Add')}</button>
      </div>

      {/* Who's on the trip comes first: costs are split between them. */}
      <div style={css('display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap')}>
        <i className="ph-fill ph-users-three" style={css('color:var(--mute)')} />
        <span style={css('flex:1;min-width:0;font-size:13px;font-weight:700;color:var(--ink2)')}>{e.group ? e.people.map(p => (e.shares[p] || 1) > 1 ? `${p} ×${e.shares[p]}` : p).join(', ') : t('Just you so far')}</span>
        <button onClick={e.openPeople} style={small}><i className="ph-bold ph-user-plus" />{e.group ? t('People') : t('Add people')}</button>
      </div>

      {!e.list.length ? <p style={css('margin:10px 0 0;font-size:13px;font-weight:600;color:var(--ink2);line-height:1.45')}>{e.group ? t('One person keeps the list: add each cost, who paid and who shares it. SafarCo works out who owes whom, and everyone can see it from a link.') : t('Add who is on the trip first, then each cost as you go: fuel, hotels, food. SafarCo works out who owes whom.')}</p> : <>
        <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:12px;flex-wrap:wrap')}><span style={css('font-family:var(--fontH);font-size:26px;font-weight:600;font-variant-numeric:tabular-nums')}>{e.spentStr}</span><span style={css(`font-size:13px;font-weight:800;color:${e.over ? 'var(--cor)' : 'var(--g)'}`)}>{e.over ? t('{amount} over the plan', { amount: e.leftStr }) : t('{amount} left in the plan', { amount: e.leftStr })}</span></div>
        <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={e.pct} aria-label={t('Spent against the plan')} style={css('height:8px;border-radius:4px;background:var(--fill2);margin-top:8px;overflow:hidden')}><div style={css(`height:100%;width:${e.pct}%;border-radius:4px;background:${e.over ? 'var(--cor)' : 'var(--g)'}`)} /></div>
        <div style={css('display:flex;flex-direction:column;gap:8px;margin-top:12px')}>
          {e.cats.map(c => <div key={c.key}>
            <div style={css('display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700')}><i className={`ph-fill ${c.icon}`} style={css('color:var(--mute)')} /><span style={css('flex:1')}>{c.label}</span><span style={css('font-variant-numeric:tabular-nums')}>{c.spentStr}</span><span style={css('font-size:12px;color:var(--mute);font-variant-numeric:tabular-nums')}>/ {c.plannedStr}</span></div>
            <div style={css('height:4px;border-radius:2px;background:var(--fill2);margin-top:4px;overflow:hidden')}><div style={css(`height:100%;width:${c.pct}%;background:${c.over ? 'var(--cor)' : 'var(--sky)'}`)} /></div>
          </div>)}
        </div>

        {e.group && <>
          <h3 style={sub}>{t('Who paid what')}</h3>
          <div style={css('display:flex;flex-direction:column')}>
            {e.rows.map(r => <div key={r.name} style={css('display:flex;align-items:center;gap:8px;min-height:48px;padding:4px 0;border-bottom:1px solid var(--line)')}>
              <span style={css('flex:1;min-width:0')}>
                <span style={css('display:block;font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{r.name}{r.units > 1 && <span style={css('font-weight:700;color:var(--mute)')}> ×{r.units}</span>}</span>
                <span style={css('display:block;font-size:11px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums')}>{t('paid {paid} · share {share}', { paid: r.paidStr, share: r.shareStr })}</span>
              </span>
              <span style={css(`min-width:84px;text-align:right;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;color:${r.net > 0 ? 'var(--g)' : r.net < 0 ? 'var(--cor)' : 'var(--mute)'}`)}>{r.net > 0 ? t('gets {amount}', { amount: r.netStr }) : r.net < 0 ? t('owes {amount}', { amount: r.netStr }) : t('even')}</span>
            </div>)}
          </div>
          <h3 style={sub}>{t('To settle up')}</h3>
          {e.settle.length ? <div style={css('display:flex;flex-direction:column;gap:6px')}>{e.settle.map(p => <div key={p.from + p.to} style={css('display:flex;align-items:center;gap:8px;min-height:40px;padding:4px 4px 4px 12px;border-radius:14px;background:var(--fill)')}>
            <i className="ph-bold ph-arrow-right" style={css('color:var(--g);flex:none')} /><span style={css('flex:1;min-width:0;font-size:13px;font-weight:800')}>{p.text}</span>
            <button onClick={p.markPaid} style={small}><i className="ph-bold ph-check" />{t('Mark paid')}</button>
          </div>)}</div> : <div style={css('font-size:13px;font-weight:700;color:var(--g);display:flex;align-items:center;gap:6px')}><i className="ph-fill ph-check-circle" />{t('All settled up.')}</div>}
          {e.payments.length > 0 && <div style={css('margin-top:8px;display:flex;flex-direction:column;gap:2px')}>{e.payments.slice(0, 4).map(p => <div key={p.id} style={css('display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--mute)')}><i className="ph-fill ph-check-circle" style={css('color:var(--g)')} /><span style={css('flex:1')}>{p.text}</span><button onClick={p.undo} style={css('border:0;background:none;color:var(--mute);font-size:12px;font-weight:800;cursor:pointer;text-decoration:underline')}>{t('Undo')}</button></div>)}</div>}
          <button onClick={e.share} style={{ ...btn(false), width: '100%', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><i className="ph-fill ph-whatsapp-logo" style={css('color:#25D366')} />{t('Send the group a summary')}</button>
          <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:6px;text-align:center;line-height:1.4')}>{t('Everyone gets a link to see the list. Only this phone can change it.')}</div>
        </>}

        <h3 style={sub}>{t('Expenses')}</h3>
        {(all ? e.list : e.list.slice(0, 6)).map(x => <div key={x.id} style={css('display:flex;align-items:center;gap:10px;min-height:44px')}>
          <i className={`ph-fill ${x.icon}`} style={css('font-size:17px;color:var(--mute);flex:none')} />
          <div style={css('flex:1;min-width:0')}><div style={css('font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{x.label}</div><div style={css('font-size:11px;font-weight:600;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{[x.when, e.group ? x.who : ''].filter(Boolean).join(' · ')}</div></div>
          <span style={css('font-size:13px;font-weight:800;font-variant-numeric:tabular-nums')}>{x.amountStr}</span>
          <button onClick={x.remove} aria-label={t('Remove {name}', { name: x.label })} style={css('flex:none;width:30px;height:30px;border-radius:9px;border:0;background:none;color:var(--mute);cursor:pointer')}><i className="ph-bold ph-x" /></button>
        </div>)}
        {e.list.length > 6 && <button onClick={() => setAll(!all)} style={css('min-height:32px;padding:0;border:0;background:none;color:var(--g);font-size:12px;font-weight:800;cursor:pointer')}>{all ? t('Show fewer') : t('Show all {n}', { n: e.list.length })}</button>}
      </>}
    </section>
  );
}

/** Who's on the trip, and how many shares each pays. Set up once, before the first expense. */
export function PeopleSheet({ v, open, onClose }: { v: View; open: boolean; onClose: () => void }) {
  const e = v.trip.expenses, [name, setName] = useState('');
  const add = () => { e.addPerson(name); setName(''); };
  const step = css('width:34px;height:34px;border-radius:11px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:16px;cursor:pointer');
  return (
    <Panel open={open} onClose={onClose} title={t('Who is on the trip')} sub={t('Costs are split between these people. A couple or a family can pay 2 or more shares.')} height={600}>
      <div style={css('display:flex;flex-direction:column')}>
        {e.people.map((p, i) => <div key={p} style={css('display:flex;align-items:center;gap:8px;min-height:50px;border-bottom:1px solid var(--line)')}>
          {i === 0 ? <input key={p} defaultValue={p === e.me ? '' : p} placeholder={t('Your name')} aria-label={t('Your name')} onBlur={x => e.rename(p, x.target.value)} onKeyDown={x => { if (x.key === 'Enter') (x.target as HTMLInputElement).blur(); }} style={{ ...input, height: 40, flex: 1, minWidth: 0, fontWeight: 800 }} />
            : <span style={css('flex:1;min-width:0;font-size:14px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{p}</span>}
          <span style={css('font-size:11px;font-weight:700;color:var(--mute)')}>{t('Shares')}</span>
          <button onClick={() => e.setShare(p, (e.shares[p] || 1) - 1)} aria-label={t('Fewer shares for {name}', { name: p })} style={step}>−</button>
          <span style={css('min-width:18px;text-align:center;font-size:14px;font-weight:800')}>{e.shares[p] || 1}</span>
          <button onClick={() => e.setShare(p, (e.shares[p] || 1) + 1)} aria-label={t('More shares for {name}', { name: p })} style={step}>+</button>
          {i > 0 ? <button onClick={() => e.removePerson(p)} aria-label={t('Remove {name}', { name: p })} style={css('width:34px;height:34px;border:0;background:none;color:var(--mute);cursor:pointer')}><i className="ph-bold ph-x" /></button> : <span style={css('width:34px')} />}
        </div>)}
      </div>
      <div style={css('display:flex;gap:6px;margin-top:12px')}>
        <input value={name} onChange={x => setName(x.target.value)} onKeyDown={x => { if (x.key === 'Enter') add(); }} placeholder={t('Name, e.g. Ali')} aria-label={t('Add a person who shares costs')} style={{ ...input, height: 44 }} />
        <button onClick={add} style={css('flex:none;height:44px;padding:0 16px;border-radius:14px;border:0;background:var(--cta);color:var(--onCta);font-size:13px;font-weight:800;cursor:pointer')}>{t('Add')}</button>
      </div>
      {e.group && <button onClick={e.openAdd} style={{ ...btn(true), width: '100%', marginTop: 16 }}>{t('Done: add an expense')}</button>}
    </Panel>
  );
}

/** Adds an expense: amount, what for, who paid, and who shares it. */
export function ExpenseSheet({ v, open, onClose }: { v: View; open: boolean; onClose: () => void }) {
  const e = v.trip.expenses, [amount, setAmount] = useState(''), [cat, setCat] = useState<string>('Fuel'), [note, setNote] = useState(''), [payer, setPayer] = useState(''), [out, setOut] = useState<string[]>([]);
  const n = Math.round(+amount.replace(/[^\d.]/g, '')), who = e.people.filter(p => !out.includes(p)), by = e.people.includes(payer) ? payer : e.people[0];
  const save = () => { if (!(n > 0) || !who.length) return; e.add({ amount: n, cat, note: note.trim(), payer: by, ...(who.length < e.people.length ? { split: who } : {}) }); setAmount(''); setNote(''); setOut([]); };
  const label = css('font-size:12px;font-weight:800;color:var(--mute);margin:14px 0 6px');
  return (
    <Panel open={open} onClose={onClose} title={t('Add an expense')} height={640}>
      <input value={amount} onChange={x => setAmount(x.target.value)} inputMode="numeric" placeholder={t('Amount in PKR')} aria-label={t('Amount in PKR')} style={input} />
      <div style={css('display:flex;gap:6px;flex-wrap:wrap;margin-top:12px')}>{EXPENSE_CATS.map(c => <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} style={pill(cat === c)}>{t(c === 'Jeeps' ? 'Local jeeps' : c)}</button>)}</div>
      <input value={note} onChange={x => setNote(x.target.value)} placeholder={t('What for? (optional)')} aria-label={t('What for? (optional)')} style={{ ...input, marginTop: 12 }} />
      {e.group && <>
        <div style={label}>{t('Paid by')}</div>
        <div role="radiogroup" aria-label={t('Paid by')} style={css('display:flex;gap:6px;flex-wrap:wrap')}>{e.people.map(p => <button key={p} role="radio" aria-checked={by === p} onClick={() => setPayer(p)} style={pill(by === p)}>{p}</button>)}</div>
        <div style={label}>{t('Split between')} <span style={css('font-weight:600')}>· {who.length === e.people.length ? t('everyone') : t('{n} of {m}', { n: who.length, m: e.people.length })}</span></div>
        <div style={css('display:flex;gap:6px;flex-wrap:wrap')}>{e.people.map(p => { const on = !out.includes(p); return <button key={p} role="checkbox" aria-checked={on} onClick={() => setOut(on ? [...out, p] : out.filter(x => x !== p))} style={pill(on)}><i className={on ? 'ph-bold ph-check' : 'ph-bold ph-minus'} style={css('margin-right:4px')} />{p}</button>; })}</div>
      </>}
      <button onClick={save} disabled={!(n > 0) || !who.length} style={{ ...btn(true), width: '100%', marginTop: 16, opacity: n > 0 && who.length ? 1 : .5 }}>{t('Save expense')}</button>
      <button onClick={e.openPeople} style={css('width:100%;min-height:40px;margin-top:6px;border:0;background:none;color:var(--g);font-size:13px;font-weight:800;cursor:pointer')}>{e.group ? t('Change who is on the trip') : t('Splitting with friends? Add them first')}</button>
    </Panel>
  );
}

/** Help on the road: numbers to call, the nearest hospital, location for family, trusted drivers. */
export function SosSheet({ v, open, onClose }: { v: View; open: boolean; onClose: () => void }) {
  const here = v.s.here, hospital = here ? `https://www.google.com/maps/search/hospital/@${here.lat.toFixed(4)},${here.lon.toFixed(4)},12z` : 'https://www.google.com/maps/search/hospital+near+me';
  return (
    <Panel open={open} onClose={onClose} title={t('Emergency')} sub={t('Stay calm. Call first, then send your location.')} height={640}>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:8px')}>
        {v.helplines.map(h => <a key={h.num} href={h.href} style={css('display:flex;align-items:center;gap:10px;padding:12px;border-radius:18px;background:linear-gradient(160deg,rgba(255,107,91,.2),rgba(255,107,91,.06));border:1px solid rgba(255,107,91,.35);text-decoration:none;color:var(--ink)')}><i className="ph-fill ph-phone-call" style={css('font-size:22px;color:#E5484D')} /><span><span style={css('display:block;font-size:18px;font-weight:800')}>{h.num}</span><span style={css('display:block;font-size:12px;font-weight:600;color:var(--ink2)')}>{h.label}</span></span></a>)}
      </div>
      <div style={css('display:flex;flex-direction:column;gap:8px;margin-top:12px')}>
        <a href={hospital} target="_blank" rel="noopener" style={{ ...btn(false), display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}><i className="ph-fill ph-first-aid" style={css('color:#E5484D')} />{t('Nearest hospital')}</a>
        <button onClick={v.trip.shareLocation} style={{ ...btn(true), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><i className="ph-fill ph-map-pin" />{t('Send my location on WhatsApp')}</button>
      </div>
      {v.drivers.length > 0 && <>
        <div style={css('font-size:12px;font-weight:800;color:var(--mute);margin:16px 0 6px')}>{t('Trusted drivers on your route')}</div>
        {v.drivers.map(d => <div key={d.key} style={css('display:flex;align-items:center;gap:10px;min-height:44px')}><i className="ph-fill ph-jeep" style={css('color:var(--amb2)')} /><span style={css('flex:1;font-size:14px;font-weight:700')}>{d.name} <span style={css('font-size:12px;color:var(--mute)')}>· {d.area}</span></span>{d.tel && <a href={d.tel} aria-label={t('Call {name}', { name: d.name })} style={css('width:40px;height:40px;border-radius:12px;background:var(--fill);display:flex;align-items:center;justify-content:center;color:var(--ink)')}><i className="ph-fill ph-phone" /></a>}</div>)}
      </>}
    </Panel>
  );
}

/** Share: the plan, a follow page for family, or the trip card picture. */
export function ShareSheet({ open, onClose, live, signedIn, cloud, following, busy, onPlan, onFamily, onStop, onCard, onSignIn }: {
  open: boolean; onClose: () => void; live: boolean; signedIn: boolean; cloud: boolean; following: boolean; busy: string;
  onPlan: () => void; onFamily: () => void; onStop: () => void; onCard: () => void; onSignIn: () => void;
}) {
  const opt = (icon: string, color: string, title: string, sub: string, run: () => void, key: string) => (
    <button onClick={run} disabled={!!busy} style={css('width:100%;display:flex;align-items:center;gap:12px;min-height:68px;padding:10px 12px;border-radius:18px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);text-align:left;cursor:pointer')}>
      <span style={css(`width:44px;height:44px;flex:none;border-radius:14px;background:${color};display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff`)}><i className={`ph-fill ${icon}`} /></span>
      <span style={css('flex:1;min-width:0')}><span style={css('display:block;font-size:15px;font-weight:800')}>{busy === key ? t('Working…') : title}</span><span style={css('display:block;font-size:12px;font-weight:600;color:var(--mute);margin-top:2px;line-height:1.4')}>{sub}</span></span>
      <i className="ph-bold ph-caret-right" style={css('color:var(--mute)')} />
    </button>
  );
  return (
    <Panel open={open} onClose={onClose} title={t('Share')} height={520}>
      <div style={css('display:flex;flex-direction:column;gap:10px')}>
        {opt('ph-users-three', 'linear-gradient(160deg,#2EE59D,#0FA678)', t('Family: follow our trip'), live ? (following ? t('Your live link is on. Family see your check-ins.') : t('A page for family: the plan, where you are today, and your check-ins.')) : t('A page for family with the plan and where you are each day.'), onFamily, 'family')}
        {opt('ph-instagram-logo', 'linear-gradient(160deg,#F58529,#DD2A7B 55%,#8134AF)', t('Trip card for Instagram'), t('A picture of your trip for stories and WhatsApp status.'), onCard, 'card')}
        {opt('ph-share-network', 'linear-gradient(160deg,#6FD3FF,#3B8DFF)', t('Send the plan'), t('A link that opens this plan in SafarCo, so friends can change it.'), onPlan, 'plan')}
      </div>
      <p style={css('margin:12px 2px 0;font-size:12px;font-weight:600;color:var(--mute);line-height:1.45')}>{t('Not live tracking: family see your check-ins and any location you send, so it works on weak signal and saves battery.')}</p>
      {cloud && !signedIn && <button onClick={onSignIn} style={css('margin-top:12px;width:100%;min-height:40px;border:0;background:none;color:var(--g);font-size:13px;font-weight:800;cursor:pointer')}>{t('Sign in to send live check-ins to family')}</button>}
      {following && <button onClick={onStop} style={css('margin-top:8px;width:100%;min-height:40px;border:0;background:none;color:var(--cor);font-size:13px;font-weight:800;cursor:pointer')}>{t('Stop sharing with family')}</button>}
    </Panel>
  );
}
