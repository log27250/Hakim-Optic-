const CACHE='hakim-optics-offline-v54';
const SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event=>{
  event.waitUntil(
    caches.open(CACHE).then(async cache=>{
      for(const url of SHELL){
        try{ await cache.add(url); }catch(e){}
      }
    }).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event=>{
  const req=event.request;
  if(req.method!=='GET') return;

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached) return cached;

    try{
      const res=await fetch(req);
      if(res && (res.ok || res.type==='opaque')){
        const cache=await caches.open(CACHE);
        cache.put(req,res.clone()).catch(()=>{});
      }
      return res;
    }catch(e){
      if(req.mode==='navigate'){
        return (await caches.match('./index.html')) || (await caches.match('./offline.html'));
      }
      const fallback=await caches.match(req);
      if(fallback) return fallback;
      throw e;
    }
  })());
});
