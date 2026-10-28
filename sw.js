/* Hakim Optic PWA service worker — compact cards and delivered retention v114 */
const CACHE = 'hakim-optics-offline-v116';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './offline.html',
  './icon-192.png', './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of SHELL) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (response && (response.ok || response.type === 'opaque')) await cache.put(url, response.clone());
      } catch (_) {}
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('hakim-optics-offline-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !url.hostname.includes('jsdelivr.net')) return;
  const isAppShell = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isAppShell) {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (_) {
        return (await cache.match(req)) || (await cache.match('./index.html')) || (await cache.match('./offline.html')) || Response.error();
      }
    }
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const response = await fetch(req);
      if (response && (response.ok || response.type === 'opaque')) cache.put(req, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      const fallback = await cache.match(req);
      if (fallback) return fallback;
      throw error;
    }
  })());
});
