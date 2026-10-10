import { useEffect, useRef } from 'react';
import { css } from '../lib/css';
import type { Api, View } from '../view';
import { DateInput, RoomOpts } from './Onboarding';

const Label = ({ children, style = '' }: { children: React.ReactNode; style?: string }) =>
  <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);' + style)}>{children}</div>;

const sheet = (h: number, open: boolean) => css(`position:absolute;left:0;right:0;bottom:0;height:${h}px;z-index:20;background:linear-gradient(180deg,var(--sheet),var(--sheet));backdrop-filter:blur(24px);border-radius:36px 36px 0 0;border-top:1px solid var(--line);box-shadow:0 -30px 60px -20px rgba(0,0,0,.6);transform:${open ? 'translateY(0)' : 'translateY(105%)'};transition:transform .5s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column`);
const scrim = (open: boolean) => css(`position:absolute;inset:0;z-index:18;background:var(--scrim);opacity:${open ? 1 : 0};pointer-events:${open ? 'auto' : 'none'};transition:opacity .35s`);
const Grip = () => <div style={css('width:40px;height:5px;border-radius:3px;background:var(--fill2);margin:10px auto 0')} />;

const Orb = () => <div style={{ position: 'absolute', inset: '-20%', background: 'conic-gradient(from 0deg,#2EE59D,#19C2B8,#6FD3FF,#9B7BFF,#FF4F7B,#FFB547,#2EE59D)', animation: 'spin 4s linear infinite' }} />;
export { Orb };

export function EditSheet({ v, api }: { v: View; api: Api }) {
  const open = v.s.settings, close = () => api.set({ settings: false });
  return <>
    <div onClick={close} style={scrim(open)} />
    <div data-screen-label="Edit trip" role="dialog" aria-modal="true" aria-label="Edit trip" aria-hidden={!open} inert={!open} className="sc-sheet" style={sheet(660, open)}>
      <Grip />
      <div style={css('display:flex;align-items:center;gap:12px;padding:12px 16px 12px 20px')}>
        <div style={css('flex:1;min-width:0')}><h2 style={css('margin:0;font-family:var(--fontH);font-size:17px;font-weight:600')}>Edit trip</h2><div style={css('font-size:12px;font-weight:700;color:var(--mute);margin-top:3px;font-variant-numeric:tabular-nums')}>PKR {v.totalNum} · {v.health.label}</div></div>
        <button onClick={close} style={css('height:44px;padding:0 18px;border-radius:15px;border:0;background:var(--cta);color:var(--onCta);font-size:14px;font-weight:800;cursor:pointer')}>Done</button>
      </div>
      <div style={css('flex:1;overflow-y:auto;scrollbar-width:none;padding:4px 20px 30px')}>
        <div style={css('display:flex;flex-direction:column;gap:16px')}>
          <Label>Transport</Label>
          <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
            {v.vehChips.map(c => <button key={c.key} onClick={c.onClick} title={c.full} aria-label={c.full} aria-pressed={v.s.vehicle === c.key} aria-disabled={c.op < 1} style={css(`height:64px;border-radius:17px;border:1px solid ${c.border};background:${c.bg};color:${c.fg};cursor:pointer;box-shadow:${c.shadow};opacity:${c.op};transition:all .25s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:0 2px`)}><i className={`ph-fill ${c.icon}`} style={css('font-size:22px')} /><span style={css('font-size:11px;font-weight:800;white-space:nowrap')}>{c.label}</span></button>)}
          </div>
          <Label style="margin-top:4px">Stays</Label>
          <div style={css('display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;border-radius:17px;background:var(--deep)')}>
            {v.tierChips.map(t => <button key={t.key} onClick={t.onClick} aria-pressed={v.s.tier === t.key} style={css(`height:44px;border-radius:13px;border:0;background:${t.bg};color:${t.fg};font-size:13px;font-weight:800;cursor:pointer;transition:all .25s`)}>{t.label}</button>)}
          </div>
          <RoomOpts v={v} compact />
          {v.hasFamilyNote && <div style={css('font-size:12px;color:var(--amb2);font-weight:600;line-height:1.45')}>{v.familyNote}</div>}
          <Label style="margin-top:4px">Travellers, days &amp; budget</Label>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:10px')}><div style={css('font-size:15px;font-weight:700')}>Start date</div><DateInput v={v} set={api.set} /></div>
          {v.steppers.map(st => (
            <div key={st.key} style={css('display:flex;align-items:center;justify-content:space-between')}>
              <div style={css('font-size:15px;font-weight:700')}>{st.label}</div>
              <div style={css('display:flex;align-items:center;gap:10px')}>
                <button onClick={st.dec} aria-label={`Decrease ${st.label}`} style={css('width:44px;height:44px;border-radius:50%;border:1px solid var(--line2);background:var(--fill);color:var(--ink);cursor:pointer;font-size:15px')}><i className="ph-bold ph-minus" /></button>
                <div style={css('min-width:52px;text-align:center;font-family:var(--fontH);font-size:16px;font-weight:600;font-variant-numeric:tabular-nums')}>{st.value}</div>
                <button onClick={st.inc} aria-label={`Increase ${st.label}`} style={css('width:44px;height:44px;border-radius:50%;border:0;background:var(--cta);color:var(--onCta);cursor:pointer;font-size:15px')}><i className="ph-bold ph-plus" /></button>
              </div>
            </div>
          ))}
          <Label style="margin-top:4px">Theme</Label>
          <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:4px;border-radius:17px;background:var(--deep)')}>
            {v.themeChips.map(t => <button key={t.key} onClick={t.onClick} aria-pressed={v.s.theme === t.key} style={css(`height:44px;border-radius:13px;border:0;background:${t.bg};color:${t.fg};font-size:13px;font-weight:800;cursor:pointer;transition:all .25s`)}>{t.label}</button>)}
          </div>
        </div>
        <button onClick={v.restart} style={css('margin-top:22px;width:100%;height:50px;border-radius:16px;border:1px solid var(--line2);background:var(--fill);color:var(--ink2);font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px')}><i className="ph-bold ph-arrow-counter-clockwise" />Start over from the questions</button>
      </div>
    </div>
  </>;
}

