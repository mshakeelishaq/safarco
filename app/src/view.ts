// Everything the screens display, derived from app state. Ported from the
// design's renderVals(); the screens in components/ read from this.
import { HAVE_VEHICLE, EDGES, MODES, MON, MONTH_FULL, NODES, NODE_INFO, POPULAR, POP_DEST, SUGGEST_POOL, SUNRISE, SUNSET, TIERS, TIER_G, VEH, CAT, CAT2, GRADS, DESTS, STOP_KIND, type VehicleId } from './engine/data';
import { FOOD } from './engine/food';
import { foodTipsFor } from './foodtips';
import { MAX_DRIVE_H, plannedJeeps, roomPlan, circuit, sideTrips, dayTripOptions, tripFrom, airFor, babusarClosed, buildPlan, coachFare, configsFor, costFor, freeDays, jeepMatch, jeepsFor, roadFit, scheduledPlaces, seasonInfo, suggestions, trip, type PlanDay, type Suggestion, resetTripCache } from './engine/engine';
import { clock, dayLabel, dur, fmt, fmtN, isoAdd, isoOf, isoOff, kShort, mapsQ, mon } from './engine/format';
import { LIVE, fxRate, placesKey, routeKey, type Spot } from './engine/live';
import { sunTimes } from './engine/sun';
import { checkPricesUrl, flightSearchUrl, nightRange, pkrUsd, usd } from './money';
import { routePoints, weatherPlan } from './weather/route';
import { weatherView } from './weather/view';
import { SECTIONS, activeAlerts, checkedText, isStale, prices, type Section } from './prices';
import { areaOf, nearPoint, onTrip, telLink, waLink } from './local';
import { ratingOf } from './reviews';
import { SEASONS, WISHES, highlightIn, highlightsOf, iconFor, monthsLabel, nextStartIn, seasonOf, seasonPicks, wishOf, wishPlaces } from './engine/seasons';
import { isRated, markRated, ratedKey } from './rated';
import { CITIES, CITY, CITY_DUP, DST, cityOr, placesFor, seasonFactor } from './engine/places';
import type { AppState, Patch } from './state';
import { NO_EDITS } from './state';
import { dropKey, editDay, planKey, type EditedStop } from './edits';
import { THEMES } from './state';
import { tilesAlong } from './offline';
import { cardPhoto, destPhoto, ownPhoto } from './photos';
import { tripMode } from './view-trip';
import { fuelByDay, fuelQueryPoints, type DayFuel } from './engine/fuel';
import { LANGS, setLang, t } from './i18n';

export interface Api {
  set: (p: Patch) => void;
  later: (ms: number, fn: () => void) => void;
  locate: () => void;
  setPeople: (k: 'adults' | 'kids' | 'elders', d: number) => void;
  toggleOffline: () => void;
  share: () => void;
  newTrip: () => void;
  /** On the road: record a check-in, tell family on WhatsApp. */
  checkIn?: (place: string) => void;
  /** Draw and share the trip card picture. */
  shareCard?: () => void;
  /** Start a new trip with a wish already chosen. */
  nextTrip?: (wish: string) => void;
}


