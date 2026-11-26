// Nach dem Fang: Fangkarte, „Kennst du den?“ (Wiederfang), Steckbriefe, „Lag sie wie vorher?“.
// Krisiu vergleicht keine Fotos selbst – das entscheidet der Angler. Alles bleibt auf dem Gerät.

import { lakes, sessions, entries, fish } from '../core/repo.js';
import { photosOf } from '../core/photos.js';
import { syncWeather } from '../core/weather-sync.js';
import { isNum } from '../core/util.js';
import { h, icon, route, go, seite, kopf, lbl, k, chips, toast, sicher, datumKurz, zahl } from './app.js';
import { alleSeen, laufenderAnsitz, rutenVon, jetzt } from './daten.js';
import { druckKlasse, tagesKlasse, regenKlasse } from './analyse.js';

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const urls = [];
const bildUrl = blob => { if (!blob) return null; const u = URL.createObjectURL(blob); urls.push(u); if (urls.length > 60) URL.revokeObjectURL(urls.shift()); return u; };
async function fotoVon(entryId, gross = false) {
  const p = (await photosOf(entryId))[0];
  return p ? bildUrl(gross ? p.blob : p.thumb || p.blob) : null;
}
const foto = (url, klasse = 'foto', alt = 'Fangfoto') => (url ? h('img', { class: klasse, src: url, alt }) : h('div', { class: klasse + ' leerfoto' }, 'Kein Foto'));
const wetterZeile = w => (w ? [isNum(w.tempC) ? zahl(w.tempC) + ' °C' : null, isNum(w.pressureHpa) ? zahl(w.pressureHpa, 0) + ' hPa ' + (druckKlasse(w) || '') : null, w.windDir ? 'Wind ' + w.windDir : null].filter(Boolean).join(' · ') : null);
const zeitText = e => datumKurz(new Date(e.ts)) + ' · ' + e.time.slice(11);
async function fangVonFisch(f) { return (await entries.list()).filter(e => e.fishId === f.id && e.type === 'fang').sort((a, b) => a.ts - b.ts); }
const fischName = (f, i) => f.name || 'Ohne Namen' + (i != null ? ' ' + (i + 1) : '');

/** Kandidaten für einen Wiederfang: gleiche Art, gleiches Gewässer, mit Foto. */
async function kandidaten(e) {
  const alle = (await fish.list()).filter(f => f.lakeId === e.lakeId && f.species === e.species);
  const out = [];
  for (const f of alle) {
    const fänge = (await fangVonFisch(f)).filter(x => x.id !== e.id);
    if (!fänge.length) continue;
    const letzter = fänge[fänge.length - 1];
    out.push({ f, fänge, letzter });
  }
  return out;
}

