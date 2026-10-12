// Trusted hotels, drivers and road alerts the admin adds, and which trips they reach.
import { afterEach, describe, expect, it } from 'vitest';
import { isoAdd } from '../src/engine/format';
import { AREAS, kmFromLine, onTrip, waLink } from '../src/local';
import { applyPrices } from '../src/prices';
import { clearRated } from '../src/rated';
import { ratingOf, setReviews } from '../src/reviews';
import { initialState, type AppState } from '../src/state';
import { buildView, type Api } from '../src/view';

const api = { set: () => {}, later: () => {}, locate: () => {}, setPeople: () => {}, toggleOffline: () => {}, share: () => {}, newTrip: () => {} } as unknown as Api;
const trip = (p: Partial<AppState>): AppState => ({ ...initialState(), screen: 'app', origin: 'Lahore', mode: 'know', startDate: isoAdd(30), days: 8, vehicle: 'sedan', tier: 'standard', ...p });
const view = (p: Partial<AppState>) => buildView(trip(p), api);
const id = (name: string) => AREAS.find(a => a.name === name)!.id;

afterEach(() => { applyPrices(null); setReviews([]); clearRated(); });

describe('places and phone numbers', () => {
  it('lists destinations, towns and passes once each', () => {
    expect(AREAS.some(a => a.name === 'Babusar Top' && a.group === 'Passes')).toBe(true);
    expect(AREAS.filter(a => a.name.toLowerCase().startsWith('skardu')).length).toBe(1);
  });
  it('turns Pakistani numbers into WhatsApp links', () => {
    expect(waLink('0300 1234567')).toBe('https://wa.me/923001234567');
    expect(waLink('+92 300-1234567')).toBe('https://wa.me/923001234567');
    expect(waLink('12')).toBe('');
  });
  it('measures distance to a road line', () => {
    expect(kmFromLine(35.147, 74.063, [[73.65, 34.91], [74.1, 35.42]])).toBeLessThan(20);
    expect(onTrip([id('Babusar Top')], [[67.0, 24.86], [62.3, 25.12]], [])).toBe(false);
  });
});

describe('admin contacts and alerts in a trip', () => {
  it('shows a Babusar alert on a Skardu road trip but not on a Gwadar trip', () => {
    applyPrices({ alerts: [{ title: 'Babusar Pass closed: snow', message: '', date: isoAdd(0), areas: [id('Babusar Top')] }, { title: 'Fog on motorways', message: '', date: isoAdd(0), areas: [] }] });
    const sk = view({ dest: 'skardu', corridor: 'skardu', startDate: '2027-07-10' }).seasonNotes.map(n => n.text).join(' | ');
    expect(sk).toContain('Babusar Pass closed');
    const gw = view({ origin: 'Karachi', dest: 'gwadar', corridor: 'gwadar' }).seasonNotes.map(n => n.text).join(' | ');
    expect(gw).not.toContain('Babusar');
    expect(gw).toContain('Fog on motorways');
    // In winter the route avoids Babusar, so its alert stays off.
    expect(view({ dest: 'skardu', corridor: 'skardu', startDate: '2027-01-10' }).seasonNotes.map(n => n.text).join(' | ')).not.toContain('Babusar Pass closed');
  });

  it('puts trusted hotels first on nights in their town, with WhatsApp', () => {
    applyPrices({ hotels: [{ id: 'h1', name: 'Pine Lodge', area: id('Naran'), tier: 'standard', price: 9000, phone: '0300 1112223', note: 'Heated rooms', checked: '2026-10-12', active: true },
      { id: 'h2', name: 'Hidden Inn', area: id('Naran'), tier: 'standard', price: 9000, phone: '', note: '', checked: '', active: false }] });
    const v = view({ dest: 'naran', corridor: 'naran', days: 4, startDate: '2027-06-10' });
    const night = v.plan.days.find(d => d.stay && /Naran/.test(d.stay.place))!.stay!;
    expect(night.options[0]).toMatchObject({ name: 'Pine Lodge', trusted: true, wa: 'https://wa.me/923001112223' });
    expect(night.options[0].note).toContain('PKR 9,000 a night');
    expect(night.options.some(o => o.name === 'Hidden Inn')).toBe(false);
  });

  it('lists trusted drivers only on trips that pass their place', () => {
    applyPrices({ drivers: [{ id: 'd1', name: 'Karim', area: id('Raikot Bridge'), vehicle: 'Jeep', seats: 5, rate: 9000, phone: '03001234567', note: '', checked: '', active: true }] });
    expect(view({ dest: 'skardu', corridor: 'skardu' }).drivers.map(d => d.name)).toEqual(['Karim']);
    expect(view({ origin: 'Karachi', dest: 'gwadar', corridor: 'gwadar' }).drivers).toEqual([]);
  });

  it('drops half-filled entries when loading', () => {
    const l = applyPrices({ hotels: [{ name: '', area: 'x' } as never, { name: 'A', area: '' } as never], drivers: [{ name: 'B', area: 'n:CHL', active: undefined } as never] });
    expect(l.hotels).toEqual([]);
    expect(l.drivers[0]).toMatchObject({ name: 'B', vehicle: 'Jeep', active: true });
  });
});

