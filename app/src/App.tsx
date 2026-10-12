import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { EditSheet } from './components/Sheets';
import { FeedbackSheet, SaveSheet, SignInSheet, TripsSheet } from './components/Panels';
import { cloudDelete, cloudEnabled, cloudSave, cloudTrips, currentUser, loadPriceList, onUserChange, sendFeedback, signInWithGoogle, signOut, type User } from './cloud';
import { applyPrices } from './prices';
import { clearCurrent, cloudMerge, defaultName, deleteLocal, loadCurrent, localTrips, newId, saveCurrent, saveLocal, shareUrl, tripData, tripFromUrl, type SavedTrip } from './trips';
import { MapTab } from './components/MapTab';
import { OfflineTab } from './components/OfflineTab';
import { Onboarding } from './components/Onboarding';
import { TripTab } from './components/TripTab';
import { LIVE, fxFetch, geoSearch, placesFetch, placesKey, placesUrl, reverseGeo, routeFetch, routeKey, routeUrl, wikiFetch } from './engine/live';
import { allUrls, fetchWeather } from './weather/route';
import { mapsQ, mon } from './engine/format';
import { trip } from './engine/engine';
import { NODES } from './engine/data';
import { DST, cityOr, nearestCity } from './engine/places';
import { css } from './lib/css';
import { clearOffline, downloadOffline, savedOffline } from './offline';
import { Scene } from './scene/Scene';
import { initialState, type AppState, type Patch } from './state';
import { buildView, type Api } from './view';

/** Road-network nodes where the trip stops overnight. */
const view0NightNodes = (s: AppState) => s.vehicle === 'air' ? [] : trip(s.corridor, s.origin, mon(s)).cuts.map(i => trip(s.corridor, s.origin, mon(s)).legs[i].b).filter(n => NODES[n]);

/** ?frame shows the app inside the design's phone mock-up (for previews and screenshots). */
const framed = (() => { try { return new URLSearchParams(location.search).has('frame'); } catch { return false; } })();