/* ---------- Fangkarte direkt nach dem Speichern ---------- */
route('fangkarte', async id => {
  let e = await entries.get(id);
  if (!e) { go('ansitz'); return h('div'); }
  const lake = await lakes.get(e.lakeId);
  if (!e.weather && navigator.onLine !== false && lake && isNum(lake.lat)) {
    await Promise.race([syncWeather(), new Promise(r => setTimeout(r, 6000))]);
    e = await entries.get(id);
  }
  const bild = await fotoVon(e.id, true);
  // Rekord: schwerer als jeder frühere Fisch derselben Art am selben Gewässer
  const früher = (await entries.list()).filter(x => x.id !== e.id && x.lakeId === e.lakeId && x.type === 'fang' && x.species === e.species && isNum(x.weightKg));
  const rekord = isNum(e.weightKg) && früher.length && e.weightKg > Math.max(...früher.map(x => x.weightKg));
  const w = e.weather;
  const krisiu = w && druckKlasse(w) === 'fallend' ? 'Druck fällt – und du fängst. Sauber! 🎉'
    : tagesKlasse(e) === 'Nacht' ? 'Nachtfisch! Sauber gemacht. 🎉'
      : w && regenKlasse(w) === 'Regen' ? 'Bei Regen gefangen – merk ich mir. 🎉' : 'Petri Heil! 🎉';
  let kandidat = [];
  if (bild && !e.fishId) {
    kandidat = await kandidaten(e);
    if (!kandidat.length) {
      // Erster Fisch dieser Art mit Foto: bekommt gleich einen Steckbrief.
      const f = await sicher(() => fish.save({ lakeId: e.lakeId, species: e.species }));
      if (f) e = await entries.save({ id: e.id, fishId: f.id });
    }
  }
  const s = await laufenderAnsitz();
  const nr = e.rod ? Number(String(e.rod).replace(/\D/g, '')) : null;
  const weiter = () => {
    if (!s) return go('start');
    const r = nr ? rutenVon(s).find(x => x.nr === nr) : null;
    if (r && (r.spot || (r.koeder && r.koeder.length))) go('rutewie', nr); else go('ansitz');
  };
  const teilen = async () => {
    const text = `${e.species}${e.weightKg ? ' ' + zahl(e.weightKg) + ' kg' : ''} · ${lake ? lake.name : ''} · ${zeitText(e)} Uhr`;
    try {
      const p = (await photosOf(e.id))[0];
      const datei = p && p.blob ? new File([p.blob], 'fang.jpg', { type: 'image/jpeg' }) : null;
      if (datei && navigator.canShare && navigator.canShare({ files: [datei] })) await navigator.share({ files: [datei], text });
      else if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast('Text kopiert – jetzt einfügen, wo du willst.'); }
    } catch (err) { if (!err || err.name !== 'AbortError') toast('Teilen hat nicht geklappt.', { fehler: true }); }
  };
  return seite([
    h('div', { class: 'block', style: 'gap:14px' }, kopf({ zurueck: () => go('ansitz'), pille: 'Gespeichert ✓' }), h('h1', {}, 'Fangkarte')),
    h('div', { class: 'fangkarte' },
      foto(bild, 'fangfoto'),
      h('div', { class: 'block eng', style: 'padding:14px 16px 16px' },
        h('div', { class: 'reihe', style: 'justify-content:space-between;align-items:baseline' }, h('b', { class: 'art' }, e.species), h('b', { class: 'gewicht' }, e.weightKg ? zahl(e.weightKg) + ' kg' : '')),
        h('span', { class: 'klein', style: 'font-size:14px' }, (lake ? lake.name + ' · ' : '') + zeitText(e)),
        h('span', { class: 'klein', style: 'font-size:14px' }, wetterZeile(w) || 'Wetter wird nachgeholt, sobald Netz da ist.'),
        e.rod || e.bait ? h('span', { class: 'klein', style: 'font-size:14px' }, [e.rod, e.bait, e.spotName].filter(Boolean).join(' · ')) : null)),
    h('div', { class: 'hinweis' }, h('div', { class: 'kopfzeile' }, k(22), 'Krisiu'), h('p', { style: 'margin:0' }, krisiu),
      rekord ? h('p', { style: 'margin:0;font-weight:700;color:#00FF5E' }, '💪 Neuer Rekord: schwerster ' + e.species + ' am ' + (lake ? lake.short : 'Gewässer') + ' – Krisiu ist stolz') : null),
    kandidat.length ? h('button', { class: 'btn rand', type: 'button', onclick: () => go('wiederfang', e.id) }, 'Kennst du den? Vergleichen') : null,
    h('div', { class: 'zwei' },
      h('button', { class: 'btn neutral', type: 'button', onclick: teilen }, 'Teilen'),
      h('button', { class: 'btn rot', type: 'button', style: 'height:52px;font-size:18px;letter-spacing:.04em', onclick: weiter }, 'Weiter angeln'))
  ], { voll: true });
});

