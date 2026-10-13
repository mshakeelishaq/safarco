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
  const e = v.trip.expenses;
  return (
    <section aria-label={t('Spent on this trip')} style={css(card)}>
      <div style={css('display:flex;align-items:center;gap:10px')}>
        <i className="ph-fill ph-receipt" style={css('font-size:20px;color:var(--g)')} />
        <h2 style={css('flex:1;margin:0;font-size:15px;font-weight:800')}>{t('Spent on this trip')}</h2>
        <button onClick={e.open} style={css('height:36px;padding:0 12px;border-radius:12px;border:0;background:var(--cta);color:var(--onCta);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px')}><i className="ph-bold ph-plus" />{t('Add')}</button>
      </div>
      {!e.list.length ? <p style={css('margin:10px 0 0;font-size:13px;font-weight:600;color:var(--ink2);line-height:1.45')}>{t('Note what you spend as you go: fuel, hotels, food. SafarCo compares it with the plan and works out who owes whom.')}</p> : <>
        <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:10px;flex-wrap:wrap')}><span style={css('font-family:var(--fontH);font-size:26px;font-weight:600;font-variant-numeric:tabular-nums')}>{e.spentStr}</span><span style={css(`font-size:13px;font-weight:800;color:${e.over ? 'var(--cor)' : 'var(--g)'}`)}>{e.over ? t('{amount} over the plan', { amount: e.leftStr }) : t('{amount} left in the plan', { amount: e.leftStr })}</span></div>
        <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={e.pct} aria-label={t('Spent against the plan')} style={css('height:8px;border-radius:4px;background:var(--fill2);margin-top:8px;overflow:hidden')}><div style={css(`height:100%;width:${e.pct}%;border-radius:4px;background:${e.over ? 'var(--cor)' : 'var(--g)'}`)} /></div>
        <div style={css('display:flex;flex-direction:column;gap:8px;margin-top:12px')}>
          {e.cats.map(c => <div key={c.key}>
            <div style={css('display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700')}><i className={`ph-fill ${c.icon}`} style={css('color:var(--mute)')} /><span style={css('flex:1')}>{c.label}</span><span style={css(`font-variant-numeric:tabular-nums;color:${c.over ? 'var(--cor)' : 'var(--ink)'}`)}>{c.spentStr}</span><span style={css('font-size:11px;color:var(--mute);font-variant-numeric:tabular-nums')}>/ {c.plannedStr}</span></div>
            <div style={css('height:4px;border-radius:2px;background:var(--fill2);margin-top:4px;overflow:hidden')}><div style={css(`height:100%;width:${c.pct}%;background:${c.over ? 'var(--cor)' : 'var(--sky)'}`)} /></div>
          </div>)}
        </div>
        <h3 style={css('margin:14px 0 6px;font-size:12px;font-weight:800;color:var(--mute);text-transform:uppercase;letter-spacing:.06em')}>{t('Latest')}</h3>
        {e.list.slice(0, 6).map(x => <div key={x.id} style={css('display:flex;align-items:center;gap:10px;min-height:40px')}>
          <i className={`ph-fill ${x.icon}`} style={css('font-size:17px;color:var(--mute);flex:none')} />
          <div style={css('flex:1;min-width:0')}><div style={css('font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{x.label}</div><div style={css('font-size:11px;font-weight:600;color:var(--mute)')}>{[x.when, x.payer && e.people.length > 1 ? t('paid by {name}', { name: x.payer }) : ''].filter(Boolean).join(' · ')}</div></div>
          <span style={css('font-size:13px;font-weight:800;font-variant-numeric:tabular-nums')}>{x.amountStr}</span>
          <button onClick={x.remove} aria-label={t('Remove {name}', { name: x.label })} style={css('flex:none;width:30px;height:30px;border-radius:9px;border:0;background:none;color:var(--mute);cursor:pointer')}><i className="ph-bold ph-x" /></button>
        </div>)}
        <div style={css('margin-top:12px;padding:10px 12px;border-radius:14px;background:var(--fill)')}>
          <div style={css('font-size:12px;font-weight:800;color:var(--ink2)')}>{t('Per person ({n}): {amount}', { n: v.s.groupSize, amount: e.perHead })}</div>
          {e.settle.length > 0 && <div style={css('margin-top:6px;display:flex;flex-direction:column;gap:4px')}>{e.settle.map(p => <div key={p.from + p.to} style={css('font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px')}><i className="ph-bold ph-arrow-right" style={css('color:var(--g)')} />{p.text}</div>)}</div>}
        </div>
      </>}
    </section>
  );
}

/** Adds an expense: amount, what for, and who paid. */
export function ExpenseSheet({ v, open, onClose }: { v: View; open: boolean; onClose: () => void }) {
  const e = v.trip.expenses, [amount, setAmount] = useState(''), [cat, setCat] = useState<string>('Fuel'), [note, setNote] = useState(''), [payer, setPayer] = useState(''), [name, setName] = useState('');
  const n = Math.round(+amount.replace(/[^\d.]/g, ''));
  const save = () => { if (!(n > 0)) return; e.add({ amount: n, cat, note: note.trim(), payer: payer || e.people[0] }); setAmount(''); setNote(''); };
  return (
    <Panel open={open} onClose={onClose} title={t('Add an expense')} height={78}>
      <input value={amount} onChange={x => setAmount(x.target.value)} inputMode="numeric" placeholder={t('Amount in PKR')} aria-label={t('Amount in PKR')} style={input} />
      <div style={css('display:flex;gap:6px;flex-wrap:wrap;margin-top:12px')}>{EXPENSE_CATS.map(c => <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} style={pill(cat === c)}>{t(c === 'Jeeps' ? 'Local jeeps' : c)}</button>)}</div>
      <input value={note} onChange={x => setNote(x.target.value)} placeholder={t('What for? (optional)')} aria-label={t('What for? (optional)')} style={{ ...input, marginTop: 12 }} />
      <div style={css('font-size:12px;font-weight:800;color:var(--mute);margin:14px 0 6px')}>{t('Paid by')}</div>
      <div style={css('display:flex;gap:6px;flex-wrap:wrap')}>
        {e.people.map((p, i) => <span key={p} style={css('display:inline-flex')}><button onClick={() => setPayer(p)} aria-pressed={(payer || e.people[0]) === p} style={pill((payer || e.people[0]) === p)}>{p}</button>{i > 0 && <button onClick={() => e.removePerson(p)} aria-label={t('Remove {name}', { name: p })} style={css('width:28px;border:0;background:none;color:var(--mute);cursor:pointer')}><i className="ph-bold ph-x" /></button>}</span>)}
      </div>
      <div style={css('display:flex;gap:6px;margin-top:8px')}>
        <input value={name} onChange={x => setName(x.target.value)} placeholder={t('Add a person who shares costs')} aria-label={t('Add a person who shares costs')} style={{ ...input, height: 42 }} />
        <button onClick={() => { e.addPerson(name); setName(''); }} style={css('flex:none;height:42px;padding:0 14px;border-radius:14px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:13px;font-weight:800;cursor:pointer')}>{t('Add')}</button>
      </div>
      <button onClick={save} disabled={!(n > 0)} style={{ ...btn(true), width: '100%', marginTop: 16, opacity: n > 0 ? 1 : .5 }}>{t('Save expense')}</button>
    </Panel>
  );
}

