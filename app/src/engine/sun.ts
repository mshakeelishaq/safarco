// Sunrise and sunset for any place and date, calculated on the device (NOAA's solar
// equations, accurate to about a minute). Times are Pakistan time (UTC+5) in decimal hours.

const rad = Math.PI / 180;

export function sunTimes(lat: number, lon: number, iso: string): { rise: number; set: number } {
  const d = new Date(iso + 'T12:00:00Z');
  if (isNaN(+d)) return { rise: 6, set: 18 };
  const jd = d.getTime() / 864e5 + 2440587.5, t = (jd - 2451545) / 36525;
  const L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const C = Math.sin(M * rad) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * t) + Math.sin(3 * M * rad) * 0.000289;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * t) * rad);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos((125.04 - 1934.136 * t) * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad));
  const y = Math.tan(eps * rad / 2) ** 2;
  const eqTime = 4 / rad * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) - 0.5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
  const cosH = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / rad;
  const noon = 720 - 4 * lon - eqTime + 300; // minutes, Pakistan time
  return { rise: (noon - 4 * H) / 60, set: (noon + 4 * H) / 60 };
}
