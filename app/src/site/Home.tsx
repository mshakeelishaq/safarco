// The home page: who SafarCo is for, how it works, where's good now, and the app.
import { A, Footer, Header, usePage } from './Site';
import { bestNow, nowMonth } from './data';
import { seasonOf } from '../engine/seasons';
import { Hero, planHref, useTraveller } from './Hero';
import { TravellerFig } from '../components/TravellerFig';
import { TRAVELLERS, setTraveller } from '../traveller';

export function DCard({ c }: { c: ReturnType<typeof bestNow>[number] }) {
  const who = useTraveller();
  return <A href={c.href} className="dcard">
    <div className="ph" style={{ backgroundImage: `url(${c.photo})` }}><b>{c.name}</b>
      {/* On hover: a pin drops on the place and the visitor's traveller arrives. */}
      <span className="dc-pin" aria-hidden="true"><i className="ph-fill ph-map-pin" /></span>
      <span className="dc-fig" aria-hidden="true"><TravellerFig id={who} size={46} moving /></span>
    </div>
    <div className="tx">
      <span className="rg">{c.region}</span>
      {c.line && <span className="ln">{c.line}</span>}
      {c.risk ? <span className="risk"><i className="ph-fill ph-shield-warning" />{c.risk}</span> : <span className="wh"><i className="ph-fill ph-calendar-check" />{c.when}</span>}
    </div>
  </A>;
}

/** "Who's travelling?": the visitor's character on the site, and a head start in the planner. */
function ChooseTraveller() {
  const who = useTraveller();
  let chosen = false; try { chosen = !!localStorage.getItem('safarco-traveller'); } catch { /* storage blocked */ }
  return (
    <section className="sec traveller-sec">
      <div className="site-wrap">
        <div className="row-head reveal">
          <div><div className="kicker">Your travel style</div><h2>Who’s travelling?</h2><p className="sub">Pick your traveller. They’ll walk the site with you, and the planner starts set up for you.</p></div>
          <a href={planHref()} className="more">Plan as {TRAVELLERS.find(t => t.id === who)!.name.toLowerCase()} <i className="ph-bold ph-arrow-right" /></a>
        </div>
        <div className="grid g4 tv-grid" role="radiogroup" aria-label="Your traveller">
          {TRAVELLERS.map((t, k) => {
            const on = chosen ? who === t.id : false;
            // The fade-in sits on a wrapper: React redraws the card's own class when it's chosen.
            return <div key={t.id} className="reveal" style={{ transitionDelay: `${k * 70}ms`, display: 'flex' }}><button role="radio" aria-checked={on} className={`tv${on ? ' on' : ''}`} onClick={() => setTraveller(t.id)}>
              <span className="tv-fig"><TravellerFig id={t.id} size={84} moving={on} /></span>
              <b>{t.name}</b><span className="tv-line">{t.line}</span>
              <span className="tv-sets"><i className="ph-fill ph-sliders-horizontal" />{t.sets}</span>
              {on && <span className="tv-check"><i className="ph-fill ph-check-circle" /></span>}
            </button></div>;
          })}
        </div>
      </div>
    </section>
  );
}

const FEATURES: [string, string, string, string][] = [
  ['ph-clock', '#0B5F7C', 'Every day, hour by hour', 'When to leave, where to stop for tea and fuel, lunch near the right place, and arriving before dark.'],
  ['ph-wallet', '#9A5208', 'A budget that adds up', 'Fuel, tolls, hotels, meals, jeeps and car hire, with prices we check, for your group and your days.'],
  ['ph-cloud-sun', '#3B8DFF', 'Weather and road alerts', 'Forecasts along the route, passes that are closed, and warnings for long or risky days.'],
  ['ph-wifi-slash', '#6B3FA0', 'Works offline', 'Download the plan and map before you lose signal in the mountains.'],
  ['ph-users-three', '#C4005F', 'Family can follow', 'Share a link so family at home see each check-in and when you arrive. It isn’t live GPS tracking, so it works on weak mountain signal, saves battery and you choose what they see.'],
  ['ph-translate', '#006F8D', 'English and Roman Urdu', 'The whole planner works in both, and is built for travellers coming from abroad too.']
];

