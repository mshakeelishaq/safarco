// Small building blocks shared by the admin page's sections.
import { useState } from 'react';
import { css } from '../../lib/css';
import { MON } from '../../engine/data';
import { allDests } from '../../content';

export const box = css('border-radius:20px;padding:18px;background:var(--card);border:1px solid var(--line);margin-top:16px');
export const field = css('width:120px;box-sizing:border-box;height:40px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);padding:0 10px;font-size:15px;font-weight:700;color:var(--ink);text-align:right');
export const btn = (p: boolean) => css(`min-height:40px;padding:0 14px;border-radius:12px;border:${p ? '0' : '1px solid var(--line2)'};background:${p ? 'var(--cta)' : 'var(--fill)'};color:${p ? 'var(--onCta)' : 'var(--ink)'};font-size:14px;font-weight:800;cursor:pointer`);
export const small = css('min-height:32px;padding:0 10px;border-radius:10px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:13px;font-weight:700;cursor:pointer');
export const text = css('width:100%;box-sizing:border-box;height:40px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);padding:0 10px;font-size:15px;font-weight:600;color:var(--ink)');
export const area = css('width:100%;box-sizing:border-box;min-height:72px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);padding:10px;font-size:15px;font-weight:600;color:var(--ink);line-height:1.45;font-family:inherit;resize:vertical');
export const lbl = css('display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:var(--mute)');
export const row2 = css('display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px');
export const note = css('font-size:13px;color:var(--mute);margin:4px 0 12px;line-height:1.5');
export const today = () => new Date().toISOString().slice(0, 10);

export const H2 = ({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) => <>
  <h2 style={css('margin:0 0 4px;font-size:18px')}>{children}</h2>{sub && <p style={note}>{sub}</p>}
</>;

/** A small coloured tag: "Edited", "Hidden", "No pin". */
export const Tag = ({ children, tone = 'mute' }: { children: React.ReactNode; tone?: 'g' | 'amb' | 'cor' | 'mute' }) => {
  const c = { g: 'var(--g)', amb: 'var(--amb2)', cor: 'var(--cor)', mute: 'var(--mute)' }[tone];
  return <span style={css(`display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:7px;border:1px solid ${c};color:${c};font-size:11px;font-weight:800;white-space:nowrap`)}>{children}</span>;
};

/** Months as twelve chips; none chosen means all year. */
export function Months({ value, onChange, none = 'All year' }: { value: number[] | null; onChange: (v: number[] | null) => void; none?: string }) {
  const on = new Set(value || []);
  const flip = (m: number) => { const n = new Set(on); if (n.has(m)) n.delete(m); else n.add(m); const l = [...n].sort((a, b) => a - b); onChange(l.length && l.length < 12 ? l : null); };
  return (
    <div style={css('display:flex;flex-wrap:wrap;gap:5px;align-items:center')}>
      {MON.map((m, i) => <button key={m} type="button" onClick={() => flip(i + 1)} aria-pressed={on.has(i + 1)} style={css(`min-width:42px;height:32px;border-radius:9px;border:1px solid ${on.has(i + 1) ? 'var(--g)' : 'var(--line2)'};background:${on.has(i + 1) ? 'rgba(46,229,157,.16)' : 'var(--fill)'};color:var(--ink);font-size:12px;font-weight:800;cursor:pointer`)}>{m}</button>)}
      <span style={css('font-size:12px;font-weight:700;color:var(--mute);margin-left:4px')}>{value ? '' : none}</span>
      {value && <button type="button" onClick={() => onChange(null)} style={small}>{none === 'All year' ? 'All year' : 'Clear'}</button>}
    </div>
  );
}

/** Choose one of the destinations, with a search box for the long list. */
export function DestPicker({ value, onChange, mark }: { value: string; onChange: (id: string) => void; mark?: (id: string) => string }) {
  const [q, setQ] = useState('');
  const list = allDests().filter(d => !q || `${d.name} ${d.region}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div style={css('display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:8px')}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search places…" style={text} />
      <select value={value} onChange={e => onChange(e.target.value)} style={text}>
        {list.map(d => <option key={d.id} value={d.id}>{d.name} · {d.region}{mark?.(d.id) ? ` · ${mark(d.id)}` : ''}</option>)}
      </select>
    </div>
  );
}

/** "35.92, 74.31", or a Google Maps link with the pin in it, → [lat, lon]. */
export function parsePin(s: string): [number, number] | null {
  const m = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/.exec(decodeURIComponent(s));
  if (!m) return null;
  const lat = +m[1], lon = +m[2];
  return lat > 23 && lat < 38 && lon > 60 && lon < 78 ? [lat, lon] : null;
}

/** English text with an optional Roman Urdu version beside it. */
export function TextUr({ label, value, onChange, ur, setUr, long, placeholder }: { label: string; value: string; onChange: (v: string) => void; ur: Record<string, string>; setUr: (en: string, v: string, from?: string) => void; long?: boolean; placeholder?: string }) {
  const In = long ? 'textarea' : 'input';
  return (
    <div style={row2}>
      <label style={lbl}>{label}<In value={value} placeholder={placeholder} onChange={e => { const v = e.target.value; setUr(v, ur[value] || '', value); onChange(v); }} style={long ? area : text} /></label>
      <label style={lbl}>Roman Urdu (optional)<In value={ur[value] || ''} disabled={!value} onChange={e => setUr(value, e.target.value)} style={long ? area : text} /></label>
    </div>
  );
}
