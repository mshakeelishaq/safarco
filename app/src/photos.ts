// Photos by shakeelnaturegraphy (in public/photos), used on the welcome screen and as the
// summary photo for trips in the right season. For now the autumn photos are one shared mix;
// photos for each destination will come later.
import { wishPlaces } from './engine/seasons';

/** Autumn colours across Gilgit-Baltistan, for trips in October and November. */
const AUTUMN = ['/photos/autumn-hunza.webp', '/photos/hunza-autumn-peaks.webp', '/photos/hunza-orchards.webp', '/photos/hunza-autumn-valley.webp', '/photos/hunza-golden-light.webp', '/photos/altit-fort.webp'];
const AUTUMN_MONTHS = [10, 11];

/** A small, stable number for a trip, so it keeps the same photo each time it opens. */
const pick = (key: string, n: number) => { let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % n; };

/** This trip's photo: one of ours for an autumn trip to an autumn-colour place, or null to use the guide's photo. */
export function destPhoto(id: string, month: number, startDate = '') {
  if (!AUTUMN_MONTHS.includes(month) || !wishPlaces('autumn').some(p => p.id === id)) return null;
  return { src: AUTUMN[pick(id + startDate, AUTUMN.length)] };
}