/* ---------- Kennst du den? ---------- */
route('wiederfang', async id => {
  const e = await entries.get(id);
  if (!e) { go('fische'); return h('div'); }
  const heute = await fotoVon(e.id, true);
  const liste = await kandidaten(e);
  const zuordnen = async f => {
    if (await sicher(() => entries.save({ id: e.id, fishId: f.id }))) { toast(f.name ? 'Willkommen zurück, ' + f.name + '!' : 'Als Wiederfang gespeichert.'); go('steckbrief', f.id); }
  };
  const neu = async () => {
    const f = await sicher(() => fish.save({ lakeId: e.lakeId, species: e.species }));
    if (f && await sicher(() => entries.save({ id: e.id, fishId: f.id }))) { toast('Neuer Fisch – mit eigenem Steckbrief.'); go('steckbrief', f.id); }
  };
  const karten = await Promise.all(liste.map(async ({ f, fänge, letzter }, i) => {
    const b = await fotoVon(letzter.id);
    const diff = isNum(e.weightKg) && isNum(letzter.weightKg) ? e.weightKg - letzter.weightKg : null;
    const mon = new Date(letzter.ts);
    return h('div', { class: 'karte', style: 'gap:10px' },
      h('div', { class: 'vergleich' }, foto(heute, 'vfoto', 'Heute'), foto(b, 'vfoto', 'Früher')),
      h('b', {}, '„' + fischName(f, i) + '“ · ' + (letzter.weightKg ? zahl(letzter.weightKg) + ' kg' : 'ohne Gewicht')),
      h('span', { class: 'klein' }, fänge.length + '× gefangen · zuletzt ' + zeitText(letzter) + (letzter.spotName ? ' · ' + letzter.spotName : '')),
      diff != null ? h('span', { class: 'klein' }, 'Gewicht: ' + (diff >= 0 ? '+' : '−') + zahl(Math.abs(diff)) + ' kg seit ' + MONATE[mon.getMonth()]) : null,
      h('button', { class: 'btn rot', type: 'button', style: 'height:52px;font-size:20px', onclick: () => zuordnen(f) }, 'Ja, das ist ' + (f.name || 'derselbe')));
  }));
  return seite([
    h('div', { class: 'block', style: 'gap:14px' }, kopf({ zurueck: () => go('fangkarte', e.id), pille: e.species }), h('h1', {}, 'Kennst du den?'),
      h('p', { class: 'unter' }, 'Links dein Fisch von heute, rechts das letzte Foto. Achte auf Schuppenbild, Narben und Flossen.')),
    ...(karten.length ? karten : [h('div', { class: 'leer' }, 'Es gibt noch keinen anderen ' + e.species + ' mit Foto an diesem Gewässer.')]),
    h('div', { class: 'hinweis' }, h('div', { class: 'kopfzeile' }, k(22), 'Krisiu'), h('p', { style: 'margin:0' }, 'Fotos vergleichen kann ich noch nicht selbst – das entscheidest du. Ich merk mir dann, wie oft er kommt und bei welchem Wetter.')),
    h('button', { class: 'btn neutral', type: 'button', onclick: neu }, 'Nein, neuer Fisch')
  ]);
});

/* ---------- Deine Fische ---------- */
route('fische', async lakeId => {
  const seen = await alleSeen();
  const lake = seen.find(l => l.id === lakeId) || seen[0];
  if (!lake) { go('logbuch'); return h('div'); }
  const meine = (await fish.list()).filter(f => f.lakeId === lake.id);
  const zeilen = [];
  for (const [i, f] of meine.entries()) {
    const fänge = await fangVonFisch(f);
    if (!fänge.length) continue;
    const letzter = fänge[fänge.length - 1];
    zeilen.push(h('button', { class: 'eintrag', type: 'button', onclick: () => go('steckbrief', f.id) }, foto(await fotoVon(letzter.id), 'mini'),
      h('span', { class: 'text' }, h('span', { class: 'titel' }, fischName(f, i)), h('span', { class: 'info' }, f.species + ' · ' + fänge.length + '× gefangen')),
      h('span', { class: 'zahl' }, letzter.weightKg ? zahl(letzter.weightKg) + ' kg' : ''), icon('pfeil')));
  }
  const ohneFoto = (await entries.list()).filter(e => e.lakeId === lake.id && e.type === 'fang' && !e.fishId).length;
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'logbuch' }), h('h1', {}, 'Deine Fische'),
      h('p', { class: 'unter' }, 'Jeder Fisch mit Foto bekommt einen Steckbrief. Fängst du ihn wieder, vergleichst du die Fotos und ordnest ihn zu.')),
    seen.length > 1 ? chips(seen.map(l => [l.id, l.short]), lake.id, { onchange: v => go('fische', v) }) : null,
    h('div', { class: 'liste' }, ...(zeilen.length ? zeilen : [h('div', { class: 'leer' }, 'Vom ' + lake.short + ' gibt es noch keinen Fisch mit Foto.')])),
    ohneFoto ? h('div', { class: 'hinweis' }, h('div', { class: 'kopfzeile' }, k(22), 'Krisiu'), h('p', { style: 'margin:0' }, ohneFoto + (ohneFoto === 1 ? ' Fang hat' : ' Fänge haben') + ' kein Foto oder keinen Steckbrief. Mach beim nächsten Mal ein Foto – dann erkennst du ihn wieder.')) : null
  ]);
});

