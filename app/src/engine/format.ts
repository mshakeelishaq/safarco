export const fmtN = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmt = (n: number) => 'PKR ' + fmtN(n);
export const kShort = (n: number) => 'PKR ' + (n >= 1000 ? Math.round(n / 1000) + 'k' : Math.round(n));

/** Decimal hours of the day → "6:30 am". */
export const clock = (h: number) => {
  const t = Math.round(h * 60), hh = Math.floor(t / 60) % 24, mm = t % 60;
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
};

/** Decimal hours → "2 h 15 min". */
export const dur = (h: number) => {
  const t = Math.max(0, Math.round(h * 60)), H = Math.floor(t / 60), M = t % 60;
  return H ? `${H} h${M ? ` ${M} min` : ''}` : `${M} min`;
};

export const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const isoAdd = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); };
export const isoOff = (iso: string, n: number) => { const d = new Date(iso + 'T00:00'); d.setDate(d.getDate() + n); return isoOf(d); };

/** Month (1–12) of a trip's start date; July if unset. */
export const mon = (o: { startDate?: string } | null | undefined) => {
  const d = o && o.startDate ? new Date(o.startDate + 'T00:00') : null;
  return d && !isNaN(+d) ? d.getMonth() + 1 : 7;
};

/** "Sat 12 Jul" for the day `add` days after `iso`. */
export const dayLabel = (iso: string, add: number) => {
  const d = new Date(iso + 'T00:00'); if (isNaN(+d)) return '';
  d.setDate(d.getDate() + add);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const inM = (m: number, arr?: number[] | null) => !arr || arr.includes(m);

export const mapsQ = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q).replace(/%20/g, '+')}`;

/** Great-circle distance in km. */
export const hav = (a1: number, o1: number, a2: number, o2: number) => {
  const R = 6371, r = Math.PI / 180, dA = (a2 - a1) * r, dO = (o2 - o1) * r;
  const x = Math.sin(dA / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
