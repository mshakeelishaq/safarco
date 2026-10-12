// /admin: edit the price list, trusted hotels and drivers, and road alerts, and read feedback.
// Only emails listed in the Supabase "admins" table can save (enforced by the database).
import { useEffect, useState } from 'react';
import { cloudEnabled, currentUser, deleteReview, isAdmin, listAllReviews, listFeedback, loadPriceList, onUserChange, savePriceList, setReviewStatus, signInWithGoogle, signOut, type FeedbackRow, type Review, type User } from '../cloud';
import { AIRPORTS, DESTS } from '../engine/data';
import { highlightsOf, monthsLabel } from '../engine/seasons';
import { css } from '../lib/css';
import { RESEARCHED_ON, withResearched } from '../researched';
import { AREAS, areaOf, waLink } from '../local';
import { DEFAULT_PRICES, FRESH_DAYS, SECTIONS, applyPrices, jeepTrips, rid, tollRoads, type PriceList, type Section } from '../prices';

const today = () => new Date().toISOString().slice(0, 10);
const box = css('border-radius:20px;padding:18px;background:var(--card);border:1px solid var(--line);margin-top:16px');
const field = css('width:120px;box-sizing:border-box;height:40px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);padding:0 10px;font-size:15px;font-weight:700;color:var(--ink);text-align:right');
const btn = (p: boolean) => css(`height:44px;padding:0 16px;border-radius:14px;border:${p ? '0' : '1px solid var(--line2)'};background:${p ? 'var(--cta)' : 'var(--fill)'};color:${p ? 'var(--onCta)' : 'var(--ink)'};font-size:14px;font-weight:800;cursor:pointer`);

const text = css('width:100%;box-sizing:border-box;height:40px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);padding:0 10px;font-size:15px;font-weight:600;color:var(--ink)');
const lbl = css('display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:var(--mute)');
const row2 = css('display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px');

/** Pick a destination, town or pass. */
function AreaSelect({ value, onChange, placeholder }: { value: string; onChange: (id: string) => void; placeholder: string }) {
  const groups = ['Destinations', 'Towns', 'Passes'] as const;
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={text}>
      <option value="">{placeholder}</option>
      {groups.map(g => <optgroup key={g} label={g}>{AREAS.filter(a => a.group === g).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>)}
    </select>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label style={css('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px;font-weight:600')}>
      <span>{label}</span>
      <input type="number" min={0} step="any" value={Number.isFinite(value) ? value : ''} onChange={e => onChange(e.target.value === '' ? NaN : +e.target.value)} style={field} />
    </label>
  );
}

const ageOf = (d: string) => Math.floor((Date.now() - +new Date(d + 'T00:00')) / 864e5);
/** True when a section was never checked or is older than it usually stays right. */
const due = (list: PriceList, k: Section) => { const d = list.checked[k]; return !d || isNaN(+new Date(d + 'T00:00')) || ageOf(d) > FRESH_DAYS[k]; };

function Checked({ list, k, set }: { list: PriceList; k: Section; set: (l: PriceList) => void }) {
  const v = list.checked[k];
  return (
    <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 10px;font-size:13px;font-weight:600;color:var(--mute)')}>
      <span>Checked on</span>
      <input type="date" value={v} onChange={e => set({ ...list, checked: { ...list.checked, [k]: e.target.value } })} style={css('height:36px;border-radius:10px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);padding:0 8px')} />
      <button onClick={() => set({ ...list, checked: { ...list.checked, [k]: today() } })} style={css('height:36px;padding:0 12px;border-radius:10px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-weight:700;cursor:pointer')}>Today</button>
      <span>· Source: {SECTIONS[k].source}</span>
      {due(list, k) && <span style={css('color:var(--cor);font-weight:800')}>· Needs checking ({v ? `last checked ${ageOf(v)} days ago, ` : ''}check every {FRESH_DAYS[k]} days)</span>}
    </div>
  );
}

