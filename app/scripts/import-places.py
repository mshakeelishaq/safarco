#!/usr/bin/env python3
"""
Imports the "SafarCo places to check" spreadsheet into the app.

    python3 scripts/import-places.py path/to/file.xlsx [--report report.md]

It checks every row first and only imports what passes:
  - map pins outside Pakistan, or farther from the destination than the road distance, are left out;
  - drive times that don't fit the distance, odd visit lengths and duplicate places are listed to check;
  - removals, renames and new best months for the app's own destinations only apply when marked "Sure";
  - the day plans you gave for Skardu and Khaplu are kept as they are.
It writes src/engine/imported.ts (loaded by src/engine/data.ts) and a report of what to check.
Everything imported is "not checked yet" unless its Confidence is "Sure".
"""
import json, math, re, subprocess, sys, unicodedata
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path

from openpyxl import load_workbook

APP = Path(__file__).resolve().parent.parent
OUT = APP / 'src' / 'engine' / 'imported.ts'
MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
PK = (23.5, 37.2, 60.8, 77.9)  # lat min/max, lon min/max
CURATED_DAYS = {'skardu', 'khaplu'}  # day plans the owner gave; never replaced by an import
# What the owner has told us; an import never overrides these.
OWNER_BEST = {'skardu': [4, 5, 6, 7, 8, 9, 10, 11], 'khaplu': [4, 5, 6, 7, 8, 9, 10, 11]}
ACCESS = {'car': 'car', 'car (rough road)': 'rough', '4x4': '4x4', 'local jeep only': 'jeep', 'walk / hike': 'walk', 'boat': 'boat', 'chairlift': 'chairlift'}
TOD = {'morning': 'morning', 'midday': 'midday', 'afternoon': 'afternoon', 'sunset': 'sunset', 'any time': 'any'}


# ---------------------------------------------------------------- helpers
def s(v):
    return '' if v is None else str(v).strip()

def num(v):
    if v is None or v == '':
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r'-?\d+(?:\.\d+)?', str(v).replace(',', ''))
    return float(m.group()) if m else None

def norm(name):
    t = unicodedata.normalize('NFKD', s(name)).encode('ascii', 'ignore').decode().lower()
    t = re.sub(r'\(.*?\)', ' ', t)
    t = re.sub(r'[^a-z0-9 ]+', ' ', t)
    return ' '.join(w for w in t.split() if w not in ('the', 'and', 'of'))

def same(a, b, cut=0.86):
    a, b = norm(a), norm(b)
    return bool(a) and (a == b or SequenceMatcher(None, a, b).ratio() >= cut)

def hav(a, b, c, d):
    r = math.radians
    x = math.sin(r(c - a) / 2) ** 2 + math.cos(r(a)) * math.cos(r(c)) * math.sin(r(d - b) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(x))

def months(text):
    """'Apr–Oct', 'Dec–Feb, May–Sep', 'Jun–Sep, only when open', 'All year' -> [4..10] or None."""
    t = s(text).lower()
    if not t or 'all year' in t or 'year-round' in t:
        return None
    out = []
    for a, b in re.findall(r'([a-z]{3})[a-z]*\s*[–\-to]+\s*([a-z]{3})', t):
        if a in MON and b in MON:
            m = MON.index(a) + 1
            while True:
                if m not in out:
                    out.append(m)
                if m == MON.index(b) + 1:
                    break
                m = m % 12 + 1
    if not out:
        out = [MON.index(w) + 1 for w in re.findall(r'\b([a-z]{3})', t) if w in MON]
    return out or None

