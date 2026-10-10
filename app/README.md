# SafarCo

Road-trip planner for Pakistan, built from the **SafarCo App v7** design (`../project/SafarCo App v7.dc.html`).
It's a React + TypeScript web app that installs on phones as a PWA. On a phone it runs full screen; on a wide screen it's shown inside the phone frame from the design.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # engine, parity and co-pilot tests
npm run build        # type-check and build to dist/
npm start            # serve dist/ and /api/copilot on PORT (default 8080)
```

Themes: Paper (default), Daylight, Peach and Dark. Switch in **Edit trip → Theme**, or open with `?theme=dark`. The choice is remembered on the device.

## What's in it

| Area | Where |
|---|---|
| Trip engine: road network, day splits, costs, seasons, suggestions | `src/engine/` (ported from the design, checked against it in `parity.test.ts`) |
| Screens | `src/components/` (onboarding, Trip, Map, Offline, Edit sheet, Co-pilot drawer) |
| Everything the screens show, derived from state | `src/view.ts` |
| 3D hero terrain (three.js, loaded on demand) | `src/scene/` |
| Live data: OSRM road distance, Open-Meteo weather, Nominatim search | `src/engine/live.ts` |
| Offline download (map tiles, terrain, trip data) | `src/offline.ts`, `public/sw.js` |
| Co-pilot tools, free parser, Claude client | `src/copilot/` |
| Co-pilot server (Claude proxy) | `server/copilot.ts`, `server/index.ts` |

The design's inline styles are kept as written and converted by `src/lib/css.ts`, so the screens match the design one-to-one.

## Free services used

No API keys needed: OpenFreeMap tiles, AWS Terrarium elevation tiles, OSRM routing, Open-Meteo weather and Nominatim search.
These are the public free endpoints, meant for testing. Before launch, run your own OSRM and Nominatim (see the design chat's next steps), or they may rate-limit you.

## Co-pilot

- **Free mode (default):** requests are parsed on the device (English and some Roman Urdu) into the same trip tools Claude would use. It handles destination, home city, month, days, travellers, transport, stay level, rooms, budget and departure time. Questions about Babusar Pass are answered from the season data and the live forecast.
- **Claude mode:** set `ANTHROPIC_API_KEY` on the server and the co-pilot switches to Claude (`claude-opus-5-5`, low effort). The server holds the key, the system prompt and the tool list, and limits each IP to `COPILOT_REQUESTS_PER_HOUR` requests (default 60). Every message costs money. If Claude can't be reached, the app falls back to free mode.

## Offline

**Offline → Download for offline** saves the map style, vector and terrain tiles along your route (zoom 6–10), plus the trip's road and weather data. The service worker serves them, and the app shell, when there is no signal. **Clear cache** removes them.

## Still estimates

As in the design, road km and speeds, tolls, fuel economy, fares, hire and jeep rates, hotel names and prices, sunset times and season months are estimates and need checking before launch. Hotel names may not all be real or open.

## Differences from the design

- **Location:** if GPS fails or you're outside Pakistan, the app says so and asks you to search. The prototype filled in Lahore as a demo city instead.
- **Offline download:** really downloads; the size shown is estimated from the route's tiles. The prototype showed a simulated progress bar.
- **Co-pilot:**
  - The free prompts change the trip from what you type. The prototype only had three scripted replies, including a made-up Babusar snow forecast.
  - The send button is a paper plane, because there is no voice input. The co-pilot orb shows a sparkle instead of a white microphone, which didn't show up on light themes.
- **Light-theme contrast:** the selected stay level and the "Clear cache" button use dark text, where the prototype used white on a light background.
- **Edit trip:** has a Theme picker in place of the design tool's Tweaks panel.
