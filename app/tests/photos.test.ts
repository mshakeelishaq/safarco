import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GALLERY, PLACE_PHOTOS, STOP_PHOTOS, ownPhoto } from '../src/photos';
import { DESTS } from '../src/engine/data';

const file = (src: string) => new URL(`../public${src}`, import.meta.url);
describe('photos', () => {
  it('every photo the site lists is in public/photos', () => {
    const srcs = [...Object.values(GALLERY).flat().map(x => x.src), ...Object.values(PLACE_PHOTOS), ...Object.values(STOP_PHOTOS),
      ...DESTS.flatMap(d => [1, 4, 7, 10].map(m => ownPhoto(d.id, m)).filter((x): x is string => !!x && x.startsWith('/photos/')))];
    expect(srcs.filter(s => s.startsWith('/photos/') && !existsSync(file(s)))).toEqual([]);
  });
  it('every gallery photo has a caption', () => {
    expect(Object.values(GALLERY).flat().filter(x => !x.caption.trim())).toEqual([]);
  });
});