export function App() {
  const [s, setS] = useState<AppState>(() => {
    const st = initialState(), off = savedOffline(), base: AppState = off ? { ...st, offline: 'ready', offlineMB: off.mb } : st;
    const shared = tripFromUrl();
    if (shared) return { ...base, ...shared, screen: 'app', chosen: shared.corridor, toast: 'Shared trip opened. Tap Save to keep it.' };
    const cur = loadCurrent();
    return cur ? { ...base, ...cur.data, screen: 'app', savedId: cur.savedId, chosen: cur.data.corridor } : base;
  });
  const [trips, setTrips] = useState<SavedTrip[]>(() => localTrips());
  const [user, setUser] = useState<User | null>(null);
  const stRef = useRef(s); stRef.current = s;
  const set = useCallback((p: Patch) => setS(prev => ({ ...prev, ...p })), []);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const timers = useRef<number[]>([]);
  const later = useCallback((ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); }, []);
  const sceneRef = useRef<HTMLDivElement>(null), scrollRef = useRef<HTMLDivElement>(null);
  const dlAbort = useRef<AbortController | null>(null);

  // Live data: re-render when a fetch lands.
  useEffect(() => { LIVE.subs.add(bump); return () => { LIVE.subs.delete(bump); timers.current.forEach(clearTimeout); dlAbort.current?.abort(); }; }, []);

  // Fetch the road route and weather for the current trip.
  useEffect(() => {
    if (s.screen !== 'app') return;
    const o = cityOr(s.origin), D = DST(s.corridor);
    if (s.vehicle !== 'air' || s.tab === 'map') routeFetch(o, D);
  }, [s.screen, s.origin, s.corridor, s.vehicle, s.tab, s.startDate, s.days]);

  // Destination guide, sights and places to stay (destination and each night stop).
  const nightNodes = view0NightNodes(s);
  useEffect(() => {
    if (s.screen !== 'app') return;
    const D = DST(s.corridor);
    wikiFetch(D);
    placesFetch('sights', D.lat, D.lon);
    placesFetch('hotels', D.lat, D.lon);
    nightNodes.forEach(n => placesFetch('hotels', NODES[n][0], NODES[n][1]));
  }, [s.screen, s.corridor, nightNodes.join()]);

  // Cities without a hand-written guide get their day plans from live sights.
  const sights = LIVE.places[placesKey('sights', DST(s.corridor).lat, DST(s.corridor).lon)];
  useEffect(() => {
    const D = DST(s.corridor);
    if (!D.generic || D.livePlaces || !sights || sights.status !== 'ok' || !sights.data.length) return;
    D.places = sights.data.slice(0, 8).map(x => [x.name, x.km ? `${x.km} km` : 'In town', x.type, null, mapsQ(`${x.name}, ${D.town}`)]);
    D.livePlaces = true; bump();
  }, [s.corridor, sights]);

  // US dollar rate, refreshed once a day.
  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem('safarco-fx') || 'null'); if (c && Date.now() - c.at < 864e5) { LIVE.fx.USD = { status: 'ok', data: c.data }; bump(); return; } } catch { /* storage blocked */ }
    fxFetch().then(e => { if (e.status === 'ok') try { localStorage.setItem('safarco-fx', JSON.stringify({ at: Date.now(), data: e.data })); } catch { /* storage blocked */ } });
  }, []);

  // Prices: the admin's checked list (cached on the device), else the built-in one.
  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem('safarco-prices') || 'null'); if (c) { applyPrices(c); bump(); } } catch { /* storage blocked */ }
    loadPriceList().then(v => { if (!v) return; applyPrices(v); bump(); try { localStorage.setItem('safarco-prices', JSON.stringify(v)); } catch { /* storage blocked */ } }).catch(() => {});
  }, []);

  // A shared link opens once; then the address goes back to normal.
  useEffect(() => { if (new URLSearchParams(location.search).has('trip')) history.replaceState(null, '', '/'); }, []);

  // Keep the trip being planned, so closing the app or reloading doesn't lose it.
  const tripKey = s.screen === 'app' ? JSON.stringify(tripData(s)) : '';
  useEffect(() => {
    if (!tripKey) return;
    const d = JSON.parse(tripKey);
    saveCurrent(d, s.savedId);
    if (!s.savedId) return;
    // A saved trip updates itself (on the device now, in the account shortly after).
    const t = setTimeout(() => {
      const old = localTrips().find(x => x.id === s.savedId); if (!old) return;
      const upd = { ...old, data: d, savedAt: new Date().toISOString() };
      saveLocal(upd); setTrips(localTrips());
      if (user) cloudSave(upd).then(cid => { if (cid !== upd.cloudId) { saveLocal({ ...upd, cloudId: cid }); setTrips(localTrips()); } }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [tripKey, s.savedId, user]);

  // Accounts: when someone signs in, back up this device's trips and bring in their others.
  useEffect(() => {
    currentUser().then(setUser);
    return onUserChange(setUser);
  }, []);
  useEffect(() => {
    if (!user) return;
    (async () => {
      for (const t of localTrips().filter(x => !x.cloudId)) { try { saveLocal({ ...t, cloudId: await cloudSave(t) }); } catch { /* try again next time */ } }
      try { cloudMerge(await cloudTrips()); } catch { /* offline */ }
      setTrips(localTrips());
      try { if (localStorage.getItem('safarco-after-signin')) { localStorage.removeItem('safarco-after-signin'); set({ toast: `Signed in as ${user.email}. Your trips are backed up.` }); } } catch { /* storage blocked */ }
    })();
  }, [user?.id]);

  // Toasts disappear by themselves.
  useEffect(() => { if (!s.toast) return; const t = setTimeout(() => set({ toast: null }), 3200); return () => clearTimeout(t); }, [s.toast]);

  // Data saver is remembered on this device.
  useEffect(() => { try { localStorage.setItem('safarco-lite', s.lite ? '1' : '0'); } catch { /* storage blocked */ } }, [s.lite]);

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
    const abs = (u: string) => new URL(u, location.origin).href;
    const extra = [abs(routeUrl(o, D)), ...allUrls(view.wPlan), abs(placesUrl('hotels', D.lat, D.lon)), abs(placesUrl('sights', D.lat, D.lon))];
    const ac = new AbortController(); dlAbort.current = ac;
    set({ offline: 'downloading', progress: 0, offlineMB: 0, offlineErr: '' });
    downloadOffline(coords, extra, p => set({ progress: Math.round(p.done / Math.max(1, p.total) * 100), offlineMB: p.bytes / 1e6 }), ac.signal)
      .then(m => set({ offline: 'ready', progress: 100, offlineMB: m.mb }))
      .catch(e => set({ offline: 'off', progress: 0, offlineErr: (e as Error).message || 'Download failed. Try again.' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set]);

  // ---- Saving, sharing and accounts ----------------------------------------
  const saveTrip = (name: string, asNew: boolean) => {
    const st = stRef.current, old = !asNew && st.savedId ? trips.find(t => t.id === st.savedId) : undefined;
    const t: SavedTrip = { id: old?.id || newId(), name, data: tripData(st), savedAt: new Date().toISOString(), cloudId: old?.cloudId };
    if (!saveLocal(t)) { set({ toast: 'Couldn’t save: this browser’s storage is full or blocked.' }); return; }
    setTrips(localTrips());
    if (user) {
      set({ savedId: t.id, sheet: 'none', toast: 'Trip saved to your account' });
      cloudSave(t).then(cid => { saveLocal({ ...t, cloudId: cid }); setTrips(localTrips()); }, () => set({ toast: 'Saved on this phone. It will back up when you’re online.' }));
    } else set({ savedId: t.id, sheet: cloudEnabled && !old ? 'signin' : 'none', toast: 'Trip saved on this phone' });
  };
  const shareTrip = async (d = tripData(stRef.current), name = defaultName(d)) => {
    const url = shareUrl(d);
    try {
      if (navigator.share) { await navigator.share({ title: `SafarCo: ${name}`, text: `My trip plan: ${name}`, url }); return; }
      await navigator.clipboard.writeText(url); set({ toast: 'Link copied. Paste it in WhatsApp or anywhere.' });
    } catch (e) { if ((e as Error)?.name !== 'AbortError') set({ toast: 'Couldn’t share. Try again.' }); }
  };
  const openTrip = (t: SavedTrip) => set({ ...t.data, savedId: t.id, chosen: t.data.corridor, screen: 'app', tab: 'trip', sheet: 'none', settings: false, pickId: null, toast: `Opened “${t.name}”` });
  const deleteTrip = (t: SavedTrip) => {
    deleteLocal(t.id); setTrips(localTrips());
    if (t.cloudId && user) cloudDelete(t.cloudId).catch(() => set({ toast: 'Deleted here; couldn’t reach your account.' }));
    if (stRef.current.savedId === t.id) set({ savedId: null });
  };
  const newTrip = () => { clearCurrent(); set({ screen: 'onboard', step: 0, sheet: 'none', settings: false, savedId: null }); };
  const google = () => { try { localStorage.setItem('safarco-after-signin', '1'); } catch { /* storage blocked */ } signInWithGoogle().catch(() => set({ sheet: 'none', toast: 'Couldn’t open Google sign-in. Try again.' })); };
  const feedback = (message: string, contact: string) => {
    if (cloudEnabled) return sendFeedback(message, contact, location.pathname + (stRef.current.screen === 'app' ? ` · ${defaultName(tripData(stRef.current))}` : ''));
    const to = import.meta.env.VITE_FEEDBACK_EMAIL as string | undefined;
    if (!to) return Promise.reject(new Error('Feedback is not set up'));
    location.href = `mailto:${to}?subject=${encodeURIComponent('SafarCo feedback')}&body=${encodeURIComponent(message + (contact ? `\n\nContact: ${contact}` : ''))}`;
    return Promise.resolve();
  };

  const api: Api = { set, later, locate, setPeople, toggleOffline, share: () => shareTrip(), newTrip };
  const view = buildView(s, api);

  // On the suggestions step, keep the scene on the selected option.
  const selCorridor = s.screen === 'onboard' && s.step === 5 ? view.selCorridor : undefined;
  useEffect(() => { if (selCorridor && selCorridor !== s.corridor) set({ corridor: selCorridor }); }, [selCorridor, s.corridor, set]);

  // Weather along the route: hourly forecast, passes, typical weather and air quality.
  const wxUrls = s.screen === 'app' ? allUrls(view.wPlan).join(' ') : '';
  useEffect(() => { if (wxUrls) fetchWeather(view.wPlan); }, [wxUrls]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const st = e.currentTarget.scrollTop, n = sceneRef.current;
    if (n) { n.style.transform = `translateY(${-st * .45}px)`; n.style.opacity = String(Math.max(0, 1 - st / 520)); }
  };

  return (
    <div data-sc="1" data-theme={s.theme} className={`sc-page${framed ? ' sc-framed' : ''}`}>
      <div className="sc-frame">
        <main data-screen-label="SafarCo phone" className="sc-phone">
          <Scene elRef={sceneRef} corridor={s.corridor} theme={s.theme} lite={s.lite} showLabels={s.screen !== 'app'} peakLabel={DST(s.corridor).peakLabel} />

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

            <nav aria-label="Sections" className="sc-nav" style={css('position:absolute;left:18px;right:18px;bottom:calc(24px + env(safe-area-inset-bottom));z-index:12;display:flex;align-items:center;gap:12px')}>
              <div style={css('flex:1;height:64px;border-radius:24px;background:var(--sheet);backdrop-filter:blur(20px) saturate(1.4);border:1px solid var(--line);display:flex;align-items:center;padding:6px;gap:6px;box-shadow:0 20px 40px -16px rgba(0,0,0,.7)')}>
                {view.tabs.map(t => <button key={t.key} onClick={t.onClick} aria-current={s.tab === t.key ? 'page' : undefined} style={css(`flex:1;height:52px;border-radius:19px;border:0;background:${t.bg};color:${t.fg};display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:800;cursor:pointer;transition:all .25s`)}><i className={`ph-fill ${t.icon}`} style={css('font-size:19px')} />{t.label}</button>)}
              </div>
            </nav>

            <EditSheet v={view} api={api} />
          </>}

          {s.toast && <div role="status" style={css('position:absolute;left:18px;right:18px;top:calc(56px + env(safe-area-inset-top));z-index:60;padding:12px 14px;border-radius:20px;background:var(--sheet);backdrop-filter:blur(20px);border:1px solid rgba(46,229,157,.35);color:var(--ink);font-size:13px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 20px 40px -16px rgba(0,0,0,.5)')} className="sc-toast"><div style={css('width:30px;height:30px;flex:none;border-radius:10px;background:var(--cta);color:var(--onCta);display:flex;align-items:center;justify-content:center;font-size:16px')}><i className="ph-fill ph-check" /></div>{s.toast}</div>}

          <SaveSheet open={s.sheet === 'save'} isSaved={!!s.savedId} defaultName={(s.savedId && trips.find(t => t.id === s.savedId)?.name) || defaultName(tripData(s))} onSave={saveTrip} onClose={() => set({ sheet: 'none' })} />
          <SignInSheet open={s.sheet === 'signin'} onGoogle={google} onClose={() => set({ sheet: 'none' })} />
          <TripsSheet open={s.sheet === 'trips'} trips={trips} user={user} currentId={s.savedId} onOpen={openTrip} onDelete={deleteTrip} onShare={t => shareTrip(t.data, t.name)} onNew={newTrip}
            onSignIn={google} onSignOut={() => signOut().then(() => set({ toast: 'Signed out. Trips stay on this device.' }))} onFeedback={() => set({ sheet: 'feedback' })} onClose={() => set({ sheet: 'none' })} />
          <FeedbackSheet open={s.sheet === 'feedback'} onSend={feedback} onClose={() => set({ sheet: 'none' })} />
        </main>
      </div>
    </div>
  );
}
