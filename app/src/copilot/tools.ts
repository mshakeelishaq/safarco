// Runs co-pilot tools against the trip, and the free on-device parser that turns
// plain English / Roman Urdu requests into the same tool calls.
import { DESTS, MONTH_FULL, TIERS, VEH, type TierId, type VehicleId } from '../engine/data';
import { airFor, babusarClosed, buildPlan, costFor, trip } from '../engine/engine';
import { dayLabel, fmt, isoAdd, isoOf, mon } from '../engine/format';
import { CITIES, DST } from '../engine/places';
import type { AppState, Patch } from '../state';
import { STAY_TIERS, TRANSPORT_MODES, type ToolName } from './schema';

export function summary(st: AppState) {
  const t = trip(st.corridor, st.origin, mon(st)), r = costFor(st), p = buildPlan(st);
  return `Trip: ${t.from} → ${DST(st.corridor).name}, ${dayLabel(st.startDate, 0)} for ${st.days} days (needs ${r.minDays || t.minDays}+), ${st.adults} adults, ${st.kids} kids, ${st.elders} elders, ${VEH[st.vehicle].label}, ${TIERS[st.tier].label} stays. ` +
    `Road ${t.kmStr} km, ${Math.round(t.hours)} h each way via ${t.via}. Total ${fmt(r.total)} vs cap ${fmt(st.cap)}. Nights: ${p.days.filter(d => d.stay).map(d => d.stay!.town).join(', ')}.${r.ok ? '' : ' WARNING: not enough days.'}`;
}

const findDest = (q: string) => {
  q = String(q || '').toLowerCase().trim(); if (!q) return null;
  const d = DESTS.find(d => [d.id, d.name, d.town || ''].some(x => x.toLowerCase() === q)) || DESTS.find(d => [d.name, d.town || d.name].some(x => x.toLowerCase().includes(q) || q.includes(x.toLowerCase().split(',')[0])));
  if (d) return d.id;
  const c = CITIES.find(c => c.n.toLowerCase() === q) || CITIES.find(c => c.n.toLowerCase().includes(q));
  return c ? 'city:' + c.n : null;
};

export interface ToolCtx { st: AppState; apply: (p: Patch) => void }
type Input = Record<string, unknown>;

/** Runs one tool. Returns the text result for the model (or for the reply). */
export function runTool(name: ToolName | string, input: Input, ctx: ToolCtx): string {
  const { st } = ctx, apply = (p: Patch) => { Object.assign(st, p); ctx.apply(p); };
  switch (name) {
    case 'get_trip_summary': return summary(st);
    case 'set_destination': { const id = findDest(String(input.place)); if (!id) return `No match for "${input.place}".`; apply({ dest: id, corridor: id, mode: 'know' }); return summary(st); }
    case 'set_origin': {
      const city = String(input.city || '').toLowerCase(), c = CITIES.find(x => x.n.toLowerCase() === city) || CITIES.find(x => x.n.toLowerCase().includes(city));
      if (!c || !city) return `No city "${input.city}".`; apply({ origin: c.n }); return summary(st);
    }
    case 'set_dates': {
      const p: Patch = {}, sd = typeof input.start_date === 'string' ? input.start_date : '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(sd) && !isNaN(+new Date(sd + 'T00:00'))) p.startDate = sd < isoAdd(0) ? isoAdd(0) : sd;
      if (typeof input.days === 'number') p.days = Math.max(2, Math.min(14, Math.round(input.days)));
      apply(p); return summary(st);
    }
    case 'set_travellers': {
      const n = (k: 'adults' | 'kids' | 'elders', min: number) => typeof input[k] === 'number' ? Math.max(min, Math.min(20, Math.round(input[k] as number))) : st[k];
      const a = n('adults', 1), k = n('kids', 0), e = n('elders', 0); apply({ adults: a, kids: k, elders: e, groupSize: a + k + e }); return summary(st);
    }
    case 'set_transport': {
      const mode = input.mode as VehicleId; if (!TRANSPORT_MODES.includes(mode)) return 'Unknown mode.';
      if (mode === 'air' && !airFor(st.corridor, st.origin)) return 'No flights to this destination.'; apply({ vehicle: mode }); return summary(st);
    }
    case 'set_stay_level': { const tier = input.tier as TierId; if (!STAY_TIERS.includes(tier)) return 'Unknown tier.'; apply({ tier }); return summary(st); }
    case 'set_rooms': { const rooms = input.rooms === 'shared' ? 'shared' : 'separate'; apply({ rooms }); return summary(st); }
    case 'set_budget': { const pkr = Number(input.pkr); if (!isFinite(pkr)) return 'Budget must be a number.'; apply({ cap: Math.max(20000, Math.min(5000000, Math.round(pkr))) }); return summary(st); }
    case 'set_departure_time': {
      const time = String(input.time || ''), m = /^(\d{1,2}):?(\d{2})?/.exec(time);
      apply({ depart: time === 'auto' || !m ? null : Math.max(3, Math.min(11, +m[1] + (+(m[2] || 0)) / 60)) }); return summary(st);
    }
    case 'show_alert': apply({ aiAlert: { title: String(input.title || '').slice(0, 80), message: String(input.message || '').slice(0, 240) } }); return 'Alert pinned.';
    default: return `Unknown tool ${name}.`;
  }
}

