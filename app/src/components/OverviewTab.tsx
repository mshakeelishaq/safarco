// The overview: the whole trip in four cards (days, map, budget, getting ready), each opening its full section.
import { css } from '../lib/css';
import { t } from '../i18n';
import type { Api, View } from '../view';
import { TodayCard } from './TripMode';

const card = 'position:relative;display:block;width:100%;text-align:left;border-radius:28px;padding:18px;background:var(--card);border:1px solid var(--line);color:var(--ink);cursor:pointer;font:inherit;box-shadow:0 18px 40px -30px rgba(0,0,0,.45)';
const head = (icon: string, color: string, title: string) => (
  <div style={css('display:flex;align-items:center;gap:10px')}>
    <span style={css(`width:38px;height:38px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:${color};color:#fff;font-size:19px;flex:none`)}><i className={`ph-fill ${icon}`} /></span>
    <h2 style={css('margin:0;flex:1;font-family:var(--fontH);font-size:19px;font-weight:600')}>{title}</h2>
    <i className="ph-bold ph-caret-right" style={css('font-size:16px;color:var(--mute)')} />
  </div>
);
const more = (label: string) => <div style={css('margin-top:14px;font-size:13px;font-weight:800;color:var(--g);display:flex;align-items:center;gap:5px')}>{label}<i className="ph-bold ph-arrow-right" /></div>;

