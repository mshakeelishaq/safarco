// Prints the app's own guide data as JSON, for scripts/import-places.py.
// Run: npx tsx scripts/dump-app-data.ts > /tmp/app-data.json
import { BASE_HIGHLIGHTS } from '../src/engine/seasons';
import { AIRPORTS, BASE_CITIES, BASE_DESTS, BASE_EDGE_STOPS, EDGES, FARES, NODES, NODE_INFO, SUNSET } from '../src/engine/data';

process.stdout.write(JSON.stringify({
  dests: BASE_DESTS.map(d => ({ id: d.id, name: d.name, town: d.town || d.name, region: d.region, lat: d.lat, lon: d.lon, best: d.best || null, places: d.places || [], days: d.days || null })),
  cities: BASE_CITIES, nodes: NODES, nodeInfo: NODE_INFO, edgeStops: BASE_EDGE_STOPS,
  edges: EDGES.map(e => [e[0], e[1], e[2]]), sunset: SUNSET, airports: Object.keys(FARES), highlights: Object.keys(BASE_HIGHLIGHTS), mainAirports: Object.values(AIRPORTS).map(a => a[0])
}));
