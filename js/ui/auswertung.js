// Auswertung: ein Ansitz (Muster, Verlauf), Erweitert (alles im Detail), Kontext (Wetter davor/danach),
// Biss-Karte und Rekorde. Alles aus den eigenen Einträgen; fehlende Werte werden benannt, nicht geschätzt.

import { lakes, sessions, entries, mapOf, spotsOf } from '../core/repo.js';
import { sunTimes, moonAt, moonName } from '../core/astro.js';
import { isNum, HOUR, DAY } from '../core/util.js';
import { h, icon, route, go, seite, kopf, lbl, chips, toast, datumKurz, dauer, zahl } from './app.js';
import { alleSeen, beendeteAnsitze, laufenderAnsitz, zahlen, rutenVon, stundenFuer } from './daten.js';
import { bisseAus, fischeAus, faktoren, muster, wetterPaare, nachUhrzeit, nachFeld, naechte, druckKlasse, regenKlasse, windKlasse, tagesKlasse, istKarpfen, tagesWerte } from './analyse.js';
import { verlaufDiagramm, uhrzeitDiagramm, balken } from './diagramm.js';
import { grundkarte, sv } from './karte.js';

const zeitraumText = s => {
  const a = new Date(s.startTs), b = new Date(s.endTs || Date.now());
  if (a.toDateString() === b.toDateString()) return datumKurz(a);
  return a.getDate() + '.' + (a.getMonth() === b.getMonth() ? '' : (a.getMonth() + 1) + '.') + '–' + b.getDate() + '.' + (b.getMonth() + 1) + '.';
};
const uhr = t => { const d = new Date(t); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
const tagUhr = t => { const d = new Date(t); return d.getDate() + '.' + (d.getMonth() + 1) + '. ' + uhr(t); };
const artName = e => ({ fang: e.species || 'Fang', fehlbiss: 'Fehlbiss', verloren: 'Verloren', beobachtung: e.kind || 'Beobachtung' }[e.type]);
const wetterKurz = w => (w ? [isNum(w.pressureHpa) ? zahl(w.pressureHpa) + ' hPa ' + (druckKlasse(w) || '') : null, isNum(w.tempC) ? zahl(w.tempC) + ' °C' : null,
  regenKlasse(w) === 'Regen' ? 'Regen' : regenKlasse(w) === 'trocken' ? 'trocken' : null].filter(Boolean).join(' · ') : 'Wetter fehlt noch');
const fischWort = (n, alleKarpfen) => n + ' ' + (alleKarpfen ? (n === 1 ? 'Karpfen' : 'Karpfen') : (n === 1 ? 'Fisch' : 'Fische'));

export async function ladeAnsitz(id) {
  const s = id ? await sessions.get(id) : (await beendeteAnsitze())[0];
  if (!s) return null;
  const lake = await lakes.get(s.lakeId);
  const z = await zahlen(s);
  const von = s.startTs, bis = s.endTs || Date.now();
  return { s, lake, z, von, bis, bisse: bisseAus(z.eintraege), fische: fischeAus(z.eintraege) };
}
const kopfAnsitz = (a, zurueck, text) => kopf({ zurueck, text, pille: (a.lake ? a.lake.short + ' · ' : '') + zeitraumText(a.s) });
const nichtGefunden = () => { go('logbuch'); return h('div'); };

/* ---------- Auswertung eines Ansitzes ---------- */
route('auswertung', async id => {
  const a = await ladeAnsitz(id);
  if (!a) return nichtGefunden();
  const { s, lake, z, bisse } = a;
  const f = faktoren(bisse);
  const m = muster(bisse, f);
  const ohneWetter = bisse.filter(b => !b.weather).length;
  const kopfzeile = bisse.length
    ? bisse.length + (bisse.length === 1 ? ' Biss' : ' Bisse') + (bisse.length > 1 ? ' zwischen ' + tagUhr(bisse[0].ts) + ' und ' + tagUhr(bisse[bisse.length - 1].ts) + ' Uhr' : ' um ' + tagUhr(bisse[0].ts) + ' Uhr') +
      (ohneWetter ? ' · ' + ohneWetter + ' noch ohne Wetter' : '')
    : s.timed ? 'In diesem Ansitz ist kein Biss mit Uhrzeit eingetragen.' : 'Nachgetragen ohne Uhrzeiten – deshalb kein Muster nach Tageszeit oder Wetter je Biss.';
  const kacheln = f.map(x => h('div', { class: 'kachel faktor' + (x.n >= 3 && x.k / x.n >= 0.6 ? ' stark' : '') }, h('span', { class: 'lbl' }, x.label),
    h('span', { class: 'wert' }, x.wert), h('small', {}, x.detail || (x.k + ' von ' + x.n))));
  const verlauf = h('div', { class: 'block eng' }, h('div', { class: 'leer' }, 'Wetterverlauf wird geladen …'));
  const ladeVerlauf = async () => {
    const d = await stundenFuer(lake, a.von - 2 * HOUR, a.bis + 2 * HOUR);
    verlauf.replaceChildren(d.hours.length
      ? verlaufDiagramm({ hours: d.hours, von: a.von, bis: a.bis, bisse, naechte: naechte(a.von, a.bis, lake.lat, lake.lon) })
      : h('div', { class: 'leer' }, lake && lake.lat == null ? 'Das Gewässer hat keine Koordinaten – kein Wetterverlauf.' : 'Der Wetterverlauf kommt, sobald Netz da ist.'),
    h('p', { class: 'klein', style: 'margin:0' }, 'Linie = Luftdruck (hPa) · ', h('span', { style: 'color:#ff1e1e' }, '● Fang'), ' ', h('span', { style: 'color:#ff1e1e' }, '○ Fehlbiss/verloren'), ' · ', h('span', { style: 'color:#4da3ff' }, 'Blau = Regen'), ' · Pfeil = Windrichtung · hell = Nacht' + (d.quelle ? ' · Quelle: ' + d.quelle : '')));
  };
  if (lake) ladeVerlauf();
  const liste = z.eintraege.map(e => h('div', { class: 'eintrag', style: 'cursor:default' },
    h('span', { class: 'text' }, h('span', { class: 'titel' }, e.time.slice(11) + ' · ' + artName(e)),
      h('span', { class: 'info' }, [e.rod, e.bait, e.spotName, e.weather && isNum(e.weather.pressureHpa) ? zahl(e.weather.pressureHpa, 0) + ' hPa' + (isNum(e.weather.pressure3h) ? ' (' + zahl(e.weather.pressure3h) + ' in 3 h)' : '') : null, e.ctx && e.ctx.dayPhase].filter(Boolean).join(' · ') || ' ')),
    h('span', { class: 'zahl' }, e.weightKg ? zahl(e.weightKg) + ' kg' : '')));
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopfAnsitz(a, 'logbuch', 'Logbuch'), h('h1', {}, 'Auswertung')),
    h('div', { class: 'kacheln' },
      h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Fische'), h('b', {}, String(z.fische)), h('small', {}, z.bisse + ' Bisse')),
      h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Dauer'), h('b', {}, dauer(a.bis - a.von)), h('small', {}, s.timed ? s.start.slice(11) + (s.end ? '–' + s.end.slice(11) : '') : 'ohne Uhrzeit')),
      h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Futter'), h('b', {}, zahl(z.futterKg) + ' kg'), h('small', {}, (s.feedings || []).length + '× gefüttert'))),
    h('div', { class: 'karte muster' }, lbl('Die meisten Bisse kamen'), h('span', { class: 'gross2' }, m.titel), h('span', { class: 'klein' }, kopfzeile)),
    kacheln.length ? h('div', { class: 'faktoren' }, ...kacheln) : null,
    h('div', { class: 'block eng' }, lbl('Wetter und Bisse im Verlauf'), verlauf),
    h('div', { class: 'zwei' },
      h('button', { class: 'btn neutral', type: 'button', onclick: () => go('kontext', s.id) }, 'Kontext'),
      h('button', { class: 'btn neutral', type: 'button', onclick: () => go('erweitert', s.id) }, 'Erweitern')),
    h('button', { class: 'zeile', type: 'button', onclick: () => go('bisskarte', s.lakeId + '~' + s.id) }, 'Biss-Karte', h('span', { class: 'rechts' }, icon('pfeil'))),
    h('div', { class: 'block' }, lbl('Bisse und Fänge'), h('div', { class: 'liste' }, ...(liste.length ? liste : [h('div', { class: 'leer' }, s.timed ? 'In diesem Ansitz ist nichts eingetragen.' : 'Für diesen Ansitz stehen keine Uhrzeiten zur Verfügung.')]))),
    s.notes ? h('div', { class: 'karte' }, lbl('Notiz'), h('span', {}, s.notes)) : null
  ]);
});

