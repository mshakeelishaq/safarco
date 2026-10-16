// Get the app: SafarCo installs from the browser to the home screen (Android, iPhone, laptop), no app store needed.
import { useEffect, useReducer } from 'react';
import { Footer, Header, usePage } from './Site';
import { isInstalled, onInstallChange, startInstall } from '../install';

const STEPS: [string, string, string[]][] = [
  ['ph-android-logo', 'Android', ['Open SafarCo in Chrome.', 'Tap “Install app” below, or the ⋮ menu → “Install app” (or “Add to Home screen”).', 'SafarCo appears on your home screen like any app.']],
  ['ph-apple-logo', 'iPhone and iPad', ['Open SafarCo in Safari.', 'Tap the Share button (the square with an arrow).', 'Scroll down and tap “Add to Home Screen”, then “Add”.']],
  ['ph-desktop', 'Laptop', ['Open SafarCo in Chrome or Edge.', 'Click the install icon at the right of the address bar.', 'SafarCo opens in its own window.']]
];

export function GetApp() {
  usePage('Get the app', 'Install SafarCo on Android, iPhone or your laptop in seconds, from the browser. No app store, works offline.');
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => onInstallChange(bump), []);
  const installed = isInstalled();
  return <>
    <Header />
    <section className="band"><div className="site-wrap app-hero">
      <div>
        <div className="kicker">The SafarCo app</div>
        <h1>Your trip, in your pocket</h1>
        <p>SafarCo installs straight from your browser in a few seconds. No app store, no account, and it keeps working when you lose signal in the mountains.</p>
        <div className="hero-actions" style={{ marginTop: 24 }}>
          {installed ? <a href="/plan" className="btn btn-sun">Open SafarCo</a>
            : <button className="btn btn-sun" onClick={() => startInstall()}>Install the app <i className="ph-bold ph-download-simple" /></button>}
          <a href="/plan?start=1" className="btn btn-ghost">Use it in the browser</a>
        </div>
      </div>
      <div className="phone app-phone" style={{ width: 230 }}><div className="scr" style={{ backgroundImage: 'url(/photos/altit-fort.webp)' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', color: '#FFD27A' }}>TODAY · DAY 3</div>
        <div style={{ fontFamily: 'var(--fontH)', fontSize: 22, fontWeight: 700, margin: '4px 0' }}>Explore Hunza</div>
        <div style={{ fontSize: 13, opacity: .92, lineHeight: 1.5 }}>8:00 Baltit Fort<br />9:40 Eagle’s Nest<br />12:30 Lunch, Karimabad<br />14:00 Attabad Lake</div>
      </div></div>
    </div></section>

    <section className="sec sec-alt"><div className="site-wrap">
      <h2>Install in three steps</h2>
      <div className="grid g3" style={{ marginTop: 24 }}>
        {STEPS.map(([icon, title, steps]) => <div key={title} className="fcard">
          <i className={`ic ph-fill ${icon}`} style={{ background: '#201E1D' }} /><h3>{title}</h3>
          <ol style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.6, color: 'var(--ink2)' }}>{steps.map(s => <li key={s}>{s}</li>)}</ol>
        </div>)}
      </div>
    </div></section>

    <section className="sec"><div className="site-wrap">
      <h2>What the app adds on the road</h2>
      <div className="grid g3" style={{ marginTop: 24 }}>
        {([['ph-navigation-arrow', 'Where am I on today’s drive', 'Your position on the day’s route, the next stop and how long is left.'], ['ph-wifi-slash', 'Offline plan and maps', 'Download before you leave; it all works without signal.'], ['ph-receipt', 'Expenses and splitting', 'Note what you spend and see who owes whom at the end.'], ['ph-users-three', 'Family can follow', 'A link for family at home: they see your check-ins and when you arrive. Not live tracking, so it works on weak signal and saves battery.'], ['ph-cloud-sun', 'Weather on the way', 'Forecasts for each day’s drive and where you’re staying.'], ['ph-bookmarks-simple', 'Your trips saved', 'Keep several plans and open them on any phone after signing in.']] as const)
          .map(([icon, title, text]) => <div key={title} className="fcard"><i className={`ic ph-fill ${icon}`} style={{ background: '#0B5F7C' }} /><h3>{title}</h3><p>{text}</p></div>)}
      </div>
    </div></section>
    <Footer />
  </>;
}
