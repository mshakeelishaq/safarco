// The trip card for Instagram stories and WhatsApp status: a 1080 × 1920 picture drawn on the
// phone (no server), with the stops on the way, the numbers and where the photo comes from.
export interface CardInput {
  photo: string; kicker: string; title: string; when: string;
  stats: { value: string; label: string }[]; places: string[]; placesLabel: string;
  stops: string[]; footer: string; credit: string;
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
  fade.addColorStop(0, 'rgba(4,18,26,.55)'); fade.addColorStop(.2, 'rgba(4,18,26,0)'); fade.addColorStop(.36, 'rgba(4,18,26,.1)'); fade.addColorStop(.54, 'rgba(4,18,26,.82)'); fade.addColorStop(1, 'rgba(4,18,26,.97)');
  g.fillStyle = fade; g.fillRect(0, 0, W, H);

  const text = (s: string, x: number, y: number, size: number, font: string, color = '#fff', weight = 700, align: CanvasTextAlign = 'left') => {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y);
  };
  // Top: SafarCo
  text('SafarCo', 80, 150, 54, head, '#fff', 700);

  // Bottom: where, when and the numbers.
  let y = 1060;
  text(c.kicker.toUpperCase(), 80, y, 34, body, '#FFD27A', 800); y += 110;
  g.font = `600 104px ${head}`; const tw = g.measureText(c.title).width;
  text(c.title, 80, y, tw > 920 ? Math.floor(104 * 920 / tw) : 104, head, '#fff', 600); y += 70;
  text(c.when, 80, y, 38, body, 'rgba(255,255,255,.88)', 700); y += 90;
  const colW = 920 / Math.max(1, c.stats.length);
  c.stats.forEach((st, i) => { text(st.value, 80 + i * colW, y, 52, head, '#fff', 600); text(st.label, 80 + i * colW, y + 46, 28, body, 'rgba(255,255,255,.75)', 700); });
  y += 130;

  // The way there: a thin line with a dot for home, each night on the road and the place.
  if (c.stops.length > 1) {
    const n = c.stops.length, x0 = 100, x1 = 980, xs = c.stops.map((_, i) => x0 + (x1 - x0) * i / (n - 1)), ly = y;
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3; g.setLineDash([2, 12]); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, ly); g.lineTo(x1, ly); g.stroke(); g.setLineDash([]);
    xs.forEach((x, i) => {
      const end = i === 0 || i === n - 1;
      g.beginPath(); g.arc(x, ly, end ? 13 : 9, 0, Math.PI * 2);
      g.fillStyle = i === n - 1 ? '#FFC75F' : end ? '#fff' : 'rgba(4,18,26,1)'; g.fill();
      g.lineWidth = 4; g.strokeStyle = i === n - 1 ? '#FFC75F' : '#fff'; g.stroke();
      // Names under the dots: the ends lean outwards so they stay on the card.
      const label = c.stops[i], size = 30, max = (x1 - x0) / (n - 1) + (end ? 40 : -12);
      g.font = `${end ? 800 : 700} ${size}px ${body}`; const w = g.measureText(label).width, fs = w > max ? Math.max(20, Math.floor(size * max / w)) : size;
      text(label, i === 0 ? x - 20 : i === n - 1 ? x + 20 : x, ly + 54, fs, body, end ? '#fff' : 'rgba(255,255,255,.8)', end ? 800 : 700, i === 0 ? 'left' : i === n - 1 ? 'right' : 'center');
    });
    y += 140;
  }

  // Places to see.
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
