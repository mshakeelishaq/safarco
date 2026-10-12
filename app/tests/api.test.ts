// The server functions, tested against sample provider responses (no network, no real keys).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as geocode } from '../api/geocode';
import { GET as places } from '../api/places';
import { GET as route } from '../api/route';

const calls: { url: string; init?: RequestInit }[] = [];
const reply = (body: unknown, status = 200) => vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify(body), { status }); }));
const get = (fn: (r: Request) => Promise<Response>, path: string) => fn(new Request('https://safarco.test' + path));

beforeEach(() => { calls.length = 0; process.env.ORS_API_KEY = 'ors-key'; process.env.GEOAPIFY_API_KEY = 'geo-key'; });
afterEach(() => vi.unstubAllGlobals());

describe('/api/route', () => {
  it('returns km, hours and the line, sending the key only to OpenRouteService', async () => {
    reply({ features: [{ properties: { summary: { distance: 1010000, duration: 72000 } }, geometry: { coordinates: [[74.34, 31.55], [75.6312345, 35.3]] } }] });
    const r = await get(route, '/api/route?from=74.34,31.55&to=75.63,35.30');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ km: 1010, h: 20, coords: [[74.34, 31.55], [75.63123, 35.3]] });
    expect(calls[0].url).toContain('api.heigit.org/openrouteservice/v2/directions');
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe('ors-key');
    expect(r.headers.get('Cache-Control')).toContain('s-maxage');
  });

  it('rejects points outside Pakistan and works without a key by failing cleanly', async () => {
    expect((await get(route, '/api/route?from=1,2&to=3,4')).status).toBe(400);
    delete process.env.ORS_API_KEY;
    expect((await get(route, '/api/route?from=74.34,31.55&to=75.63,35.30')).status).toBe(503);
  });
});

describe('/api/places', () => {
  it('maps Geoapify places to named spots with distance and type', async () => {
    reply({ features: [
      { properties: { name: 'Shangrila Resort', lat: 35.42, lon: 75.5, distance: 12345, categories: ['accommodation', 'accommodation.hotel'], address_line2: 'Kachura' } },
      { properties: { lat: 35.3, lon: 75.6, categories: ['accommodation.hotel'] } }
    ] });
    const r = await get(places, '/api/places?kind=hotels&lat=35.3&lon=75.63');
    expect((await r.json()).spots).toEqual([{ name: 'Shangrila Resort', lat: 35.42, lon: 75.5, km: 12.3, type: 'Hotel', address: 'Kachura', website: undefined }]);
    expect(calls[0].url).toContain('apiKey=geo-key');
  });

  it('prefers the English name when OpenStreetMap has one', async () => {
    reply({ features: [{ properties: { name: 'شاردا پیٹھ', name_international: { en: 'Sharada Peeth' }, lat: 34.79, lon: 74.19, distance: 15000, categories: ['tourism.sights'] } }] });
    const r = await get(places, '/api/places?kind=sights&lat=34.83&lon=74.35');
    expect((await r.json()).spots[0].name).toBe('Sharada Peeth');
  });
});

describe('/api/geocode', () => {
  it('keeps only places inside Pakistan and names provinces', async () => {
    reply({ results: [{ name: 'Sukkur', state: 'Sindh', lat: 27.7, lon: 68.86 }, { name: 'Sukkur Street', state: 'London', lat: 51.5, lon: -0.1 }] });
    const r = await get(geocode, '/api/geocode?q=Sukkur');
    expect((await r.json()).places).toEqual([{ name: 'Sukkur', prov: 'Sindh', lat: 27.7, lon: 68.86 }]);
  });

  it('names the town, not the admin area, for a GPS position', async () => {
    reply({ results: [{ name: 'Model Town Tehsil', city: 'Lahore', state: 'Punjab', lat: 31.48, lon: 74.32 }] });
    const r = await get(geocode, '/api/geocode?lat=31.48&lon=74.32');
    expect((await r.json()).places[0].name).toBe('Lahore');
    reply({ results: [{ name: 'Model Town Tehsil', state: 'Punjab', lat: 31.48, lon: 74.32 }] });
    expect((await (await get(geocode, '/api/geocode?lat=31.49&lon=74.32')).json()).places[0].name).toBe('Model Town');
  });
});
