// Photos by shakeelnaturegraphy (in public/photos), used on the welcome screen and as the
// summary photo for trips to these places in the right season.

/** Photos for a destination, with the months they show truly (an autumn photo for an autumn trip). */
export const DEST_PHOTOS: Record<string, { src: string; months: number[] }[]> = {
  hunza: [
    { src: '/photos/hunza-autumn-peaks.webp', months: [10, 11] },
    { src: '/photos/autumn-hunza.webp', months: [10, 11] },
    { src: '/photos/hunza-autumn-valley.webp', months: [10, 11] },
    { src: '/photos/hunza-golden-light.webp', months: [10, 11] }
  ]
};

/** This trip's photo: one of ours for the destination and month, or null to fall back to the guide's photo. */
export const destPhoto = (id: string, month: number) => (DEST_PHOTOS[id] || []).find(p => p.months.includes(month)) || null;
