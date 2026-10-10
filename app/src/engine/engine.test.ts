import { describe, expect, it } from 'vitest';
import { buildPlan, costFor, suggestions, trip, type TripState } from './engine';

const base: TripState = {
  origin: 'Lahore', mode: 'know', dest: 'skardu', corridor: 'skardu', startDate: '2027-07-10', days: 6, depart: null,
  vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 200000
};

// Expected figures match the v7 prototype's engine (project/SafarCo App v7.dc.html).
describe('road routing', () => {
  it('Lahore → Skardu in July crosses Babusar in three daylight driving days', () => {
    const t = trip('skardu', 'Lahore', 7);
    expect(t.km).toBe(1010);
    expect(t.legDays).toBe(3);
    expect(t.minDays).toBe(7);
    expect(t.legs.some(l => /Babusar/.test(l.road))).toBe(true);
  });

  it('Babusar is skipped in December and Lahore → Hunza needs 7 days', () => {
    const t = trip('hunza', 'Lahore', 12);
    expect(t.legs.some(l => /Babusar/.test(l.road))).toBe(false);
    expect(t.minDays).toBe(7);
    expect(trip('hunza', 'Lahore', 7).minDays).toBe(5);
  });

  it('Islamabad → Kalam fits in 3 days', () => {
    expect(trip('kalam', 'Islamabad', 7).minDays).toBe(3);
  });

  it('Shogran goes via Balakot and Kiwai', () => {
    expect(trip('shogran', 'Lahore', 7).legs.map(l => l.b)).toEqual(expect.arrayContaining(['MNS', 'KWI', 'SHG']));
  });
});

describe('day plan', () => {
  it('splits Lahore → Skardu at Mansehra and Chilas and adds explore days', () => {
    const p = buildPlan({ ...base, days: 8 });
    expect(p.days.map(d => d.kind)).toEqual(['drive', 'drive', 'drive', 'explore', 'explore', 'return', 'return', 'return']);
    expect(p.days.map(d => d.title).slice(0, 3)).toEqual(['Lahore → Mansehra', 'Mansehra → Chilas', 'Chilas → Skardu']);
    expect(p.days[1].stay?.name).toBe('Shangrila Midway House Chilas');
  });
});

describe('costs', () => {
  it('a motorbike burns far less fuel than a sedan, and a 4x4 more', () => {
    const fuel = (vehicle: TripState['vehicle']) => costFor({ ...base, vehicle }).rows.find(r => r.label === 'Fuel')!.val;
    expect(fuel('bike')).toBeLessThan(fuel('sedan') / 2);
    expect(fuel('suv')).toBeGreaterThan(fuel('sedan'));
  });

  it('flags trips shorter than the minimum days', () => {
    expect(costFor({ ...base, days: 3 }).ok).toBe(false);
  });

  it('adds the Raikot jeep for Fairy Meadows in a sedan only', () => {
    const fm = { ...base, dest: 'fairy', corridor: 'fairy' };
    expect(costFor(fm).rows.some(r => r.label === 'Local jeep')).toBe(true);
    expect(costFor({ ...fm, vehicle: 'suv' }).rows.some(r => r.label === 'Local jeep')).toBe(false);
  });
});

describe('suggestions', () => {
  it('picks a best match within budget', () => {
    const { list, sel } = suggestions({ ...base, days: 8, pickId: null });
    expect(list.length).toBeGreaterThan(3);
    expect(sel.best).toBe(true);
    expect(sel.total).toBeLessThanOrEqual(base.cap);
  });
});
