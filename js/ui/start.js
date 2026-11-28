// Start, Gewässer, Logbuch, Auswertung, Krisiu, Einstellungen.

import { lakes, sessions, entries, mapOf, spotsOf } from '../core/repo.js';
import { istStartdatei, importStart, startText } from '../core/startdatei.js';
import { getPosition, nearestLake } from '../core/geo.js';
import { exportData, importData, toCsv, handOut } from '../core/backup.js';
import { installState, promptInstall } from '../core/pwa.js';
import { syncWeather } from '../core/weather-sync.js';
import { APP_NAME, APP_VERSION } from '../core/version.js';
import { h, icon, route, go, seite, kopf, lbl, k, krisiuTab, chips, toast, sicher, uhrzeit, datumKurz, datumLang, dauer, zahl } from './app.js';
import { jetzt, alleSeen, laufenderAnsitz, beendeteAnsitze, zahlen, wetterJetzt, krisiuLage, krisiuHinweise, STIMMUNG } from './daten.js';
import { mountDiagnose } from './diagnose.js';
import { krisiuFrage } from './planen.js';

const krisiuZeile = lage => {
  const [emo, , farbe] = STIMMUNG[lage.art] || ['🙂', '', ''];
  return h('a', { class: 'krisiu-zeile' + (farbe ? ' ' + farbe : ''), href: '#/krisiu' }, k(22), h('span', {}, emo + ' ' + lage.text));
};

