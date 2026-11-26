// Am Wasser: Ansitz läuft, Fang, Fehlbiss, Sprechen, Ruten und Plätze, Rute einrichten, Futter, Beenden.

import { lakes, sessions, entries, mapOf } from '../core/repo.js';
import { savePhoto } from '../core/photos.js';
import { syncWeather } from '../core/weather-sync.js';
import { h, icon, route, go, seite, kopf, lbl, k, krisiuTab, chips, toast, sicher, uhrzeit, datumKurz, dauer, zahl } from './app.js';
import { jetzt, laufenderAnsitz, zahlen, rutenVon, wetterJetzt, chancen, STIMMUNG } from './daten.js';

const ARTEN = ['Spiegler', 'Schuppi', 'Graser', 'Schleie', 'Andere'];
const KOEDER = ['Boilie', 'Pop-up', 'Wafter', 'Fake-Mais', 'Tigernuss', 'Zig'];
const FUTTER = ['Boilies', 'Partikel', 'Pellets', 'Tigernüsse', 'Method-Mix', 'Andere'];

async function brauchtAnsitz() {
  const s = await laufenderAnsitz();
  if (!s) { go('start'); return null; }
  return { s, lake: await lakes.get(s.lakeId) };
}
const sterneEl = n => h('span', { class: 'sterne', role: 'img', 'aria-label': `${n} von 5 Sternen` },
  ...[0, 1, 2, 3, 4].map(i => h('span', { class: i < n ? '' : 'aus' }, '★')));

/* ---------- 3 · Ansitz läuft ---------- */
route('ansitz', async () => {
  const a = await brauchtAnsitz(); if (!a) return h('div');
  const { s, lake } = a;
  const z = await zahlen(s);
  const uhr = h('span', { class: 'uhr' }, dauer(Date.now() - s.startTs));
  const timer = setInterval(() => { if (!document.body.contains(uhr)) clearInterval(timer); else uhr.textContent = dauer(Date.now() - s.startTs); }, 30000);

  const kacheln = h('div', { class: 'kacheln' }, kachel('Luft', '…', ''), kachel('Druck (hPa)', '…', ''), kachel('Wind', '…', ''));
  const chancenBox = h('button', { class: 'chancen', type: 'button', onclick: () => go('krisiu') },
    h('span', { class: 'block eng', style: 'gap:6px' }, lbl('Chancen heute'), h('span', { class: 'klein' }, datumKurz(new Date()) + ' · Wetter wird geholt …')), sterneEl(0));
  (async () => {
    const { wx, at, grund } = await wetterJetzt(lake);
    if (!wx) {
      const t = grund === 'ohne-ort' ? 'Gewässer ohne Koordinaten' : 'kein Netz – kommt später';
      kacheln.replaceChildren(kachel('Luft', '–', t), kachel('Druck (hPa)', '–', ''), kachel('Wind', '–', ''));
      chancenBox.replaceChildren(h('span', { class: 'block eng', style: 'gap:6px' }, lbl('Chancen heute'), h('span', { class: 'klein' }, t)), sterneEl(0));
      return;
    }
    const p3 = wx.pressure3h == null ? '' : (wx.pressure3h < 0 ? '↓ ' : wx.pressure3h > 0 ? '↑ ' : '') + zahl(wx.pressure3h) + ' in 3 h';
    kacheln.replaceChildren(
      kachel('Luft', zahl(wx.tempC) + ' °C', wx.nightMinC != null ? 'Nacht ' + zahl(wx.nightMinC) + ' °C' : ''),
      kachel('Druck (hPa)', zahl(wx.pressureHpa, 0), p3),
      kachel('Wind', wx.windDir || '–', wx.windKmh != null ? zahl(wx.windKmh, 0) + ' km/h' : ''));
    const c = chancen(wx);
    const alt = at && Date.now() - at > 30 * 60000 ? ' · Stand ' + uhrzeit(new Date(at)) : '';
    chancenBox.replaceChildren(h('span', { class: 'block eng', style: 'gap:6px' }, lbl('Chancen heute'),
      h('span', { class: 'klein' }, datumKurz(new Date()) + (c.plus.length ? ' · ' + c.plus.slice(0, 2).join(', ') : '') + alt)), sterneEl(c.sterne));
  })();

  const fehlbiss = async () => {
    const e = await sicher(() => entries.save({ lakeId: s.lakeId, sessionId: s.id, type: 'fehlbiss', time: jetzt() }));
    if (e) { toast('Fehlbiss um ' + e.time.slice(11) + ' gespeichert. Haken noch scharf?'); syncWeather(); go('ansitz'); }
  };

  return seite([
    krisiuTab(STIMMUNG.happy[0]),
    h('div', { class: 'block', style: 'gap:18px' },
      h('div', { class: 'kopf' },
        h('span', { class: 'reihe' }, h('button', { class: 'rund', type: 'button', 'aria-label': 'Zum Start', onclick: () => go('start'), html: '' }, icon('zurueck')),
          h('span', { class: 'pille' }, h('span', { class: 'punkt' }), 'Ansitz läuft')), uhr),
      h('h1', {}, lake ? lake.name : 'Ansitz'),
      chancenBox),
    kacheln,
    h('div', { class: 'block' },
      h('button', { class: 'btn gruen', type: 'button', onclick: () => go('fang') }, 'Fang eintragen'),
      h('div', { class: 'zwei' },
        h('button', { class: 'btn neutral', type: 'button', onclick: fehlbiss }, 'Fehlbiss'),
        h('button', { class: 'btn neutral', type: 'button', onclick: () => go('sprechen') }, icon('mikro'), 'Sprechen'))),
    h('div', { class: 'block eng' },
      h('button', { class: 'zeile', type: 'button', onclick: () => go('ruten') }, 'Ruten und Plätze', h('span', { class: 'rechts' }, rutenVon(s).length + ' Ruten', icon('pfeil'))),
      h('div', { class: 'reihe', style: 'justify-content:space-between' },
        h('span', { class: 'klein', style: 'font-size:14px' }, `${z.fische} ${z.fische === 1 ? 'Fisch' : 'Fische'} · ${z.bisse} ${z.bisse === 1 ? 'Biss' : 'Bisse'}` + (z.futterKg ? ` · ${zahl(z.futterKg)} kg Futter` : '')),
        h('button', { class: 'zurueck', type: 'button', onclick: () => go('auswertung', s.id) }, 'Auswertung', icon('pfeil')))),
    h('button', { class: 'btn rot', type: 'button', onclick: () => go('beenden') }, 'Angeln beenden')
  ], { voll: true });
});