describe('reviews', () => {
  const rv = (id: number, item: string, rating: number, comment = '', status: 'approved' | 'pending' = 'approved') =>
    ({ id, created_at: '2026-10-0' + id + 'T10:00:00Z', item_kind: 'hotel' as const, item_id: item, rating, comment, author: 'Ali Khan', status });

  it('averages approved reviews only and keeps the latest comments', () => {
    setReviews([rv(3, 'h1', 5, 'Hot water, clean'), rv(2, 'h1', 4), rv(1, 'h1', 1, 'Spam', 'pending'), rv(4, 'h2', 2)]);
    const r = ratingOf('hotel', 'h1');
    expect(r).toMatchObject({ avg: 4.5, count: 2, text: '4.5 · 2 reviews' });
    expect(r.latest.map(x => x.comment)).toEqual(['Hot water, clean']);
    expect(r.latest[0].author).toBe('Ali');
    expect(ratingOf('driver', 'h1').count).toBe(0);
  });

  it('shows ratings while planning, and Rate only once the stay is over', () => {
    applyPrices({ hotels: [{ id: 'h1', name: 'Pine Lodge', area: id('Naran'), tier: 'standard', price: 9000, phone: '', note: '', checked: '', active: true }],
      drivers: [{ id: 'd1', name: 'Karim', area: id('Naran'), vehicle: 'Jeep', seats: 5, rate: 0, phone: '', note: '', checked: '', active: true }] });
    setReviews([rv(1, 'h1', 4, 'Good')]);
    const calls: Record<string, unknown>[] = [];
    const at = (start: string) => buildView(trip({ dest: 'naran', corridor: 'naran', days: 4, startDate: start }), { ...api, set: (p: Record<string, unknown>) => calls.push(p) } as Api);
    const nightIn = (v: ReturnType<typeof at>) => v.plan.days.find(d => d.stay && /Naran/.test(d.stay.place))!.stay!.options[0];

    const planning = at(isoAdd(20));
    expect(nightIn(planning).rating?.text).toBe('4.0 · 1 review');
    expect(nightIn(planning).review).toBeNull();
    expect(planning.drivers[0].review).toBeNull();
    expect(planning.afterTrip).toBeNull();

    const back = at(isoAdd(-10));
    nightIn(back).review!();
    expect(calls[0]).toMatchObject({ sheet: 'review', reviewFor: { kind: 'hotel', id: 'h1', name: 'Pine Lodge', date: isoAdd(-10) } });
    expect(back.drivers[0].review).not.toBeNull();
    expect(back.afterTrip!.items.map(x => `${x.kind}:${x.name}`)).toEqual(['hotel:Pine Lodge', 'driver:Karim']);
    back.afterTrip!.items[0].skip();
    expect(at(isoAdd(-10)).afterTrip!.items.map(x => x.name)).toEqual(['Karim']);
    at(isoAdd(-10)).afterTrip!.dismiss();
    expect(at(isoAdd(-10)).afterTrip).toBeNull();
  });
});