def clock(text):
    t = s(text).lower()
    m = re.match(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', t)
    if not m:
        return None
    h = int(m.group(1)) % 24 + int(m.group(2) or 0) / 60
    if m.group(3) == 'pm' and h < 12:
        h += 12
    return h

def coords(lat, lon, link):
    la, lo = num(lat), num(lon)
    if la is None or lo is None:
        m = re.search(r'(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)', s(link))
        if m:
            la, lo = float(m.group(1)), float(m.group(2))
    return (la, lo) if la is not None and lo is not None else None

def region_of(text):
    t = s(text).lower()
    for key, name in (('gilgit', 'Gilgit-Baltistan'), ('gb', 'Gilgit-Baltistan'), ('kashmir', 'Azad Kashmir'), ('ajk', 'Azad Kashmir'),
                      ('khyber', 'Khyber Pakhtunkhwa'), ('kp', 'Khyber Pakhtunkhwa'), ('swat', 'Khyber Pakhtunkhwa'), ('punjab', 'Punjab'),
                      ('sindh', 'Sindh'), ('baloch', 'Balochistan'), ('islamabad', 'Capital')):
        if re.search(r'\b' + key, t):
            return name
    return None

def slug(name):
    return re.sub(r'[^a-z0-9]+', '', norm(name).split(' ')[0]) or 'place'

def maps(la, lo):
    return f'https://www.google.com/maps/search/?api=1&query={la:.4f},{lo:.4f}'


# ---------------------------------------------------------------- read
def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    xlsx = Path(args[0])
    report_path = Path(args[args.index('--report') + 1]) if '--report' in args else Path('import-report.md')

    app = json.loads(subprocess.run(['npx', 'tsx', 'scripts/dump-app-data.ts'], cwd=APP, capture_output=True, text=True, check=True).stdout)
    dests = {d['id']: d for d in app['dests']}
    cities = {c[0].lower(): (c[2], c[3], c[1]) for c in app['cities']}
    node_by_name = {v[0].lower(): k for k, v in app['nodeInfo'].items()}
    edge_len = {}
    for a, b, km in app['edges']:
        edge_len[f'{a}-{b}'] = edge_len[f'{b}-{a}'] = km
    road_names = {norm(st[2]) for lst in app['edgeStops'].values() for st in lst}

    wb = load_workbook(xlsx, data_only=True)
    # Row 2 is the format example on every sheet; on New destinations the research put Machlu there, so it is read.
    rows = lambda name: [r for r in wb[name].iter_rows(min_row=2 if name == 'New destinations' else 3, values_only=True) if any(v not in (None, '') for v in r)]
    is_example = lambda r: s(r[0]).startswith('(example)')

    checks, notes, applied = [], [], []      # to check / kept or not applied / what changed
    chk = lambda where, text: checks.append((where, text))
    note = lambda where, text: notes.append((where, text))

    # ------------------------------------------------------------ destinations (the app's own)
    patch = {}
    for r in rows('Destinations'):
        if is_example(r) or s(r[0]) not in dests:
            continue
        d, conf = dests[s(r[0])], s(r[13]).lower()
        mine = months(r[6])
        if mine and mine != (d['best'] or None):
            if d['id'] in OWNER_BEST and set(mine) != set(OWNER_BEST[d['id']]):
                note(d['name'], f"Best months: the sheet says {s(r[6])}; kept what you told me ({fmt_months(OWNER_BEST[d['id']])}).")
            elif conf == 'sure':
                patch.setdefault(d['id'], {})['best'] = mine
                applied.append((d['name'], f'Best months set to {s(r[6])}.'))
            else:
                note(d['name'], f"Best months: the sheet suggests {s(r[6])} (app has {fmt_months(d['best'])}). Mark Sure to apply.")

    # ------------------------------------------------------------ new destinations
    place_rows = [r for r in rows('Places') if not is_example(r)]
    name_to_id = {}
    for r in place_rows:
        if s(r[0]) and s(r[0]) not in dests and s(r[1]):
            name_to_id[norm(r[1])] = s(r[0])
    new_dests = {}
    for r in rows('New destinations'):
        name = s(r[0])
        if not name or name.lower().startswith('destination name') or name.startswith('(example'):
            continue
        did = name_to_id.get(norm(name)) or next((v for k, v in name_to_id.items() if same(k, name, .8)), None) or slug(name)
        if did in dests:
            note(name, f'Already a destination in the app ({dests[did]["name"]}); not added twice.')
            continue
        base = s(r[2]) or name
        c = coords(r[3], r[4], '')
        if not c:
            for key in (base, name, base.split(',')[0], name.split(' ')[0], name.split('&')[0].strip()):
                if key.lower() in cities:
                    c = cities[key.lower()][:2]
                    break
        region = region_of(r[1]) or (cities.get(base.lower(), (0, 0, None))[2])
        if not c:
            chk(name, 'No location for the base town: add Latitude and Longitude on the New destinations sheet. Not imported yet.')
            continue
        if not (PK[0] <= c[0] <= PK[1] and PK[2] <= c[1] <= PK[3]):
            chk(name, f'Base town location {c} is outside Pakistan. Not imported.')
            continue
        near = min(dests.values(), key=lambda d: hav(c[0], c[1], d['lat'], d['lon']))
        dist = hav(c[0], c[1], near['lat'], near['lon'])
        if dist < 25:
            note(name, f'Only {dist:.0f} km from {near["name"]}: it may fit better as places on the {near["name"]} trip.')
        air = s(r[5]).split(' ')[0].split(',')[0]
        new_dests[did] = {'id': did, 'name': name, 'town': base, 'region': region or s(r[1]) or 'Pakistan', 'regionKey': region,
                          'lat': round(c[0], 4), 'lon': round(c[1], 4), 'air': air if air in app['airports'] else None,
                          'best': months(r[6]), 'avoid': s(r[7]), 'road': s(r[8]), 'why': s(r[10]), 'checked': s(r[11]).lower() == 'sure',
                          'places': [], 'days': None}

    # ------------------------------------------------------------ places
    info, by_dest, skipped_ids = {}, {}, set()
    def base_of(did):
        d = dests.get(did) or new_dests.get(did)
        return (d['lat'], d['lon']) if d else None
    for r in place_rows:
        did = s(r[0])
        if did not in dests and did not in new_dests:
            if did and did not in skipped_ids and not any(norm(n) == norm(did) or did in norm(n) for n in name_to_id):
                chk(did, f'Places for an unknown destination id "{did}" were skipped.'); skipped_ids.add(did)
            continue
        dname = (dests.get(did) or new_dests[did])['name']
        app_name, keep, correct, conf = s(r[2]), s(r[6]).lower(), s(r[7]), s(r[19]).lower()
        name = correct if (keep == 'rename' or not app_name) and correct else app_name
        if not name:
            continue
        sure = conf == 'sure'
        # Removals and renames of the app's places need your OK.
        if app_name and keep == 'no':
            if sure:
                patch.setdefault(did, {}).setdefault('remove', []).append(app_name); applied.append((dname, f'Removed "{app_name}".'))
            else:
                note(dname, f'Suggested removing "{app_name}": {first_line(r[18])} Mark Sure to apply.')
            continue
        if app_name and keep == 'rename' and correct and correct != app_name:
            if sure:
                patch.setdefault(did, {}).setdefault('rename', []).append([app_name, correct]); applied.append((dname, f'Renamed "{app_name}" to "{correct}".'))
            else:
                note(dname, f'Suggested renaming "{app_name}" to "{correct}". Mark Sure to apply.')
                name = app_name
        # A new place for one of the app's destinations that is already elsewhere (another destination or a road stop).
        if not app_name and did in dests:
            other = next((o for o in dests.values() if o['id'] != did and any(same(p[0], name) for p in o['places'])), None)
            if other:
                note(dname, f'"{name}" is already a place in {other["name"]}; not added twice.'); continue
            if norm(name) in road_names or any(same(name, rn) for rn in road_names):
                note(dname, f'"{name}" is already a stop on the road; not added as a place.'); continue
            if any(same(p[0], name) for p in dests[did]['places']):
                note(dname, f'"{name}" looks like a place the app already has; not added twice.'); continue
        # Duplicates within the sheet.
        seen = by_dest.setdefault(did, [])
        dup = next((x for x in seen if same(x['name'], name)), None)
        if dup:
            chk(dname, f'"{name}" and "{dup["name"]}" look like the same place. Only the first is imported.'); continue
        rec = {'name': name, 'new': not app_name, 'row': r}
        seen.append(rec)

        # Numbers, with checks.
        c, base = coords(r[8], r[9], r[10]), base_of(did)
        km, mins, visit, fee = num(r[11]), num(r[12]), num(r[14]), num(r[17])
        acc, tod = ACCESS.get(s(r[13]).lower()), TOD.get(s(r[15]).lower())
        if c and not (PK[0] <= c[0] <= PK[1] and PK[2] <= c[1] <= PK[3]):
            chk(dname, f'"{name}": pin {c[0]}, {c[1]} is outside Pakistan. Left out.'); c = None
        if c and base:
            straight = hav(base[0], base[1], c[0], c[1])
            if km and straight > km * 1.05 + 3:
                chk(dname, f'"{name}": the pin is {straight:.0f} km from {dname} in a straight line, but the road distance says {km:.0f} km. One is wrong; pin left out.'); c = None
            elif not km and straight > 120:
                chk(dname, f'"{name}": the pin is {straight:.0f} km from {dname}. Check it is the right place; pin left out.'); c = None
            elif km and km > straight * 4 + 15:
                chk(dname, f'"{name}": {km:.0f} km by road but only {straight:.0f} km away in a straight line. Check the distance.')
        if km and mins:
            speed = km / (mins / 60)
            if speed > 70:
                chk(dname, f'"{name}": {km:.0f} km in {mins:.0f} min is {speed:.0f} km/h, too fast for these roads. Drive time left out.'); mins = None
            elif speed < 6 and acc in ('car', 'rough', '4x4'):
                chk(dname, f'"{name}": {km:.0f} km in {mins:.0f} min is only {speed:.0f} km/h by car. Check the drive time.')
        if visit is not None and (visit < 5 or (visit > 300 and acc != 'walk')):
            chk(dname, f'"{name}": a visit of {visit:.0f} min looks wrong. Left out.'); visit = None
        if fee is not None and (fee < 0 or fee > 20000):
            chk(dname, f'"{name}": entry fee {fee:.0f} PKR looks wrong. Left out.'); fee = None
        inf = {k: v for k, v in {'lat': c and round(c[0], 4), 'lon': c and round(c[1], 4), 'km': km and round(km), 'min': mins and round(mins),
                                 'visit': visit and round(visit), 'access': acc, 'tod': tod, 'fee': fee and round(fee),
                                 'months': months(r[16]), 'checked': sure}.items() if v not in (None, '')}
        rec['info'], rec['coords'] = inf, c
        if len(inf) > 1:
            info[f'{did}|{name}'] = inf
        # New places: added to the destination (not checked unless Sure).
        if not app_name:
            dist = f'{km:.0f} km' + (f' · {mins:.0f} min' if mins else '') if km else (s(r[13]) or 'Nearby')
            tip = s(r[18]).split('Source:')[0].strip().rstrip('.')
            place = [name, dist, (tip[:120] + '…') if len(tip) > 120 else tip]
            pm = months(r[16]) if sure else None
            place += [pm, maps(*c) if c else None]
            if did in new_dests:
                new_dests[did]['places'].append(place)
            else:
                patch.setdefault(did, {}).setdefault('add', []).append(place); applied.append((dname, f'Added "{name}" (not checked yet).'))

    for did, d in new_dests.items():
        if not d['places']:
            chk(d['name'], 'No places for this destination on the Places sheet. Not imported yet.')
    new_dests = {k: v for k, v in new_dests.items() if v['places']}

    # ------------------------------------------------------------ day plans
    suggested = {}  # renames waiting for Sure: new name -> app name
    for r in place_rows:
        if s(r[6]).lower() == 'rename' and s(r[2]) and s(r[7]):
            suggested[(s(r[0]), norm(r[7]))] = s(r[2])
    towns = {norm(c) for c in cities} | {norm(v[0]) for v in app['nodeInfo'].values()} | {norm(d['name']) for d in {**dests, **new_dests}.values()}
    def pool_of(did):
        pool = [p[0] for p in (dests[did]['places'] if did in dests else [])] + [x['name'] for x in by_dest.get(did, [])]
        return pool + [ren[1] for ren in patch.get(did, {}).get('rename', [])]
    def find(did, label):
        """A place for this label: at this destination (also by a suggested new name), else at another one."""
        if (did, norm(label)) in suggested:
            return suggested[(did, norm(label))], None
        for cut in (.86, .72):
            got = next((p for p in pool_of(did) if same(p, label, cut)), None)
            if got:
                return got, None
        for o in list(dests.values()) + list(new_dests.values()):
            if o['id'] != did:
                got = next((p for p in (o['places'] + [x['name'] for x in by_dest.get(o['id'], [])]) if same(p[0] if isinstance(p, list) else p, label)), None)
                if got:
                    return (got[0] if isinstance(got, list) else got), o['id']
        return None, None
    def resolve(did, text):
        """Splits "A, B, C" into places, keeping names that contain a comma ("Eagle's Nest, Duikar")."""
        segs = [x.strip() for x in re.split(r'\n|,|→', text) if x.strip()]
        names, missing, towns_only, borrowed, i = [], [], [], [], 0
        while i < len(segs):
            for j in range(min(len(segs), i + 3), i, -1):
                got, other = find(did, ', '.join(segs[i:j]))
                if got:
                    names.append(got); i = j
                    if other: borrowed.append((got, other))
                    break
            else:
                (towns_only if norm(segs[i]) in towns else missing).append(segs[i]); i += 1
        return list(dict.fromkeys(names)), missing, towns_only, borrowed
    days_by = {}
    for r in rows('Day plans'):
        if is_example(r):
            continue
        did, text = s(r[0]), s(r[3])
        if not text or (did not in dests and did not in new_dests):
            continue
        dname = (dests.get(did) or new_dests[did])['name']
        if did in CURATED_DAYS:
            continue
        names, missing, towns_only, borrowed = resolve(did, text)
        # Places borrowed from a nearby destination are added here too, so the day can use them.
        for nm, other in borrowed:
            src = next((p for p in (dests.get(other) or new_dests[other])['places'] if p[0] == nm), None) or [nm, 'Nearby', '', None, None]
            target = new_dests[did]['places'] if did in new_dests else patch.setdefault(did, {}).setdefault('add', [])
            if not any(p[0] == nm for p in target) and not (did in dests and any(p[0] == nm for p in dests[did]['places'])):
                target.append(list(src))
                if did in dests: applied.append((dname, f'Added "{nm}" (from {(dests.get(other) or new_dests[other])["name"]}) for a day plan.'))
            key = f'{other}|{nm}'
            if key in info and f'{did}|{nm}' not in info: info[f'{did}|{nm}'] = info[key]
        if missing:
            chk(dname, f'Day plan "{text[:80]}": {", ".join(missing)} is not on the Places sheet for {dname}. Left out of the day.')
        if not names:
            continue
        over = s(r[6])
        stay = None
        if over and not over.lower().startswith('no') and not over.lower().startswith('optional'):
            stay = next((k for k, v in {**dests, **new_dests}.items() if k != did and norm(v['name']).split(' ')[0] in norm(over)), None)
        day = {'places': names}
        tip = s(r[8]).split('Source:')[0].replace('Suggested schedule.', '').strip()
        if tip:
            day['note'] = tip if tip.endswith('.') else tip + '.'
        if stay:
            day['stay'] = stay
        leave, back = clock(r[4]), clock(r[5])
        if leave:
            day['leave'] = round(leave, 2)
        # Does the day fit before sunset? Straight-line distances ×1.4 at 30 km/h, plus visits.
        base = base_of(did)
        pins = [(by_dest_info(by_dest, did, n)) for n in names]
        if leave and base and all(p and p.get('lat') for p in pins):
            pts = [base] + [(p['lat'], p['lon']) for p in pins] + [base]
            drive = sum(hav(*pts[i], *pts[i + 1]) for i in range(len(pts) - 1)) * 1.4 / 30
            visits = sum((p.get('visit') or 45) for p in pins) / 60
            mo = (months(r[7]) or (dests.get(did) or new_dests[did]).get('best') or [7])[0]
            end = leave + drive + visits
            if end > app['sunset'][mo - 1]:
                chk(dname, f'Day plan "{", ".join(names)}": leaving at {hhmm(leave)} gets back around {hhmm(end)}, after sunset ({hhmm(app["sunset"][mo - 1])}) in {MON[mo - 1].title()}. Leave earlier or drop a place.')
            if len(pts) > 4:
                best = nearest_order(pts)
                if best * 1.4 < sum(hav(*pts[i], *pts[i + 1]) for i in range(len(pts) - 1)):
                    chk(dname, f'Day plan "{", ".join(names)}" goes back and forth; a different order saves a lot of driving.')
        days_by.setdefault(did, []).append(day)
    for did, ds in days_by.items():
        if did in new_dests:
            new_dests[did]['days'] = ds
        elif not dests[did].get('days'):
            patch.setdefault(did, {})['days'] = ds
            applied.append((dests[did]['name'], f'{len(ds)} day plan{"s" if len(ds) > 1 else ""} added (not checked yet).'))
    for did in CURATED_DAYS:
        note(dests[did]['name'], 'Day plans: kept the ones you gave me.')

    # ------------------------------------------------------------ road stops
    stops = {k: [list(x) for x in v] for k, v in app['edgeStops'].items()}
    changed = set()
    kinds = {'tea': 'tea', 'food': 'food', 'view': 'view', 'fuel': 'fuel', 'washrooms': 'tea', 'mosque / prayer': 'tea'}
    for r in rows('Road stops'):
        if is_example(r) or s(r[0]) == '(example)':
            continue
        a, b = node_by_name.get(s(r[0]).lower()), node_by_name.get(s(r[1]).lower())
        if not a or not b:
            continue
        key = f'{a}-{b}' if f'{a}-{b}' in stops or f'{a}-{b}' in edge_len else f'{b}-{a}'
        flip = key != f'{a}-{b}'
        L = edge_len.get(key)
        app_name, keep, correct, conf = s(r[2]), s(r[6]).lower(), s(r[7]), s(r[14]).lower()
        km = num(r[8])
        km = (L - km if flip and km is not None and L else km)
        kind = kinds.get(s(r[9]).lower())
        where = f'{s(r[0])} → {s(r[1])}'
        if app_name:
            lst = stops.get(key, [])
            cur = next((x for x in lst if x[2] == app_name), None)
            if not cur or conf != 'sure':
                continue
            if keep == 'no':
                lst.remove(cur); changed.add(key); applied.append((where, f'Removed stop "{app_name}".')); continue
            if keep == 'rename' and correct:
                cur[2] = correct
            if km is not None and L and 0 < km < L:
                cur[0] = round(km)
            if kind:
                cur[1] = kind
            changed.add(key); applied.append((where, f'Updated stop "{cur[2]}".'))
        else:
            name = correct or s(r[2])
            if not name:
                continue
            # No km but a pin: place it along the stretch by its distance from the start town.
            pin = coords(r[11], r[12], '')
            if km is None and pin and L and a in app['nodes'] and b in app['nodes']:
                A, B = app['nodes'][a], app['nodes'][b]
                straight = hav(A[0], A[1], B[0], B[1])
                if straight > 1 and hav(A[0], A[1], *pin) + hav(*pin, B[0], B[1]) < straight * 1.25:
                    est = hav(A[0], A[1], *pin) / straight * edge_len[f'{a}-{b}' if f'{a}-{b}' in edge_len else f'{b}-{a}']
                    km = L - est if flip else est
            if km is None or not L or not (0 < km < L):
                chk(where, f'New stop "{name}": km from start {s(r[8]) or "missing"} is not on this stretch ({L or "?"} km). Not added.'); continue
            lst = stops.setdefault(key, [])
            if any(same(x[2], name) for x in lst):
                continue
            # Each stop adds time to the drive, so new ones go in only when checked.
            if conf != 'sure':
                note(where, f'New stop "{name}" at km {round(km)}: not added until marked Sure (each stop adds time to the drive).'); continue
            lst.append([round(km), kind or 'view', name, s(r[13]).split('Source:')[0].strip()[:100]])
            lst.sort(key=lambda x: x[0]); changed.add(key); applied.append((where, f'Added stop "{name}" at km {round(km)} (not checked yet).'))

    # ------------------------------------------------------------ write
    write_ts(new_dests, patch, info, {k: stops[k] for k in sorted(changed)}, xlsx.name)
    write_report(report_path, xlsx.name, new_dests, patch, info, checks, notes, applied)
    print(f'Wrote {OUT.relative_to(APP)} and {report_path}')
    print(f'{len(new_dests)} new destinations · {sum(len(p.get("add", [])) for p in patch.values())} new places for existing ones · '
          f'{sum(1 for v in info.values() if "lat" in v)} places pinned · {len(changed)} road stretches changed · {len(checks)} to check')


def first_line(text):
    t = s(text).split('\n')[0].split('Source:')[0].strip()
    return t if t.endswith('.') else t + '.'

def by_dest_info(by_dest, did, name):
    rec = next((x for x in by_dest.get(did, []) if x['name'] == name), None)
    return rec and rec.get('info')

def nearest_order(pts):
    start, end, rest = pts[0], pts[-1], pts[1:-1]
    path, cur, total = [], start, 0
    while rest:
        nxt = min(rest, key=lambda p: hav(*cur, *p)); total += hav(*cur, *nxt); rest.remove(nxt); cur = nxt
    return total + hav(*cur, *end)

def hhmm(h):
    h = h % 24
    return f'{int(h) % 12 or 12}:{int(round(h % 1 * 60)) % 60:02d} {"am" if h < 12 else "pm"}'

def fmt_months(ms):
    if not ms:
        return 'all year'
    return f'{MON[ms[0] - 1].title()}–{MON[ms[-1] - 1].title()}'


def trim(place):
    """A place without empty trailing fields: [name, distance, note, months?, link?]."""
    p = list(place)
    while len(p) > 3 and p[-1] in (None, ''):
        p.pop()
    return p

def write_ts(new_dests, patch, info, stops, source):
    js = lambda v: json.dumps(v, ensure_ascii=False)
    for d in new_dests.values():
        d['places'] = [trim(p) for p in d['places']]
    for p in patch.values():
        if 'add' in p:
            p['add'] = [trim(x) for x in p['add']]
    lines = [
        '// Generated by scripts/import-places.py from "' + source + '". Do not edit by hand: change the',
        '// spreadsheet and import it again. Nothing here is checked by SafarCo unless `checked` is true.',
        "import type { DestInput, EdgeStop, Place } from './data';",
        '',
        'export interface PlaceInfo { lat?: number; lon?: number; km?: number; min?: number; visit?: number; access?: string; tod?: string; fee?: number; months?: number[]; checked?: boolean }',
        'export interface DestPatch { add?: Place[]; rename?: [string, string][]; remove?: string[]; days?: DestInput[\'days\']; best?: number[] }',
        '',
        f'export const IMPORTED_ON = {js(date.today().isoformat())};',
        '',
        '/** New destinations from the spreadsheet. */',
        'export const IMPORTED_DESTS: DestInput[] = [',
    ]
    for d in new_dests.values():
        o = {'id': d['id'], 'name': d['name'], 'town': d['town'], 'region': d['region'], 'lat': d['lat'], 'lon': d['lon'], 'node': None, 'air': d['air'],
             'best': d['best'], 'checked': d['checked'], 'places': d['places']}
        if d['days']:
            o['days'] = d['days']
        if d['avoid'] or d['road']:
            o['guideNote'] = ' '.join(x for x in [d['road'] if not d['road'].lower().startswith('check current') else '', f"Avoid: {d['avoid']}." if d['avoid'] else ''] if x) or None
        o = {k: v for k, v in o.items() if v is not None}
        lines.append('  ' + js(o) + ',')
    lines += ['];', '', '/** Changes to the app\'s own destinations: new places, and renames, removals and months marked Sure. */',
              'export const DEST_PATCH: Record<string, DestPatch> = ' + js(patch) + ';', '',
              '/** Map pin, distance, visit length and more for each place, by "destination id|place name". */',
              'export const PLACE_INFO: Record<string, PlaceInfo> = {']
    for k in sorted(info):
        lines.append(f'  {js(k)}: {js(info[k])},')
    lines += ['};', '', '/** Road stretches with stops changed or added, as complete lists. */',
              'export const STOP_PATCH: Record<string, EdgeStop[]> = ' + js(stops) + ';', '']
    OUT.write_text('\n'.join(lines))


def write_report(path, source, new_dests, patch, info, checks, notes, applied):
    group = lambda items: {k: [t for w, t in items if w == k] for k in dict.fromkeys(w for w, _ in items)}
    out = [f'# Import report: {source}', '', f'Imported on {date.today().isoformat()}.', '',
           f'- **{len(new_dests)} new destinations:** ' + (', '.join(d['name'] for d in new_dests.values()) or 'none'),
           f'- **{sum(len(p.get("add", [])) for p in patch.values())} new places** for the app\'s destinations',
           f'- **{sum(1 for v in info.values() if "lat" in v)} places with a map pin**, {sum(1 for v in info.values() if "visit" in v)} with a visit length, {sum(1 for v in info.values() if "min" in v)} with a drive time',
           f'- **{len(checks)} things to check** (below). Everything else is in the app as "not checked yet", unless marked Sure.', '']
    out += ['## Check these', ''] if checks else ['## Check these', '', 'Nothing. 🎉', '']
    for w, ts in group(checks).items():
        out.append(f'**{w}**'); out += [f'- {t}' for t in ts]; out.append('')
    out += ['## Kept your version, or waiting for "Sure"', '']
    for w, ts in group(notes).items():
        out.append(f'**{w}**'); out += [f'- {t}' for t in ts]; out.append('')
    out += ['## What changed in the app', '']
    for w, ts in group(applied).items():
        out.append(f'**{w}**'); out += [f'- {t}' for t in ts]; out.append('')
    Path(path).write_text('\n'.join(out))


if __name__ == '__main__':
    main()