/* ---------- 1 · Start ---------- */
route('start', async () => {
  const lauf = await laufenderAnsitz();
  const lage = await krisiuLage();
  const fertig = await beendeteAnsitze();
  const letzter = fertig[0];
  let letzteKarte = null;
  if (letzter) {
    const lk = await lakes.get(letzter.lakeId), z = await zahlen(letzter);
    letzteKarte = h('button', { class: 'eintrag', type: 'button', onclick: () => go('auswertung', letzter.id) },
      h('span', { class: 'text' }, h('span', { class: 'lbl' }, 'Letzter Ansitz'), h('span', { class: 'titel', style: 'font-size:16px' }, (lk ? lk.short : '') + ' · ' + datumKurz(new Date(letzter.startTs)))),
      h('span', { class: 'zahl', style: 'font-size:24px' }, z.fische + (z.fische === 1 ? ' Fisch' : ' Fische')));
  }
  const starten = async () => {
    if (lauf) return go('ansitz');
    const seen = await alleSeen();
    if (!seen.length) return go('gewaesser', 'neu');
    go('gewaesser');
  };
  const d = new Date();
  const frageBox = h('div', { class: 'block', hidden: true });
  if (!lauf) krisiuFrage().then(f => {
    if (!f) return;
    frageBox.replaceChildren(h('div', { class: 'hinweis' }, h('div', { class: 'kopfzeile' }, k(22), 'Krisiu fragt'), h('p', { style: 'margin:0' }, f.text),
      h('div', { class: 'block eng' }, h('button', { class: 'btn rot', type: 'button', style: 'height:48px;font-size:18px', onclick: f.planen }, 'Ansitz planen'),
        h('button', { class: 'btn neutral', type: 'button', style: 'height:44px;font-size:15px', onclick: async () => { await f.keineZeit(); frageBox.hidden = true; } }, 'Keine Zeit diese Woche'))));
    frageBox.hidden = false;
  });
  return seite([
    krisiuTab(STIMMUNG[lage.art] ? STIMMUNG[lage.art][0] : null),
    h('div', { class: 'block', style: 'gap:14px' }, h('p', { class: 'datum', style: 'margin:0' }, datumLang(d) + ' · ' + uhrzeit(d) + ' Uhr'), krisiuZeile(lage)),
    h('h1', { class: 'gross' }, lauf ? 'Du bist am Wasser.' : 'Bist du am Wasser?'),
    h('div', { class: 'block', style: 'gap:12px' },
      h('button', { class: 'btn rot hero', type: 'button', onclick: starten }, lauf ? 'Zum Ansitz' : 'Angeln starten'),
      h('button', { class: 'btn neutral', type: 'button', style: 'height:64px', onclick: () => go('planen') },
        k(28), 'Ansitz planen')),
    frageBox,
    h('div', { class: 'block', style: 'gap:10px' }, letzteKarte,
      h('div', { style: 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px' },
        h('button', { class: 'btn neutral', type: 'button', style: 'height:48px;font-size:16px', onclick: () => go('logbuch') }, 'Logbuch'),
        h('button', { class: 'btn neutral', type: 'button', style: 'height:48px;font-size:16px', onclick: () => go('nachtragen') }, 'Nachtragen'),
        h('button', { class: 'btn neutral', type: 'button', style: 'height:48px;font-size:16px', onclick: () => go('einstellungen') }, 'Mehr')))
  ], { voll: true });
});

/* ---------- Gewässer wählen / anlegen, dann Ansitz starten ---------- */
route('gewaesser', async modus => {
  const seen = await alleSeen();
  if (modus === 'neu' || !seen.length) return gewaesserNeu();
  let wahl = seen[0].id;
  const box = chips(seen.map(l => [l.id, l.short + ' · ' + l.name]), wahl, { onchange: v => { wahl = v; } });
  const hinweis = h('p', { class: 'klein' }, 'Standort wird gesucht …');
  getPosition({ timeoutMs: 8000 }).then(pos => {
    const n = nearestLake(pos, seen);
    if (n) { wahl = n.lake.id; box.setze(wahl); hinweis.textContent = 'Am nächsten: ' + n.lake.name + ' (' + (n.distanceM < 1000 ? n.distanceM + ' m' : zahl(n.distanceM / 1000) + ' km') + ')'; }
    else hinweis.textContent = '';
  }).catch(() => { hinweis.textContent = 'Ohne Standort – bitte selbst wählen.'; });
  const rods = chips([[1, '1'], [2, '2'], [3, '3'], [4, '4']], 2, { raster: true });
  const los = async () => {
    const n = rods.wert() || 2;
    const s = await sicher(() => sessions.save({ lakeId: wahl, start: jetzt(), rods: n, rodSetups: Array.from({ length: n }, (_, i) => ({ nr: i + 1 })), feedings: [] }));
    if (s) { toast('Petri Heil! Ansitz läuft seit ' + s.start.slice(11) + '.'); go('ansitz'); }
  };
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'start' }), h('h1', {}, 'Wo angelst du?'), hinweis),
    h('div', { class: 'block' }, lbl('Gewässer'), box, h('button', { class: 'zurueck', type: 'button', onclick: () => go('gewaesser', 'neu'), style: 'color:#00FF5E' }, icon('plus'), 'Neues Gewässer')),
    h('div', { class: 'block' }, lbl('Wie viele Ruten?'), rods),
    h('button', { class: 'btn rot', type: 'button', onclick: los }, 'Ansitz starten')
  ], { voll: true });
});

function gewaesserNeu() {
  const name = h('input', { class: 'feld', placeholder: 'z. B. Baggersee Nord' });
  const kurz = h('input', { class: 'feld', placeholder: 'Kürzel, z. B. BSN', maxlength: '6' });
  const lat = h('input', { class: 'feld', inputmode: 'decimal', placeholder: 'Breite, z. B. 51,16' });
  const lon = h('input', { class: 'feld', inputmode: 'decimal', placeholder: 'Länge, z. B. 10,45' });
  const hier = async () => {
    try { const p = await getPosition(); lat.value = p.lat.toFixed(5).replace('.', ','); lon.value = p.lon.toFixed(5).replace('.', ','); toast('Standort übernommen (± ' + p.accuracyM + ' m)'); }
    catch (err) { toast(err.message, { fehler: true }); }
  };
  const speichern = async () => {
    const l = await sicher(() => lakes.save({ name: name.value, short: kurz.value, lat: lat.value, lon: lon.value }));
    if (l) { toast(l.name + ' angelegt'); go('gewaesser'); }
  };
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'start' }), h('h1', {}, 'Neues Gewässer'),
      h('p', { class: 'unter' }, 'Mit Koordinaten holt die App das Wetter vom DWD und rechnet Sonne und Mond.')),
    h('div', { class: 'block' }, lbl('Name'), name, kurz),
    h('div', { class: 'block' }, lbl('Lage · freiwillig'), h('div', { class: 'zwei' }, lat, lon),
      h('button', { class: 'btn neutral', type: 'button', onclick: hier }, icon('pin'), 'Ich stehe am Wasser')),
    h('button', { class: 'btn rot', type: 'button', onclick: speichern }, 'Speichern')
  ], { voll: true });
}

