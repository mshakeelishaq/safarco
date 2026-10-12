// The season guide: the best places in Pakistan for each season, nearest first. Picking one
// plans a trip there with dates moved into its best months.
import { useEffect, useState } from 'react';
import { css } from '../lib/css';
import type { View } from '../view';

export function SeasonGuide({ v, open }: { v: View['guide']; open: boolean }) {
  const [tab, setTab] = useState(v.initial);
  useEffect(() => { if (open) setTab(v.initial); }, [open, v.initial]);
  if (!open) return null;
  const se = v.seasons.find(x => x.id === tab)!;
  return (
    <div role="dialog" aria-modal="true" aria-label="Best places by season" style={css('position:absolute;inset:0;z-index:41;display:flex;flex-direction:column;background:var(--bg);color:var(--ink)')}>
      <div className="sc-flow" style={css('width:100%;box-sizing:border-box;padding:calc(20px + env(safe-area-inset-top)) 20px 10px')}>
        <div style={css('display:flex;align-items:center;gap:12px')}>
          <div style={css('flex:1;min-width:0')}><h1 style={css('margin:0;font-family:var(--fontH);font-size:22px;font-weight:600;letter-spacing:-.02em')}>Where’s best, when?</h1><div style={css('font-size:13px;font-weight:600;color:var(--mute);margin-top:3px')}>Pick a season, then a place. Nearest to you first.</div></div>
          <button onClick={v.close} aria-label="Close" style={css('width:44px;height:44px;flex:none;border-radius:15px;border:1px solid var(--line);background:var(--fill);color:var(--ink);font-size:17px;cursor:pointer')}><i className="ph-bold ph-x" /></button>
        </div>
        <div role="tablist" aria-label="Seasons" style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:14px')}>
          {v.seasons.map(x => {
            const on = x.id === tab;
            return <button key={x.id} role="tab" aria-selected={on} onClick={() => setTab(x.id)} style={css(`height:62px;border-radius:16px;border:1px solid ${on ? 'transparent' : 'var(--line2)'};background:${on ? x.color : 'var(--fill)'};color:${on ? '#fff' : 'var(--ink)'};cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:12px;font-weight:800`)}><i className={`ph-fill ${x.icon}`} style={css(`font-size:20px;color:${on ? '#fff' : x.color}`)} />{x.label}</button>;
          })}
        </div>
      </div>
      <div style={css('flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;overscroll-behavior:contain')}>
        <div className="sc-flow" style={css('box-sizing:border-box;padding:4px 20px calc(30px + env(safe-area-inset-bottom))')}>
          <div style={css(`padding:12px 14px;border-radius:16px;background:var(--fill);border-left:4px solid ${se.color};font-size:13px;font-weight:600;line-height:1.5;color:var(--ink2)`)}><b>{se.label} ({se.months.map(m => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]).join(', ')}):</b> {se.blurb}</div>
          <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:12px')}>
            {se.picks.map(p => (
              <button key={p.key} onClick={p.onPick} style={css('display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:20px;border:1px solid var(--line);background:var(--card);color:var(--ink);text-align:left;cursor:pointer')}>
                <div style={css(`width:42px;height:42px;flex:none;border-radius:14px;background:${p.color}1F;color:${p.color};display:flex;align-items:center;justify-content:center;font-size:21px`)}><i className={`ph-fill ${p.icon}`} /></div>
                <div style={css('flex:1;min-width:0')}>
                  <div style={css('display:flex;align-items:baseline;gap:6px;flex-wrap:wrap')}><span style={css('font-size:16px;font-weight:800')}>{p.name}</span><span style={css('font-size:12px;font-weight:700;color:var(--mute)')}>{p.when} · {p.km}</span></div>
                  <div style={css('font-size:13px;font-weight:600;color:var(--ink2);margin-top:2px;line-height:1.4')}>{p.text}</div>
                  {p.caution && <div style={css('display:flex;gap:5px;align-items:flex-start;font-size:12px;font-weight:700;color:var(--amb2);margin-top:4px;line-height:1.4')}><i className="ph-fill ph-warning" style={css('margin-top:2px;flex:none')} />{p.caution}</div>}
                  {p.note && <div style={css('display:flex;gap:5px;align-items:flex-start;font-size:12px;font-weight:700;color:var(--g);margin-top:4px;line-height:1.4')}><i className="ph-fill ph-megaphone" style={css('margin-top:2px;flex:none')} />{p.note}</div>}
                </div>
                <i className="ph-bold ph-caret-right" style={css('font-size:15px;color:var(--mute);flex:none')} />
              </button>
            ))}
          </div>
          <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:14px;line-height:1.5')}>Tap a place to plan it: dates move to its best months. Weather changes year to year, so check the forecast and road status before you go.</div>
        </div>
      </div>
    </div>
  );
}
