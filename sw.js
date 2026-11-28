// Service Worker: hält die App-Dateien auf dem Gerät vor, damit sie ohne Netz startet.
// Bei jeder Veröffentlichung VERSION erhöhen (gleich wie APP_VERSION in js/core/version.js)
// und neue Dateien in SHELL eintragen. Sonst bekommen installierte Geräte die Änderung nicht.

const VERSION = '0.8.1';
const CACHE = 'fangbuch-' + VERSION;
const FONTS = 'schrift-1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './bilder/159919767c7ae4496479943887e65569.jpg',
  './bilder/2d0433007675b1fc779f8e886d25f7df.jpg',
  './bilder/5caae0a988312754168c867dedc2b12a.jpg',
  './bilder/9c4129db401db174604304e5a990e14a.jpg',
  './bilder/c37a1ceb169e84647104abe0346df832.jpg',
  './bilder/e7a2888f3408ec9c14575feb7aa11931.jpg',
  './bilder/ebd2b11ee6fbeae97eaaaf235afe4739.jpg',
  './css/app.css',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/main.js',
  './js/core/astro.js',
  './js/core/backup.js',
  './js/core/bus.js',
  './js/core/db.js',
  './js/core/geo.js',
  './js/core/karte.js',
  './js/core/mitteilungen.js',
  './js/core/photos.js',
  './js/core/pwa.js',
  './js/core/repo.js',
  './js/core/startdatei.js',
  './js/core/util.js',
  './js/core/version.js',
  './js/core/weather-sync.js',
  './js/core/weather.js',
  './js/dc/laufzeit.js',
  './js/seiten/Ansitz.js',
  './js/seiten/Auswertung.js',
  './js/seiten/Beenden.js',
  './js/seiten/BissKarte.js',
  './js/seiten/ChancenHeute.js',
  './js/seiten/DeeperImport.js',
  './js/seiten/Faenge.js',
  './js/seiten/Fang.js',
  './js/seiten/Fische.js',
  './js/seiten/Futter.js',
  './js/seiten/KantenFinder.js',
  './js/seiten/Kontext.js',
  './js/seiten/Krisiu.js',
  './js/seiten/Logbuch.js',
  './js/seiten/Main.js',
  './js/seiten/Mitteilungen.js',
  './js/seiten/Nachtragen.js',
  './js/seiten/Planen.js',
  './js/seiten/Replay.js',
  './js/seiten/Rute.js',
  './js/seiten/RuteEinrichten.js',
  './js/seiten/RuteWieVorher.js',
  './js/seiten/Ruten.js',
  './js/seiten/Saison.js',
  './js/seiten/Spiel.js',
  './js/seiten/Spot.js',
  './js/seiten/Sprache.js',
  './js/seiten/WetterZwilling.js',
  './js/seiten/WindSee.js',
  './js/seiten/basis.js',
  './js/seiten/fangfluss.js',
  './js/seiten/gemeinsam.js',
  './js/seiten/uebergang.js',
  './js/seiten/ufer.js',
  './js/seiten/verlauf.js',
  './js/seiten/wetter.js',
  './js/ui/analyse.js',
  './js/ui/ansitz.js',
  './js/ui/app.js',
  './js/ui/auswertung.js',
  './js/ui/daten.js',
  './js/ui/diagnose.js',
  './js/ui/diagramm.js',
  './js/ui/fische.js',
  './js/ui/karte.js',
  './js/ui/planen.js',
  './js/ui/start.js',
  './js/vorlagen/Ansitz.js',
  './js/vorlagen/Ansitz.logik.js',
  './js/vorlagen/Assistent.js',
  './js/vorlagen/Assistent.logik.js',
  './js/vorlagen/Auswertung.js',
  './js/vorlagen/Auswertung.logik.js',
  './js/vorlagen/Beenden.js',
  './js/vorlagen/Beenden.logik.js',
  './js/vorlagen/BeendenZeit.js',
  './js/vorlagen/BeendenZeit.logik.js',
  './js/vorlagen/BissKarte.js',
  './js/vorlagen/BissKarte.logik.js',
  './js/vorlagen/ChancenHeute.js',
  './js/vorlagen/ChancenHeute.logik.js',
  './js/vorlagen/DeeperImport.js',
  './js/vorlagen/DeeperImport.logik.js',
  './js/vorlagen/Erweitert.js',
  './js/vorlagen/Erweitert.logik.js',
  './js/vorlagen/Faenge.js',
  './js/vorlagen/Faenge.logik.js',
  './js/vorlagen/Fang.js',
  './js/vorlagen/Fang.logik.js',
  './js/vorlagen/FangKarte.js',
  './js/vorlagen/FangKarte.logik.js',
  './js/vorlagen/Fische.js',
  './js/vorlagen/Fische.logik.js',
  './js/vorlagen/Futter.js',
  './js/vorlagen/Futter.logik.js',
  './js/vorlagen/KantenFinder.js',
  './js/vorlagen/KantenFinder.logik.js',
  './js/vorlagen/KeinNetz.js',
  './js/vorlagen/KeinNetz.logik.js',
  './js/vorlagen/Kontext.js',
  './js/vorlagen/Kontext.logik.js',
  './js/vorlagen/KrisiuChat.js',
  './js/vorlagen/KrisiuChat.logik.js',
  './js/vorlagen/KrisiuChatNeu.js',
  './js/vorlagen/KrisiuChatNeu.logik.js',
  './js/vorlagen/KrisiuChats.js',
  './js/vorlagen/KrisiuChats.logik.js',
  './js/vorlagen/Logbuch.js',
  './js/vorlagen/Logbuch.logik.js',
  './js/vorlagen/Main.js',
  './js/vorlagen/Main.logik.js',
  './js/vorlagen/Nachtragen.js',
  './js/vorlagen/Nachtragen.logik.js',
  './js/vorlagen/PlanErgebnis.js',
  './js/vorlagen/PlanErgebnis.logik.js',
  './js/vorlagen/PlanTag.js',
  './js/vorlagen/PlanTag.logik.js',
  './js/vorlagen/Planen.js',
  './js/vorlagen/Planen.logik.js',
  './js/vorlagen/Rekorde.js',
  './js/vorlagen/Rekorde.logik.js',
  './js/vorlagen/Replay.js',
  './js/vorlagen/Replay.logik.js',
  './js/vorlagen/Rute.js',
  './js/vorlagen/Rute.logik.js',
  './js/vorlagen/RuteEinrichten.js',
  './js/vorlagen/RuteEinrichten.logik.js',
  './js/vorlagen/RuteWieVorher.js',
  './js/vorlagen/RuteWieVorher.logik.js',
  './js/vorlagen/Ruten.js',
  './js/vorlagen/Ruten.logik.js',
  './js/vorlagen/SaisonKalender.js',
  './js/vorlagen/SaisonKalender.logik.js',
  './js/vorlagen/Schneider.js',
  './js/vorlagen/Schneider.logik.js',
  './js/vorlagen/SchnellBiss.js',
  './js/vorlagen/SchnellBiss.logik.js',
  './js/vorlagen/Spiel.js',
  './js/vorlagen/Spiel.logik.js',
  './js/vorlagen/Spot.js',
  './js/vorlagen/Spot.logik.js',
  './js/vorlagen/Sprache.js',
  './js/vorlagen/Sprache.logik.js',
  './js/vorlagen/Steckbrief.js',
  './js/vorlagen/Steckbrief.logik.js',
  './js/vorlagen/Wecker.js',
  './js/vorlagen/Wecker.logik.js',
  './js/vorlagen/WetterZwilling.js',
  './js/vorlagen/WetterZwilling.logik.js',
  './js/vorlagen/Wiederfang.js',
  './js/vorlagen/Wiederfang.logik.js',
  './js/vorlagen/WindSee.js',
  './js/vorlagen/WindSee.logik.js',
  './worker/krisiu-mitteilungen.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('fangbuch-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Die Seite schaltet eine neue Version erst frei, wenn der Nutzer "Aktualisieren" tippt.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'PUSH_SERVER') event.waitUntil(pushZiel(event.data));
});

