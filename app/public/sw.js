// SafarCo service worker.
// - App shell: network first, falling back to the cached copy so the app opens offline.
// - Map tiles, style, glyphs and trip data saved by "Download for offline" live in
//   the safarco-offline cache and are served from there first.
const SHELL = 'safarco-shell-v1';
const OFFLINE = 'safarco-offline';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['/', '/manifest.webmanifest', '/icon.svg'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('safarco-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;

  if (url.origin !== location.origin) {
    // Saved map tiles and trip data first; otherwise the network.
    e.respondWith(caches.open(OFFLINE).then(c => c.match(req.url)).then(hit => hit || fetch(req).catch(() => caches.open(OFFLINE).then(c => c.match(req.url, { ignoreSearch: false })).then(r => r || Response.error()))));
    return;
  }

  e.respondWith(fetch(req).then(res => {
    if (res.ok && (req.mode === 'navigate' || url.pathname.startsWith('/assets/'))) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req.mode === 'navigate' ? '/' : req, copy)); }
    return res;
  }).catch(() => caches.open(SHELL).then(c => c.match(req.mode === 'navigate' ? '/' : req)).then(r => r || Response.error())));
});
