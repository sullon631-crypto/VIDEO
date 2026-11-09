const CACHE='dibiser-almacen-v6-movilizacion';
const ASSETS=['./','./index.html','./app.js','./pwa.js','./professional.css','./interface.js','./motion.js','./motion.css','./report-pdf.js','./vendor/jspdf.umd.min.js','./vendor/jspdf.plugin.autotable.min.js','./fonts/inter-400.ttf','./fonts/inter-700.ttf','./fonts/inter-400.woff2','./fonts/inter-600.woff2','./fonts/inter-700.woff2','./manifest.webmanifest','./logo.jpeg','./catalogos.json','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate', event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dibiser-almacen-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;})));
});