/* ---------- 7 · Logbuch ---------- */
route('logbuch', async filter => {
  const seen = await alleSeen();
  const alle = await beendeteAnsitze();
  const lauf = await laufenderAnsitz();
  const wahl = filter || 'alle';
  const box = chips([['alle', 'Alle'], ...seen.map(l => [l.id, l.short])], wahl, { onchange: v => go('logbuch', v) });
  const liste = [lauf, ...alle].filter(Boolean).filter(s => wahl === 'alle' || s.lakeId === wahl);
  const zeilen = await Promise.all(liste.map(async s => {
    const l = seen.find(x => x.id === s.lakeId), z = await zahlen(s);
    const zeit = s.timed ? datumKurz(new Date(s.startTs)) + ' · ' + s.start.slice(11) + (s.end ? '–' + s.end.slice(11) : '') : datumKurz(new Date(s.startTs)) + (s.end && s.end.slice(0, 10) !== s.start.slice(0, 10) ? ' – ' + datumKurz(new Date(s.endTs)) : '');
    return h('button', { class: 'eintrag', type: 'button', style: s.endTs == null ? 'border-color:#00FF5E' : '', onclick: () => go(s.endTs == null ? 'ansitz' : 'auswertung', s.id) },
      h('span', { class: 'text' }, h('span', { class: 'titel' }, zeit),
        h('span', { class: 'info' }, (s.endTs == null ? 'läuft · ' : '') + (l ? l.short : '') + ' · ' + dauer((s.endTs || Date.now()) - s.startTs) + (s.weather && s.weather.windDir ? ' · Wind ' + s.weather.windDir : ''))),
      h('span', { class: 'zahl' }, z.fische + (z.fische === 1 ? ' Fisch' : ' Fische')), icon('pfeil'));
  }));
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'start', pille: liste.length + (liste.length === 1 ? ' Ansitz' : ' Ansitze') }), h('h1', {}, 'Logbuch')),
    seen.length > 1 ? box : null,
    h('div', { class: 'liste' }, ...(zeilen.length ? zeilen : [h('div', { class: 'leer' }, 'Noch kein Ansitz gespeichert. Starte einen oder trag einen nach.')])),
    h('div', { class: 'liste' },
      h('button', { class: 'zeile', type: 'button', onclick: () => go('rekorde', wahl === 'alle' ? null : wahl) }, 'Rekorde', h('span', { class: 'rechts' }, icon('pfeil'))),
      h('button', { class: 'zeile', type: 'button', onclick: () => go('fische', wahl === 'alle' ? null : wahl) }, 'Deine Fische', h('span', { class: 'rechts' }, 'Steckbriefe', icon('pfeil'))),
      h('button', { class: 'zeile', type: 'button', onclick: () => go('bisskarte', wahl === 'alle' ? null : wahl) }, 'Biss-Karte', h('span', { class: 'rechts' }, icon('pfeil')))),
    h('button', { class: 'btn neutral', type: 'button', onclick: () => go('nachtragen') }, 'Ansitz nachtragen')
  ]);
});