function kachel(titel, wert, unter) {
  return h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, titel), h('b', {}, wert), h('small', {}, unter || ' '));
}

/* ---------- 4 · Fang eintragen ---------- */
route('fang', async () => {
  const a = await brauchtAnsitz(); if (!a) return h('div');
  const { s } = a;
  const ruten = rutenVon(s);
  let art = 'Spiegler', rute = ruten[0] ? ruten[0].nr : null, datei = null;
  const andere = h('input', { class: 'feld', placeholder: 'Welcher Fisch?', hidden: true });
  const artChips = chips(ARTEN, art, { onchange: v => { art = v; andere.hidden = v !== 'Andere'; } });
  const gewicht = h('input', { class: 'feld', inputmode: 'decimal', placeholder: '0,0', 'aria-label': 'Gewicht in Kilo', style: 'font-size:30px;height:64px' });
  const zeit = h('input', { class: 'feld', type: 'time', value: jetzt().slice(11), 'aria-label': 'Uhrzeit' });
  const fotoInfo = h('span', {}, 'Foto aufnehmen');
  const foto = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: ev => { datei = ev.target.files[0] || null; fotoInfo.textContent = datei ? 'Foto ist dabei ✓' : 'Foto aufnehmen'; } });
  const rutenChips = chips([...ruten.map(r => [r.nr, 'Rute ' + r.nr])], rute, { onchange: v => { rute = v; } });

  const speichern = async () => {
    const spezies = art === 'Andere' ? andere.value.trim() : art;
    const r = ruten.find(x => x.nr === rute) || {};
    const e = await sicher(() => entries.save({
      lakeId: s.lakeId, sessionId: s.id, type: 'fang', species: spezies, weightKg: gewicht.value, time: jetzt().slice(0, 11) + zeit.value,
      rod: rute ? 'Rute ' + rute : null, bait: (r.koeder || []).join(' + ') || null, spotName: r.spot || null, rig: r.montage || null,
      spotXY: r.kx != null ? { x: r.kx, y: r.ky } : null, entfernungM: r.entfernungM || null
    }));
    if (!e) return;
    if (datei) await sicher(() => savePhoto(e.id, datei));
    syncWeather();
    go('fangkarte', e.id);
  };

  return seite([
    krisiuTab(STIMMUNG.happy[0]),
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'ansitz', text: 'Abbrechen' }), h('h1', {}, 'Fang eintragen')),
    h('div', { class: 'block' }, lbl('Fischart'), artChips, andere),
    h('div', { class: 'block' }, lbl('Gewicht · freiwillig'), h('div', { class: 'feldzeile' }, gewicht, h('span', { class: 'lbl', style: 'font-size:18px' }, 'kg'))),
    h('div', { class: 'zwei' },
      h('div', { class: 'block eng' }, lbl('Uhrzeit'), zeit),
      h('div', { class: 'block eng' }, lbl('Foto'), h('label', { class: 'btn neutral', style: 'height:56px' }, icon('kamera'), fotoInfo, foto))),
    ruten.length ? h('div', { class: 'block' }, lbl('Rute'), rutenChips) : null,
    h('button', { class: 'btn rot', type: 'button', onclick: speichern }, 'Speichern')
  ], { voll: true });
});

