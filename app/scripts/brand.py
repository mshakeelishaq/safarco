#!/usr/bin/env python3
"""The SafarCo logo family, drawn as outlines (no font needed): the main logo, the ".pk" marketing logo, the badge,
the opening screen's wordmark, and src/components/logo-paths.ts for the app.

  python3 scripts/brand.py

Writes public/brand/*.svg; the PNGs are made from these by a browser.
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FS = os.path.join(APP, 'node_modules', '@fontsource')
SERIF = TTFont(os.path.join(FS, 'source-serif-4', 'files', 'source-serif-4-latin-600-normal.woff'))
SANS = TTFont(os.path.join(FS, 'plus-jakarta-sans', 'files', 'plus-jakarta-sans-latin-700-normal.woff'))
INK, TEAL, GOLD, RED, WHITE = '#13212B', '#0B5F7C', '#F5B83D', '#E8624A', '#FFFFFF'
ROAD = 'M64 30 C 42 20, 20 30, 32 46 C 42 58, 72 52, 68 72 C 64 88, 36 88, 24 80'
def advances(font, s):
    """Where each letter starts (and the full width), from the font's own letter widths, at 1000 px."""
    cmap, hm, x, out = font.getBestCmap(), font['hmtx'], 0, [0]
    for ch in s: x += hm[cmap[ord(ch)]][0] * 1000 / font['head'].unitsPerEm; out.append(x)
    return out


POS = {'ss': advances(SERIF, 'SafarCo.pk'), 'pj': advances(SANS, 'PAKISTAN TRIP PLANNER')}


def text(font, s, pos, size, x, y, spacing=0.0):
    """Outline of s, letter i at x + pos[i] (measured at 1000 px), baseline y."""
    gs, cmap, k = font.getGlyphSet(), font.getBestCmap(), size / 1000
    pen = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
    for i, ch in enumerate(s):
        if ch == ' ': continue
        gs[cmap[ord(ch)]].draw(TransformPen(pen, (k, 0, 0, -k, x + pos[i] * k + i * spacing, y)))
    return pen.getCommands()


def r(v): return f'{v:.2f}'.rstrip('0').rstrip('.')


def mark(x, y, h, light):
    """The road S and pin, h tall, top-left at x, y (its drawing box is 14 -3 74 101)."""
    s = h / 101
    road = WHITE if light else TEAL
    hole = '' if light else f'<circle cx="74" cy="11" r="4.2" fill="{WHITE}"/>'
    return (f'<g transform="translate({r(x - 14 * s)} {r(y + 3 * s)}) scale({r(s)})">'
            f'<path d="{ROAD}" fill="none" stroke="{road}" stroke-width="16" stroke-linecap="round"/>'
            f'<path d="{ROAD}" fill="none" stroke="{GOLD}" stroke-width="2.4" stroke-dasharray="5 5" stroke-linecap="round"/>'
            f'<path d="M74 30 C 74 30, 62 18, 62 11 A12 12 0 1 1 86 11 C 86 18, 74 30, 74 30Z" fill="{RED}"/>{hole}</g>'), h * 74 / 101


