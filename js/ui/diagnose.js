// Technik-Test: prüft auf dem echten Handy, ob das Fundament trägt.
// Das ist NICHT die spätere Oberfläche. Aufbau und Aussehen werden gemeinsam festgelegt;
// dieser Bildschirm wird dann durch die richtigen Ansichten ersetzt.

import { on } from '../core/bus.js';
import { lakes, entries, sessions, settings, ValidationError } from '../core/repo.js';
import { syncWeather } from '../core/weather-sync.js';
import { exportData, importData, toCsv, handOut } from '../core/backup.js';
import { getPosition, nearestLake } from '../core/geo.js';
import { savePhoto, photosOf } from '../core/photos.js';
import { installState, promptInstall, storageInfo, applyUpdate } from '../core/pwa.js';
import { wipe } from '../core/db.js';
import { APP_VERSION } from '../core/version.js';
import { toLocalIso, fmt, isNum, pad } from '../core/util.js';

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  });
  kids.flat().forEach(kid => { if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid)); });
  return el;
}

const stamp = ts => { const d = new Date(ts); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const WEATHER_STATE = { offen: 'Wetter offen', vorlaeufig: 'Wetter vorläufig', ok: 'Wetter verknüpft', 'ohne-ort': 'Gewässer ohne Koordinaten' };

function weatherLine(w) {
  if (!w) return null;
  const parts = [];
  if (isNum(w.tempC)) parts.push(`Luft ${fmt(w.tempC)} °C`);
  if (isNum(w.nightMinC)) parts.push(`Nacht davor ${fmt(w.nightMinC)} °C`);
  if (isNum(w.pressureHpa)) parts.push(`${fmt(w.pressureHpa, 0)} hPa` + (isNum(w.pressure3h) ? ` (3 h: ${w.pressure3h > 0 ? '+' : ''}${fmt(w.pressure3h)})` : ''));
  if (w.windDir) parts.push(`Wind ${w.windDir}` + (isNum(w.windKmh) ? ` ${fmt(w.windKmh, 0)} km/h` : ''));
  if (isNum(w.cloudPct)) parts.push(`Wolken ${w.cloudPct} %`);
  if (isNum(w.precipMm)) parts.push(w.precipMm > 0 ? `Regen ${fmt(w.precipMm)} mm` : 'trocken');
  const src = [w.source, (w.stations || []).map(s => s.name).slice(0, 2).join(', ')].filter(Boolean).join(': ');
  return parts.join(' · ') + (src ? ` — ${src}` : '');
}

export function mountDiagnose(root) {
  const msg = h('p', { id: 'msg', role: 'status', 'aria-live': 'polite' });
  const say = text => { msg.textContent = text; };
  const guard = fn => async ev => {
    const btn = ev && ev.currentTarget && ev.currentTarget.tagName === 'BUTTON' ? ev.currentTarget : null;
    if (btn) btn.disabled = true;
    try { await fn(ev); }
    catch (err) { say(err instanceof ValidationError ? err.message : 'Fehler: ' + ((err && err.message) || err)); }
    finally { if (btn) btn.disabled = false; }
  };

  const facts = h('dl', { class: 'facts' });
  const updateBox = h('div', { class: 'note', hidden: true }, 'Eine neue Version ist bereit. ',
    h('button', { type: 'button', onclick: () => applyUpdate() }, 'Aktualisieren'));
  const installBtn = h('button', { type: 'button', hidden: true, onclick: guard(async () => { say('Installation: ' + await promptInstall()); refreshFacts(); }) }, 'App installieren');
  const lakeList = h('ul', { class: 'plain' });
  const lakeSelect = h('select', { id: 'd-lake', 'aria-label': 'Gewässer für den Testeintrag' });
  const entryList = h('ul', { class: 'plain' });
  const fName = h('input', { type: 'text', id: 'd-name', placeholder: 'z. B. Baggersee Nord' });
  const fShort = h('input', { type: 'text', id: 'd-short', placeholder: 'z. B. BSN' });
  const fLat = h('input', { type: 'text', id: 'd-lat', inputmode: 'decimal', placeholder: '51,16' });
  const fLon = h('input', { type: 'text', id: 'd-lon', inputmode: 'decimal', placeholder: '10,45' });
  const photoBox = h('div');

  async function refreshFacts() {
    const st = installState(), info = await storageInfo(), last = await settings.get('lastBackupAt');
    const yes = t => h('span', { class: 'ok' }, t), no = t => h('span', { class: 'no' }, t), wait = t => h('span', { class: 'wait' }, t);
    const how = st.platform === 'ios' ? 'In Safari: Teilen, dann „Zum Home-Bildschirm“.'
      : st.platform === 'android' ? 'In Chrome: Menü ⋮, dann „App installieren“.' : 'Im Browser-Menü „Installieren“ wählen.';
    const rows = [
      ['Version', APP_VERSION],
      ['Läuft als App', st.standalone ? yes('ja') : wait('nein, im Browser. ' + how)],
      ['Startet ohne Netz', info.workerActive ? yes('ja') : wait('noch nicht, Seite einmal neu laden')],
      ['Daten dauerhaft', info.persisted === true ? yes('ja') : info.persisted === false ? wait('nicht zugesichert') : 'unbekannt'],
      ['Speicher belegt', info.usageMb == null ? 'unbekannt' : `${fmt(info.usageMb)} MB von ${fmt(info.quotaMb, 0)} MB`],
      ['Netz', navigator.onLine ? yes('verbunden') : no('kein Netz')],
      ['Letzte Sicherung', last ? stamp(last) : wait('noch keine')]
    ];
    facts.replaceChildren(...rows.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)]));
    installBtn.hidden = !st.canPrompt || st.standalone;
  }

  async function refreshData() {
    const ls = await lakes.list();
    const keep = lakeSelect.value;
    lakeList.replaceChildren(...(ls.length ? ls.map(l => h('li', null,
      h('b', null, `${l.short} · ${l.name}`),
      l.lat == null ? 'ohne Koordinaten (kein Wetter, keine Sonnenzeiten)' : `${fmt(l.lat, 4)} N, ${fmt(l.lon, 4)} O`,
      ' ', h('button', { type: 'button', class: 'danger', onclick: guard(async () => { await lakes.remove(l.id); say('Gewässer entfernt.'); }) }, 'Entfernen')))
      : [h('li', { class: 'muted' }, 'Noch kein Gewässer angelegt.')]));
    lakeSelect.replaceChildren(...ls.map(l => h('option', { value: l.id }, `${l.short} · ${l.name}`)));
    if (keep) lakeSelect.value = keep;

    const lakeById = new Map(ls.map(l => [l.id, l]));
    const es = (await entries.list()).sort((a, b) => b.ts - a.ts).slice(0, 20);
    const items = [];
    for (const e of es) {
      const c = e.ctx || {}, lake = lakeById.get(e.lakeId);
      const pics = await photosOf(e.id);
      items.push(h('li', null,
        h('b', null, `${stamp(e.ts)} · ${lake ? lake.short : '?'} · ${e.type}${e.species ? ' · ' + e.species : ''}`),
        [c.dayPhase, c.sunrise ? `Sonne ${c.sunrise}–${c.sunset}` : null, `Mond: ${c.moonName}, ${c.moonIllum} %`].filter(Boolean).join(' · '),
        h('div', null, weatherLine(e.weather) || WEATHER_STATE[e.weatherState] || 'Wetter offen',
          e.weatherState === 'vorlaeufig' ? ' (vorläufig)' : ''),
        pics.length ? h('div', { class: 'small muted' }, `${pics.length} Foto${pics.length > 1 ? 's' : ''}` + (pics[0].takenAt ? `, aufgenommen ${pics[0].takenAt.replace('T', ' ')}` : '')) : null,
        h('button', { type: 'button', class: 'danger', onclick: guard(async () => { await entries.remove(e.id); say('Eintrag entfernt.'); }) }, 'Entfernen')));
    }
    entryList.replaceChildren(...(items.length ? items : [h('li', { class: 'muted' }, 'Noch keine Einträge.')]));
    refreshFacts();
  }

  const saveLake = guard(async () => {
    const lake = await lakes.save({ name: fName.value, short: fShort.value, lat: fLat.value, lon: fLon.value });
    [fName, fShort, fLat, fLon].forEach(f => { f.value = ''; });
    say(`Gewässer „${lake.name}“ gespeichert.`);
  });
  const useLocation = guard(async () => {
    say('Standort wird abgefragt …');
    const pos = await getPosition();
    fLat.value = fmt(pos.lat, 5); fLon.value = fmt(pos.lon, 5);
    const near = nearestLake(pos, await lakes.list());
    say(`Standort auf ${pos.accuracyM} m genau.` + (near ? ` Nächstes Gewässer: ${near.lake.name}, ${fmt(near.distanceM / 1000)} km.` : ''));
  });
  const reportWeather = r => say(r.offline ? 'Kein Netz. Das Wetter wird automatisch nachgeholt.'
    : r.failed ? `Wetter nicht erreichbar: ${r.errors.join(' | ')}`
    : r.noPlace ? 'Das Gewässer hat keine Koordinaten, deshalb gibt es kein Wetter.'
    : `Wetter verknüpft: ${r.done} fertig, ${r.provisional} vorläufig.`);
  const testEntry = guard(async () => {
    if (!lakeSelect.value) { say('Bitte zuerst ein Gewässer anlegen.'); return; }
    await entries.save({ lakeId: lakeSelect.value, type: 'fang', species: 'Testfisch', time: toLocalIso(new Date()), notes: 'Technik-Test' });
    say('Eintrag gespeichert. Wetter wird abgerufen …');
    reportWeather(await syncWeather({ force: true }));
  });
  const fetchWeather = guard(async () => { say('Wetter wird abgerufen …'); reportWeather(await syncWeather({ force: true })); });
  const addPhoto = guard(async ev => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const latest = (await entries.list()).sort((a, b) => b.ts - a.ts)[0];
    if (!latest) { say('Bitte zuerst einen Testeintrag speichern.'); return; }
    const photo = await savePhoto(latest.id, file);
    const url = URL.createObjectURL(photo.thumb);
    photoBox.replaceChildren(h('img', { class: 'thumb', src: url, alt: 'Vorschau des gespeicherten Fotos' }));
    say(`Foto gespeichert (${photo.w} × ${photo.h} px, ${fmt(photo.blob.size / 1024, 0)} kB).` + (photo.takenAt ? ` Aufnahmezeit: ${photo.takenAt.replace('T', ' ')}.` : ' Keine Aufnahmezeit im Bild.'));
    ev.target.value = '';
  });
  const doExport = guard(async () => {
    const backup = await exportData();
    const how = await handOut(`fangbuch-sicherung-${backup.exportedAt.slice(0, 10)}.json`, JSON.stringify(backup), 'application/json');
    say(how === 'cancelled' ? 'Sicherung abgebrochen.' : 'Sicherung erstellt.');
    refreshFacts();
  });
  const doCsv = guard(async () => {
    const how = await handOut(`fangbuch-${toLocalIso(new Date()).slice(0, 10)}.csv`, toCsv(await entries.list(), await lakes.list()), 'text/csv');
    say(how === 'cancelled' ? 'Abgebrochen.' : 'CSV erstellt.');
  });
  const doImport = guard(async ev => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    let parsed;
    try { parsed = JSON.parse(await file.text()); } catch (err) { throw new Error('Die Datei ist keine lesbare Sicherung.'); }
    const r = await importData(parsed);
    say(`Eingelesen: ${r.added} neu, ${r.updated} aktualisiert, ${r.skipped} unverändert.`);
    ev.target.value = '';
    syncWeather();
  });
  let armed = 0;
  const wipeAll = guard(async ev => {
    if (Date.now() - armed > 5000) { armed = Date.now(); ev.currentTarget.textContent = 'Wirklich alles löschen? Noch einmal tippen'; return; }
    await wipe(['lakes', 'spots', 'sessions', 'entries', 'photos']);
    ev.currentTarget.textContent = 'Alles auf diesem Gerät löschen';
    armed = 0;
    say('Alle Daten auf diesem Gerät gelöscht.');
    refreshData();
  });

  root.replaceChildren(
    h('header', null, h('h1', null, 'Fangbuch'), h('p', { class: 'muted' }, 'Technik-Test')),
    h('p', { class: 'note' }, 'Das ist nur der Prüfstand für das Fundament. Funktionen, Aufbau und Aussehen der App legen wir gemeinsam fest.'),
    updateBox,
    msg,
    h('section', { class: 'card' }, h('h2', null, '1 · Zustand'), facts, h('div', { class: 'row' }, installBtn)),
    h('section', { class: 'card' }, h('h2', null, '2 · Gewässer'), lakeList,
      h('label', { class: 'field' }, 'Name', fName),
      h('div', { class: 'grid2' }, h('label', { class: 'field' }, 'Kürzel', fShort), h('span')),
      h('div', { class: 'grid2' }, h('label', { class: 'field' }, 'Breite', fLat), h('label', { class: 'field' }, 'Länge', fLon)),
      h('div', { class: 'row' },
        h('button', { type: 'button', onclick: useLocation }, 'Meinen Standort einsetzen'),
        h('button', { type: 'button', class: 'primary', onclick: saveLake }, 'Gewässer speichern'))),
    h('section', { class: 'card' }, h('h2', null, '3 · Eintrag, Sonne, Mond, Wetter'), lakeSelect,
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'primary', onclick: testEntry }, 'Testfang jetzt speichern'),
        h('button', { type: 'button', onclick: fetchWeather }, 'Wetter erneut abrufen')),
      entryList),
    h('section', { class: 'card' }, h('h2', null, '4 · Foto'),
      h('p', { class: 'small muted' }, 'Hängt ein Foto an den neuesten Eintrag und liest die Aufnahmezeit.'),
      h('input', { type: 'file', id: 'd-photo', accept: 'image/*', 'aria-label': 'Foto wählen', onchange: addPhoto }), photoBox),
    h('section', { class: 'card' }, h('h2', null, '5 · Sicherung'),
      h('div', { class: 'row' },
        h('button', { type: 'button', onclick: doExport }, 'Sicherung erstellen'),
        h('button', { type: 'button', onclick: doCsv }, 'CSV erstellen')),
      h('label', { class: 'field' }, 'Sicherung einlesen', h('input', { type: 'file', id: 'd-import', accept: '.json,application/json', onchange: doImport })),
      h('button', { type: 'button', class: 'danger', onclick: wipeAll }, 'Alles auf diesem Gerät löschen'))
  );

  on('data', () => refreshData());
  on('weather', r => { if (r && (r.done || r.provisional) && !r.failed) say(`Wetter verknüpft: ${r.done} fertig, ${r.provisional} vorläufig.`); refreshData(); });
  on('settings', () => refreshFacts());
  on('pwa', detail => { if (detail.updateReady) updateBox.hidden = false; refreshFacts(); });
  window.addEventListener('online', refreshFacts);
  window.addEventListener('offline', refreshFacts);
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('controllerchange', refreshFacts);
  refreshData();
  void sessions; // Ansitze haben noch keinen Testknopf; die Datenebene ist in den Tests abgedeckt.
}
