// About SafarCo: why it exists, how plans are made, and what it promises travellers.
import { planHref } from './Hero';
import { A, Footer, Header, usePage } from './Site';
import { IG_HANDLE, IG_PROFILE } from '../contact';

const VALUES: [string, string, string][] = [
  ['ph-hand-heart', 'Free for travellers', 'Planning a trip shouldn’t cost anything. No sign-up, no ads, and we never sell your data.'],
  ['ph-shield-check', 'Honest about the road', 'We say when a day is long, when a pass is closed, and when an area needs care. Safety comes before a pretty plan.'],
  ['ph-sliders-horizontal', 'You stay in charge', 'SafarCo suggests; you decide. Every stop, day, hotel and time can be changed.'],
  ['ph-seal-check', 'Checked, and clear when it isn’t', 'Prices and guides show when they were last checked. Places from research are marked until someone has been.']
];

export function About() {
  usePage('About us', 'SafarCo is a free trip planner for Pakistan. Why we built it, how plans are made, and what we promise travellers.');
  return <>
    <Header onPhoto />
    <section className="photo-band" style={{ backgroundImage: 'url(/photos/hunza-autumn-valley.webp)', paddingTop: 170, paddingBottom: 56 }}><div className="site-wrap">
      <div className="kicker" style={{ color: '#FFD27A' }}>About us</div>
      <h1 style={{ fontSize: 'clamp(38px,5.5vw,62px)', margin: '0 0 12px', lineHeight: 1.08, maxWidth: 820 }}>Making Pakistan easy to explore</h1>
      <p style={{ fontSize: 20, maxWidth: 700, margin: 0, lineHeight: 1.55 }}>Pakistan has some of the most beautiful roads in the world. Planning a trip on them shouldn’t take days of asking around.</p>
    </div></section>

    <section className="sec"><div className="site-wrap">
      <div className="prose">
        <h2 style={{ marginTop: 0 }}>Why SafarCo</h2>
        <p>Every summer, families and friends set off for Hunza, Skardu, Naran or Swat with the same questions. How many days do we need? Where do we stop for the night? Is Babusar open? What will it all cost? The answers are scattered across groups, old blog posts and phone calls.</p>
        <p>SafarCo brings them into one plan. Tell it where you’re starting, how many days you have and what you want to see, and it plans the whole trip: the route and where to stop, places to see in a sensible order, where to stay, what to eat, the weather on the way and what it will cost your group.</p>
        <h2>How plans are made</h2>
        <p>Plans come from a road network of Pakistan with real driving speeds for motorways, plains and mountain roads, opening months for passes, and sunrise and sunset for every day, so drives end in daylight. Prices for fuel, tolls, hotels, meals, jeeps and car hire are checked regularly against their sources, and each one shows the date it was checked.</p>
        <p>Destination guides are written and checked by the SafarCo team. Places that came from research and haven’t been checked on the ground yet are clearly marked. Live data fills in the rest: weather forecasts, road routes and places nearby.</p>
        <h2>Who it’s for</h2>
        <p>Families on their first trip north, friends on a weekend drive, bikers, travellers from abroad landing in Islamabad, Lahore or Karachi, and anyone who wants the trip planned without the stress. SafarCo works in English and Roman Urdu, and keeps working when the signal drops.</p>
      </div>
    </div></section>

    <section className="sec sec-alt"><div className="site-wrap">
      <div className="kicker">What we promise</div>
      <h2>Our values</h2>
      <div className="grid g4" style={{ marginTop: 24 }}>
        {VALUES.map(([icon, title, text]) => <div key={title} className="fcard"><i className={`ic ph-fill ${icon}`} style={{ background: '#0B5F7C' }} /><h3>{title}</h3><p>{text}</p></div>)}
      </div>
    </div></section>

    <section className="sec"><div className="site-wrap" style={{ display: 'grid', gap: 18 }}>
      <div className="prose">
        <h2 style={{ marginTop: 0 }}>The photos</h2>
        <p>The photographs across SafarCo are by <a href={IG_PROFILE} target="_blank" rel="noreferrer" style={{ color: 'var(--g)', fontWeight: 700 }}>@{IG_HANDLE}</a>, taken on the same roads SafarCo plans.</p>
      </div>
      <div className="hero-actions"><a href={planHref()} className="btn btn-sun">Plan a trip</a><A href="/contact" className="btn btn-ghost">Get in touch</A></div>
    </div></section>
    <Footer />
  </>;
}
