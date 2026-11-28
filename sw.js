// Service Worker: hält die App-Dateien auf dem Gerät vor, damit sie ohne Netz startet.
// Bei jeder Veröffentlichung VERSION erhöhen (gleich wie APP_VERSION in js/core/version.js)
// und neue Dateien in SHELL eintragen. Sonst bekommen installierte Geräte die Änderung nicht.

const VERSION = '0.6.0';
const CACHE = 'fangbuch-' + VERSION;
const FONTS = 'schrift-1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './bilder/159919767c7ae4496479943887e65569.jpg',
  './bilder/2d0433007675b1fc779f8e886d25f7df.jpg',
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
  './js/seiten/Faenge.js',
  './js/seiten/Fang.js',
  './js/seiten/Fische.js',
  './js/seiten/Futter.js',
  './js/seiten/Kontext.js',
  './js/seiten/Logbuch.js',
  './js/seiten/Main.js',
  './js/seiten/Nachtragen.js',
  './js/seiten/Planen.js',
  './js/seiten/Rute.js',
  './js/seiten/RuteEinrichten.js',
  './js/seiten/RuteWieVorher.js',
  './js/seiten/Ruten.js',
  './js/seiten/Spot.js',
  './js/seiten/Sprache.js',
  './js/seiten/basis.js',
  './js/seiten/fangfluss.js',
  './js/seiten/gemeinsam.js',
  './js/seiten/uebergang.js',
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
  './js/vorlagen/Kontext.js',
  './js/vorlagen/Kontext.logik.js',
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
  './js/vorlagen/Rute.js',
  './js/vorlagen/Rute.logik.js',
  './js/vorlagen/RuteEinrichten.js',
  './js/vorlagen/RuteEinrichten.logik.js',
  './js/vorlagen/RuteWieVorher.js',
  './js/vorlagen/RuteWieVorher.logik.js',
  './js/vorlagen/Ruten.js',
  './js/vorlagen/Ruten.logik.js',
  './js/vorlagen/Spot.js',
  './js/vorlagen/Spot.logik.js',
  './js/vorlagen/Sprache.js',
  './js/vorlagen/Sprache.logik.js',
  './js/vorlagen/Steckbrief.js',
  './js/vorlagen/Steckbrief.logik.js',
  './js/vorlagen/Wiederfang.js',
  './js/vorlagen/Wiederfang.logik.js'
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
