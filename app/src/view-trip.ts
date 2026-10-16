// Before, during and after the trip: the get-ready checklist, the Today screen on the road,
// expenses split between travellers, and the trip summary afterwards. Built from the plan the
// screens already show (see view.ts) and the trip's progress on this phone (see run.ts).
import { STOP_DUR, VEH } from './engine/data';
import { clock, dayLabel, fmt, fmtN, isoAdd, isoOff, mapsQ } from './engine/format';
import { project } from './engine/fuel';
import { sunTimes } from './engine/sun';
import { WISHES } from './engine/seasons';
import { dropKey, parseClock } from './edits';
import { daysBetween, getRun, phaseOf, runKey, toggle, updateRun, type Expense } from './run';
import { settle, splitUrl } from './split';
import type { RoutePoint } from './weather/route';
import type { AppState, Patch, PlanEdits } from './state';
import { t } from './i18n';

/** Expense categories, the same groups as the budget bar. */
export const EXPENSE_CATS = ['Stay', 'Fuel', 'Meals', 'Transport', 'Tolls', 'Jeeps', 'Other'] as const;
const CAT_ICON: Record<string, string> = { Stay: 'ph-bed', Fuel: 'ph-gas-pump', Meals: 'ph-fork-knife', Transport: 'ph-car-profile', Tolls: 'ph-road-horizon', Jeeps: 'ph-jeep', Other: 'ph-receipt' };
const SKIPPABLE = new Set(['tea', 'view', 'food']);

type Stop = { time: string; kind: string; label: string; dur?: string; isDrive?: boolean };
type Day = { kind: string; title: string; num?: number; iso?: string; stops: Stop[]; stay: { place: string; town: string; lat: number; lon: number } | null; track?: { sunset: number };
  fuel: { stops: { place: string; at: number; label: string }[] } | null };

export interface TripCtx {
  s: AppState; set: (p: Patch) => void; days: Day[]; edits: PlanEdits;
  road: [number, number][] | null; points: RoutePoint[]; dest: { lat: number; lon: number; town: string; name: string };
  planned: { key: string; val: number }[]; total: number; km: number; isAir: boolean; mtn: boolean;
  packDone: number; packTotal: number; toggleOffline: () => void;
}

/** The page family open to follow the trip. */
export const followLink = (id: string) => `${location.origin}/follow?id=${id}`;

