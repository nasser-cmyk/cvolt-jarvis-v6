// C-VOLT JARVIS service worker — offline shell + install eligibility
const CACHE='cvolt-jarvis-v6';
const ASSETS=['./','./CVOLT_JARVIS_2040.html','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // Never cache API calls (Anthropic, ElevenLabs)
  if(url.hostname.includes('anthropic.com')||url.hostname.includes('elevenlabs.io')||url.hostname.includes('chart.js')){
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
      if(e.request.method==='GET'&&resp.ok&&url.origin===location.origin){
        const clone=resp.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
      }
      return resp;
    }).catch(()=>caches.match('./CVOLT_JARVIS_2040.html')))
  );
})