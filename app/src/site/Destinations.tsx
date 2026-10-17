// All destinations (filter by province or "in season now") and a guide page for each one.
import { planHref } from './Hero';
import { useState } from 'react';
import { A, Footer, Header, NotFound, usePage } from './Site';
import { DCard } from './Home';
import { PROVINCES, allCards, guide, nowMonth, type Province } from './data';
import { DESTS, MON } from '../engine/data';
import { dur } from '../engine/format';
import { GALLERY, MONTHLY, PLACE_PHOTOS, webPhoto } from '../photos';
import { MonthStrip } from './MonthStrip';
import { Slideshow } from './Slideshow';
import { IG_HANDLE } from '../contact';

export function DestinationList() {
  usePage('Destinations', `Guides to ${DESTS.length} places across Pakistan: Hunza, Skardu, Naran, Swat, Neelum, Chitral, Lahore, Karachi and more. Best months, places to see, food and how to get there.`);
  const [prov, setProv] = useState<Province | 'all'>('all'), [now, setNow] = useState(false), [q, setQ] = useState('');
  const cards = allCards().filter(c => (prov === 'all' || c.province === prov) && (!now || c.inSeason) && (!q || `${c.name} ${c.region}`.toLowerCase().includes(q.toLowerCase())));
  return <>
    <Header />
    <section className="band"><div className="site-wrap">
      <div className="kicker">Destinations</div>
      <h1>Where to go in Pakistan</h1>
      <p>{DESTS.length} places with a guide: the best months, what to see, what to eat and how long it takes to get there. Open one, then plan the trip in a tap.</p>
    </div></section>
    <section style={{ paddingBottom: 50 }}><div className="site-wrap">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 22 }}>
        <div className="chips">
          <button className="chip" aria-pressed={prov === 'all'} onClick={() => setProv('all')}>All</button>
          {PROVINCES.map(p => <button key={p} className="chip" aria-pressed={prov === p} onClick={() => setProv(p)}>{p}</button>)}
          <button className="chip" aria-pressed={now} onClick={() => setNow(!now)}><i className="ph-fill ph-calendar-check" />Good in {MON[nowMonth() - 1]}</button>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a place…" aria-label="Search destinations" style={{ marginLeft: 'auto', minWidth: 220, height: 40, borderRadius: 12, border: '1px solid var(--line2)', background: 'var(--card)', padding: '0 14px', font: 'inherit', fontSize: 15, color: 'var(--ink)' }} />
      </div>
      <div className="grid g4">{cards.map(c => <DCard key={c.id} c={c} />)}</div>
      {!cards.length && <p style={{ color: 'var(--mute)', fontSize: 17 }}>No places match. Try another province or month.</p>}
    </div></section>
    <Footer />
  </>;
}