/* ---------- Steckbrief ---------- */
route('steckbrief', async id => {
  const f = await fish.get(id);
  if (!f) { go('fische'); return h('div'); }
  const lake = await lakes.get(f.lakeId);
  const fänge = await fangVonFisch(f);
  const erster = fänge[0], letzter = fänge[fänge.length - 1];
  const bild = letzter ? await fotoVon(letzter.id, true) : null;
  const gew = fänge.filter(e => isNum(e.weightKg));
  const zugelegt = gew.length > 1 ? gew[gew.length - 1].weightKg - gew[0].weightKg : null;
  const name = h('input', { class: 'feld', placeholder: 'Name geben, z. B. Narbe', value: f.name || '' });
  const merkmal = h('input', { class: 'feld', placeholder: 'z. B. Narbe an der Schwanzwurzel' });
  const speichereName = async () => { if (await sicher(() => fish.save({ id: f.id, name: name.value }))) { toast('Name gespeichert'); go('steckbrief', f.id); } };
  const neuesMerkmal = async () => { if (!merkmal.value.trim()) return; if (await sicher(() => fish.save({ id: f.id, merkmale: (f.merkmale || []).concat([merkmal.value]) }))) go('steckbrief', f.id); };
  const weg = async i => { if (await sicher(() => fish.save({ id: f.id, merkmale: f.merkmale.filter((_, j) => j !== i) }))) go('steckbrief', f.id); };
  const fallend = fänge.filter(e => druckKlasse(e.weather) === 'fallend').length;
  const mitDruck = fänge.filter(e => druckKlasse(e.weather)).length;
  const seit = erster ? new Date(erster.ts) : null;
  return seite([
    h('div', { class: 'block', style: 'gap:14px' }, kopf({ zurueck: () => go('fische', f.lakeId) }), h('h1', {}, 'Steckbrief')),
    h('div', { class: 'fangkarte' }, foto(bild, 'fangfoto', 'Foto vom letzten Fang'),
      h('div', { class: 'block eng', style: 'padding:14px 16px 16px' }, h('b', { class: 'art' }, f.name || 'Ohne Namen'), h('span', { class: 'klein', style: 'font-size:14px' }, f.species + (lake ? ' · ' + lake.name : '')))),
    h('div', { class: 'kacheln' },
      h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Gefangen'), h('b', {}, fänge.length + '×'), h('small', {}, seit ? 'seit ' + MONATE[seit.getMonth()].slice(0, 3) + '. ' + seit.getFullYear() : '–')),
      h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Zuletzt'), h('b', {}, letzter && letzter.weightKg ? zahl(letzter.weightKg) + ' kg' : '–'), h('small', {}, letzter ? datumKurz(new Date(letzter.ts)) : '–')),
      h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, 'Zugelegt'), h('b', {}, zugelegt == null ? '–' : (zugelegt >= 0 ? '+' : '−') + zahl(Math.abs(zugelegt)) + ' kg'), h('small', {}, zugelegt == null ? '1 Gewicht' : 'seit 1. Fang'))),
    h('div', { class: 'block eng' }, lbl('Name'), h('div', { class: 'feldzeile' }, name, h('button', { class: 'stepper', type: 'button', 'aria-label': 'Name speichern', style: 'width:auto;padding:0 14px;font-size:18px', onclick: speichereName }, 'OK'))),
    h('div', { class: 'block eng' }, lbl('Erkennungszeichen'),
      ...(f.merkmale || []).map((m, i) => h('div', { class: 'reihe merkmal' }, h('span', { style: 'flex:1' }, '• ' + m), h('button', { class: 'zurueck', type: 'button', 'aria-label': 'Merkmal löschen', onclick: () => weg(i) }, '✕'))),
      h('div', { class: 'feldzeile' }, merkmal, h('button', { class: 'stepper', type: 'button', 'aria-label': 'Merkmal hinzufügen', onclick: neuesMerkmal }, '+'))),
    h('div', { class: 'block eng' }, lbl('Alle Fänge'), ...fänge.slice().reverse().map(e => h('div', { class: 'eintrag', style: 'cursor:default' },
      h('span', { class: 'text' }, h('span', { class: 'titel' }, zeitText(e)), h('span', { class: 'info' }, [e.spotName || e.rod, e.bait, wetterZeile(e.weather)].filter(Boolean).join(' · ') || ' ')),
      h('span', { class: 'zahl' }, e.weightKg ? zahl(e.weightKg) + ' kg' : '')))),
    fänge.length >= 2 && mitDruck >= 2 && fallend / mitDruck >= 0.6
      ? h('div', { class: 'hinweis' }, h('div', { class: 'kopfzeile' }, k(22), 'Krisiu'), h('p', { style: 'margin:0' }, (f.name || 'Er') + ' kommt gern, wenn der Druck fällt: ' + fallend + ' von ' + mitDruck + ' Fängen.'))
      : null
  ]);
});

