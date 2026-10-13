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

Languages: English and Roman Urdu (switch on the welcome screen, the question screens, or **Edit trip → Language**). Text is written in English in the code inside `t()` and translated in `src/i18n/ur.ts`; `tests/i18n.test.ts` fails if a new text has no Roman Urdu.

Planning starts with the language (on the welcome screen) and **"What do you want to see?"**: green valleys, blossom, autumn colours, snowfall or the sea (`WISHES` in `src/engine/seasons.ts`, places found from each destination's highlights). The wish sets suggested months, puts its places first, and the dates step and trip summary say when the dates or place don't fit it, with one-tap fixes.

Trip screens: **Plan** (summary, the route day by day; each day opens its own page where places can be added or removed, saved with the trip, `src/edits.ts`), **Map**, **Budget** (where the money goes, other ways to do the trip) and **Prepare** (things to know, packing list, offline maps, emergency numbers, trusted drivers). A new plan opens with a short "getting your plan ready" screen while live roads, weather, hotels and fuel load (`src/components/Building.tsx`, at most 10 s). The travellers question also asks how they travel (own car, SUV, bike, or let SafarCo suggest); with their own vehicle, only that vehicle is planned and jeep-only last stretches are flagged.

**Before, during and after the trip** (`src/view-trip.ts`, `src/components/TripMode.tsx`, progress kept per trip on the phone in `src/run.ts`): lock the plan for a countdown and a get-ready checklist (Prepare); on the trip dates the Plan tab opens on **Today** (GPS progress along the day's road, next stop, fuel, sunset, ticks, a running-late helper, check-in, send location, emergency sheet); an expense log with planned vs spent and who-owes-whom (Budget); afterwards a trip summary. **Share** offers a family follow page (`/follow`, live with `supabase/follow.sql`, else a copy of the plan in the link), the Instagram trip card (drawn on the phone, `src/sharecard.ts`) and the plan link.

Themes: Paper (default), Daylight, Peach and Dark, under **Edit trip → Theme**, or open with `?theme=dark`. Add `?frame` to see the app inside the design's phone mock-up.

## Free services

| What | Service | Key | Called from |
|---|---|---|---|
| Driving route and distance | OpenRouteService | `ORS_API_KEY` | `api/route.ts` (server) |
| Place search, sights, places to stay | Geoapify (OpenStreetMap data) | `GEOAPIFY_API_KEY` | `api/geocode.ts`, `api/places.ts` (server) |
| Map and 3D terrain | MapLibre + OpenFreeMap + AWS Terrarium tiles | none | browser |
| Weather | Open-Meteo (free for non-commercial use) | none | browser |
| Destination guide | Wikivoyage, falling back to Wikipedia | none | browser |
| US dollar rate | open.er-api.com (daily) | none | browser |
| Hotel prices | none available for free: ranges from the admin price list + Booking.com "Check prices" links (affiliate id optional) | `VITE_BOOKING_AID` | browser |
| Accounts, saved trips, price list, feedback | Supabase + Google sign-in (row-level security in `supabase/schema.sql`) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public by design) | browser |
| Visitor counts, crash reports | Vercel Web Analytics, `api/log.ts` → Vercel Logs | none | browser + server |

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
| Admin price list (fuel, tolls, stays, hire, fares, jeeps, road alerts) with "checked on" dates | `src/prices.ts`, `src/pages/Admin.tsx` (at /admin) |
| Saved trips on the device, share links, account sync | `src/trips.ts`, `src/cloud.ts`, `src/components/Panels.tsx` |
| Privacy and terms pages | `src/pages/Legal.tsx` (at /privacy, /terms) |
| Icon font cut to the icons in use (rerun after adding one) | `scripts/subset-icons.py` → `src/icons/` |
| 3D hero terrain (three.js) | `src/scene/` |
| Offline download, service worker | `src/offline.ts`, `public/sw.js` |
| Server functions (Vercel) | `api/` |

## What is live, checked or modelled

- **Live:** road distance and route, places and hotels, destination guides, dollar rate, and weather from Open-Meteo: the forecast at each point of the drive at the hour you pass it, mountain passes at their real height, danger flags (storms, heavy rain/landslides, black ice, fog, heat, wind), air quality, and a suggested departure time. Beyond 16 days ahead the app shows the last 5 years for those dates, marked "typical".
- **Fuel on the road:** pumps along each driving day from OpenStreetMap (Geoapify, `/api/places?kind=fuel`), with a warning where the map shows none for 100 km, plus SafarCo's notes for known empty stretches (Babusar, Deosai, Shandur, Khunjerab, Makran coast…) in `src/engine/fuel.ts`. Shown for trips in your own or a rented vehicle.
- **Calculated on the device:** sunrise and sunset for each town and date (`src/engine/sun.ts`), the packing list.
- **Checked by the admin, with dates shown to users:** fuel, tolls, hotel and meal ranges, hire, coach fares, jeep rates, road alerts. Until a section is checked, the app labels it "not checked yet". Flight fares are always shown as tentative, with a link to live fares for the travel date.
- **Modelled:** drive times on mountain roads, fuel economy per vehicle and pass opening seasons. Hand-picked hotel names in the 21 built-in guides appear only where Geoapify has no live list.