export function Home() {
  usePage('SafarCo', 'Plan your trip across Pakistan: the route, a day-by-day plan, a budget that adds up, weather and road alerts. Free, no sign-up.');
  const m = nowMonth(), season = seasonOf(m), picks = bestNow(6);
  return <>
    <Header onPhoto />
    <Hero />
    <ChooseTraveller />

    <section className="sec">
      <div className="site-wrap">
        <div className="row-head reveal">
          <div><div className="kicker">{season.label} in Pakistan</div><h2>Where’s best right now</h2><p className="sub">{season.blurb}</p></div>
          <A href="/destinations" className="more">All destinations <i className="ph-bold ph-arrow-right" /></A>
        </div>
        <div className="grid g3">{picks.map((c, k) => <div key={c.id} className="reveal" style={{ transitionDelay: `${(k % 3) * 80}ms` }}><DCard c={c} /></div>)}</div>
      </div>
    </section>

    <section className="sec sec-alt">
      <div className="site-wrap">
        <div className="reveal"><div className="kicker">How it works</div>
        <h2>A full plan in a minute</h2>
        <p className="sub">No forms to fill and nothing to sign up for. Change anything you like after.</p></div>
        {/* The route draws itself, Lahore to Hunza, as the section comes into view. */}
        <div className="route-wrap" aria-hidden="true">
        <svg className="route-draw reveal" viewBox="0 0 1000 120">
          <path className="rd-base" d="M30 92 C 180 92, 220 28, 360 40 S 560 104, 690 70 S 880 18, 970 30" />
          <path className="rd-line" pathLength={1} d="M30 92 C 180 92, 220 28, 360 40 S 560 104, 690 70 S 880 18, 970 30" />
          <circle cx="30" cy="92" r="9" className="rd-a" /><circle cx="970" cy="30" r="9" className="rd-b" />
        </svg>
        <div className="route-labels"><span style={{ left: '3%' }}>Lahore</span><span style={{ left: '69%' }}>Naran</span><span style={{ left: '97%' }}>Hunza</span></div>
        </div>
        <div className="grid g3">
          <div className="step reveal"><span className="n">1</span><div><h3>Say what you want to see</h3><p>Autumn colours, snow, lakes, the sea, food, or just a long drive. Or pick a place you already have in mind.</p></div></div>
          <div className="step reveal" style={{ transitionDelay: '120ms' }}><span className="n">2</span><div><h3>Your city, days and budget</h3><p>Coming from abroad? SafarCo starts you at the best airport and gives you a day to rest.</p></div></div>
          <div className="step reveal" style={{ transitionDelay: '240ms' }}><span className="n">3</span><div><h3>Get your trip, day by day</h3><p>The route and stops, places to see in a sensible order, hotels, food, weather and the full cost.</p></div></div>
        </div>
      </div>
    </section>

    <section className="sec">
      <div className="site-wrap">
        <div className="reveal"><div className="kicker">Why SafarCo</div>
        <h2>Everything a road trip needs</h2>
        <p className="sub">Built for Pakistan’s roads: mountain passes that close, long drives that need a night on the way, and places where the signal drops.</p></div>
        <div className="grid g3">
          {FEATURES.map(([icon, color, title, text], k) => <div key={title} className="fcard reveal" style={{ transitionDelay: `${(k % 3) * 80}ms` }}><i className={`ic ph-fill ${icon}`} style={{ background: color }} /><h3>{title}</h3><p>{text}</p></div>)}
        </div>
      </div>
    </section>

    <section className="sec" style={{ paddingTop: 0 }}>
      <div className="site-wrap">
        <div className="appband reveal">
          <div>
            <div className="kicker" style={{ color: '#FFD27A' }}>The SafarCo app</div>
            <h2>Take the plan with you</h2>
            <p>Add SafarCo to your phone’s home screen. It opens like an app, keeps your trips, and works without signal on the road.</p>
            <ul>
              <li><i className="ph-fill ph-check-circle" style={{ color: '#FFD27A' }} />Today’s drive, with where you are on the road</li>
              <li><i className="ph-fill ph-check-circle" style={{ color: '#FFD27A' }} />Offline maps and plan</li>
              <li><i className="ph-fill ph-check-circle" style={{ color: '#FFD27A' }} />Expenses and splitting costs with the group</li>
            </ul>
            <div className="hero-actions"><A href="/app" className="btn btn-sun">Get the app</A><a href={planHref()} className="btn btn-glass">Open in the browser</a></div>
          </div>
          <div className="phone home-phone"><div className="scr" style={{ backgroundImage: 'url(/photos/attabad-summer-cones.webp)', backgroundPosition: '60% center' }}>
            <div style={{ fontFamily: 'var(--fontH)', fontSize: 26, fontWeight: 700 }}>Where to next?</div>
            <div style={{ fontSize: 13, opacity: .9, margin: '6px 0 14px' }}>Your budget. Your days. Your perfect trip.</div>
            <div style={{ background: '#FFC75F', color: '#2A1A00', borderRadius: 14, padding: '12px 0', textAlign: 'center', fontWeight: 800, fontSize: 14 }}>Start planning →</div>
          </div></div>
        </div>
      </div>
    </section>
    <Footer />
  </>;
}