/* ---------- Lag sie wie vorher? ---------- */
route('rutewie', async nrTxt => {
  const s = await laufenderAnsitz();
  if (!s) { go('start'); return h('div'); }
  const nr = Number(nrTxt) || 1;
  const r = rutenVon(s).find(x => x.nr === nr) || { nr };
  const fänge = (await entries.list()).filter(e => e.sessionId === s.id && e.type === 'fang' && e.rod === 'Rute ' + nr).sort((a, b) => a.ts - b.ts);
  const letzter = fänge[fänge.length - 1];
  const ja = async () => {
    const neu = (s.recasts || []).concat([{ time: jetzt(), rod: nr, wieVorher: true }]);
    if (await sicher(() => sessions.save({ id: s.id, recasts: neu }))) { toast('Rute ' + nr + ' liegt wieder wie vorher.'); go('ansitz'); }
  };
  const zeile = (t, wert) => h('div', { class: 'zeile', style: 'cursor:default' }, t, h('span', { class: 'rechts', style: 'color:var(--ink);text-transform:none;letter-spacing:0;font:600 16px/1.2 var(--body)' }, wert));
  return seite([
    h('div', { class: 'block', style: 'gap:14px' }, kopf({ zurueck: 'ansitz', pille: 'Rute ' + nr + (fänge.length ? ' · ' + fänge.length + '. Fisch' : '') }), h('h1', {}, 'Lag sie wie vorher?'),
      h('p', { class: 'unter' }, 'Rute ' + nr + ' hat ' + (fänge.length > 1 ? 'heute schon ' + fänge.length + '× gefangen' : 'gerade gefangen') + '. Liegt sie wieder genauso?')),
    h('div', { class: 'block eng' }, lbl('So lag Rute ' + nr + (letzter ? ' beim letzten Fisch · ' + letzter.time.slice(11) + ' Uhr' : '')),
      zeile('Spot', [r.spot, r.entfernungM ? r.entfernungM + ' m' : null].filter(Boolean).join(' · ') || '–'),
      zeile('Köder', (r.koeder || []).join(' + ') || '–'),
      zeile('Montage', r.montage || '–')),
    h('div', { class: 'block', style: 'gap:10px' },
      h('button', { class: 'btn rot', type: 'button', onclick: ja }, 'Ja, wie vorher'),
      h('button', { class: 'btn neutral', type: 'button', onclick: () => go('rute', nr) }, 'Nein, umgelegt'),
      h('p', { class: 'klein', style: 'margin:0' }, 'Bei „umgelegt“ gibst du Spot, Köder und Montage neu an.'))
  ], { voll: true });
});