/* ---------- Erweitert ---------- */
route('erweitert', async id => {
  const a = await ladeAnsitz(id);
  if (!a) return nichtGefunden();
  const { s, lake, z, bisse, fische } = a;
  const w = s.weather;
  const alleKarpfen = fische.length > 0 && fische.every(e => istKarpfen(e.species));
  const druckAend = w && isNum(w.pressureStartHpa) && isNum(w.pressureEndHpa) ? w.pressureEndHpa - w.pressureStartHpa : null;
  const tiles = h('div', { class: 'kacheln' },
    h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Fische'), h('b', {}, String(z.fische)), h('small', {}, fische.length ? (alleKarpfen ? 'Karpfen' : nachFeld(fische, e => e.species).map(x => x.name).slice(0, 2).join(', ')) : 'keine mit Uhrzeit')),
    h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Druck'), h('b', {}, druckAend == null ? '–' : (druckAend > 0 ? '+' : druckAend < 0 ? '−' : '±') + zahl(Math.abs(druckAend))), h('small', {}, w && isNum(w.pressureStartHpa) ? zahl(w.pressureStartHpa, 0) + ' → ' + zahl(w.pressureEndHpa, 0) : 'Wetter fehlt')),
    h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Luft'), h('b', {}, w && isNum(w.tempMinC) ? (Math.round(w.tempMinC) === Math.round(w.tempMaxC) ? zahl(w.tempMinC, 0) : zahl(w.tempMinC, 0) + '–' + zahl(w.tempMaxC, 0)) + ' °C' : '–'), h('small', {}, w && isNum(w.tempMinC) ? (w.tempMinC < 0 ? 'mit Frost' : w.tempMaxC < 7 ? 'kalt' : w.tempMinC >= 7 ? 'mild' : 'kühl bis mild') : 'Wetter fehlt')));
  const paare = wetterPaare(bisse);
  const paarBox = paare.length ? h('div', { class: 'paare' }, ...paare.map(p => h('div', { class: 'paar' }, ...p.map(([t, n], i) => h('div', { class: i === 0 ? 'eins' : 'zwei' }, h('span', {}, t), h('b', {}, String(n)))))))
    : h('div', { class: 'leer' }, 'Noch keine Bisse mit Wetter.');
  // Jeder Fisch mit seinem Wetter
  const fZeile = e => h('div', { class: 'eintrag', style: 'cursor:default' }, h('span', { class: 'zahl', style: 'font-size:18px;width:46px;flex:none' }, e.time.slice(11)),
    h('span', { class: 'text' }, h('span', { class: 'titel' }, [e.rod, artName(e), e.weightKg ? zahl(e.weightKg) + ' kg' : null].filter(Boolean).join(' · ')), h('span', { class: 'info' }, wetterKurz(e.weather))));
  const fListe = h('div', { class: 'liste' }, ...fische.slice(0, 3).map(fZeile));
  const mehr = fische.length > 3 ? h('button', { class: 'zurueck', type: 'button', style: 'color:#00FF5E', onclick: ev => { fListe.replaceChildren(...fische.map(fZeile)); ev.currentTarget.remove(); } }, 'Alle ' + fische.length + ' anzeigen') : null;
  // Ruten und Montagen
  const ruten = rutenVon(s).map(r => {
    const meine = bisse.filter(b => b.rod === 'Rute ' + r.nr);
    return h('div', { class: 'karte rute' }, h('div', { class: 'reihe', style: 'justify-content:space-between' }, h('b', { class: 'rnr' }, 'Rute ' + r.nr), h('span', { class: 'klein' }, meine.length + (meine.length === 1 ? ' Biss' : ' Bisse') + ' · ' + meine.filter(b => b.type === 'fang').length + ' Fische')),
      h('span', {}, [r.spot, r.entfernungM ? r.entfernungM + ' m' : null].filter(Boolean).join(' · ') || 'Spot nicht eingetragen'),
      h('span', { class: 'klein' }, [(r.koeder || []).join(' + '), r.montage].filter(Boolean).join(' · ') || 'Köder nicht eingetragen'));
  });
  const koeder = nachFeld(bisse, b => b.bait);
  const st = lake && isNum(lake.lat) ? sunTimes(new Date(a.von), lake.lat, lake.lon) : null;
  const sonne = st && st.sunrise != null ? { auf: new Date(st.sunrise).getHours() + new Date(st.sunrise).getMinutes() / 60, unter: new Date(st.sunset).getHours() + new Date(st.sunset).getMinutes() / 60 } : null;
  const mond = moonAt((a.von + a.bis) / 2);
  const nacht = st && st.sunset != null ? (() => { const st2 = sunTimes(new Date(a.von + DAY), lake.lat, lake.lon); return st2.sunrise != null ? { dauer: st2.sunrise - st.sunset, von: st.sunset, bis: st2.sunrise } : null; })() : null;
  const wasser = [s.waterTempC, ...z.eintraege.map(e => e.waterTempC)].filter(isNum);
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopfAnsitz(a, () => go('auswertung', s.id), 'Auswertung'), h('h1', {}, 'Erweitert')),
    tiles,
    h('div', { class: 'block eng' }, lbl('Bisse nach Wetterlage'), paarBox),
    h('div', { class: 'block eng' }, lbl('Jeder Fisch mit seinem Wetter'), fische.length ? fListe : h('div', { class: 'leer' }, 'Keine Fische mit Uhrzeit eingetragen.'), mehr),
    h('div', { class: 'block eng' }, lbl('Ruten und Montagen'), ...ruten),
    h('div', { class: 'block eng' }, lbl('Bisse nach Köder'), bisse.length ? balken(koeder) : h('div', { class: 'leer' }, 'Noch keine Bisse.')),
    h('div', { class: 'block eng' }, lbl('Bisse nach Uhrzeit'), bisse.length ? uhrzeitDiagramm(nachUhrzeit(bisse), sonne) : h('div', { class: 'leer' }, 'Noch keine Bisse mit Uhrzeit.'),
      h('p', { class: 'klein', style: 'margin:0' }, 'Blöcke von drei Stunden · hell hinterlegt = Nacht')),
    h('div', { class: 'karte' }, lbl('Mond'), h('b', { style: 'font:700 22px/1 var(--cond);text-transform:uppercase' }, moonName(mond.phase)),
      h('span', { class: 'klein' }, 'ca. ' + Math.round(mond.illum * 100) + ' % beleuchtet' + (mond.illum < 0.25 ? ' · dunkle Nächte' : mond.illum > 0.75 ? ' · helle Nächte' : ''))),
    h('div', { class: 'block eng' }, lbl('Wind, Wolken, Wasser'),
      h('div', { class: 'kacheln' },
        h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Wind'), h('b', {}, w && w.windDir ? w.windDir : '–'), h('small', {}, w && isNum(w.windKmh) ? 'Ø ' + zahl(w.windKmh, 0) + ' km/h' : '–')),
        h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Böen'), h('b', {}, w && isNum(w.gustKmh) ? zahl(w.gustKmh, 0) : '–'), h('small', {}, 'km/h, stärkste')),
        h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Wolken'), h('b', {}, w && isNum(w.cloudPct) ? w.cloudPct + ' %' : '–'), h('small', {}, w && isNum(w.cloudPct) ? (w.cloudPct >= 80 ? 'meist bedeckt' : w.cloudPct >= 40 ? 'wechselnd' : 'meist klar') : '–')),
        h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Regen'), h('b', {}, w && isNum(w.precipMm) ? zahl(w.precipMm) + ' mm' : '–'), h('small', {}, 'im Ansitz')),
        h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Wasser'), h('b', {}, wasser.length ? zahl(wasser[0]) + ' °C' : '–'), h('small', {}, wasser.length ? 'eingetragen' : 'kein Wert')),
        h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Nacht'), h('b', {}, nacht ? dauer(nacht.dauer) : '–'), h('small', {}, nacht ? 'ca. ' + uhr(nacht.von) + '–' + uhr(nacht.bis) : '–')))),
    w ? h('p', { class: 'klein' }, 'Wetter: ' + (w.source || 'Wetterdienst') + (w.provisional ? ' · vorläufig' : '')) : null
  ]);
});

