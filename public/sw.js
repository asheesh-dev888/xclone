// ZuZu service worker: network-first for the app shell/static files, with an offline fallback.
// Never caches API, auth, media uploads or non-GET requests.
const CACHE = 'zuzu-v1';
const SHELL = ['/', '/style.css', '/app.js', '/favicon.svg', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/^\/(api|auth|media|healthz|\.well-known)(\/|$)/.test(url.pathname)) return; // straight to network
  const isPage = req.mode === 'navigate';
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(isPage ? '/' : req, copy));
      }
      return res;
    }).catch(() => caches.match(isPage ? '/' : req).then((r) => r || Response.error()))
  );
});