/* ---------- 3g · Sprechen (Diktier-Mikro der Tastatur) ---------- */
export function verstehe(text) {
  const t = ' ' + text.toLowerCase().replace(/(?<!\d)[.,](?!\d)|[!?;:]/g, ' ') + ' ';
  const zahlen = { eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20 };
  const wert = w => (w in zahlen ? zahlen[w] : Number(String(w).replace(',', '.')));
  const out = {};
  if (/fehlbiss/.test(t)) out.typ = 'fehlbiss';
  else if (/gefüttert|futter/.test(t)) out.typ = 'futter';
  else if (/springer|blasen|gesehen/.test(t)) out.typ = 'beobachtung';
  else out.typ = 'fang';
  const rute = /rute\s+([a-zäöüß0-9]+)/.exec(t); if (rute) out.rute = wert(rute[1]);
  const kg = /(\d+(?:[.,]\d+)?|[a-zäöüß]+)\s*(?:kilo|kg)/.exec(t); if (kg && !Number.isNaN(wert(kg[1]))) out.kg = wert(kg[1]);
  if (/spieg/.test(t)) out.art = 'Spiegler'; else if (/schupp/.test(t)) out.art = 'Schuppi'; else if (/graser|gras/.test(t)) out.art = 'Graser'; else if (/schlei/.test(t)) out.art = 'Schleie';
  if (/springer/.test(t)) out.was = 'Springer'; else if (/blasen/.test(t)) out.was = 'Blasen';
  return out;
}

