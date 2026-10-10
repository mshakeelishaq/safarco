// Everything the screens display, derived from app state. Ported from the
// design's renderVals(); the screens in components/ read from this.
import { CONFIGS, EDGES, MODES, MON, MONTH_FULL, NODES, NODE_INFO, POPULAR, POP_DEST, SUGGEST_POOL, SUNRISE, SUNSET, TIERS, TIER_G, VEH, CAT, CAT2, GRADS, DESTS, STOP_KIND, type VehicleId } from './engine/data';
import { MAX_DRIVE_H, airFor, babusarClosed, buildPlan, coachFare, costFor, freeDays, jeepMatch, jeepsFor, scheduledPlaces, seasonInfo, suggestions, trip, type Suggestion } from './engine/engine';
import { clock, dayLabel, dur, fmt, fmtN, isoAdd, isoOf, kShort, mon } from './engine/format';
import { LIVE, WMO, routeKey, wxPlan } from './engine/live';
import { CITIES, CITY, CITY_DUP, DST, cityOr } from './engine/places';
import type { AppState, Patch } from './state';
import { THEMES } from './state';
import { tilesAlong } from './offline';

export interface Api {
  set: (p: Patch) => void;
  later: (ms: number, fn: () => void) => void;
  locate: () => void;
  setPeople: (k: 'adults' | 'kids' | 'elders', d: number) => void;
  toggleOffline: () => void;
  ask: (text: string) => void;
}

export const COPILOT_PROMPTS = ['Switch to Fairy Meadows, we\'re in a Corolla', 'We\'re 5 friends now, keep it backpacker', 'Make it December, leave at 6 am', 'Take my parents too, family rooms', 'Is Babusar Pass open on my dates?'];