// ---- Free on-device parser -------------------------------------------------

const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, ek: 1, do: 2, teen: 3, char: 4, chaar: 4, panch: 5, paanch: 5, chay: 6, chhe: 6, saat: 7, aath: 8 };
const numIn = (s: string) => /^\d+$/.test(s) ? +s : NUM[s];
const MONTHS = MONTH_FULL.map(m => m.toLowerCase());

export interface Intent { calls: [ToolName, Input][]; passQuestion: boolean }

export function parseRequest(raw: string, st: AppState): Intent {
  const t = ' ' + raw.toLowerCase().replace(/[’']/g, '') + ' ', calls: [ToolName, Input][] = [];
  const has = (re: RegExp) => re.test(t);

  // Destination: a detailed guide or any city named after "to / go / switch".
  const noFrom = t.replace(/\bfrom [a-z]+/g, ' ');
  const dest = DESTS.find(d => [d.name, (d.town || d.name).split(',')[0], d.id === 'fairy' ? 'fairy' : ''].filter(Boolean).some(x => noFrom.includes(' ' + x.toLowerCase())));
  if (dest && dest.id !== st.corridor) calls.push(['set_destination', { place: dest.name }]);
  else if (!dest) {
    const m = /(?:switch to|go to|change to|instead|chalo|jana hai)\s+([a-z ]{3,30}?)(?:[ ,.!?]|$)/.exec(t);
    const c = m && CITIES.find(c => m[1].trim().startsWith(c.n.toLowerCase()));
    if (c && c.n !== st.origin) calls.push(['set_destination', { place: c.n }]);
  }
  const from = /\bfrom ([a-z ]{3,30}?)(?:[ ,.!?]|$)/.exec(t), oc = from && CITIES.find(c => from[1].trim().startsWith(c.n.toLowerCase()));
  if (oc) calls.push(['set_origin', { city: oc.n }]);

  // Transport.
  const mode: VehicleId | null = has(/\bcoaster\b/) ? 'coaster' : has(/\b(hire|rent)(ed)? (a )?(4x4|prado|jeep)\b/) ? 'rent4x4' : has(/\b(hire|rent)(ed)? (a )?(car|driver)\b|\bwith driver\b/) ? 'rentcar'
    : has(/\b(fly|flight|plane|by air|jahaz)\b/) ? 'air' : has(/\b(coach|bus|daewoo|faisal movers)\b/) ? 'public' : has(/\b(motor ?bike|bike|motorcycle)\b/) ? 'bike'
      : has(/\b(4x4|prado|fortuner|land cruiser|suv)\b/) ? 'suv' : has(/\b(corolla|sedan|civic|honda city|alto|cultus|our car|apni gaari|gaari)\b/) ? 'sedan' : null;
  if (mode && mode !== st.vehicle) calls.push(['set_transport', { mode }]);

  // Stay level and rooms.
  const tier: TierId | null = has(/\b(backpack(er|ing)?|cheap|sasta|budget trip|dhaba)\b/) ? 'backpacker' : has(/\b(premium|luxury|5 star|five star|resort)\b/) ? 'premium' : has(/\bstandard\b/) ? 'standard' : null;
  if (tier && tier !== st.tier) calls.push(['set_stay_level', { tier }]);
  if (has(/\bfamily rooms?\b|\bjoint rooms?\b|\bshared rooms?\b|\bek kamra\b/)) calls.push(['set_rooms', { rooms: 'shared' }]);
  else if (has(/\bseparate rooms?\b|\balag kamr/)) calls.push(['set_rooms', { rooms: 'separate' }]);

  // Travellers.
  let adults = st.adults, kids = st.kids, elders = st.elders, people = false;
  const grp = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|do|teen|char|chaar|panch|paanch|saat|aath) (friends|people|persons|adults|log|dost|of us)\b/.exec(t);
  if (grp && numIn(grp[1])) { const n = numIn(grp[1]); people = true; if (/friends|dost/.test(grp[2])) { adults = n; kids = 0; elders = 0; } else if (grp[2] === 'adults') adults = n; else { adults = Math.max(1, n - kids - elders); } }
  const kd = /\b(\d+|one|two|three|four|five|do|teen) (kids|children|bachay|bachy|bache)\b/.exec(t); if (kd && numIn(kd[1]) !== undefined) { kids = numIn(kd[1]); people = true; }
  const el = /\b(\d+|one|two|three|four) (elders|seniors|grandparents)\b/.exec(t); if (el && numIn(el[1]) !== undefined) { elders = numIn(el[1]); people = true; }
  if (has(/\b(my )?(parents|walidain|ammi abbu|mom and dad)\b/) && !el) { elders = Math.max(elders, 2); people = true; }
  if (people) calls.push(['set_travellers', { adults, kids, elders }]);

  // Dates.
  const mi = MONTHS.findIndex(m => t.includes(' ' + m) || t.includes(' ' + m.slice(0, 3) + ' '));
  let startDate: string | undefined, days: number | undefined;
  if (mi >= 0) { const now = new Date(), y = now.getFullYear() + (mi < now.getMonth() ? 1 : 0); startDate = mi === now.getMonth() ? isoAdd(3) : isoOf(new Date(y, mi, 15)); }
  const dd = /\b(\d+|two|three|four|five|six|seven|eight|nine|ten) (days|din)\b/.exec(t); if (dd && numIn(dd[1])) days = numIn(dd[1]);
  if (startDate || days) calls.push(['set_dates', { ...(startDate ? { start_date: startDate } : {}), ...(days ? { days } : {}) }]);

  // Budget: "budget 150k", "1.5 lakh", "PKR 200,000".
  const bud = /\b(?:budget|cap|pkr|rs)\.? ?(\d[\d,.]*) ?(k|lakh|lac)?\b|\b(\d[\d.]*) ?(k|lakh|lac)\b/.exec(t);
  if (bud) { const n = parseFloat((bud[1] || bud[3]).replace(/,/g, '')), u = bud[2] || bud[4]; const pkr = u === 'k' ? n * 1000 : u ? n * 100000 : n; if (pkr >= 10000) calls.push(['set_budget', { pkr }]); }

  // Departure time: "leave at 6", "6:30 am", "subah 5 baje".
  const lv = /\b(?:leave|depart|start|nikal\w*)(?: at| by)? (\d{1,2})(?::(\d{2}))? ?(am|pm)?\b|\b(\d{1,2}) baje\b/.exec(t);
  if (lv) { let h = +(lv[1] || lv[4]); if (lv[3] === 'pm' && h < 12) h += 12; calls.push(['set_departure_time', { time: `${h}:${lv[2] || '00'}` }]); }

  const passQuestion = has(/\b(babusar|pass|weather|snow|mausam|barf|road open|open\?|khula)\b/);
  return { calls, passQuestion };
}

/** A factual answer about passes and weather from the trip's season data and the live forecast. */
export function passAnswer(st: AppState, wxSummary: string): { reply: string; alert: [string, string] | null } {
  const m = mon(st), Mo = MONTH_FULL[m - 1], t = trip(st.corridor, st.origin, m), summer = trip(st.corridor, st.origin, 7);
  const uses = t.legs.some(l => /Babusar/.test(l.road)), wouldUse = summer.legs.some(l => /Babusar/.test(l.road));
  const closedRoads = [...new Set(summer.legs.filter(l => l.months && !l.months.includes(m)).map(l => l.road))];
  const wx = wxSummary ? ` Weather in ${DST(st.corridor).town}: ${wxSummary}` : '';
  if (uses) return { reply: `Babusar Pass is usually open from June to October, so it should be open in ${Mo}. Cross Babusar Top (13,690 ft) before the afternoon.${wx} Check with Gilgit-Baltistan police before you leave.`, alert: ['Babusar Top on your route', `Usually open in ${Mo}. Cross before the afternoon and check the road status before leaving.`] };
  if (wouldUse && babusarClosed(m)) return { reply: `Babusar Pass is normally closed in ${Mo}, so your plan already goes via Besham on the KKH. It is ${t.kmStr} km each way.${wx}`, alert: ['Babusar Pass closed in ' + Mo, 'Your route goes via Besham on the KKH instead.'] };
  if (closedRoads.length) return { reply: `${closedRoads.join(', ')} is closed in ${Mo}, so the plan uses another road.${wx}`, alert: null };
  return { reply: `Your route to ${DST(st.corridor).name} doesn't cross Babusar Pass.${wx}`, alert: null };
}
