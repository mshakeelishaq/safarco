// Places the traveller adds to or removes from the plan. The engine builds the plan;
// these edits are applied on top, so a changed plan (another destination or length) drops them.
import { PLACE_INFO, SLOTS, STOP_DUR } from './engine/data';
import { timeDay } from './engine/timing';
import type { PlanDay, StopItem } from './engine/engine';
import { clock } from './engine/format';
import type { PlanEdits } from './state';
import { t } from './i18n';

/** Which plan a set of edits belongs to: same start, destination, length and way of travel. */
export const planKey = (s: { origin: string | null; corridor: string; days: number; vehicle: string; extra?: string[]; overnight?: string | null; sleepAt?: string[] }) => `${s.origin}|${s.corridor}|${s.days}|${s.vehicle === 'air' ? 'air' : 'road'}${s.extra?.length ? '|' + s.extra.join(',') : ''}${s.overnight ? '|night:' + s.overnight : ''}${s.sleepAt?.length ? '|sleep:' + s.sleepAt.join(',') : ''}`;
export const dropKey = (day: number, label: string) => `${day}|${label}`;

/** "6:30 am" → 6.5 */
export const parseClock = (s: string) => {
  const m = /^(\d{1,2}):(\d{2}) (am|pm)$/.exec(s); if (!m) return null;
  return (+m[1] % 12) + (m[3] === 'pm' ? 12 : 0) + +m[2] / 60;
};

export interface EditedStop extends StopItem { removable?: boolean; added?: boolean; key: string }
export interface EditedDay { stops: EditedStop[]; places: number; saved: number; warn?: string }

/** How long people usually stay at a place, in hours (from the places spreadsheet), else an hour. */
const visitH = (name: string) => { const k = Object.keys(PLACE_INFO).find(x => x.endsWith('|' + name)); return (k && PLACE_INFO[k].visit || 60) / 60; };

/** Stops a traveller may skip on a driving day. */
const SKIPPABLE = new Set(['tea', 'view', 'food']);

/**
 * A day's stops with the traveller's changes: removed places gone (later times move earlier on a driving day),
 * added places in, explore-day time slots renumbered.
 */
export function editDay(d: PlanDay, i: number, e: PlanEdits): EditedDay {
  const dropped = (label: string) => e.drops.includes(dropKey(i, label));
  const picks = e.picks.filter(p => p.day === i);
  const added = picks.map(p => ({ time: '', kind: 'pin' as const, label: p.name, note: p.note, href: p.href || undefined, added: true, removable: true }));
  let stops: Omit<EditedStop, 'key'>[];
  let saved = 0, warn = d.long || '';

  if (d.kind === 'explore') {
    const free = t('Free day');
    const pins = d.stops.filter(x => x.kind === 'pin' && x.label !== free && !dropped(x.label)).map(x => ({ ...x, removable: true }));
    const all = [...pins, ...added.filter(a => !pins.some(p => p.label.toLowerCase() === a.label.toLowerCase()))].map((x, j) => ({ ...x, time: t(SLOTS[Math.min(j, 3)]) }));
    // Timed days are timed again with the places as they now are.
    const rest = d.stops.filter(x => x.kind !== 'pin' && (!d.timing || (x.kind === 'food' && x.label === t('Eat local'))));
    if (d.timing && all.length) { const r = timeDay(all, d.timing, rest); stops = r.stops; warn = r.warn; }
    else { warn = ''; stops = all.length ? [...all, ...rest] : [{ time: t('All day'), kind: 'pin', label: free, note: t('Rest, shop, or go back to a favourite spot') }, ...rest.map(x => x.kind === 'food' ? { ...x, time: t('Food') } : x)]; }
  } else if (d.kind === 'fly') {
    stops = [...d.stops, ...added.map(a => ({ ...a, time: t('Evening') }))];
  } else {
    // Driving day: skipping a stop moves everything after it earlier by the stop's length.
    stops = [];
    for (const x of d.stops) {
      const skippable = SKIPPABLE.has(x.kind) && !!x.dur, pin = x.kind === 'pin';
      if ((skippable || pin) && dropped(x.label)) { if (skippable) saved += (STOP_DUR[x.kind] || 15); continue; }
      const h = x.time ? parseClock(x.time) : null;
      stops.push({ ...x, time: h != null && saved ? clock(h - saved / 60) : x.time, removable: skippable || pin });
    }
    // Places to see after arriving (the plan's own and those added) go between arrival and dinner,
    // one after another from half an hour after arrival.
    const isLater = (x: Omit<EditedStop, 'key'>) => x.kind === 'pin' && (x.time === t('Evening') || !x.time);
    const later = [...stops.filter(isLater), ...added];
    stops = stops.filter(x => !isLater(x));
    const arriveAt = stops.findIndex(x => x.kind === 'bed' || x.arrive), arrive = arriveAt >= 0 ? parseClock(stops[arriveAt].time) : null;
    if (arrive != null && (later.length || stops.some(x => x.driveH && !x.time))) {
      let h = Math.max(arrive + (later.length ? 0.33 : 0), 9);
      const timed = later.map(x => { const at = h; h += visitH(x.label) + 0.33; return { ...x, time: clock(at) }; });
      // A drive back (day trips) follows the sights.
      stops = stops.map(x => { if (!x.driveH || x.time) return x; const at = h; h += x.driveH; return { ...x, time: clock(at) }; });
      const dinner = stops.findIndex((x, i) => i > arriveAt && x.kind === 'food' && x.label === t('Dinner'));
      if (dinner >= 0) stops[dinner] = { ...stops[dinner], time: clock(Math.max(19.5, h + 0.5)) };
      stops.splice(arriveAt + 1, 0, ...timed);
    } else stops.push(...later.map(a => ({ ...a, time: t('Evening') })));
  }
  return { stops: stops.map((x, j) => ({ ...x, key: `${j}:${x.label}` })), places: stops.filter(x => x.kind === 'pin' && x.label !== t('Free day')).length, saved, warn };
}
