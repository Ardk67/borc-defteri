const C='borc-defteri-v3';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'])));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET'||!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));});
// hatırlatma bildirimi (Firebase Cloud Messaging, data mesajı)
self.addEventListener('push',e=>{
  let d={}; try{ d=e.data.json(); }catch(_){ d={data:{title:'Borç Defteri',body:e.data?e.data.text():''}}; }
  const v=d.data||d.notification||{};
  e.waitUntil(self.registration.showNotification(v.title||'Borç Defteri',{body:v.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:v.tag||undefined,data:{url:v.url||'./'}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{ for(const c of l){ if('focus' in c) return c.focus(); } return self.clients.openWindow(e.notification.data&&e.notification.data.url||'./'); }));
});