def svg(w, h, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {r(w)} {r(h)}" width="{r(w)}" height="{r(h)}" role="img" aria-label="{title}">{body}</svg>\n'


ss = POS['ss']
W = lambda a, b, size: (ss[b] - ss[a]) * size / 1000  # width of letters a..b-1


def main_logo(light, pk=False):
    """A: the mark, then "SafarCo" (B adds a gold ridge above and ".pk")."""
    S, pad = 100, 6
    mh = S * (1.42 if pk else 1.3)
    m, mw = mark(pad, pad, mh, light)
    x0 = pad + mw + S * 0.3
    base = pad + mh * 0.57 + S * 0.335
    name = WHITE if light else INK
    co = WHITE if light else TEAL
    body = m
    if pk:
        body += f'<path d="{text(SERIF, "SafarCo", ss, S, x0, base)}" fill="{name}"/>'
        body += f'<path d="{text(SERIF, "SafarCo.pk", ss, S, x0, base)[len(text(SERIF, "SafarCo", ss, S, x0, base)):]}" fill="{GOLD}"/>'
        ry, rw = base - S * 0.67 - S * 0.2, W(0, 7, S) * 0.62
        body += (f'<path d="M{r(x0)} {r(ry)} H{r(x0 + rw * 0.36)} L{r(x0 + rw * 0.47)} {r(ry - S * 0.1)} L{r(x0 + rw * 0.54)} {r(ry - S * 0.045)} '
                 f'L{r(x0 + rw * 0.61)} {r(ry - S * 0.135)} L{r(x0 + rw * 0.72)} {r(ry)} H{r(x0 + rw)}" fill="none" stroke="{GOLD}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>')
        w = x0 + W(0, 10, S) + pad
    else:
        body += f'<path d="{text(SERIF, "Safar", ss, S, x0, base)}" fill="{name}"/>'
        body += f'<path d="{text(SERIF, "SafarCo", ss, S, x0, base)[len(text(SERIF, "Safar", ss, S, x0, base)):]}" fill="{co}"/>'
        w = x0 + W(0, 7, S) + pad
    return w, mh + 2 * pad, body


def badge(light, pk=False):
    """C: the mark above, the name, and "PAKISTAN TRIP PLANNER" between gold rules."""
    S, pad = 100, 10
    mh = S * 1.5
    tag, tsize, track = 'PAKISTAN TRIP PLANNER', S * 0.17, S * 0.17 * 0.32
    pj = POS['pj']
    tw = pj[len(tag)] * tsize / 1000 + track * (len(tag) - 1)
    nw = W(0, 10 if pk else 7, S)
    rule, rgap = S * 0.36, S * 0.16
    w = max(nw, tw + 2 * (rule + rgap)) + 2 * pad
    m, mw = mark((w - mh * 74 / 101) / 2, pad, mh, light)
    base = pad + mh + S * 0.2 + S * 0.67
    x0 = (w - nw) / 2
    name = WHITE if light else INK
    body = m + f'<path d="{text(SERIF, "SafarCo", ss, S, x0, base)}" fill="{name}"/>'
    if pk: body += f'<path d="{text(SERIF, "SafarCo.pk", ss, S, x0, base)[len(text(SERIF, "SafarCo", ss, S, x0, base)):]}" fill="{GOLD}"/>'
    ty = base + S * 0.42
    tx = (w - tw) / 2
    sub = 'rgba(255,255,255,.8)' if light else '#5C6870'
    body += f'<path d="{text(SANS, tag, pj, tsize, tx, ty, track)}" fill="{sub}"/>'
    ly = ty - tsize * 0.36
    body += f'<path d="M{r(tx - rgap - rule)} {r(ly)} h{r(rule)} M{r(tx + tw + rgap)} {r(ly)} h{r(rule)}" stroke="{GOLD}" stroke-width="2"/>'
    return w, ty + tsize * 0.3 + pad, body


out = os.path.join(APP, 'public', 'brand')
for light in (False, True):
    sfx = '-white' if light else ''
    w, h, body = main_logo(light)
    open(os.path.join(out, f'safarco-logo{sfx}.svg'), 'w').write(svg(w, h, body, 'SafarCo'))
    w, h, body = main_logo(light, pk=True)
    open(os.path.join(out, f'safarco-logo-pk{sfx}.svg'), 'w').write(svg(w, h, body, 'SafarCo.pk'))
    w, h, body = badge(light)
    open(os.path.join(out, f'safarco-badge{sfx}.svg'), 'w').write(svg(w, h, body, 'SafarCo, Pakistan trip planner'))
    w, h, body = badge(light, pk=True)
    open(os.path.join(out, f'safarco-badge-pk{sfx}.svg'), 'w').write(svg(w, h, body, 'SafarCo.pk, Pakistan trip planner'))

# The app's logo: outlines of "Safar" and "Co" at 100 px on a baseline at y=0, and the full width.
safar = text(SERIF, 'Safar', ss, 100, 0, 0)
co = text(SERIF, 'SafarCo', ss, 100, 0, 0)[len(safar):]
open(os.path.join(APP, 'src', 'components', 'logo-paths.ts'), 'w').write(
    '// Made by scripts/brand.py: "SafarCo" in Source Serif 4 SemiBold as outlines, 100 px, baseline at y = 0.\n'
    f"export const SAFAR = '{safar}';\nexport const CO = '{co}';\nexport const NAME_W = {r(W(0, 7, 100))};\n")
print('ok', r(W(0, 7, 100)))
