#!/usr/bin/env python3
"""Add photos to SafarCo in one go: shrink to WebP, register them, and (with --ship) build, commit and push.

Usage:
  python3 scripts/add-photos.py photos.txt [--ship "Commit message"]

photos.txt has one photo per line, fields split by "|":
  /path/to/photo.jpg | hunza | gallery,main | Autumn: Baltit Fort above the poplars

  - destination id: hunza, naran, skardu… (as in the destination guides)
  - uses, comma separated (every photo goes in the gallery unless "nogallery"):
      main            the destination's main photo
      spring|summer|autumn|winter   main photo for that season
      place:Attabad Lake            the photo for a place in the guide ("hunza|Attabad Lake")
      stop:Balakot                  the photo for a stop on the road
      first                         put it first in the gallery
      nogallery                     don't add it to the gallery
      hero                          also make a sharp 2560 px copy, for full-screen covers on big screens
      for:/photos/autumn-hunza.webp the original of a photo already on the site: remakes it from this file and
                                    adds its sharp cover copy (nothing else changes; destination and caption can be -)
  - caption, shown under the photo in the gallery
Blank lines and lines starting with # are skipped.

Photos become ~1300 px WebP under ~250 KB in public/photos, and are listed in src/photos-added.json
(read by src/photos.ts). Cover copies are 2560 px, under ~700 KB, in public/photos/hero; phones never load them. RAW files (ARW, NEF, CR2, DNG) use the full-size JPEG the camera stores inside them.
"""
import io, json, os, re, subprocess, sys
from PIL import Image, ImageCms, ImageOps

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(APP, 'public', 'photos')
REG = os.path.join(APP, 'src', 'photos-added.json')
MAX_SIDE, MAX_KB = 1300, 250
SEASONS = {'spring', 'summer', 'autumn', 'winter'}
KNOWN = {'main', 'gallery', 'first', 'nogallery', 'hero'}
HERO_OUT = os.path.join(OUT, 'hero')


def dest_ids():
    ids = set()
    for f in ('data.ts', 'imported.ts'):
        p = os.path.join(APP, 'src', 'engine', f)
        if os.path.exists(p):
            ids |= set(re.findall(r"""\bid"?: ['"]([a-z0-9-]+)['"]""", open(p, encoding='utf8').read()))
    return ids


def open_image(path):
    try:
        return Image.open(path)
    except Exception:
        # A RAW file: use the biggest JPEG stored inside it.
        data = open(path, 'rb').read()
        best, i = b'', 0
        while True:
            s = data.find(b'\xff\xd8\xff', i)
            if s < 0: break
            e = data.find(b'\xff\xd9', s)
            while e > 0 and e - s < len(best):
                e = data.find(b'\xff\xd9', e + 2)
            if e < 0: break
            if e + 2 - s > len(best): best = data[s:e + 2]
            i = s + 3
        if len(best) < 50_000: raise SystemExit(f'Can’t read {path}: not a photo this script knows')
        return Image.open(io.BytesIO(best))


def load(path):
    """The photo upright and in web colours: a wide-colour photo (Adobe RGB, Display P3) is converted to sRGB, so it
    keeps its colour on the site and doesn't come out dull."""
    im = ImageOps.exif_transpose(open_image(path))
    icc = im.info.get('icc_profile')
    if icc:
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            if 'srgb' not in (ImageCms.getProfileDescription(src) or '').lower():
                im = ImageCms.profileToProfile(im.convert('RGB') if im.mode not in ('RGB', 'CMYK') else im, src, ImageCms.createProfile('sRGB'), outputMode='RGB')
        except Exception:
            pass  # an unreadable profile: use the colours as they are
    return im.convert('RGB')


def shrink(path, name):
    im = load(path)
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    out = os.path.join(OUT, name + '.webp')
    # As good as fits: start high and step down only as far as the size needs.
    for q in (80, 76, 72, 68, 64, 60, 56, 52, 48, 44, 40):
        im.save(out, 'WEBP', quality=q, method=6)
        if os.path.getsize(out) <= MAX_KB * 1024: break
    return os.path.getsize(out) // 1024, im.size


def shrink_hero(path, name):
    """The sharp copy for full-screen covers: 2560 px on the long side, as good as fits in ~700 KB."""
    os.makedirs(HERO_OUT, exist_ok=True)
    im = load(path)
    if max(im.size) < 1700: print(f'  note: {os.path.basename(path)} is only {im.size[0]}x{im.size[1]}; the cover copy can\'t be much sharper')
    im.thumbnail((2560, 2560), Image.LANCZOS)
    out = os.path.join(HERO_OUT, name + '.webp')
    for q in (74, 70, 66, 62, 58):
        im.save(out, 'WEBP', quality=q, method=6)
        if os.path.getsize(out) <= 700 * 1024: break
    return os.path.getsize(out) // 1024, im.size


def slug(dest, caption, taken):
    words = re.sub(r'^(spring|summer|autumn|winter|day trip[^:]*):\s*', '', caption.lower())
    words = [w for w in re.findall(r'[a-z0-9]+', words) if w not in {'the', 'a', 'an', 'of', 'and', 'in', 'on', 'at', 'to', 'by', 'from', 'with', 'its'}]
    base = '-'.join([dest] + [w for w in words if w != dest][:3]) or dest
    name, n = base, 2
    while name in taken or os.path.exists(os.path.join(OUT, name + '.webp')):
        name, n = f'{base}-{n}', n + 1
    taken.add(name)
    return name


