// GET /api/route?from=lon,lat&to=lon,lat[&via=lon,lat;lon,lat…]
// `via` keeps the road on the same towns as SafarCo's day plan (e.g. over Babusar, not round by Chitral).
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
  const viaRaw = (u.searchParams.get('via') || '').split(';').filter(Boolean);
  const via = viaRaw.map(point);
  if (viaRaw.length > 23 || via.some(v => !v)) return fail(400, 'via must be up to 23 lon,lat points inside Pakistan');
  const coordinates = [from, ...(via as number[][]), to];
  // The road must follow SafarCo's day plan, so the towns on the way are never dropped. Try:
  // 1) the whole route in one go (each point within 5 km of a road, then snapped at any distance);
  // 2) each stretch between towns on its own, stitched together. A stretch the router can't do
  //    (e.g. a seasonal pass it treats as closed) is drawn straight, so the line still goes that way.
  const ask = (pts: number[][], radiuses: number[]) => fetch('https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json', Accept: 'application/geo+json' },
    body: JSON.stringify({ coordinates: pts, radiuses })
  }).catch(() => null);
  type Route = { km: number; h: number; coords: number[][] };
  const hav = (a: number[], b: number[]) => { const R = 6371, dLa = (b[1] - a[1]) * Math.PI / 180, dLo = (b[0] - a[0]) * Math.PI / 180, x = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  // A stretch far longer than it should be is a detour round a road the router thinks is closed
  // (Naran → Chilas sent back down by Besham): not the plan's way, so it's refused.
  const detour = (km: number, a: number[], b: number[]) => km > hav(a, b) * 2.6 + 15;
  const read = async (r: Response | null, pts: number[][]): Promise<Route | null> => {
    if (!r || !r.ok) return null;
    const f = (await r.json().catch(() => null))?.features?.[0]; if (!f) return null;
    const segs: { distance: number }[] = f.properties.segments || [];
    if (segs.length === pts.length - 1 && segs.some((g, i) => detour(g.distance / 1000, pts[i], pts[i + 1]))) return null;
    if (!segs.length && detour(f.properties.summary.distance / 1000, pts[0], pts[pts.length - 1]) && pts.length === 2) return null;
    return { km: f.properties.summary.distance / 1000, h: f.properties.summary.duration / 3600, coords: f.geometry.coordinates };
  };
  let first = await ask(coordinates, coordinates.map(() => 5000));
  if (first?.status === 429) return fail(429, 'Routing limit reached for today');
  let route = await read(first, coordinates);
  if (!route && via.length) route = await read(await ask(coordinates, coordinates.map((_, i) => i === 0 || i === coordinates.length - 1 ? 5000 : -1)), coordinates);
  if (!route && via.length) {
    const parts = await Promise.all(coordinates.slice(1).map((b, i) => ask([coordinates[i], b], [-1, -1]).then(r => read(r, [coordinates[i], b]))));
    if (parts.some(Boolean)) route = parts.reduce<Route>((acc, p, i) => {
      const a = coordinates[i], b = coordinates[i + 1];
      // A stretch with no road: straight across, at mountain-road length and speed.
      const seg = p || { km: hav(a, b) * 1.4, h: hav(a, b) * 1.4 / 30, coords: [a, b] };
      return { km: acc.km + seg.km, h: acc.h + seg.h, coords: [...acc.coords, ...(acc.coords.length ? seg.coords.slice(1) : seg.coords)] };
    }, { km: 0, h: 0, coords: [] });
  }
  if (!route) return fail(first ? 502 : 502, first ? `Routing failed (${first.status})` : 'Routing service unreachable');
  let coords = route.coords as [number, number][];
  const step = Math.ceil(coords.length / 1500);
  if (step > 1) coords = coords.filter((_, i) => i % step === 0 || i === coords.length - 1);
  return ok({ km: route.km, h: route.h, coords: coords.map(c => [+c[0].toFixed(5), +c[1].toFixed(5)]) });
}
