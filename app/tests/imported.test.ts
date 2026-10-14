import { describe, expect, it } from 'vitest';
import { DESTS } from '../src/engine/data';
import { buildPlan, costFor, type TripState } from '../src/engine/engine';
import { IMPORTED_DESTS, PLACE_INFO } from '../src/engine/imported';

const base: TripState = {
  origin: 'Lahore', mode: 'know', dest: 'hunza', corridor: 'hunza', startDate: '2027-05-10', days: 8, depart: null,
  vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 200000
};

describe('guides imported from the places spreadsheet', () => {
  it('have unique ids and every day plan uses places the destination has', () => {
    expect(new Set(DESTS.map(d => d.id)).size).toBe(DESTS.length);
    for (const d of DESTS) for (const day of d.days || []) for (const n of day.places) expect(d.places!.map(p => p[0]), `${d.id}: ${n}`).toContain(n);
  });

  it('are in Pakistan, with places, and plan a trip without errors', () => {
    for (const d of IMPORTED_DESTS) {
      expect(d.lat).toBeGreaterThan(23.5); expect(d.lat).toBeLessThan(37.2); expect(d.lon).toBeGreaterThan(60.8); expect(d.lon).toBeLessThan(77.9);
      expect(d.places!.length).toBeGreaterThan(0);
      expect(d.checked).not.toBe(true);
      const s = { ...base, dest: d.id, corridor: d.id, origin: d.name === 'Lahore' ? 'Karachi' : 'Lahore' };
      expect(buildPlan(s).days.length).toBeGreaterThan(0);
      expect(costFor(s).total).toBeGreaterThan(0);
    }
  });

  it('only pins places inside Pakistan', () => {
    for (const [k, v] of Object.entries(PLACE_INFO)) if (v.lat != null) expect(v.lat > 23.5 && v.lat < 37.2 && v.lon! > 60.8 && v.lon! < 77.9, k).toBe(true);
  });
});

describe('no place twice', () => {
  it('Hunza shows Hussaini Bridge and Passu Cones once each', async () => {
    const { buildPlan } = await import('../src/engine/engine');
    const days = buildPlan({ origin: 'Lahore', mode: 'know', dest: 'hunza', corridor: 'hunza', startDate: '2026-10-20', days: 9, depart: null,
      vehicle: 'suv', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 600000 }).days;
    const pins = days.flatMap(d => d.stops.filter(s => s.kind === 'pin').map(s => s.label));
    expect(pins.filter(l => /hussaini/i.test(l))).toHaveLength(1);
    expect(pins.filter(l => /passu cones/i.test(l))).toHaveLength(1);
    expect(new Set(pins).size).toBe(pins.length);
  });
});

describe('every sight once per trip', () => {
  const s0: TripState = { origin: 'Lahore', mode: 'know', dest: 'x', corridor: 'x', startDate: '2027-07-10', days: 6, depart: null,
    vehicle: 'suv', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 5000000, capOn: false };
  const repeats = (s: TripState) => {
    const labels = buildPlan(s).days.flatMap(d => d.stops.filter(x => (x.kind === 'pin' || x.kind === 'view') && !/free day/i.test(x.label)).map(x => x.label.toLowerCase()));
    return labels.filter((l, i) => labels.indexOf(l) !== i);
  };
  it('no viewpoint or place is shown twice, there and back, at any destination', () => {
    for (const D of DESTS) for (const days of [3, 6, 10]) expect(repeats({ ...s0, origin: /sindh|balochistan/i.test(D.region) ? 'Karachi' : 'Lahore', dest: D.id, corridor: D.id, days }), `${D.id} ${days}`).toEqual([]);
  });
  it('nor on trips to two places', () => {
    for (const [a, b] of [['skardu', 'khaplu'], ['hunza', 'skardu'], ['hunza', 'passu'], ['naran', 'neelum'], ['skardu', 'shigar']]) expect(repeats({ ...s0, dest: a, corridor: a, extra: [b], days: 12 }), `${a}+${b}`).toEqual([]);
  });
  it('a combined place is not imported again as separate ones', () => {
    const naltar = (DESTS.find(d => d.id === 'naltar')?.places || []).map(p => p[0]);
    expect(naltar.filter(n => /satrangi|bodlok/i.test(n))).toHaveLength(1);
  });
});

describe('places in one spot', () => {
  it('the two Uch tombs are seen together', () => {
    const days = buildPlan({ origin: 'Lahore', mode: 'know', dest: 'uch', corridor: 'uch', startDate: '2026-12-10', days: 4, depart: null, vehicle: 'suv', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 5000000, capOn: false }).days;
    const day = days.find(d => d.stops.some(x => /Bibi Jawindi/.test(x.label)))!.stops.map(x => x.label);
    expect(day.some(l => /Baha/.test(l))).toBe(true);
  });
});

describe('what to eat', () => {
  it('every destination has a food guide, and sightseeing days know their place', async () => {
    const { FOOD } = await import('../src/engine/food');
    expect(DESTS.filter(d => !FOOD[d.id]).map(d => d.id)).toEqual([]);
    const days = buildPlan({ origin: 'Lahore', mode: 'know', dest: 'skardu', corridor: 'skardu', startDate: '2026-11-03', days: 6, depart: null, vehicle: 'suv', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 5000000, capOn: false }).days;
    expect(days.filter(d => d.kind === 'explore').every(d => d.dest === 'skardu')).toBe(true);
  });
});