export function Guide({ id }: { id: string }) {
  const known = DESTS.some(d => d.id === id);
  const g = known ? guide(id) : null;
  usePage(g ? `${g.name} travel guide` : 'Page not found', g ? `${g.name}, ${g.region}: ${g.when.toLowerCase()}. ${g.places.slice(0, 4).map(p => p.name).join(', ')} and more. How to get there, what to eat and a day-by-day plan.` : '');
  if (!g) return <NotFound />;
  const warnM = new Set(g.warn?.[0] || []), bestM = new Set(g.best);
  return <>
    <Header onPhoto />
    <section className="photo-band" style={{ backgroundImage: `url(${g.photo})`, backgroundPosition: 'center 22%' }}><div className="site-wrap">
      <A href="/destinations" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 15, opacity: .9 }}>← All destinations</A>
      <div className="kicker" style={{ color: '#FFD27A', marginTop: 18 }}>{g.region}</div>
      <h1 style={{ fontSize: 'clamp(40px,6vw,68px)', margin: '0 0 10px', lineHeight: 1.05 }}>{g.name}</h1>
      <p style={{ fontSize: 19, maxWidth: 700, margin: '0 0 22px' }}>{g.line}</p>
      <div className="hero-actions"><a href={planHref({ to: id })} className="btn btn-sun">Plan a trip to {g.name} <i className="ph-bold ph-arrow-right" /></a></div>
      {webPhoto(id) && <a href={webPhoto(id)!.page} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 14, color: '#fff', opacity: .8, fontSize: 12 }}>{webPhoto(id)!.credit}</a>}
    </div></section>

    <section className="sec"><div className="site-wrap guide">
      <div>
        {g.risk && <div className="note cor" style={{ marginBottom: 18 }}><i className="ph-fill ph-shield-warning" style={{ fontSize: 20, flex: 'none' }} /><span>{g.risk.text}</span></div>}
        {!g.checked && <div className="note amb" style={{ marginBottom: 18 }}><i className="ph-fill ph-info" style={{ fontSize: 20, flex: 'none' }} /><span>This guide is from our research and hasn’t been checked on the ground yet. Confirm roads and timings locally.</span></div>}

        <h2 style={{ fontSize: 30, margin: '0 0 12px' }}>When to go</h2>
        <div className="months" aria-label="Best months">{MON.map((mo, i) => <span key={mo} className={bestM.has(i + 1) ? 'on' : warnM.has(i + 1) ? 'warn' : ''}>{mo}</span>)}</div>
        <p style={{ fontSize: 16, color: 'var(--ink2)', lineHeight: 1.6 }}>{g.when}.{g.warn ? ` ${g.warn[1]}` : ''}</p>
        {g.highlights.length > 0 && <div style={{ display: 'grid', gap: 8, margin: '14px 0 0' }}>
          {g.highlights.map((h, i) => <div key={i} className={`note ${h.caution ? 'amb' : 'g'}`}><i className="ph-fill ph-calendar-check" style={{ flex: 'none', marginTop: 2 }} /><span><b>{h.when}:</b> {h.text}{h.caution ? `${/[.!?]$/.test(h.text) ? '' : '.'} ${h.caution}` : ''}</span></div>)}
        </div>}

        {(GALLERY[id] || []).length > 0 && <>
          <h2 style={{ fontSize: 30, margin: '40px 0 12px' }}>Photos</h2>
          <Slideshow photos={GALLERY[id]} />
        </>}
        {MONTHLY[id] && <div style={{ marginTop: 32 }}><MonthStrip {...MONTHLY[id]} /></div>}

        <h2 style={{ fontSize: 30, margin: '40px 0 6px' }}>Places to see</h2>
        <p style={{ color: 'var(--mute)', margin: '0 0 8px' }}>SafarCo fits these into your days in a sensible order, with the drive times between them.</p>
        <div className="places">
          {g.places.map(p => (
            <div key={p.name} className="place">
              {PLACE_PHOTOS[`${id}|${p.name}`] ? <img src={PLACE_PHOTOS[`${id}|${p.name}`]} alt={p.name} loading="lazy" style={{ flex: 'none', width: 96, height: 72, objectFit: 'cover', borderRadius: 12 }} /> : <span className="pin"><i className="ph-fill ph-map-pin" /></span>}
              <div>
                <b>{p.name}</b>
                <div className="meta">{[p.where, p.months && `Open ${p.months}`].filter(Boolean).join(' · ')}{p.href && <> · <a href={p.href} target="_blank" rel="noreferrer" style={{ color: 'var(--g)', fontWeight: 700 }}>Map</a></>}</div>
                {p.note && <p>{p.note}</p>}
              </div>
            </div>
          ))}
        </div>

        {g.food.length > 0 && <>
          <h2 style={{ fontSize: 30, margin: '40px 0 12px' }}>What to eat</h2>
          <div className="grid g2">{g.food.map(([dish, where, line]) => <div key={dish} className="fcard" style={{ padding: 18 }}><h3 style={{ fontSize: 18 }}>{dish}</h3><p style={{ fontSize: 15 }}>{[where, line].filter(Boolean).join(' · ')}</p></div>)}</div>
        </>}

        {g.hotels.length > 0 && <>
          <h2 style={{ fontSize: 30, margin: '40px 0 12px' }}>Where to stay</h2>
          <div className="places">{g.hotels.map(([name, tier, note]) => <div key={name} className="place"><span className="pin"><i className="ph-fill ph-bed" /></span><div><b>{name}</b><div className="meta">{tier}</div>{note && <p>{note}</p>}</div></div>)}</div>
        </>}
      </div>

      <aside>
        <div className="panel">
          <h3>At a glance</h3>
          <div className="facts">
            <div><span>Region</span><b>{g.region}</b></div>
            {g.ft != null && <div><span>Height</span><b>{g.ft.toLocaleString('en')} ft</b></div>}
            <div><span>Best time</span><b>{g.best.length ? g.when.replace(/^Best /, '') : 'All year'}</b></div>
            <div><span>Places in the guide</span><b>{g.places.length}</b></div>
          </div>
        </div>
        {(g.from.length > 0 || g.air) && <div className="panel">
          <h3>Getting there</h3>
          <div className="facts">
            {g.from.map(f => <div key={f.city}><span>From {f.city}</span><b>{f.km} km · {dur(f.hours)}</b></div>)}
            {g.air && <div><span>By air</span><b>{g.air}</b></div>}
          </div>
          {g.note && <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.5, margin: '12px 0 0' }}>{g.note}</p>}
        </div>}
        <div className="panel" style={{ background: '#0B5F7C', color: '#fff', border: 0 }}>
          <h3 style={{ color: '#fff' }}>Plan this trip</h3>
          <p style={{ margin: '0 0 14px', lineHeight: 1.5, opacity: .9 }}>Your city, days and budget, and SafarCo makes the plan: drives, stops, hotels, weather and cost.</p>
          <a href={planHref({ to: id })} className="btn btn-sun" style={{ width: '100%' }}>Plan a trip to {g.name}</a>
        </div>
      </aside>
    </div></section>
    <Footer />
  </>;
}