route('sprechen', async () => {
  const a = await brauchtAnsitz(); if (!a) return h('div');
  const { s } = a;
  const feld = h('textarea', { class: 'feld', placeholder: 'z. B. „Biss Rute 2, Spiegler, zwölf Kilo“', 'aria-label': 'Was ist passiert?' });
  const erkannt = h('div', { class: 'chips' });
  const zeige = () => {
    const v = verstehe(feld.value);
    const teile = [{ fang: 'Fang', fehlbiss: 'Fehlbiss', futter: 'Gefüttert', beobachtung: 'Beobachtung' }[v.typ] + ' · ' + jetzt().slice(11)];
    if (v.rute) teile.push('Rute ' + v.rute); if (v.art) teile.push(v.art); if (v.kg) teile.push(zahl(v.kg) + ' kg'); if (v.was) teile.push(v.was);
    erkannt.replaceChildren(...(feld.value.trim() ? teile.map(t => h('span', { class: 'chip', style: 'display:inline-flex;align-items:center;border-color:#00FF5E;background:transparent' }, t)) : []));
  };
  feld.addEventListener('input', zeige);
  const speichern = async () => {
    const v = verstehe(feld.value);
    if (!feld.value.trim()) { toast('Sag oder tipp erst, was passiert ist.'); return; }
    const basis = { lakeId: s.lakeId, sessionId: s.id, time: jetzt(), rod: v.rute ? 'Rute ' + v.rute : null, notes: feld.value.trim() };
    let ok;
    if (v.typ === 'futter') {
      const f = (s.feedings || []).concat([{ time: jetzt(), kg: v.kg || null, type: /boilie/.test(feld.value.toLowerCase()) ? 'Boilies' : null, rod: v.rute ? 'Rute ' + v.rute : 'Ganzer Platz' }]);
      ok = await sicher(() => sessions.save({ id: s.id, feedings: f }));
    } else if (v.typ === 'fang') {
      ok = await sicher(() => entries.save(Object.assign(basis, { type: 'fang', species: v.art || 'Karpfen', weightKg: v.kg || null })));
    } else if (v.typ === 'beobachtung') {
      ok = await sicher(() => entries.save(Object.assign(basis, { type: 'beobachtung', kind: v.was || null })));
    } else ok = await sicher(() => entries.save(Object.assign(basis, { type: 'fehlbiss' })));
    if (ok) { syncWeather(); toast('Gespeichert ✓'); go('ansitz'); }
  };
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'ansitz', text: 'Zurück' }),
      h('div', { class: 'reihe' }, k(40), h('div', { class: 'block eng', style: 'gap:4px' }, h('span', { class: 'lbl', style: 'font-size:20px;color:#ece8dc' }, 'Krisiu hört zu …'), h('span', { class: 'klein' }, 'Tipp ins Feld und nimm das Mikro deiner Tastatur.')))),
    h('div', { class: 'block' }, feld, lbl('Krisiu hat verstanden'), erkannt,
      h('p', { class: 'klein' }, 'Geht auch: „Fehlbiss Rute 1“ · „Gefüttert, ein Kilo Boilies, Rute 2“ · „Springer im Osten“')),
    h('div', { class: 'block' }, h('button', { class: 'btn rot', type: 'button', onclick: speichern }, 'Speichern'),
      h('button', { class: 'btn rand', type: 'button', onclick: () => go('ansitz') }, 'Abbrechen'))
  ], { voll: true });
});

/* ---------- 3c · Ruten und Plätze ---------- */
route('ruten', async () => {
  const a = await brauchtAnsitz(); if (!a) return h('div');
  const { s } = a;
  const ruten = rutenVon(s);
  const karte = await mapOf(s.lakeId);
  const neu = async () => {
    const r = ruten.concat([{ nr: (ruten.reduce((m, x) => Math.max(m, x.nr), 0)) + 1 }]);
    if (await sicher(() => sessions.save({ id: s.id, rodSetups: r, rods: r.length }))) go('rute', r[r.length - 1].nr);
  };
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'ansitz', pille: 'Ansitz läuft' }), h('h1', {}, 'Ruten und Plätze')),
    h('div', { class: 'block' },
      ...ruten.map(r => h('button', { class: 'eintrag', type: 'button', style: 'border-color:' + (r.spot || r.koeder ? '#00FF5E' : '#2e2e2e'), onclick: () => go('rute', r.nr) },
        h('span', { style: 'display:flex;flex-direction:column;align-items:center;justify-content:center;width:52px;height:52px;flex:none;border-radius:10px;background:#00FF5E;color:#000;font:700 24px/1 var(--cond)' },
          h('span', { style: 'font-size:11px;letter-spacing:.1em' }, 'RUTE'), String(r.nr)),
        h('span', { class: 'text' }, h('span', { class: 'titel' }, (r.spot || 'Spot noch offen') + (r.entfernungM ? ' · ' + r.entfernungM + ' m' : '')),
          h('span', { class: 'info' }, (r.koeder && r.koeder.length ? r.koeder.join(' + ') : 'Köder noch offen') + (r.montage ? ' · ' + r.montage : ''))),
        icon('pfeil'))),
      h('button', { class: 'btn strich', type: 'button', onclick: neu }, icon('plus'), 'Rute hinzufügen'),
      karte ? h('button', { class: 'zeile', type: 'button', onclick: () => go('karte', 'platz') }, 'Angelplatz',
        h('span', { class: 'rechts' }, s.platz ? (s.platz.name || 'gesetzt') : 'noch offen', icon('pfeil'))) : null,
      h('button', { class: 'zeile', type: 'button', onclick: () => go('futter') }, 'Gefüttert',
        h('span', { class: 'rechts' }, 'bisher ' + zahl((s.feedings || []).reduce((x, f) => x + (f.kg || 0), 0)) + ' kg', icon('pfeil')))),
    h('button', { class: 'btn rot', type: 'button', onclick: () => go('ansitz') }, 'Fertig')
  ], { voll: true });
});