/** The whole journey as a small drawing: the road line, home, the nights and the places. Light, so it shows at once. */
function MapSnap({ line, dots }: { line: [number, number][]; dots: { p: [number, number]; label: string; color: string }[] }) {
  const pts = [...line, ...dots.map(d => d.p)]; if (pts.length < 2) return null;
  const W = 320, H = 170, pad = 26;
  const k = Math.cos((pts.reduce((a, p) => a + p[0], 0) / pts.length) * Math.PI / 180);
  const xs = pts.map(p => p[1] * k), ys = pts.map(p => p[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sc = Math.min((W - 2 * pad) / Math.max(1e-3, x1 - x0), (H - 2 * pad) / Math.max(1e-3, y1 - y0));
  const ox = (W - (x1 - x0) * sc) / 2, oy = (H - (y1 - y0) * sc) / 2;
  const P = (p: [number, number]) => [ox + (p[1] * k - x0) * sc, H - oy - (p[0] - y0) * sc] as const;
  const step = Math.max(1, Math.floor(line.length / 400));
  const d = line.filter((_, i) => i % step === 0 || i === line.length - 1).map((p, i) => { const [x, y] = P(p); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join('');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={css('display:block;width:100%;height:auto;margin-top:12px;border-radius:18px;background:linear-gradient(160deg,#E6F0EC,#EEE7DA 70%,#E9DFCF)')} aria-hidden="true">
      <path d="M0 150 L40 112 L72 130 L118 92 L150 118 L196 80 L236 108 L270 86 L320 116 L320 170 L0 170Z" fill="rgba(11,95,124,.06)" />
      <path d={d} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} className="ov-draw" pathLength={1} fill="none" stroke="#0B5F7C" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      {dots.map((dt, i) => { const [x, y] = P(dt.p); const right = x < W * 0.62; return (
        <g key={i}>
          <circle cx={x} cy={y} r="5.5" fill={dt.color.startsWith('var') ? (i === 0 ? '#0FA678' : '#E8A13D') : dt.color} stroke="#fff" strokeWidth="2" />
          <text x={x + (right ? 9 : -9)} y={y + 4} textAnchor={right ? 'start' : 'end'} style={css('font:700 10.5px var(--font);fill:#13212B;paint-order:stroke;stroke:#F3EEE6;stroke-width:3px')}>{dt.label}</text>
        </g>); })}
    </svg>
  );
}

export function OverviewTab({ v, api }: { v: View; api: Api }) {
  const o = v.overview;
  const pieces = (i: number) => ({ className: 'ov-in', style: { animationDelay: `${120 + i * 110}ms` } });
  return (
    <div data-screen-label="Trip overview" className="sc-flow" style={css('pointer-events:auto;background:var(--bg);min-height:100%;overflow:hidden')}>
      {/* The trip's photo, the welcome line and the route. */}
      <div style={css('position:relative;height:300px;overflow:hidden')}>
        {o.photo && <img src={o.photo} alt="" style={css('position:absolute;inset:0;width:100%;height:100%;object-fit:cover')} />}
        <div style={css('position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,.65) 100%)')} />
        <div style={css('position:absolute;left:20px;right:20px;bottom:22px;color:#fff;text-shadow:0 1px 10px rgba(0,0,0,.4)')}>
          <div style={css('font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.9')}>{o.route}</div>
          <h1 style={css('margin:6px 0 0;font-family:var(--fontH);font-size:28px;font-weight:600;line-height:1.12')}>{o.title}</h1>
          <div style={css('display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;text-shadow:none')}>
            {o.strip.map(x => <span key={x} style={css('padding:5px 10px;border-radius:10px;background:rgba(255,255,255,.18);backdrop-filter:blur(8px);font-size:12px;font-weight:800')}>{x}</span>)}
          </div>
        </div>
        {/* The same buttons as the plan: my trips, save, share and edit. */}
        <div style={css('position:absolute;top:52px;right:16px;display:flex;gap:6px')}>
          {([['trips', 'ph-list-bullets', t('My trips'), () => api.set({ sheet: 'trips', settings: false })], ['save', v.s.savedId ? 'ph-bookmark-simple' : 'ph-bookmark-simple', v.s.savedId ? t('Saved trip') : t('Save trip'), () => api.set({ sheet: 'save', settings: false })],
            ['share', 'ph-share-network', t('Share trip'), () => api.set({ sheet: 'share', settings: false })]] as const).map(([k, icon, label, onClick]) => (
            <button key={k} onClick={onClick} aria-label={label} title={label} style={css(`width:42px;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.4);background:${k === 'save' && v.s.savedId ? 'var(--cta)' : 'rgba(0,0,0,.28)'};backdrop-filter:blur(10px);color:#fff;font-size:17px;cursor:pointer`)}><i className={`${k === 'save' && v.s.savedId ? 'ph-fill' : 'ph-bold'} ${icon}`} /></button>))}
          <button onClick={() => api.set({ settings: true })} aria-label={t('Edit trip')} style={css('height:42px;padding:0 12px;border-radius:14px;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.28);backdrop-filter:blur(10px);color:#fff;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px')}><i className="ph-bold ph-sliders-horizontal" />{t('Edit')}</button>
        </div>
      </div>

      <div style={css('padding:16px 16px 150px;display:grid;gap:12px')}>
        <TodayCard v={v} api={api} onCheckIn={(p, arrived) => api.checkIn?.(p, arrived)} />

        <button {...pieces(0)} onClick={() => o.open('trip')} style={css(card)}>
          {head('ph-calendar-check', '#0FA678', t('Day by day'))}
          <div style={css('display:flex;flex-direction:column;gap:2px;margin-top:12px')}>
            {o.days.slice(0, 8).map(d => (
              <div key={d.key} style={css('display:flex;align-items:center;gap:10px;min-height:30px')}>
                <span style={css(`width:24px;height:24px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;background:${d.kind === 'explore' ? 'rgba(91,108,255,.14)' : d.kind === 'return' ? 'rgba(255,122,61,.15)' : 'rgba(15,166,120,.14)'};color:var(--ink2)`)}>{d.num}</span>
                <i className={`ph-fill ${d.icon}`} style={css('font-size:15px;color:var(--mute);flex:none')} />
                <span style={css('flex:1;min-width:0;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{d.title}</span>
                <span style={css('flex:none;font-size:11px;font-weight:700;color:var(--mute)')}>{d.date}</span>
              </div>
            ))}
            {o.days.length > 8 && <div style={css('font-size:12px;font-weight:700;color:var(--mute);padding-left:34px')}>{t('and {n} more days', { n: o.days.length - 8 })}</div>}
          </div>
          {o.facts.length > 0 && <div style={css('display:flex;gap:6px;flex-wrap:wrap;margin-top:12px')}>{o.facts.map(f => <span key={f} style={css('padding:4px 9px;border-radius:9px;background:var(--fill);font-size:12px;font-weight:700;color:var(--ink2)')}>{f}</span>)}</div>}
          {more(t('See the full plan'))}
        </button>

        <button {...pieces(1)} onClick={() => o.open('map')} style={css(card)}>
          {head('ph-map-trifold', '#3B8DFF', t('Map'))}
          <MapSnap line={o.map.line} dots={o.map.dots} />
          <div style={css('margin-top:10px;font-size:15px;font-weight:800')}>{o.map.stat}</div>
          {o.map.via && <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:2px;line-height:1.4')}>{t('via {roads}', { roads: o.map.via })}</div>}
          {more(t('Open the map'))}
        </button>

        <button {...pieces(2)} onClick={() => o.open('budget')} style={css(card)}>
          {head('ph-wallet', '#E8624A', t('Budget'))}
          <div style={css('display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:12px')}>
            <span style={css('font-family:var(--fontH);font-size:30px;font-weight:600')}>{o.budget.total}</span>
            {o.budget.each && <span style={css('font-size:14px;font-weight:700;color:var(--ink2)')}>{o.budget.each}</span>}
          </div>
          <div style={css('display:flex;height:12px;border-radius:6px;overflow:hidden;margin-top:12px;background:var(--fill)')}>
            {o.budget.segs.map(sg => <span key={sg.key} style={css(`width:${sg.pct}%;background:${sg.color}`)} />)}
          </div>
          <div style={css('display:flex;gap:6px 14px;flex-wrap:wrap;margin-top:10px')}>
            {o.budget.segs.map(sg => <span key={sg.key} style={css('display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--ink2)')}><i style={css(`width:9px;height:9px;border-radius:3px;background:${sg.color}`)} />{sg.label} {sg.amount}</span>)}
          </div>
          {o.budget.cap && <div style={css(`margin-top:10px;font-size:13px;font-weight:800;color:${o.budget.cap.ok ? 'var(--g)' : 'var(--cor)'};display:flex;align-items:center;gap:6px`)}><i className={`ph-fill ${o.budget.cap.ok ? 'ph-check-circle' : 'ph-warning'}`} />{o.budget.cap.text}</div>}
          {more(t('See the breakdown'))}
        </button>

        <button {...pieces(3)} onClick={() => o.open('prepare')} style={css(card + ';background:linear-gradient(160deg,#13212B,#0B3A4C);color:#fff;border-color:transparent')}>
          <div style={css('display:flex;align-items:center;gap:10px')}>
            <span style={css('width:38px;height:38px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:#F5B83D;color:#13212B;font-size:19px;flex:none')}><i className="ph-fill ph-backpack" /></span>
            <h2 style={css('margin:0;flex:1;font-family:var(--fontH);font-size:19px;font-weight:600')}>{t('Before you go')}</h2>
            <i className="ph-bold ph-caret-right" style={css('font-size:16px;opacity:.7')} />
          </div>
          {o.ready.total > 0 && <div style={css('display:flex;align-items:center;gap:14px;margin-top:14px')}>
            {/* Checklist progress as a ring, with the countdown beside it. */}
            <svg width="62" height="62" viewBox="0 0 62 62" aria-hidden="true" style={css('flex:none')}>
              <circle cx="31" cy="31" r="26" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6" />
              <circle cx="31" cy="31" r="26" fill="none" stroke="#F5B83D" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(o.ready.done / o.ready.total) * 163.4} 163.4`} transform="rotate(-90 31 31)" />
              <text x="31" y="35" textAnchor="middle" style={css('font:800 13px var(--font);fill:#fff')}>{o.ready.done}/{o.ready.total}</text>
            </svg>
            <div><div style={css('font-family:var(--fontH);font-size:22px;font-weight:600')}>{o.ready.countdown}</div><div style={css('font-size:13px;font-weight:600;opacity:.8;margin-top:2px')}>{t('{done} of {total} things ready', { done: o.ready.done, total: o.ready.total })}</div></div>
          </div>}
          {(o.ready.warn.length > 0 || o.ready.todo.length > 0) && <div style={css('margin-top:14px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#F5B83D')}>{t('Don’t go before')}</div>}
          <div style={css('display:flex;flex-direction:column;gap:8px;margin-top:8px')}>
            {o.ready.warn.map(w => <div key={w} style={css('display:flex;gap:8px;align-items:flex-start;font-size:13px;font-weight:700;line-height:1.4')}><i className="ph-fill ph-warning" style={css('color:#FF9F7A;margin-top:2px;flex:none')} />{w}</div>)}
            {o.ready.todo.map(w => <div key={w} style={css('display:flex;gap:8px;align-items:flex-start;font-size:13px;font-weight:700;line-height:1.4')}><i className="ph-bold ph-circle" style={css('color:#F5B83D;margin-top:3px;flex:none;font-size:12px')} />{w}</div>)}
          </div>
          {o.ready.weather && <div style={css('margin-top:12px;font-size:13px;font-weight:700;opacity:.85;display:flex;gap:6px;align-items:center')}><i className="ph-fill ph-thermometer-simple" />{o.ready.weather}</div>}
          <div style={css('margin-top:14px;font-size:13px;font-weight:800;color:#F5B83D;display:flex;align-items:center;gap:5px')}>{t('Get ready')}<i className="ph-bold ph-arrow-right" /></div>
        </button>
      </div>
    </div>
  );
}
