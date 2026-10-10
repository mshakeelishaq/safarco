// /admin: edit the price list and road alerts, and read feedback.
// Only emails listed in the Supabase "admins" table can save (enforced by the database).
import { useEffect, useState } from 'react';
import { cloudEnabled, currentUser, isAdmin, listFeedback, loadPriceList, onUserChange, savePriceList, signInWithGoogle, signOut, type FeedbackRow, type User } from '../cloud';
import { AIRPORTS } from '../engine/data';
import { css } from '../lib/css';
import { DEFAULT_PRICES, SECTIONS, applyPrices, jeepTrips, tollRoads, type PriceList, type Section } from '../prices';

const today = () => new Date().toISOString().slice(0, 10);
const box = css('border-radius:20px;padding:18px;background:var(--card);border:1px solid var(--line);margin-top:16px');
const field = css('width:120px;box-sizing:border-box;height:40px;border-radius:12px;border:1px solid var(--line2);background:var(--fill);padding:0 10px;font-size:15px;font-weight:700;color:var(--ink);text-align:right');
const btn = (p: boolean) => css(`height:44px;padding:0 16px;border-radius:14px;border:${p ? '0' : '1px solid var(--line2)'};background:${p ? 'var(--cta)' : 'var(--fill)'};color:${p ? 'var(--onCta)' : 'var(--ink)'};font-size:14px;font-weight:800;cursor:pointer`);

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label style={css('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px;font-weight:600')}>
      <span>{label}</span>
      <input type="number" min={0} step="any" value={Number.isFinite(value) ? value : ''} onChange={e => onChange(e.target.value === '' ? NaN : +e.target.value)} style={field} />
    </label>
  );
}

function Checked({ list, k, set }: { list: PriceList; k: Section; set: (l: PriceList) => void }) {
  const v = list.checked[k];
  return (
    <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 10px;font-size:13px;font-weight:600;color:var(--mute)')}>
      <span>Checked on</span>
      <input type="date" value={v} onChange={e => set({ ...list, checked: { ...list.checked, [k]: e.target.value } })} style={css('height:36px;border-radius:10px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);padding:0 8px')} />
      <button onClick={() => set({ ...list, checked: { ...list.checked, [k]: today() } })} style={css('height:36px;padding:0 12px;border-radius:10px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-weight:700;cursor:pointer')}>Today</button>
      <span>· Source: {SECTIONS[k].source}</span>
    </div>
  );
}

export function Admin() {
  const [user, setUser] = useState<User | null>(null), [admin, setAdmin] = useState<boolean | null>(null);
  const [list, setList] = useState<PriceList | null>(null), [status, setStatus] = useState(''), [fb, setFb] = useState<FeedbackRow[]>([]);

  useEffect(() => { currentUser().then(setUser); return onUserChange(setUser); }, []);
  useEffect(() => {
    if (!user) { setAdmin(null); return; }
    isAdmin().then(setAdmin);
    loadPriceList().then(v => setList(JSON.parse(JSON.stringify(applyPrices(v))))).catch(() => setList(JSON.parse(JSON.stringify(DEFAULT_PRICES))));
    listFeedback().then(setFb).catch(() => {});
  }, [user?.id]);

  const save = async () => {
    if (!list) return;
    const bad = JSON.stringify(list).includes('null');
    if (bad) { setStatus('Some boxes are empty. Fill them in before saving.'); return; }
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

    <section style={box}><h2 style={css('margin:0 0 4px;font-size:18px')}>Road alerts</h2>
      <p style={css('font-size:13px;color:var(--mute);margin:4px 0 10px')}>Shown at the top of every trip’s “Dates &amp; season” card until the “Show until” date. Example: “Babusar Pass closed: snow, reopening expected 10 June”.</p>
      {list.alerts.map((a, i) => (
        <div key={i} style={css('display:grid;gap:8px;padding:10px 0;border-bottom:1px solid var(--line)')}>
          <input placeholder="Title" value={a.title} onChange={e => upd(l => { l.alerts[i].title = e.target.value; })} style={{ ...field, width: '100%', textAlign: 'left' }} />
          <input placeholder="Details (optional)" value={a.message} onChange={e => upd(l => { l.alerts[i].message = e.target.value; })} style={{ ...field, width: '100%', textAlign: 'left' }} />
          <div style={css('display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;font-weight:600;color:var(--mute)')}>
            Posted <input type="date" value={a.date} onChange={e => upd(l => { l.alerts[i].date = e.target.value; })} />
            Show until <input type="date" value={a.until || ''} onChange={e => upd(l => { l.alerts[i].until = e.target.value || undefined; })} />
            <button onClick={() => upd(l => { l.alerts.splice(i, 1); })} style={btn(false)}>Remove</button>
          </div>
        </div>
      ))}
      <button onClick={() => upd(l => { l.alerts.push({ title: '', message: '', date: today() }); })} style={{ ...btn(false), marginTop: 10 }}>+ Add alert</button>
    </section>

    <div style={css('position:sticky;bottom:0;padding:14px 0;background:var(--bg);display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:16px;border-top:1px solid var(--line)')}>
      <button onClick={save} style={btn(true)}>Save price list</button>
      <span role="status" style={css('font-size:14px;font-weight:600')}>{status}</span>
    </div>

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