def main():
    args = sys.argv[1:]
    if not args: raise SystemExit(__doc__)
    ship = None
    if '--ship' in args:
        k = args.index('--ship'); ship = args[k + 1] if k + 1 < len(args) else 'Add photos'; del args[k:k + 2]
    lines = [l.strip() for l in open(args[0], encoding='utf8') if l.strip() and not l.strip().startswith('#')]
    reg = json.load(open(REG)) if os.path.exists(REG) else {}
    for k in ('own', 'seasonal', 'gallery', 'place', 'stop', 'hero'): reg.setdefault(k, {})
    ids, taken, done = dest_ids(), set(), []
    for line in lines:
        parts = [p.strip() for p in line.split('|')]
        if len(parts) < 4: raise SystemExit(f'Need 4 fields (photo | destination | uses | caption): {line}')
        path, dest, caption = parts[0], parts[1], '|'.join(parts[3:])
        # A place or stop name may have a comma ("place:Rakaposhi View Point, Ghulmet").
        uses = []
        for u in (x.strip() for x in parts[2].split(',') if x.strip()):
            if uses and uses[-1].startswith(('place:', 'stop:')) and u not in KNOWN and u not in SEASONS and not u.startswith(('place:', 'stop:')): uses[-1] += ', ' + u
            else: uses.append(u)
        # The original of a photo already on the site: remake it, add its cover copy, change nothing else.
        old = next((u[4:].strip() for u in uses if u.startswith('for:')), None)
        if old:
            name = os.path.splitext(os.path.basename(old))[0]
            if not os.path.exists(os.path.join(OUT, name + '.webp')): raise SystemExit(f'No photo {old} on the site, in: {line}')
            kb, size = shrink(path, name); hkb, hsize = shrink_hero(path, name)
            reg['hero'][f'/photos/{name}.webp'] = f'/photos/hero/{name}.webp'
            done.append(f'/photos/{name}.webp  {size[0]}x{size[1]}  {kb} KB  + cover {hsize[0]}x{hsize[1]} {hkb} KB  [for]')
            continue
        bad = [u for u in uses if u not in KNOWN and u not in SEASONS and not u.startswith(('place:', 'stop:'))]
        if bad: raise SystemExit(f'Unknown use "{bad[0]}" in: {line}')
        if dest not in ids: raise SystemExit(f'Unknown destination "{dest}" in: {line}')
        name = slug(dest, caption, taken)
        kb, size = shrink(path, name)
        src = f'/photos/{name}.webp'
        if 'hero' in uses:
            hkb, hsize = shrink_hero(path, name); reg['hero'][src] = f'/photos/hero/{name}.webp'
            kb = f'{kb} KB + cover {hsize[0]}x{hsize[1]} {hkb}'
        for u in uses:
            if u == 'main': reg['own'][dest] = src
            elif u in SEASONS: reg['seasonal'].setdefault(dest, {})[u] = src
            elif u.startswith('place:'): reg['place'][f'{dest}|{u[6:].strip()}'] = src
            elif u.startswith('stop:'): reg['stop'][u[5:].strip()] = src
            elif u not in ('first', 'nogallery', 'gallery', 'hero'): raise SystemExit(f'Unknown use "{u}" in: {line}')
        if 'nogallery' not in uses:
            g = [x for x in reg['gallery'].setdefault(dest, []) if x['src'] != src]
            item = {'src': src, 'caption': caption, **({'first': True} if 'first' in uses else {})}
            reg['gallery'][dest] = [item] + g if 'first' in uses else g + [item]
        done.append(f'{src}  {size[0]}x{size[1]}  {kb} KB  [{",".join(uses) or "gallery"}]')
    json.dump(reg, open(REG, 'w'), ensure_ascii=False, indent=1)
    print('\n'.join(done))
    if ship:
        sw = os.path.join(APP, 'public', 'sw.js'); s = open(sw).read()
        s = re.sub(r"safarco-shell-v(\d+)", lambda m: f"safarco-shell-v{int(m.group(1)) + 1}", s, count=1); open(sw, 'w').write(s)
        run = lambda c: subprocess.run(c, cwd=APP, shell=True, check=True, capture_output=True, text=True)
        run('npx tsc -b'); run('npx vitest run tests/photos.test.ts'); run('npx vite build')
        trailer = '\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_016igYTkJfUr5gXwGpezEfdx'
        run('python3 scripts/thumbs.py')
        run('git add -A public/photos src/photos-added.json public/sw.js')
        subprocess.run(['git', 'commit', '-qm', ship + trailer], cwd=APP, check=True)
        for i in range(4):
            if subprocess.run('git push -q origin HEAD:main', cwd=APP, shell=True).returncode == 0: break
        print('Shipped:', subprocess.run('git log --oneline -1', cwd=APP, shell=True, capture_output=True, text=True).stdout.strip())


if __name__ == '__main__':
    main()
