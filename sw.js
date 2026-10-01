const CACHE_NAME="dbh-shell-v4";
const CORE=[
  "/",
  "/index.html",
  "/properties.html",
  "/property.html",
  "/contact.html",
  "/profile.html",
  "/save.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/dbh-logo.jpg",
  "/assets/css/styles.css",
  "/assets/css/notifications.css",
  "/assets/css/consent.css",
  "/assets/css/pwa.css",
  "/assets/js/config.js",
  "/assets/js/properties.js?v=20260930-2",
  "/assets/js/app.js?v=20261001-2"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
  );
});

function isApi(url){
  return /supabase\.co\/(rest|functions|auth)\//i.test(url.href) || /\/api\//i.test(url.pathname);
}

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin || isApi(url))return;

  if(req.mode==="navigate"){
    event.respondWith(
      fetch(req).then(res=>{
        const clone=res.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(req,clone)).catch(()=>{});
        return res;
      }).catch(()=>caches.match(req).then(cached=>cached||caches.match("/offline.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>{
      const network=fetch(req).then(res=>{
        if(res.ok){const clone=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,clone)).catch(()=>{});}
        return res;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});