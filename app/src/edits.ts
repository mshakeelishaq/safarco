// Places the traveller adds to or removes from the plan. The engine builds the plan;
// these edits are applied on top, so a changed plan (another destination or length) drops them.
import { SLOTS, STOP_DUR } from './engine/data';
import type { PlanDay, StopItem } from './engine/engine';
import { clock } from './engine/format';
import type { PlanEdits } from './state';
import { t } from './i18n';

/** Which plan a set of edits belongs to: same start, destination, length and way of travel. */
export const planKey = (s: { origin: string | null; corridor: string; days: number; vehicle: string }) => `${s.origin}|${s.corridor}|${s.days}|${s.vehicle === 'air' ? 'air' : 'road'}`;
export const dropKey = (day: number, label: string) => `${day}|${label}`;

/** "6:30 am" → 6.5 */
export const parseClock = (s: string) => {
  const m = /^(\d{1,2}):(\d{2}) (am|pm)$/.exec(s); if (!m) return null;
  return (+m[1] % 12) + (m[3] === 'pm' ? 12 : 0) + +m[2] / 60;
};

export interface EditedStop extends StopItem { removable?: boolean; added?: boolean; key: string }
export interface EditedDay { stops: EditedStop[]; places: number; saved: number }

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
  let saved = 0;

  if (d.kind === 'explore') {
    const free = t('Free day');
    const pins = d.stops.filter(x => x.kind === 'pin' && x.label !== free && !dropped(x.label)).map(x => ({ ...x, removable: true }));
    const all = [...pins, ...added.filter(a => !pins.some(p => p.label.toLowerCase() === a.label.toLowerCase()))].map((x, j) => ({ ...x, time: t(SLOTS[Math.min(j, 3)]) }));
    const rest = d.stops.filter(x => x.kind !== 'pin');
    stops = all.length ? [...all, ...rest] : [{ time: t('All day'), kind: 'pin', label: free, note: t('Rest, shop, or go back to a favourite spot') }, ...rest];
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
    stops.push(...added.map(a => ({ ...a, time: t('Evening') })));
  }
  return { stops: stops.map((x, j) => ({ ...x, key: `${j}:${x.label}` })), places: stops.filter(x => x.kind === 'pin' && x.label !== t('Free day')).length, saved };
}