/* ---------- 3d · Rute einrichten ---------- */
route('rute', async nr => {
  const a = await brauchtAnsitz(); if (!a) return h('div');
  const { s } = a;
  const ruten = rutenVon(s);
  const r = Object.assign({}, ruten.find(x => String(x.nr) === String(nr)) || { nr: Number(nr) || 1 });
  const spot = h('input', { class: 'feld', placeholder: 'z. B. Kante links', value: r.spot || '' });
  const weite = h('input', { class: 'feld', inputmode: 'numeric', placeholder: 'm', value: r.entfernungM || '', style: 'width:110px;flex:none' });
  const koeder = chips(KOEDER, r.koeder || [], { mehrfach: true });
  const montage = h('input', { class: 'feld', placeholder: 'z. B. Ronnie Rig, 20 cm', value: r.montage || '' });
  const karte = await mapOf(s.lakeId);
  const felder = () => {
    const weiteNeu = Number(String(weite.value).replace(',', '.')) || null;
    const neu = Object.assign({}, r, { nr: r.nr, spot: spot.value.trim() || null, entfernungM: weiteNeu, koeder: koeder.wert(), montage: montage.value.trim() || null });
    // Andere Weite als von der Karte: dann gilt die Hand-Eingabe, die Kartenlage bleibt.
    return neu;
  };
  const sichern = neu => {
    const liste = ruten.some(x => x.nr === r.nr) ? ruten.map(x => (x.nr === r.nr ? neu : x)) : ruten.concat([neu]);
    return sicher(() => sessions.save({ id: s.id, rodSetups: liste, rods: liste.length }));
  };
  const speichern = async () => { if (await sichern(felder())) { toast('Rute ' + r.nr + ' gespeichert'); go('ruten'); } };
  const zurKarte = async () => { if (await sichern(felder())) go('karte', r.nr); };
  const entfernen = async () => {
    const liste = ruten.filter(x => x.nr !== r.nr);
    if (await sicher(() => sessions.save({ id: s.id, rodSetups: liste, rods: Math.max(1, liste.length) }))) go('ruten');
  };
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'ruten', pille: 'Rute ' + r.nr }), h('h1', {}, 'Rute ' + r.nr)),
    h('div', { class: 'block' }, lbl('Spot · wo liegt die Rute?'), h('div', { class: 'feldzeile' }, spot, weite),
      karte ? h('button', { class: 'btn neutral', type: 'button', onclick: zurKarte }, icon('pin'), r.kx != null ? 'Auf der Karte ändern' : 'Auf der Karte markieren') : null),
    h('div', { class: 'block' }, lbl('Köder'), koeder),
    h('div', { class: 'block' }, lbl('Montage'), montage),
    h('div', { class: 'block' }, h('button', { class: 'btn rot', type: 'button', onclick: speichern }, 'Speichern'),
      h('button', { class: 'btn neutral', type: 'button', onclick: entfernen }, 'Rute entfernen'))
  ], { voll: true });
});

