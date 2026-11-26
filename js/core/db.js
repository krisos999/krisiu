// Speicher auf dem Gerät (IndexedDB). Nur hier wird die Datenbank direkt angefasst.
// Neue Felder brauchen keine Migration. Neue Tabellen oder Indizes bekommen einen
// weiteren Eintrag in MIGRATIONS; bestehende Einträge werden nie geändert.

import { DB_NAME } from './version.js';

const MIGRATIONS = [
  function v1(db) {
    db.createObjectStore('lakes', { keyPath: 'id' });

    const spots = db.createObjectStore('spots', { keyPath: 'id' });
    spots.createIndex('lakeId', 'lakeId');

    const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
    sessions.createIndex('lakeId', 'lakeId');
    sessions.createIndex('startTs', 'startTs');

    const entries = db.createObjectStore('entries', { keyPath: 'id' });
    entries.createIndex('lakeId', 'lakeId');
    entries.createIndex('ts', 'ts');
    entries.createIndex('weatherState', 'weatherState');

    const photos = db.createObjectStore('photos', { keyPath: 'id' });
    photos.createIndex('entryId', 'entryId');

    db.createObjectStore('meta', { keyPath: 'key' });
  }
];

export const DB_VERSION = MIGRATIONS.length;
export const DATA_STORES = ['lakes', 'spots', 'sessions', 'entries'];
export const ALL_STORES = [...DATA_STORES, 'photos', 'meta'];

let dbPromise = null;

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ev => {
      for (let v = ev.oldVersion; v < DB_VERSION; v++) MIGRATIONS[v](req.result, req.transaction);
    };
    req.onsuccess = () => {
      const db = req.result;
      // Eine neuere App-Version in einem anderen Fenster will die Datenbank umbauen: Platz machen.
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

/** Führt work() in einer Transaktion aus. Fertig ist erst, wenn die Transaktion abgeschlossen ist. */
function run(storeNames, mode, work) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Speichern abgebrochen'));
    const stores = {};
    [].concat(storeNames).forEach(name => { stores[name] = tx.objectStore(name); });
    work(stores, value => { result = value; });
  }));
}

const read = (store, makeRequest) => run(store, 'readonly', (s, done) => {
  const req = makeRequest(s[store]);
  req.onsuccess = () => done(req.result);
});

export const get = (store, key) => read(store, s => s.get(key));
export const getAll = store => read(store, s => s.getAll());
export const getAllByIndex = (store, index, query) => read(store, s => s.index(index).getAll(query));
export const count = store => read(store, s => s.count());

export const put = (store, value) => run(store, 'readwrite', (s, done) => { s[store].put(value); done(value); });
export const putMany = (store, values) => run(store, 'readwrite', (s, done) => {
  values.forEach(v => s[store].put(v));
  done(values.length);
});
export const del = (store, key) => run(store, 'readwrite', (s, done) => { s[store].delete(key); done(true); });

/** Leert die genannten Tabellen (Standard: alle). Nur für "Alles löschen" und Tests. */
export const wipe = (stores = ALL_STORES) => run(stores, 'readwrite', (s, done) => {
  stores.forEach(name => s[name].clear());
  done(true);
});
