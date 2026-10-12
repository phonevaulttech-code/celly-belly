/* Celly Belly service worker: network-first with cached fallback so it plays offline once installed */
const CACHE = 'celly-belly-v6';
const ASSETS = ['./', './index.html', './manifest.json', './css/style.css','./icons/icon-192.png','./icons/icon-512.png','./js/audio.js','./js/bubbles.js','./js/clip.js','./js/data.js','./js/flick.js','./js/game.js','./js/intro.js','./js/jobs.js','./js/main.js','./js/meta.js','./js/rink.js','./js/save.js','./js/share.js','./js/shoot.js','./js/ui.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); if (r.ok && new URL(e.request.url).origin === location.origin) caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
});
