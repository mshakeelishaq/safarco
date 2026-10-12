// GET /api/places?kind=sights|hotels|fuel&lat=..&lon=..
// Sights, places to stay or fuel stations around a point, from Geoapify (OpenStreetMap data).
// The key (GEOAPIFY_API_KEY) stays on the server; answers are cached for a week.

interface Spot { name: string; lat: number; lon: number; km: number; type: string; address: string; website?: string }

const ok = (spots: Spot[]) => new Response(JSON.stringify({ spots }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400' } });
const fail = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const KINDS = {
  sights: { cats: ['tourism.sights,tourism.attraction,natural,heritage', 'tourism'], radius: 30000 },
  hotels: { cats: ['accommodation.hotel,accommodation.guest_house,accommodation.hostel,accommodation.motel,accommodation.chalet', 'accommodation'], radius: 12000 },
  // Pumps along a road: the app asks every ~50 km and keeps the ones on the route.
  fuel: { cats: ['service.vehicle.fuel'], radius: 25000 }
} as const;

// A readable type from Geoapify's most specific category, e.g. "accommodation.guest_house" → "Guest house".
const typeOf = (cats: string[] = []) => {
  const c = cats.slice().sort((a, b) => b.split('.').length - a.split('.').length)[0] || '';
  const last = c.split('.').pop() || 'place';
  return (last[0].toUpperCase() + last.slice(1)).replace(/_/g, ' ');
};

export async function GET(request: Request) {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return fail(503, 'Places are not configured');
  const u = new URL(request.url), kind = u.searchParams.get('kind') as keyof typeof KINDS;
  const lat = +(+(u.searchParams.get('lat') || NaN)).toFixed(3), lon = +(+(u.searchParams.get('lon') || NaN)).toFixed(3);
  if (!KINDS[kind] || !isFinite(lat) || !isFinite(lon)) return fail(400, 'Give kind=sights|hotels|fuel, lat and lon');
  const { cats, radius } = KINDS[kind];
  for (const c of cats) {
    const r = await fetch(`https://api.geoapify.com/v2/places?categories=${c}&filter=circle:${lon},${lat},${radius}&bias=proximity:${lon},${lat}&lang=en&limit=40&apiKey=${key}`).catch(() => null);
    if (!r) return fail(502, 'Places service unreachable');
    if (r.status === 400) continue; // category not recognised: retry with the broad one
    if (r.status === 429) return fail(429, 'Places limit reached for today');
    if (!r.ok) return fail(502, `Places failed (${r.status})`);
    const j = await r.json();
    const spots: Spot[] = (j.features || []).map((f: any) => {
      const p = f.properties || {};
      const raw = p.datasource?.raw || {};
      // Many pumps have no name on the map, only a brand (PSO, Shell, Total…).
      const name = String(p.name_international?.en || raw['name:en'] || p.name || (kind === 'fuel' ? raw.brand || raw.operator || 'Fuel station' : '')).trim();
      return { name, lat: +p.lat, lon: +p.lon, km: Math.round((p.distance || 0) / 100) / 10, type: typeOf(p.categories), address: String(p.address_line2 || p.formatted || ''), website: p.website || p.datasource?.raw?.website };
    }).filter((s: Spot) => s.name && !/^\d+$/.test(s.name));
    // Pumps of one brand share a name, so tell them apart by position instead.
    const same = kind === 'fuel' ? (a: Spot, b: Spot) => Math.abs(a.lat - b.lat) + Math.abs(a.lon - b.lon) < 0.002 : (a: Spot, b: Spot) => a.name === b.name;
    return ok(spots.filter((s, i) => spots.findIndex(x => same(x, s)) === i).slice(0, kind === 'fuel' ? 40 : 20));
  }
  return fail(502, 'Places failed');
}
