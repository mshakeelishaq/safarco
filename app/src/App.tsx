import { cardPhoto } from './photos';
import { onInstallChange } from './install';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { DestSheet, EditSheet } from './components/Sheets';
import { FeedbackSheet, FoodSheet, ReviewSheet, SaveSheet, SignInSheet, TripsSheet } from './components/Panels';
import { WELCOMED, Welcome, seenWelcome } from './components/Welcome';
import { SeasonGuide } from './components/SeasonGuide';
import { addCheckin, cloudDelete, cloudEnabled, cloudSave, cloudTrips, createFollow, currentUser, loadFoodTips, loadContent, loadPriceList, loadReviews, submitFoodTip, onUserChange, sendFeedback, signInWithGoogle, signOut, stopFollow, submitReview, updateFollow, type User } from './cloud';
import { ExpenseSheet, PeopleSheet, ShareSheet, SosSheet } from './components/TripMode';
import { RUN_SUBS, getRun, moveRun, runKey, updateRun } from './run';
import { followLink } from './view-trip';
import { drawCard, shareCard } from './sharecard';
import { followCopyUrl } from './trips';
import { isoOff, mon as monthOf } from './engine/format';
import { MONTH_FULL } from './engine/data';
import { markRated, ratedKey } from './rated';
import { setReviews } from './reviews';
import { setFoodTips } from './foodtips';
import { t as tx } from './i18n';
import { applyPrices } from './prices';
import { applyContent } from './content';
import { clearCurrent, cloudMerge, defaultName, deleteLocal, loadCurrent, localTrips, newId, saveCurrent, saveLocal, shareUrl, tripData, tripFromUrl, type SavedTrip } from './trips';
import { MapTab, SideMap } from './components/MapTab';
import { BudgetTab } from './components/BudgetTab';
import { Building } from './components/Building';
import { DayPage } from './components/DayPage';
import { PrepareTab } from './components/PrepareTab';
import { Onboarding } from './components/Onboarding';
import { TripTab } from './components/TripTab';
import { LIVE, fxFetch, geoSearch, placesFetch, placesKey, placesUrl, reverseGeo, routeFetch, routeUrl, wikiFetch } from './engine/live';
import { allUrls, fetchWeather } from './weather/route';
import { mapsQ, mon } from './engine/format';
import { bestAirport, liveRoadKey, roadVia, setRoutePick, trip, usualDays } from './engine/engine';
import { DESTS, NODES } from './engine/data';
import { CITY, DST, cityOr, nearestCity } from './engine/places';
import { travellerPatch } from './traveller';
import { css } from './lib/css';
import { clearOffline, downloadOffline, savedOffline } from './offline';
import { Scene } from './scene/Scene';
import { initialState, type AppState, type Patch } from './state';
import { buildView, type Api } from './view';
import { CONTACT_EMAIL } from './contact';

/** Road-network nodes where the trip stops overnight. */
const view0NightNodes = (s: AppState) => s.vehicle === 'air' ? [] : (setRoutePick(s), trip(s.corridor, s.origin, mon(s)).cuts.map(i => trip(s.corridor, s.origin, mon(s)).legs[i].b).filter(n => NODES[n]));

/** ?frame shows the app inside the design's phone mock-up (for previews and screenshots). */
const framed = (() => { try { return new URLSearchParams(location.search).has('frame'); } catch { return false; } })();

