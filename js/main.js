// Einstieg: Speicher öffnen, Oberfläche einhängen, Offline-Betrieb und Wetter-Abgleich starten.

import { openDb } from './core/db.js';
import { registerServiceWorker, checkForUpdate, requestPersistence, applyUpdate } from './core/pwa.js';
import { startWeatherSync } from './core/weather-sync.js';
import { on } from './core/bus.js';
import { show, toast } from './ui/app.js';
import './ui/start.js';
import './ui/ansitz.js';
import './ui/karte.js';
import './ui/auswertung.js';
import './ui/fische.js';
import './ui/planen.js';
import './seiten/Main.js';
import './seiten/Ansitz.js';
import './seiten/ChancenHeute.js';
import './seiten/Fang.js';
import './seiten/Rute.js';
import './seiten/RuteWieVorher.js';
import './seiten/Ruten.js';
import './seiten/RuteEinrichten.js';
import './seiten/Spot.js';
import './seiten/Futter.js';
import './seiten/Beenden.js';
import './seiten/Sprache.js';
import './seiten/uebergang.js';

async function start() {
  const root = document.getElementById('app');
  try {
    await openDb();
  } catch (err) {
    root.textContent = 'Der Speicher dieses Geräts ist hier nicht verfügbar (zum Beispiel im privaten Modus). Bitte die App normal im Browser öffnen.';
    return;
  }
  window.addEventListener('hashchange', show);
  await show();
  registerServiceWorker().then(checkForUpdate);
  requestPersistence();
  startWeatherSync();
  on('pwa', d => { if (d && d.updateReady) toast('Neue Version da – tippen zum Aktualisieren', { ms: 8000 }); });
  document.addEventListener('click', ev => { if (ev.target.closest && ev.target.closest('.toast') && applyUpdate()) toast('Wird aktualisiert …'); });
}

start();
