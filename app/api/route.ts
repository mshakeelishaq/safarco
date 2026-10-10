// GET /api/route?from=lon,lat&to=lon,lat
// Driving route from OpenRouteService. The key (ORS_API_KEY) stays on the server.
// Answers are cached at Vercel's edge for a week, so each city pair costs one ORS request.

const ok = (body: unknown, maxAge = 604800) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=86400` } });
const fail = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const point = (v: string | null) => {
  const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(v || ''); if (!m) return null;
  const lon = +(+m[1]).toFixed(3), lat = +(+m[2]).toFixed(3);
  return lat > 23 && lat < 37.5 && lon > 60.5 && lon < 78 ? [lon, lat] : null;
};

export async function GET(request: Request) {
  const key = process.env.ORS_API_KEY;
  if (!key) return fail(503, 'Routing is not configured');
  const u = new URL(request.url), from = point(u.searchParams.get('from')), to = point(u.searchParams.get('to'));
  if (!from || !to) return fail(400, 'from and to must be lon,lat inside Pakistan');
  const r = await fetch('https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json', Accept: 'application/geo+json' },
    body: JSON.stringify({ coordinates: [from, to], radiuses: [5000, 5000] })
  }).catch(() => null);
  if (!r) return fail(502, 'Routing service unreachable');
  if (r.status === 429) return fail(429, 'Routing limit reached for today');
  if (!r.ok) return fail(502, `Routing failed (${r.status})`);
  const j = await r.json();
  const f = j.features && j.features[0];
  if (!f) return fail(404, 'No route');
  let coords: [number, number][] = f.geometry.coordinates;
  const step = Math.ceil(coords.length / 1500);
  if (step > 1) coords = coords.filter((_, i) => i % step === 0 || i === coords.length - 1);
  return ok({ km: f.properties.summary.distance / 1000, h: f.properties.summary.duration / 3600, coords: coords.map(c => [+c[0].toFixed(5), +c[1].toFixed(5)]) });
}
