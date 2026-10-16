// The home page: who SafarCo is for, how it works, where's good now, and the app.
import { A, Footer, Header, usePage } from './Site';
import { bestNow, nowMonth } from './data';
import { seasonOf } from '../engine/seasons';
import { DESTS } from '../engine/data';
import { IG_HANDLE } from '../contact';

const HERO: Record<string, string> = { autumn: '/photos/autumn-hunza.webp', winter: '/photos/snowfall.webp', spring: '/photos/blossom.webp', summer: '/photos/green-valley.webp' };

export const DCard = ({ c }: { c: ReturnType<typeof bestNow>[number] }) => (
  <A href={c.href} className="dcard">
    <div className="ph" style={{ backgroundImage: `url(${c.photo})` }}><b>{c.name}</b></div>
    <div className="tx">
      <span className="rg">{c.region}</span>
      {c.line && <span className="ln">{c.line}</span>}
      {c.risk ? <span className="risk"><i className="ph-fill ph-shield-warning" />{c.risk}</span> : <span className="wh"><i className="ph-fill ph-calendar-check" />{c.when}</span>}
    </div>
  </A>
);

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
    <section className="hero" style={{ backgroundImage: `url(${HERO[season.id]})` }}>
      <div className="site-wrap">
        <div className="kicker" style={{ color: '#FFD27A' }}>Pakistan trip planner</div>
        <h1>Your days. Your budget. Your perfect trip across Pakistan.</h1>
        <p className="lead">Tell SafarCo where you’re starting, how many days you have and what you want to see. Get the whole trip planned: the route, every stop, where to stay and what it will cost.</p>
        <div className="hero-actions">
          <a href="/plan?start=1" className="btn btn-sun">Start planning <i className="ph-bold ph-arrow-right" /></a>
          <a href="/plan?start=quick" className="btn btn-glass"><i className="ph-fill ph-magic-wand" />Plan it for me · 2 questions</a>
        </div>
        <div className="hero-trust"><span><i className="ph-fill ph-check-circle" />Free</span><span><i className="ph-fill ph-check-circle" />No sign-up</span><span><i className="ph-fill ph-check-circle" />{DESTS.length} destinations</span><span><i className="ph-fill ph-check-circle" />Works offline</span></div>
      </div>
      <div className="credit"><i className="ph-fill ph-instagram-logo" />{IG_HANDLE}</div>
    </section>

    <section className="sec">
      <div className="site-wrap">
        <div className="row-head">
          <div><div className="kicker">{season.label} in Pakistan</div><h2>Where’s best right now</h2><p className="sub">{season.blurb}</p></div>
          <A href="/destinations" className="more">All destinations <i className="ph-bold ph-arrow-right" /></A>
        </div>
        <div className="grid g3">{picks.map(c => <DCard key={c.id} c={c} />)}</div>
      </div>
    </section>

    <section className="sec sec-alt">
      <div className="site-wrap">
        <div className="kicker">How it works</div>
        <h2>A full plan in a minute</h2>
        <p className="sub">No forms to fill and nothing to sign up for. Change anything you like after.</p>
        <div className="grid g3">
          <div className="step"><span className="n">1</span><div><h3>Say what you want to see</h3><p>Autumn colours, snow, lakes, the sea, food, or just a long drive. Or pick a place you already have in mind.</p></div></div>
          <div className="step"><span className="n">2</span><div><h3>Your city, days and budget</h3><p>Coming from abroad? SafarCo starts you at the best airport and gives you a day to rest.</p></div></div>
          <div className="step"><span className="n">3</span><div><h3>Get your trip, day by day</h3><p>The route and stops, places to see in a sensible order, hotels, food, weather and the full cost.</p></div></div>
        </div>
      </div>
    </section>

    <section className="sec">
      <div className="site-wrap">
        <div className="kicker">Why SafarCo</div>
        <h2>Everything a road trip needs</h2>
        <p className="sub">Built for Pakistan’s roads: mountain passes that close, long drives that need a night on the way, and places where the signal drops.</p>
        <div className="grid g3">
          {FEATURES.map(([icon, color, title, text]) => <div key={title} className="fcard"><i className={`ic ph-fill ${icon}`} style={{ background: color }} /><h3>{title}</h3><p>{text}</p></div>)}
        </div>
      </div>
    </section>

    <section className="sec" style={{ paddingTop: 0 }}>
      <div className="site-wrap">
        <div className="appband">
          <div>
            <div className="kicker" style={{ color: '#FFD27A' }}>The SafarCo app</div>
            <h2>Take the plan with you</h2>
            <p>Add SafarCo to your phone’s home screen. It opens like an app, keeps your trips, and works without signal on the road.</p>
            <ul>
              <li><i className="ph-fill ph-check-circle" style={{ color: '#FFD27A' }} />Today’s drive, with where you are on the road</li>
              <li><i className="ph-fill ph-check-circle" style={{ color: '#FFD27A' }} />Offline maps and plan</li>
              <li><i className="ph-fill ph-check-circle" style={{ color: '#FFD27A' }} />Expenses and splitting costs with the group</li>
            </ul>
            <div className="hero-actions"><A href="/app" className="btn btn-sun">Get the app</A><a href="/plan?start=1" className="btn btn-glass">Open in the browser</a></div>
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
