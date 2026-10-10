import { describe, expect, it } from 'vitest';
import { initialState, type AppState } from '../state';
import { parseRequest, passAnswer, runTool } from './tools';

const st = (): AppState => ({ ...initialState(), screen: 'app', origin: 'Lahore', mode: 'know' });

describe('free co-pilot parser', () => {
  it('handles the suggested prompts', () => {
    expect(parseRequest('Switch to Fairy Meadows, we\'re in a Corolla', { ...st(), vehicle: 'suv' }).calls)
      .toEqual([['set_destination', { place: 'Fairy Meadows' }], ['set_transport', { mode: 'sedan' }]]);
    expect(parseRequest('We\'re 5 friends now, keep it backpacker', st()).calls)
      .toEqual([['set_stay_level', { tier: 'backpacker' }], ['set_travellers', { adults: 5, kids: 0, elders: 0 }]]);
    const dec = parseRequest('Make it December, leave at 6 am', st()).calls;
    expect(dec[0][0]).toBe('set_dates');
    expect(String(dec[0][1].start_date)).toMatch(/-12-/);
    expect(dec[1]).toEqual(['set_departure_time', { time: '6:00' }]);
    expect(parseRequest('Take my parents too, family rooms', st()).calls)
      .toEqual([['set_rooms', { rooms: 'shared' }], ['set_travellers', { adults: 2, kids: 0, elders: 2 }]]);
    expect(parseRequest('Is Babusar Pass open on my dates?', st()).passQuestion).toBe(true);
  });

  it('reads budgets, origins and Roman Urdu counts', () => {
    expect(parseRequest('budget 1.5 lakh from Karachi', st()).calls).toEqual([['set_origin', { city: 'Karachi' }], ['set_budget', { pkr: 150000 }]]);
    expect(parseRequest('hum teen dost hain', st()).calls).toEqual([['set_travellers', { adults: 3, kids: 0, elders: 0 }]]);
  });
});

describe('tools', () => {
  it('apply patches to state and return a summary', () => {
    const s = st(), patches: object[] = [];
    const out = runTool('set_destination', { place: 'Skardu' }, { st: s, apply: p => patches.push(p) });
    expect(s.corridor).toBe('skardu');
    expect(out).toMatch(/Lahore → Skardu/);
    expect(patches).toHaveLength(1);
  });

  it('answers pass questions from season data', () => {
    const s = { ...st(), corridor: 'skardu', startDate: '2027-12-10' };
    expect(passAnswer(s, '').reply).toMatch(/closed in December/);
    expect(passAnswer({ ...s, startDate: '2027-07-10' }, '').reply).toMatch(/open in July/);
  });
});