export function CopilotDrawer({ v, api, status, send }: { v: View; api: Api; status: string; send: () => void }) {
  const open = v.s.drawer, close = () => api.set({ drawer: false }), chat = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = chat.current; if (el) el.scrollTop = el.scrollHeight; });
  return <>
    <div onClick={close} style={scrim(open)} />
    <div data-screen-label="Co-pilot drawer" role="dialog" aria-modal="true" aria-label="Co-pilot" aria-hidden={!open} inert={!open} className="sc-sheet" style={sheet(580, open)}>
      <Grip />
      <div style={css('display:flex;align-items:center;gap:12px;padding:12px 16px 10px 20px')}>
        <div style={css('position:relative;width:44px;height:44px;border-radius:50%;overflow:hidden;flex:none')}><Orb /><div style={css('position:absolute;inset:3px;border-radius:50%;background:var(--sheet);display:flex;align-items:center;justify-content:center;color:var(--g);font-size:19px')}><i className="ph-fill ph-sparkle" /></div></div>
        <div style={css('flex:1')}><h2 style={css('margin:0;font-family:var(--fontH);font-size:17px;font-weight:600')}>Co-pilot</h2><div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:2px')}>{v.s.busy ? 'Acting on your trip…' : status}</div></div>
        <button onClick={close} aria-label="Close" style={css('width:44px;height:44px;border-radius:15px;border:1px solid var(--line);background:var(--fill);color:var(--ink);font-size:17px;cursor:pointer')}><i className="ph-bold ph-x" /></button>
      </div>
      <div ref={chat} aria-live="polite" style={css('flex:1;overflow-y:auto;scrollbar-width:none;padding:6px 20px 10px;display:flex;flex-direction:column;gap:12px')}>
        {v.msgView.map(m => m.isUser
          ? <div key={m.key} style={css('align-self:flex-end;max-width:80%;padding:11px 15px;border-radius:20px 20px 6px 20px;background:var(--cta);color:var(--onCta);font-size:14px;font-weight:700;line-height:1.4')}>{m.text}</div>
          : <div key={m.key} style={css('align-self:flex-start;max-width:90%;display:flex;flex-direction:column;gap:8px')}>
            <div style={css('padding:11px 15px;border-radius:20px 20px 20px 6px;background:var(--fill);border:1px solid var(--line);font-size:14px;font-weight:500;line-height:1.5')}>{m.shown}</div>
            {m.calls.map((k, i) => (
              <div key={i} style={css("padding:11px 13px;border-radius:16px;background:var(--deep);border:1px solid rgba(155,123,255,.3);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;line-height:1.55")}>
                <div style={css('display:flex;justify-content:space-between;align-items:center;gap:8px')}><span style={css('color:var(--vio)')}>ƒ {k.fn}()</span><span style={css(`padding:2px 7px;border-radius:6px;background:${k.bg};color:${k.fg}`)}>{k.status}</span></div>
                <div style={css('color:var(--mute);word-break:break-word;margin-top:4px')}>{k.args}</div>
              </div>
            ))}
          </div>)}
        {v.s.busy && <div style={css('align-self:flex-start;font-size:12px;font-weight:700;color:var(--mute);display:flex;align-items:center;gap:6px')}><i className="ph-fill ph-waveform" style={css('color:var(--g);font-size:16px')} />Working on your trip…</div>}
      </div>
      <div style={css('display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:4px 20px 12px')}>
        {v.suggestions.map(sg => <button key={sg.prompt} onClick={sg.onClick} disabled={v.s.busy} style={css('flex:none;min-height:44px;padding:0 14px;border-radius:15px;border:1px solid rgba(46,229,157,.35);background:rgba(46,229,157,.08);color:var(--ink2);font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap')}>{sg.prompt}</button>)}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(); }} style={css('display:flex;gap:8px;padding:0 20px 28px')}>
        <input value={v.s.input} onChange={e => api.set({ input: e.target.value })} placeholder="Ask in English or Urdu…" aria-label="Message the co-pilot" enterKeyHint="send" style={css('flex:1;min-width:0;height:52px;border-radius:18px;border:1px solid var(--line2);background:var(--fill);padding:0 16px;font-size:14px;font-weight:600;color:var(--ink);outline:none')} />
        <button type="submit" aria-label="Send" disabled={v.s.busy || !v.s.input.trim()} style={css(`width:52px;height:52px;border-radius:18px;border:0;background:var(--cta);color:var(--onCta);font-size:21px;cursor:pointer;opacity:${v.s.input.trim() ? 1 : .55}`)}><i className="ph-fill ph-paper-plane-right" /></button>
      </form>
    </div>
  </>;
}