/* ---------- Kontext: Wetter vor und nach dem Ansitz ---------- */
function abschnittText(hours, von, bis) {
  const hs = hours.filter(x => x.t >= von && x.t < bis);
  if (hs.length < 12) return null;
  const p = hs.map(x => x.pressureHpa).filter(isNum), t = hs.map(x => x.tempC).filter(isNum);
  const regen = hs.map(x => x.precipMm).filter(isNum).reduce((s2, v) => s2 + v, 0);
  const nachtMins = [];
  for (let d = new Date(von).setHours(0, 0, 0, 0); d < bis; d += DAY) { const tw = tagesWerte(hours, d); if (tw && isNum(tw.nachtMin)) nachtMins.push(tw.nachtMin); }
  const pa = p[0], pe = p[p.length - 1], pmin = Math.min(...p), pmax = Math.max(...p);
  let titel;
  if (pe - pa <= -6) titel = 'Der Druck fiel deutlich'; else if (pe - pa >= 6) titel = 'Der Druck stieg deutlich';
  else if (pmax - pmin < 6 && (pa + pe) / 2 >= 1020) titel = 'Stabiles Hoch'; else if (pmax - pmin < 6) titel = 'Ruhige Lage'; else titel = 'Wechselhaft';
  const frost = nachtMins.filter(x => x < 0).length;
  if (frost) titel += frost === 1 ? ', eine Frostnacht' : ', ' + frost + ' Frostnächte';
  const text = 'Druck ' + zahl(pa, 0) + ' → ' + zahl(pe, 0) + ' hPa (zwischen ' + zahl(pmin, 0) + ' und ' + zahl(pmax, 0) + '). ' +
    (nachtMins.length ? 'Nächte ' + zahl(Math.min(...nachtMins)) + ' bis ' + zahl(Math.max(...nachtMins)) + ' °C. ' : '') +
    'Luft bis ' + zahl(Math.max(...t), 0) + ' °C. Regen ' + zahl(regen) + ' mm.' + (hs.some(x => !x.measured) ? ' Teilweise Vorhersage.' : '');
  return { titel, text };
}
route('kontext', async param => {
  const [id, tageTxt] = String(param || '').split('~');
  const a = await ladeAnsitz(id);
  if (!a) return nichtGefunden();
  const { s, lake, bisse } = a;
  const tage = Number(tageTxt) === 3 ? 3 : 5;
  const von = a.von - tage * DAY, bis = Math.min(Date.now(), a.bis + tage * DAY);
  const box = h('div', { class: 'block' }, h('div', { class: 'leer' }, 'Wetter wird geladen …'));
  (async () => {
    const d = await stundenFuer(lake, von, bis);
    if (!d.hours.length) { box.replaceChildren(h('div', { class: 'leer' }, lake && lake.lat == null ? 'Das Gewässer hat keine Koordinaten.' : 'Das Wetter kommt, sobald Netz da ist.')); return; }
    const vor = abschnittText(d.hours, von, a.von), nach = abschnittText(d.hours, a.bis, bis);
    const fmtT = t => { const x = new Date(t); return x.getDate() + '.' + (x.getMonth() + 1) + '.'; };
    box.replaceChildren(
      verlaufDiagramm({ hours: d.hours, von, bis, bisse, naechte: [], band: { von: a.von, bis: a.bis } }),
      h('p', { class: 'klein', style: 'margin:0' }, 'Grüner Streifen = Ansitz · Rot = Biss · Blau = Regen · Linie = Luftdruck (hPa)'),
      h('div', { class: 'karte' }, lbl(tage + ' Tage davor · ' + fmtT(von) + '–' + fmtT(a.von - 1)), vor ? h('b', { class: 'kontext-titel' }, vor.titel) : null, h('span', { class: 'klein', style: 'font-size:14px' }, vor ? vor.text : 'Keine Werte.')),
      h('div', { class: 'karte' }, lbl('Danach · ' + fmtT(a.bis) + '–' + fmtT(bis)), nach ? h('b', { class: 'kontext-titel' }, nach.titel) : null,
        h('span', { class: 'klein', style: 'font-size:14px' }, nach ? nach.text : 'Die Tage danach sind noch nicht vorbei.')),
      h('p', { class: 'klein' }, 'Quelle: ' + (d.quelle || 'Wetterdienst')));
  })();
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopfAnsitz(a, () => go('auswertung', s.id), 'Auswertung'), h('h1', {}, 'Kontext'),
      h('p', { class: 'unter' }, 'Das Wetter vor und nach dem Ansitz.')),
    h('div', { class: 'block eng' }, lbl('Zeitraum davor und danach'), chips([[3, '3 Tage'], [5, '5 Tage']], tage, { onchange: v => go('kontext', s.id + '~' + v) })),
    box
  ]);
});

