// ZuZu service worker: network-first for the app shell/static files, with an offline fallback.
// Never caches API (including direct messages under /api/dm, ZuZu AI answers under /api/ai, Momo's thoughts under /api/monkey,
// admin stats under /api/admin and video upload signing under /api/video), the /admin page, auth, media uploads, app downloads
// (/download), videos (Cloudinary URLs, <video> and Range requests) or non-GET requests.
const CACHE = 'zuzu-v10';
// Paths that always go straight to the network and are never cached.
const BYPASS = /^\/(api|admin|auth|media|download|healthz|\.well-known)(\/|$)/;
const SHELL = ['/', '/style.css', '/app.js', '/ideals.js', '/favicon.svg', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

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
  if (/(^|\.)cloudinary\.com$/.test(url.hostname)) return; // videos, posters and uploads on Cloudinary: never cached by the SW
  if (url.origin !== self.location.origin) return;
  if (req.destination === 'video' || req.destination === 'audio' || req.headers.has('range')) return; // streaming media: never cached
  if (BYPASS.test(url.pathname)) return; // straight to network, never cached
  if (url.pathname.startsWith('/api/dm')) return; // DMs are private + live: never cached (also covered by BYPASS)
  if (url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/admin')) return; // private admin stats/page: never cached (also covered by BYPASS)
  if (url.pathname.startsWith('/api/ai')) return; // ZuZu AI answers are streamed + per user: never cached (also covered by BYPASS)
  if (url.pathname.startsWith('/api/video') || url.pathname.startsWith('/api/reels')) return; // video signing + reels feed: never cached (also covered by BYPASS)
  if (url.pathname.startsWith('/api/monkey')) return; // Momo's thoughts: never cached by the SW (the app caches them per post itself; also covered by BYPASS)
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
