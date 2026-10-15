// The SafarCo website: the brand's home, destination guides, about, the app and contact. The planner itself lives at /plan.
import { useEffect, useReducer, useState } from 'react';
import './site.css';
import { applyContent } from '../content';
import { applyPrices } from '../prices';
import { loadContent, loadPriceList } from '../cloud';
import { IG_HANDLE, IG_PROFILE } from '../contact';
import { Home } from './Home';
import { DestinationList, Guide } from './Destinations';
import { About } from './About';
import { GetApp } from './GetApp';
import { Contact } from './Contact';

/** Pages of the website, by path. */
const SITE_PAGES = ['/', '/destinations', '/about', '/app', '/contact'];
export const isSitePath = (p: string) => SITE_PAGES.includes(p) || /^\/destinations\/[a-z0-9-]+$/.test(p);

const path = () => location.pathname.replace(/\/+$/, '') || '/';
/** Move between website pages without reloading. */
export function go(to: string) { history.pushState(null, '', to); dispatchEvent(new Event('sc-nav')); window.scrollTo(0, 0); }
/** A link: website pages open in place, the planner and everything else load normally. */
export function A({ href, children, className, style, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const inSite = href.startsWith('/') && isSitePath(href.split(/[?#]/)[0]);
  return <a href={href} className={className} style={style} {...rest} onClick={e => { if (inSite && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); go(href); } }}>{children}</a>;
}

/** Title and description for search engines and link previews. */
export function usePage(title: string, description: string) {
  useEffect(() => {
    document.title = title === 'SafarCo' ? 'SafarCo · Plan your trip across Pakistan' : `${title} · SafarCo`;
    const set = (sel: string, attr: string, v: string) => { let m = document.head.querySelector(sel) as HTMLMetaElement | null; if (!m) { m = document.createElement('meta'); const [k, val] = attr.split('='); m.setAttribute(k, val); document.head.appendChild(m); } m.content = v; };
    set('meta[name="description"]', 'name=description', description);
    set('meta[property="og:title"]', 'property=og:title', document.title);
    set('meta[property="og:description"]', 'property=og:description', description);
  }, [title, description]);
}

const NAV: [string, string][] = [['/', 'Home'], ['/destinations', 'Destinations'], ['/app', 'Get the app'], ['/about', 'About us'], ['/contact', 'Contact']];

export function Header({ onPhoto = false }: { onPhoto?: boolean }) {
  const [open, setOpen] = useState(false), here = path();
  return (
    <header className={`site-head${onPhoto ? ' on-photo' : ''}`}>
      <div className="site-wrap">
        <A href="/" className="site-logo"><img src="/icon-192.png" alt="" />SafarCo</A>
        <nav className={`site-nav${open ? ' open' : ''}`} aria-label="Main">
          {NAV.map(([h, l]) => <A key={h} href={h} aria-current={(h === '/' ? here === '/' : here.startsWith(h)) ? 'page' : undefined} onClick={() => setOpen(false)}>{l}</A>)}
        </nav>
        <a href="/plan?start=1" className="btn btn-sun btn-sm head-cta">Plan a trip</a>
        <button className="site-menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><i className={`ph-bold ${open ? 'ph-x' : 'ph-list'}`} /></button>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="site-wrap">
        <div className="cols">
          <div>
            <div className="site-logo" style={{ color: '#fff' }}><img src="/icon-192.png" alt="" />SafarCo</div>
            <p style={{ color: '#A8A29C', lineHeight: 1.6, maxWidth: 320 }}>Free trip planning for Pakistan: the route, the days, the stops, the budget and the weather, in one plan.</p>
          </div>
          <div><h4>Plan</h4><a href="/plan?start=1">Plan a trip</a><a href="/plan?start=quick">Plan it for me</a><A href="/destinations">Destinations</A><A href="/app">Get the app</A></div>
          <div><h4>SafarCo</h4><A href="/about">About us</A><A href="/contact">Contact</A><a href={IG_PROFILE} target="_blank" rel="noreferrer">Instagram</a></div>
          <div><h4>Legal</h4><a href="/privacy">Privacy policy</a><a href="/terms">Terms of use</a></div>
        </div>
        <div className="bottom"><span>© {new Date().getFullYear()} SafarCo. Made for travellers in Pakistan.</span><span>Photos © {IG_HANDLE}</span></div>
      </div>
    </footer>
  );
}

export function NotFound() {
  usePage('Page not found', 'This page doesn’t exist.');
  return <><Header /><section className="band"><div className="site-wrap"><h1>This page doesn’t exist</h1><p>It may have moved. Try the <A href="/destinations" className="more">destinations</A> or <a href="/plan?start=1" className="more">plan a trip</a>.</p></div></section><Footer /></>;
}

export function Site() {
  const [p, setP] = useState(path()), [, bump] = useReducer((x: number) => x + 1, 0);
  // "Home" from the installed app arrives as /?home; show a clean address.
  useEffect(() => { if (location.search === '?home') history.replaceState(null, '', '/'); }, []);
  useEffect(() => { const f = () => setP(path()); addEventListener('popstate', f); addEventListener('sc-nav', f); return () => { removeEventListener('popstate', f); removeEventListener('sc-nav', f); }; }, []);
  // The admin's latest guides and prices (cached on the device), as in the planner.
  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem('safarco-content') || 'null'); if (c) { applyContent(c); bump(); } } catch { /* storage blocked */ }
    try { const c = JSON.parse(localStorage.getItem('safarco-prices') || 'null'); if (c) { applyPrices(c); bump(); } } catch { /* storage blocked */ }
    loadContent().then(v => { if (!v) return; applyContent(v); bump(); try { localStorage.setItem('safarco-content', JSON.stringify(v)); } catch { /* storage blocked */ } }).catch(() => {});
    loadPriceList().then(v => { if (!v) return; applyPrices(v); bump(); }).catch(() => {});
  }, []);
  const g = /^\/destinations\/([a-z0-9-]+)$/.exec(p);
  const page = p === '/' ? <Home /> : p === '/destinations' ? <DestinationList /> : g ? <Guide id={g[1]} /> : p === '/about' ? <About /> : p === '/app' ? <GetApp /> : p === '/contact' ? <Contact /> : <NotFound />;
  return <div className="site" data-sc="1" data-theme="paper">{page}</div>;
}
