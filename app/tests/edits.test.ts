// Adding and removing places, the traveller's own vehicle, and the trip styles offered for it.
import { describe, expect, it } from 'vitest';
import { buildPlan, configsFor, roadFit, suggestions, type TripState } from '../src/engine/engine';
import { dropKey, editDay, parseClock, planKey } from '../src/edits';
import { NO_EDITS } from '../src/state';

const base: TripState = { origin: 'Lahore', mode: 'know', dest: 'hunza', corridor: 'hunza', startDate: '2027-07-12', days: 7, depart: null,
  vehicle: 'suv', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 400000 };

describe('editing the plan', () => {
  const plan = buildPlan(base), ex = plan.days.findIndex(d => d.kind === 'explore'), drive = plan.days.findIndex(d => d.kind === 'drive' && d.stops.some(x => x.dur));
  const key = planKey(base);

  it('removes and adds places on an explore day, renumbering the slots', () => {
    const first = plan.days[ex].stops[0].label;
    const e = { key, picks: [{ day: ex, name: 'Borith Lake', note: 'Lake', href: '' }], drops: [dropKey(ex, first)] };
    const d = editDay(plan.days[ex], ex, e);
    const pins = d.stops.filter(x => x.kind === 'pin');
    expect(pins.map(x => x.label)).not.toContain(first);
    expect(pins[pins.length - 1]).toMatchObject({ label: 'Borith Lake', added: true, removable: true });
    expect(pins[0].time).toBe('Morning');
    expect(d.places).toBe(pins.length);
  });

  it('turns a day with every place removed into a free day', () => {
    const drops = plan.days[ex].stops.filter(x => x.kind === 'pin').map(x => dropKey(ex, x.label));
    expect(editDay(plan.days[ex], ex, { key, picks: [], drops }).stops[0].label).toBe('Free day');
  });

  it('moves later times earlier when a stop on a driving day is skipped', () => {
    const d = plan.days[drive], stop = d.stops.find(x => x.dur)!, last = d.stops[d.stops.length - 1];
    const e = editDay(d, drive, { key, picks: [], drops: [dropKey(drive, stop.label)] });
    expect(e.stops.some(x => x.label === stop.label)).toBe(false);
    expect(e.saved).toBeGreaterThan(0);
    expect(parseClock(e.stops[e.stops.length - 1].time)! - parseClock(last.time)!).toBeCloseTo(-e.saved / 60, 2);
  });

  it('changes nothing without edits', () => {
    plan.days.forEach((d, i) => expect(editDay(d, i, NO_EDITS).stops.map(x => x.label)).toEqual(d.stops.map(x => x.label)));
  });
});

describe('own vehicle', () => {
  it('offers only the traveller’s own vehicle', () => {
    expect(configsFor({ have: 'car', groupSize: 2 }).every(c => c.vehicle === 'sedan')).toBe(true);
    expect(configsFor({ have: 'bike', groupSize: 2 }).every(c => c.vehicle === 'bike')).toBe(true);
    expect(configsFor({ have: 'any', groupSize: 2 }).some(c => c.vehicle === 'air')).toBe(true);
    expect(suggestions({ ...base, have: 'car', pickId: null }).list.every(x => x.vehicle === 'sedan')).toBe(true);
  });
  it('warns sedans about jeep-only last stretches', () => {
    expect(roadFit('sedan', 'fairy', 'Lahore', 7)?.text).toMatch(/jeep/);
    expect(roadFit('suv', 'fairy', 'Lahore', 7)).toBeNull();
    expect(roadFit('sedan', 'hunza', 'Lahore', 7)).toBeNull();
  });
});

describe('places added to a driving day', () => {
  it('go after arriving, with times, and dinner stays last', async () => {
    const { editDay } = await import('../src/edits');
    const day = { kind: 'drive', title: 'Skardu → Shigar', meta: '', note: '', stay: null, stops: [
      { time: '7:30 am', kind: 'food', label: 'Breakfast', note: '' }, { time: '8:00 am', kind: 'go', label: 'Leave Skardu', note: '' },
      { time: '', kind: 'drive', label: '54 min drive', note: '', isDrive: true }, { time: '8:54 am', kind: 'bed', label: 'Arrive Shigar', note: '' },
      { time: '7:30 pm', kind: 'food', label: 'Dinner', note: '' }] } as never;
    const e = { key: 'k', drops: [], picks: [{ day: 0, name: 'Shigar Fort', note: '', href: '' }, { day: 0, name: 'Amburiq Mosque', note: '', href: '' }] };
    const out = editDay(day, 0, e).stops.map(x => `${x.time} ${x.label}`);
    expect(out.indexOf('Dinner'.padStart(0)) === -1).toBe(true);
    const labels = out.map(x => x.replace(/^\S+ (am|pm) /, '').replace(/^ /, ''));
    expect(labels.indexOf('Shigar Fort')).toBe(labels.indexOf('Arrive Shigar') + 1);
    expect(labels[labels.length - 1]).toBe('Dinner');
    expect(out.find(x => x.endsWith('Shigar Fort'))).toMatch(/^9:2\d am/);
  });
});