export function buildView(s: AppState, api: Api) {
  const { set } = api;
  const M = mon(s), c0 = trip(s.corridor, s.origin, M), nights = Math.max(1, s.days - 1), sug = suggestions(s);
  // A circuit (more than one place) goes round once: its totals replace the one-place "each way" figures.
  const L = circuit(s), stopNames = L ? L.order.map(k => DST(k).name) : [];
  const c = L ? { ...c0, loop: true, to: stopNames.join(' · '), km: L.km, kmStr: fmtN(L.km), hours: L.hours, hrs: t('{n} h drive in total', { n: Math.round(L.hours) }), via: stopNames.join(' → '),
    legs: L.hops.flatMap(h => h.legs), legDays: L.legDays, minDays: L.minDays, cuts: [] as number[], flatKm: L.flatKm, mtnKm: L.mtnKm } : { ...c0, loop: false };
  /** A leg end on the map: home, a place ('@hunza' or 'DEST'), or a town on the road network. */
  const pointAt = (n: string): { lat: number; lon: number } => n === 'HOME' ? cityOr(s.origin) : n === 'DEST' ? DST(s.corridor) : n.startsWith('@') ? DST(n.slice(1)) : { lat: NODES[n][0], lon: NODES[n][1] };
  // The spending limit is optional: without one, trips are priced, not judged against a number.
  const capOn = s.capOn !== false, cap = capOn ? s.cap : Infinity;
  const cc = costFor(s), { rows, total } = cc, pct = capOn ? total / s.cap : 0, air = airFor(s.corridor, s.origin), P = s.groupSize;
  const health = !capOn ? { label: t('{amount} each', { amount: kShort(total / Math.max(1, s.groupSize)) }), bg: 'var(--fill)', fg: 'var(--ink2)' } : pct < 0.85 ? { label: t('Healthy'), bg: 'rgba(46,229,157,.14)', fg: 'var(--g)' } : pct <= 1 ? { label: t('Near cap'), bg: 'rgba(255,181,71,.16)', fg: 'var(--amb)' } : { label: t('Over cap'), bg: 'rgba(255,107,91,.16)', fg: 'var(--cor)' };
  const hasHub = c.hub !== undefined;
  const isAir = s.vehicle === 'air' && !!air;

  let gate: { show: boolean; icon?: string; bg?: string; border?: string; tile?: string; title?: string; msg?: string } = { show: false };
  if (hasHub && s.vehicle !== 'suv') gate = { show: true, icon: 'ph-warning-octagon', bg: 'linear-gradient(135deg,rgba(255,107,91,.24),rgba(255,79,123,.08))', border: 'rgba(255,107,91,.45)', tile: 'linear-gradient(135deg,#FF8A6B,#FF4F7B)',
    title: s.vehicle === 'sedan' ? t('Sedan Undercarriage Risk: Final track requires 4x4.') : t('Final track requires 4x4.'), msg: t('Park at Raikot Bridge. Local jeep for the last 12 km: PKR 8,000 – 10,000.') };
  else if (hasHub) gate = { show: true, icon: 'ph-check-circle', bg: 'linear-gradient(135deg,rgba(46,229,157,.2),rgba(25,194,184,.06))', border: 'rgba(46,229,157,.4)', tile: 'linear-gradient(135deg,#2EE59D,#0FA678)', title: t('4x4 cleared for the Raikot–Tato track'), msg: t('Expect about 1.5 h at walking pace. Low range recommended.') };

  const ring = (k: string) => s.flash === k ? '0 0 0 2px #2EE59D, 0 0 40px -6px rgba(46,229,157,.7)' : '0 30px 60px -30px rgba(0,0,0,.6)';
  const ringConic = (p: number, a: string, b: string) => `conic-gradient(${a} 0%, ${b} ${p}%, rgba(255,255,255,.08) ${p}% 100%)`;
  const mb = (n: number) => n >= 10 ? Math.round(n) : n.toFixed(1);
  // Rough download size: vector + terrain tile per square along the route, ~35 kB each.
  const liveRoute = LIVE.route[routeKey(cityOr(s.origin).n, s.corridor)];
  const routeCoords: [number, number][] = !L && liveRoute && liveRoute.status === 'ok' ? liveRoute.data.coords
    : [cityOr(s.origin), ...c.legs.map(l => pointAt(l.b))].map(p => [p.lon, p.lat] as [number, number]);
  const estMB = Math.max(5, Math.round(tilesAlong(routeCoords).length * 2 * 0.035));
  const off = s.offline === 'ready'
    ? { ring: ringConic(100, 'var(--g)', '#19C2B8'), glow: 'rgba(46,229,157,.6)', icon: 'ph-shield-check', iconC: 'var(--g)', pct: t('Ready'), title: t('Survival Mode on'), sub: t('{region} route map · {mb} MB saved on this phone', { region: c.region, mb: mb(s.offlineMB) }), btnBg: 'var(--fill)', btnFg: 'var(--ink)', btnBorder: '1px solid var(--line2)', btnShadow: 'none', btnIcon: 'ph-trash', btnLabel: t('Clear cache') }
    : s.offline === 'downloading'
      ? { ring: ringConic(s.progress, 'var(--sky)', 'var(--vio)'), glow: 'rgba(155,123,255,.55)', icon: 'ph-cloud-arrow-down', iconC: 'var(--sky)', pct: s.progress + '%', title: t('Caching for offline…'), sub: t('{mb} MB so far · route map, terrain, trip and weather', { mb: mb(s.offlineMB) }), btnBg: 'var(--fill)', btnFg: 'var(--mute)', btnBorder: '1px solid var(--line)', btnShadow: 'none', btnIcon: 'ph-hourglass', btnLabel: t('Downloading') }
      : { ring: ringConic(0, 'var(--sky)', 'var(--vio)'), glow: 'rgba(111,211,255,.15)', icon: 'ph-wifi-slash', iconC: 'var(--amb)', pct: t('~{n} MB', { n: estMB }), title: t('No signal past Chilas?'), sub: s.offlineErr || t('Save the {region} route map, terrain and your trip for the dead zones.', { region: c.region }), btnBg: 'var(--cta)', btnFg: 'var(--onCta)', btnBorder: '0', btnShadow: '0 18px 36px -14px rgba(46,229,157,.75)', btnIcon: 'ph-download-simple', btnLabel: t('Download for offline') };

  const tierC: Record<string, string> = { Premium: 'var(--vio)', Standard: 'var(--g)', Backpacker: 'var(--amb)', Search: 'var(--sky)' };
  const tierG: Record<string, string> = { Premium: 'linear-gradient(135deg,#9B7BFF,#5B6CFF)', Standard: 'linear-gradient(135deg,#2EE59D,#0FA678)', Backpacker: 'linear-gradient(135deg,#FFB547,#FF7A3D)', Search: 'linear-gradient(135deg,#6FD3FF,#3B8DFF)' };
  const fitsS = (x: { ok: boolean; total: number }) => x.ok !== false && x.total <= cap;
  const opts = configsFor(s).map(cf => { const r = costFor({ ...s, vehicle: cf.vehicle, tier: cf.tier }); return { ...cf, total: r.total, ok: r.ok, why: r.why }; }).filter(o => !o.why && o.ok).sort((a, b) => a.total - b.total);
  const applyCfg = (o: { vehicle: VehicleId; tier: AppState['tier'] }) => () => { set({ vehicle: o.vehicle, tier: o.tier, flash: 'budget' }); api.later(2200, () => set({ flash: null })); };
  const warn = { bg: 'linear-gradient(135deg,rgba(255,181,71,.22),rgba(255,122,61,.06))', border: 'rgba(255,181,71,.45)', tile: 'linear-gradient(135deg,#FFB547,#FF7A3D)', icon: 'ph-trend-down' };
  const good = { bg: 'linear-gradient(135deg,rgba(155,123,255,.22),rgba(111,211,255,.06))', border: 'rgba(155,123,255,.45)', tile: 'linear-gradient(135deg,#9B7BFF,#6FD3FF)', icon: 'ph-arrow-fat-lines-up' };
  type Tip = { show: boolean; bg?: string; border?: string; tile?: string; icon?: string; title?: string; msg?: string; cta?: string; apply?: () => void };
  let tip: Tip = { show: false };
  if (cc.why === 'No airport') tip = { show: true, ...warn, icon: 'ph-airplane-tilt', title: t('No flights to {name}', { name: c.name }), msg: t('{name} has no airport with scheduled flights. Drive, or hire a car with a driver.', { name: c.name }), cta: t('Hire car'), apply: () => set({ vehicle: 'rentcar' }) };
  else if (!cc.ok && s.vehicle === 'air') tip = { show: true, ...warn, icon: 'ph-calendar-x', title: t('{n} days is too short to fly in', { n: s.days }), msg: t('Northern flights are often delayed by weather. Plan at least 3 days.'), cta: t('Set 3 days'), apply: () => set({ days: 3 }) };
  else if (!cc.ok && L) tip = { show: true, ...warn, icon: 'ph-calendar-x', title: t('{n} days isn’t enough for this route', { n: s.days }), msg: t('{places}: {km} km round trip, about {h} h at the wheel over {d} driving days, plus time to see each place.', { places: stopNames.join(', '), km: c.kmStr, h: Math.round(c.hours), d: c.legDays }), cta: t('Set {n} days', { n: c.minDays }), apply: () => set({ days: c.minDays }) };
  else if (!cc.ok) tip = { show: true, ...warn, icon: 'ph-calendar-x', title: t('{n} days isn’t enough for this route', { n: s.days }), msg: c.legDays > 1
    ? t('{km} km by road, about {h} h each way. That’s {d} driving days each way at {max} h a day, plus 1 day there.', { km: c.kmStr, h: Math.round(c.hours), d: c.legDays, max: MAX_DRIVE_H })
    : t('{km} km by road, about {h} h each way. That’s {d} driving day each way at {max} h a day, plus 1 day there.', { km: c.kmStr, h: Math.round(c.hours), d: c.legDays, max: MAX_DRIVE_H }), cta: t('Set {n} days', { n: c.minDays }), apply: () => set({ days: c.minDays }) };
  else if (capOn && total > s.cap) {
    const fit = opts.filter(fitsS);
    if (fit.length) { const o = fit[fit.length - 1]; tip = { show: true, ...warn, title: t('{amount} over your cap', { amount: fmt(total - s.cap) }), msg: t('{name} ({vehicle}, {tier} stays) comes to {amount}.', { name: t(o.name), vehicle: t(VEH[o.vehicle].short), tier: t(TIERS[o.tier].label).toLowerCase(), amount: fmt(o.total) }), cta: t('Switch'), apply: applyCfg(o) }; }
    else {
      const minD = cc.minDays || 2, cheapest = Math.min(total, ...configsFor(s).map(cf => costFor({ ...s, vehicle: cf.vehicle, tier: cf.tier })).filter(r => r.ok && !r.why).map(r => r.total)), need = Math.ceil(cheapest / 5000) * 5000;
      tip = s.days - 1 >= minD
        ? { show: true, ...warn, title: t('{amount} over your cap', { amount: fmt(total - s.cap) }), msg: t('Even the cheapest option is over. Drop a day or raise the cap.'), cta: t('−1 day'), apply: () => set({ days: s.days - 1 }) }
        : { show: true, ...warn, title: t('{amount} over your cap', { amount: fmt(total - s.cap) }), msg: t('This route needs at least {n} days, so cutting days won’t work. The cheapest option comes to {amount}.', { n: minD, amount: fmt(cheapest) }), cta: t('Cap {amount}', { amount: kShort(need) }), apply: () => set({ cap: need }) };
    }
  } else {
    const up = opts.filter(o => fitsS(o) && o.total > total + 1000);
    if (capOn && up.length && s.cap - total > s.cap * .15) { const o = up[up.length - 1]; tip = { show: true, ...good, title: t('{amount} to spare', { amount: fmt(s.cap - total) }), msg: t('Upgrade to {name} ({vehicle}, {tier} stays) for {amount}.', { name: t(o.name), vehicle: t(VEH[o.vehicle].short), tier: t(TIERS[o.tier].label).toLowerCase(), amount: fmt(o.total) }), cta: t('Upgrade'), apply: applyCfg(o) }; }
  }

  const canNext = s.step === 0 ? !!s.wish : s.step === 1 ? !!s.origin : s.step === 2 ? !!s.mode : true;
  const chip = (on: boolean) => ({ bg: on ? 'var(--cta)' : 'var(--fill)', fg: on ? 'var(--onCta)' : 'var(--ink2)', border: on ? 'transparent' : 'var(--line2)' });
  const fitCount = s.mode === 'know' ? 0 : sug.list.filter(fitsS).length;
  const obTitles = [
    { title: t('What do you want to see?'), sub: t('Pick the trip you dream of. SafarCo suggests the best months and places for it.') },
    { title: t('Which city do you live in?'), sub: t('Your trip starts here. Distance, fuel, tolls and travel time are calculated from it.') },
    { title: t('Where do you want to go?'), sub: t('From {origin}. Search any city or tourist spot, or let SafarCo suggest one.', { origin: s.origin || 'Islamabad' }) },
    { title: t('When are you going?'), sub: t('Tentative dates are fine. Roads, season and prices change with the month.') },
    { title: t('Who’s travelling, and how?'), sub: t('Fares, meals and rooms are worked out for each person.') },
    { title: t('How do you like to stay?'), sub: t('Prices are worked out for your trip. You can set a spending limit if you have one.') },
    s.mode === 'know' ? { title: t('Your {name} options', { name: DST(s.dest).name }), sub: capOn ? t('Move the budget and the options re-rank instantly.') : t('Every way to go, with the full price for your group.') }
      : capOn ? { title: t('Trips that fit your budget'), sub: t('Ranked for your dates, days and budget.') } : { title: t('Trips for you'), sub: t('Ranked for your dates and wish, priced for your group.') }];
  // "How do you like to stay?": each kind of stay with its price for this trip, worked out live.
  const stayOpts = s.step !== 5 || s.screen === 'app' ? [] : (['backpacker', 'standard', 'premium'] as const).map(tier => {
    const cfgs = configsFor(s).filter(cf => cf.tier === tier), W2 = s.wish && s.wish !== 'any' ? wishPlaces(s.wish).map(p => p.id) : [];
    const places = s.mode === 'know' ? [s.dest] : (W2.length >= 3 ? W2 : [...new Set([...W2, ...SUGGEST_POOL])]).filter(k => DST(k).name !== s.origin);
    const rs = places.flatMap(k => cfgs.map(cf => costFor({ ...s, corridor: k, vehicle: cf.vehicle, tier, extra: s.mode === 'know' ? s.extra : [] }))).filter(r => !r.why);
    const totals = rs.filter(r => r.ok).map(r => r.total), need = rs.length ? Math.min(...rs.map(r => r.minDays)) : 0;
    const low = totals.length ? Math.min(...totals) : 0, on = s.tier === tier;
    const info = { backpacker: { label: t('Budget'), sub: t('Guest houses and dhabas'), icon: 'ph-tent' }, standard: { label: t('Standard'), sub: t('Good hotels and restaurants'), icon: 'ph-bed' }, premium: { label: t('Comfort'), sub: t('Resorts and the best views'), icon: 'ph-star' } }[tier];
    return { key: tier, ...info, on, low, tile: TIER_G[tier],
      // Too short for this kind of stay (it means going by road): one tap makes the trip long enough.
      price: !low ? (need > s.days ? t('Needs {n} days by road', { n: need }) : t('Not for this trip')) : s.mode === 'know' ? fmt(low) : t('From {amount}', { amount: fmt(low) }),
      each: low ? t('{amount} each', { amount: kShort(low / Math.max(1, s.groupSize)) }) : need > s.days ? t('Tap to make it {n} days', { n: need }) : '',
      onClick: () => set({ tier, pickId: null, ...(!low && need > s.days && need <= 14 ? { days: need, daysSet: true } : {}) }) };
  });

  const geoOf = (q: string) => LIVE.geo[q.trim().toLowerCase()];
  const destRows = (() => {
    if (s.step !== 2 || s.mode !== 'know') return [];
    const q = s.dq.trim().toLowerCase(), o = s.origin || 'Islamabad';
    let ids: string[];
    if (!q) ids = POP_DEST.slice();
    else {
      const cur = DESTS.filter(d => [d.name, d.town || '', d.region].some(x => x.toLowerCase().includes(q))).map(d => d.id);
      const cit = CITIES.filter(c => !CITY_DUP.has(c.n) && (c.n.toLowerCase().includes(q) || c.p.toLowerCase().includes(q))).sort((a, b) => (+b.n.toLowerCase().startsWith(q) - +a.n.toLowerCase().startsWith(q)) || a.n.localeCompare(b.n)).map(c => 'city:' + c.n);
      ids = [...cur, ...cit]; const g = geoOf(q); if (g && g.status === 'ok') g.data.forEach(n => { const id = 'city:' + n; if (CITY[n] && !CITY_DUP.has(n) && !ids.includes(id)) ids.push(id); });
    }
    ids = ids.filter(id => DST(id).name !== o);
    if (!q && !ids.includes(s.dest) && DST(s.dest).name !== o) ids.unshift(s.dest);
    return ids.slice(0, 30).map(id => {
      const D = DST(id), tr = trip(id, o, M), on = s.dest === id;
      const fitTxt = s.have === 'car' || s.have === 'bike' ? roadFit(HAVE_VEHICLE[s.have], id, o, M)?.text || '' : '';
      return { key: id, name: D.name, fit: fitTxt, sub: (D.ft != null && !D.generic ? t('{region} · {ft} ft', { region: D.region, ft: fmtN(D.ft) }) : D.region) + (D.checked === false ? ' · ' + t('not checked yet') : ''), meta: t('{km} km · {h} h', { km: tr.kmStr, h: Math.round(tr.hours) }), icon: D.icon, onClick: () => set({ dest: id, corridor: id, pickId: null, ...(id !== s.corridor ? { extra: [] } : {}) }),
        bg: on ? 'rgba(255,181,71,.12)' : 'transparent', border: on ? 'rgba(255,181,71,.5)' : 'transparent', iconC: on ? 'var(--amb)' : 'var(--mute)', checkOp: on ? 1 : 0 };
    });
  })();

  const oqT = s.oq.trim().toLowerCase();
  // The traveller's added and removed places and chosen departure times (see src/edits.ts).
  const pk = planKey(s), edits = s.edits.key === pk ? s.edits : { ...NO_EDITS, key: pk };
  const plan = buildPlan({ ...s, departAt: edits.times });
  /** Leave earlier or later on one day; null goes back to the suggested time. */
  const setDepart = (day: number, h: number | null) => { const times = { ...(edits.times || {}) }; if (h == null) delete times[day]; else times[day] = Math.max(3, Math.min(12, h)); set({ edits: { ...edits, times } }); };
  const edited = plan.days.map((d, i) => editDay(d, i, edits));
  const addPick = (day: number, p: { name: string; note: string; href: string }) => set({ edits: { ...edits, picks: [...edits.picks, { day, ...p }] }, toast: t('Added {name} to Day {n}', { name: p.name, n: day + 1 }) });
  const removeStop = (day: number, x: EditedStop) => x.added
    ? set({ edits: { ...edits, picks: edits.picks.filter(p => !(p.day === day && p.name === x.label)) } })
    : set({ edits: { ...edits, drops: [...edits.drops, dropKey(day, x.label)] } });

  // Weather along the whole route (see src/weather).
  const liveRoad = LIVE.route[routeKey(cityOr(s.origin).n, s.corridor)];
  const rPoints = routePoints(s, plan, !L && liveRoad && liveRoad.status === 'ok' ? liveRoad.data.coords : null);
  const wPlan = weatherPlan(s, plan, rPoints), rw = weatherView(s, plan, rPoints, wPlan);

  // Fuel pumps along the road, for trips where you fill the tank yourself (see src/engine/fuel.ts).
  const ownTank = ['sedan', 'suv', 'bike', 'rentcar', 'rent4x4', 'coaster'].includes(s.vehicle) && s.screen === 'app';
  const roadLine = !L && liveRoad && liveRoad.status === 'ok' ? liveRoad.data.coords : null;
  const fuel = ownTank ? fuelByDay(plan, rPoints, roadLine) : new Map<number, DayFuel>();
  const fuelPoints = ownTank && roadLine ? fuelQueryPoints(rPoints).map(p => ({ lat: p.lat, lon: p.lon })) : [];
  const fuelPins = [...fuel.entries()].filter(([i]) => plan.days[i].kind !== 'return').flatMap(([, f]) => f.stops)
    .map(x => ({ key: x.key, lat: x.lat, lon: x.lon, text: x.count > 1 ? t('{place}: {n} fuel pumps', { place: x.place || x.name, n: x.count }) : `${x.place ? x.place + ': ' : ''}${x.name === 'Fuel station' ? t('Fuel station') : x.name}` }));

  // Places to stay and see, from OpenStreetMap via Geoapify, plus honest price ranges.
  const D = DST(s.corridor), sf = seasonFactor(D, M), AD = s.adults + s.elders;
  const rooms = s.rooms === 'shared' ? Math.ceil(s.groupSize / 4) : Math.max(1, Math.ceil(AD / 2));
  const spotsAt = (kind: 'sights' | 'hotels', lat: number, lon: number) => { const e = LIVE.places[placesKey(kind, lat, lon)]; return { loading: !e || e.status === 'loading', list: e && e.status === 'ok' ? e.data : [] as Spot[] }; };
  const check = (q: string, checkin: string, n: number) => checkPricesUrl(q, checkin, n, AD, s.kids, rooms);

  // Season guide: the best places by season, what's best in the trip's month, and this trip's season.
  const note = (id: string) => prices().seasonNotes[id] || '';
  const kmFrom = (id: string) => trip(id, s.origin, M).km;
  const goTo = (id: string, months: number[]) => {
    const keep = months.includes(mon(s)) && s.startDate >= isoAdd(1);
    const date = keep ? s.startDate : nextStartIn(months);
    if (s.screen === 'onboard') set({ guide: false, mode: 'know', dest: id, corridor: id, pickId: null, startDate: date, step: Math.max(s.step, 3) });
    else set({ guide: false, dest: id, corridor: id, chosen: id, pickId: null, startDate: date, toast: t('Planning {name} for {month}', { name: DST(id).name, month: MONTH_FULL[+date.slice(5, 7) - 1] }) });
  };
  const guide = {
    initial: seasonOf(M).id,
    seasons: SEASONS.map(se => ({ ...se, label: t(se.label), blurb: t(se.blurb), picks: seasonPicks(se.id).filter(p => DST(p.id).name !== s.origin).sort((a, b) => +!!a.h.caution - +!!b.h.caution || kmFrom(a.id) - kmFrom(b.id))
      .map(p => ({ key: p.id + se.id, name: p.name, region: p.region, text: t(p.h.text), ...iconFor(p.h), when: monthsLabel(p.h.months), caution: p.h.caution ? t(p.h.caution) : '', note: note(p.id), km: t('{km} km', { km: fmtN(kmFrom(p.id)) }), onPick: () => goTo(p.id, p.h.months) })) })),
    open: () => set({ guide: true, sheet: 'none', settings: false }), close: () => set({ guide: false })
  };
  /** A suggestion card: the place's guide photo once loaded (else ours for the season), what's special, when, how far. */
  const pickCard = (id: string, h: { text: string; months: number[]; caution?: string }) => {
    const w = LIVE.wiki[id], img = w && w.status === 'ok' && w.data?.image;
    return { photo: ownPhoto(id) || img || cardPhoto(id, h.months.includes(M) ? M : h.months[0]), text: t(h.text), when: monthsLabel(h.months), km: s.origin ? t('{km} km', { km: fmtN(kmFrom(id)) }) : '' };
  };
  const bestNow = { month: MONTH_FULL[M - 1], picks: DESTS.filter(d => DST(d.id).name !== s.origin).flatMap(d => { const h = highlightIn(d.id, M); return h ? [{ id: d.id, name: d.name, h }] : []; })
    .sort((a, b) => +!!a.h.caution - +!!b.h.caution || kmFrom(a.id) - kmFrom(b.id)).slice(0, 10)
    .map(p => ({ key: p.id, name: p.name, ...iconFor(p.h), ...pickCard(p.id, p.h), caution: !!p.h.caution, on: s.dest === p.id && s.mode === 'know', onClick: () => set({ mode: 'know', dest: p.id, corridor: p.id, pickId: null }) })) };
  const tripSeason = (() => {
    const Dd = DST(s.corridor); if (Dd.generic) return null;
    const h = highlightIn(s.corridor, M), first = highlightsOf(s.corridor)[0], Mo = MONTH_FULL[M - 1];
    const extra = note(s.corridor);
    if (h && !h.caution) { const ht = t(h.text); return { tone: 'good' as const, text: t('Great time to go: {what} ({months}).', { what: s.lang === 'ur' ? ht : ht.charAt(0).toLowerCase() + ht.slice(1), months: monthsLabel(h.months) }), note: extra, alts: [], altLabel: '' }; }
    if (h) return { tone: 'care' as const, text: t('{text} in {month}. {caution}', { text: t(h.text), month: Mo, caution: h.caution ? t(h.caution) : '' }), note: extra, alts: [], altLabel: '' };
    const off = (Dd.warn && Dd.warn[0].includes(M)) || (Dd.best && !Dd.best.includes(M));
    if (!off) return Dd.best ? { tone: 'good' as const, text: t('Good time to visit {name} (best {months}).', { name: Dd.name, months: monthsLabel(Dd.best) }), note: extra, alts: [], altLabel: '' } : null;
    const alts = DESTS.filter(d => d.id !== s.corridor && DST(d.id).name !== s.origin).flatMap(d => { const x = highlightIn(d.id, M); return x && !x.caution ? [{ id: d.id, name: d.name, text: x.text }] : []; })
      .sort((a, b) => kmFrom(a.id) - kmFrom(b.id)).slice(0, 3).map(a => ({ key: a.id, name: a.name, text: t(a.text), onClick: () => set({ dest: a.id, corridor: a.id, chosen: a.id, pickId: null }) }));
    const bestWhen = highlightsOf(s.corridor).filter(x => !x.caution).map(x => monthsLabel(x.months)).join(', ') || monthsLabel(Dd.best || []);
    return { tone: 'off' as const, text: Dd.warn && Dd.warn[0].includes(M)
      ? t('{month} isn’t a good time for {name}. {warn} Best: {when}.', { month: Mo, name: Dd.name, warn: t(Dd.warn[1]), when: bestWhen })
      : t('{month} isn’t a good time for {name}. Best: {when}.', { month: Mo, name: Dd.name, when: bestWhen }), note: extra, alts, altLabel: t('In {month}, try:', { month: Mo }) };
  })();

  // The admin's trusted hotels, drivers and road alerts, kept to the places this trip passes.
  const tripLine: [number, number][] = s.vehicle === 'air' ? [] : routeCoords;
  const tripStops = [{ lat: D.lat, lon: D.lon }, ...plan.days.flatMap(d => d.stay ? [{ lat: d.stay.lat, lon: d.stay.lon }] : [])];
  const shortDate = (iso: string) => { const d = new Date(iso + 'T00:00'); return isNaN(+d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const contact = (phone: string) => ({ wa: waLink(phone), tel: telLink(phone) });
  // Rating opens after the stay: a hotel from the morning after its night, a driver from the day
  // after the trip first sleeps near them (or after the trip if it only passes by).
  const today = isoAdd(0), tripEnd = isoOff(s.startDate, Math.max(0, plan.days.length - 1));
  const rateOpen = (kind: 'hotel' | 'driver', id: string, name: string, date: string) => date < today ? () => set({ sheet: 'review', reviewFor: { kind, id, name, date } }) : null;
  const driverDay = (area: string) => { const i = plan.days.findIndex(d => d.stay && nearPoint(area, d.stay.lat, d.stay.lon, 25)); return i >= 0 ? isoOff(s.startDate, i + 1) : tripEnd; };
  const drivers = prices().drivers.filter(x => x.active && onTrip([x.area], tripLine, tripStops)).map(x => ({
    key: x.id, name: x.name, area: areaOf(x.area)?.name || '', vehicle: x.seats ? t('{vehicle} · {n} seats', { vehicle: x.vehicle, n: x.seats }) : x.vehicle,
    rate: !x.rate ? '' : x.checked ? t('{rate} · checked {date}', { rate: `PKR ${fmtN(x.rate)} (${usd(x.rate)})`, date: shortDate(x.checked) }) : `PKR ${fmtN(x.rate)} (${usd(x.rate)})`, note: x.note, ...contact(x.phone),
    rating: ratingOf('driver', x.id), date: driverDay(x.area), review: rateOpen('driver', x.id, x.name, driverDay(x.area)) }));
  const trustedAt = (lat: number, lon: number) => prices().hotels.filter(h => h.active && nearPoint(h.area, lat, lon, 15));

  // After the trip: ask about each trusted hotel and driver it used, once per person.
  const tripKey = `trip:${s.corridor}|${s.startDate}`;
  const afterTrip = (() => {
    if (tripEnd >= today || isRated(tripKey)) return null;
    const seen = new Set<string>(), items: { kind: 'hotel' | 'driver'; id: string; name: string; date: string; when: string }[] = [];
    plan.days.forEach((d, i) => d.stay && trustedAt(d.stay.lat, d.stay.lon).forEach(h => {
      if (seen.has('h' + h.id)) return; seen.add('h' + h.id);
      items.push({ kind: 'hotel', id: h.id, name: h.name, date: isoOff(s.startDate, i), when: t('Night of {date}', { date: dayLabel(s.startDate, i) }) });
    }));
    drivers.forEach(x => items.push({ kind: 'driver', id: x.key, name: x.name, date: x.date, when: x.vehicle }));
    const left = items.filter(x => !isRated(ratedKey(x.kind, x.id))).map(x => ({ ...x, key: ratedKey(x.kind, x.id),
      rate: () => set({ sheet: 'review', reviewFor: { kind: x.kind, id: x.id, name: x.name, date: x.date } }),
      skip: () => { markRated(ratedKey(x.kind, x.id)); set({}); } }));
    return left.length ? { items: left, dismiss: () => { markRated(tripKey); set({}); } } : null;
  })();
  const tierRanges = (['backpacker', 'standard', 'premium'] as const).map(k => ({ key: k, label: t(TIERS[k].label), on: s.tier === k, ...nightRange(k, sf) }));
  const destHotels = spotsAt('hotels', D.lat, D.lon), destSights = spotsAt('sights', D.lat, D.lon);
  const nightsAtDest = plan.days.filter(d => d.stay && d.stay.town === D.town).length || 1;
  const stays = {
    town: D.town, month: MONTH_FULL[M - 1], ranges: tierRanges, loading: destHotels.loading && !(D.hotels || []).length,
    source: destHotels.list.length ? 'OpenStreetMap' : (D.hotels || []).length ? t('SafarCo’s picks (check they’re open)') : '',
    searchUrl: check(D.town, s.startDate, s.days - 1),
    list: (destHotels.list.length
      ? destHotels.list.slice(0, 8).map(h => ({ name: h.name, note: h.km ? t('{type} · {km} km from centre', { type: t(h.type), km: h.km }) : t(h.type), tier: h.type, lat: h.lat, lon: h.lon }))
      : (D.hotels || []).map(([name, tier, note]) => ({ name, note: t(note), tier, lat: D.lat, lon: D.lon })))
      .map(h => ({ ...h, key: h.name, checkUrl: check(`${h.name}, ${D.town}`, s.startDate, nightsAtDest), mapUrl: mapsQ(`${h.name}, ${D.town}`) }))
  };
  const planned = new Set(placesFor(D, M).map(p => p[0].toLowerCase()));
  const nearby = { loading: destSights.loading, list: destSights.list.filter(x => !planned.has(x.name.toLowerCase())).slice(0, 8).map(x => ({ key: x.name, name: x.name, note: x.km ? t('{type} · {km} km', { type: t(x.type), km: x.km }) : t(x.type), href: mapsQ(`${x.name}, ${D.town}`) })) };
  const fx = fxRate(), wikiE = LIVE.wiki[D.id];

  // Places to add to a day: the destination's places and live sights, or sights near a driving day's night stop.
  const inPlan = new Set(edited.flatMap(e => e.stops.map(x => x.label.toLowerCase())));
  // A place's own sights: its guide plus live ones (each place on a circuit has its own).
  const poolFor = (X: typeof D) => { const live = X.id === D.id ? destSights : spotsAt('sights', X.lat, X.lon);
    return { loading: live.loading, list: [...placesFor(X, M).map(p => ({ name: p[0], note: [t(p[1]), t(p[2])].filter(Boolean).join(' · '), href: p[4] || mapsQ(`${p[0]}, ${X.town}`) })),
      ...live.list.map(x => ({ name: x.name, note: x.km ? t('{type} · {km} km', { type: t(x.type), km: x.km }) : t(x.type), href: mapsQ(`${x.name}, ${X.town}`) }))] }; };
  const placeAt = (town: string) => (L ? L.order : [s.corridor]).map(k => DST(k)).find(X => X.town === town) || null;
  const suggestFor = (d: PlanDay, i: number) => {
    let title = '', pool: { name: string; note: string; href: string }[] = [], loading = false;
    const here = d.stay ? placeAt(d.stay.town) : null;
    if (d.kind === 'explore') { const p = poolFor(here || D); title = t('Also nearby · tap + to add'); pool = p.list; loading = p.loading; }
    else if (d.stay && (d.kind === 'drive' || d.kind === 'return')) {
      const st = d.stay, near = spotsAt('sights', st.lat, st.lon);
      title = t('Near {town} for the evening', { town: st.town });
      if (here) { const p = poolFor(here); pool = p.list; loading = p.loading; }
      else { pool = near.list.map(x => ({ name: x.name, note: x.km ? t('{type} · {km} km', { type: t(x.type), km: x.km }) : t(x.type), href: mapsQ(`${x.name}, ${st.town}`) })); loading = near.loading; }
    }
    const seen = new Set<string>();
    // "Hoper Glacier" and "Hoper Glacier, Nagar" are the same place.
    const same = (a: string, b: string) => a === b || a.startsWith(b + ',') || b.startsWith(a + ',') || a.startsWith(b + ' ') || b.startsWith(a + ' ');
    const taken = [...inPlan];
    const list = pool.filter(p => { const k = p.name.toLowerCase(); if (taken.some(x => same(x, k)) || [...seen].some(x => same(x, k))) return false; seen.add(k); return true; })
      .slice(0, d.kind === 'explore' ? 6 : 4).map(p => ({ key: p.name, ...p, add: () => addPick(i, p) }));
    return { title, list, loading: loading && !list.length };
  };

  // Where each price comes from and when it was last checked, for the prices this trip uses.
  const own = ['sedan', 'suv', 'bike', 'rentcar', 'rent4x4', 'coaster'].includes(s.vehicle);
  const used: Section[] = [...(own ? ['fuel', 'tolls'] as Section[] : []), 'stays', ...(['rentcar', 'rent4x4', 'coaster'].includes(s.vehicle) || isAir ? ['hire'] as Section[] : []),
    ...(s.vehicle === 'public' ? ['coach'] as Section[] : []), ...(isAir ? ['fares'] as Section[] : []), ...(rows.some(r => /jeep/i.test(r.label)) ? ['jeeps'] as Section[] : [])];
  const priceNotes = used.map(k => ({ key: k, label: t(SECTIONS[k].label), source: t(SECTIONS[k].source), checked: checkedText(k), ok: !isStale(k) }));
  // Jeep tracks (Deosai, Basho…): locals know them, so hire a jeep even with your own 4x4.
  const jeepTrips = s.vehicle === 'air' ? [] : plannedJeeps(s, c0, M);
  const jeepNote = jeepTrips.length ? [{ icon: 'ph-jeep', color: 'var(--amb)', text: t('{places}: hire a local jeep and driver, even with your own 4x4, unless you know these roads and have driven them before.', { places: jeepTrips.map(j => t(j[1])).join(', ') }) }] : [];
  const alertNotes = activeAlerts().filter(a => !a.areas?.length || onTrip(a.areas, tripLine, tripStops)).map(a => ({ icon: 'ph-megaphone', color: 'var(--cor)', text: a.date ? t('{alert} (posted {date})', { alert: `${a.title}${a.message ? `: ${a.message}` : ''}`, date: dayLabel(a.date, 0) }) : `${a.title}${a.message ? `: ${a.message}` : ''}` }));

  // "What do you want to see?": the first question, then a check that the dates and place fit the wish.
  const W = wishOf(s.wish), lowerEn = (x: string) => s.lang === 'ur' ? x : x.charAt(0).toLowerCase() + x.slice(1);
  // What's in season now comes first, then what comes next through the year.
  const nowM = new Date().getMonth() + 1, monthsTo = (ms: number[]) => Math.min(...ms.map(m => (m - nowM + 12) % 12));
  const wishOpts = [...WISHES.slice().sort((a, b) => monthsTo(a.months) - monthsTo(b.months)).map(w => ({ key: w.id, now: w.months.includes(nowM), icon: w.icon, grad: w.grad, label: t(w.label), tagline: t(w.tagline), when: t('Best: {months}', { months: monthsLabel(w.months) }),
      places: wishPlaces(w.id).slice(0, 4).map(p => p.name).join(' · '), on: s.wish === w.id,
      onClick: () => set({ wish: w.id, pickId: null, startDate: w.months.includes(M) && s.startDate >= isoAdd(3) ? s.startDate : nextStartIn(w.months) }) })),
    { key: 'any', now: false, icon: 'ph-compass', grad: 'linear-gradient(160deg,#9AA5B1,#5F6B78)', label: t('Show me everything'), tagline: t('Not sure yet? See what’s best for your dates.'), when: '', places: '', on: s.wish === 'any', onClick: () => set({ wish: 'any', pickId: null }) }];
  const wishPicks = W ? { label: t('Best for {wish}', { wish: lowerEn(t(W.label)) }), picks: wishPlaces(W.id).filter(p => DST(p.id).name !== s.origin).slice(0, 10)
    .map(p => ({ key: p.id, name: p.name, icon: W.icon, color: W.color, ...pickCard(p.id, p.h), caution: !!p.h.caution, on: s.dest === p.id && s.mode === 'know', onClick: () => set({ mode: 'know', dest: p.id, corridor: p.id, pickId: null }) })) } : null;
  const wishNote = (() => {
    if (!W) return null;
    const placeOk = wishPlaces(W.id).some(p => p.id === s.corridor), when = W.months.includes(M);
    const alts = placeOk ? [] : wishPlaces(W.id).filter(p => !p.h.caution && DST(p.id).name !== s.origin).sort((a, b) => kmFrom(a.id) - kmFrom(b.id)).slice(0, 3)
      .map(p => ({ key: p.id, name: p.name, onClick: () => set({ dest: p.id, corridor: p.id, pickId: null, ...(s.screen === 'app' ? { chosen: p.id } : { mode: 'know' as const }) }) }));
    const nm = nextStartIn(W.months), nmLabel = MONTH_FULL[+nm.slice(5, 7) - 1];
    return {
      good: when && placeOk, icon: W.icon, color: W.color,
      text: when ? t('Your wish: {wish}. {month} is a great time for it.', { wish: t(W.label), month: MONTH_FULL[M - 1] })
        : t('Your wish: {wish}. {month} is {season}, so you may not see it. Best months: {months}.', { wish: t(W.label), month: MONTH_FULL[M - 1], season: t(seasonOf(M).label).toLowerCase(), months: monthsLabel(W.months) }),
      fix: when ? null : { label: t('Move to {month}', { month: nmLabel }), apply: () => set({ startDate: nm, pickId: null }) },
      place: placeOk || (s.screen === 'onboard' && s.mode !== 'know') ? '' : t('{name} isn’t known for {wish}. Try:', { name: DST(s.corridor).name, wish: lowerEn(t(W.label)) }), alts
    };
  })();

  // Suggestions for a wish that none of its places fit: say why, and offer the one change that fixes it.
  const wishFit = (() => {
    if (!W || s.mode !== 'suggest') return null;
    const ids = new Set(wishPlaces(W.id).map(p => p.id)), wl = sug.list.filter(x => ids.has(x.corridor));
    if (!wl.length || wl.some(fitsS)) return null;
    const q = wl.slice().sort((a, b) => (+!a.ok - +!b.ok) || a.minDays - b.minDays || a.total - b.total)[0], name = DST(q.corridor).name;
    if (!q.ok) return { text: t('From {origin}, places for {wish} are far. {name} needs at least {n} days ({how}).', { origin: s.origin || '', wish: lowerEn(t(W.label)), name, n: q.minDays, how: t(VEH[q.vehicle].short) }), cta: t('Set {n} days', { n: q.minDays }), apply: () => set({ days: q.minDays, pickId: null }) };
    const need = Math.ceil(q.total / 5000) * 5000;
    return { text: t('{name} fits your days, but comes to {amount}, more than your budget.', { name, amount: fmt(q.total) }), cta: t('Budget {amount}', { amount: kShort(need) }), apply: () => set({ cap: need, pickId: null }) };
  })();

  // Places on this trip: the main one plus up to 3 more nearby (a circuit), in SafarCo's order.
  const tripPlaces = (() => {
    const chosen = [s.corridor, ...(s.extra || [])], from = DST(s.corridor), wished = new Set(W ? wishPlaces(W.id).map(p => p.id) : []);
    const options = (s.extra || []).length >= 3 || s.vehicle === 'air' || from.generic ? [] : DESTS.filter(d => !chosen.includes(d.id) && d.name !== s.origin)
      .map(d => ({ d, km: tripFrom(d.id, { n: '@' + s.corridor, lat: from.lat, lon: from.lon }, M).km })).filter(x => x.km <= 450)
      .sort((a, b) => (+wished.has(b.d.id) - +wished.has(a.d.id)) || a.km - b.km).slice(0, 8)
      .map(x => ({ key: x.d.id, name: x.d.name, sub: t('{km} km from {place}', { km: fmtN(x.km), place: from.name }), wish: wished.has(x.d.id), onClick: () => set({ extra: [...(s.extra || []), x.d.id].slice(0, 3), pickId: null }) }));
    return {
      list: (L ? L.order : [s.corridor]).map(k => ({ key: k, name: DST(k).name, main: k === s.corridor, remove: k === s.corridor ? null : () => set({ extra: (s.extra || []).filter(x => x !== k), pickId: null }) })),
      options, note: L ? t('SafarCo’s order: {order}, then home. Needs at least {n} days.', { order: stopNames.join(' → '), n: L.minDays }) : '',
      air: s.vehicle === 'air'
    };
  })();

  // "How will you travel?": what the traveller already has.
  const travelOpts = ([['any', 'ph-sparkle', t('Suggest the best way'), t('Coach, hired car or flight')], ['car', 'ph-car-profile', t('Our own car'), t('Sedan or hatchback')],
    ['suv', 'ph-jeep', t('Own SUV / 4x4'), t('Prado, Fortuner, Land Cruiser')], ['bike', 'ph-motorcycle', t('Motorbike'), t('Our own bike')]] as const).map(([k, icon, label, sub]) => {
    const on = s.have === k;
    return { key: k, icon, label, sub, on, onClick: () => set({ have: k, pickId: null, ...(k === 'any' ? {} : { vehicle: HAVE_VEHICLE[k] }) }) };
  });

  // "Getting your plan ready": the live data a new plan waits for, each ticked off as it arrives.
  const buildSteps = (() => {
    const out: { key: string; done: boolean; label: string }[] = [];
    if (!isAir) out.push({ key: 'road', done: !liveRoad || liveRoad.status !== 'loading', label: liveRoad && liveRoad.status === 'ok' ? t('Roads checked · {km} km', { km: fmtN(liveRoad.data.km) }) : liveRoad && liveRoad.status === 'loading' ? t('Checking the roads…') : t('Route planned from SafarCo’s road table') });
    const pass = rw.passes[0];
    out.push({ key: 'wx', done: !rw.destLoading, label: !rw.destLoading ? t('Weather checked for your dates') : pass ? t('Checking the weather at {place}…', { place: pass.name }) : t('Checking the weather in {place}…', { place: D.town }) });
    const waiting = plan.days.find(d => d.stay && spotsAt('hotels', d.stay.lat, d.stay.lon).loading);
    out.push({ key: 'hotels', done: !waiting, label: waiting ? t('Finding hotels in {town}…', { town: waiting.stay!.town }) : t('Hotels found for every night') });
    if (ownTank) { const busy = (liveRoad?.status === 'loading') || [...fuel.values()].some(f => f.loading); out.push({ key: 'fuel', done: !busy, label: busy ? t('Finding fuel pumps on the road…') : t('Fuel stops marked') }); }
    return out;
  })();
  const buildTips = [
    tripSeason && tripSeason.tone === 'good' ? tripSeason.text : '',
    ...rw.passes.slice(0, 2).map(p => t('{pass} is at {ft}. Carry a warm jacket, even in summer.', { pass: p.name, ft: p.ft })),
    t('Mountain roads are slower than map apps show. SafarCo plans for it.'),
    t('Tap any day in your plan to add or remove places.'),
    ...(ownTank ? [t('Fuel pumps are far apart in the mountains. SafarCo marks where to fill up.')] : [])
  ].filter(Boolean);

  // Budget: one bar split by what the money goes on, in a fixed colour order (checked for colour-blind readers).
  const BUD: [string, string][] = [['Stay', 'Stay'], ['Fuel', 'Fuel'], ['Meals', 'Meals'], ['Transport', 'Transport'], ['Tolls', 'Tolls'], ['Jeeps', 'Local jeeps']];
  const SER = s.theme === 'dark' ? ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'] : ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6'];
  const groupOf = (label: string) => label === 'Stay' || label === 'Fuel' || label === 'Meals' || label === 'Tolls' ? label : /jeep/i.test(label) ? 'Jeeps' : 'Transport';
  const budget = (() => {
    const sums = new Map<string, number>(); rows.forEach(r => sums.set(groupOf(r.label), (sums.get(groupOf(r.label)) || 0) + r.val));
    const segs = BUD.map(([k, label], i) => ({ key: k, label: t(label), val: sums.get(k) || 0, color: SER[i] })).filter(x => x.val > 0)
      .map(x => ({ ...x, pct: total ? x.val / total * 100 : 0, amount: fmt(x.val), share: total ? `${Math.max(1, Math.round(x.val / total * 100))}%` : '' }));
    const others = opts.filter(o => !(o.vehicle === s.vehicle && o.tier === s.tier)).map(o => ({ key: o.id, name: t(o.name), sub: t('{vehicle} · {tier} stays', { vehicle: t(VEH[o.vehicle].short), tier: t(TIERS[o.tier].label) }),
      amount: fmt(o.total), diff: o.total < total ? t('Save {amount}', { amount: kShort(total - o.total) }) : t('+{amount}', { amount: kShort(o.total - total) }), cheaper: o.total < total, fits: !s.capOn || o.total <= s.cap, onClick: applyCfg(o) }));
    return { segs, others };
  })();

  const dayCount = plan.days.length;
  const dayPage = s.dayOpen != null && s.dayOpen < dayCount ? { i: s.dayOpen, close: () => set({ dayOpen: null }), prev: s.dayOpen > 0 ? () => set({ dayOpen: s.dayOpen! - 1 }) : null, next: s.dayOpen < dayCount - 1 ? () => set({ dayOpen: s.dayOpen! + 1 }) : null } : null;
  const editCount = edits.picks.length + edits.drops.length;

  const view = {
    wishOpts, wishPicks, wishNote, wishFit, tripPlaces, travelOpts, buildSteps, photo: destPhoto(s.corridor, M, s.startDate), cardPhoto: cardPhoto(s.corridor, M, s.startDate),
    cardStops: (() => {
      // The trip as a line of stops for the share card: home, the nights on the way, the place (and home again on a circuit).
      const home = s.origin || '', dests = [s.corridor, ...(s.extra || [])].map(k => DST(k)), nameOf = (tw: string) => dests.find(x => x.town === tw)?.name || tw;
      if (isAir) return [home, D.name];
      const towns: string[] = [];
      plan.days.forEach(d => { const n = d.stay ? nameOf(d.stay.town) : ''; if (n && n !== home && n !== towns[towns.length - 1]) towns.push(n); });
      let list = c.loop ? [home, ...towns, home] : (() => { const i = towns.indexOf(D.name); return [home, ...(i >= 0 ? towns.slice(0, i) : []), D.name]; })();
      list = list.filter((x, i) => x && x !== list[i - 1]);
      if (list.length > 5) list = [0, 1, 2, 3, 4].map(k => list[Math.round(k * (list.length - 1) / 4)]);
      return list;
    })(), buildTips, budget, dayPage, totalShort: kShort(total), openDay: (i: number) => set({ dayOpen: i }), vehIcon: VEH[s.vehicle].icon,
    editNote: editCount ? { text: editCount > 1 ? t('{n} changes to the places', { n: editCount }) : t('1 change to the places'), undo: () => set({ edits: NO_EDITS }) } : null,
    s, c, gate, tip, health, off, isAir, fuelPoints, fuelPins, drivers, afterTrip, guide, bestNow, tripSeason, wPlan, rPoints, selCorridor: sug.sel?.corridor, stays, nearby, priceNotes, ratesNote: isAir ? t('Flight fares are tentative: tap a flight day to see live fares. Confirm with the airline before you book.')
      : t('Prices: {checked}. Confirm with the operator before you book.', { checked: checkedText(s.vehicle === 'public' ? 'coach' : 'hire') }),
    fxNote: fx.live ? (fx.updated ? t('US$ at 1 USD = PKR {rate} ({updated})', { rate: fx.pkrPerUsd.toFixed(2), updated: fx.updated }) : t('US$ at 1 USD = PKR {rate}', { rate: fx.pkrPerUsd.toFixed(2) })) : t('US$ at about PKR {rate} (live rate unavailable)', { rate: fx.pkrPerUsd }),
    wiki: { loading: !wikiE || wikiE.status === 'loading', info: wikiE && wikiE.status === 'ok' ? wikiE.data : null },
    stepLabel: `${s.step + 1} / 7`,
    stepBars: [0, 1, 2, 3, 4, 5, 6].map(i => ({ bg: i <= s.step ? 'var(--bar)' : 'var(--line2)', glow: i <= s.step ? 'var(--barGlow)' : 'none' })),
    ob: obTitles[s.step],
    cityCount: CITIES.length,
    listLabel: s.oq ? (geoOf(s.oq)?.status === 'loading' ? t('Matching places · searching all of Pakistan…') : t('Matching places')) : t('Popular cities'),
    cityRows: (() => {
      const q = oqT;
      let list = q ? CITIES.filter(c => c.n.toLowerCase().includes(q) || c.p.toLowerCase().includes(q)).sort((a, b) => (+b.n.toLowerCase().startsWith(q) - +a.n.toLowerCase().startsWith(q)) || a.n.localeCompare(b.n)).slice(0, 40) : POPULAR.map(n => CITY[n]);
      if (q) { const g = geoOf(q); if (g && g.status === 'ok') g.data.forEach(n => { if (CITY[n] && !list.includes(CITY[n])) list.push(CITY[n]); }); }
      if (s.origin && !q && !POPULAR.includes(s.origin) && CITY[s.origin]) list = [CITY[s.origin], ...list];
      return list.map(c => {
        const on = s.origin === c.n;
        return { key: c.n, name: c.n, prov: c.p, onClick: () => set({ origin: c.n, pickId: null, loc: s.loc === 'done' ? 'idle' : s.loc }),
          bg: on ? 'rgba(46,229,157,.12)' : 'transparent', border: on ? 'rgba(46,229,157,.45)' : 'transparent', pinC: on ? 'var(--g)' : 'var(--mute)', checkOp: on ? 1 : 0 };
      });
    })(),
    noCity: !!oqT && geoOf(oqT)?.status !== 'loading' && !((geoOf(oqT) as { data?: string[] } | undefined)?.data || []).length && !CITIES.some(c => c.n.toLowerCase().includes(oqT) || c.p.toLowerCase().includes(oqT)),
    locBtn: s.loc === 'done' && s.origin ? { title: `${s.origin}, ${cityOr(s.origin).p}`, sub: s.locNote, icon: 'ph-navigation-arrow', tile: 'linear-gradient(135deg,#2EE59D,#0FA678)', border: 'rgba(46,229,157,.45)' }
      : s.loc === 'locating' ? { title: t('Finding your location…'), sub: t('Waiting for GPS'), icon: 'ph-crosshair', tile: 'linear-gradient(135deg,#6FD3FF,#3B8DFF)', border: 'rgba(111,211,255,.45)' }
        : s.loc === 'denied' ? { title: t('Location is off'), sub: t('Tap to try again, or search below'), icon: 'ph-gps-slash', tile: 'linear-gradient(135deg,#FF8A6B,#FF4F7B)', border: 'rgba(255,107,91,.4)' }
          : s.loc === 'failed' ? { title: t('Couldn’t find your location'), sub: s.locNote || t('Tap to try again, or search below'), icon: 'ph-gps-slash', tile: 'linear-gradient(135deg,#FF8A6B,#FF4F7B)', border: 'rgba(255,107,91,.4)' }
            : { title: t('Use my current location'), sub: t('Finds your city automatically'), icon: 'ph-crosshair', tile: 'linear-gradient(135deg,#6FD3FF,#3B8DFF)', border: 'var(--line2)' },
    modeOpts: MODES.map((o, i) => {
      const on = s.mode === o.id, g = GRADS[i === 0 ? 2 : 3];
      return { ...o, label: t(o.label), sub: t(o.sub), onClick: () => set({ mode: o.id, pickId: null, ...(o.id === 'know' ? { corridor: s.dest } : {}) }),
        tile: `linear-gradient(135deg,${g[0]},${g[1]})`, glow: g[0],
        bg: on ? `linear-gradient(var(--fill),var(--fill)) padding-box, linear-gradient(135deg,${g[0]},${g[1]}) border-box` : 'linear-gradient(rgba(255,255,255,.05),rgba(255,255,255,.05)) padding-box, linear-gradient(rgba(255,255,255,.1),rgba(255,255,255,.1)) border-box',
        transform: on ? 'translateZ(22px) rotateX(5deg)' : 'translateZ(0)', shadow: on ? `0 22px 40px -18px ${g[0]}` : 'none',
        ringC: on ? g[0] : 'var(--line2)', dotBg: on ? g[0] : 'transparent', checkOp: on ? 1 : 0 };
    }),
    destListLabel: s.dq ? (geoOf(s.dq)?.status === 'loading' ? t('Matching places · searching all of Pakistan…') : t('Matching places')) : t('Popular destinations'),
    destRows, noDest: !!s.dq.trim() && !destRows.length && geoOf(s.dq)?.status !== 'loading',
    todayIso: isoAdd(0),
    dateRange: `${dayLabel(s.startDate, 0)} → ${dayLabel(s.startDate, s.days - 1)}`,
    monthChips: (() => {
      const now = new Date(), sd = new Date(s.startDate + 'T00:00');
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1), on = sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
        return { key: i, label: MON[d.getMonth()], sub: i === 0 || d.getMonth() === 0 ? String(d.getFullYear()) : '', onClick: () => set({ startDate: i === 0 ? isoAdd(3) : isoOf(new Date(d.getFullYear(), d.getMonth(), 15)), pickId: null }),
          bg: on ? 'linear-gradient(135deg,#FFB547,#FF7A3D)' : 'var(--fill)', fg: on ? '#2A1500' : 'var(--ink)', border: on ? 'transparent' : 'var(--line2)' };
      });
    })(),
    whenNotes: s.mode === 'know' ? seasonInfo(s, s.dest) : (() => {
      const inS = SUGGEST_POOL.filter(k => (DST(k).best || []).includes(M)).map(k => DST(k).name);
      return [{ icon: 'ph-sun', color: 'var(--g)', text: !inS.length ? t('Few destinations are in season in {month}.', { month: MONTH_FULL[M - 1] })
          : inS.length > 6 ? t('In season in {month}: {places} and more.', { month: MONTH_FULL[M - 1], places: inS.slice(0, 6).join(', ') })
          : t('In season in {month}: {places}.', { month: MONTH_FULL[M - 1], places: inS.join(', ') }) },
        ...(babusarClosed(M) ? [{ icon: 'ph-road-horizon', color: 'var(--cor)', text: t('Babusar Pass is closed in {month}. Northern routes go via Besham on the KKH.', { month: MONTH_FULL[M - 1] }) }] : []),
        (() => { const o = cityOr(s.origin), st = sunTimes(o.lat, o.lon, s.startDate); return { icon: 'ph-sun-horizon', color: 'var(--vio)', text: t('Sunrise {rise}, sunset {set} in {place} on {date}.', { rise: clock(st.rise), set: clock(st.set), place: o.n, date: dayLabel(s.startDate, 0) }) }; })()];
    })(),
    mapRouteLabel: (() => {
      const r = LIVE.route[routeKey(cityOr(s.origin).n, s.corridor)];
      return isAir ? t('Flight path') : r && r.status === 'ok' ? t('Road from OpenRouteService · {km} km', { km: fmtN(r.data.km) }) : r && r.status === 'loading' ? t('Loading road from OpenRouteService…') : t('Route from SafarCo road table');
    })(),
    wx: rw,
    liveRoadNotes: (() => {
      if (s.screen !== 'app' || isAir) return [];
      const o = cityOr(s.origin), r = LIVE.route[routeKey(o.n, s.corridor)];
      if (!r) return [];
      if (r.status === 'loading') return [{ icon: 'ph-globe-hemisphere-east', color: 'var(--mute)', text: t('Checking the road with OpenRouteService…') }];
      if (r.status === 'error') return [{ icon: 'ph-wifi-slash', color: 'var(--mute)', text: t('Live road check unavailable. Using SafarCo’s road table.') }];
      const lv = c.live;
      if (lv && !lv.ignored) return [{ icon: 'ph-check-circle', color: 'var(--g)', text: t('Distance checked with OpenRouteService: {km} km. Drive times use mountain and town speeds, so they are longer than map apps show.', { km: fmtN(r.data.km) }) }];
      return [{ icon: 'ph-warning', color: 'var(--cor)', text: t('OpenRouteService’s fastest road is {km} km; this plan is {planKm} km. It may use a road closed in {month}. Check before you leave.', { km: fmtN(r.data.km), planKm: c.kmStr, month: MON[M - 1] }) }];
    })(),
    seasonNotes: [...alertNotes, ...seasonInfo(s, s.corridor), ...jeepNote],
    dayHint: (() => {
      const o = s.origin || 'Islamabad', okS = { tile: 'linear-gradient(135deg,#2EE59D,#0FA678)', bg: 'rgba(46,229,157,.1)', border: 'rgba(46,229,157,.3)' }, badS = { tile: 'linear-gradient(135deg,#FF8A6B,#FF4F7B)', bg: 'rgba(255,107,91,.12)', border: 'rgba(255,107,91,.4)' };
      if (s.mode === 'know' && L) {
        const bad = s.days < L.minDays;
        return { text: t('{places}: {km} km round trip, about {h} h of driving.', { places: stopNames.join(' → '), km: fmtN(L.km), h: Math.round(L.hours) }) + ' ' + (bad ? t('You need at least {n} days.', { n: L.minDays }) : t('Plan: {n} driving days in all.', { n: L.legDays })), icon: bad ? 'ph-calendar-x' : 'ph-path', ...(bad ? badS : okS) };
      }
      if (s.mode === 'know') {
        const tr = trip(s.dest, o, M), bad = s.days < tr.minDays;
        return { text: t('{from} → {to}: {km} km by road, about {h} h each way.', { from: o, to: DST(s.dest).name, km: tr.kmStr, h: Math.round(tr.hours) }) + ' ' + (bad ? t('You need at least {n} days.', { n: tr.minDays }) : tr.legDays > 1 ? t('Plan: {n} driving days each way.', { n: tr.legDays }) : t('Plan: {n} driving day each way.', { n: tr.legDays })), icon: bad ? 'ph-calendar-x' : 'ph-path', ...(bad ? badS : okS) };
      }
      const pool = SUGGEST_POOL.filter(k => DST(k).name !== o), ok = pool.filter(k => s.days >= trip(k, o, M).minDays).length;
      return { text: t('{ok} of {total} popular destinations are reachable from {from} in {days} days, driving up to {max} h a day.', { ok, total: pool.length, from: o, days: s.days, max: MAX_DRIVE_H }), icon: 'ph-path', ...(ok ? okS : badS) };
    })(),
    nightsLabel: nights > 1 ? t('days · {n} nights', { n: nights }) : t('days · {n} night', { n: nights }),
    decDays: () => set({ days: Math.max(2, s.days - 1), daysSet: true }), incDays: () => set({ days: Math.min(14, s.days + 1), daysSet: true }),
    dayPresets: [3, 5, 7, 10].map(d => ({ key: d, label: t('{n} days', { n: d }), onClick: () => set({ days: d, daysSet: true }), ...chip(s.days === d) })),
    capBig: fmtN(s.cap), capUsd: `≈ ${usd(s.cap)}`, capPer: t('{amount} ({usd}) per person · {days} days', { amount: fmt(s.cap / s.groupSize), usd: usd(s.cap / s.groupSize), days: s.days }),
    tripMeta: s.groupSize > 1 ? t('{n} travellers · {days} days', { n: s.groupSize, days: s.days }) : t('{n} traveller · {days} days', { n: s.groupSize, days: s.days }),
    sliderPct: (s.cap - 20000) / 480000 * 100,
    capPresets: [50000, 100000, 200000, 350000].map(v => ({ key: v, label: `${v / 1000}k`, onClick: () => set({ cap: v, pickId: null }), ...chip(s.cap === v) })),
    // Guides imported from research and not yet checked by SafarCo say so.
    // Fewer hotel changes: shown when it would change this trip (or is on).
    comfort: s.vehicle !== 'air' && (s.extra || []).length && (s.comfort || JSON.stringify(sideTrips({ ...s, comfort: true })) !== JSON.stringify(sideTrips({ ...s, comfort: false }))) ? {
      on: s.comfort, toggle: () => set({ comfort: !s.comfort, dayOpen: null, toast: s.comfort ? t('Moving on to each place again.') : t('Fewer hotel changes: nearby places are day trips now.') }),
      sub: (() => { const st = sideTrips({ ...s, comfort: true }), bases = Object.keys(st).filter(b => st[b].length); return bases.length ? t('Stay in {base} and see {list} on day trips. More driving back and forth, fewer check-ins.', { base: bases.map(b => DST(b).name).join(', '), list: bases.flatMap(b => st[b]).map(k => DST(k).name).join(', ') }) : ''; })()
    } : null,
    draftGuide: [s.corridor, ...(s.extra || [])].some(k => DST(k).checked === false) ? [t('New guide from research, not checked by SafarCo yet. Check opening times and roads locally.'), ...[s.corridor, ...(s.extra || [])].map(k => DST(k).guideNote).filter((x): x is string => !!x).map(x => t(x))].join(' ') : '',
    stayOpts, capOn,
    capToggle: capOn ? { label: t('Remove the limit'), onClick: () => set({ capOn: false, pickId: null }) }
      : { label: t('I have a spending limit'), onClick: () => set({ capOn: true, pickId: null, cap: Math.max(40000, Math.ceil((stayOpts.find(o => o.on)?.low || total) * 1.1 / 5000) * 5000) }) },
    budgetHint: !capOn ? '' : s.mode === 'know'
      ? (sug.list.find(x => x.best) ? t('Best fit for {dest}: {name}, {amount}.', { dest: DST(s.dest).label, name: t(sug.list.find(x => x.best)!.name), amount: fmt(sug.list.find(x => x.best)!.total) }) : sug.list.length ? t('{dest} starts at {amount} for this group.', { dest: DST(s.dest).label, amount: fmt(sug.list[sug.list.length - 1].total) }) : '')
      : (fitCount ? t('{n} of {total} destinations fit this budget.', { n: fitCount, total: sug.list.length }) : t('Nothing fits yet. Raise the budget or shorten the trip.')),
    sugg: sug.list.map((g: Suggestion) => {
      const on = g.key === sug.sel?.key, fits = fitsS(g);
      return { key: g.key, title: s.mode === 'know' ? t(g.name) : DST(g.corridor).label, sub: s.mode === 'know' ? t('{vehicle} · {tier} stays', { vehicle: t(VEH[g.vehicle].short), tier: t(TIERS[g.tier].label) })
          : g.name === TIERS[g.tier].label ? t('{name} · {vehicle}', { name: t(g.name), vehicle: t(VEH[g.vehicle].short) })
          : t('{name} · {vehicle} · {tier} stays', { name: t(g.name), vehicle: t(VEH[g.vehicle].short), tier: t(TIERS[g.tier].label) }),
        icon: VEH[g.vehicle].icon, tile: TIER_G[g.tier], fit: roadFit(g.vehicle, g.corridor, s.origin, M)?.text || '', amount: fmt(g.total), amountUsd: usd(g.total), best: !!g.best,
        fitLabel: !g.ok ? (g.why ? t(g.why) : t('Tap: make it {n} days', { n: g.minDays })) : fits ? (capOn ? t('{amount} left', { amount: kShort(s.cap - g.total) }) : t('{amount} each', { amount: kShort(g.total / Math.max(1, s.groupSize)) })) : `+${kShort(g.total - s.cap)}`, fitFg: fits ? 'var(--g)' : 'var(--cor)', fitBg: fits ? 'rgba(46,229,157,.14)' : 'rgba(255,107,91,.16)',
        bg: on ? 'linear-gradient(var(--fill),var(--fill)) padding-box, linear-gradient(135deg,#2EE59D,#FFB547) border-box' : 'linear-gradient(rgba(255,255,255,.05),rgba(255,255,255,.05)) padding-box, linear-gradient(rgba(255,255,255,.1),rgba(255,255,255,.1)) border-box',
        transform: on ? 'translateZ(18px) rotateX(4deg)' : 'translateZ(0)', shadow: on ? '0 22px 40px -18px rgba(46,229,157,.7)' : 'none', op: fits || on ? 1 : .62,
        onClick: () => set({ pickId: g.key, corridor: g.corridor, ...(!g.ok && !g.why && g.minDays <= 14 ? { days: g.minDays, daysSet: true } : {}) }) };
    }),
    canBack: s.step > 0, nextOp: canNext ? 1 : .45,
    back: () => set({ step: s.step - 1 }),
    next: () => {
      if (!canNext) return;
      if (s.step < 6) set({ step: s.step + 1, pickId: null });
      else { const g = sug.sel; if (g) set({ screen: 'app', tab: 'trip', chosen: g.corridor, corridor: g.corridor, dest: g.corridor, vehicle: g.vehicle, tier: g.tier, building: Date.now(), dayOpen: null, ...(s.mode === 'know' ? {} : { extra: [] }) }); }
    },
    nextLabel: s.step < 6 ? t('Continue') : t('Build this trip'),
    restart: () => api.newTrip(),
    budgetShadow: ring('budget'),     capPct: Math.round(pct * 100), totalNum: fmtN(total), totalUsd: usd(total), perPersonStr: `${fmt(total / s.groupSize)} (${usd(total / s.groupSize)})`, capStr: fmt(s.cap), barPct: Math.min(pct, 1) * 100,
    plan: (() => {
      const p = plan, K: Record<string, [string, string]> = { drive: ['linear-gradient(135deg,#2EE59D,#0FA678)', t('Drive')], explore: ['linear-gradient(135deg,#9B7BFF,#5B6CFF)', t('Explore')], return: ['linear-gradient(135deg,#FFB547,#FF7A3D)', t('Return')], fly: ['linear-gradient(135deg,#6FD3FF,#3B8DFF)', t('Fly')] };
      const depChips = [null, 4.5, 5.5, 6.5, 7.5, 8.5].map(v => { const on = (s.depart ?? null) === v; return { key: String(v), label: v === null ? t('Auto · each day') : clock(v), onClick: () => set({ depart: v }), ...chip(on) }; });
      return { summary: t('{n} days · {m} nights', { n: p.total, m: p.total - 1 }), via: p.air ? t('Flights {from} ⇄ {to} · car and driver at the destination', { from: p.air.dep, to: p.air.arr }) : L ? t('{km} km round trip · {via}', { km: c.kmStr, via: c.via }) : t('{km} km each way by road · {via}', { km: c.kmStr, via: c.via }),
        hasDep: !p.air && p.hasDrive, depChips, wxDepart: rw.depart && s.depart !== rw.depart.dep ? { ...rw.depart, label: clock(rw.depart.dep), apply: () => set({ depart: rw.depart!.dep }) } : null, depNoteC: p.late ? 'var(--amb)' : 'var(--mute)',
        depNote: p.late ? t('Some driving days end after sunset (about {time}).', { time: clock(p.sunset) }) + ' ' + (p.dep > p.rec ? t('Leave by {time}.', { time: clock(p.rec) }) : t('Consider an extra night stop.'))
          : s.depart == null ? t('Each driving day has its own suggested time, so it ends before sunset. Open a day to change it.')
          : t('Every driving day ends before sunset (the earliest is about {sunset}).', { sunset: clock(p.sunset) }),
        days: p.days.map((d, i) => ({ ...d, flight: d.kind === 'fly' && p.air && d.iso ? (() => { const out = i === 0, from = out ? p.air!.dep : p.air!.arr, to = out ? p.air!.arr : p.air!.dep;
          return { from, to, fare: t('Tentative: about {fare} one way per adult', { fare: pkrUsd(p.air!.fare) }), href: flightSearchUrl(from, to, d.iso!, s.adults + s.elders, s.kids) }; })() : null, fuel: (() => { const f = fuel.get(i); if (!f || !(f.stops.length || f.notes.length || f.gaps.length || f.loading)) return null;
          return { ...f, stops: f.stops.map(x => ({ ...x, label: x.place || (x.name === 'Fuel station' ? t('Fuel station') : x.name), km: t('km {km}', { km: x.at }) })) }; })(), strip: rw.strips.get(i) || null, destWx: d.track ? null : rw.destDays.find(x => x.idx === i) || null, stay: d.stay && (() => {
          // Hotels for this night's town (live from OpenStreetMap), each linked to Booking.com for this exact night.
          const st = d.stay!, nr = nightRange(s.tier, sf), night = isoOff(s.startDate, i), live = spotsAt('hotels', st.lat, st.lon);
          const picks = live.list.length ? live.list.slice(0, 4).map(h => ({ name: h.name, note: h.km ? t('{type} · {km} km from centre', { type: t(h.type), km: Math.round(h.km * 10) / 10 }) : t(h.type) }))
            : st.curated ? [{ name: st.name, note: st.note }] : [];
          const mine = trustedAt(st.lat, st.lon).map(h => ({ name: h.name, key: 't:' + h.id, trusted: true, note: [(() => { let x = t(TIERS[h.tier].label); if (h.price) x = t('{tier} · PKR {price} a night', { tier: x, price: fmtN(h.price) }); if (h.checked) x = t('{text} (checked {date})', { text: x, date: shortDate(h.checked) }); return x; })(), h.note].filter(Boolean).join(' · '),
            checkUrl: check(`${h.name}, ${st.town}`, night, 1), mapUrl: mapsQ(`${h.name}, ${st.town}`), ...contact(h.phone),
            rating: ratingOf('hotel', h.id), id: h.id, review: rateOpen('hotel', h.id, h.name, night) }));
          const options = [...mine, ...picks.filter(h => !mine.some(m => m.name.toLowerCase() === h.name.toLowerCase())).slice(0, Math.max(2, 4 - mine.length))
            .map(h => ({ ...h, key: h.name, trusted: false, wa: '', tel: '', rating: null, review: null, checkUrl: check(`${h.name}, ${st.town}`, night, 1), mapUrl: mapsQ(`${h.name}, ${st.town}`) }))];
          return { ...st, range: t('{tier} · {range} ({usd}) a night', { tier: t(TIERS[s.tier].label), range: nr.text, usd: nr.usd }), href: check(st.town, night, 1), options, loading: live.loading && !picks.length, source: live.list.length ? 'OpenStreetMap, via Geoapify' : '' };
        })(), stops: edited[i].stops.map(x => ({ ...x, icon: STOP_KIND[x.kind][0], color: STOP_KIND[x.kind][1], remove: x.removable ? () => removeStop(i, x) : null })),
          places: edited[i].places, savedMin: edited[i].saved, suggest: suggestFor(d, i),
          // What to eat here: the guide's dishes, then places travellers suggested (approved by the admin).
          food: d.dest ? (() => { const F = DST(d.dest!); return { title: t('What to eat in {place}', { place: F.name }),
            items: (FOOD[d.dest!] || (F.eat ? [[F.eat, '', ''] as const] : [])).map(([dish, where, note]) => ({ key: dish, dish: t(dish), where: where ? t(where) : '', note: note ? t(note) : '' })),
            tips: foodTipsFor(d.dest!).map(x => ({ key: String(x.id), name: x.name, dish: x.dish, note: x.note, stars: x.rating || 0, author: x.author.split(' ')[0] || t('Traveller'), href: mapsQ(`${x.name}, ${F.town}`) })),
            suggest: () => set({ sheet: 'food', foodFor: { dest: d.dest!, name: F.name } }) }; })() : null,
          // When to leave this day: the suggested time, or the traveller's own, in 15-minute steps.
          departCtl: d.depart ? (() => { const dp = d.depart!, arrive = d.track ? d.track.dep + d.track.marks[d.track.marks.length - 1][1] : null;
            return { time: clock(dp.at), suggested: t('Suggested {time}', { time: clock(dp.rec) }), own: dp.own, earlier: () => setDepart(i, dp.at - 0.25), later: () => setDepart(i, dp.at + 0.25), reset: dp.own ? () => setDepart(i, null) : null,
              warn: arrive != null && d.track && arrive > d.track.sunset ? t('You arrive after sunset with this time. Leave by {time}.', { time: clock(dp.rec) }) : '' }; })() : null,
          // A night in a town on the road (+1 day), offered on long drives; or the one chosen, to drive through again.
          roadOffer: d.kind === 'explore' && !d.timing && d.dest ? (() => {
            // A free day: a day trip to a place nearby, back to the same hotel at night.
            const opts = dayTripOptions(d.dest!, M, [s.corridor, ...(s.extra || [])]);
            return opts.length ? { icon: 'ph-car-profile', text: t('Free day. Take a day trip, back here for the night:'), chips: opts.map(o => ({ label: t('{place} · {time}', { place: o.name, time: dur(o.hours) }),
              apply: () => set({ extra: [...(s.extra || []), o.id].slice(-3), dayTrips: [...s.dayTrips, o.id], dayOpen: null, toast: t('A day trip to {place} is in the plan.', { place: o.name }) }) })) } : null;
          })() : d.side && !d.side.sleeping && s.dayTrips.includes(d.side.id) ? { icon: 'ph-car-profile', text: t('Day trip you added.'), chips: [{ label: t('Remove day trip'),
            apply: () => set({ extra: (s.extra || []).filter(k => k !== d.side!.id), dayTrips: s.dayTrips.filter(k => k !== d.side!.id), dayOpen: null, toast: t('Day trip removed. That day is free again.') }) }] }
          : d.roadNight ? (() => {
            const rn = d.roadNight!, key = (n: string) => `${rn.dir}:${n}`;
            if (rn.chosen) return { text: t('Night in {place}, your stop on the road.', { place: d.stay?.town || rn.chosen }), chips: [{ label: t('Drive through (−1 day)'), apply: () => set({ breaks: s.breaks.filter(b => b !== key(rn.chosen!)), days: Math.max(2, s.days - 1), dayOpen: null, toast: t('No night on the road here.') }) }] };
            if (!rn.options.length) return null;
            return { text: t('Long drive? Break it with a night in (+1 day):'), chips: rn.options.map(o => ({ label: o.town, apply: () => set({ breaks: [...s.breaks, key(o.node)], days: Math.min(14, s.days + 1), dayOpen: null, toast: t('A night in {place} is in the plan.', { place: o.town }) }) })) };
          })() : null,
          // A night at a nearby place instead of its long day trip (+1 day), or back to the day trip.
          stayOffer: d.side ? (d.side.sleeping
            ? { text: t('Night in {place}.', { place: DST(d.side.id).name }), cta: t('Make it a day trip from {place}', { place: DST(d.side.base).name }), apply: () => set({ sleepAt: s.sleepAt.filter(k => k !== d.side!.id), dayOpen: null, toast: t('{place} is a day trip from {base} again.', { place: DST(d.side!.id).name, base: DST(d.side!.base).name }) }) }
            : { text: t('A day trip from {base}, back for the night. Or stay in {place}.', { base: DST(d.side.base).name, place: DST(d.side.id).name }), cta: t('Stay a night in {place}', { place: DST(d.side.id).name }), apply: () => set({ sleepAt: [...s.sleepAt, d.side!.id], dayOpen: null, toast: t('A night in {place} is in the plan.', { place: DST(d.side!.id).name }) }) })
          : d.offer && !s.overnight ? { text: t('Stay a night in {place} and see more', { place: DST(d.offer).name }), cta: t('Add a night (+1 day)'), apply: () => set({ overnight: d.offer!, days: Math.min(14, s.days + 1), dayOpen: null, toast: t('A night in {place} is in the plan.', { place: DST(d.offer!).name }) }) }
            : s.overnight && d.stay && DST(s.overnight).town === d.stay.town ? { text: t('Night in {place}.', { place: DST(s.overnight).name }), cta: t('Make it a day trip (−1 day)'), apply: () => set({ overnight: null, days: Math.max(2, s.days - 1), dayOpen: null }) } : null,
          ...(d.kind === 'explore' ? { note: d.tip || '', meta: edited[i].places > 1 ? t('{n} places · local car or jeep', { n: edited[i].places }) : edited[i].places ? t('{n} place · local car or jeep', { n: 1 }) : t('Nothing scheduled') } : {}),
          busy: edited[i].warn ? edited[i].warn : d.kind === 'explore' && edited[i].places > 4 ? t('Busy day: {n} places. Consider moving one to another day.', { n: edited[i].places }) : '',
          tile: K[d.kind][0], kindLabel: K[d.kind][1], lineOp: i === p.days.length - 1 ? 0 : 1 })) };
    })(),
    rows: rows.map(r => ({ ...r, label: t(r.label), amount: fmtN(r.val), amountUsd: usd(r.val), color: CAT[r.label] || 'var(--sky)', grad: `linear-gradient(135deg,${CAT[r.label] || 'var(--sky)'},${CAT2[r.label] || '#3B8DFF'})` })),
    vehChips: (Object.entries(VEH) as [VehicleId, typeof VEH[VehicleId]][]).map(([k, v]) => {
      const on = s.vehicle === k, off = k === 'air' && !air;
      return { key: k, icon: v.icon, label: t(v.short), full: t(v.label), onClick: () => { if (!off) set({ vehicle: k }); }, op: off ? .35 : 1,
        bg: on ? 'linear-gradient(135deg,#FFB547,#FF7A3D)' : 'var(--fill)', fg: on ? '#2A1500' : 'var(--ink2)', border: on ? 'transparent' : 'var(--line2)', shadow: on ? '0 12px 24px -10px rgba(255,150,60,.8)' : 'none' };
    }),
    people: ([['adults', t('Adults'), t('13–59 years'), 'ph-user', 'var(--g)'], ['kids', t('Kids'), t('Under 12 · lower fares and meals'), 'ph-baby', 'var(--amb)'], ['elders', t('Elders'), t('60+ · altitude care on high passes'), 'ph-person-simple-walk', 'var(--cor)']] as const)
      .map(([k, label, sub, icon, color]) => ({ key: k, label, sub, icon, color, value: `${s[k]}`, dec: () => api.setPeople(k, -1), inc: () => api.setPeople(k, 1) })),
    // How many rooms: the suggested number, or the traveller's own.
    roomCtl: (() => { const rp = roomPlan(s), own = s.roomCount != null && s.roomCount !== rp.auto;
      return { n: rp.r, own, crowded: rp.crowded, suggested: t('Suggested {n}', { n: rp.auto }), dec: () => set({ roomCount: Math.max(1, rp.r - 1) === rp.auto ? null : Math.max(1, rp.r - 1), pickId: null }), inc: () => set({ roomCount: Math.min(20, rp.r + 1) === rp.auto ? null : Math.min(20, rp.r + 1), pickId: null }),
        reset: own ? () => set({ roomCount: null, pickId: null }) : null,
        note: rp.crowded ? t('Crowded: {people} people in {rooms}. Extra beds are added, but think about another room.', { people: rp.people, rooms: rp.r > 1 ? t('{n} rooms', { n: rp.r }) : t('{n} room', { n: rp.r }) }) : rp.extra ? (rp.extra > 1 ? t('{n} extra beds added.', { n: rp.extra }) : t('{n} extra bed added.', { n: rp.extra })) : '' }; })(),
    roomOpts: ([['separate', t('Separate rooms'), t('Doubles · kids share')], ['shared', t('Family rooms'), t('Up to 4 · 1.5× rate')]] as const).map(([k, label, sub]) => {
      const on = s.rooms === k; return { key: k, label, sub, onClick: () => set({ rooms: k, roomCount: null, pickId: null }), bg: on ? 'var(--cta)' : 'var(--fill)', fg: on ? 'var(--onCta)' : 'var(--ink)', border: on ? 'transparent' : 'var(--line2)' };
    }),
    hasFamilyNote: s.vehicle === 'bike' && !!(s.kids || s.elders),
    familyNote: t('A motorbike isn’t advised with kids or elders.'),
    rates: [
      ...(s.vehicle === 'rentcar' ? [['ph-steering-wheel', t('Rent a car + driver'), t('Corolla / City · 4 seats · + PKR 2,000 driver · fuel extra'), t('PKR 12,000/day')]] : []),
      ...(s.vehicle === 'rent4x4' ? [['ph-jeep', t('Rent a 4x4 + driver'), t('Prado / Land Cruiser · 6 seats · + PKR 2,500 driver · fuel extra'), t('PKR 35,000/day')]] : []),
      ...(s.vehicle === 'coaster' ? [['ph-van', t('Rent a coaster + driver'), t('22 seats · + PKR 3,000 driver · diesel extra'), t('PKR 35,000/day')]] : []),
      ...(s.vehicle === 'public' ? [['ph-bus', t('Coach {from} → {to}', { from: c.from, to: c.to }), t('One way per adult · kids half fare'), fmt(coachFare(c))]] : []),
      ...(isAir ? [['ph-airplane-tilt', t('Flight {from} → {to}', { from: air!.dep, to: air!.arr }), t('Tentative · one way per adult · kids 75% · weather-dependent'), fmt(air!.fare)], ['ph-steering-wheel', t('Car + driver at destination'), t('Fuel included'), t('PKR 15,000/day')]] : []),
      ...(hasHub && s.vehicle !== 'suv' && s.vehicle !== 'rent4x4' ? [['ph-jeep', t('Jeep Raikot Bridge ⇄ Tato'), t('Return, per jeep, 5 seats'), 'PKR 8–10k']] : [])
    ].map(([icon, label, sub, amount]) => ({ icon, label, sub, amount })),
    hasJeeps: (c.jeeps || []).length > 0,
    jeeps: (() => {
      const sched = scheduledPlaces(c, M, freeDays(s, c));
      return (c.jeeps || []).map(([id, label, sub, rate, months]) => {
        const closed = !!months && !months.includes(M), inPlan = !closed && sched.some(p => jeepMatch([id, label], p)), k = jeepsFor(P);
        return { key: id, label: t(label), sub: k > 1 ? t('{sub} · {rate} per jeep × {k}', { sub: t(sub), rate: fmt(rate), k }) : t('{sub} · {rate} per jeep', { sub: t(sub), rate: fmt(rate) }), cta: closed ? t('Closed in {month}', { month: MON[M - 1] }) : inPlan ? t('In your plan') : t('Needs an extra day'),
          bg: inPlan ? 'var(--cta)' : 'var(--fill)', fg: inPlan ? 'var(--onCta)' : 'var(--mute)', border: inPlan ? '0' : '1px solid var(--line2)' };
      });
    })(),
    // The way there in Google Maps, through each night's town (up to nine stops), for turn-by-turn directions.
    routeLink: (() => {
      if (isAir) return '';
      const nights = plan.days.filter(d => (d.kind === 'drive' || d.kind === 'explore') && d.stay).map(d => `${d.stay!.lat.toFixed(4)},${d.stay!.lon.toFixed(4)}`).filter((x, i, a) => a.indexOf(x) === i);
      if (!nights.length) return '';
      const dest = nights[nights.length - 1], via = nights.slice(0, -1).slice(0, 9);
      return `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${encodeURIComponent(c.from + ', Pakistan')}&destination=${dest}${via.length ? `&waypoints=${encodeURIComponent(via.join('|'))}` : ''}`;
    })(),
    routeMap: (() => {
      const legs = c.legs, o = cityOr(s.origin), D = DST(s.corridor);
      const co = (n: string): [number, number] => { const q = pointAt(n); return [q.lat, q.lon]; };
      const pts = isAir ? [[o.lat, o.lon], [D.lat, D.lon]] : [co(legs[0].a), ...legs.map(l => co(l.b))];
      const la0 = Math.min(...pts.map(p => p[0])), la1 = Math.max(...pts.map(p => p[0])), lo0 = Math.min(...pts.map(p => p[1])), lo1 = Math.max(...pts.map(p => p[1]));
      const kx = 0.86, aspect = 1 / 0.88; let w = Math.max(.6, (lo1 - lo0) * kx), h = Math.max(.6, la1 - la0);
      if (w / h > aspect) h = w / aspect; else w = h * aspect; w *= 1.4; h *= 1.4;
      const cx = (lo0 + lo1) / 2 * kx, cy = (la0 + la1) / 2, X = (lo: number) => ((lo * kx - (cx - w / 2)) / w) * 100, Y = (la: number) => (((cy + h / 2) - la) / h) * 100;
      const seg = (a: [number, number], b: [number, number]) => `M${X(a[1]).toFixed(2)} ${Y(a[0]).toFixed(2)}L${X(b[1]).toFixed(2)} ${Y(b[0]).toFixed(2)}`;
      const net = EDGES.map(e => seg(NODES[e[0]], NODES[e[1]])).join('');
      const route = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[1]).toFixed(2)} ${Y(p[0]).toFixed(2)}`).join('');
      const summer = isAir || L ? null : trip(s.corridor, s.origin, 7);
      const closed = summer ? summer.legs.filter(l => l.months && !l.months.includes(M)).map(l => seg(co(l.a), co(l.b))).join('') : '';
      const nightNodes = isAir ? [] : (c.cuts || []).map(i => legs[i].b);
      const dots = [{ p: [o.lat, o.lon] as [number, number], label: o.n, color: 'var(--g)', ring: 'rgba(46,229,157,.25)' },
        ...nightNodes.map((n, i) => ({ p: co(n), label: t('Night {n} · {place}', { n: i + 1, place: NODE_INFO[n][0] }), color: 'var(--amb)', ring: 'rgba(255,181,71,.25)' })),
        ...(L ? L.order : [s.corridor]).map(k => ({ p: [DST(k).lat, DST(k).lon] as [number, number], label: DST(k).town, color: '#FF5A72', ring: 'rgba(255,90,114,.25)' }))]
        .map((d, i) => ({ ...d, x: X(d.p[1]).toFixed(2), y: Y(d.p[0]).toFixed(2), lift: i % 2 ? '-26px' : '-6px' }));
      const groups: { name: string; hotel: string; from: number; to: number }[] = [];
      plan.days.forEach(d => { if (!d.stay) return; const g = groups[groups.length - 1]; if (g && g.name === d.stay.place) g.to = d.num!; else groups.push({ name: d.stay.place, hotel: d.stay.name, from: d.num!, to: d.num! }); });
      const roads: Record<string, { km: number; months?: number[] }> = {}; if (!isAir) legs.forEach(l => { const r = roads[l.road] || (roads[l.road] = { km: 0, months: l.months }); r.km += l.km; });
      const wxDots = rw.mapPts.map((m, i) => ({ key: `${i}`, x: X(m.lon).toFixed(2), y: Y(m.lat).toFixed(2), color: m.color, text: m.text }));
      const fuelDots = fuelPins.map(f => ({ key: f.key, x: X(f.lon).toFixed(2), y: Y(f.lat).toFixed(2), text: f.text }));
      return { net, route, closed, dots, isAir, wxDots, fuelDots, loop: !!L, line: pts as [number, number][],
        stat: L ? t('{km} km round trip · {time} driving · {n} driving days', { km: c.kmStr, time: dur(c.hours), n: c.legDays }) : isAir ? t('{from} ⇄ {to} by air · car and driver there', { from: air!.dep, to: air!.arr })
          : c.legDays > 1 ? t('{km} km · {time} driving each way · {n} driving days each way', { km: c.kmStr, time: dur(c.hours), n: c.legDays })
          : t('{km} km · {time} driving each way · {n} driving day each way', { km: c.kmStr, time: dur(c.hours), n: c.legDays }),
        nights: groups.map(g => ({ key: `${g.from}`, badge: g.from === g.to ? t('Night {n}', { n: g.from }) : t('Nights {from}–{to}', { from: g.from, to: g.to }), name: g.name, hotel: g.hotel })),
        roads: Object.entries(roads).map(([name, r]) => ({ name, km: t('{km} km', { km: fmtN(Math.round(r.km / 5) * 5 || Math.round(r.km)) }), note: r.months ? (r.months.includes(M) ? t('Open in {month}', { month: MON[M - 1] }) : t('Closed in {month}', { month: MON[M - 1] })) : '', noteC: r.months && !r.months.includes(M) ? 'var(--cor)' : 'var(--g)', hasNote: !!r.months })) };
    })(),
    tierChips: (Object.entries(TIERS) as [AppState['tier'], typeof TIERS['standard']][]).map(([k, ti]) => { const on = s.tier === k; return { key: k, label: t(ti.label), onClick: () => set({ tier: k }), bg: on ? 'var(--line2)' : 'transparent', fg: on ? 'var(--ink)' : 'var(--mute)' }; }),
    langChips: LANGS.map(l => { const on = s.lang === l.id; return { key: l.id, label: l.label, on, onClick: () => { setLang(l.id); resetTripCache(); set({ lang: l.id }); }, bg: on ? 'var(--line2)' : 'transparent', fg: on ? 'var(--ink)' : 'var(--mute)' }; }),
    switchLang: () => { const next = s.lang === 'ur' ? 'en' : 'ur'; setLang(next); resetTripCache(); set({ lang: next }); },
    themeChips: THEMES.map(th => { const on = s.theme === th.id; return { key: th.id, label: t(th.label), onClick: () => set({ theme: th.id }), bg: on ? 'var(--line2)' : 'transparent', fg: on ? 'var(--ink)' : 'var(--mute)' }; }),
    steppers: [
      { key: 'a', label: t('Adults'), value: `${s.adults}`, dec: () => api.setPeople('adults', -1), inc: () => api.setPeople('adults', 1) },
      { key: 'k', label: t('Kids (under 12)'), value: `${s.kids}`, dec: () => api.setPeople('kids', -1), inc: () => api.setPeople('kids', 1) },
      { key: 'e', label: t('Elders (60+)'), value: `${s.elders}`, dec: () => api.setPeople('elders', -1), inc: () => api.setPeople('elders', 1) },
      { key: 'd', label: t('Days'), value: `${s.days}`, dec: () => set({ days: Math.max(2, s.days - 1), daysSet: true }), inc: () => set({ days: Math.min(14, s.days + 1), daysSet: true }) },
      { key: 'b', label: t('Budget cap'), value: capOn ? `${Math.round(s.cap / 1000)}k` : t('None'), dec: () => capOn && set(s.cap <= 40000 ? { capOn: false } : { cap: Math.max(40000, s.cap - 10000) }), inc: () => set(capOn ? { cap: s.cap + 10000 } : { capOn: true, cap: Math.max(40000, Math.ceil(total / 5000) * 5000) }) }
    ],
    helplines: [['1122', t('Rescue')], ['15', t('Police')], ['130', t('Motorway Police')], ['115', t('Edhi Ambulance')]].map(([num, label]) => ({ num, label, href: `tel:${num}` })),
    hotels: stays.list.map(h => ({ ...h, tierC: tierC[h.tier] || 'var(--sky)', grad: tierG[h.tier] || 'linear-gradient(135deg,#6FD3FF,#3B8DFF)' })),
    tabs: ([['trip', 'ph-path', t('Plan')], ['map', 'ph-map-trifold', t('Map')], ['budget', 'ph-wallet', t('Budget')], ['prepare', 'ph-backpack', t('Prepare')]] as const).map(([k, icon, label]) => {
      const on = s.tab === k; return { key: k, icon, label, bg: on ? 'linear-gradient(135deg,rgba(46,229,157,.22),rgba(25,194,184,.12))' : 'transparent', fg: on ? 'var(--g)' : 'var(--mute)', onClick: () => set({ tab: k }) };
    }),
    pillA: isAir ? t('{from} ⇄ {to} by air', { from: air!.dep, to: air!.arr }) : t('{km} km by road', { km: c.kmStr }),
    pillB: isAir ? (air!.pp ? t('~1 h flight + coach to airport') : t('~1 h flight')) : c.hrs,
    pillIcon: isAir ? 'ph-airplane-tilt' : 'ph-path',
    tripSummary: [dayLabel(s.startDate, 0), s.adults > 1 ? t('{n} adults', { n: s.adults }) : t('{n} adult', { n: s.adults }), !s.kids ? '' : s.kids > 1 ? t('{n} kids', { n: s.kids }) : t('{n} kid', { n: s.kids }),
      !s.elders ? '' : s.elders > 1 ? t('{n} elders', { n: s.elders }) : t('{n} elder', { n: s.elders }), t(VEH[s.vehicle].short), t(TIERS[s.tier].label), t('{n} days', { n: s.days })].filter(Boolean).join(' · '),
    // Who and how, for the plan header (the trip card shows the dates and days).
    tripWho: [s.adults > 1 ? t('{n} adults', { n: s.adults }) : t('{n} adult', { n: s.adults }), !s.kids ? '' : s.kids > 1 ? t('{n} kids', { n: s.kids }) : t('{n} kid', { n: s.kids }), !s.elders ? '' : s.elders > 1 ? t('{n} elders', { n: s.elders }) : t('{n} elder', { n: s.elders }), t(VEH[s.vehicle].short), t(TIERS[s.tier].label)].filter(Boolean).join(' · ')
  };
  // Before, during and after the trip (see src/view-trip.ts).
  const pack = (() => { try { return (JSON.parse(localStorage.getItem('safarco-pack:' + s.corridor + '|' + s.startDate) || '[]') as string[]).filter(k => rw.pack.some(p => p.key === k)).length; } catch { return 0; } })();
  const tripRun = tripMode({ s, set, days: view.plan.days, edits, road: roadLine, points: rPoints, dest: { lat: D.lat, lon: D.lon, town: D.town, name: D.name },
    planned: budget.segs.map(x => ({ key: x.key, val: x.val })), total, km: c.km, isAir, mtn: c.mtnKm > 0, packDone: pack, packTotal: rw.pack.length, toggleOffline: api.toggleOffline });
  return { ...view, trip: tripRun };
}
export type View = ReturnType<typeof buildView>;
