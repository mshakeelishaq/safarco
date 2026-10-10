// GET /api/geocode?q=Sukkur          → places in Pakistan matching the text
// GET /api/geocode?lat=31.5&lon=74.3 → the town at a GPS position
// Uses Geoapify (GEOAPIFY_API_KEY). Without a key it falls back to OpenStreetMap's
// Nominatim, which is fine for testing but not allowed for heavy public use.

interface Place { name: string; prov: string; lat: number; lon: number }

const ok = (places: Place[]) => new Response(JSON.stringify({ places }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400' } });
const fail = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const PROV = (s?: string) => !s ? 'Pakistan' : /Islamabad/.test(s) ? 'Capital' : /Azad|Kashmir/.test(s) ? 'Azad Kashmir' : /Gilgit/.test(s) ? 'Gilgit-Baltistan'
  : /Khyber/.test(s) ? 'Khyber Pakhtunkhwa' : /Baloch/.test(s) ? 'Balochistan' : /Sindh/.test(s) ? 'Sindh' : /Punjab/.test(s) ? 'Punjab' : s;
const inPk = (lat: number, lon: number) => lat > 23.5 && lat < 37.2 && lon > 60.8 && lon < 77.9;
const uniq = (list: Place[]) => list.filter((p, i) => p.name && list.findIndex(x => x.name === p.name) === i);

async function geoapify(key: string, q: string | null, lat: number, lon: number): Promise<Place[]> {
  const url = q
    ? `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(q)}&filter=countrycode:pk&lang=en&limit=8&format=json&apiKey=${key}`
    : `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&type=city&lang=en&format=json&apiKey=${key}`;
  const r = await fetch(url); if (!r.ok) throw new Error('geoapify ' + r.status);
  const j = await r.json();
  return (j.results || []).map((x: any) => ({ name: String(x.name || x.city || x.town || x.village || x.county || '').trim(), prov: PROV(x.state), lat: +x.lat, lon: +x.lon }));
}

async function nominatim(q: string | null, lat: number, lon: number): Promise<Place[]> {
  const url = q
    ? `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pk&addressdetails=1&limit=8&accept-language=en&q=${encodeURIComponent(q)}`
    : `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&addressdetails=1&accept-language=en&lat=${lat}&lon=${lon}`;
  const r = await fetch(url, { headers: { 'User-Agent': `SafarCo trip planner (${process.env.CONTACT_EMAIL || 'contact not set'})` } }); if (!r.ok) throw new Error('nominatim ' + r.status);
  const j = await r.json(), rows = Array.isArray(j) ? j : [j];
  return rows.map((x: any) => { const a = x.address || {}; return { name: String(x.name || a.city || a.town || a.village || a.county || '').trim(), prov: PROV(a.state), lat: +x.lat, lon: +x.lon }; });
}

export async function GET(request: Request) {
  const u = new URL(request.url), q = (u.searchParams.get('q') || '').trim().slice(0, 60) || null;
  const lat = +(u.searchParams.get('lat') || NaN), lon = +(u.searchParams.get('lon') || NaN);
  if (!q && !(isFinite(lat) && isFinite(lon))) return fail(400, 'Give q, or lat and lon');
  if (q && q.length < 3) return ok([]);
  const rLat = +lat.toFixed(2), rLon = +lon.toFixed(2);
  try {
    const key = process.env.GEOAPIFY_API_KEY;
    const list = key ? await geoapify(key, q, rLat, rLon) : await nominatim(q, rLat, rLon);
    return ok(uniq(list.filter(p => inPk(p.lat, p.lon))));
  } catch {
    return fail(502, 'Place search unavailable');
  }
}