/* ---------- Mitteilungen vom eigenen Krisiu-Server (Cloudflare Worker) ---------- */
// Die Mitteilung kommt ohne Inhalt; der Text wird beim Server abgeholt. Wo der Server ist, merkt sich der SW selbst.
const PUSH = 'krisiu-push';
async function pushZiel(neu) {
  const c = await caches.open(PUSH);
  if (neu) { await c.put('./__push', new Response(JSON.stringify({ server: neu.server, id: neu.id }))); return neu; }
  const r = await c.match('./__push'); return r ? r.json() : null;
}
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    const z = await pushZiel();
    let liste = [];
    if (z && z.server) { try { liste = await (await fetch(z.server + '/meldung?id=' + encodeURIComponent(z.id))).json(); } catch (e) { liste = []; } }
    if (!liste.length) liste = [{ art: 'leer', titel: 'Krisiu', text: 'Ich hab was für dich – schau in die App.' }];
    for (const m of liste) {
      const opt = { body: m.text, tag: 'krisiu-' + m.art, icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: Object.assign({ url: './#/Main' }, m), vibrate: [120, 60, 120] };
      if (m.art === 'daheim') opt.actions = [{ action: 'schreiben', title: 'Schreiben' }, { action: 'anrufen', title: 'Anrufen' }];
      if (m.art === 'frage') { opt.actions = [{ action: 'planen', title: 'Ansitz planen' }, { action: 'keinezeit', title: 'Keine Zeit' }]; opt.data.url = './#/Planen'; }
      if (m.art === 'umschwung' || m.art === 'wochenende') opt.data.url = './#/Planen';
      if (m.art === 'front') opt.data.url = './#/Ansitz';
      await self.registration.showNotification(m.titel || 'Krisiu', opt);
    }
  })());
});
self.addEventListener('notificationclick', event => {
  const n = event.notification, d = n.data || {}, a = event.action;
  let ziel = d.url || './';
  if (a === 'biss') ziel = './#/SchnellBiss';
  else if (a === 'sprechen') ziel = './#/Sprache';
  else if (a === 'planen') ziel = './#/Planen';
  if (a === 'schreiben' && d.nummer) ziel = 'sms:' + d.nummer + '?body=' + encodeURIComponent('Alles okay, bin noch am Wasser 🎣');
  else if (a === 'anrufen' && d.nummer) ziel = 'tel:' + d.nummer;
  else if ((a === 'schreiben' || a === 'anrufen') && !d.nummer) ziel = './#/Wecker';
  if (n.tag !== 'ansitz') n.close();
  event.waitUntil((async () => {
    if (a === 'keinezeit') { const z = await pushZiel(); if (z && z.server) await fetch(z.server + '/keinezeit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: z.id }) }).catch(() => {}); return; }
    if (/^(sms|tel):/.test(ziel)) return self.clients.openWindow(ziel);
    const url = new URL(ziel, self.registration.scope).href;
    const alle = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of alle) { if ('focus' in c) { await c.focus(); if ('navigate' in c) return c.navigate(url); } }
    return self.clients.openWindow(url);
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Schrift (Google Fonts): einmal laden, dann vom Gerät – damit sie auch ohne Netz da ist.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return; // Wetterdienste gehen direkt ins Netz

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      return await fetch(req);
    } catch (err) {
      if (req.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