/* ---------- Nachtragen ---------- */
route('nachtragen', async () => {
  const seen = await alleSeen();
  if (!seen.length) { go('gewaesser', 'neu'); return h('div'); }
  let wahl = seen[0].id;
  const box = chips(seen.map(l => [l.id, l.short]), wahl, { onchange: v => { wahl = v; } });
  const von = h('input', { class: 'feld', type: 'datetime-local', 'aria-label': 'Beginn' });
  const bis = h('input', { class: 'feld', type: 'datetime-local', 'aria-label': 'Ende' });
  const fische = h('input', { class: 'feld', inputmode: 'numeric', placeholder: 'Fische gesamt' });
  const notiz = h('textarea', { class: 'feld', placeholder: 'Notiz – Köder, Platz, Besonderes' });
  const speichern = async () => {
    const s = await sicher(() => sessions.save({ lakeId: wahl, start: von.value, end: bis.value, fishCount: fische.value, notes: notiz.value }));
    if (s) { syncWeather(); toast('Ansitz nachgetragen'); go('auswertung', s.id); }
  };
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'logbuch' }), h('h1', {}, 'Ansitz nachtragen'),
      h('p', { class: 'unter' }, 'Das Wetter holt die App selbst, sobald Netz da ist.')),
    h('div', { class: 'block' }, lbl('Gewässer'), box),
    h('div', { class: 'block' }, lbl('Beginn'), von, lbl('Ende'), bis),
    h('div', { class: 'block' }, lbl('Fische · freiwillig'), fische, notiz),
    h('button', { class: 'btn rot', type: 'button', onclick: speichern }, 'Speichern')
  ]);
});

/* ---------- 5 · Auswertung eines Ansitzes ---------- */
const zeile = (a, b) => h('div', { class: 'reihe', style: 'justify-content:space-between' }, h('span', { class: 'klein', style: 'font-size:14px' }, a), h('span', { style: 'font-weight:600;text-align:right' }, b));

/* ---------- 6 · Krisiu ---------- */
route('krisiu', async () => {
  const lage = await krisiuLage();
  const lauf = await laufenderAnsitz();
  const lake = lauf ? await lakes.get(lauf.lakeId) : null;
  const { wx } = lauf ? await wetterJetzt(lake) : { wx: null };
  const hinweise = lauf ? await krisiuHinweise(lauf, lake, wx) : [];
  const [emo, txt, farbe] = STIMMUNG[lage.art] || ['🙂', '', ''];
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: lauf ? 'ansitz' : 'start', pille: lauf ? 'Ansitz läuft' : null }),
      h('div', { class: 'reihe', style: 'gap:14px' }, k(64), h('div', { class: 'block eng', style: 'gap:6px' },
        h('span', { style: 'font:700 40px/1 var(--cond);text-transform:uppercase' }, 'Krisiu'),
        h('span', { class: 'unter' }, 'Dein Kumpel auf der Liege nebenan'),
        h('span', { class: 'krisiu-zeile ' + farbe }, emo + ' ' + txt)))),
    h('div', { class: 'block' }, lbl(lauf ? 'Hinweise jetzt' : 'Krisiu sagt'),
      ...(hinweise.length ? hinweise : [{ art: lage.art, text: lage.text.replace(/^Krisiu /, 'Krisiu '), grund: lauf ? 'Gerade nichts Besonderes – Ruten liegen, jetzt heißt es abwarten.' : 'deine Ansitze' }]).map(x => {
        const [e, t] = STIMMUNG[x.art] || ['🙂', ''];
        return h('div', { class: 'hinweis' }, h('span', { class: 'kopfzeile' }, k(24), e + ' Krisiu ' + t), h('p', {}, x.text), x.grund ? h('span', { class: 'grund' }, 'Beruht auf: ' + x.grund) : null);
      })),
    h('p', { class: 'klein' }, 'Krisiu arbeitet mit festen Regeln und deinen Daten. Freies Fragen braucht einen KI-Dienst – das kommt später, wenn überhaupt.'),
    h('button', { class: 'btn neutral', type: 'button', onclick: () => go('einstellungen') }, 'Mehr · Sicherung, Startdatei, App')
  ]);
});

