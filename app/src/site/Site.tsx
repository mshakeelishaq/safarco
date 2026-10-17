// The SafarCo website: the brand's home, destination guides, about, the app and contact. The planner itself lives at /plan.
import { useEffect, useReducer, useState } from 'react';
import './site.css';
import { applyContent } from '../content';
import { applyPrices } from '../prices';
import { loadContent, loadPriceList } from '../cloud';
import { IG_HANDLE, IG_PROFILE } from '../contact';
import { onWebPhoto } from '../photos';
import { Home } from './Home';
import { DestinationList, Guide } from './Destinations';
import { About } from './About';
import { GetApp } from './GetApp';
import { Contact } from './Contact';
import { SITE_URL } from './url';
import { Logo } from '../components/Logo';
import { isInstalled, offerInstallNow, onInstallChange, startInstall } from '../install';
import { planHref, seasonNow } from './Hero';

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
    // One address for search engines, whichever one the visitor came in on.
    const url = SITE_URL + (path() === '/' ? '/' : path());
    set('meta[property="og:url"]', 'property=og:url', url);
    let c = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!c) { c = document.createElement('link'); c.rel = 'canonical'; document.head.appendChild(c); }
    c.href = url;
  }, [title, description]);
}

const NAV: [string, string][] = [['/', 'Home'], ['/destinations', 'Destinations'], ['/app', 'Get the app'], ['/about', 'About us'], ['/contact', 'Contact']];

export function Header({ onPhoto = false }: { onPhoto?: boolean }) {
  const [open, setOpen] = useState(false), here = path();
  // Over a photo the bar is clear; past it, a slim frosted bar. On phones it slides away going down and back going up.
  const [solid, setSolid] = useState(!onPhoto), [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = scrollY;
    const f = () => {
      const y = scrollY, top = (document.querySelector('.hero2, .hero, .photo-band') as HTMLElement | null)?.offsetHeight || 0;
      setSolid(!onPhoto || y > Math.max(40, top - 90));
      if (innerWidth > 760 || y < 140) setHidden(false);
      else if (y > last + 6) setHidden(true);
      else if (y < last - 6) setHidden(false);
      last = y;
    };
    f(); addEventListener('scroll', f, { passive: true }); addEventListener('resize', f);
    return () => { removeEventListener('scroll', f); removeEventListener('resize', f); };
  }, [onPhoto]);
  const hide = hidden && !open, clear = onPhoto && !solid;
  return <>
    <header className={`site-head${onPhoto ? ' on-photo' : ''}${solid ? ' solid' : ''}${hide ? ' tucked' : ''}`}>
      <div className="site-wrap">
        <A href="/" className="site-logo" aria-label="SafarCo home"><Logo size={solid ? 32 : 36} light={clear} /></A>
        <nav className={`site-nav${open ? ' open' : ''}`} aria-label="Main">
          {NAV.map(([h, l]) => <A key={h} href={h} aria-current={(h === '/' ? here === '/' : here.startsWith(h)) ? 'page' : undefined} onClick={() => setOpen(false)}>{l}</A>)}
        </nav>
        <a href={planHref()} className="btn btn-sun btn-sm head-cta">Plan a trip</a>
        <button className="site-menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><i className={`ph-bold ${open ? 'ph-x' : 'ph-list'}`} /></button>
      </div>
    </header>
    {/* Phones: while the bar is tucked away, "Plan a trip" stays a tap away. */}
    <a href={planHref()} className={`plan-fab${hide ? ' show' : ''}`} aria-hidden={!hide} tabIndex={hide ? 0 : -1}><i className="ph-fill ph-path" />Plan a trip</a>
  </>;
}

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="site-wrap">
        <div className="cols">
          <div>
            <div className="site-logo"><Logo size={36} light /></div>
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

/** On phones: a slim bar offering the app, until it's installed or closed. */
function AppBar({ here }: { here: string }) {
  const KEY = 'safarco-appbar-closed';
  const [closed, setClosed] = useState(() => !offerInstallNow());
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => onInstallChange(bump), []);
  if (closed || isInstalled() || here === '/app') return null;
  const close = () => { setClosed(true); try { localStorage.setItem(KEY, '1'); } catch { /* storage blocked */ } };
  return (
    <div className="app-bar" role="region" aria-label="Get the app">
      <img src="/icon-192.png" alt="" />
      <div className="txt"><b>SafarCo app</b><span>Free · works offline</span></div>
      <button className="btn btn-sun btn-sm" onClick={() => startInstall()}>Install</button>
      <button className="x" onClick={close} aria-label="Close"><i className="ph-bold ph-x" /></button>
    </div>
  );
}

export function NotFound() {
  usePage('Page not found', 'This page doesn’t exist.');
  return <><Header /><section className="band"><div className="site-wrap"><h1>This page doesn’t exist</h1><p>It may have moved. Try the <A href="/destinations" className="more">destinations</A> or <a href="/plan?start=1" className="more">plan a trip</a>.</p></div></section><Footer /></>;
}

export function Site() {
  const [p, setP] = useState(path()), [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => onWebPhoto(bump), []);
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
  // Sections fade in as they come into view (not for visitors who prefer less motion).
  useEffect(() => {
    const els = [...document.querySelectorAll('.site .reveal:not(.in)')];
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  });
  return <div className="site" data-sc="1" data-theme="paper" data-season={seasonNow()}>{page}<AppBar here={p} /></div>;
}