/* ---------- Biss-Karte ---------- */
route('bisskarte', async param => {
  const [lakeId, sessionId, zr, wd, tz] = String(param || '').split('~');
  const seen = await alleSeen();
  const lake = seen.find(l => l.id === lakeId) || seen[0];
  if (!lake) return nichtGefunden();
  const map = await mapOf(lake.id);
  const zeitraum = zr || (sessionId ? 'ansitz' : 'alle'), wind = wd || 'alle', tageszeit = tz || 'alle';
  const neu = (k, v) => { const p = { zr: zeitraum, wd: wind, tz: tageszeit }; p[k] = v; go('bisskarte', [lake.id, sessionId || '', p.zr, p.wd, p.tz].join('~')); };
  const s = sessionId ? await sessions.get(sessionId) : null;
  let alle = bisseAus((await entries.list()).filter(e => e.lakeId === lake.id)).sort((a, b) => a.ts - b.ts);
  if (zeitraum === 'ansitz' && s) alle = alle.filter(e => e.ts >= s.startTs && e.ts <= (s.endTs || Date.now()));
  if (zeitraum === '30') alle = alle.filter(e => e.ts >= Date.now() - 30 * DAY);
  if (zeitraum === '365') alle = alle.filter(e => e.ts >= Date.now() - 365 * DAY);
  if (wind !== 'alle') alle = alle.filter(e => e.weather && (wind === 'sw' ? ['S', 'SW', 'W'] : ['N', 'NO', 'O']).includes(e.weather.windDir));
  if (tageszeit !== 'alle') alle = alle.filter(e => (tageszeit === 'nacht') === (tagesKlasse(e) === 'Nacht'));
  const mitOrt = alle.filter(e => e.spotXY && isNum(e.spotXY.x));
  const filter = h('div', { class: 'block eng' },
    chips([...(s ? [['ansitz', 'Dieser Ansitz']] : []), ['30', '30 Tage'], ['365', '1 Jahr'], ['alle', 'Alles']], zeitraum, { grau: true, onchange: v => neu('zr', v) }),
    chips([['alle', 'Jeder Wind'], ['sw', 'Wind S–W'], ['no', 'Wind N–O']], wind, { grau: true, onchange: v => neu('wd', v) }),
    chips([['alle', 'Tag + Nacht'], ['tag', 'Tag'], ['nacht', 'Nacht']], tageszeit, { grau: true, onchange: v => neu('tz', v) }));
  [...filter.querySelectorAll('.chips')].forEach(c => c.classList.add('scrollreihe', 'klein-chips'));
  let karte;
  const info = h('p', { class: 'klein', style: 'margin:0;min-height:17px' });
  if (map) {
    const bereiche = (await spotsOf(lake.id)).filter(x => x.x != null);
    // Ausschnitt: Spots und Bisse mit Rand, im Format 4:3; ohne beides die ganze Karte.
    const pts = [...bereiche, ...mitOrt.map(e => e.spotXY)];
    let vx = 0, vy = 0, vw = map.w, vh = map.h;
    if (pts.length) {
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y), rand = 70;
      vx = Math.min(...xs) - rand; vy = Math.min(...ys) - rand; vw = Math.max(...xs) + rand - vx; vh = Math.max(...ys) + rand - vy;
      const ziel = 3 / 4;
      if (vh / vw < ziel) { const neu = vw * ziel; vy -= (neu - vh) / 2; vh = neu; } else { const neu = vh / ziel; vx -= (neu - vw) / 2; vw = neu; }
      if (vw > map.w || vh > map.h) { vx = 0; vy = 0; vw = map.w; vh = map.h; }
      vx = Math.max(0, Math.min(map.w - vw, vx)); vy = Math.max(0, Math.min(map.h - vh, vy));
    }
    const breite = 342, sc = breite / vw;
    const svg = sv('svg', { viewBox: `${vx} ${vy} ${vw} ${vh}`, width: '100%', class: 'bisskarte', role: 'img', 'aria-label': 'Biss-Karte ' + lake.name + ': ' + mitOrt.length + ' Bisse mit Ort' },
      grundkarte(map, sc, { luft: true, spots: bereiche, breite, x0: vx }),
      mitOrt.map(e => sv('g', { transform: `translate(${e.spotXY.x} ${e.spotXY.y}) scale(${1 / sc})` }, sv('circle', { r: 6, fill: e.type === 'fang' ? '#ff1e1e' : '#000', stroke: '#ff1e1e', 'stroke-width': 2.5 }))));
    svg.addEventListener('click', ev => {
      const b = svg.getBoundingClientRect(), f = vw / b.width;
      const p = { x: vx + (ev.clientX - b.left) * f, y: vy + (ev.clientY - b.top) * f };
      const nah = mitOrt.map(e => ({ e, d: Math.hypot(e.spotXY.x - p.x, e.spotXY.y - p.y) / f })).filter(x => x.d < 20).sort((x1, x2) => x1.d - x2.d)[0];
      info.textContent = nah ? [tagUhr(nah.e.ts) + ' Uhr', artName(nah.e), nah.e.weightKg ? zahl(nah.e.weightKg) + ' kg' : null, nah.e.rod, nah.e.spotName, wetterKurz(nah.e.weather)].filter(Boolean).join(' · ') : '';
    });
    karte = h('div', { class: 'karte-rahmen' }, svg, h('span', { class: 'karte-quelle' }, (map.source || '').split(' · ')[0]));
  } else karte = h('div', { class: 'leer' }, 'Für ' + lake.name + ' ist noch keine Karte auf dem Handy. Lies unter „Mehr“ deine Startdatei ein.');
  const satz = alle.length
    ? mitOrt.length + ' von ' + alle.length + (alle.length === 1 ? ' Biss' : ' Bissen') + ' mit Ort auf der Karte' + (alle.length > mitOrt.length ? ' · die anderen wurden ohne markierten Spot eingetragen' : '')
    : 'Für diese Auswahl gibt es noch keine Bisse.';
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: () => (s ? go('auswertung', s.id) : go('logbuch')), text: s ? 'Auswertung' : 'Zurück', pille: lake.short }), h('h1', {}, 'Biss-Karte')),
    seen.length > 1 ? chips(seen.map(l => [l.id, l.short]), lake.id, { onchange: v => go('bisskarte', v) }) : null,
    filter, karte, info,
    h('div', { class: 'karte' }, h('b', {}, satz), h('span', { class: 'klein' }, 'Jeder Biss bekommt einen Punkt, wenn seine Rute vorher auf der Karte markiert war. ● Fang · ○ Fehlbiss oder verloren.'))
  ]);
});

