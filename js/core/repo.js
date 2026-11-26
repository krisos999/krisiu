// Fachliche Datenebene: Gewässer, Spots, Ansitze, Einträge, Einstellungen.
// Die Oberfläche spricht nur mit diesem Modul, nie direkt mit db.js.
//
// Jeder Datensatz trägt: id, createdAt, updatedAt, deletedAt.
// Gelöscht wird mit Löschmarke (deletedAt). So bleibt ein späterer Abgleich
// zwischen Geräten oder ein gemeinsamer Topf möglich, ohne das Datenmodell umzubauen.

import * as db from './db.js';
import { emit } from './bus.js';
import { context } from './astro.js';
import { newId, parseLocal, hasTime, isNum, num } from './util.js';

export const ENTRY_TYPES = ['fang', 'verloren', 'fehlbiss', 'beobachtung'];

export class ValidationError extends Error {
  constructor(message, field) { super(message); this.name = 'ValidationError'; this.field = field; }
}
const fail = (message, field) => { throw new ValidationError(message, field); };

const text = v => (v == null ? null : String(v).trim() || null);
function optNumber(v, field, min, max, label) {
  const n = num(v);
  if (n === null) return null;
  if (Number.isNaN(n)) fail(`${label}: Die Zahl ist nicht lesbar.`, field);
  if (n < min || n > max) fail(`${label} wirkt nicht plausibel.`, field);
  return n;
}

function makeRepo(store, prefix, normalize) {
  return {
    /** Alle Datensätze ohne gelöschte. `withDeleted: true` liefert auch Löschmarken. */
    async list(opts = {}) {
      const all = await db.getAll(store);
      return opts.withDeleted ? all : all.filter(r => !r.deletedAt);
    },
    get: id => db.get(store, id),
    /** Legt an oder ändert. Prüft die Angaben und wirft ValidationError mit deutschem Text. */
    async save(record) {
      const existing = record.id ? await db.get(store, record.id) : null;
      const now = Date.now();
      let out = Object.assign({}, existing, record, {
        id: (existing && existing.id) || record.id || newId(prefix),
        createdAt: (existing && existing.createdAt) || now,
        updatedAt: now,
        deletedAt: null
      });
      out = await normalize(out, existing);
      await db.put(store, out);
      emit('data', { store, id: out.id });
      return out;
    },
    /** Technische Ergänzung (z. B. Wetter): ohne Prüfung und ohne neuen Änderungsstempel. */
    async patch(id, fields) {
      const current = await db.get(store, id);
      if (!current) return null;
      const out = Object.assign({}, current, fields);
      await db.put(store, out);
      emit('data', { store, id });
      return out;
    },
    /** Setzt die Löschmarke. Der Datensatz verschwindet aus list(), bleibt aber für den Abgleich erhalten. */
    async remove(id) {
      const current = await db.get(store, id);
      if (!current || current.deletedAt) return false;
      const now = Date.now();
      await db.put(store, Object.assign({}, current, { deletedAt: now, updatedAt: now }));
      emit('data', { store, id });
      return true;
    }
  };
}

async function requireLake(lakeId) {
  const lake = lakeId ? await db.get('lakes', lakeId) : null;
  if (!lake || lake.deletedAt) fail('Bitte ein Gewässer wählen.', 'lakeId');
  return lake;
}

/* ---------- Gewässer ---------- */
export const lakes = makeRepo('lakes', 'l', async lake => {
  lake.name = text(lake.name) || fail('Das Gewässer braucht einen Namen.', 'name');
  lake.short = (text(lake.short) || lake.name.replace(/[^A-Za-zÄÖÜäöü0-9]/g, '').slice(0, 4)).toUpperCase();
  lake.lat = optNumber(lake.lat, 'lat', -90, 90, 'Breite');
  lake.lon = optNumber(lake.lon, 'lon', -180, 180, 'Länge');
  if ((lake.lat == null) !== (lake.lon == null)) fail('Bitte Breite und Länge beide angeben oder beide leer lassen.', 'lat');
  lake.elevationM = optNumber(lake.elevationM, 'elevationM', -430, 5000, 'Höhe');
  lake.note = text(lake.note);
  return lake;
});

/* ---------- Spots (Ablagestellen) ---------- */
export const spots = makeRepo('spots', 's', async spot => {
  await requireLake(spot.lakeId);
  spot.name = text(spot.name) || fail('Der Spot braucht einen Namen.', 'name');
  spot.depthM = optNumber(spot.depthM, 'depthM', 0, 100, 'Tiefe');
  spot.lat = optNumber(spot.lat, 'lat', -90, 90, 'Breite');
  spot.lon = optNumber(spot.lon, 'lon', -180, 180, 'Länge');
  spot.ground = text(spot.ground);
  spot.note = text(spot.note);
  return spot;
});

