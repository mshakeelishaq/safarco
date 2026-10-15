// Photos by shakeelnaturegraphy (in public/photos), used on the welcome screen and as the
// summary photo for trips in the right season. For now the autumn photos are one shared mix;
// photos for each destination will come later.
import { wishPlaces } from './engine/seasons';

/** Autumn colours across Gilgit-Baltistan, for trips in October and November. */
const AUTUMN = ['/photos/autumn-hunza.webp', '/photos/hunza-autumn-peaks.webp', '/photos/hunza-orchards.webp', '/photos/hunza-autumn-valley.webp', '/photos/hunza-golden-light.webp', '/photos/altit-fort.webp'];
const AUTUMN_MONTHS = [10, 11];
/** A place's own photo, used whenever it's the trip's place: Hunza is the view of Rakaposhi. */
const OWN: Record<string, string> = {
  hunza: '/photos/autumn-hunza.webp',
  // The Indus Highway through the date palms between Shikarpur and Sukkur, on the way south to Karachi.
  sukkur: '/photos/indus-highway-sindh.webp',
  kundmalir: '/photos/kund-malir-beach.webp',
  // Ormara, on the coast on the way: the generic sea photo is Karachi's beach.
  gwadar: '/photos/ormara-beach-evening.webp',
  hyderabad: '/photos/hyderabad-bangles.webp',
  thatta: '/photos/thatta-shah-jahan-arches.webp'
};
/** Our photo of one place at a destination, by "destination|place name". */
export const PLACE_PHOTOS: Record<string, string> = {
  'thatta|Shah Jahan Mosque, Thatta': '/photos/thatta-shah-jahan-arches.webp',
  'hyderabad|Shahi Bazaar': '/photos/hyderabad-bangles.webp',
  'kundmalir|Kund Malir beach': '/photos/kund-malir-beach.webp',
  'kundmalir|Golden Beach, Makran coast': '/photos/golden-beach.webp',
  'kundmalir|Princess of Hope': '/photos/princess-of-hope.webp',
  'kundmalir|Hingol mud volcanoes': '/photos/mud-volcano-hingol.webp'
};
/** Our photo of a stop on the road (by the stop's name), shown on that day of the plan. */
export const STOP_PHOTOS: Record<string, string> = { Ormara: '/photos/ormara-beach-evening.webp' };
/** A photo for something in a day's plan: a road stop or one of a destination's places. */
export const photoForStop = (label: string) => STOP_PHOTOS[label] || PLACE_PHOTOS[Object.keys(PLACE_PHOTOS).find(k => k.endsWith('|' + label)) || ''];
/** More of our photos of a place, with what they show, for its guide page. */
export const GALLERY: Record<string, { src: string; caption: string }[]> = {
  kundmalir: [
    { src: '/photos/kund-malir-beach.webp', caption: 'Kund Malir beach, with the Hingol hills along the shore' },
    { src: '/photos/kund-malir-waves.webp', caption: 'Green water and golden sand at Kund Malir' },
    { src: '/photos/golden-beach.webp', caption: 'Golden Beach and its jetty, just along the coast from Kund Malir' },
    { src: '/photos/golden-beach-road.webp', caption: 'The Makran Coastal Highway between the hills and Golden Beach' },
    { src: '/photos/golden-beach-jetty.webp', caption: 'The jetty at Golden Beach in the afternoon light' },
    { src: '/photos/princess-of-hope.webp', caption: 'Princess of Hope, the rock figure in Hingol National Park' },
    { src: '/photos/hingol-badlands.webp', caption: 'The Hingol badlands, with the Princess of Hope standing in the middle' },
    { src: '/photos/hingol-road-badlands.webp', caption: 'The Makran Coastal Highway winding through the Hingol hills' },
    { src: '/photos/mud-volcano-hingol.webp', caption: 'Mud volcano near the Makran coast, Hingol' },
    { src: '/photos/road-to-mud-volcano.webp', caption: 'The road to the mud volcanoes, with the sea beyond' }
  ],
  thatta: [
    { src: '/photos/thatta-shah-jahan-arches.webp', caption: 'Shah Jahan Mosque: rows of brick arches and glazed tiles' },
    { src: '/photos/thatta-shah-jahan-hall.webp', caption: 'Inside the Shah Jahan Mosque, built in the 1640s' },
    { src: '/photos/thatta-shah-jahan-aerial.webp', caption: 'The Shah Jahan Mosque and its gardens from above, in the middle of Thatta' }
  ],
  hyderabad: [{ src: '/photos/hyderabad-bangles.webp', caption: 'Glass bangles, Hyderabad’s famous craft, in the old bazaar' }],
  gwadar: [
    { src: '/photos/ormara-beach-evening.webp', caption: 'On the way: Ormara beach in the evening, below the Hammerhead cliffs' },
    { src: '/photos/ormara-hammerhead-dusk.webp', caption: 'On the way: the Ormara headland at dusk' },
    { src: '/photos/ormara-sunset.webp', caption: 'On the way: sunset over the sea at Ormara' }
  ],
  sukkur: [{ src: '/photos/indus-highway-sindh.webp', caption: 'The Indus Highway through the date palms near Shikarpur' }]
};
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

const COAST = ['karachi'], HERITAGE = ['lahore'], INTERIOR_SINDH = ['mohenjo', 'sehwan'];
/** A background for the trip's share card: our photo for the place and season, else one for the season. */
export function cardPhoto(id: string, month: number, startDate = '') {
  if (ownPhoto(id)) return ownPhoto(id)!;
  const own = destPhoto(id, month, startDate); if (own) return own.src;
  if (COAST.includes(id)) return '/photos/sea-sunset.webp';
  if (HERITAGE.includes(id)) return '/photos/mosque-arches.webp';
  if (INTERIOR_SINDH.includes(id)) return '/photos/indus-highway-sindh.webp';
  if ([10, 11].includes(month)) return '/photos/autumn-hunza.webp';
  if ([12, 1, 2].includes(month)) return '/photos/snowfall.webp';
  if ([3, 4].includes(month)) return '/photos/blossom.webp';
  return '/photos/green-valley.webp';
}