export function buildView(s: AppState, api: Api) {
  const { set } = api;
  const M = mon(s), c = trip(s.corridor, s.origin, M), nights = Math.max(1, s.days - 1), sug = suggestions(s);
  const cc = costFor(s), { rows, total } = cc, pct = total / s.cap, air = airFor(s.corridor, s.origin), P = s.groupSize;
  const health = pct < 0.85 ? { label: 'Healthy', bg: 'rgba(46,229,157,.14)', fg: 'var(--g)' } : pct <= 1 ? { label: 'Near cap', bg: 'rgba(255,181,71,.16)', fg: 'var(--amb)' } : { label: 'Over cap', bg: 'rgba(255,107,91,.16)', fg: 'var(--cor)' };
  const hasHub = c.hub !== undefined;
  const isAir = s.vehicle === 'air' && !!air;

  let gate: { show: boolean; icon?: string; bg?: string; border?: string; tile?: string; title?: string; msg?: string } = { show: false };
  if (hasHub && s.vehicle !== 'suv') gate = { show: true, icon: 'ph-warning-octagon', bg: 'linear-gradient(135deg,rgba(255,107,91,.24),rgba(255,79,123,.08))', border: 'rgba(255,107,91,.45)', tile: 'linear-gradient(135deg,#FF8A6B,#FF4F7B)',
    title: s.vehicle === 'sedan' ? 'Sedan Undercarriage Risk: Final track requires 4x4.' : 'Final track requires 4x4.', msg: 'Park at Raikot Bridge. Local jeep for the last 12 km: PKR 8,000 – 10,000.' };
  else if (hasHub) gate = { show: true, icon: 'ph-check-circle', bg: 'linear-gradient(135deg,rgba(46,229,157,.2),rgba(25,194,184,.06))', border: 'rgba(46,229,157,.4)', tile: 'linear-gradient(135deg,#2EE59D,#0FA678)', title: '4x4 cleared for the Raikot–Tato track', msg: 'Expect about 1.5 h at walking pace. Low range recommended.' };

  const ring = (k: string) => s.flash === k ? '0 0 0 2px #2EE59D, 0 0 40px -6px rgba(46,229,157,.7)' : '0 30px 60px -30px rgba(0,0,0,.6)';
  const ringConic = (p: number, a: string, b: string) => `conic-gradient(${a} 0%, ${b} ${p}%, rgba(255,255,255,.08) ${p}% 100%)`;
  const mb = (n: number) => n >= 10 ? Math.round(n) : n.toFixed(1);
  // Rough download size: vector + terrain tile per square along the route, ~35 kB each.
  const liveRoute = LIVE.route[routeKey(cityOr(s.origin).n, s.corridor)];
  const routeCoords: [number, number][] = liveRoute && liveRoute.status === 'ok' ? liveRoute.data.coords
    : [cityOr(s.origin), ...c.legs.map(l => l.b === 'DEST' ? DST(s.corridor) : l.b === 'HOME' ? cityOr(s.origin) : { lat: NODES[l.b][0], lon: NODES[l.b][1] })].map(p => [p.lon, p.lat] as [number, number]);
  const estMB = Math.max(5, Math.round(tilesAlong(routeCoords).length * 2 * 0.035));
  const off = s.offline === 'ready'
    ? { ring: ringConic(100, 'var(--g)', '#19C2B8'), glow: 'rgba(46,229,157,.6)', icon: 'ph-shield-check', iconC: 'var(--g)', pct: 'Ready', title: 'Survival Mode on', sub: `${c.region} route map · ${mb(s.offlineMB)} MB saved on this phone`, btnBg: 'var(--fill)', btnFg: 'var(--ink)', btnBorder: '1px solid var(--line2)', btnShadow: 'none', btnIcon: 'ph-trash', btnLabel: 'Clear cache' }
    : s.offline === 'downloading'
      ? { ring: ringConic(s.progress, 'var(--sky)', 'var(--vio)'), glow: 'rgba(155,123,255,.55)', icon: 'ph-cloud-arrow-down', iconC: 'var(--sky)', pct: s.progress + '%', title: 'Caching for offline…', sub: `${mb(s.offlineMB)} MB so far · route map, terrain, trip and weather`, btnBg: 'var(--fill)', btnFg: 'var(--mute)', btnBorder: '1px solid var(--line)', btnShadow: 'none', btnIcon: 'ph-hourglass', btnLabel: 'Downloading' }
      : { ring: ringConic(0, 'var(--sky)', 'var(--vio)'), glow: 'rgba(111,211,255,.15)', icon: 'ph-wifi-slash', iconC: 'var(--amb)', pct: `~${estMB} MB`, title: 'No signal past Chilas?', sub: s.offlineErr || `Save the ${c.region} route map, terrain and your trip for the dead zones.`, btnBg: 'var(--cta)', btnFg: 'var(--onCta)', btnBorder: '0', btnShadow: '0 18px 36px -14px rgba(46,229,157,.75)', btnIcon: 'ph-download-simple', btnLabel: 'Download for offline' };

  const tierC: Record<string, string> = { Premium: 'var(--vio)', Standard: 'var(--g)', Backpacker: 'var(--amb)', Search: 'var(--sky)' };
  const tierG: Record<string, string> = { Premium: 'linear-gradient(135deg,#9B7BFF,#5B6CFF)', Standard: 'linear-gradient(135deg,#2EE59D,#0FA678)', Backpacker: 'linear-gradient(135deg,#FFB547,#FF7A3D)', Search: 'linear-gradient(135deg,#6FD3FF,#3B8DFF)' };
  const fitsS = (x: { ok: boolean; total: number }) => x.ok !== false && x.total <= s.cap;
  const opts = CONFIGS.map(cf => { const r = costFor({ ...s, vehicle: cf.vehicle, tier: cf.tier }); return { ...cf, total: r.total, ok: r.ok, why: r.why }; }).filter(o => !o.why && o.ok).sort((a, b) => a.total - b.total);
  const applyCfg = (o: { vehicle: VehicleId; tier: AppState['tier'] }) => () => { set({ vehicle: o.vehicle, tier: o.tier, flash: 'budget' }); api.later(2200, () => set({ flash: null })); };
  const warn = { bg: 'linear-gradient(135deg,rgba(255,181,71,.22),rgba(255,122,61,.06))', border: 'rgba(255,181,71,.45)', tile: 'linear-gradient(135deg,#FFB547,#FF7A3D)', icon: 'ph-trend-down' };
  const good = { bg: 'linear-gradient(135deg,rgba(155,123,255,.22),rgba(111,211,255,.06))', border: 'rgba(155,123,255,.45)', tile: 'linear-gradient(135deg,#9B7BFF,#6FD3FF)', icon: 'ph-arrow-fat-lines-up' };
  type Tip = { show: boolean; bg?: string; border?: string; tile?: string; icon?: string; title?: string; msg?: string; cta?: string; apply?: () => void };
  let tip: Tip = { show: false };
  if (cc.why === 'No airport') tip = { show: true, ...warn, icon: 'ph-airplane-tilt', title: 'No flights to ' + c.name, msg: c.name + ' has no airport with scheduled flights. Drive, or hire a car with a driver.', cta: 'Hire car', apply: () => set({ vehicle: 'rentcar' }) };
  else if (!cc.ok && s.vehicle === 'air') tip = { show: true, ...warn, icon: 'ph-calendar-x', title: `${s.days} days is too short to fly in`, msg: 'Northern flights are often delayed by weather. Plan at least 3 days.', cta: 'Set 3 days', apply: () => set({ days: 3 }) };
  else if (!cc.ok) tip = { show: true, ...warn, icon: 'ph-calendar-x', title: `${s.days} days isn’t enough for this route`, msg: `${c.kmStr} km by road, about ${Math.round(c.hours)} h each way. That’s ${c.legDays} driving day${c.legDays > 1 ? 's' : ''} each way at ${MAX_DRIVE_H} h a day, plus 1 day there.`, cta: `Set ${c.minDays} days`, apply: () => set({ days: c.minDays }) };
  else if (total > s.cap) {
    const fit = opts.filter(fitsS);
    if (fit.length) { const o = fit[fit.length - 1]; tip = { show: true, ...warn, title: `${fmt(total - s.cap)} over your cap`, msg: `${o.name} (${VEH[o.vehicle].short}, ${TIERS[o.tier].label.toLowerCase()} stays) comes to ${fmt(o.total)}.`, cta: 'Switch', apply: applyCfg(o) }; }
    else {
      const minD = cc.minDays || 2, cheapest = Math.min(total, ...CONFIGS.map(cf => costFor({ ...s, vehicle: cf.vehicle, tier: cf.tier })).filter(r => r.ok && !r.why).map(r => r.total)), need = Math.ceil(cheapest / 5000) * 5000;
      tip = s.days - 1 >= minD
        ? { show: true, ...warn, title: `${fmt(total - s.cap)} over your cap`, msg: 'Even the cheapest option is over. Drop a day or raise the cap.', cta: '−1 day', apply: () => set({ days: s.days - 1 }) }
        : { show: true, ...warn, title: `${fmt(total - s.cap)} over your cap`, msg: `This route needs at least ${minD} days, so cutting days won’t work. The cheapest option comes to ${fmt(cheapest)}.`, cta: `Cap ${kShort(need)}`, apply: () => set({ cap: need }) };
    }
  } else {
    const up = opts.filter(o => fitsS(o) && o.total > total + 1000);
    if (up.length && s.cap - total > s.cap * .15) { const o = up[up.length - 1]; tip = { show: true, ...good, title: `${fmt(s.cap - total)} to spare`, msg: `Upgrade to ${o.name} (${VEH[o.vehicle].short}, ${TIERS[o.tier].label.toLowerCase()} stays) for ${fmt(o.total)}.`, cta: 'Upgrade', apply: applyCfg(o) }; }
  }

  const canNext = s.step === 0 ? !!s.origin : s.step === 1 ? !!s.mode : true;
  const chip = (on: boolean) => ({ bg: on ? 'var(--cta)' : 'var(--fill)', fg: on ? 'var(--onCta)' : 'var(--ink2)', border: on ? 'transparent' : 'var(--line2)' });
  const fitCount = s.mode === 'know' ? 0 : sug.list.filter(fitsS).length;
  const obTitles = [
    { title: 'Which city do you live in?', sub: 'Your trip starts here. Distance, fuel, tolls and travel time are calculated from it.' },
    { title: 'Where do you want to go?', sub: `From ${s.origin || 'Islamabad'}. Search any city or tourist spot, or let SafarCo suggest one.` },
    { title: 'When are you going?', sub: 'Tentative dates are fine. Roads, season and prices change with the month.' },
    { title: 'Who’s travelling?', sub: 'Fares, meals and rooms are worked out for each person.' },
    { title: 'What’s your budget?', sub: 'Total for the whole group: transport, stays and food.' },
    s.mode === 'know' ? { title: `Your ${DST(s.dest).name} options`, sub: 'Move the budget and the options re-rank instantly.' } : { title: 'Trips that fit your budget', sub: 'Ranked for your dates, days and budget.' }];

  const geoOf = (q: string) => LIVE.geo[q.trim().toLowerCase()];
  const destRows = (() => {
    if (s.step !== 1 || s.mode !== 'know') return [];
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
      const D = DST(id), t = trip(id, o, M), on = s.dest === id;
      return { key: id, name: D.name, sub: `${D.region}${D.ft != null && !D.generic ? ` · ${fmtN(D.ft)} ft` : ''}`, meta: `${t.kmStr} km · ${Math.round(t.hours)} h`, icon: D.icon, onClick: () => set({ dest: id, corridor: id, pickId: null }),
        bg: on ? 'rgba(255,181,71,.12)' : 'transparent', border: on ? 'rgba(255,181,71,.5)' : 'transparent', iconC: on ? 'var(--amb)' : 'var(--mute)', checkOp: on ? 1 : 0 };
    });
  })();

  const oqT = s.oq.trim().toLowerCase();
  const plan = buildPlan(s);

  return {
    s, c, gate, tip, health, off, isAir, selCorridor: sug.sel?.corridor,
    stepLabel: `${s.step + 1} / 6`,
    stepBars: [0, 1, 2, 3, 4, 5].map(i => ({ bg: i <= s.step ? 'var(--bar)' : 'var(--line2)', glow: i <= s.step ? 'var(--barGlow)' : 'none' })),
    ob: obTitles[s.step],
    cityCount: CITIES.length,
    listLabel: s.oq ? (geoOf(s.oq)?.status === 'loading' ? 'Matching places · searching OpenStreetMap…' : 'Matching places') : 'Popular cities',
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
      : s.loc === 'locating' ? { title: 'Finding your location…', sub: 'Waiting for GPS', icon: 'ph-crosshair', tile: 'linear-gradient(135deg,#6FD3FF,#3B8DFF)', border: 'rgba(111,211,255,.45)' }
        : s.loc === 'denied' ? { title: 'Location is off', sub: 'Tap to try again, or search below', icon: 'ph-map-pin-simple-slash', tile: 'linear-gradient(135deg,#FF8A6B,#FF4F7B)', border: 'rgba(255,107,91,.4)' }
          : s.loc === 'failed' ? { title: 'Couldn’t find your location', sub: s.locNote || 'Tap to try again, or search below', icon: 'ph-map-pin-simple-slash', tile: 'linear-gradient(135deg,#FF8A6B,#FF4F7B)', border: 'rgba(255,107,91,.4)' }
            : { title: 'Use my current location', sub: 'Finds your city automatically', icon: 'ph-crosshair', tile: 'linear-gradient(135deg,#6FD3FF,#3B8DFF)', border: 'var(--line2)' },
    modeOpts: MODES.map((o, i) => {
      const on = s.mode === o.id, g = GRADS[i === 0 ? 2 : 3];
      return { ...o, onClick: () => set({ mode: o.id, pickId: null, ...(o.id === 'know' ? { corridor: s.dest } : {}) }),
        tile: `linear-gradient(135deg,${g[0]},${g[1]})`, glow: g[0],
        bg: on ? `linear-gradient(var(--fill),var(--fill)) padding-box, linear-gradient(135deg,${g[0]},${g[1]}) border-box` : 'linear-gradient(rgba(255,255,255,.05),rgba(255,255,255,.05)) padding-box, linear-gradient(rgba(255,255,255,.1),rgba(255,255,255,.1)) border-box',
        transform: on ? 'translateZ(22px) rotateX(5deg)' : 'translateZ(0)', shadow: on ? `0 22px 40px -18px ${g[0]}` : 'none',
        ringC: on ? g[0] : 'var(--line2)', dotBg: on ? g[0] : 'transparent', checkOp: on ? 1 : 0 };
    }),
    destListLabel: s.dq ? (geoOf(s.dq)?.status === 'loading' ? 'Matching places · searching OpenStreetMap…' : 'Matching places') : 'Popular destinations',
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
      return [{ icon: 'ph-sun', color: 'var(--g)', text: inS.length ? `In season in ${MONTH_FULL[M - 1]}: ${inS.slice(0, 6).join(', ')}${inS.length > 6 ? ' and more' : ''}.` : `Few destinations are in season in ${MONTH_FULL[M - 1]}.` },
        ...(babusarClosed(M) ? [{ icon: 'ph-road-horizon', color: 'var(--cor)', text: `Babusar Pass is closed in ${MONTH_FULL[M - 1]}. Northern routes go via Besham on the KKH.` }] : []),
        { icon: 'ph-sun-horizon', color: 'var(--vio)', text: `Daylight about ${clock(SUNRISE[M - 1])} to ${clock(SUNSET[M - 1])}.` }];
    })(),
    mapRouteLabel: (() => {
      const r = LIVE.route[routeKey(cityOr(s.origin).n, s.corridor)];
      return isAir ? 'Flight path' : r && r.status === 'ok' ? `Road from OpenStreetMap · ${fmtN(r.data.km)} km` : r && r.status === 'loading' ? 'Loading road from OpenStreetMap…' : 'Route from SafarCo road table';
    })(),
    wx: (() => {
      const D = DST(s.corridor), p = wxPlan(D, s.startDate, s.days), r = LIVE.wx[p.key];
      const base = { place: D.town || D.name, source: p.kind === 'forecast' ? 'Forecast · Open-Meteo' : `Same dates in ${p.year} · Open-Meteo`, loading: !r || r.status === 'loading', failed: !!r && r.status === 'error',
        days: [] as { day: string; icon: string; color: string; hi: number; lo: number; wet: string; hasWet: boolean; snow: boolean; rainy: boolean }[], hasSummary: false, summary: '' };
      if (!r || r.status !== 'ok' || !r.data || !r.data.time) return base;
      const d = r.data, days = d.time.map((_, i) => {
        const [icon, color] = WMO(d.weather_code ? d.weather_code[i] : null), snow = (d.snowfall_sum && d.snowfall_sum[i]) || 0, rain = (d.precipitation_sum && d.precipitation_sum[i]) || 0, pp = d.precipitation_probability_max ? d.precipitation_probability_max[i] : null;
        const wet = snow >= 0.5 ? `${Math.round(snow)} cm snow` : pp != null ? (pp >= 30 ? `${pp}% rain` : '') : rain >= 1 ? `${Math.round(rain)} mm rain` : '';
        return { day: dayLabel(s.startDate, i).split(' ').slice(0, 2).join(' '), icon, color, hi: Math.round(d.temperature_2m_max[i]), lo: Math.round(d.temperature_2m_min[i]), wet, hasWet: !!wet, snow: snow >= 0.5, rainy: snow < 0.5 && (pp != null ? pp >= 50 : rain >= 2) };
      }).filter(x => !isNaN(x.hi));
      if (!days.length) return base;
      const hi = days.map(x => x.hi), lo = days.map(x => x.lo), sn = days.filter(x => x.snow).length, rn = days.filter(x => x.rainy).length, rng = (a: number[]) => Math.min(...a) === Math.max(...a) ? `${a[0]}` : `${Math.min(...a)} to ${Math.max(...a)}`;
      const summary = `Highs ${rng(hi)}°C, lows ${rng(lo)}°C.` + (sn ? ` Snow on ${sn} day${sn > 1 ? 's' : ''}.` : '') + (rn ? ` Rain likely on ${rn} day${rn > 1 ? 's' : ''}.` : '') + (Math.min(...lo) <= 0 ? ' Below freezing at night.' : '');
      return { ...base, days, hasSummary: true, summary };
    })(),
    liveRoadNotes: (() => {
      if (s.screen !== 'app' || isAir) return [];
      const o = cityOr(s.origin), r = LIVE.route[routeKey(o.n, s.corridor)];
      if (!r) return [];
      if (r.status === 'loading') return [{ icon: 'ph-globe-hemisphere-east', color: 'var(--mute)', text: 'Checking the road on OpenStreetMap…' }];
      if (r.status === 'error') return [{ icon: 'ph-wifi-slash', color: 'var(--mute)', text: 'Live road check unavailable. Using SafarCo’s road table.' }];
      const lv = c.live;
      if (lv && !lv.ignored) return [{ icon: 'ph-check-circle', color: 'var(--g)', text: `Distance checked on OpenStreetMap: ${fmtN(r.data.km)} km. Drive times use mountain and town speeds, so they are longer than map apps show.` }];
      return [{ icon: 'ph-warning', color: 'var(--cor)', text: `OpenStreetMap’s fastest road is ${fmtN(r.data.km)} km; this plan is ${c.kmStr} km. It may use a road closed in ${MON[M - 1]}. Check before you leave.` }];
    })(),
    seasonNotes: seasonInfo(s, s.corridor),
    dayHint: (() => {
      const o = s.origin || 'Islamabad', okS = { tile: 'linear-gradient(135deg,#2EE59D,#0FA678)', bg: 'rgba(46,229,157,.1)', border: 'rgba(46,229,157,.3)' }, badS = { tile: 'linear-gradient(135deg,#FF8A6B,#FF4F7B)', bg: 'rgba(255,107,91,.12)', border: 'rgba(255,107,91,.4)' };
      if (s.mode === 'know') {
        const t = trip(s.dest, o, M), bad = s.days < t.minDays;
        return { text: `${o} → ${DST(s.dest).name}: ${t.kmStr} km by road, about ${Math.round(t.hours)} h each way. ${bad ? `You need at least ${t.minDays} days.` : `Plan: ${t.legDays} driving day${t.legDays > 1 ? 's' : ''} each way.`}`, icon: bad ? 'ph-calendar-x' : 'ph-path', ...(bad ? badS : okS) };
      }
      const pool = SUGGEST_POOL.filter(k => DST(k).name !== o), ok = pool.filter(k => s.days >= trip(k, o, M).minDays).length;
      return { text: `${ok} of ${pool.length} popular destinations are reachable from ${o} in ${s.days} days, driving up to ${MAX_DRIVE_H} h a day.`, icon: 'ph-path', ...(ok ? okS : badS) };
    })(),
    nightsLabel: `days · ${nights} night${nights > 1 ? 's' : ''}`,
    decDays: () => set({ days: Math.max(2, s.days - 1) }), incDays: () => set({ days: Math.min(14, s.days + 1) }),
    dayPresets: [3, 5, 7, 10].map(d => ({ key: d, label: `${d} days`, onClick: () => set({ days: d }), ...chip(s.days === d) })),
    capBig: fmtN(s.cap), capPer: `${fmt(s.cap / s.groupSize)} per person · ${s.days} days`,
    tripMeta: `${s.groupSize} traveller${s.groupSize > 1 ? 's' : ''} · ${s.days} days`,
    sliderPct: (s.cap - 20000) / 480000 * 100,
    capPresets: [50000, 100000, 200000, 350000].map(v => ({ key: v, label: `${v / 1000}k`, onClick: () => set({ cap: v, pickId: null }), ...chip(s.cap === v) })),
    budgetHint: s.mode === 'know'
      ? (sug.list.find(x => x.best) ? `Best fit for ${DST(s.dest).label}: ${sug.list.find(x => x.best)!.name}, ${fmt(sug.list.find(x => x.best)!.total)}.` : sug.list.length ? `${DST(s.dest).label} starts at ${fmt(sug.list[sug.list.length - 1].total)} for this group.` : '')
      : (fitCount ? `${fitCount} of ${sug.list.length} destinations fit this budget.` : 'Nothing fits yet. Raise the budget or shorten the trip.'),
    sugg: sug.list.map((g: Suggestion) => {
      const on = g.key === sug.sel?.key, fits = fitsS(g);
      return { key: g.key, title: s.mode === 'know' ? g.name : DST(g.corridor).label, sub: s.mode === 'know' ? `${VEH[g.vehicle].short} · ${TIERS[g.tier].label} stays` : `${g.name} · ${VEH[g.vehicle].short}${g.name === TIERS[g.tier].label ? '' : ` · ${TIERS[g.tier].label} stays`}`,
        icon: VEH[g.vehicle].icon, tile: TIER_G[g.tier], amount: fmt(g.total), best: !!g.best,
        fitLabel: !g.ok ? (g.why || `Needs ${g.minDays}+ days`) : fits ? `${kShort(s.cap - g.total)} left` : `+${kShort(g.total - s.cap)}`, fitFg: fits ? 'var(--g)' : 'var(--cor)', fitBg: fits ? 'rgba(46,229,157,.14)' : 'rgba(255,107,91,.16)',
        bg: on ? 'linear-gradient(var(--fill),var(--fill)) padding-box, linear-gradient(135deg,#2EE59D,#FFB547) border-box' : 'linear-gradient(rgba(255,255,255,.05),rgba(255,255,255,.05)) padding-box, linear-gradient(rgba(255,255,255,.1),rgba(255,255,255,.1)) border-box',
        transform: on ? 'translateZ(18px) rotateX(4deg)' : 'translateZ(0)', shadow: on ? '0 22px 40px -18px rgba(46,229,157,.7)' : 'none', op: fits || on ? 1 : .62,
        onClick: () => set({ pickId: g.key, corridor: g.corridor }) };
    }),
    canBack: s.step > 0, nextOp: canNext ? 1 : .45,
    back: () => set({ step: s.step - 1 }),
    next: () => {
      if (!canNext) return;
      if (s.step < 5) set({ step: s.step + 1, pickId: null });
      else { const g = sug.sel; if (g) set({ screen: 'app', tab: 'trip', corridor: g.corridor, dest: g.corridor, vehicle: g.vehicle, tier: g.tier }); }
    },
    nextLabel: s.step < 5 ? 'Continue' : 'Build this trip',
    restart: () => set({ screen: 'onboard', step: 0, drawer: false, settings: false }),
    corridorChips: [s.corridor, ...POP_DEST.filter(k => k !== s.corridor && DST(k).name !== s.origin)].slice(0, 6).map(k => {
      const on = s.corridor === k, v = DST(k);
      return { key: k, label: v.name, onClick: () => set({ corridor: k, dest: k }), bg: on ? 'var(--cta)' : 'var(--fill2)', fg: on ? 'var(--onCta)' : 'var(--ink)', border: on ? 'transparent' : 'var(--line2)', shadow: on ? '0 10px 24px -10px rgba(46,229,157,.8)' : 'none' };
    }),
    budgetShadow: ring('budget'), alertShadow: s.flash === 'alert' ? '0 0 0 2px #9B7BFF, 0 0 40px -6px rgba(155,123,255,.7)' : 'none',
    capPct: Math.round(pct * 100), totalNum: fmtN(total), perPersonStr: fmt(total / s.groupSize), capStr: fmt(s.cap), barPct: Math.min(pct, 1) * 100,
    plan: (() => {
      const p = plan, K: Record<string, [string, string]> = { drive: ['linear-gradient(135deg,#2EE59D,#0FA678)', 'Drive'], explore: ['linear-gradient(135deg,#9B7BFF,#5B6CFF)', 'Explore'], return: ['linear-gradient(135deg,#FFB547,#FF7A3D)', 'Return'], fly: ['linear-gradient(135deg,#6FD3FF,#3B8DFF)', 'Fly'] };
      const depChips = [null, 4.5, 5.5, 6.5, 7.5, 8.5].map(v => { const on = (s.depart ?? null) === v; return { key: String(v), label: v === null ? `Auto · ${clock(p.rec)}` : clock(v), onClick: () => set({ depart: v }), ...chip(on) }; });
      return { summary: `${p.total} days · ${p.total - 1} nights`, via: p.air ? `Flights ${p.air.dep} ⇄ ${p.air.arr} · car and driver at the destination` : `${c.kmStr} km each way by road · ${c.via}`,
        hasDep: !p.air && p.hasDrive, depChips, depNoteC: p.late ? 'var(--amb)' : 'var(--mute)',
        depNote: p.late ? `Some driving days end after sunset (about ${clock(p.sunset)}). ${p.dep > p.rec ? `Leave by ${clock(p.rec)}.` : 'Consider an extra night stop.'}` : s.depart == null ? `Recommended ${clock(p.rec)}, so every driving day ends before sunset (about ${clock(p.sunset)}).` : `Every driving day ends before sunset (about ${clock(p.sunset)}).`,
        days: p.days.map((d, i) => ({ ...d, stops: (d.stops || []).map(t => ({ ...t, icon: STOP_KIND[t.kind][0], color: STOP_KIND[t.kind][1] })), tile: K[d.kind][0], kindLabel: K[d.kind][1], lineOp: i === p.days.length - 1 ? 0 : 1 })) };
    })(),
    rows: rows.map(r => ({ ...r, amount: fmtN(r.val), color: CAT[r.label] || 'var(--sky)', grad: `linear-gradient(135deg,${CAT[r.label] || 'var(--sky)'},${CAT2[r.label] || '#3B8DFF'})` })),
    vehChips: (Object.entries(VEH) as [VehicleId, typeof VEH[VehicleId]][]).map(([k, v]) => {
      const on = s.vehicle === k, off = k === 'air' && !air;
      return { key: k, icon: v.icon, label: v.short, full: v.label, onClick: () => { if (!off) set({ vehicle: k }); }, op: off ? .35 : 1,
        bg: on ? 'linear-gradient(135deg,#FFB547,#FF7A3D)' : 'var(--fill)', fg: on ? '#2A1500' : 'var(--ink2)', border: on ? 'transparent' : 'var(--line2)', shadow: on ? '0 12px 24px -10px rgba(255,150,60,.8)' : 'none' };
    }),
    people: ([['adults', 'Adults', '13–59 years', 'ph-user', 'var(--g)'], ['kids', 'Kids', 'Under 12 · lower fares and meals', 'ph-baby', 'var(--amb)'], ['elders', 'Elders', '60+ · altitude care on high passes', 'ph-person-simple-walk', 'var(--cor)']] as const)
      .map(([k, label, sub, icon, color]) => ({ key: k, label, sub, icon, color, value: `${s[k]}`, dec: () => api.setPeople(k, -1), inc: () => api.setPeople(k, 1) })),
    roomOpts: ([['separate', 'Separate rooms', 'Doubles · kids share'], ['shared', 'Family rooms', 'Up to 4 · 1.5× rate']] as const).map(([k, label, sub]) => {
      const on = s.rooms === k; return { key: k, label, sub, onClick: () => set({ rooms: k, pickId: null }), bg: on ? 'var(--cta)' : 'var(--fill)', fg: on ? 'var(--onCta)' : 'var(--ink)', border: on ? 'transparent' : 'var(--line2)' };
    }),
    hasFamilyNote: s.vehicle === 'bike' && !!(s.kids || s.elders),
    familyNote: 'A motorbike isn’t advised with kids or elders.',
    rates: [
      ...(s.vehicle === 'rentcar' ? [['ph-steering-wheel', 'Rent a car + driver', 'Corolla / City · 4 seats · + PKR 2,000 driver · fuel extra', 'PKR 12,000/day']] : []),
      ...(s.vehicle === 'rent4x4' ? [['ph-jeep', 'Rent a 4x4 + driver', 'Prado / Land Cruiser · 6 seats · + PKR 2,500 driver · fuel extra', 'PKR 35,000/day']] : []),
      ...(s.vehicle === 'coaster' ? [['ph-van', 'Rent a coaster + driver', '22 seats · + PKR 3,000 driver · diesel extra', 'PKR 35,000/day']] : []),
      ...(s.vehicle === 'public' ? [['ph-bus', `Coach ${c.from} → ${c.to}`, 'One way per adult · kids half fare', fmt(coachFare(c))]] : []),
      ...(isAir ? [['ph-airplane-tilt', `Flight ${air!.dep} → ${air!.arr}`, 'One way per adult · kids 75% · weather-dependent', fmt(air!.fare)], ['ph-steering-wheel', 'Car + driver at destination', 'Fuel included', 'PKR 15,000/day']] : []),
      ...(hasHub && s.vehicle !== 'suv' && s.vehicle !== 'rent4x4' ? [['ph-jeep', 'Jeep Raikot Bridge ⇄ Tato', 'Return, per jeep, 5 seats', 'PKR 8–10k']] : [])
    ].map(([icon, label, sub, amount]) => ({ icon, label, sub, amount })),
    hasJeeps: (c.jeeps || []).length > 0,
    jeeps: (() => {
      const sched = scheduledPlaces(c, M, freeDays(s, c));
      return (c.jeeps || []).map(([id, label, sub, rate, months]) => {
        const closed = !!months && !months.includes(M), inPlan = !closed && sched.some(p => jeepMatch([id, label], p)), k = jeepsFor(P);
        return { key: id, label, sub: `${sub} · ${fmt(rate)} per jeep${k > 1 ? ` × ${k}` : ''}`, cta: closed ? `Closed in ${MON[M - 1]}` : inPlan ? 'In your plan' : 'Needs an extra day',
          bg: inPlan ? 'var(--cta)' : 'var(--fill)', fg: inPlan ? 'var(--onCta)' : 'var(--mute)', border: inPlan ? '0' : '1px solid var(--line2)' };
      });
    })(),
    routeMap: (() => {
      const legs = c.legs, o = cityOr(s.origin), D = DST(s.corridor);
      const co = (n: string): [number, number] => n === 'HOME' ? [o.lat, o.lon] : n === 'DEST' ? [D.lat, D.lon] : NODES[n];
      const pts = isAir ? [[o.lat, o.lon], [D.lat, D.lon]] : [co(legs[0].a), ...legs.map(l => co(l.b))];
      const la0 = Math.min(...pts.map(p => p[0])), la1 = Math.max(...pts.map(p => p[0])), lo0 = Math.min(...pts.map(p => p[1])), lo1 = Math.max(...pts.map(p => p[1]));
      const kx = 0.86, aspect = 1 / 0.88; let w = Math.max(.6, (lo1 - lo0) * kx), h = Math.max(.6, la1 - la0);
      if (w / h > aspect) h = w / aspect; else w = h * aspect; w *= 1.4; h *= 1.4;
      const cx = (lo0 + lo1) / 2 * kx, cy = (la0 + la1) / 2, X = (lo: number) => ((lo * kx - (cx - w / 2)) / w) * 100, Y = (la: number) => (((cy + h / 2) - la) / h) * 100;
      const seg = (a: [number, number], b: [number, number]) => `M${X(a[1]).toFixed(2)} ${Y(a[0]).toFixed(2)}L${X(b[1]).toFixed(2)} ${Y(b[0]).toFixed(2)}`;
      const net = EDGES.map(e => seg(NODES[e[0]], NODES[e[1]])).join('');
      const route = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[1]).toFixed(2)} ${Y(p[0]).toFixed(2)}`).join('');
      const summer = isAir ? null : trip(s.corridor, s.origin, 7);
      const closed = summer ? summer.legs.filter(l => l.months && !l.months.includes(M)).map(l => seg(co(l.a), co(l.b))).join('') : '';
      const nightNodes = isAir ? [] : (c.cuts || []).map(i => legs[i].b);
      const dots = [{ p: [o.lat, o.lon] as [number, number], label: o.n, color: 'var(--g)', ring: 'rgba(46,229,157,.25)' },
        ...nightNodes.map((n, i) => ({ p: co(n), label: `Night ${i + 1} · ${NODE_INFO[n][0]}`, color: 'var(--amb)', ring: 'rgba(255,181,71,.25)' })),
        { p: [D.lat, D.lon] as [number, number], label: D.town, color: '#FF5A72', ring: 'rgba(255,90,114,.25)' }]
        .map((d, i) => ({ ...d, x: X(d.p[1]).toFixed(2), y: Y(d.p[0]).toFixed(2), lift: i % 2 ? '-26px' : '-6px' }));
      const groups: { name: string; hotel: string; from: number; to: number }[] = [];
      plan.days.forEach(d => { if (!d.stay) return; const g = groups[groups.length - 1]; if (g && g.name === d.stay.place) g.to = d.num!; else groups.push({ name: d.stay.place, hotel: d.stay.name, from: d.num!, to: d.num! }); });
      const roads: Record<string, { km: number; months?: number[] }> = {}; if (!isAir) legs.forEach(l => { const r = roads[l.road] || (roads[l.road] = { km: 0, months: l.months }); r.km += l.km; });
      return { net, route, closed, dots, isAir,
        stat: isAir ? `${air!.dep} ⇄ ${air!.arr} by air · car and driver there` : `${c.kmStr} km · ${dur(c.hours)} driving each way · ${c.legDays} driving day${c.legDays > 1 ? 's' : ''} each way`,
        nights: groups.map(g => ({ key: `${g.from}`, badge: g.from === g.to ? `Night ${g.from}` : `Nights ${g.from}–${g.to}`, name: g.name, hotel: g.hotel })),
        roads: Object.entries(roads).map(([name, r]) => ({ name, km: `${fmtN(Math.round(r.km / 5) * 5 || Math.round(r.km))} km`, note: r.months ? (r.months.includes(M) ? `Open in ${MON[M - 1]}` : `Closed in ${MON[M - 1]}`) : '', noteC: r.months && !r.months.includes(M) ? 'var(--cor)' : 'var(--g)', hasNote: !!r.months })) };
    })(),
    tierChips: (Object.entries(TIERS) as [AppState['tier'], typeof TIERS['standard']][]).map(([k, t]) => { const on = s.tier === k; return { key: k, label: t.label, onClick: () => set({ tier: k }), bg: on ? 'var(--line2)' : 'transparent', fg: on ? 'var(--ink)' : 'var(--mute)' }; }),
    themeChips: THEMES.map(t => { const on = s.theme === t.id; return { key: t.id, label: t.label, onClick: () => set({ theme: t.id }), bg: on ? 'var(--line2)' : 'transparent', fg: on ? 'var(--ink)' : 'var(--mute)' }; }),
    steppers: [
      { key: 'a', label: 'Adults', value: `${s.adults}`, dec: () => api.setPeople('adults', -1), inc: () => api.setPeople('adults', 1) },
      { key: 'k', label: 'Kids (under 12)', value: `${s.kids}`, dec: () => api.setPeople('kids', -1), inc: () => api.setPeople('kids', 1) },
      { key: 'e', label: 'Elders (60+)', value: `${s.elders}`, dec: () => api.setPeople('elders', -1), inc: () => api.setPeople('elders', 1) },
      { key: 'd', label: 'Days', value: `${s.days}`, dec: () => set({ days: Math.max(2, s.days - 1) }), inc: () => set({ days: Math.min(14, s.days + 1) }) },
      { key: 'b', label: 'Budget cap', value: `${Math.round(s.cap / 1000)}k`, dec: () => set({ cap: Math.max(40000, s.cap - 10000) }), inc: () => set({ cap: s.cap + 10000 }) }
    ],
    helplines: [['1122', 'Rescue'], ['15', 'Police'], ['130', 'Motorway Police'], ['115', 'Edhi Ambulance']].map(([num, label]) => ({ num, label, href: `tel:${num}` })),
    hotels: (c.hotels || [['Hotels in ' + c.town, 'Search', 'Opens Google Maps'] as [string, string, string]]).map(([name, tier, note]) => ({ name, tier, note, tierC: tierC[tier], grad: tierG[tier], href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tier === 'Search' ? 'hotels in ' + c.town : name).replace(/%20/g, '+')}` })),
    tabs: ([['trip', 'ph-mountains', 'Trip'], ['map', 'ph-map-trifold', 'Map'], ['offline', 'ph-cloud-slash', 'Offline']] as const).map(([k, icon, label]) => {
      const on = s.tab === k; return { key: k, icon, label, bg: on ? 'linear-gradient(135deg,rgba(46,229,157,.22),rgba(25,194,184,.12))' : 'transparent', fg: on ? 'var(--g)' : 'var(--mute)', onClick: () => set({ tab: k }) };
    }),
    pillA: isAir ? `${air!.dep} ⇄ ${air!.arr} by air` : `${c.kmStr} km by road`,
    pillB: isAir ? `~1 h flight${air!.pp ? ' + coach to airport' : ''}` : c.hrs,
    pillIcon: isAir ? 'ph-airplane-tilt' : 'ph-path',
    tripSummary: [dayLabel(s.startDate, 0), `${s.adults} adult${s.adults > 1 ? 's' : ''}`, s.kids ? `${s.kids} kid${s.kids > 1 ? 's' : ''}` : '', s.elders ? `${s.elders} elder${s.elders > 1 ? 's' : ''}` : '', VEH[s.vehicle].short, TIERS[s.tier].label, `${s.days} days`].filter(Boolean).join(' · '),
    msgView: s.msgs.map((m, i) => ({ key: i, ...m, isUser: m.role === 'user', shown: m.role === 'ai' ? m.text.slice(0, m.typed ?? 999) : m.text,
      calls: (m.calls || []).map(k => ({ ...k, bg: k.status === 'running' ? 'rgba(255,181,71,.18)' : 'rgba(46,229,157,.18)', fg: k.status === 'running' ? 'var(--amb)' : 'var(--g)' })) })),
    suggestions: COPILOT_PROMPTS.map(prompt => ({ prompt, onClick: () => api.ask(prompt) }))
  };
}
export type View = ReturnType<typeof buildView>;
