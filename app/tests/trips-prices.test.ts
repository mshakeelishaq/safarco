import { beforeEach, describe, expect, it } from 'vitest';
import { costFor, type TripState } from '../src/engine/engine';
import { addPlace } from '../src/engine/places';
import { DEFAULT_PRICES, applyPrices, checkedText } from '../src/prices';
import { cleanTrip, cloudMerge, localTrips, saveLocal, tripData } from '../src/trips';

// A small in-memory localStorage for node.
const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
beforeEach(() => mem.clear());

const trip: TripState = {
  origin: 'Lahore', mode: 'know', dest: 'skardu', corridor: 'skardu', startDate: '2027-07-10', days: 8, depart: null,
  vehicle: 'sedan', tier: 'standard', adults: 2, kids: 1, elders: 0, groupSize: 3, rooms: 'separate', cap: 200000
};

describe('saved trips', () => {
  it('round-trips through storage and rejects broken data', () => {
    const d = tripData({ ...trip, capOn: false, overnight: 'khaplu', roomCount: 3, sleepAt: ['shigar'], breaks: ['out:CHL'], have: 'car', wish: 'autumn', extra: ['naran'], edits: { key: 'Lahore|skardu|8|road', picks: [{ day: 3, name: 'Shangrila Lake', note: 'Lake · 25 km', href: 'https://www.google.com/maps/search/?api=1&query=Shangrila' }], drops: ['4|Deosai Plains'] } });
    expect(cleanTrip(JSON.parse(JSON.stringify(d)))).toEqual(d);
    // Added places keep only safe links; an unknown vehicle choice falls back to "suggest".
    const bad = cleanTrip({ ...d, have: 'tank', edits: { key: 'x', picks: [{ day: 1, name: 'X', note: '', href: 'javascript:alert(1)' }], drops: [] } })!;
    expect(bad.have).toBe('any'); expect(bad.edits!.picks[0].href).toBe('');
    // Trips saved before the limit became optional keep their limit.
    expect(cleanTrip({ ...d, capOn: undefined })!.capOn).toBe(true);
    expect(cleanTrip({ ...d, origin: 'Atlantis' })).toBeNull();
    expect(cleanTrip({ ...d, corridor: '<script>' })).toBeNull();
    expect(cleanTrip({ ...d, days: 99, adults: -3 })).toMatchObject({ days: 14, adults: 1 });
  });

  it('carries places found by search, so a shared link opens on another phone', () => {
    addPlace('Sost Village', 'Gilgit-Baltistan', 36.69, 74.82);
    const d = tripData({ ...trip, corridor: 'city:Sost Village', dest: 'city:Sost Village' });
    expect(d.places).toEqual([{ n: 'Sost Village', p: 'Gilgit-Baltistan', lat: 36.69, lon: 74.82 }]);
  });

  it('merges account trips without duplicating', () => {
    saveLocal({ id: 'a', name: 'Mine', data: tripData(trip), savedAt: '2026-10-01T00:00:00Z', cloudId: 'c1' });
    cloudMerge([{ id: 'c1', cloudId: 'c1', name: 'Mine', data: tripData(trip), savedAt: '2026-10-01T00:00:00Z' }, { id: 'c2', cloudId: 'c2', name: 'Other', data: tripData(trip), savedAt: '2026-10-02T00:00:00Z' }]);
    expect(localTrips().map(t => t.name)).toEqual(['Other', 'Mine']);
  });
});

describe('price list', () => {
  it('starts unchecked and changes costs when the admin updates prices', () => {
    expect(checkedText('fuel')).toBe('not checked yet');
    const before = costFor(trip).rows.find(r => r.label === 'Fuel')!.val;
    applyPrices({ ...DEFAULT_PRICES, fuel: { petrol: DEFAULT_PRICES.fuel.petrol * 2, diesel: 400 }, checked: { ...DEFAULT_PRICES.checked, fuel: '2026-10-01' } });
    expect(costFor(trip).rows.find(r => r.label === 'Fuel')!.val).toBeCloseTo(before * 2, 6);
    expect(checkedText('fuel')).toBe('checked 1 Oct 2026');
    applyPrices(null);
  });

  it('ignores bad values and keeps defaults for missing fields', () => {
    const l = applyPrices({ fuel: { petrol: -5, diesel: NaN } } as never);
    expect(l.fuel).toEqual(DEFAULT_PRICES.fuel);
    expect(l.stays).toEqual(DEFAULT_PRICES.stays);
  });
});

describe('researched prices', () => {
  it('fill every field they name and mark only their sections checked', async () => {
    const { DEFAULT_PRICES, tollRoads } = await import('../src/prices');
    const { withResearched, RESEARCHED, RESEARCHED_ON } = await import('../src/researched');
    const l = withResearched(DEFAULT_PRICES);
    for (const k of Object.keys(RESEARCHED.tolls!)) expect(tollRoads().map(t => t.key)).toContain(k);
    for (const k of Object.keys(RESEARCHED.jeeps!)) expect(Object.keys(DEFAULT_PRICES.jeeps)).toContain(k);
    expect(l.fuel.petrol).toBe(398.3);
    expect(l.tolls['LHR-ISB']).toBe(1430);
    expect(l.checked.fuel).toBe(RESEARCHED_ON);
    expect(l.checked.fares).toBe('');
    expect(DEFAULT_PRICES.checked.fuel).toBe('');
  });
});

describe('price freshness', () => {
  it('flags prices that are older than they usually stay right', async () => {
    const { applyPrices, checkedText, isStale } = await import('../src/prices');
    applyPrices({ checked: { fuel: '2026-10-01', tolls: '2026-10-01', stays: '', hire: '', coach: '', fares: '', jeeps: '' } });
    const now = new Date('2026-10-12T12:00');
    expect(checkedText('fuel', now)).toBe('checked 1 Oct 2026');
    expect(isStale('fuel', new Date('2026-10-30T12:00'))).toBe(true);
    expect(checkedText('fuel', new Date('2026-10-30T12:00'))).toBe('checked 1 Oct 2026, may have changed since');
    expect(isStale('tolls', new Date('2026-10-30T12:00'))).toBe(false);
    expect(isStale('stays', now)).toBe(true);
    applyPrices(null);
  });

  it('shows flight fares as tentative, never as out of date', async () => {
    const { checkedText, isStale } = await import('../src/prices');
    expect(isStale('fares')).toBe(false);
    expect(checkedText('fares')).toBe('tentative, check live fares before booking');
  });
});

describe('flight search link', () => {
  it('opens Google Flights for the route, date and travellers, in rupees', async () => {
    const { flightSearchUrl } = await import('../src/money');
    const u = new URL(flightSearchUrl('Islamabad', 'Skardu', '2026-11-02', 2, 1));
    expect(u.hostname).toBe('www.google.com');
    expect(u.searchParams.get('curr')).toBe('PKR');
    expect(u.searchParams.get('q')).toBe('One way flights from Islamabad to Skardu on 2026-11-02 for 2 adults and 1 child');
  });
});