/* ---------- 3e · Gefüttert ---------- */
route('futter', async () => {
  const a = await brauchtAnsitz(); if (!a) return h('div');
  const { s } = a;
  let kg = 1;
  const anzeige = h('span', { class: 'anzeige' }, '1,0 kg');
  const mengen = chips([[0.5, '0,5 kg'], [1, '1 kg'], [2, '2 kg'], [5, '5 kg']], 1, { raster: true, onchange: v => setze(v) });
  const setze = v => { kg = Math.max(0.5, Math.min(50, v)); anzeige.textContent = zahl(kg).replace(/^(\d+)$/, '$1,0') + ' kg'; mengen.setze([0.5, 1, 2, 5].includes(kg) ? kg : null); };
  const art = chips(FUTTER, 'Boilies');
  const fuer = chips([...rutenVon(s).map(r => 'Rute ' + r.nr), 'Ganzer Platz'], 'Ganzer Platz');
  const bisher = (s.feedings || []).reduce((x, f) => x + (f.kg || 0), 0);
  const speichern = async () => {
    const f = (s.feedings || []).concat([{ time: jetzt(), kg, type: art.wert(), rod: fuer.wert() }]);
    if (await sicher(() => sessions.save({ id: s.id, feedings: f }))) { toast(zahl(kg) + ' kg ' + art.wert() + ' gespeichert'); go('ansitz'); }
  };
  return seite([
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'ruten', pille: 'Jetzt · ' + jetzt().slice(11) }), h('h1', {}, 'Gefüttert'),
      h('p', { class: 'unter' }, 'Bisher in diesem Ansitz: ', h('b', {}, zahl(bisher) + ' kg'))),
    h('div', { class: 'block' }, lbl('Menge'), mengen,
      h('div', { class: 'feldzeile' }, h('button', { class: 'stepper', type: 'button', 'aria-label': 'Ein halbes Kilo weniger', onclick: () => setze(kg - 0.5) }, '−'), anzeige,
        h('button', { class: 'stepper', type: 'button', 'aria-label': 'Ein halbes Kilo mehr', onclick: () => setze(kg + 0.5) }, '+'))),
    h('div', { class: 'block' }, lbl('Futter'), art),
    h('div', { class: 'block' }, lbl('Für'), fuer),
    h('button', { class: 'btn rot', type: 'button', onclick: speichern }, 'Speichern')
  ], { voll: true });
});

/* ---------- 3a · Ansitz speichern? ---------- */
route('beenden', async () => {
  const a = await brauchtAnsitz(); if (!a) return h('div');
  const { s, lake } = a;
  const z = await zahlen(s);
  const ende = h('input', { class: 'feld', type: 'datetime-local', value: jetzt(), 'aria-label': 'Ende' });
  const speichern = async () => {
    const e = await sicher(() => sessions.save({ id: s.id, end: ende.value, fishCount: z.fische, bitesCount: z.bisse }));
    if (e) { syncWeather(); toast('😌 Ansitz gespeichert. War gut, draußen zu sein.'); go('auswertung', s.id); }
  };
  return seite([
    krisiuTab(STIMMUNG.zufrieden[0]),
    h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'ansitz', pille: 'Ansitz beenden' }), h('h1', {}, 'Ansitz speichern?'),
      h('span', { class: 'krisiu-zeile gruen' }, k(24), z.fische ? '🎉 Krisiu freut sich – ' + z.fische + (z.fische === 1 ? ' Fisch' : ' Fische') + '!' : '😌 Krisiu ist zufrieden – auch ohne Fisch war’s gut, draußen zu sein.')),
    h('div', { class: 'karte' }, lbl('Dieser Ansitz'), h('span', { style: 'font-size:17px;font-weight:600' }, lake ? lake.name : ''),
      h('div', { class: 'reihe', style: 'justify-content:space-between' }, h('span', { class: 'klein' }, 'Beginn'), h('b', { class: 'uhr' }, s.start.slice(11) + ' Uhr')),
      h('div', { class: 'block eng' }, h('span', { class: 'klein' }, 'Ende – falls vergessen, hier ändern'), ende),
      h('div', { class: 'reihe', style: 'justify-content:space-between' }, h('span', { class: 'klein' }, 'Fische · Bisse'), h('b', { class: 'uhr' }, z.fische + ' · ' + z.bisse))),
    h('div', { class: 'block' }, h('button', { class: 'btn rot', type: 'button', onclick: speichern }, 'Ja, speichern'),
      h('button', { class: 'btn neutral', type: 'button', onclick: () => go('ansitz') }, 'Weiter angeln'))
  ], { voll: true });
});