const nowHours = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const waText = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export function tripMode(x: TripCtx) {
  const { s, set, days } = x, key = runKey(s), run = getRun(key), today = isoAdd(0);
  const upd = (fn: Parameters<typeof updateRun>[1]) => updateRun(key, fn);
  const phase = phaseOf(s.startDate, days.length, today), toGo = daysBetween(today, s.startDate);
  const own = ['sedan', 'suv', 'bike'].includes(s.vehicle), hired = ['rentcar', 'rent4x4', 'coaster'].includes(s.vehicle);

  // ---- Before: lock the plan, then a countdown checklist -------------------------------
  const nights = [...new Set(days.flatMap(d => d.stay ? [d.stay.town] : []))];
  const tasks = ([
    ['book', 0, t('Book a hotel for each night'), nights.join(' · ')],
    own ? ['car', 7, t('Service the car: brakes, tyres, oil and the spare wheel'), ''] : hired ? ['car', 7, t('Confirm the hired vehicle and driver'), ''] : s.vehicle === 'public' ? ['car', 7, t('Book coach seats'), ''] : ['car', 0, t('Book your flights'), ''],
    ['docs', 7, t('Carry your CNIC, and B-forms for kids: checkposts ask for them'), ''],
    ['meds', 7, t('Medicines and a small first-aid kit'), ''],
    ['roads', 3, t('Check road alerts and the weather for your dates'), t('In “Things to know” above')],
    ...(x.mtn ? [['cash', 3, t('Withdraw enough cash: ATMs are few in the mountains'), '']] : []),
    ['offline', 1, t('Download the offline map'), ''],
    ['pack', 1, t('Pack your bags'), t('{done} of {total} ticked on the packing list', { done: x.packDone, total: x.packTotal })],
    ['family', 1, t('Share the trip with family'), ''],
    ...(own ? [['fuel', 1, t('Fill the tank the night before'), '']] : [])
  ] as [string, number, string, string][]).map(([k, before, text, sub]) => {
    const due = before ? isoOff(s.startDate, -before) : '', auto = (k === 'offline' && s.offline === 'ready') || (k === 'pack' && x.packTotal > 0 && x.packDone === x.packTotal);
    const done = auto || run.ticks.includes(k);
    return { key: k, text, sub, done, auto, before, due, late: !done && !!due && today > due,
      toggle: auto ? null : () => upd(r => ({ ticks: toggle(r.ticks, k) })),
      action: k === 'offline' && !done ? { label: t('Download'), run: x.toggleOffline } : k === 'family' && !done ? { label: t('Share'), run: () => set({ sheet: 'share' }) } : null };
  });
  const groups = [0, 7, 3, 1].map(b => ({ key: String(b), label: b === 0 ? t('Now') : b === 7 ? t('A week before · {date}', { date: dayLabel(s.startDate, -7) }) : b === 3 ? t('3 days before · {date}', { date: dayLabel(s.startDate, -3) }) : t('The night before · {date}', { date: dayLabel(s.startDate, -1) }),
    tasks: tasks.filter(k => k.before === b) })).filter(g => g.tasks.length);
  const getReady = phase !== 'before' ? null : {
    locked: !!run.locked, toGo,
    countdown: toGo > 1 ? t('{n} days to go', { n: toGo }) : toGo === 1 ? t('Tomorrow!') : t('Today!'),
    done: tasks.filter(k => k.done).length, total: tasks.length, groups,
    lock: () => { upd(() => ({ locked: today })); set({ toast: t('Plan locked. Your countdown has started.'), ...(s.savedId ? {} : { sheet: 'save' as const }) }); },
    unlock: () => upd(() => ({ locked: null }))
  };

  // ---- During: today's day on the road -----------------------------------------------------
  const di = Math.max(0, Math.min(days.length - 1, daysBetween(s.startDate, today)));
  const today_ = phase !== 'during' ? null : (() => {
    const d = days[di], tick = (label: string) => `${di}|${label}`;
    const stops = d.stops.filter(st => !st.isDrive && st.kind !== 'drive').map(st => ({ ...st, key: tick(st.label), done: run.stops.includes(tick(st.label)), toggle: () => upd(r => ({ stops: toggle(r.stops, tick(st.label)) })) }));
    const next = stops.find(st => !st.done && st.kind !== 'go') || null;
    const sun = d.track ? d.track.sunset : sunTimes(x.dest.lat, x.dest.lon, today).set;
    // Progress along today's road, from the last GPS fix.
    let progress: { done: number; total: number; pct: number } | null = null;
    const mine = x.points.filter(p => p.day === di);
    if (s.here && x.road && x.road.length > 1 && mine.length > 1) {
      const pos = mine.map(p => project(x.road!, p.lat, p.lon).along), lo = Math.min(...pos), hi = Math.max(...pos);
      const me = project(x.road, s.here.lat, s.here.lon), out = d.kind !== 'return';
      if (me.off < 15) { const done = Math.max(0, Math.min(hi - lo, out ? me.along - lo : hi - me.along)); progress = { done: Math.round(done), total: Math.round(hi - lo), pct: Math.round(done / Math.max(1, hi - lo) * 100) }; }
    }
    const fuel = d.fuel?.stops.find(f => !progress || f.at > progress.done) || null;
    // Running late: compare the clock with the next stop's planned time.
    const planned = next ? parseClock(next.time) : null, late = planned != null && d.track ? nowHours() - planned : 0;
    const arrive = d.stops.length ? parseClock(d.stops[d.stops.length - 1].time) : null;
    const skippable = stops.filter(st => !st.done && SKIPPABLE.has(st.kind) && !!st.dur);
    const skipMin = skippable.reduce((a, st) => a + (STOP_DUR[st.kind as keyof typeof STOP_DUR] || 15), 0);
    const eta = arrive != null && late > 0 ? arrive + late : arrive;
    const lateInfo = late > 0.4 && eta != null ? {
      text: t('About {time} behind plan. You’d arrive around {eta} (sunset {sunset}).', { time: late >= 1 ? t('{h} h {m} min', { h: Math.floor(late), m: Math.round((late % 1) * 60) }) : t('{m} min', { m: Math.round(late * 60) }), eta: clock(eta), sunset: clock(sun) }),
      dark: eta > sun - 0.25,
      skip: skippable.length ? { label: t('Skip {n} stops, save {m} min', { n: skippable.length, m: skipMin }), run: () => set({ edits: { ...x.edits, drops: [...new Set([...x.edits.drops, ...skippable.map(st => dropKey(di, st.label))])] }, toast: t('Stops skipped. Drive safe.') }) } : null,
      hotels: s.here ? `https://www.google.com/maps/search/hotels/@${s.here.lat.toFixed(4)},${s.here.lon.toFixed(4)},12z` : mapsQ('hotels near me')
    } : null;
    // The end of the day: tonight's stay, or home on the last day.
    const home = di === days.length - 1 && !d.stay?.place, place = home ? (s.origin || '') : (d.stay?.place || x.dest.name).split(' · ')[0];
    const done = run.checkins.slice().reverse().find(c => c.arrived && c.at.slice(0, 10) === today && c.place === place);
    const arrival = place ? { place, home, done: !!done, time: done ? new Date(done.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase() : '',
      label: home ? t('Home safely in {place}', { place }) : t('Arrived safely at {place}', { place }) } : null;
    return {
      num: di + 1, of: days.length, title: d.title, kind: d.kind, stops, next, fuel, progress, late: lateInfo, arrival,
      sunset: clock(sun), tonight: d.stay?.place || '',
      fixAge: s.here ? Math.round((Date.now() - s.here.at) / 60000) : null
    };
  })();

  // GPS, check-ins and sharing your location by WhatsApp.
  const locate = (then?: (p: { lat: number; lon: number }) => void) => {
    if (!navigator.geolocation) { set({ toast: t('Location isn’t available on this phone.') }); return; }
    navigator.geolocation.getCurrentPosition(p => { const here = { lat: p.coords.latitude, lon: p.coords.longitude, at: Date.now() }; set({ here }); then?.(here); },
      () => set({ toast: t('Couldn’t get your location. Check that location is on.') }), { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  };
  const follow = run.followId ? followLink(run.followId) : '';
  const checkIn = (place: string, arrived = false) => {
    const at = new Date().toISOString(), tonight = today_?.tonight, home = arrived && !!today_?.arrival?.home;
    upd(r => ({ checkins: [...r.checkins, { place, at, ...(s.here ? { lat: s.here.lat, lon: s.here.lon } : {}), ...(arrived ? { arrived: true } : {}) }], stops: today_ && !arrived ? [...new Set([...r.stops, `${di}|${place}`])] : r.stops }));
    const head = !arrived ? t('Reached {place} safely ✅', { place }) : home ? t('Home safely ✅ Thank you for following our trip.') : t('Arrived safely at {place} ✅ Staying here tonight.', { place });
    const msg = [head, !arrived && tonight ? t('Tonight: {place}.', { place: tonight }) : '', follow && !home ? t('Follow our trip: {link}', { link: follow }) : ''].filter(Boolean).join(' ');
    // What the family page shows for this check-in.
    const label = !arrived ? place : home ? t('Home safely in {place}', { place }) : t('Arrived safely at {place}', { place });
    return { msg, wa: waText(msg), label };
  };
  const shareLocation = () => locate(p => { location.href = waText(t('We are here: {link}', { link: `https://maps.google.com/?q=${p.lat.toFixed(5)},${p.lon.toFixed(5)}` })); });

  // ---- Expenses: what was spent, against the plan, and who owes whom ------------------------
  const me = t('Me'), people = run.people.length ? run.people : [me], shares = run.shares;
  const spentBy = new Map<string, number>(); run.expenses.forEach(e => spentBy.set(e.cat, (spentBy.get(e.cat) || 0) + e.amount));
  const spent = run.expenses.reduce((a, e) => a + e.amount, 0);
  const sett = settle({ people, shares, expenses: run.expenses, payments: run.payments });
  const catName = (c: string) => t(c === 'Jeeps' ? 'Local jeeps' : c);
  const title = x.dest.name;
  const summary = () => {
    const lines = [t('{place} trip: expenses', { place: title }), t('Spent: {amount}', { amount: fmt(spent) }), '',
      ...sett.rows.map(r => t('{name} paid {paid}, share {share}', { name: r.name, paid: fmt(r.paid), share: fmt(r.share) })), '',
      ...(sett.owes.length ? [t('To settle up:'), ...sett.owes.map(o => t('{from} pays {to} {amount}', { from: o.from, to: o.to, amount: fmt(o.amount) }))] : [t('All settled up.')]), '',
      t('See every expense: {link}', { link: splitUrl({ title, people, shares, expenses: run.expenses, payments: run.payments, at: new Date().toISOString() }) })];
    return lines.join('\n');
  };
  const expenses = {
    spent, spentStr: fmt(spent), planned: x.total, left: x.total - spent, leftStr: fmt(Math.abs(x.total - spent)), over: spent > x.total,
    pct: x.total ? Math.min(100, Math.round(spent / x.total * 100)) : 0,
    cats: EXPENSE_CATS.map(c => ({ key: c, label: catName(c), icon: CAT_ICON[c], spent: spentBy.get(c) || 0, planned: x.planned.find(p => p.key === c)?.val || 0 }))
      .filter(c => c.spent || c.planned).map(c => ({ ...c, spentStr: fmt(c.spent), plannedStr: fmt(c.planned), pct: c.planned ? Math.min(100, Math.round(c.spent / c.planned * 100)) : 100, over: c.spent > c.planned })),
    list: run.expenses.slice().reverse().map(e => ({ ...e, icon: CAT_ICON[e.cat] || CAT_ICON.Other, label: e.note || catName(e.cat), amountStr: fmt(e.amount), when: e.date ? dayLabel(e.date, 0) : '',
      who: [e.payer ? t('Paid by {name}', { name: e.payer }) : '', e.split && e.split.length && e.split.length < people.length ? t('Split: {names}', { names: e.split.join(', ') }) : ''].filter(Boolean).join(' · '),
      remove: () => upd(r => ({ expenses: r.expenses.filter(y => y.id !== e.id) })) })),
    people, me, group: people.length > 1, shares,
    rows: sett.rows.map(r => ({ ...r, paidStr: fmt(r.paid), shareStr: fmt(r.share), netStr: fmt(Math.abs(r.net)), units: shares[r.name] || 1 })),
    settle: sett.owes.map(o => ({ ...o, text: t('{from} pays {to} {amount}', { from: o.from, to: o.to, amount: fmt(o.amount) }),
      markPaid: () => { upd(r => ({ payments: [...r.payments, { id: Math.random().toString(36).slice(2, 10), from: o.from, to: o.to, amount: o.amount, date: today }] })); set({ toast: t('Marked as paid') }); } })),
    payments: run.payments.slice().reverse().map(p => ({ ...p, text: t('{from} paid {to} {amount}', { from: p.from, to: p.to, amount: fmt(p.amount) }), undo: () => upd(r => ({ payments: r.payments.filter(y => y.id !== p.id) })) })),
    add: (e: Omit<Expense, 'id' | 'date'>) => { upd(r => ({ expenses: [...r.expenses, { ...e, id: Math.random().toString(36).slice(2, 10), date: today }] })); set({ sheet: 'none', toast: t('Added {amount}', { amount: fmt(e.amount) }) }); },
    addPerson: (name: string) => { const n = name.trim().slice(0, 30); if (n && !people.includes(n) && people.length < 20) upd(() => ({ people: [...people, n] })); },
    removePerson: (name: string) => upd(r => ({ people: people.filter(p => p !== name), shares: Object.fromEntries(Object.entries(r.shares).filter(([k]) => k !== name)),
      expenses: r.expenses.map(e => ({ ...e, payer: e.payer === name ? people[0] : e.payer, ...(e.split ? { split: e.split.filter(p => p !== name) } : {}) })) })),
    rename: (from: string, to: string) => { const n = to.trim().slice(0, 30); if (!n || n === from || people.includes(n)) return;
      const sw = (x: string) => x === from ? n : x;
      upd(r => ({ people: people.map(sw), shares: Object.fromEntries(Object.entries(r.shares).map(([k, v]) => [sw(k), v])),
        expenses: r.expenses.map(e => ({ ...e, payer: sw(e.payer), ...(e.split ? { split: e.split.map(sw) } : {}) })), payments: r.payments.map(x => ({ ...x, from: sw(x.from), to: sw(x.to) })) })); },
    setShare: (name: string, n: number) => upd(r => ({ people, shares: { ...r.shares, [name]: Math.max(1, Math.min(20, n)) } })),
    share: () => { window.open(waText(summary()), '_blank'); },
    open: () => set({ sheet: people.length > 1 ? 'expense' : 'people' }),
    openPeople: () => set({ sheet: 'people' }),
    openAdd: () => set({ sheet: 'expense' })
  };

  // ---- After: what the trip came to, and where to next --------------------------------------
  const pinsDone = run.stops.length, pins = days.reduce((a, d) => a + d.stops.filter(st => st.kind === 'pin').length, 0);
  const endMonth = new Date(isoOff(s.startDate, days.length) + 'T00:00').getMonth() + 1;
  const nextWish = WISHES.find(w => w.months.some(m => [1, 2, 3].map(k => (endMonth + k - 1) % 12 + 1).includes(m))) || WISHES[0];
  const memories = phase !== 'after' ? null : {
    stats: [
      { key: 'km', icon: x.isAir ? 'ph-airplane-tilt' : 'ph-path', value: x.isAir ? t('By air') : t('{km} km', { km: fmtN(x.km * 2) }), label: x.isAir ? '' : t('there and back') },
      { key: 'days', icon: 'ph-calendar-check', value: t('{n} days', { n: days.length }), label: x.dest.name },
      { key: 'places', icon: 'ph-map-pin', value: String(pinsDone || pins), label: pinsDone ? t('places ticked off') : t('places in the plan') }
    ],
    money: spent ? (spent <= x.total ? t('Spent {spent}: {amount} under the plan.', { spent: fmt(spent), amount: fmt(x.total - spent) }) : t('Spent {spent}: {amount} over the plan.', { spent: fmt(spent), amount: fmt(spent - x.total) })) : '',
    next: { label: t('Next: {wish}', { wish: t(nextWish.label) }), icon: nextWish.icon, wish: nextWish.id }
  };

  return { phase, run, getReady, today: today_, memories, expenses, locate, checkIn, shareLocation, vehicle: t(VEH[s.vehicle].short), checkins: run.checkins.slice(-3).reverse() };
}
export type TripModeView = ReturnType<typeof tripMode>;