/* ---------- Ansitze ---------- */
export const sessions = makeRepo('sessions', 'a', async (s, existing) => {
  await requireLake(s.lakeId);
  const start = parseLocal(s.start) || fail('Bitte den Beginn angeben.', 'start');
  let end = null;
  if (s.end) {
    end = parseLocal(s.end) || fail('Das Ende ist nicht lesbar.', 'end');
    if (!hasTime(s.end)) end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59);
    if (end.getTime() < start.getTime()) fail('Das Ende liegt vor dem Beginn.', 'end');
  } else {
    s.end = null;
  }
  s.startTs = start.getTime();
  s.endTs = end ? end.getTime() : null;
  s.timed = hasTime(s.start) && (!s.end || hasTime(s.end));
  s.rods = optNumber(s.rods, 'rods', 1, 12, 'Rutenzahl');
  s.fishCount = optNumber(s.fishCount, 'fishCount', 0, 500, 'Fische gesamt');
  s.bitesCount = optNumber(s.bitesCount, 'bitesCount', 0, 1000, 'Bisse gesamt');
  s.forecastStars = optNumber(s.forecastStars, 'forecastStars', 1, 5, 'Prognose');
  s.waterTempC = optNumber(s.waterTempC, 'waterTempC', -1, 40, 'Wassertemperatur');
  s.swim = text(s.swim);
  s.notes = text(s.notes);
  const moved = !existing || existing.start !== s.start || existing.end !== s.end || existing.lakeId !== s.lakeId;
  if (moved || s.weather === undefined) { s.weather = null; s.weatherState = 'offen'; s.weatherTries = 0; }
  return s;
});

/* ---------- Einträge: Fang, verlorener Fisch, Fehlbiss, Beobachtung ---------- */
export const entries = makeRepo('entries', 'e', async (e, existing) => {
  const lake = await requireLake(e.lakeId);
  if (!ENTRY_TYPES.includes(e.type)) fail('Unbekannte Art von Eintrag.', 'type');
  if (!hasTime(e.time)) fail('Bitte den Zeitpunkt mit Uhrzeit angeben.', 'time');
  const when = parseLocal(e.time) || fail('Der Zeitpunkt ist nicht lesbar.', 'time');
  if (when.getTime() > Date.now() + 10 * 60000) fail('Der Zeitpunkt liegt in der Zukunft.', 'time');
  e.ts = when.getTime();
  e.tzOffsetMin = -when.getTimezoneOffset();

  const isFish = e.type === 'fang';
  e.species = isFish || e.type === 'verloren' ? text(e.species) : null;
  if (isFish && !e.species) fail('Bitte die Fischart angeben.', 'species');
  e.weightKg = isFish ? optNumber(e.weightKg, 'weightKg', 0.01, 150, 'Gewicht') : null;
  e.lengthCm = isFish ? optNumber(e.lengthCm, 'lengthCm', 1, 300, 'Länge') : null;
  e.depthM = optNumber(e.depthM, 'depthM', 0, 100, 'Tiefe');
  e.waterTempC = optNumber(e.waterTempC, 'waterTempC', -1, 40, 'Wassertemperatur');
  e.pressureOwnHpa = optNumber(e.pressureOwnHpa, 'pressureOwnHpa', 850, 1090, 'Luftdruck');
  ['spotId', 'spotName', 'rod', 'bait', 'rig', 'feed', 'notes', 'kind', 'sessionId'].forEach(k => { e[k] = text(e[k]); });
  if (e.type === 'beobachtung' && !e.kind && !e.notes) fail('Bitte angeben, was du gesehen hast.', 'kind');
  if (e.pos && !(isNum(e.pos.lat) && isNum(e.pos.lon))) e.pos = null;

  e.ctx = context(when, lake.lat, lake.lon);
  const moved = !existing || existing.time !== e.time || existing.lakeId !== e.lakeId;
  if (moved || e.weather === undefined) { e.weather = null; e.weatherState = 'offen'; e.weatherTries = 0; }
  return e;
});

/* ---------- Einstellungen und Geräte-Kennung ---------- */
export const settings = {
  async get(key, fallback = null) {
    const row = await db.get('meta', key);
    return row ? row.value : fallback;
  },
  async set(key, value) {
    await db.put('meta', { key, value, updatedAt: Date.now() });
    emit('settings', { key });
  }
};

export async function deviceId() {
  let id = await settings.get('deviceId');
  if (!id) { id = newId('dev'); await settings.set('deviceId', id); }
  return id;
}

/** Zeitraum eines Ansitzes in Millisekunden; laufende Ansitze enden "jetzt". */
export const sessionRange = s => ({ from: s.startTs, to: s.endTs == null ? Date.now() : s.endTs });

/** Einträge, die nach See und Zeit in einen Ansitz fallen. */
export const entriesOfSession = (s, allEntries) => {
  const r = sessionRange(s);
  return allEntries.filter(e => e.lakeId === s.lakeId && e.ts >= r.from && e.ts <= r.to);
};
