// SafarCo service worker.
// - App shell: network first, falling back to the cached copy so the app opens offline.
// - /api trip data: network first, falling back to the offline copy.
// - Map tiles, style and glyphs saved by "Download for offline" (in the
//   safarco-offline cache) are served from there first; weather is network first.
const SHELL = 'safarco-shell-v40';
const OFFLINE = 'safarco-offline';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('safarco-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) {
    // Live trip data: network first, then whatever "Download for offline" saved.
    e.respondWith(fetch(req).catch(() => caches.open(OFFLINE).then(c => c.match(req.url)).then(r => r || Response.error())));
    return;
  }

  if (url.origin !== location.origin) {
    const fromCache = () => caches.open(OFFLINE).then(c => c.match(req.url));
    // Map tiles rarely change: saved copy first. Weather and the rest: network first.
    if (/openfreemap\.org\/|elevation-tiles-prod/.test(url.hostname + url.pathname)) e.respondWith(fromCache().then(hit => hit || fetch(req)));
    else e.respondWith(fetch(req).catch(() => fromCache().then(r => r || Response.error())));
    return;
  }

  e.respondWith(fetch(req).then(res => {
    if (res.ok && (req.mode === 'navigate' || url.pathname.startsWith('/assets/'))) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req.mode === 'navigate' ? '/' : req, copy)); }
    return res;
  }).catch(() => caches.open(SHELL).then(c => c.match(req.mode === 'navigate' ? '/' : req)).then(r => r || Response.error())));
});
