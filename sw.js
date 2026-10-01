const CACHE_NAME="dbh-shell-v14";
const CORE=[
  "/",
  "/index.html",
  "/properties.html",
  "/property.html",
  "/contact.html",
  "/help.html",
  "/profile.html",
  "/save.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/dbh-logo.jpg",
  "/assets/css/styles.css",
  "/assets/css/notifications.css",
  "/assets/css/consent.css",
  "/assets/css/pwa.css","/assets/css/customer-care.css?v=20261001-5",
  "/assets/js/config.js",
  "/assets/js/properties.js?v=20260930-2",
  "/assets/js/app.js?v=20261001-10","/assets/js/customer-care.js?v=20261001-3"
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

self.addEventListener("push",event=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch{payload={body:event.data?.text?.()||""}}
  const title=String(payload.title||"DBH Notification");
  const options={
    body:String(payload.body||"You have a new notification from D Banjus Homes Nig Ltd."),
    icon:String(payload.icon||"/dbh-logo.jpg"),
    badge:String(payload.badge||"/dbh-logo.jpg"),
    tag:String(payload.tag||("dbh-push-"+Date.now())),
    renotify:true,
    data:payload.data||{}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=event.notification?.data?.link||"/dashboard.html";
  event.waitUntil((async()=>{
    const absolute=new URL(target,self.location.origin).href;
    const clientsList=await clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of clientsList){
      if("focus" in client){try{if(client.url===absolute)await client.focus();else if(client.navigate)await client.navigate(absolute);await client.focus();return;}catch{}}
    }
    if(clients.openWindow)await clients.openWindow(absolute);
  })());
});

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