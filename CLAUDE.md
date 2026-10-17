# SafarCo

Pakistan trip planner (PWA) and website. The app is in `app/` (React, TypeScript, Vite, Vitest).

## Adding photos (the quick way)
The owner sends photos with a place and season. Use only the owner's own photos, or Wikipedia/Commons.

1. Write a list file, one photo per line: `path | destination id | uses | caption`
   - uses: `gallery` (default), `main`, `spring`/`summer`/`autumn`/`winter`, `place:Place name`, `stop:Stop name`, `first`, `nogallery`
   - caption style: `Autumn: Baltit Fort above the golden poplars`
2. Run `python3 app/scripts/add-photos.py list.txt --ship "Add Hunza autumn photos"`

It shrinks each photo to ~1300 px WebP under 250 KB, lists it in `app/src/photos-added.json`,
checks the build and tests, bumps the service worker, commits and pushes. Leave out `--ship` to try it first.

## Rules
- Every `t()` string needs Roman Urdu in `app/src/i18n/ur.ts` (a test checks).
- No em dashes in user-facing text.
- Suggest, never force: options for the traveller, not automatic changes.
