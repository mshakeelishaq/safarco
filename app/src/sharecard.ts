// The trip card for Instagram stories and WhatsApp status: a 1080 × 1920 picture drawn on the
// phone (no server), with the route, the numbers and where the photo comes from.
export interface CardInput {
  photo: string; kicker: string; title: string; when: string;
  stats: { value: string; label: string }[]; places: string[]; placesLabel: string;
  route: [number, number][]; footer: string; credit: string;
}
const W = 1080, H = 1920;

const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });

/** Draws the card and returns it as a JPEG. */
export async function drawCard(c: CardInput): Promise<Blob> {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  await document.fonts?.ready;
  const head = getComputedStyle(document.body).getPropertyValue('--fontH').trim() || 'Georgia, serif', body = 'Plus Jakarta Sans, system-ui, sans-serif';

  // Photo, cropped to fill, then a dark fade so the text reads.
  g.fillStyle = '#0B3B4E'; g.fillRect(0, 0, W, H);
  try {
    const im = await loadImage(c.photo), s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s;
    g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
  } catch { /* plain background */ }
  const fade = g.createLinearGradient(0, 0, 0, H);
  fade.addColorStop(0, 'rgba(4,18,26,.55)'); fade.addColorStop(.2, 'rgba(4,18,26,0)'); fade.addColorStop(.42, 'rgba(4,18,26,.15)'); fade.addColorStop(.62, 'rgba(4,18,26,.85)'); fade.addColorStop(1, 'rgba(4,18,26,.97)');
  g.fillStyle = fade; g.fillRect(0, 0, W, H);

  const text = (s: string, x: number, y: number, size: number, font: string, color = '#fff', weight = 700, align: CanvasTextAlign = 'left') => {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y);
  };
  // Top: SafarCo
  text('SafarCo', 80, 150, 54, head, '#fff', 700);

  // Route: the road line scaled into a box, with start and end dots.
  if (c.route.length > 1) {
    const box = { x: 120, y: 330, w: 840, h: 520 };
    const lons = c.route.map(p => p[0]), lats = c.route.map(p => p[1]);
    const lo0 = Math.min(...lons), lo1 = Math.max(...lons), la0 = Math.min(...lats), la1 = Math.max(...lats);
    const k = Math.min(box.w / Math.max(1e-6, (lo1 - lo0) * 0.85), box.h / Math.max(1e-6, la1 - la0));
    const X = (lo: number) => box.x + box.w / 2 + (lo - (lo0 + lo1) / 2) * 0.85 * k, Y = (la: number) => box.y + box.h / 2 - (la - (la0 + la1) / 2) * k;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 22; g.beginPath(); c.route.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke();
    g.strokeStyle = '#FFC75F'; g.lineWidth = 10; g.stroke();
    const dot = (p: [number, number], color: string) => { g.beginPath(); g.arc(X(p[0]), Y(p[1]), 20, 0, Math.PI * 2); g.fillStyle = color; g.fill(); g.lineWidth = 7; g.strokeStyle = '#fff'; g.stroke(); };
    dot(c.route[0], '#2EE59D'); dot(c.route[c.route.length - 1], '#FF5A72');
  }

  // Bottom: where, when, numbers and places.
  let y = 1140;
  text(c.kicker.toUpperCase(), 80, y, 34, body, '#FFD27A', 800); y += 110;
  g.font = `600 104px ${head}`; const tw = g.measureText(c.title).width;
  text(c.title, 80, y, tw > 920 ? Math.floor(104 * 920 / tw) : 104, head, '#fff', 600); y += 70;
  text(c.when, 80, y, 38, body, 'rgba(255,255,255,.88)', 700); y += 90;
  const colW = 920 / Math.max(1, c.stats.length);
  c.stats.forEach((st, i) => { text(st.value, 80 + i * colW, y, 52, head, '#fff', 600); text(st.label, 80 + i * colW, y + 46, 28, body, 'rgba(255,255,255,.75)', 700); });
  y += 130;
  if (c.places.length) {
    text(c.placesLabel, 80, y, 28, body, '#FFD27A', 800); y += 50;
    let line = '', lines = 0;
    for (const p of c.places) {
      const next = line ? `${line}  ·  ${p}` : p; g.font = `700 36px ${body}`;
      if (g.measureText(next).width > 920 && line) { text(line, 80, y, 36, body); y += 50; line = p; if (++lines >= 2) { line = ''; break; } } else line = next;
    }
    if (line) { text(line, 80, y, 36, body); y += 50; }
  }
  // Footer
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(80, H - 190, 920, 2);
  text(c.footer, 80, H - 120, 34, body, '#fff', 800);
  if (c.credit) text(c.credit, 80, H - 72, 28, body, 'rgba(255,255,255,.8)', 700);

  return await new Promise<Blob>((ok, fail) => cv.toBlob(b => b ? ok(b) : fail(new Error('Couldn’t draw the card')), 'image/jpeg', 0.9));
}

/** Opens the phone's share menu with the picture (Instagram, WhatsApp…), or saves it if sharing files isn't supported. */
export async function shareCard(blob: Blob, name: string, text: string) {
  const file = new File([blob], name, { type: 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], text }); return 'shared' as const; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved' as const;
}
