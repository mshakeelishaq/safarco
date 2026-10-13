import { describe, expect, it } from 'vitest';
import { buildPlan, type TripState } from '../src/engine/engine';
import { parseClock } from '../src/edits';
import { cleanTrip, tripData } from '../src/trips';

const base: TripState = {
  origin: 'Islamabad', mode: 'know', dest: 'skardu', corridor: 'skardu', startDate: '2026-11-03', days: 7, depart: null,
  vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 200000
};
const leave = (d: { stops: { kind: string; time: string }[] }) => parseClock(d.stops.find(x => x.kind === 'go')!.time)!;

describe('departure time for each day', () => {
  it('suggests a time for every driving day that arrives before sunset', () => {
    buildPlan(base).days.filter(d => d.track).forEach(d => {
      expect(d.depart).toBeTruthy();
      expect(d.depart!.at).toBe(d.depart!.rec);
      expect(d.depart!.rec).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('a chosen time moves only that day', () => {
    const a = buildPlan(base).days, b = buildPlan({ ...base, departAt: { 0: 6 } }).days;
    expect(leave(b[0])).toBe(6);
    expect(b[0].depart!.own).toBe(true);
    expect(leave(b[1])).toBe(leave(a[1]));
  });

  it('has breakfast before leaving, lunch around midday and dinner', () => {
    const d = buildPlan(base).days[0], labels = d.stops.map(x => x.label);
    expect(labels[0]).toMatch(/Breakfast/);
    expect(d.stops.some(x => x.kind === 'food' && /Lunch/.test(x.note + x.label))).toBe(true);
    expect(labels[labels.length - 1]).toBe('Dinner');
  });

  it('is saved and shared with the trip', () => {
    const d = tripData({ ...base, edits: { key: 'k', picks: [], drops: [], times: { 0: 6, 3: 7.5 } } });
    expect(cleanTrip(JSON.parse(JSON.stringify(d)))!.edits!.times).toEqual({ 0: 6, 3: 7.5 });
    expect(cleanTrip({ ...d, edits: { key: 'k', picks: [], drops: [], times: { 0: 99, x: 5 } } })!.edits!.times).toBeUndefined();
  });
});