/* ---------- Rekorde ---------- */
route('rekorde', async lakeId => {
  const seen = await alleSeen();
  const lake = seen.find(l => l.id === lakeId) || seen[0];
  if (!lake) return nichtGefunden();
  const ansitze = (await beendeteAnsitze()).filter(s => s.lakeId === lake.id);
  const fänge = (await entries.list()).filter(e => e.lakeId === lake.id && e.type === 'fang');
  const zeilen = [];
  let meist = null;
  for (const s of ansitze) { const z = await zahlen(s); if (z.fische && (!meist || z.fische > meist.n)) meist = { n: z.fische, s }; }
  zeilen.push(['Meiste Fische an einem Ansitz', meist ? zeitraumText(meist.s) + ' · ' + (meist.s.weather && meist.s.weather.windDir ? 'Wind ' + meist.s.weather.windDir : '') : 'noch kein Ansitz mit Fisch', meist ? String(meist.n) : '–', meist ? () => go('auswertung', meist.s.id) : null]);
  const schwerster = art => fänge.filter(e => art.test(e.species || '') && isNum(e.weightKg)).sort((a, b) => b.weightKg - a.weightKg)[0];
  [['Schwerster Spiegler', /spieg/i], ['Schwerster Schuppi', /schupp/i], ['Schwerster Graser', /gras/i], ['Schwerste Schleie', /schlei/i]].forEach(([t, re]) => {
    const e = schwerster(re);
    const ohne = fänge.filter(x => re.test(x.species || '')).length;
    zeilen.push([t, e ? datumKurz(new Date(e.ts)) + ' · ' + [e.rod, e.bait].filter(Boolean).join(' · ') : ohne ? 'noch kein Gewicht eingetragen' : 'noch keiner gefangen', e ? zahl(e.weightKg) + ' kg' : '–', null]);
  });
  const nacht = new Map();
  bisseAus((await entries.list()).filter(e => e.lakeId === lake.id)).filter(e => tagesKlasse(e) === 'Nacht').forEach(e => {
    const d = new Date(e.ts - 12 * HOUR); const k = d.toDateString(); nacht.set(k, (nacht.get(k) || []).concat([e]));
  });
  const best = [...nacht.values()].sort((a, b) => b.length - a.length)[0];
  zeilen.push(['Meiste Bisse in einer Nacht', best ? 'Nacht zum ' + datumKurz(new Date(best[best.length - 1].ts)) : 'noch keine Nachtbisse mit Uhrzeit', best ? String(best.length) : '–', null]);
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'logbuch', pille: 'Deine Bestwerte' }), h('h1', {}, 'Rekorde')),
    seen.length > 1 ? chips(seen.map(l => [l.id, l.short]), lake.id, { onchange: v => go('rekorde', v) }) : null,
    h('div', { class: 'liste' }, ...zeilen.map(([t, info, wert, klick]) => h(klick ? 'button' : 'div', { class: 'eintrag', type: klick ? 'button' : null, style: klick ? '' : 'cursor:default', onclick: klick || null },
      h('span', { class: 'text' }, h('span', { class: 'titel' }, t), h('span', { class: 'info' }, info)), h('span', { class: 'zahl', style: 'font-size:24px' }, wert)))),
    h('div', { class: 'hinweis' }, h('div', { class: 'kopfzeile' }, 'Krisiu'), h('p', { style: 'margin:0' }, 'Bricht ein Fang einen Rekord, meldet sich Krisiu auf der Fangkarte: „ist stolz 💪“.'))
  ]);
});
