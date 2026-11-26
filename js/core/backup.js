// Sicherung: alles als eine Datei hinaus und wieder hinein.
// Dieselbe Datei dient zum Handywechsel, zum Weitergeben an Kollegen und zur Auswertung.
//
// Einlesen mischt: Datensätze werden über ihre Kennung abgeglichen, der neuere Stand gewinnt.
// Löschmarken reisen mit, damit Gelöschtes gelöscht bleibt.

import * as db from './db.js';
import { deviceId, settings } from './repo.js';
import { emit } from './bus.js';
import { APP_VERSION, BACKUP_FORMAT, BACKUP_VERSION } from './version.js';
import { isNum } from './util.js';

const blobToDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});
const dataUrlToBlob = url => fetch(url).then(r => r.blob());

/** Baut das Sicherungs-Objekt. Fotos sind groß und nur auf Wunsch dabei. */
export async function exportData({ photos = false } = {}) {
  const data = {};
  for (const store of db.DATA_STORES) data[store] = await db.getAll(store);
  if (photos) {
    data.photos = [];
    for (const p of await db.getAll('photos')) {
      data.photos.push(Object.assign({}, p, {
        blob: p.blob ? await blobToDataUrl(p.blob) : null,
        thumb: p.thumb ? await blobToDataUrl(p.thumb) : null
      }));
    }
  }
  const counts = {};
  Object.keys(data).forEach(k => { counts[k] = data[k].filter(r => !r.deletedAt).length; });
  await settings.set('lastBackupAt', Date.now());
  return {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, app: APP_VERSION, schema: db.DB_VERSION,
    exportedAt: new Date().toISOString(), deviceId: await deviceId(), counts, data
  };
}

/** Liest eine Sicherung ein und mischt sie in den Bestand. Liefert, was neu, geändert oder übersprungen wurde. */
export async function importData(backup) {
  if (!backup || backup.format !== BACKUP_FORMAT) throw new Error('Das ist keine Fangbuch-Sicherung.');
  if (!(backup.version <= BACKUP_VERSION)) throw new Error('Die Sicherung stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.');
  const summary = { added: 0, updated: 0, skipped: 0 };
  const stores = [...db.DATA_STORES, 'photos'];
  for (const store of stores) {
    const incoming = (backup.data && backup.data[store]) || [];
    const current = new Map((await db.getAll(store)).map(r => [r.id, r]));
    const write = [];
    for (let rec of incoming) {
      if (!rec || typeof rec.id !== 'string') { summary.skipped++; continue; }
      const mine = current.get(rec.id);
      if (mine && (mine.updatedAt || 0) >= (rec.updatedAt || 0)) { summary.skipped++; continue; }
      if (store === 'photos') {
        rec = Object.assign({}, rec, {
          blob: rec.blob ? await dataUrlToBlob(rec.blob) : null,
          thumb: rec.thumb ? await dataUrlToBlob(rec.thumb) : null
        });
      }
      write.push(rec);
      if (mine) summary.updated++; else summary.added++;
    }
    if (write.length) await db.putMany(store, write);
  }
  emit('data', { store: '*' });
  return summary;
}

/** Einträge als CSV für Excel (Semikolon, Dezimalkomma). */
export function toCsv(entries, lakes) {
  const lakeName = new Map(lakes.map(l => [l.id, l.short || l.name]));
  const cols = ['Gewässer', 'Art des Eintrags', 'Zeit', 'Fischart', 'Gewicht kg', 'Länge cm', 'Spot', 'Tiefe m', 'Rute',
    'Köder', 'Montage', 'Futter', 'Wasser °C', 'Tagesphase', 'Sonnenaufgang', 'Sonnenuntergang', 'Mond', 'Mond %',
    'Luft °C', 'Nacht davor °C', 'Druck hPa', 'Druck 3 h', 'Druck 24 h', 'Wind', 'Wind km/h', 'Wolken %', 'Regen mm', 'Wetterquelle', 'Notiz'];
  const cell = v => {
    if (v == null) return '';
    const s = isNum(v) ? String(v).replace('.', ',') : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = entries.filter(e => !e.deletedAt).sort((a, b) => a.ts - b.ts).map(e => {
    const c = e.ctx || {}, w = e.weather || {};
    return [lakeName.get(e.lakeId) || '', e.type, e.time, e.species, e.weightKg, e.lengthCm, e.spotName, e.depthM, e.rod,
      e.bait, e.rig, e.feed, e.waterTempC, c.dayPhase, c.sunrise, c.sunset, c.moonName, c.moonIllum,
      w.tempC, w.nightMinC, w.pressureHpa, w.pressure3h, w.pressure24h, w.windDir, w.windKmh, w.cloudPct, w.precipMm, w.source,
      e.type === 'beobachtung' ? [e.kind, e.notes].filter(Boolean).join(': ') : e.notes].map(cell).join(';');
  });
  return '﻿' + cols.join(';') + '\n' + rows.join('\n');
}

/**
 * Gibt eine Datei heraus: auf dem Handy über "Teilen" (WhatsApp, Mail, Dateien),
 * sonst als Download. Liefert "shared", "downloaded" oder "cancelled".
 */
export async function handOut(filename, content, mime) {
  const file = new File([content], filename, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return 'shared'; }
    catch (err) { if (err && err.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'downloaded';
}