export function App() {
  const [s, setS] = useState<AppState>(() => {
    const st = initialState(), off = savedOffline(), base: AppState = off ? { ...st, offline: 'ready', offlineMB: off.mb } : st;
    const shared = tripFromUrl(), cur = loadCurrent(), q = new URLSearchParams(location.search), go = q.get('go'), start = q.get('start');
    // From the website's plan bar and "Who's travelling?": the city, the start date and the traveller's usual way to go.
    const from = q.get('from'), date = q.get('date'), today = new Date().toISOString().slice(0, 10);
    const pre: Partial<AppState> = { ...travellerPatch(q.get('as')), ...(from && CITY[from] ? { origin: from } : {}), ...(date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today ? { startDate: date } : {}) };
    // From the website: "Plan a trip to Hunza" starts a new plan for it (at the dates step when the city is known); "Start planning" skips the welcome screen.
    if (go && DESTS.some(d => d.id === go)) return { ...base, ...pre, welcome: false, screen: 'onboard', step: pre.origin ? 3 : 1, mode: 'know', dest: go, corridor: go, wish: 'any', chosen: null };
    if (start && (from || date) && !shared) return { ...base, ...pre, welcome: false, screen: 'onboard', step: 0 };
    if (start === 'quick') return { ...base, welcome: false, quick: true, screen: 'onboard', step: 0, days: 5 };
    if (start && !shared) return cur ? { ...base, ...cur.data, screen: 'app', savedId: cur.savedId, chosen: cur.data.corridor } : { ...base, ...pre, welcome: false };
    // The address bar carries the trip being viewed; reopening this device's own trip keeps it as it was.
    if (shared && !(cur && JSON.stringify(cur.data) === JSON.stringify(shared))) return { ...base, ...shared, screen: 'app', chosen: shared.corridor, toast: tx('Shared trip opened. Tap Save to keep it.') };
    return cur ? { ...base, ...cur.data, screen: 'app', savedId: cur.savedId, chosen: cur.data.corridor } : { ...base, welcome: !seenWelcome() };
  });
  const [trips, setTrips] = useState<SavedTrip[]>(() => localTrips());
  const [user, setUser] = useState<User | null>(null);
  const stRef = useRef(s); stRef.current = s;
  const [closures, setClosures] = useState('');
  const set = useCallback((p: Patch) => setS(prev => ({ ...prev, ...p })), []);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  // Laptops: the plan on the left and the route map beside it.
  const [wide, setWide] = useState(() => matchMedia('(min-width: 1100px)').matches);
  useEffect(() => { const mq = matchMedia('(min-width: 1100px)'), f = () => setWide(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  // The install card appears once the browser offers to install the app.
  useEffect(() => onInstallChange(bump), []);
  // Moving a trip's dates (Edit → Start date) brings its checklist, expenses, check-ins and family link along.
  const prevTrip = useRef<{ screen: string; savedId: string | null; origin: string | null; corridor: string; startDate: string } | null>(null);
  useEffect(() => {
    const p = prevTrip.current; prevTrip.current = { screen: s.screen, savedId: s.savedId, origin: s.origin, corridor: s.corridor, startDate: s.startDate };
    if (!p || p.screen !== 'app' || s.screen !== 'app' || p.savedId !== s.savedId || p.origin !== s.origin || p.corridor !== s.corridor || p.startDate === s.startDate) return;
    if (!moveRun(p, s)) return;
    set({ toast: tx('New dates saved. Your checklist, expenses and family link moved with the trip.') });
    const id = getRun(runKey(s)).followId;
    if (id && user) updateFollow(id, tripData(s), isoOff(s.startDate, s.days + 3)).catch(() => { /* updated next time it's shared */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.screen, s.savedId, s.origin, s.corridor, s.startDate]);
  const timers = useRef<number[]>([]);
  const later = useCallback((ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); }, []);
  const sceneRef = useRef<HTMLDivElement>(null), scrollRef = useRef<HTMLDivElement>(null);
  const dlAbort = useRef<AbortController | null>(null);

  // Live data: re-render when a fetch lands.
  useEffect(() => { LIVE.subs.add(bump); RUN_SUBS.add(bump); return () => { LIVE.subs.delete(bump); RUN_SUBS.delete(bump); timers.current.forEach(clearTimeout); dlAbort.current?.abort(); }; }, []);

  // Fetch the road route and weather for the current trip.
  useEffect(() => {
    if (s.screen !== 'app') return;
    const o = cityOr(s.origin), D = DST(s.corridor);
    setRoutePick(s);
    if (s.vehicle !== 'air' || s.tab === 'map') routeFetch(o, D, roadVia(s.corridor, s.origin, mon(s)));
  }, [s.screen, s.origin, s.corridor, s.vehicle, s.tab, s.startDate, s.days, s.roadPick, closures]);

  // Destination guide, sights and places to stay (destination and each night stop).
  const nightNodes = view0NightNodes(s);
  useEffect(() => {
    if (s.screen !== 'app') return;
    const D = DST(s.corridor);
    wikiFetch(D);
    placesFetch('sights', D.lat, D.lon);
    placesFetch('hotels', D.lat, D.lon);
    nightNodes.forEach(n => { placesFetch('hotels', NODES[n][0], NODES[n][1]); placesFetch('sights', NODES[n][0], NODES[n][1]); });
    // Every other place on a circuit.
    (s.extra || []).forEach(k => { const X = DST(k); placesFetch('hotels', X.lat, X.lon); placesFetch('sights', X.lat, X.lon); });
  }, [s.screen, s.corridor, nightNodes.join(), (s.extra || []).join()]);

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

  // Prices and approved reviews: the admin's lists (cached on the device), else the built-in ones.
  // The admin's closures, alerts and edits. A change to closed roads re-plans the route, and the map follows.
  const contentAt = useRef(0);
  const refreshContent = () => {
    contentAt.current = Date.now();
    loadContent().then(v => {
      if (!v) return; applyContent(v); bump();
      const key = JSON.stringify((v as { closures?: unknown }).closures || []);
      setClosures(prev => { if (prev && prev !== key) set({ toast: tx('Road news updated. Your route has been checked again.') }); return key; });
      try { localStorage.setItem('safarco-content', JSON.stringify(v)); } catch { /* storage blocked */ }
    }).catch(() => {});
  };
  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem('safarco-prices') || 'null'); if (c) { applyPrices(c); bump(); } } catch { /* storage blocked */ }
    try { const c = JSON.parse(localStorage.getItem('safarco-content') || 'null'); if (c) { applyContent(c); bump(); } } catch { /* storage blocked */ }
    try { const r = JSON.parse(localStorage.getItem('safarco-reviews') || 'null'); if (r) setReviews(r); } catch { /* storage blocked */ }
    try { const r = JSON.parse(localStorage.getItem('safarco-food') || 'null'); if (r) setFoodTips(r); } catch { /* storage blocked */ }
    loadFoodTips().then(r => { if (!r) return; setFoodTips(r); bump(); try { localStorage.setItem('safarco-food', JSON.stringify(r)); } catch { /* storage blocked */ } }).catch(() => {});
    loadReviews().then(r => { if (!r) return; setReviews(r); bump(); try { localStorage.setItem('safarco-reviews', JSON.stringify(r)); } catch { /* storage blocked */ } }).catch(() => {});
    loadPriceList().then(v => { if (!v) return; applyPrices(v); bump(); try { localStorage.setItem('safarco-prices', JSON.stringify(v)); } catch { /* storage blocked */ } }).catch(() => {});
    // The admin's changes to places, food and destinations; kept on the phone for next time and for offline.
    refreshContent();
    // On the road with the app open: check for new closures and alerts every 15 minutes, and when it comes back to the screen.
    const every = setInterval(() => { if (document.visibilityState === 'visible') refreshContent(); }, 15 * 60000);
    const back = () => { if (document.visibilityState === 'visible' && Date.now() - contentAt.current > 5 * 60000) refreshContent(); };
    document.addEventListener('visibilitychange', back);
    return () => { clearInterval(every); document.removeEventListener('visibilitychange', back); };
  }, []);


  // Keep the trip being planned, so closing the app or reloading doesn't lose it.
  const tripKey = s.screen === 'app' ? JSON.stringify(tripData(s)) : '', savedFor = useRef<string | null>(null);
  useEffect(() => {
    // The address bar always opens this trip, so copying it shares the plan, not just the app.
    const url = tripKey ? shareUrl(JSON.parse(tripKey)) : '';
    try { history.replaceState(null, '', url && url.length < 4200 ? url.slice(location.origin.length) : '/plan'); } catch { /* not allowed here */ }
    if (!tripKey) return;
    const d = JSON.parse(tripKey);
    saveCurrent(d, s.savedId);
    if (!s.savedId) return;
    // Opening a saved trip isn't a change; anything after that is, and gets a short "saved" note.
    const opened = savedFor.current !== s.savedId; savedFor.current = s.savedId;
    // A saved trip updates itself (on the device now, in the account shortly after).
    const t = setTimeout(() => {
      const old = localTrips().find(x => x.id === s.savedId); if (!old) return;
      const changed = JSON.stringify(old.data) !== tripKey;
      // A name SafarCo made ("Lahore → Skardu · May 2027") follows the trip when its places or month change.
      const upd = { ...old, name: old.name === defaultName(old.data) ? defaultName(d) : old.name, data: d, savedAt: new Date().toISOString() };
      saveLocal(upd); setTrips(localTrips());
      if (changed && !opened && !stRef.current.toast) set({ toast: user ? tx('Changes saved to “{name}”, on this phone and in your account.', { name: upd.name }) : tx('Changes saved to “{name}”.', { name: upd.name }) });
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
      try { if (localStorage.getItem('safarco-after-signin')) { localStorage.removeItem('safarco-after-signin'); set({ toast: tx('Signed in as {email}. Your trips are backed up.', { email: user.email }) }); } } catch { /* storage blocked */ }
    })();
  }, [user?.id]);

  // Toasts disappear by themselves.
  useEffect(() => { if (!s.toast) return; const t = setTimeout(() => set({ toast: null, toastUndo: false }), s.toastUndo ? 7000 : 3200); return () => clearTimeout(t); }, [s.toast, s.toastUndo]);

  // Data saver is remembered on this device.
  useEffect(() => { try { localStorage.setItem('safarco-lite', s.lite ? '1' : '0'); } catch { /* storage blocked */ } }, [s.lite]);

  // Search OpenStreetMap once typing pauses.
  const q = s.screen === 'onboard' ? (s.step === 1 ? s.oq : s.step === 2 ? s.dq : '') : '';
  useEffect(() => {
    if (q.trim().length < 3) return;
    const t = setTimeout(() => geoSearch(q), 650);
    return () => clearTimeout(t);
  }, [q]);

  // From abroad, the arrival airport follows the destination until the traveller picks one.
  useEffect(() => {
    if (!s.abroad || !s.airAuto) return;
    const o = bestAirport(s.corridor, mon(s)); if (o !== s.origin) set({ origin: o });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.abroad, s.airAuto, s.corridor, s.startDate, s.origin]);

  // Theme is remembered on this device.
  useEffect(() => { try { localStorage.setItem('safarco-theme', s.theme); } catch { /* storage blocked */ } }, [s.theme]);

  // Reset the hero parallax when switching screens or tabs.
  useEffect(() => { const n = sceneRef.current; if (n) { n.style.transform = ''; n.style.opacity = ''; } scrollRef.current?.scrollTo(0, 0); }, [s.screen, s.tab]);

  const locate = useCallback(() => {
    set({ loc: 'locating' });
    let finished = false;
    const done = (p: Patch) => { if (!finished) { finished = true; set(p); } };
    const fail = (note: string) => done({ loc: 'failed', locNote: note });
    later(12000, () => fail(tx('GPS didn’t respond. Search for your city below.')));
    if (!navigator.geolocation) return fail(tx('This device has no GPS. Search for your city below.'));
    navigator.geolocation.getCurrentPosition(p => {
      const { latitude: a, longitude: o } = p.coords;
      // Outside Pakistan: the trip starts at the airport they fly into, the one that suits the place they pick.
      if (!(a > 23.5 && a < 37.2 && o > 60.8 && o < 77.9)) { const st = stRef.current; return done({ loc: 'done', abroad: true, airAuto: true, origin: bestAirport(st.corridor, mon(st)), oq: '', pickId: null, locNote: '' }); }
      const pick = (note?: string) => { const { city, d } = nearestCity(a, o); done({ loc: 'done', origin: city.n, oq: '', pickId: null, locNote: note || tx('Detected from GPS · {km} km from city centre', { km: Math.max(1, Math.round(d)) }) }); };
      if (nearestCity(a, o).d < 8) return pick();
      reverseGeo(a, o)!.then(() => pick(tx('Detected from GPS · place name from OpenStreetMap')), () => pick());
    }, err => err.code === err.PERMISSION_DENIED ? done({ loc: 'denied' }) : fail(tx('Couldn’t get a GPS fix. Search for your city below.')), { timeout: 10000, maximumAge: 600000 });
  }, [set, later]);

  const setPeople = useCallback((k: 'adults' | 'kids' | 'elders', d: number) => setS(p => {
    const min = k === 'adults' ? 1 : 0, n = { adults: p.adults, kids: p.kids, elders: p.elders }; n[k] = Math.max(min, Math.min(20, n[k] + d));
    return { ...p, ...n, groupSize: n.adults + n.kids + n.elders, pickId: null };
  }), []);

  const toggleOffline = useCallback(() => {
    const st = stRef.current;
    if (st.offline === 'ready') { clearOffline().then(() => set({ offline: 'off', progress: 0, offlineMB: 0, offlineErr: '' })); return; }
    if (st.offline === 'downloading') return;
    setRoutePick(st);
    const o = cityOr(st.origin), D = DST(st.corridor), via = roadVia(st.corridor, st.origin, mon(st)), r = LIVE.route[liveRoadKey(st.corridor, st.origin, mon(st))];
    const coords: [number, number][] = r && r.status === 'ok' ? r.data.coords : view.routeMap.dots.map(d => [+d.p[1], +d.p[0]]);
    const abs = (u: string) => new URL(u, location.origin).href;
    const extra = [abs(routeUrl(o, D, via.pts)), ...allUrls(view.wPlan), abs(placesUrl('hotels', D.lat, D.lon)), abs(placesUrl('sights', D.lat, D.lon)), ...view.fuelPoints.map(p => abs(placesUrl('fuel', p.lat, p.lon)))];
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
    if (!saveLocal(t)) { set({ toast: tx('Couldn’t save: this browser’s storage is full or blocked.') }); return; }
    setTrips(localTrips());
    if (user) {
      set({ savedId: t.id, sheet: 'none', toast: tx('Trip saved to your account') });
      cloudSave(t).then(cid => { saveLocal({ ...t, cloudId: cid }); setTrips(localTrips()); }, () => set({ toast: tx('Saved on this phone. It will back up when you’re online.') }));
    } else set({ savedId: t.id, sheet: cloudEnabled && !old ? 'signin' : 'none', toast: tx('Trip saved on this phone') });
  };
  const shareTrip = async (d = tripData(stRef.current), name = defaultName(d)) => {
    const url = shareUrl(d);
    try {
      if (navigator.share) { await navigator.share({ title: `SafarCo: ${name}`, text: `My trip plan: ${name}`, url }); return; }
      await navigator.clipboard.writeText(url); set({ toast: tx('Link copied. Paste it in WhatsApp or anywhere.') });
    } catch (e) { if ((e as Error)?.name !== 'AbortError') set({ toast: tx('Couldn’t share. Try again.') }); }
  };
  const openTrip = (t: SavedTrip) => set({ ...t.data, savedId: t.id, chosen: t.data.corridor, screen: 'app', tab: 'trip', sheet: 'none', settings: false, pickId: null, toast: tx('Opened “{name}”', { name: t.name }) });
  const deleteTrip = (t: SavedTrip) => {
    deleteLocal(t.id); setTrips(localTrips());
    if (t.cloudId && user) cloudDelete(t.cloudId).catch(() => set({ toast: tx('Deleted here; couldn’t reach your account.') }));
    if (stRef.current.savedId === t.id) set({ savedId: null });
  };
  const newTrip = () => { clearCurrent(); set({ screen: 'onboard', step: 0, sheet: 'none', settings: false, savedId: null }); };
  const google = () => { try { localStorage.setItem('safarco-after-signin', '1'); } catch { /* storage blocked */ } signInWithGoogle().catch(() => set({ sheet: 'none', toast: tx('Couldn’t open Google sign-in. Try again.') })); };
  const feedback = (message: string, contact: string) => {
    if (cloudEnabled) return sendFeedback(message, contact, location.pathname + (stRef.current.screen === 'app' ? ` · ${defaultName(tripData(stRef.current))}` : ''));
    const to = CONTACT_EMAIL;
    if (!to) return Promise.reject(new Error('Feedback is not set up'));
    location.href = `mailto:${to}?subject=${encodeURIComponent('SafarCo feedback')}&body=${encodeURIComponent(message + (contact ? `\n\nContact: ${contact}` : ''))}`;
    return Promise.resolve();
  };

  const doneBuilding = useCallback(() => set({ building: null }), [set]);
  // Close a day page when the trip changes.
  useEffect(() => { set({ dayOpen: null }); }, [s.corridor, s.origin, s.days, set]);
  // ---- Family follow link, check-ins and the trip card --------------------------------
  const [busy, setBusy] = useState('');
  const sendText = async (title: string, text: string, url: string) => {
    try { if (navigator.share) { await navigator.share({ title, text, url }); return; } } catch (e) { if ((e as Error)?.name === 'AbortError') return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
  };
  const shareFamily = async () => {
    const st = stRef.current, key = runKey(st), d = tripData(st), expires = isoOff(st.startDate, st.days + 3), name = DST(st.corridor).name;
    setBusy('family');
    let url = followCopyUrl(d);
    if (cloudEnabled && user) {
      try {
        let id = getRun(key).followId;
        if (id) await updateFollow(id, d, expires); else { id = await createFollow(d, expires); updateRun(key, () => ({ followId: id })); }
        url = followLink(id);
      } catch { set({ toast: tx('Couldn’t make a live link, so this shares a copy of the plan.') }); }
    }
    setBusy('');
    updateRun(key, r => ({ ticks: [...new Set([...r.ticks, 'family'])] }));
    await sendText(`SafarCo: ${name}`, tx('Follow our trip to {place}:', { place: name }), url);
  };
  const stopFamily = async () => {
    const key = runKey(stRef.current), id = getRun(key).followId; if (!id) return;
    try { await stopFollow(id); updateRun(key, () => ({ followId: null })); set({ sheet: 'none', toast: tx('Family link stopped.') }); } catch { set({ toast: tx('Couldn’t stop the link. Try again when online.') }); }
  };
  const checkIn = (place: string, arrived = false) => {
    const st = stRef.current, id = getRun(runKey(st)).followId, r = view.trip.checkIn(place, arrived);
    if (id && user) addCheckin(id, r.label, st.here?.lat, st.here?.lon).catch(() => { /* WhatsApp still tells family */ });
    window.open(r.wa, '_blank');
    set({ toast: arrived ? tx('Family told you arrived') : tx('Checked in at {place}', { place }) });
  };
  const makeCard = async () => {
    const st = stRef.current, v = view, D = DST(st.corridor), m = monthOf(st);
    setBusy('card');
    try {
      const places = [...new Set(v.plan.days.flatMap(d => d.stops.filter(x => x.kind === 'pin' && x.label !== tx('Free day')).map(x => x.label)))];
      const blob = await drawCard({
        photo: v.cardPhoto, kicker: `${v.c.from} → ${v.c.to}`, title: v.c.loop ? v.tripPlaces.list.map(x => x.name).join(' · ') : D.name, when: `${MONTH_FULL[m - 1]} ${st.startDate.slice(0, 4)} · ${tx('{n} days', { n: v.plan.days.length })}`,
        stats: [{ value: v.isAir ? tx('By air') : tx('{km} km', { km: v.c.kmStr }), label: v.isAir ? '' : v.c.loop ? tx('round trip') : tx('each way') }, { value: String(v.plan.days.length), label: tx('days') }, { value: String(places.length), label: tx('places') }],
        places, placesLabel: tx('Places').toUpperCase(), stops: v.cardStops, footer: tx('Planned with SafarCo · safarco.pk'), credit: tx('Photo © {handle}', { handle: 'shakeelnaturegraphy' })
      });
      const how = await shareCard(blob, `safarco-${D.id}.jpg`, tx('My trip to {place}, planned with SafarCo', { place: D.name }));
      if (how === 'saved') set({ toast: tx('Trip card saved. Post it from your gallery.') });
    } catch (e) { if ((e as Error)?.name !== 'AbortError') set({ toast: tx('Couldn’t make the trip card. Try again.') }); }
    setBusy('');
  };
  const nextTrip = (wish: string) => { clearCurrent(); set({ screen: 'onboard', step: 1, sheet: 'none', settings: false, savedId: null, wish: wish as AppState['wish'], edits: { key: '', picks: [], drops: [] } }); view.wishOpts.find(o => o.key === wish)?.onClick(); };

  // ---- Change destination: save this plan and start a new one (suggested), switch this one, or add a stop ----
  const undoSwitch = useRef<{ data: ReturnType<typeof tripData>; savedId: string | null } | null>(null);
  const changeDest = (how: 'new' | 'switch' | 'add') => {
    const st = stRef.current, id = st.destPick; if (!id || id === st.corridor) return;
    const next = DST(id).name, cur = DST(st.corridor).name, done = { sheet: 'none' as const, destPick: null, dq: '', settings: false, building: Date.now(), tab: 'trip' as const, dayOpen: null };
    if (how === 'add') { set({ ...done, extra: [...(st.extra || []), id].slice(-3), toast: tx('{next} is added to your trip.', { next }) }); return; }
    // What belonged to the old place starts fresh; dates, people, car, hotels and budget stay.
    const fresh = { ...done, dest: id, corridor: id, chosen: id, mode: 'know' as const, pickId: null, extra: [], breaks: [], roadPick: null, sleepAt: [], dayTrips: [], overnight: null, edits: { key: '', picks: [], drops: [] } };
    if (how === 'new') {
      const old = st.savedId ? trips.find(x => x.id === st.savedId) : undefined;
      const keep: SavedTrip = { id: old?.id || newId(), name: old?.name || defaultName(tripData(st)), data: tripData(st), savedAt: new Date().toISOString(), cloudId: old?.cloudId };
      if (!saveLocal(keep)) { set({ toast: tx('Couldn’t save: this browser’s storage is full or blocked.') }); return; }
      setTrips(localTrips());
      if (user) cloudSave(keep).then(cid => { saveLocal({ ...keep, cloudId: cid }); setTrips(localTrips()); }, () => { /* backs up when online */ });
      set({ ...fresh, savedId: null, toast: tx('Now planning {next}. Your {place} trip is in My trips.', { next, place: cur }) });
      return;
    }
    // Switch: the same trip goes somewhere else; its checklist, expenses and family link come along.
    undoSwitch.current = { data: tripData(st), savedId: st.savedId };
    const to = { ...st, ...fresh };
    moveRun(st, to);
    const fid = getRun(runKey(to)).followId;
    if (fid && user) updateFollow(fid, tripData(to), isoOff(to.startDate, to.days + 3)).catch(() => { /* updated next time it's shared */ });
    set({ ...fresh, toast: tx('Switched to {next}.', { next }), toastUndo: true });
  };
  const undoChange = () => {
    const u = undoSwitch.current, st = stRef.current; if (!u) return; undoSwitch.current = null;
    moveRun(st, u.data);
    set({ ...u.data, savedId: u.savedId, chosen: u.data.corridor, building: null, dayOpen: null, toastUndo: false, toast: tx('Back to {place}.', { place: DST(u.data.corridor).name }) });
  };
  const api: Api = { set, later, locate, setPeople, toggleOffline, share: () => shareTrip(), newTrip, checkIn, shareCard: makeCard, nextTrip, changeDest };
  const view = buildView(s, api);

  // Photos for the suggestion cards on the first steps (each place's guide photo, fetched once).
  const pickIds = s.screen === 'onboard' ? [...(view.wishPicks?.picks || []), ...view.bestNow.picks].map(p => p.key).join(',') : '';
  useEffect(() => { if (pickIds) pickIds.split(',').forEach(id => wikiFetch(DST(id))); }, [pickIds]);

  // On the suggestions step, keep the scene on the selected option.
  const selCorridor = s.screen === 'onboard' && s.step === 6 ? view.selCorridor : undefined;
  useEffect(() => { if (selCorridor && selCorridor !== s.corridor) set({ corridor: selCorridor }); }, [selCorridor, s.corridor, set]);
  // Until the traveller picks the days, a new destination starts at its usual length (Hunza by road: a week).
  const usual = s.screen === 'onboard' && !s.daysSet && s.mode === 'know' && s.origin && s.dest ? usualDays(s.dest, s.origin, mon(s)) : null;
  useEffect(() => { if (usual && usual !== s.days) set({ days: usual }); }, [usual]);

  // Weather along the route: hourly forecast, passes, typical weather and air quality.
  const wxUrls = s.screen === 'app' ? allUrls(view.wPlan).join(' ') : '';
  useEffect(() => { if (wxUrls) fetchWeather(view.wPlan); }, [wxUrls]);

  // Fuel pumps along the road (only for trips in your own or a rented vehicle, once the road has loaded).
  const fuelKeys = view.fuelPoints.map(p => placesKey('fuel', p.lat, p.lon)).join(' ');
  useEffect(() => { view.fuelPoints.forEach(p => placesFetch('fuel', p.lat, p.lon)); }, [fuelKeys]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const st = e.currentTarget.scrollTop, n = sceneRef.current;
    if (n) { n.style.transform = `translateY(${-st * .45}px)`; n.style.opacity = String(Math.max(0, 1 - st / 520)); }
  };

  const side = wide && !framed && s.screen === 'app';
  return (
    <div data-sc="1" data-theme={s.theme} className={`sc-page${framed ? ' sc-framed' : ''}${side ? ' sc-wide' : ''}`}>
      <div className="sc-frame">
        <main data-screen-label="SafarCo phone" className="sc-phone">
          <Scene elRef={sceneRef} corridor={s.corridor} theme={s.theme} lite={s.lite} photo={s.lite && !DST(s.corridor).generic ? cardPhoto(s.corridor, monthOf(s)) : null} showLabels={s.screen !== 'app'} peakLabel={DST(s.corridor).peakLabel} />

          <div className="sc-statusbar" aria-hidden="true" style={css('position:absolute;top:0;left:0;right:0;height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 30px;z-index:40;font-size:15px;font-weight:700;color:var(--ink);pointer-events:none')}>
            <span>9:41</span>
            <div style={css('position:absolute;left:50%;top:11px;width:118px;height:32px;margin-left:-59px;border-radius:20px;background:#000')} />
            <div style={css('display:flex;gap:5px;font-size:16px')}><i className="ph-fill ph-cell-signal-high" /><i className="ph-fill ph-wifi-high" /><i className="ph-fill ph-battery-full" /></div>
          </div>

          {s.screen === 'onboard' && <Onboarding v={view} api={api} />}

          {s.screen === 'app' && <>
            <div ref={scrollRef} onScroll={onScroll} style={css('position:absolute;inset:0;z-index:5;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;pointer-events:none')}>
              {s.tab === 'trip' && <TripTab v={view} api={api} />}
              {s.tab === 'map' && !side && <MapTab v={view} api={api} />}
              {s.tab === 'map' && side && <TripTab v={view} api={api} />}
              {s.tab === 'budget' && <BudgetTab v={view} api={api} />}
              {s.tab === 'prepare' && <PrepareTab v={view} api={api} />}
            </div>

            {s.tab !== 'map' && <div aria-hidden style={css('position:absolute;left:0;right:0;bottom:0;height:calc(70px + env(safe-area-inset-bottom));z-index:11;pointer-events:none;background:linear-gradient(180deg,transparent,var(--bg) 55%)')} />}
            <nav aria-label="Sections" className="sc-nav" style={css('position:absolute;left:18px;right:18px;bottom:calc(24px + env(safe-area-inset-bottom));z-index:12;display:flex;align-items:center;gap:12px')}>
              <div style={css('flex:1;height:64px;border-radius:24px;background:var(--sheet);backdrop-filter:blur(20px) saturate(1.4);border:1px solid var(--line);display:flex;align-items:center;padding:6px;gap:6px;box-shadow:0 12px 30px -14px rgba(0,0,0,.35)')}>
                {view.tabs.filter(t => !side || t.key !== 'map').map(t => <button key={t.key} onClick={t.onClick} aria-current={s.tab === t.key ? 'page' : undefined} style={css(`flex:1;height:52px;border-radius:19px;border:0;background:${t.bg};color:${t.fg};display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:800;cursor:pointer;transition:all .25s`)}><i className={`ph-fill ${t.icon}`} style={css('font-size:19px')} />{t.label}</button>)}
              </div>
            </nav>

            {side && <SideMap v={view} api={api} />}
            <EditSheet v={view} api={api} />
            <DestSheet v={view} api={api} />
            <DayPage v={view} />
            {s.building != null && <Building v={view} started={s.building} onDone={doneBuilding} />}
          </>}

          {s.toast && <div role="status" style={css('position:absolute;left:18px;right:18px;top:calc(56px + env(safe-area-inset-top));z-index:60;padding:12px 14px;border-radius:20px;background:var(--sheet);backdrop-filter:blur(20px);border:1px solid rgba(46,229,157,.35);color:var(--ink);font-size:13px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 20px 40px -16px rgba(0,0,0,.5)')} className="sc-toast"><div style={css('width:30px;height:30px;flex:none;border-radius:10px;background:var(--cta);color:var(--onCta);display:flex;align-items:center;justify-content:center;font-size:16px')}><i className="ph-fill ph-check" /></div><span style={css('flex:1;min-width:0')}>{s.toast}</span>{s.toastUndo && <button onClick={undoChange} style={css('flex:none;height:34px;padding:0 12px;border-radius:11px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer')}>{tx('Undo')}</button>}</div>}

          <SaveSheet open={s.sheet === 'save'} isSaved={!!s.savedId} defaultName={(s.savedId && trips.find(t => t.id === s.savedId)?.name) || defaultName(tripData(s))} onSave={saveTrip} onClose={() => set({ sheet: 'none' })} />
          <Welcome open={s.welcome} lang={s.lang} onLang={l => { if (l !== s.lang) view.switchLang(); }} onStart={() => { try { localStorage.setItem(WELCOMED, '1'); } catch { /* storage blocked */ } set({ welcome: false }); }}
            onQuick={() => { try { localStorage.setItem(WELCOMED, '1'); } catch { /* storage blocked */ } set({ welcome: false, quick: true, screen: 'onboard', step: 0, days: s.daysSet ? s.days : 5 }); }}
            onGuide={() => { try { localStorage.setItem(WELCOMED, '1'); } catch { /* storage blocked */ } set({ welcome: false, guide: true }); }}
            onWish={id => { try { localStorage.setItem(WELCOMED, '1'); } catch { /* storage blocked */ } view.wishOpts.find(o => o.key === id)?.onClick(); set({ welcome: false, step: s.screen === 'onboard' ? 1 : s.step }); }} />
          <SeasonGuide v={view.guide} open={s.guide} />
          <SignInSheet open={s.sheet === 'signin'} onGoogle={google} onClose={() => set({ sheet: 'none' })} />
          <TripsSheet open={s.sheet === 'trips'} trips={trips} user={user} currentId={s.savedId} onOpen={openTrip} onDelete={deleteTrip} onShare={t => shareTrip(t.data, t.name)} onNew={newTrip}
            onSignIn={google} onSignOut={() => signOut().then(() => set({ toast: tx('Signed out. Trips stay on this device.') }))} onFeedback={() => set({ sheet: 'feedback' })} onAbout={() => set({ sheet: 'none', welcome: true })} onGuide={view.guide.open} onClose={() => set({ sheet: 'none' })} />
          <FeedbackSheet open={s.sheet === 'feedback'} onSend={feedback} onClose={() => set({ sheet: 'none' })} />
          {s.screen === 'app' && <>
            <ShareSheet open={s.sheet === 'share'} onClose={() => set({ sheet: 'none' })} live={cloudEnabled && !!user} signedIn={!!user} cloud={cloudEnabled} following={!!view.trip.run.followId} busy={busy}
              onPlan={() => { set({ sheet: 'none' }); shareTrip(); }} onFamily={shareFamily} onStop={stopFamily} onCard={makeCard} onSignIn={google} />
            <SosSheet v={view} open={s.sheet === 'sos'} onClose={() => set({ sheet: 'none' })} />
            <ExpenseSheet v={view} open={s.sheet === 'expense'} onClose={() => set({ sheet: 'none' })} />
            <PeopleSheet v={view} open={s.sheet === 'people'} onClose={() => set({ sheet: 'none' })} />
          </>}
          <FoodSheet open={s.sheet === 'food'} target={s.foodFor} user={user} onGoogle={google} onClose={() => set({ sheet: 'none' })}
            onSend={tip => s.foodFor ? submitFoodTip({ ...tip, dest: s.foodFor.dest }, user?.name.split(' ')[0] || 'Traveller') : Promise.reject(new Error('No place'))} />
          <ReviewSheet open={s.sheet === 'review'} target={s.reviewFor} user={user} onGoogle={google} onClose={() => set({ sheet: 'none' })}
            onSend={(rating, comment) => { const r = s.reviewFor; if (!r) return Promise.reject(new Error('Nothing to rate'));
              return submitReview(r.kind, r.id, rating, comment, user?.name.split(' ')[0] || 'Traveller', r.date).then(() => markRated(ratedKey(r.kind, r.id))); }} />
        </main>
      </div>
    </div>
  );
}
