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

const path = location.pathname.replace(/\/+$/, '') || '/';
const Page = path === '/admin' ? Admin : path === '/privacy' ? Privacy : path === '/terms' ? Terms : App;
createRoot(document.getElementById('root')!).render(<Page />);

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
