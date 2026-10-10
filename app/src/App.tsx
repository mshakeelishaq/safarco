import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { CopilotDrawer, EditSheet, Orb } from './components/Sheets';
import { MapTab } from './components/MapTab';
import { OfflineTab } from './components/OfflineTab';
import { Onboarding } from './components/Onboarding';
import { TripTab } from './components/TripTab';
import { askClaude, claudeEnabled } from './copilot/claude';
import { parseRequest, passAnswer, runTool, summary } from './copilot/tools';
import { costFor } from './engine/engine';
import { fmt } from './engine/format';
import { LIVE, geoSearch, reverseGeo, routeFetch, routeKey, wxFetch, wxPlan } from './engine/live';
import { DST, cityOr, nearestCity } from './engine/places';
import { css } from './lib/css';
import { clearOffline, downloadOffline, savedOffline } from './offline';
import { Scene } from './scene/Scene';
import { initialState, type AppState, type ChatMsg, type Patch, type ToolCall } from './state';
import { buildView, type Api } from './view';

export function App() {
  const [s, setS] = useState<AppState>(() => { const st = initialState(), saved = savedOffline(); return saved ? { ...st, offline: 'ready', offlineMB: saved.mb } : st; });
  const stRef = useRef(s); stRef.current = s;
  const set = useCallback((p: Patch) => setS(prev => ({ ...prev, ...p })), []);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const timers = useRef<number[]>([]);
  const later = useCallback((ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); }, []);
  const sceneRef = useRef<HTMLDivElement>(null), scrollRef = useRef<HTMLDivElement>(null);
  const dlAbort = useRef<AbortController | null>(null);
  const [claude, setClaude] = useState(false);

  // Live data: re-render when a fetch lands.
  useEffect(() => { LIVE.subs.add(bump); claudeEnabled().then(setClaude); return () => { LIVE.subs.delete(bump); timers.current.forEach(clearTimeout); dlAbort.current?.abort(); }; }, []);

  // Fetch the road route and weather for the current trip.
  useEffect(() => {
    if (s.screen !== 'app') return;
    const o = cityOr(s.origin), D = DST(s.corridor);
    if (s.vehicle !== 'air' || s.tab === 'map') routeFetch(o, D);
    wxFetch(D, s.startDate, s.days);
  }, [s.screen, s.origin, s.corridor, s.vehicle, s.tab, s.startDate, s.days]);

  // Search OpenStreetMap once typing pauses.
  const q = s.screen === 'onboard' ? (s.step === 0 ? s.oq : s.step === 1 ? s.dq : '') : '';
  useEffect(() => {
    if (q.trim().length < 3) return;
    const t = setTimeout(() => geoSearch(q), 650);
    return () => clearTimeout(t);
  }, [q]);

  // Theme is remembered on this device.
  useEffect(() => { try { localStorage.setItem('safarco-theme', s.theme); } catch { /* storage blocked */ } }, [s.theme]);

  // Reset the hero parallax when switching screens or tabs.
  useEffect(() => { const n = sceneRef.current; if (n) { n.style.transform = ''; n.style.opacity = ''; } scrollRef.current?.scrollTo(0, 0); }, [s.screen, s.tab]);

  const locate = useCallback(() => {
    set({ loc: 'locating' });
    let finished = false;
    const done = (p: Patch) => { if (!finished) { finished = true; set(p); } };
    const fail = (note: string) => done({ loc: 'failed', locNote: note });
    later(12000, () => fail('GPS didn’t respond. Search for your city below.'));
    if (!navigator.geolocation) return fail('This device has no GPS. Search for your city below.');
    navigator.geolocation.getCurrentPosition(p => {
      const { latitude: a, longitude: o } = p.coords;
      if (!(a > 23.5 && a < 37.2 && o > 60.8 && o < 77.9)) return fail('You seem to be outside Pakistan. Search for your city below.');
      const pick = (note?: string) => { const { city, d } = nearestCity(a, o); done({ loc: 'done', origin: city.n, oq: '', pickId: null, locNote: note || `Detected from GPS · ${Math.max(1, Math.round(d))} km from city centre` }); };
      if (nearestCity(a, o).d < 8) return pick();
      reverseGeo(a, o)!.then(() => pick('Detected from GPS · place name from OpenStreetMap'), () => pick());
    }, err => err.code === err.PERMISSION_DENIED ? done({ loc: 'denied' }) : fail('Couldn’t get a GPS fix. Search for your city below.'), { timeout: 10000, maximumAge: 600000 });
  }, [set, later]);

  const setPeople = useCallback((k: 'adults' | 'kids' | 'elders', d: number) => setS(p => {
    const min = k === 'adults' ? 1 : 0, n = { adults: p.adults, kids: p.kids, elders: p.elders }; n[k] = Math.max(min, Math.min(20, n[k] + d));
    return { ...p, ...n, groupSize: n.adults + n.kids + n.elders, pickId: null };
  }), []);

  const toggleOffline = useCallback(() => {
    const st = stRef.current;
    if (st.offline === 'ready') { clearOffline().then(() => set({ offline: 'off', progress: 0, offlineMB: 0, offlineErr: '' })); return; }
    if (st.offline === 'downloading') return;
    const o = cityOr(st.origin), D = DST(st.corridor), r = LIVE.route[routeKey(o.n, D.id)];
    const coords: [number, number][] = r && r.status === 'ok' ? r.data.coords : view.routeMap.dots.map(d => [+d.p[1], +d.p[0]]);
    const extra = [`https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${D.lon},${D.lat}?overview=full&geometries=geojson`, wxPlan(D, st.startDate, st.days).url];
    const ac = new AbortController(); dlAbort.current = ac;
    set({ offline: 'downloading', progress: 0, offlineMB: 0, offlineErr: '' });
    downloadOffline(coords, extra, p => set({ progress: Math.round(p.done / Math.max(1, p.total) * 100), offlineMB: p.bytes / 1e6 }), ac.signal)
      .then(m => set({ offline: 'ready', progress: 100, offlineMB: m.mb }))
      .catch(e => set({ offline: 'off', progress: 0, offlineErr: (e as Error).message || 'Download failed. Try again.' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set]);

  // ---- Co-pilot ----------------------------------------------------------
  const pushMsg = (m: ChatMsg) => setS(p => ({ ...p, msgs: [...p.msgs, m] }));
  const editLast = (f: (m: ChatMsg) => ChatMsg) => setS(p => { const msgs = p.msgs.slice(); msgs[msgs.length - 1] = f(msgs[msgs.length - 1]); return { ...p, msgs }; });
  const typeOut = (text: string, then: () => void) => {
    editLast(m => ({ ...m, text, typed: 0 }));
    let n = 0;
    const id = window.setInterval(() => { n += 5; editLast(m => ({ ...m, typed: n })); if (n >= text.length) { clearInterval(id); then(); } }, 20);
    timers.current.push(id);
  };
  const finish = (acted: boolean) => {
    set({ busy: false });
    if (acted) { later(900, () => set({ drawer: false, tab: 'trip', toast: 'Trip updated', flash: 'budget' })); later(4000, () => set({ toast: null, flash: null })); }
  };

  /** Free mode: parse the request on the device, then visibly run each tool call. */
  const askLocal = (text: string) => {
    const st = { ...stRef.current }, intent = parseRequest(text, st), calls: ToolCall[] = [];
    // Tools run against a copy here; the screen updates after the calls are shown.
    const ctx = { st, apply: () => {} };
    let reply: string;
    let alert: [string, string] | null = null;
    if (!intent.calls.length && !intent.passQuestion) {
      reply = 'I can change your destination, home city, dates, travellers, transport, stay level, rooms, budget and departure time. Try “Make it 6 days, 2 kids, family rooms”.';
    } else {
      intent.calls.forEach(([fn, args]) => { runTool(fn, args, ctx); calls.push({ fn, args: JSON.stringify(args), status: 'running' }); });
      const r = costFor(st), parts: string[] = [];
      if (intent.calls.length) parts.push(`Done. New total ${fmt(r.total)}, ${r.total <= st.cap ? 'within' : `${fmt(r.total - st.cap)} over`} your ${fmt(st.cap)} cap.`);
      if (!r.ok && r.minDays) parts.push(`This route needs at least ${r.minDays} days.`);
      if (intent.passQuestion) { const pa = passAnswer(st, view.wx.hasSummary ? view.wx.summary : ''); parts.unshift(pa.reply); alert = pa.alert; if (alert) calls.push({ fn: 'show_alert', args: JSON.stringify({ title: alert[0] }), status: 'running' }); }
      reply = parts.join(' ');
    }
    const patch: Patch = { origin: st.origin, dest: st.dest, corridor: st.corridor, mode: st.mode, startDate: st.startDate, days: st.days, adults: st.adults, kids: st.kids, elders: st.elders, groupSize: st.groupSize, vehicle: st.vehicle, tier: st.tier, rooms: st.rooms, cap: st.cap, depart: st.depart, ...(alert ? { aiAlert: { title: alert[0], message: alert[1] } } : {}) };
    later(450, () => {
      pushMsg({ role: 'ai', text: '', typed: 0, calls: [] });
      typeOut(reply, () => {
        if (!calls.length) { set({ busy: false }); return; }
        later(250, () => editLast(m => ({ ...m, calls })));
        later(900, () => { editLast(m => ({ ...m, calls: calls.map(c => ({ ...c, status: 'executed' })) })); set({ ...patch, pickId: null, tab: 'trip', flash: alert && !intent.calls.length ? 'alert' : 'budget' }); });
        later(1700, () => set({ drawer: false, busy: false, toast: alert && !intent.calls.length ? 'Alert pinned to your trip' : 'Trip updated' }));
        later(4800, () => set({ toast: null, flash: null }));
      });
    });
  };
  const ctxApply = useRef<(p: Patch) => void>(() => {}); ctxApply.current = p => set({ ...p, pickId: null });

  const ask = (text: string) => {
    text = text.trim(); if (stRef.current.busy || !text) return;
    setS(p => ({ ...p, busy: true, input: '', msgs: [...p.msgs, { role: 'user', text }] }));
    if (!claude) { askLocal(text); return; }
    pushMsg({ role: 'ai', text: 'Working on it…', typed: 999, calls: [] });
    const st = { ...stRef.current }, calls: ToolCall[] = [];
    askClaude(text, () => summary(st), { st, apply: p => ctxApply.current(p) }, (fn, args) => { calls.push({ fn, args: JSON.stringify(args), status: 'executed' }); editLast(m => ({ ...m, calls: calls.slice() })); })
      .then(({ reply, acted }) => typeOut(reply, () => finish(acted)))
      .catch(() => { setS(p => ({ ...p, msgs: p.msgs.slice(0, -1) })); askLocal(text); });
  };

  const api: Api = { set, later, locate, setPeople, toggleOffline, ask };
  const view = buildView(s, api);

  // On the suggestions step, keep the scene on the selected option.
  const selCorridor = s.screen === 'onboard' && s.step === 5 ? view.selCorridor : undefined;
  useEffect(() => { if (selCorridor && selCorridor !== s.corridor) set({ corridor: selCorridor }); }, [selCorridor, s.corridor, set]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const st = e.currentTarget.scrollTop, n = sceneRef.current;
    if (n) { n.style.transform = `translateY(${-st * .45}px)`; n.style.opacity = String(Math.max(0, 1 - st / 520)); }
  };

  return (
    <div data-sc="1" data-theme={s.theme} className="sc-page">
      <div className="sc-frame">
        <main data-screen-label="SafarCo phone" className="sc-phone">
          <Scene elRef={sceneRef} corridor={s.corridor} theme={s.theme} showLabels={s.screen !== 'app'} peakLabel={DST(s.corridor).peakLabel} />

          <div className="sc-statusbar" aria-hidden="true" style={css('position:absolute;top:0;left:0;right:0;height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 30px;z-index:40;font-size:15px;font-weight:700;color:var(--ink);pointer-events:none')}>
            <span>9:41</span>
            <div style={css('position:absolute;left:50%;top:11px;width:118px;height:32px;margin-left:-59px;border-radius:20px;background:#000')} />
            <div style={css('display:flex;gap:5px;font-size:16px')}><i className="ph-fill ph-cell-signal-high" /><i className="ph-fill ph-wifi-high" /><i className="ph-fill ph-battery-full" /></div>
          </div>

          {s.screen === 'onboard' && <Onboarding v={view} api={api} />}

          {s.screen === 'app' && <>
            <div ref={scrollRef} onScroll={onScroll} style={css('position:absolute;inset:0;z-index:5;overflow-y:auto;scrollbar-width:none;pointer-events:none')}>
              {s.tab === 'trip' && <TripTab v={view} api={api} />}
              {s.tab === 'map' && <MapTab v={view} api={api} />}
              {s.tab === 'offline' && <OfflineTab v={view} api={api} />}
            </div>

            <nav aria-label="Sections" style={css('position:absolute;left:18px;right:18px;bottom:24px;z-index:12;display:flex;align-items:center;gap:12px')}>
              <div style={css('flex:1;height:64px;border-radius:24px;background:var(--sheet);backdrop-filter:blur(20px) saturate(1.4);border:1px solid var(--line);display:flex;align-items:center;padding:6px;gap:6px;box-shadow:0 20px 40px -16px rgba(0,0,0,.7)')}>
                {view.tabs.map(t => <button key={t.key} onClick={t.onClick} aria-current={s.tab === t.key ? 'page' : undefined} style={css(`flex:1;height:52px;border-radius:19px;border:0;background:${t.bg};color:${t.fg};display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:800;cursor:pointer;transition:all .25s`)}><i className={`ph-fill ${t.icon}`} style={css('font-size:19px')} />{t.label}</button>)}
              </div>
              <button onClick={() => set({ drawer: true, settings: false })} aria-label="Open co-pilot" style={css('position:relative;width:64px;height:64px;flex:none;border-radius:50%;border:0;padding:0;cursor:pointer;overflow:hidden;box-shadow:0 16px 36px -10px rgba(155,123,255,.7),0 0 0 1px var(--fill2) inset')}>
                <Orb />
                <div style={css('position:absolute;inset:4px;border-radius:50%;background:radial-gradient(circle at 35% 30%,var(--sheet),var(--sheet));display:flex;align-items:center;justify-content:center;color:var(--g);font-size:26px')}><i className="ph-fill ph-sparkle" /></div>
              </button>
            </nav>

            {s.toast && <div role="status" style={css('position:absolute;left:18px;right:18px;top:56px;z-index:30;padding:12px 14px;border-radius:20px;background:var(--sheet);backdrop-filter:blur(20px);border:1px solid rgba(46,229,157,.35);color:var(--ink);font-size:13px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 20px 40px -16px rgba(0,0,0,.7)')}><div style={css('width:30px;height:30px;border-radius:10px;background:var(--cta);color:var(--onCta);display:flex;align-items:center;justify-content:center;font-size:16px')}><i className="ph-fill ph-sparkle" /></div>{s.toast}</div>}

            <EditSheet v={view} api={api} />
            <CopilotDrawer v={view} api={api} status={claude ? 'Claude · controls route, budget and alerts' : 'Controls route, budget and alerts'} send={() => ask(s.input)} />
          </>}
        </main>
      </div>
    </div>
  );
}
