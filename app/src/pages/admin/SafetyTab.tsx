// Roads closed now (routes go round them) and security areas (a warning on every trip there).
import { css } from '../../lib/css';
import { EDGES, type SecurityArea } from '../../engine/data';
import { allDests, baseSecurity, type ContentEdits } from '../../content';
import { DST } from '../../engine/places';
import { H2, Tag, TextUr, box, btn, lbl, small, text } from './ui';
import type { Edit } from './PlacesTab';

const ROADS = [...new Set(EDGES.map(e => e[6]))].sort();

/** Chosen items as chips, with a list to add more. */
function Chips({ value, options, onChange, label, empty }: { value: string[]; options: [string, string][]; onChange: (v: string[]) => void; label: string; empty: string }) {
  const name = (k: string) => options.find(o => o[0] === k)?.[1] || k;
  return (
    <div style={lbl}>{label}
      <div style={css('display:flex;gap:6px;flex-wrap:wrap;align-items:center')}>
        {!value.length && <span style={css('font-weight:600')}>{empty}</span>}
        {value.map(k => <button key={k} onClick={() => onChange(value.filter(x => x !== k))} style={small}>{name(k)} ✕</button>)}
        <select value="" onChange={e => e.target.value && onChange([...value, e.target.value])} style={{ ...text, width: 'auto', minWidth: 180, height: 34 }}>
          <option value="">+ Add</option>{options.filter(o => !value.includes(o[0])).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

export function SafetyTab({ c, edit, setUr }: { c: ContentEdits; edit: Edit; setUr: (en: string, v: string, from?: string) => void }) {
  const areas = c.security ?? baseSecurity();
  const setAreas = (f: (l: SecurityArea[]) => void) => edit(cc => { const l = cc.security ?? baseSecurity(); f(l); cc.security = l; });
  const destOpts: [string, string][] = allDests().map(d => [d.id, d.name]).sort((a, b) => a[1].localeCompare(b[1])) as [string, string][];
  const roadOpts: [string, string][] = ROADS.map(r => [r, r]);
  return <>
    <section style={box}>
      <H2 sub="A closed road (landslide, snow, protest): plans go round it while there is another way, and trips that would use it get a red note. Remove it when it opens again.">Closed roads</H2>
      {c.closures.map((x, i) => (
        <div key={i} style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;padding:8px 0;border-bottom:1px solid var(--line)')}>
          <select value={x.road} onChange={e => edit(cc => { cc.closures[i].road = e.target.value; })} style={text}>{ROADS.map(r => <option key={r}>{r}</option>)}</select>
          <input value={x.note} placeholder="Landslide near Shatial, opening expected Friday" onChange={e => edit(cc => { cc.closures[i].note = e.target.value; })} style={text} />
          <button onClick={() => edit(cc => { cc.closures.splice(i, 1); })} style={small}>Open again</button>
        </div>
      ))}
      {!c.closures.length && <p style={css('color:var(--mute);margin:0 0 10px')}>No roads marked closed.</p>}
      <button onClick={() => edit(cc => { cc.closures.push({ road: 'Babusar Pass', note: '' }); })} style={btn(false)}>+ Mark a road closed</button>
    </section>

    <section style={box}>
      <H2 sub="Places that need care because of law and order. Their destinations are marked in lists and come after safer places; every trip there or on those roads shows the advisory in red.">Security areas</H2>
      {c.security && <button onClick={() => { if (confirm('Go back to SafarCo’s own security areas?')) edit(cc => { cc.security = null; }); }} style={{ ...small, marginBottom: 10 }}>Undo edits</button>}
      {areas.map((a, i) => (
        <div key={a.id} style={css(`display:grid;gap:10px;padding:14px;margin-bottom:10px;border-radius:16px;border:1px solid ${a.on ? 'var(--cor)' : 'var(--line2)'};opacity:${a.on ? 1 : .7}`)}>
          <div style={css('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
            <input value={a.name} onChange={e => setAreas(l => { l[i].name = e.target.value; })} style={{ ...text, width: 220, fontWeight: 800 }} />
            {a.on ? <Tag tone="cor">Showing</Tag> : <Tag>Off</Tag>}
            <span style={css('flex:1')} />
            <label style={css('display:flex;gap:6px;align-items:center;font-weight:700;font-size:14px')}><input type="checkbox" checked={a.on} onChange={e => setAreas(l => { l[i].on = e.target.checked; })} />Show the warning</label>
            <button onClick={() => { if (confirm(`Delete “${a.name}”?`)) setAreas(l => { l.splice(i, 1); }); }} style={small}>Delete</button>
          </div>
          <Chips label="Destinations in this area" value={a.dests} options={destOpts} onChange={v => setAreas(l => { l[i].dests = v; })} empty="None" />
          <Chips label="Roads through this area" value={a.roads} options={roadOpts} onChange={v => setAreas(l => { l[i].roads = v; })} empty="None" />
          {a.nodes.length > 0 && <div style={css('font-size:12px;color:var(--mute)')}>Also towns on the road network: {a.nodes.join(', ')}</div>}
          <TextUr label="Short label (in lists)" value={a.short} onChange={v => setAreas(l => { l[i].short = v; })} ur={c.ur} setUr={setUr} />
          <TextUr label="The advisory (on the plan and in Prepare)" value={a.text} onChange={v => setAreas(l => { l[i].text = v; })} ur={c.ur} setUr={setUr} long />
          <div style={css('font-size:12px;color:var(--mute)')}>Destinations now: {a.dests.map(d => DST(d).name).join(', ') || 'none'}</div>
        </div>
      ))}
      <button onClick={() => setAreas(l => { l.push({ id: 'area' + Date.now().toString(36), name: 'New area', on: true, dests: [], roads: [], nodes: [], short: 'Security risk area: check before you go', text: '' }); })} style={btn(false)}>+ Add an area</button>
    </section>
  </>;
}
