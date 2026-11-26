// Service Worker: hält die App-Dateien auf dem Gerät vor, damit sie ohne Netz startet.
// Bei jeder Veröffentlichung VERSION erhöhen (gleich wie APP_VERSION in js/core/version.js)
// und neue Dateien in SHELL eintragen. Sonst bekommen installierte Geräte die Änderung nicht.

const VERSION = '0.4.0';
const CACHE = 'fangbuch-' + VERSION;
const FONTS = 'schrift-1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/main.js',
  './js/core/version.js',
  './js/core/util.js',
  './js/core/bus.js',
  './js/core/db.js',
  './js/core/astro.js',
  './js/core/repo.js',
  './js/core/karte.js',
  './js/core/startdatei.js',
  './js/core/weather.js',
  './js/core/weather-sync.js',
  './js/core/backup.js',
  './js/core/geo.js',
  './js/core/photos.js',
  './js/core/pwa.js',
  './js/ui/app.js',
  './js/ui/daten.js',
  './js/ui/start.js',
  './js/ui/ansitz.js',
  './js/ui/karte.js',
  './js/ui/analyse.js',
  './js/ui/diagramm.js',
  './js/ui/auswertung.js',
  './js/ui/fische.js',
  './js/ui/planen.js',
  './js/ui/diagnose.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
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