export function Admin() {
  const [user, setUser] = useState<User | null>(null), [admin, setAdmin] = useState<boolean | null>(null);
  const [list, setList] = useState<PriceList | null>(null), [status, setStatus] = useState(''), [fb, setFb] = useState<FeedbackRow[]>([]);
  const [reviews, setRv] = useState<Review[] | null>(null), [rvErr, setRvErr] = useState('');

  useEffect(() => { currentUser().then(setUser); return onUserChange(setUser); }, []);
  useEffect(() => {
    if (!user) { setAdmin(null); return; }
    isAdmin().then(setAdmin);
    loadPriceList().then(v => setList(JSON.parse(JSON.stringify(applyPrices(v))))).catch(() => setList(JSON.parse(JSON.stringify(DEFAULT_PRICES))));
    listFeedback().then(setFb).catch(() => {});
    listAllReviews().then(setRv).catch(() => setRvErr('Reviews aren’t set up yet: run supabase/reviews.sql in Supabase (see SETUP.md).'));
  }, [user?.id]);

  const save = async () => {
    if (!list) return;
    const bad = JSON.stringify(list).includes('null');
    if (bad) { setStatus('Some boxes are empty. Fill them in before saving.'); return; }
    const half = [...list.hotels.map(h => ['Hotel', h.name, h.area]), ...list.drivers.map(x => ['Driver', x.name, x.area])].find(([, n, a]) => !n.trim() || !a);
    if (half) { setStatus(`${half[0]} “${half[1] || 'without a name'}” needs a name and a place.`); return; }
    setStatus('Saving…');
    try { await savePriceList(list); applyPrices(list); setStatus('Saved. Visitors get the new prices next time they open SafarCo.'); }
    catch (e) { setStatus('Couldn’t save: ' + ((e as Error).message || 'unknown error')); }
  };

  const wrap = (body: React.ReactNode) => (
    <div data-sc="1" data-theme="paper" style={css('min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--font)')}>
      <main style={css('max-width:760px;margin:0 auto;padding:28px 18px 80px')}>
        <a href="/" style={css('font-weight:700;text-decoration:none')}>← Back to SafarCo</a>
        <h1 style={css('font-family:var(--fontH);font-size:28px;margin:16px 0 4px')}>SafarCo admin</h1>
        {body}
      </main>
    </div>
  );

  if (!cloudEnabled) return wrap(<p>Supabase isn’t connected yet. Follow step 5 in SETUP.md, then come back.</p>);
  if (!user) return wrap(<><p>Sign in with the Google account listed as an admin.</p><button onClick={() => signInWithGoogle('/admin')} style={btn(true)}>Continue with Google</button></>);
  if (admin === null || !list) return wrap(<p>Loading…</p>);
  if (!admin) return wrap(<><p>{user.email} isn’t an admin. Add this email to the <b>admins</b> table in Supabase (see SETUP.md), then reload.</p><button onClick={() => signOut()} style={btn(false)}>Sign out</button></>);

  const upd = (f: (l: PriceList) => void) => { const c: PriceList = JSON.parse(JSON.stringify(list)); f(c); setList(c); setStatus(''); };
  const fareAirports = Object.keys(AIRPORTS);

  return wrap(<>
    <p style={css('color:var(--mute);margin:0')}>Signed in as {user.email} · <button onClick={() => signOut()} style={css('border:0;background:none;color:var(--g);font-weight:700;cursor:pointer;padding:0')}>Sign out</button></p>
    <p style={css('font-size:14px;line-height:1.55')}>Update a section when you check its prices, and set <b>Checked on</b> to that day. All prices are in PKR. Visitors see the checked date next to each price.</p>
    {(() => { const late = (Object.keys(SECTIONS) as Section[]).filter(k => due(list, k)); return late.length
      ? <p role="status" style={css('margin:12px 0 0;padding:12px 14px;border-radius:14px;background:var(--fill);border:1px solid var(--cor);font-size:14px;font-weight:700;line-height:1.5')}>Needs checking: {late.map(k => SECTIONS[k].label).join(', ')}. Visitors see these as “not checked yet” or “may have changed”.</p>
      : <p role="status" style={css('margin:12px 0 0;font-size:14px;font-weight:700;color:var(--g)')}>All prices are up to date.</p>; })()}
    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Prices researched online</h2>
      <p style={css('font-size:14px;line-height:1.55;margin:4px 0 10px')}>Fills in fuel, tolls, hotels, hire and coach fares found online on {new Date(RESEARCHED_ON + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (OGRA and NHA notices, operator websites and booking sites), and marks those sections checked on that day. Flights and most jeep trips had no recent source, so they stay as they are. Look over the figures, then tap <b>Save price list</b>.</p>
      <button onClick={() => { setList(withResearched(list)); setStatus('Filled in. Review, then tap Save price list.'); }} style={btn(false)}>Fill in researched prices</button>
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Fuel (per litre)</h2><Checked list={list} k="fuel" set={setList} />
      <Num label="Petrol" value={list.fuel.petrol} onChange={n => upd(l => { l.fuel.petrol = n; })} />
      <Num label="High-speed diesel" value={list.fuel.diesel} onChange={n => upd(l => { l.fuel.diesel = n; })} />
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Motorway tolls (car, one way)</h2><Checked list={list} k="tolls" set={setList} />
      {tollRoads().map(r => <Num key={r.key} label={r.label} value={list.tolls[r.key]} onChange={n => upd(l => { l.tolls[r.key] = n; })} />)}
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Hotels and meals (typical, per room per night and per adult per day)</h2><Checked list={list} k="stays" set={setList} />
      {(['backpacker', 'standard', 'premium'] as const).map(t => <div key={t}>
        <Num label={`${t[0].toUpperCase() + t.slice(1)}: room per night`} value={list.stays[t].night} onChange={n => upd(l => { l.stays[t].night = n; })} />
        <Num label={`${t[0].toUpperCase() + t.slice(1)}: meals per adult per day`} value={list.stays[t].meal} onChange={n => upd(l => { l.stays[t].meal = n; })} />
      </div>)}
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Hire (per day)</h2><Checked list={list} k="hire" set={setList} />
      {([['rentcar', 'Car (Corolla / City)'], ['rentcarDriver', 'Car driver allowance'], ['rent4x4', '4x4 (Prado / Land Cruiser)'], ['rent4x4Driver', '4x4 driver allowance'], ['coaster', 'Coaster (22 seats)'], ['coasterDriver', 'Coaster driver allowance'], ['carAtDestination', 'Car + driver at the destination (fly-in trips, fuel included)']] as const)
        .map(([k, label]) => <Num key={k} label={label} value={list.hire[k]} onChange={n => upd(l => { l.hire[k] = n; })} />)}
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Coach fares (per km, per adult)</h2><Checked list={list} k="coach" set={setList} />
      <Num label="Plains and motorways" value={list.coach.perKmFlat} onChange={n => upd(l => { l.coach.perKmFlat = n; })} />
      <Num label="Mountain roads" value={list.coach.perKmMountain} onChange={n => upd(l => { l.coach.perKmMountain = n; })} />
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Flights (one way, per adult)</h2><Checked list={list} k="fares" set={setList} />
      {Object.entries(list.fares).flatMap(([dest, f]) => fareAirports.filter(a => f[a] !== undefined).map(a => <Num key={dest + a} label={`${AIRPORTS[a][0]} → ${dest}`} value={f[a]} onChange={n => upd(l => { l.fares[dest][a] = n; })} />))}
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Local jeeps (per jeep, return)</h2><Checked list={list} k="jeeps" set={setList} />
      {jeepTrips().map(j => <Num key={j.key} label={j.label} value={list.jeeps[j.key]} onChange={n => upd(l => { l.jeeps[j.key] = n; })} />)}
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Trusted hotels</h2>
      <p style={css('font-size:13px;color:var(--mute);margin:4px 0 10px')}>Hotels you vouch for. They show first, marked “Recommended by SafarCo”, on every night spent in that place, with a WhatsApp button. Ask the owner before you publish their number.</p>
      {list.hotels.map((h, i) => (
        <div key={h.id} style={css(`display:grid;gap:8px;padding:12px 0;border-bottom:1px solid var(--line);opacity:${h.active ? 1 : .55}`)}>
          <div style={row2}>
            <label style={lbl}>Name<input value={h.name} onChange={e => upd(l => { l.hotels[i].name = e.target.value; })} style={text} /></label>
            <label style={lbl}>Place<AreaSelect value={h.area} placeholder="Choose a place" onChange={id => upd(l => { l.hotels[i].area = id; })} /></label>
          </div>
          <div style={row2}>
            <label style={lbl}>Level<select value={h.tier} onChange={e => upd(l => { l.hotels[i].tier = e.target.value as typeof h.tier; })} style={text}><option value="backpacker">Backpacker</option><option value="standard">Standard</option><option value="premium">Premium</option></select></label>
            <label style={lbl}>Price a night (PKR)<input type="number" min={0} value={h.price || ''} onChange={e => upd(l => { l.hotels[i].price = +e.target.value || 0; })} style={text} /></label>
            <label style={lbl}>WhatsApp / phone<input inputMode="tel" placeholder="0300 1234567" value={h.phone} onChange={e => upd(l => { l.hotels[i].phone = e.target.value; })} style={text} /></label>
          </div>
          <label style={lbl}>Note (optional)<input placeholder="Heated rooms, parking, family-friendly" value={h.note} onChange={e => upd(l => { l.hotels[i].note = e.target.value; })} style={text} /></label>
          <div style={css('display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;font-weight:600;color:var(--mute)')}>
            Price checked <input type="date" value={h.checked} onChange={e => upd(l => { l.hotels[i].checked = e.target.value; })} />
            <button onClick={() => upd(l => { l.hotels[i].checked = today(); })} style={btn(false)}>Today</button>
            <label style={css('display:flex;gap:6px;align-items:center')}><input type="checkbox" checked={h.active} onChange={e => upd(l => { l.hotels[i].active = e.target.checked; })} />Show in app</label>
            {h.phone && !waLink(h.phone) && <span style={css('color:var(--cor)')}>Check the number</span>}
            <button onClick={() => upd(l => { l.hotels.splice(i, 1); })} style={btn(false)}>Delete</button>
          </div>
        </div>
      ))}
      <button onClick={() => upd(l => { l.hotels.push({ id: rid(), name: '', area: '', tier: 'standard', price: 0, phone: '', note: '', checked: today(), active: true }); })} style={{ ...btn(false), marginTop: 10 }}>+ Add hotel</button>
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Trusted drivers and jeeps</h2>
      <p style={css('font-size:13px;color:var(--mute);margin:4px 0 10px')}>Drivers you vouch for. They show on every trip that passes their place, with Call and WhatsApp buttons. Ask each driver before you publish their number.</p>
      {list.drivers.map((x, i) => (
        <div key={x.id} style={css(`display:grid;gap:8px;padding:12px 0;border-bottom:1px solid var(--line);opacity:${x.active ? 1 : .55}`)}>
          <div style={row2}>
            <label style={lbl}>Name<input value={x.name} onChange={e => upd(l => { l.drivers[i].name = e.target.value; })} style={text} /></label>
            <label style={lbl}>Where they work<AreaSelect value={x.area} placeholder="Choose a place" onChange={id => upd(l => { l.drivers[i].area = id; })} /></label>
          </div>
          <div style={row2}>
            <label style={lbl}>Vehicle<input list="vehicles" placeholder="Jeep" value={x.vehicle} onChange={e => upd(l => { l.drivers[i].vehicle = e.target.value; })} style={text} /></label>
            <label style={lbl}>Seats<input type="number" min={0} value={x.seats || ''} onChange={e => upd(l => { l.drivers[i].seats = +e.target.value || 0; })} style={text} /></label>
            <label style={lbl}>Usual rate (PKR)<input type="number" min={0} value={x.rate || ''} onChange={e => upd(l => { l.drivers[i].rate = +e.target.value || 0; })} style={text} /></label>
            <label style={lbl}>WhatsApp / phone<input inputMode="tel" placeholder="0300 1234567" value={x.phone} onChange={e => upd(l => { l.drivers[i].phone = e.target.value; })} style={text} /></label>
          </div>
          <label style={lbl}>Note (optional)<input placeholder="Raikot Bridge to Tato, return. Speaks English." value={x.note} onChange={e => upd(l => { l.drivers[i].note = e.target.value; })} style={text} /></label>
          <div style={css('display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;font-weight:600;color:var(--mute)')}>
            Rate checked <input type="date" value={x.checked} onChange={e => upd(l => { l.drivers[i].checked = e.target.value; })} />
            <button onClick={() => upd(l => { l.drivers[i].checked = today(); })} style={btn(false)}>Today</button>
            <label style={css('display:flex;gap:6px;align-items:center')}><input type="checkbox" checked={x.active} onChange={e => upd(l => { l.drivers[i].active = e.target.checked; })} />Show in app</label>
            {x.phone && !waLink(x.phone) && <span style={css('color:var(--cor)')}>Check the number</span>}
            <button onClick={() => upd(l => { l.drivers.splice(i, 1); })} style={btn(false)}>Delete</button>
          </div>
        </div>
      ))}
      <datalist id="vehicles"><option value="Jeep" /><option value="Land Cruiser" /><option value="Prado" /><option value="Car" /><option value="Coaster" /><option value="Hiace" /></datalist>
      <button onClick={() => upd(l => { l.drivers.push({ id: rid(), name: '', area: '', vehicle: 'Jeep', seats: 0, rate: 0, phone: '', note: '', checked: today(), active: true }); })} style={{ ...btn(false), marginTop: 10 }}>+ Add driver</button>
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Season guide notes</h2>
      <p style={css('font-size:13px;color:var(--mute);margin:4px 0 10px')}>Add a short update for a place and it shows in the season guide and on trips there, e.g. “Cherry blossom came early this year: go in the first week of April”. Leave empty for none.</p>
      {DESTS.map(d => (
        <label key={d.id} style={lbl}>
          <span><b style={css('color:var(--ink)')}>{d.name}</b> · {highlightsOf(d.id).map(h => `${monthsLabel(h.months)}: ${h.text}`).join(' · ') || 'no season highlights'}</span>
          <input value={list.seasonNotes[d.id] || ''} maxLength={200} placeholder="No update" onChange={e => upd(l => { if (e.target.value) l.seasonNotes[d.id] = e.target.value; else delete l.seasonNotes[d.id]; })} style={{ ...text, marginBottom: 10 }} />
        </label>
      ))}
    </section>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Road alerts</h2>
      <p style={css('font-size:13px;color:var(--mute);margin:4px 0 10px')}>Shown on trips until the “Show until” date. Choose the places it affects (for example Babusar Top) and it only shows on trips that pass them; with no places it shows on every trip. Example: “Babusar Pass closed: snow, reopening expected 10 June”.</p>
      {list.alerts.map((a, i) => (
        <div key={i} style={css('display:grid;gap:8px;padding:10px 0;border-bottom:1px solid var(--line)')}>
          <input placeholder="Title" value={a.title} onChange={e => upd(l => { l.alerts[i].title = e.target.value; })} style={{ ...field, width: '100%', textAlign: 'left' }} />
          <input placeholder="Details (optional)" value={a.message} onChange={e => upd(l => { l.alerts[i].message = e.target.value; })} style={{ ...field, width: '100%', textAlign: 'left' }} />
          <div style={css('display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;font-weight:600;color:var(--mute)')}>
            Posted <input type="date" value={a.date} onChange={e => upd(l => { l.alerts[i].date = e.target.value; })} />
            Show until <input type="date" value={a.until || ''} onChange={e => upd(l => { l.alerts[i].until = e.target.value || undefined; })} />
            <button onClick={() => upd(l => { l.alerts.splice(i, 1); })} style={btn(false)}>Remove</button>
          </div>
          <div style={css('display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:13px;font-weight:600;color:var(--mute)')}>
            Places: {(a.areas || []).length === 0 && <span>every trip</span>}
            {(a.areas || []).map(id => <button key={id} onClick={() => upd(l => { l.alerts[i].areas = (l.alerts[i].areas || []).filter(x => x !== id); })} style={css('height:32px;padding:0 10px;border-radius:10px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-weight:700;cursor:pointer')}>{areaOf(id)?.name || id} ✕</button>)}
            <div style={css('min-width:180px')}><AreaSelect value="" placeholder="+ Add a place" onChange={id => id && upd(l => { const cur = l.alerts[i].areas || []; if (!cur.includes(id)) l.alerts[i].areas = [...cur, id]; })} /></div>
          </div>
        </div>
      ))}
      <button onClick={() => upd(l => { l.alerts.push({ title: '', message: '', date: today(), areas: [] }); })} style={{ ...btn(false), marginTop: 10 }}>+ Add alert</button>
    </section>

    <div style={css('position:sticky;bottom:0;padding:14px 0;background:var(--bg);display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:16px;border-top:1px solid var(--line)')}>
      <button onClick={save} style={btn(true)}>Save price list</button>
      <span role="status" style={css('font-size:14px;font-weight:600')}>{status}</span>
    </div>

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Reviews of hotels and drivers{reviews ? ` (${reviews.filter(r => r.status === 'pending').length} waiting)` : ''}</h2>
      <p style={css('font-size:13px;color:var(--mute);margin:4px 0 10px')}>Travellers’ reviews show in the app only after you approve them. Hide anything rude, fake or with personal details.</p>
      {rvErr && <p style={css('font-size:13px;font-weight:700;color:var(--cor);margin:0')}>{rvErr}</p>}
      {reviews && !reviews.length && <p style={css('color:var(--mute);margin:0')}>No reviews yet.</p>}
      {(reviews || []).slice().sort((a, b) => +(b.status === 'pending') - +(a.status === 'pending')).map(r => {
        const item = r.item_kind === 'hotel' ? list.hotels.find(h => h.id === r.item_id) : list.drivers.find(x => x.id === r.item_id);
        const act = (f: () => Promise<void>, next: Review[]) => f().then(() => setRv(next)).catch(e => setStatus('Couldn’t update the review: ' + ((e as Error).message || 'unknown error')));
        return (
          <div key={r.id} style={css(`padding:10px 0;border-bottom:1px solid var(--line);opacity:${r.status === 'hidden' ? .55 : 1}`)}>
            <div style={css('display:flex;gap:8px;align-items:baseline;flex-wrap:wrap')}>
              <b>{item?.name || '(deleted ' + r.item_kind + ')'}</b>
              <span style={css('color:#F2A007;font-weight:800')}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <span style={css(`font-size:12px;font-weight:800;color:${r.status === 'approved' ? 'var(--g)' : r.status === 'pending' ? 'var(--amb2)' : 'var(--mute)'}`)}>{r.status === 'pending' ? 'Waiting' : r.status === 'approved' ? 'Shown' : 'Hidden'}</span>
            </div>
            {r.comment && <div style={css('font-size:14px;margin-top:4px;line-height:1.45;white-space:pre-wrap')}>{r.comment}</div>}
            <div style={css('font-size:12px;color:var(--mute);margin-top:4px')}>{r.author || 'Traveller'}{r.stayed_on ? ` · stayed ${new Date(r.stayed_on + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''} · written {new Date(r.created_at).toLocaleString('en-GB')}{r.stayed_on && r.created_at.slice(0, 10) < r.stayed_on ? ' · written before the stay!' : ''}</div>
            <div style={css('display:flex;gap:8px;margin-top:8px;flex-wrap:wrap')}>
              {r.status !== 'approved' && <button onClick={() => act(() => setReviewStatus(r.id, 'approved'), (reviews || []).map(x => x.id === r.id ? { ...x, status: 'approved' } : x))} style={btn(true)}>Approve</button>}
              {r.status !== 'hidden' && <button onClick={() => act(() => setReviewStatus(r.id, 'hidden'), (reviews || []).map(x => x.id === r.id ? { ...x, status: 'hidden' } : x))} style={btn(false)}>Hide</button>}
              <button onClick={() => { if (confirm('Delete this review for good?')) act(() => deleteReview(r.id), (reviews || []).filter(x => x.id !== r.id)); }} style={btn(false)}>Delete</button>
            </div>
          </div>
        );
      })}
    </section>

    <section style={box}><h2 style={css('margin:0 0 10px;font-size:18px')}>Feedback ({fb.length})</h2>
      {!fb.length && <p style={css('color:var(--mute);margin:0')}>No feedback yet.</p>}
      {fb.map(f => (
        <div key={f.id} style={css('padding:10px 0;border-bottom:1px solid var(--line)')}>
          <div style={css('font-size:12px;color:var(--mute);font-weight:600')}>{new Date(f.created_at).toLocaleString('en-GB')}{f.contact ? ` · ${f.contact}` : ''}{f.page ? ` · ${f.page}` : ''}</div>
          <div style={css('font-size:14px;margin-top:4px;white-space:pre-wrap')}>{f.message}</div>
        </div>
      ))}
    </section>
  </>);
}
