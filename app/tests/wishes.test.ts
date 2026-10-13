// "What do you want to see?": places and months for each wish, and suggestions that follow it.
import { describe, expect, it } from 'vitest';
import { suggestions, type TripState } from '../src/engine/engine';
import { WISHES, wishPlaces } from '../src/engine/seasons';
import { UR } from '../src/i18n/ur';

describe('wishes', () => {
  it('finds the right places for each wish', () => {
    const ids = (w: Parameters<typeof wishPlaces>[0]) => wishPlaces(w).map(p => p.id);
    expect(ids('autumn')).toEqual(expect.arrayContaining(['hunza', 'skardu']));
    expect(ids('blossom')).toEqual(expect.arrayContaining(['hunza', 'skardu']));
    expect(ids('snow')).toEqual(expect.arrayContaining(['murree', 'malam', 'nathia']));
    expect(ids('beach')).toEqual(expect.arrayContaining(['gwadar', 'kundmalir']));
    expect(ids('green')).toEqual(expect.arrayContaining(['naran', 'kumrat', 'kalam']));
    expect(ids('green')).not.toContain('gwadar');
    WISHES.forEach(w => expect(wishPlaces(w.id).length).toBeGreaterThan(2));
  });
  it('has its months match its places, and Roman Urdu for its words', () => {
    WISHES.forEach(w => wishPlaces(w.id).forEach(p => expect(p.h.months.some(m => w.months.includes(m))).toBe(true)));
    WISHES.forEach(w => { expect(UR[w.label]).toBeTruthy(); expect(UR[w.tagline]).toBeTruthy(); });
  });
  it('puts places for the wish first in suggestions', () => {
    const s: TripState & { pickId: null } = { origin: 'Islamabad', mode: 'suggest', dest: 'hunza', corridor: 'hunza', startDate: '2027-01-10', days: 5, depart: null,
      vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 400000, wish: 'snow', pickId: null };
    const snow = new Set(wishPlaces('snow').map(p => p.id));
    expect(snow.has(suggestions(s).list[0].corridor)).toBe(true);
  });
});

describe('trip photos', () => {
  it('uses the autumn mix only for autumn trips to autumn-colour places, the same photo each time', async () => {
    const { destPhoto } = await import('../src/photos');
    expect(destPhoto('hunza', 11, '2026-11-02')).not.toBeNull();
    expect(destPhoto('skardu', 10, '2026-10-20')).not.toBeNull();
    expect(destPhoto('hunza', 7, '2026-07-02')).toBeNull();
    expect(destPhoto('gwadar', 11, '2026-11-02')).toBeNull();
    expect(destPhoto('hunza', 11, '2026-11-02')).toEqual(destPhoto('hunza', 11, '2026-11-02'));
  });
});
