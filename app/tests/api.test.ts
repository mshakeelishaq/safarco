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

  it('routes through the day plan’s towns when given via points', async () => {
    reply({ features: [{ properties: { summary: { distance: 900000, duration: 72000 } }, geometry: { coordinates: [[74.34, 31.55], [73.6, 35.1]] } }] });
    const r = await get(route, '/api/route?from=74.34,31.55&to=72.93,36.17&via=73.6,34.9;74.1,35.4;74.3,35.9');
    expect(r.status).toBe(200);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.coordinates).toEqual([[74.34, 31.55], [73.6, 34.9], [74.1, 35.4], [74.3, 35.9], [72.93, 36.17]]);
    expect(body.radiuses).toHaveLength(5);
    expect((await get(route, '/api/route?from=74.34,31.55&to=72.93,36.17&via=1,2')).status).toBe(400);
  });

  it('falls back when a town on the way is off the road, then to start and end only', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => { calls.push({ url, init }); n++;
      return n < 3 ? new Response('{"error":{"code":2010}}', { status: 404 }) : new Response(JSON.stringify({ features: [{ properties: { summary: { distance: 1000, duration: 3600 } }, geometry: { coordinates: [[74.34, 31.55], [72.93, 36.17]] } }] })); }));
    const r = await get(route, '/api/route?from=74.34,31.55&to=72.93,36.17&via=73.6,34.9');
    expect(r.status).toBe(200);
    expect(JSON.parse(String(calls[1].init?.body)).radiuses).toEqual([5000, -1, 5000]);
    expect(JSON.parse(String(calls[2].init?.body)).coordinates).toHaveLength(2);
  });

  it('keeps the plan’s towns: routes each stretch, and draws a stretch the router can’t do straight', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => { calls.push({ url, init });
      const pts = JSON.parse(String(init?.body)).coordinates as number[][];
      // The whole route fails; the stretch from Naran over Babusar (73.65,34.91 → 74.1,35.42) fails too.
      if (pts.length > 2 || pts[0][0] === 73.65) return new Response('{"error":{"code":2009}}', { status: 404 });
      return new Response(JSON.stringify({ features: [{ properties: { summary: { distance: 100000, duration: 7200 } }, geometry: { coordinates: [pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], pts[1]] } }] }));
    }));
    const r = await get(route, '/api/route?from=74.34,31.55&to=72.93,36.17&via=73.65,34.91;74.1,35.42');
    expect(r.status).toBe(200);
    const j = await r.json();
    // Lahore → Naran routed, Naran → Chilas straight, Chilas → Phander routed: never round by Chitral.
    expect(j.coords[0]).toEqual([74.34, 31.55]);
    expect(j.coords).toContainEqual([73.65, 34.91]);
    expect(j.coords).toContainEqual([74.1, 35.42]);
    expect(j.coords[j.coords.length - 1]).toEqual([72.93, 36.17]);
    expect(calls.some(c => JSON.parse(String(c.init?.body)).coordinates.length === 2 && JSON.parse(String(c.init?.body)).coordinates[0][0] === 74.34 && JSON.parse(String(c.init?.body)).coordinates[1][0] === 72.93)).toBe(false);
  });

  it('refuses a detour (Naran → Chilas sent round by Besham) and keeps to the plan’s way', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => { calls.push({ url, init });
      const pts = JSON.parse(String(init?.body)).coordinates as number[][];
      const naranChilas = pts.length === 2 && pts[0][0] === 73.65;
      // Every answer "works", but the Naran → Chilas stretch is a 420 km detour.
      const segs = pts.slice(1).map((b, i) => ({ distance: pts[i][0] === 73.65 ? 420000 : 90000 }));
      return new Response(JSON.stringify({ features: [{ properties: { summary: { distance: naranChilas ? 420000 : 500000, duration: 36000 }, segments: segs }, geometry: { coordinates: [pts[0], [73.0, 34.9], pts[pts.length - 1]] } }] }));
    }));
    const r = await get(route, '/api/route?from=74.34,31.55&to=72.93,36.17&via=73.65,34.91;74.1,35.42');
    const j = await r.json();
    expect(r.status).toBe(200);
    // Naran → Chilas is drawn straight between them (no detour point in between).
    const i = j.coords.findIndex((c: number[]) => c[0] === 73.65 && c[1] === 34.91);
    expect(j.coords[i + 1]).toEqual([74.1, 35.42]);
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
