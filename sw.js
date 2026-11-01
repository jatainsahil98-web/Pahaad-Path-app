// Offline cache: the app is one file, so cache it and serve it when there is no signal. Weather stays network-first.
// 2.0: the offline map files (tiles/*.pmtiles) are read with Range requests. When the user saved them ("Save map for
// offline", a separate cache that survives app updates), the worker answers each Range from that saved copy.
const C='pp-403db0d151'; // install skips the HTTP cache so a new release never caches the old page
const TILES='pp-tiles';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'].map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
async function tileRange(req){
  const c=await caches.open(TILES),hit=await c.match(req.url,{ignoreSearch:true});
  if(!hit)return fetch(req); // not saved: straight to the site, which answers Range itself
  const blob=await hit.blob(),size=blob.size,m=/bytes=(\d*)-(\d*)/.exec(req.headers.get('range')||'');
  if(!m)return new Response(blob,{status:200,headers:{'Content-Type':'application/octet-stream','Content-Length':String(size),'Accept-Ranges':'bytes'}});
  let a=m[1]===''?Math.max(0,size-(+m[2])):+m[1],b=m[1]===''||m[2]===''?size-1:Math.min(+m[2],size-1);
  if(a>=size||a>b)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
  return new Response(blob.slice(a,b+1),{status:206,headers:{'Content-Type':'application/octet-stream','Content-Length':String(b-a+1),'Content-Range':'bytes '+a+'-'+b+'/'+size,'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==location.origin)return;
  if(/\/tiles\/[^/]+\.pmtiles$/.test(u.pathname)){e.respondWith(tileRange(e.request));return;}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)));});
