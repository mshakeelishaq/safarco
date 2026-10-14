// Circuits: more than one place on one trip, in the shortest order, home by the shortest way.
import { describe, expect, it } from 'vitest';
import { buildPlan, circuit, costFor, trip, type TripState } from '../src/engine/engine';

const base: TripState = { origin: 'Lahore', mode: 'know', dest: 'hunza', corridor: 'hunza', startDate: '2027-07-10', days: 10, depart: null,
  vehicle: 'suv', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 600000 };

describe('circuits', () => {
  it('orders Naran, Hunza and Skardu as one loop, nearest first', () => {
    const L = circuit({ ...base, extra: ['skardu', 'naran'] })!;
    expect(L.order).toEqual(['naran', 'hunza', 'skardu']);
    expect(L.hops.map(h => h.to)).toEqual(['naran', 'hunza', 'skardu', 'HOME']);
    // The loop is shorter than three separate there-and-back trips.
    const separate = ['naran', 'hunza', 'skardu'].reduce((a, k) => a + 2 * trip(k, 'Lahore', 7).km, 0);
    expect(L.km).toBeLessThan(separate);
  });
  it('plans every place with nights there, and ends at home', () => {
    const p = buildPlan({ ...base, extra: ['skardu', 'naran'] });
    expect(p.loop).toBe(true);
    expect(p.days).toHaveLength(10);
    const towns = new Set(p.days.flatMap(d => d.stay ? [d.stay.town] : []));
    ['Naran', 'Karimabad, Hunza', 'Skardu'].forEach(t => expect(towns.has(t)).toBe(true));
    expect(p.days[p.days.length - 1].kind).toBe('return');
    expect(p.days[p.days.length - 1].stay).toBeNull();
  });
  it('costs the loop once, not there and back', () => {
    const one = costFor(base), loop = costFor({ ...base, extra: ['skardu', 'naran'] });
    const fuel = (c: typeof one) => c.rows.find(r => r.label === 'Fuel')!.val;
    expect(fuel(loop)).toBeGreaterThan(fuel(one));
    expect(fuel(loop)).toBeLessThan(fuel(one) * 2);
    expect(costFor({ ...base, extra: ['skardu', 'naran'], days: 5 }).ok).toBe(false);
  });
  it('keeps one-place trips and flights as they were', () => {
    expect(circuit(base)).toBeNull();
    expect(circuit({ ...base, vehicle: 'air', extra: ['naran'] })).toBeNull();
    expect(costFor({ ...base, vehicle: 'air', extra: ['naran'] }).ok).toBe(false);
  });
});

describe('places close together on one trip', () => {
  it('a nearby place is a day trip from the base, unless you choose to sleep there', async () => {
    const { buildPlan, circuit } = await import('../src/engine/engine');
    const s = { origin: 'Islamabad', mode: 'know' as const, dest: 'skardu', corridor: 'skardu', extra: ['shigar'], startDate: '2026-11-03', days: 9, depart: null, vehicle: 'suv' as const, tier: 'standard' as const, adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate' as const, cap: 1e6 };
    expect(circuit(s)).toBeNull();
    const days = buildPlan(s).days, trip = days.find(d => d.side)!;
    expect(trip.side).toMatchObject({ id: 'shigar', base: 'skardu', sleeping: false });
    expect(trip.stay!.town).toBe('Skardu');
    expect(trip.stops.at(-2)!.label).toBe('Back to Skardu');
    expect(days.every(d => d.stay?.town !== 'Shigar')).toBe(true);
    const sleep = buildPlan({ ...s, sleepAt: ['shigar'] }).days;
    expect(sleep.some(d => d.stay?.town === 'Shigar' && d.side?.sleeping)).toBe(true);
  });

  it('when sleeping there, the short hop is the morning of a day there, and shared sights are seen once', async () => {
    const { buildPlan, circuit } = await import('../src/engine/engine');
    const s = { origin: 'Islamabad', mode: 'know' as const, dest: 'skardu', corridor: 'skardu', extra: ['shigar'], sleepAt: ['shigar'], startDate: '2026-11-03', days: 9, depart: null, vehicle: 'suv' as const, tier: 'standard' as const, adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate' as const, cap: 1e6 };
    const L = circuit(s)!;
    expect(L.hops.find(h => h.to === 'shigar')!.short).toBe(true);
    const days = buildPlan(s).days, hop = days.find(d => d.title === 'Skardu → Shigar')!;
    expect(hop.stops.some(x => x.kind === 'pin')).toBe(true);
    expect(days.some(d => d.title === 'Explore Shigar' && days.indexOf(d) === days.indexOf(hop) + 1 && !d.stops.some(x => x.kind === 'pin'))).toBe(false);
    const pins = days.flatMap(d => d.stops.filter(x => x.kind === 'pin').map(x => x.label.toLowerCase()));
    expect(pins.filter(x => x.startsWith('shigar fort')).length).toBe(1);
  });
});

describe('comfort: fewer hotel changes', () => {
  it('sees nearby places on day trips from one hotel, only when asked', () => {
    const s = { ...base, dest: 'naran', corridor: 'naran', extra: ['shogran'], days: 9 };
    expect(buildPlan(s).days.some(d => d.side && !d.side.sleeping)).toBe(false);
    const days = buildPlan({ ...s, comfort: true }).days;
    expect(days.find(d => d.side && !d.side.sleeping)?.side?.id).toBe('shogran');
    expect(days.filter(d => d.stay?.town && d.kind !== 'return').every(d => d.stay!.town === 'Naran')).toBe(true);
  });
  it('makes Khaplu a day trip from Skardu', () => {
    const days = buildPlan({ ...base, dest: 'skardu', corridor: 'skardu', extra: ['khaplu'], days: 9, comfort: true }).days;
    expect(days.find(d => d.side && !d.side.sleeping)?.side?.id).toBe('khaplu');
  });
});

describe('a day trip on a free day', () => {
  it('offers nearby places and turns a free day into the trip, same length', async () => {
    const { dayTripOptions } = await import('../src/engine/engine');
    expect(dayTripOptions('hunza', 7, ['hunza']).map(o => o.id)).toContain('nagar');
    const s = { ...base, dest: 'naran', corridor: 'naran', days: 7 };
    const before = buildPlan(s).days, after = buildPlan({ ...s, extra: ['shogran'], dayTrips: ['shogran'] }).days;
    expect(after).toHaveLength(before.length);
    expect(after.find(d => d.side && !d.side.sleeping)?.side?.id).toBe('shogran');
    expect(after.filter(d => d.title.startsWith('Free day')).length).toBe(before.filter(d => d.title.startsWith('Free day')).length - 1);
  });
});
