import { afterEach, describe, expect, it } from 'vitest';
import { applyContent, cleanContent } from '../src/content';
import { DESTS, PLACE_INFO, POP_DEST, SECURITY_AREAS, riskOf } from '../src/engine/data';
import { DST } from '../src/engine/places';
import { FOOD } from '../src/engine/food';
import { buildPlan, closedOnRoute, trip } from '../src/engine/engine';
import { ownPhoto } from '../src/photos';
import { UR } from '../src/i18n/ur';

afterEach(() => applyContent(null));
const plan = (dest: string, origin = 'Islamabad', days = 5) => buildPlan({ origin, mode: 'know', dest, corridor: dest, startDate: '2027-07-10', days, depart: null, vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 300000 });

describe('admin content edits', () => {
  it('adds, edits and hides places, with pins, and day plans follow a rename', () => {
    const first = DST('hunza').places[0][0];
    applyContent({ places: { hunza: {
      add: [{ name: 'Test Spring', where: 'By car', note: 'Hot water', months: null, lat: 36.3, lon: 74.6, visit: 45 }],
      edit: { [first]: { name: first + ' (renamed)', where: 'On foot', note: 'Edited', months: null } },
      hide: ['Attabad Lake'] } } });
    const ps = DST('hunza').places.map(p => p[0]);
    expect(ps).toContain('Test Spring');
    expect(ps).toContain(first + ' (renamed)');
    expect(ps).not.toContain('Attabad Lake');
    expect(PLACE_INFO['hunza|Test Spring']).toMatchObject({ lat: 36.3, lon: 74.6, visit: 45 });
    expect(DST('hunza').places.find(p => p[0] === 'Test Spring')![4]).toContain('36.3,74.6');
    const all = plan('hunza', 'Islamabad', 7).days.flatMap(d => d.stops.map(x => x.label));
    expect(all).not.toContain('Attabad Lake');
  });
  it('goes back to the built-in guides when edits are removed', () => {
    const n = DST('hunza').places.length;
    applyContent({ places: { hunza: { add: [{ name: 'Temp', where: '', note: '', months: null }], edit: {}, hide: [] } } });
    expect(DST('hunza').places.length).toBe(n + 1);
    applyContent(null);
    expect(DST('hunza').places.length).toBe(n);
    expect(PLACE_INFO['hunza|Temp']).toBeUndefined();
  });
  it('edits destination details, food and photo, and switches a place off', () => {
    applyContent({ dests: { naran: { best: [6, 7, 8], warn: { months: [12, 1], text: 'Closed by snow.' }, photo: 'https://example.com/naran.jpg' }, chitral: { off: true } },
      food: { naran: [['Trout', 'River', 'Fresh']] }, ur: { 'Closed by snow.': 'Barf se band.' } });
    expect(DST('naran').best).toEqual([6, 7, 8]);
    expect(DST('naran').warn).toEqual([[1, 12], 'Closed by snow.']);
    expect(FOOD.naran).toEqual([['Trout', 'River', 'Fresh']]);
    expect(ownPhoto('naran')).toBe('https://example.com/naran.jpg');
    expect(DESTS.some(d => d.id === 'chitral')).toBe(false);
    expect(POP_DEST).not.toContain('chitral');
    expect(DST('chitral').name).toBe('Chitral');
    expect(UR['Closed by snow.']).toBe('Barf se band.');
    applyContent(null);
    expect(DESTS.some(d => d.id === 'chitral')).toBe(true);
    expect(UR['Closed by snow.']).toBeUndefined();
  });
  it('edits security areas', () => {
    applyContent({ security: [{ ...SECURITY_AREAS[0], on: false }] });
    expect(riskOf('gwadar')).toBeUndefined();
    applyContent({ security: [{ id: 'n25', name: 'N-25', on: true, dests: ['ziarat'], roads: [], nodes: [], short: 'Check first', text: 'Careful.' }] });
    expect(riskOf('ziarat')?.text).toBe('Careful.');
    applyContent(null);
    expect(riskOf('gwadar')).toBeTruthy();
  });
  it('routes round a closed road, or uses it when there is no other way', () => {
    const before = trip('hunza', 'Islamabad', 7).legs.map(l => l.road);
    const road = before.includes('Babusar Pass') ? 'Babusar Pass' : before.find(r => r !== 'Local roads')!;
    applyContent({ closures: [{ road, note: 'Landslide' }] });
    expect(closedOnRoute('hunza', 'Islamabad', 7)).toContain(road);
    const after = trip('hunza', 'Islamabad', 7).legs.map(l => l.road);
    expect(after.length).toBeGreaterThan(0);
  });
  it('cleans bad data', () => {
    const c = cleanContent({ places: { hunza: { add: [{ name: '' }, { name: 'X', months: [0, 13, 5] }] } }, dests: { naran: { photo: 'javascript:alert(1)' } } });
    expect(c.places.hunza.add).toHaveLength(1);
    expect(c.places.hunza.add[0].months).toEqual([5]);
    expect(c.dests.naran.photo).toBeUndefined();
  });
});
