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
  sukkur: '/photos/sukkur-lansdowne-bridge.webp',
  kundmalir: '/photos/kund-malir-beach.webp',
  // Ormara, on the coast on the way: the generic sea photo is Karachi's beach.
  gwadar: '/photos/ormara-beach-evening.webp',
  hyderabad: '/photos/hyderabad-bangles.webp',
  thatta: '/photos/thatta-shah-jahan-arches.webp',
  uch: '/photos/uch-sharif-tombs.webp',
  multan: '/photos/multan-shah-rukn-e-alam.webp'
};
/** Our photo of one place at a destination, by "destination|place name". */
export const PLACE_PHOTOS: Record<string, string> = {
  'nathia|Mushkpuri Top': '/photos/mushkpuri-summer.webp',
  'multan|Shah Rukn-e-Alam shrine': '/photos/multan-shah-rukn-e-alam.webp',
  'multan|Qila Kohna Qasim Bagh': '/photos/multan-fort-aerial.webp',
  'sukkur|Lansdowne Bridge viewpoint': '/photos/sukkur-lansdowne-bridge.webp',
  'uch|Tomb of Bibi Jawindi': '/photos/uch-sharif-tombs.webp',
  'uch|Tomb of Baha’al-Halim': '/photos/uch-sharif-tombs.webp',
  'uch|Tomb of Ustad Nuriya': '/photos/uch-sharif-tombs.webp',
  'thatta|Keenjhar Lake': '/photos/keenjhar-lake.webp',
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
  nathia: [
    { src: '/photos/mushkpuri-summer.webp', caption: 'Mushkpuri Top in summer: pine forest and wild daisies along the trail' },
    { src: '/photos/mushkpuri-mist.webp', caption: 'Clouds rolling over the Mushkpuri meadow, with cows grazing near the top' }
  ],
  murree: [
    { src: '/photos/murree-winter-snow-road.webp', caption: 'Winter: fresh snow on the road through the Murree hills' },
    { src: '/photos/murree-winter-road.webp', caption: 'Winter: a snow-lined bend under pine and cedar' },
    { src: '/photos/murree-winter-road-1122.webp', caption: 'Winter: Rescue 1122 on a snowy road. After heavy snow, roads ice over; check before you drive' },
    { src: '/photos/murree-winter-hills.webp', caption: 'Winter: snow on the hills around Murree at dusk' },
    { src: '/photos/murree-winter-clouds.webp', caption: 'Winter: snow clouds drifting over the forested slopes' },
    { src: '/photos/murree-summer.webp', caption: 'Summer: Murree at sunrise, pine forest and morning mist over the hills' }
  ],
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
  multan: [
    { src: '/photos/multan-shah-rukn-e-alam.webp', caption: 'The tomb of Shah Rukn-e-Alam, Multan’s landmark from the 1320s' },
    { src: '/photos/multan-fort-aerial.webp', caption: 'The old fort mound from above: Shah Rukn-e-Alam’s tomb, Qasim Bagh and the city beyond' }
  ],
  uch: [{ src: '/photos/uch-sharif-tombs.webp', caption: 'The tombs of Bibi Jawindi (centre), Baha’al-Halim (left) and Ustad Nuriya (right), Uch Sharif' }],
  thatta: [
    { src: '/photos/thatta-shah-jahan-arches.webp', caption: 'Shah Jahan Mosque: rows of brick arches and glazed tiles' },
    { src: '/photos/thatta-shah-jahan-hall.webp', caption: 'Inside the Shah Jahan Mosque, built in the 1640s' },
    { src: '/photos/thatta-shah-jahan-aerial.webp', caption: 'The Shah Jahan Mosque and its gardens from above, in the middle of Thatta' },
    { src: '/photos/keenjhar-lake.webp', caption: 'Keenjhar Lake: boats, huts and the resort on the shore' },
    { src: '/photos/keenjhar-lake-resort.webp', caption: 'The Keenjhar Lake resort and boat jetty from above' }
  ],
  hyderabad: [{ src: '/photos/hyderabad-bangles.webp', caption: 'Glass bangles, Hyderabad’s famous craft, in the old bazaar' }],
  gwadar: [
    { src: '/photos/ormara-beach-evening.webp', caption: 'On the way: Ormara beach in the evening, below the Hammerhead cliffs' },
    { src: '/photos/ormara-hammerhead-dusk.webp', caption: 'On the way: the Ormara headland at dusk' },
    { src: '/photos/ormara-sunset.webp', caption: 'On the way: sunset over the sea at Ormara' }
  ],
  sukkur: [{ src: '/photos/sukkur-lansdowne-bridge.webp', caption: 'Lansdowne Bridge over the Indus at sunset, with the Ayub arch bridge behind' }, { src: '/photos/indus-highway-sindh.webp', caption: 'The Indus Highway through the date palms near Shikarpur' }]
};
/** Our own photo of a place, if we have one. */
/** Photos the admin set for a place (a web link), ahead of ours. */
export const PHOTO_EDITS: Record<string, string> = {};
/** Our photos of a place by season; the trip's season is shown when we have it, else any of them. */
type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';
const SEASONAL: Record<string, Partial<Record<SeasonName, string>>> = {
  murree: { summer: '/photos/murree-summer.webp', winter: '/photos/murree-winter-snow-road.webp' },
  nathia: { summer: '/photos/mushkpuri-summer.webp' }
};
const seasonName = (m: number): SeasonName => [3, 4, 5].includes(m) ? 'spring' : [6, 7, 8].includes(m) ? 'summer' : [9, 10, 11].includes(m) ? 'autumn' : 'winter';
export const ownPhoto = (id: string, month?: number): string | undefined => {
  const by = SEASONAL[id];
  return PHOTO_EDITS[id] || (by && month ? by[seasonName(month)] : undefined) || OWN[id] || (by ? Object.values(by)[0] : undefined);
};

/** A small, stable number for a trip, so it keeps the same photo each time it opens. */
const pick = (key: string, n: number) => { let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % n; };

/** This trip's photo: one of ours for an autumn trip to an autumn-colour place, or null to use the guide's photo. */
export function destPhoto(id: string, month: number, startDate = '') {
  if (!AUTUMN_MONTHS.includes(month) || !wishPlaces('autumn').some(p => p.id === id)) return null;
  if (ownPhoto(id, month)) return { src: ownPhoto(id, month)! };
  return { src: AUTUMN[pick(id + startDate, AUTUMN.length)] };
}

const COAST = ['karachi'], HERITAGE = ['lahore'], INTERIOR_SINDH = ['mohenjo', 'sehwan'];
/** A background for the trip's share card: our photo for the place and season, else one for the season. */
export function cardPhoto(id: string, month: number, startDate = '') {
  if (ownPhoto(id, month)) return ownPhoto(id, month)!;
  const own = destPhoto(id, month, startDate); if (own) return own.src;
  if (COAST.includes(id)) return '/photos/sea-sunset.webp';
  if (HERITAGE.includes(id)) return '/photos/mosque-arches.webp';
  if (INTERIOR_SINDH.includes(id)) return '/photos/indus-highway-sindh.webp';
  if ([10, 11].includes(month)) return '/photos/autumn-hunza.webp';
  if ([12, 1, 2].includes(month)) return '/photos/snowfall.webp';
  if ([3, 4].includes(month)) return '/photos/blossom.webp';
  return '/photos/green-valley.webp';
}
