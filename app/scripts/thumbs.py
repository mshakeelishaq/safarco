#!/usr/bin/env python3
"""Small copies of every photo for places that show many at once (the preview's destination ring).

  python3 scripts/thumbs.py

public/photos/x.webp → public/photos/t/x.webp, 420 px on the long side, about 20 KB. Skips ones already made.
"""
import os
from PIL import Image

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(APP, 'public', 'photos'); OUT = os.path.join(SRC, 't')
os.makedirs(OUT, exist_ok=True)
made = 0
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.webp'): continue
    out = os.path.join(OUT, f)
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(os.path.join(SRC, f)): continue
    im = Image.open(os.path.join(SRC, f)).convert('RGB'); im.thumbnail((420, 420), Image.LANCZOS)
    im.save(out, 'WEBP', quality=52, method=6); made += 1
print('made', made, 'thumbs')