/** Help on the road: numbers to call, the nearest hospital, location for family, trusted drivers. */
export function SosSheet({ v, open, onClose }: { v: View; open: boolean; onClose: () => void }) {
  const here = v.s.here, hospital = here ? `https://www.google.com/maps/search/hospital/@${here.lat.toFixed(4)},${here.lon.toFixed(4)},12z` : 'https://www.google.com/maps/search/hospital+near+me';
  return (
    <Panel open={open} onClose={onClose} title={t('Emergency')} sub={t('Stay calm. Call first, then send your location.')} height={82}>
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
    <Panel open={open} onClose={onClose} title={t('Share')} height={74}>
      <div style={css('display:flex;flex-direction:column;gap:10px')}>
        {opt('ph-users-three', 'linear-gradient(160deg,#2EE59D,#0FA678)', t('Family: follow our trip'), live ? (following ? t('Your live link is on. Family see your check-ins.') : t('A page for family: the plan, where you are today, and your check-ins.')) : t('A page for family with the plan and where you are each day.'), onFamily, 'family')}
        {opt('ph-instagram-logo', 'linear-gradient(160deg,#F58529,#DD2A7B 55%,#8134AF)', t('Trip card for Instagram'), t('A picture of your trip for stories and WhatsApp status.'), onCard, 'card')}
        {opt('ph-share-network', 'linear-gradient(160deg,#6FD3FF,#3B8DFF)', t('Send the plan'), t('A link that opens this plan in SafarCo, so friends can change it.'), onPlan, 'plan')}
      </div>
      {cloud && !signedIn && <button onClick={onSignIn} style={css('margin-top:12px;width:100%;min-height:40px;border:0;background:none;color:var(--g);font-size:13px;font-weight:800;cursor:pointer')}>{t('Sign in to send live check-ins to family')}</button>}
      {following && <button onClick={onStop} style={css('margin-top:8px;width:100%;min-height:40px;border:0;background:none;color:var(--cor);font-size:13px;font-weight:800;cursor:pointer')}>{t('Stop sharing with family')}</button>}
    </Panel>
  );
}
