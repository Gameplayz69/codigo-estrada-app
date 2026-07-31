// sw.js - simples service worker para caching offline
const CACHE = 'ce-cache-v1';
const ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js', '/manifest.json', '/images/placeholder.svg', '/data/signs.json'
];
self.addEventListener('install', ev=>{
  ev.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', ev=>{
  ev.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', ev=>{
  const url = new URL(ev.request.url);
  // try cache first
  ev.respondWith(caches.match(ev.request).then(r=> r || fetch(ev.request).then(resp=>{
    // store GET responses
    if(ev.request.method==='GET' && resp && resp.type!=='opaque'){
      const copy = resp.clone(); caches.open(CACHE).then(c=>c.put(ev.request, copy));
    }
    return resp;
  }).catch(()=>caches.match('/index.html'))));
});
