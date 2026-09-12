const CACHE='hakim-optics-offline-v45';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './offline.html',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(APP_SHELL).catch(async()=>{
        // Cross-origin CDN caching can fail in some browsers; cache the local shell anyway.
        const cache2=await caches.open(CACHE);
        for(const url of APP_SHELL){
          try{const r=await fetch(url); if(r.ok||r.type==='opaque') await cache2.put(url,r.clone())}catch(e){}
        }
      }))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k.startsWith('hakim-optics-') && k!==CACHE)
          .map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);

  // App navigation: cached app first, then network, then offline fallback.
  if(event.request.mode==='navigate'){
    event.respondWith(
      caches.match(event.request,{ignoreSearch:true})
        .then(cached=>cached || fetch(event.request).then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});
          }
          return response;
        }).catch(()=>caches.match('./index.html') || caches.match('./offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;
      return fetch(event.request).then(response=>{
        if(response.ok || response.type==='opaque'){
          const copy=response.clone();
          if(url.origin===self.location.origin || url.hostname==='cdn.jsdelivr.net'){
            caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});
          }
        }
        return response;
      }).catch(()=>cached);
    })
  );
});