/* ---------- Mehr: Gewässer, Sicherung, App ---------- */
route('einstellungen', async () => {
  const seen = await alleSeen();
  const kartenInfo = await Promise.all(seen.map(async l => ({ karte: !!(await mapOf(l.id)), spots: (await spotsOf(l.id)).length })));
  const inst = installState();
  const datei = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async ev => {
    const f = ev.target.files[0]; if (!f) return;
    const d = await sicher(async () => { try { return JSON.parse(await f.text()); } catch (e) { throw new Error('Die Datei ist keine lesbare Sicherung.'); } });
    if (!d) return;
    if (istStartdatei(d)) {
      const r = await sicher(() => importStart(d));
      if (r) { toast('Startdatei eingelesen: ' + startText(r), { ms: 6000 }); syncWeather(); go('einstellungen'); }
      return;
    }
    const r = await sicher(() => importData(d));
    if (r) { toast(`Eingelesen: ${r.added} neu, ${r.updated} geändert, ${r.skipped} unverändert`, { ms: 4500 }); syncWeather(); go('einstellungen'); }
  } });
  const sichern = async () => {
    const b = await sicher(() => exportData({ photos: true }));
    if (b) await sicher(() => handOut('krisiu-sicherung-' + jetzt().slice(0, 10) + '.json', JSON.stringify(b), 'application/json'));
  };
  const csv = async () => {
    const c = toCsv(await entries.list(), await lakes.list({ withDeleted: true }));
    await sicher(() => handOut('krisiu-eintraege-' + jetzt().slice(0, 10) + '.csv', c, 'text/csv'));
  };
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'start' }), h('h1', {}, 'Mehr')),
    h('div', { class: 'block' }, lbl('Gewässer'),
      ...seen.map((l, i) => h('div', { class: 'eintrag', style: 'cursor:default' }, h('span', { class: 'text' }, h('span', { class: 'titel' }, l.short + ' · ' + l.name),
        h('span', { class: 'info' }, [l.lat != null ? zahl(l.lat, 4) + ' N · ' + zahl(l.lon, 4) + ' O' : 'ohne Koordinaten – kein Wetter',
          kartenInfo[i].karte ? 'Karte ✓' : 'ohne Karte', kartenInfo[i].spots ? kartenInfo[i].spots + ' Spots' : null].filter(Boolean).join(' · '))))),
      h('button', { class: 'btn strich', type: 'button', onclick: () => go('gewaesser', 'neu') }, icon('plus'), 'Gewässer anlegen')),
    h('div', { class: 'block' }, lbl('Sicherung'),
      h('p', { class: 'klein' }, 'Deine Daten liegen nur auf diesem Handy. Sichere sie ab und zu als Datei – zum Beispiel in deine Cloud oder per Mail an dich.'),
      h('button', { class: 'btn neutral', type: 'button', onclick: sichern }, 'Sicherung speichern'),
      h('label', { class: 'btn neutral' }, 'Sicherung oder Start-Datei einlesen', datei),
      h('button', { class: 'btn neutral', type: 'button', onclick: csv }, 'Einträge als Tabelle (CSV)')),
    h('div', { class: 'block' }, lbl('App'),
      inst.standalone ? h('p', { class: 'klein' }, 'Installiert ✓') :
        inst.canPrompt ? h('button', { class: 'btn neutral', type: 'button', onclick: () => promptInstall() }, 'Auf den Startbildschirm') :
          h('p', { class: 'klein' }, inst.platform === 'ios' ? 'Installieren: in Safari auf „Teilen“ und dann „Zum Home-Bildschirm“.' : 'Installieren: im Browser-Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“.'),
      h('p', { class: 'klein' }, `${APP_NAME} ${APP_VERSION} · Wetter: Deutscher Wetterdienst über Bright Sky, Ersatz Open-Meteo (CC BY 4.0) · Krisiu mit festen Regeln`),
      h('button', { class: 'zurueck', type: 'button', onclick: () => go('technik') }, 'Technik-Test', icon('pfeil')))
  ]);
});

route('technik', async () => {
  const box = h('div', { class: 'block' });
  mountDiagnose(box);
  return box;
});
