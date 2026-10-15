// Photos by shakeelnaturegraphy (in public/photos), used on the welcome screen and as the
// summary photo for trips in the right season. For now the autumn photos are one shared mix;
// photos for each destination will come later.
import { wishPlaces } from './engine/seasons';

/** Autumn colours across Gilgit-Baltistan, for trips in October and November. */
const AUTUMN = ['/photos/autumn-hunza.webp', '/photos/hunza-autumn-peaks.webp', '/photos/hunza-orchards.webp', '/photos/hunza-autumn-valley.webp', '/photos/hunza-golden-light.webp', '/photos/altit-fort.webp'];
const AUTUMN_MONTHS = [10, 11];
/** A place's own photo, used whenever it's the trip's place: Hunza is the view of Rakaposhi. */
const OWN: Record<string, string> = { hunza: '/photos/autumn-hunza.webp' };
/** Our own photo of a place, if we have one. */
/** Photos the admin set for a place (a web link), ahead of ours. */
export const PHOTO_EDITS: Record<string, string> = {};
export const ownPhoto = (id: string): string | undefined => PHOTO_EDITS[id] || OWN[id];

/** A small, stable number for a trip, so it keeps the same photo each time it opens. */
const pick = (key: string, n: number) => { let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % n; };

/** This trip's photo: one of ours for an autumn trip to an autumn-colour place, or null to use the guide's photo. */
export function destPhoto(id: string, month: number, startDate = '') {
  if (!AUTUMN_MONTHS.includes(month) || !wishPlaces('autumn').some(p => p.id === id)) return null;
  if (ownPhoto(id)) return { src: ownPhoto(id)! };
  return { src: AUTUMN[pick(id + startDate, AUTUMN.length)] };
}

const COAST = ['gwadar', 'kundmalir', 'karachi'], HERITAGE = ['mohenjo', 'lahore'];
/** A background for the trip's share card: our photo for the place and season, else one for the season. */
export function cardPhoto(id: string, month: number, startDate = '') {
  if (ownPhoto(id)) return ownPhoto(id)!;
  const own = destPhoto(id, month, startDate); if (own) return own.src;
  if (COAST.includes(id)) return '/photos/sea-sunset.webp';
  if (HERITAGE.includes(id)) return '/photos/mosque-arches.webp';
  if ([10, 11].includes(month)) return '/photos/autumn-hunza.webp';
  if ([12, 1, 2].includes(month)) return '/photos/snowfall.webp';
  if ([3, 4].includes(month)) return '/photos/blossom.webp';
  return '/photos/green-valley.webp';
}
