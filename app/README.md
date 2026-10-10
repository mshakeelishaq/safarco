# SafarCo

Road-trip planner for Pakistan, built from the **SafarCo App v7** design (`../project/SafarCo App v7.dc.html`).
You pick a starting city, dates, travellers and a budget; SafarCo suggests where to go and builds a day-by-day plan with stops, places to visit, a 3D map, weather and places to stay, priced in PKR and USD.

It's a mobile-first web app (PWA) that runs on Vercel's free plan and can be installed on iPhone and Android.
**Setting it up for the first time? Follow [SETUP.md](SETUP.md).**

## Run it on a computer

```bash
cp .env.example .env   # then paste your keys into .env
npm install
npm run dev            # http://localhost:5173
npm test               # trip engine, parity with the design, server functions
npm run build          # type-check and build to dist/
```

Themes: Paper (default), Daylight, Peach and Dark, under **Edit trip → Theme**, or open with `?theme=dark`.

## Free services

| What | Service | Key | Called from |
|---|---|---|---|
| Driving route and distance | OpenRouteService | `ORS_API_KEY` | `api/route.ts` (server) |
| Place search, sights, places to stay | Geoapify (OpenStreetMap data) | `GEOAPIFY_API_KEY` | `api/geocode.ts`, `api/places.ts` (server) |
| Map and 3D terrain | MapLibre + OpenFreeMap + AWS Terrarium tiles | none | browser |
| Weather | Open-Meteo (free for non-commercial use) | none | browser |
| Destination guide | Wikivoyage, falling back to Wikipedia | none | browser |
| US dollar rate | open.er-api.com (daily) | none | browser |
| Hotel prices | none available for free: estimated ranges + Booking.com "Check prices" links | none | browser |

Keys live only in Vercel's environment variables (or your local `.env`) and are read by the functions in `api/`.
Those responses are cached at Vercel's edge for a week, so many users share one request to each provider.
Without keys the app still works: it uses its built-in road table, hand-written guides and price estimates.

## Code map

| Area | Where |
|---|---|
| Trip engine: road network, day splits, costs, seasons, suggestions | `src/engine/` (checked against the design in `parity.test.ts`) |
| Screens | `src/components/` |
| What the screens show, derived from state | `src/view.ts` |
| Prices in PKR/USD, hotel ranges, Check prices links | `src/money.ts` |
| 3D hero terrain (three.js) | `src/scene/` |
| Offline download, service worker | `src/offline.ts`, `public/sw.js` |
| Server functions (Vercel) | `api/` |

## Still estimates

As in the design, road km and speeds, tolls, fuel economy, fares, hire and jeep rates, hotel price ranges, sunset times and season months are estimates. Hand-picked hotel names in the 21 built-in guides may not all be open; where Geoapify returns real places to stay, those are shown instead.
