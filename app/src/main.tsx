import { createRoot } from 'react-dom/client';
import { inject } from '@vercel/analytics';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/unbounded/500.css';
import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/700.css';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import '@fontsource/jetbrains-mono/500.css';
import './icons/icons.css';
import './styles.css';
import { App } from './App';
import { Admin } from './pages/Admin';
import { Privacy, Terms } from './pages/Legal';
import { Follow } from './pages/Follow';
import { Split } from './pages/Split';
import { InstallHost } from './components/InstallSheet';
import { Site } from './site/Site';

const path = location.pathname.replace(/\/+$/, '') || '/';
// The planner is at /plan. The website is everything else, but "/" still opens the planner for the installed
// app and for trip links shared before the planner moved.
const q = new URLSearchParams(location.search), installed = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const planner = path === '/plan' || (path === '/' && !q.has('home') && (installed || q.has('trip')));
const Page = path === '/admin' ? Admin : path === '/privacy' ? Privacy : path === '/terms' ? Terms : path === '/follow' ? Follow : path === '/split' ? Split : planner ? App : Site;
createRoot(document.getElementById('root')!).render(<><Page /><InstallHost /></>);

if (import.meta.env.PROD) {
  // Anonymous visit counts (Vercel Web Analytics, no cookies).
  inject({ mode: 'production' });
  // Crash reports, at most a few per visit.
  let sent = 0;
  const report = (message: string, stack = '') => {
    if (sent++ >= 5) return;
    navigator.sendBeacon?.('/api/log', JSON.stringify({ message, stack, page: path }));
  };
  addEventListener('error', e => report(e.message, e.error?.stack));
  addEventListener('unhandledrejection', e => report(String(e.reason?.message || e.reason), e.reason?.stack));
  if ('serviceWorker' in navigator) addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* offline support unavailable */ }); });
}

// The splash in index.html shows while SafarCo opens: the car drives up the S on every open of the
// planner, the installed app and the website (a tap skips it), and not on admin, legal, follow or split pages.
const splash = document.getElementById('splash');
if (splash) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const min = Page !== App && Page !== Site ? 0 : still ? 800 : 6500;
  const hide = () => { splash.classList.add('sp-hide'); setTimeout(() => splash.remove(), 500); };
  setTimeout(hide, Math.max(0, min - performance.now()));
  // In a hurry? A tap anywhere skips it.
  splash.addEventListener('click', e => { if (!(e.target as Element).closest('a')) hide(); });
}
