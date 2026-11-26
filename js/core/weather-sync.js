// Wetter-Warteschlange: Einträge und Ansitze ohne Wetter werden nachgefüllt, sobald Netz da ist.
//
// weatherState:
//   "offen"       – noch kein Wetter
//   "vorlaeufig"  – Wert stammt aus einer Vorhersage und wird später durch Messwerte ersetzt
//   "ok"          – fertig
//   "ohne-ort"    – das Gewässer hat keine Koordinaten

import { entries, sessions, lakes } from './repo.js';
import { fetchPoint, fetchRange } from './weather.js';
import { emit } from './bus.js';
import { HOUR } from './util.js';

let running = null;

/** Füllt offene Wetterdaten. Läuft nie doppelt; ein zweiter Aufruf bekommt denselben Lauf. */
export function syncWeather(options) {
  if (!running) running = run(options || {}).finally(() => { running = null; });
  return running;
}

function due(record, now, force) {
  const state = record.weatherState || 'offen';
  if (state === 'ok') return false;
  if (force) return true;
  const tries = record.weatherTries || 0, last = record.weatherTryAt || 0;
  if (state === 'vorlaeufig') return now - last > 3 * HOUR;
  // Nach Fehlversuchen länger warten: 5, 10, 20 … Minuten, höchstens 6 Stunden.
  return now - last > Math.min(5 * 60000 * 2 ** tries, 6 * HOUR);
}

async function run({ limit = 25, force = false }) {
  const result = { done: 0, provisional: 0, failed: 0, noPlace: 0, offline: false, errors: [] };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { result.offline = true; return result; }

  const lakeById = new Map((await lakes.list({ withDeleted: true })).map(l => [l.id, l]));
  const now = Date.now();
  const jobs = [];
  (await entries.list()).forEach(e => { if (e.ts <= now + HOUR && due(e, now, force)) jobs.push({ repo: entries, rec: e, kind: 'point' }); });
  (await sessions.list()).forEach(s => { if (s.endTs != null && s.endTs <= now + HOUR && due(s, now, force)) jobs.push({ repo: sessions, rec: s, kind: 'range' }); });

  for (const job of jobs.slice(0, limit)) {
    const lake = lakeById.get(job.rec.lakeId);
    if (!lake || lake.lat == null || lake.lon == null) {
      if (job.rec.weatherState !== 'ohne-ort') await job.repo.patch(job.rec.id, { weatherState: 'ohne-ort' });
      result.noPlace++;
      continue;
    }
    try {
      const weather = job.kind === 'point'
        ? await fetchPoint(lake.lat, lake.lon, job.rec.ts)
        : await fetchRange(lake.lat, lake.lon, job.rec.startTs, job.rec.endTs);
      await job.repo.patch(job.rec.id, {
        weather,
        weatherState: weather.provisional ? 'vorlaeufig' : 'ok',
        weatherTries: 0, weatherTryAt: Date.now()
      });
      if (weather.provisional) result.provisional++; else result.done++;
    } catch (err) {
      result.failed++;
      const detail = err && err.causes && err.causes.length ? err.causes.join(' | ') : (err && err.message) || String(err);
      if (!result.errors.includes(detail)) result.errors.push(detail);
      await job.repo.patch(job.rec.id, { weatherTries: (job.rec.weatherTries || 0) + 1, weatherTryAt: Date.now() });
    }
  }
  emit('weather', result);
  return result;
}

/** Startet den Abgleich beim Öffnen und sobald das Gerät wieder Netz hat. */
export function startWeatherSync() {
  window.addEventListener('online', () => { syncWeather(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncWeather(); });
  return syncWeather();
}
