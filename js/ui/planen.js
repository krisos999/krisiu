// Ansitz planen: Vorhersage (DWD über Bright Sky, Ersatz Open-Meteo) → Sterne je Tag und Gewässer
// nach den Faustregeln des Anglers. Ab dem 7. Tag ist die Vorhersage nur eine Tendenz.
// Platz-Tipps stehen nicht im Programm, sondern kommen je Gewässer aus der privaten Startdatei.

import { isNum, DAY, HOUR } from '../core/util.js';
import { settings } from '../core/repo.js';
import { h, icon, route, go, seite, kopf, lbl, k, chips, toast, zahl } from './app.js';
import { alleSeen, stundenFuer } from './daten.js';
import { tagesWerte, tagesSterne, beissfenster, STERNE_WORT } from './analyse.js';

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ausIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const kurz = d => TAGE[d.getDay()].slice(0, 2) + ' ' + d.getDate() + '.';
const kurzM = d => kurz(d) + (d.getMonth() + 1) + '.';
const lang = d => TAGE[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
const heute0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const sterneEl = (n, gross = false) => h('span', { class: 'sterne' + (gross ? ' gross' : ''), role: 'img', 'aria-label': n + ' von 5 Sternen' },
  ...[0, 1, 2, 3, 4].map(i => h('span', { class: i < n ? '' : 'aus' }, '★')));
const druckWort = b => (b.druckAenderung == null ? 'Druck ?' : b.druckAenderung <= -1.5 ? 'Druck fällt' : b.druckAenderung >= 1.5 ? 'Druck steigt' : 'Druck stabil');
const wolkenWort = w => (!isNum(w) ? '' : w >= 80 ? 'bedeckt' : w >= 40 ? 'wolkig' : 'klar');
const windWort = kmh => (!isNum(kmh) ? '' : kmh < 10 ? 'schwach' : kmh < 25 ? 'mäßig' : 'kräftig');

/** Bewertet Tage für ein Gewässer. Liefert je Tag Werte und Sterne (oder null, wenn keine Vorhersage da ist). */
export async function bewerte(lake, tage) {
  const a = Math.min(...tage.map(d => d.getTime())), b = Math.max(...tage.map(d => d.getTime()));
  const d = await stundenFuer(lake, a - 2 * DAY, b + DAY + HOUR);
  return {
    quelle: d.quelle, grund: d.grund,
    tage: tage.map(tag => {
      const t = tagesWerte(d.hours, tag.getTime()), v = tagesWerte(d.hours, tag.getTime() - DAY);
      return { tag, t, b: t ? tagesSterne(t, v, lake.art) : null, tendenz: (tag.getTime() - heute0().getTime()) / DAY >= 6 };
    })
  };
}

/** Bester Tag der nächsten Tage über alle Gewässer mit Koordinaten (für Krisius Frage auf dem Start). */
export async function besteChance(anzahl = 5) {
  const seen = (await alleSeen()).filter(l => isNum(l.lat));
  if (!seen.length || navigator.onLine === false) return null;
  const tage = Array.from({ length: anzahl }, (_, i) => new Date(heute0().getTime() + i * DAY + 2 * HOUR)).map(d => { d.setHours(0, 0, 0, 0); return d; });
  let best = null;
  for (const lake of seen) {
    const r = await bewerte(lake, tage);
    r.tage.forEach(x => { if (x.b && (!best || x.b.roh > best.b.roh)) best = Object.assign({ lake }, x); });
  }
  return best;
}

/* ---------- Planen ---------- */
route('planen', async () => {
  const seen = (await alleSeen()).filter(l => isNum(l.lat));
  if (!seen.length) {
    return seite([h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: 'start' }), h('h1', {}, 'Ansitz planen'),
      h('p', { class: 'unter' }, 'Zum Planen braucht ein Gewässer Koordinaten. Leg eins an oder lies deine Startdatei ein.')),
    h('button', { class: 'btn rot', type: 'button', onclick: () => go('gewaesser', 'neu') }, 'Gewässer anlegen')], { voll: true });
  }
  const st = { see: seen.length > 1 ? 'alle' : seen[0].id, wann: 'tn', modus: 'zeitraum' };
  const tage = Array.from({ length: 10 }, (_, i) => { const d = new Date(heute0().getTime() + i * DAY + 2 * HOUR); d.setHours(0, 0, 0, 0); return d; });
  let gewaehlt = tage.slice(0, 5).map(iso);
  const tagChips = chips(tage.map(d => [iso(d), kurz(d)]), gewaehlt, { mehrfach: true, grau: true, raster: true, onchange: v => {
    if (st.modus === 'tag') { const neu = v.filter(x => !gewaehlt.includes(x)); gewaehlt = neu.length ? [neu[0]] : v.slice(0, 1); tagChips.setze(gewaehlt); } else gewaehlt = v;
  } });
  tagChips.classList.add('fuenf');
  const pruefen = () => {
    if (!gewaehlt.length) { toast('Wähl mindestens einen Tag.', { fehler: true }); return; }
    go('planergebnis', [st.see, st.wann, gewaehlt.slice().sort().join(',')].join('~'));
  };
  return seite([
    h('div', { class: 'block', style: 'gap:14px' }, kopf({ zurueck: 'start', pille: 'Mit Krisiu' }), h('h1', {}, 'Ansitz planen')),
    h('div', { class: 'block eng' }, lbl('Was hast du vor?'),
      chips([...seen.map(l => [l.id, l.short]), ...(seen.length > 1 ? [['alle', seen.length === 2 ? 'Beide' : 'Alle']] : [])], st.see, { grau: true, onchange: v => { st.see = v; } }),
      chips([['tag', 'Tag'], ['nacht', 'Nacht'], ['tn', 'Tag und Nacht']], st.wann, { grau: true, onchange: v => { st.wann = v; } })),
    h('div', { class: 'block eng' }, lbl('Wann?'),
      chips([['tag', 'Ein Tag'], ['zeitraum', 'Zeitraum']], st.modus, { grau: true, onchange: v => { st.modus = v; if (v === 'tag') { gewaehlt = gewaehlt.slice(0, 1); tagChips.setze(gewaehlt); } } }),
      tagChips),
    h('p', { class: 'klein', style: 'margin:0' }, 'Sterne nach deinen Faustregeln aus der Wettervorhersage. Ab dem 7. Tag nur Tendenz.'),
    h('button', { class: 'btn rot', type: 'button', onclick: pruefen }, 'Chancen prüfen')
  ], { voll: true });
});

/* ---------- Ergebnis ---------- */
route('planergebnis', async param => {
  const [see, wann, tageTxt] = String(param || '').split('~');
  const seen = (await alleSeen()).filter(l => isNum(l.lat) && (see === 'alle' || l.id === see));
  const tage = (tageTxt || '').split(',').filter(Boolean).map(ausIso);
  if (!seen.length || !tage.length) { go('planen'); return h('div'); }
  const box = h('div', { class: 'block' }, h('div', { class: 'leer' }, 'Vorhersage wird geholt …'));
  const titel = tage.length === 1 ? kurzM(tage[0]) : tage[0].getDate() + '.–' + tage[tage.length - 1].getDate() + '.' + (tage[tage.length - 1].getMonth() + 1) + '.';
  (async () => {
    const erg = [];
    for (const lake of seen) erg.push(Object.assign({ lake }, await bewerte(lake, tage)));
    const alle = erg.flatMap(r => r.tage.filter(x => x.b).map(x => Object.assign({ lake: r.lake }, x)));
    if (!alle.length) {
      box.replaceChildren(h('div', { class: 'leer' }, navigator.onLine === false ? 'Ohne Netz gibt es keine Vorhersage. Versuch es gleich noch mal.' : 'Für diese Tage liegt noch keine Vorhersage vor (meist bis etwa 10 Tage im Voraus).'));
      return;
    }
    const best = alle.slice().sort((a, b) => b.b.roh - a.b.roh || a.tag - b.tag)[0];
    const fenster = beissfenster(best.t, best.b);
    const kaltStabil = alle.filter(x => x.b.kaltStabil).length >= alle.length * 0.6;
    const mildNass = alle.filter(x => x.b.mildNass).length >= alle.length * 0.5;
    const umschwung = alle.find(x => x.b.umschwung);
    const warum = best.b.gruende.slice(0, 3).join(', ');
    let lage = (best.b.umschwung ? 'Umschwung von kalt-klar zu mild-trüb – das ist eine Top-Beißphase' : 'Am ' + TAGE[best.tag.getDay()] + ': ' + (warum || 'keine starken Signale')) + '. ';
    if (kaltStabil && !best.b.kaltStabil) lage += 'Die übrigen Tage sind überwiegend kalt und stabil – dann läuft tiefes Wasser besser als ein flacher Weiher.';
    else if (kaltStabil) lage += 'Die Phase bleibt kalt und stabil – tiefes Wasser läuft dann besser als ein flacher Weiher.';
    else if (mildNass) lage += 'Mild und feucht: Ein flacher Weiher reagiert darauf schneller und stärker als ein tiefer Baggersee.';
    else if (umschwung && umschwung !== best) lage += 'Achtung: Umschwung kalt-klar → mild-trüb am ' + lang(umschwung.tag) + '.';
    const quellen = [...new Set(erg.map(r => r.quelle).filter(Boolean))].join(', ');
    const zeilen = tage.map(tag => {
      const jeSee = erg.map(r => Object.assign({ lake: r.lake }, r.tage.find(x => x.tag.getTime() === tag.getTime())));
      const gut = jeSee.filter(x => x.b).sort((a, b) => b.b.roh - a.b.roh)[0];
      if (!gut) return h('div', { class: 'eintrag', style: 'cursor:default' }, h('span', { class: 'text' }, h('span', { class: 'titel' }, kurzM(tag)), h('span', { class: 'info' }, 'noch keine Vorhersage')));
      const t = gut.t;
      return h('button', { class: 'eintrag plantag', type: 'button', onclick: () => go('plantag', gut.lake.id + '~' + iso(tag) + '~' + wann) },
        h('span', { class: 'text' },
          h('span', { class: 'titel' }, kurzM(tag) + ' · ' + STERNE_WORT[gut.b.sterne] + (gut.tendenz ? ' · Tendenz' : '')),
          h('span', { class: 'info' }, [isNum(t.nachtMin) ? 'Nacht ' + zahl(t.nachtMin, 0) + ' °C' : null, druckWort(gut.b), t.wind ? 'Wind ' + t.wind : null, wolkenWort(t.wolken)].filter(Boolean).join(' · ')),
          jeSee.length > 1 ? h('span', { class: 'info' }, jeSee.map(x => x.lake.short + ' ' + (x.b ? '★'.repeat(x.b.sterne) : '–')).join(' · ')) : null),
        sterneEl(gut.b.sterne), icon('pfeil'));
    });
    box.replaceChildren(
      h('div', { class: 'karte bester' }, lbl('Bester Tag im Zeitraum'), h('b', { class: 'kontext-titel' }, lang(best.tag) + ' · ' + best.lake.short),
        h('div', { class: 'reihe' }, sterneEl(best.b.sterne, true), h('span', {}, best.b.sterne + ' von 5 · ' + STERNE_WORT[best.b.sterne] + (best.tendenz ? ' · nur Tendenz' : ''))),
        h('span', { style: 'font-size:15px;line-height:1.45' }, lage),
        fenster ? h('span', { class: 'klein', style: 'font-size:14px' }, 'Bestes Fenster: ' + fenster.zeit) : null,
        h('span', { class: 'klein' }, 'Wenn du nur einmal kannst: ' + lang(best.tag) + ', ' + best.lake.name + '.'),
        h('span', { class: 'klein' }, 'Beruht auf: Vorhersage ' + (quellen || 'Wetterdienst') + ' vom ' + new Date().getDate() + '.' + (new Date().getMonth() + 1) + '. und deinen Faustregeln.')),
      h('div', { class: 'block eng' }, lbl('Tag für Tag'), ...zeilen));
  })();
  return seite([
    h('div', { class: 'block', style: 'gap:14px' }, kopf({ zurueck: 'planen', pille: titel }), h('h1', {}, 'Deine Chancen'),
      h('p', { class: 'unter' }, seen.map(l => l.short).join(' und ') + ' · ' + ({ tag: 'Tag', nacht: 'Nacht', tn: 'Tag und Nacht' }[wann] || 'Tag und Nacht') + ' · ' + tage.length + (tage.length === 1 ? ' Tag' : ' Tage') + ' geprüft')),
    box,
    h('button', { class: 'btn neutral', type: 'button', onclick: () => go('krisiu') }, k(26), 'Krisiu dazu fragen')
  ]);
});

/* ---------- Ein Tag im Detail ---------- */
function platzTipp(lake, t, b) {
  const tipps = lake.tipps || null;
  if (!tipps) return 'Für dieses Gewässer habe ich noch keine Platz-Regeln. Die kommen mit deiner Startdatei oder sobald genug Fänge da sind.';
  const teile = [];
  const mild = isNum(t.nachtMin) && t.nachtMin >= 4;
  const front = b.druckAenderung != null && b.druckAenderung <= -1.5;
  if (b.kaltStabil || (isNum(t.nachtMin) && t.nachtMin < 2 && !front)) teile.push(tipps.kalt); else if (mild) teile.push(tipps.mild); else teile.push(tipps.normal || tipps.kalt);
  if (t.wind && tipps.wind && tipps.wind[t.wind]) teile.push(tipps.wind[t.wind]);
  return teile.filter(Boolean).join(' ');
}
route('plantag', async param => {
  const [lakeId, tagTxt, wann] = String(param || '').split('~');
  const lake = (await alleSeen()).find(l => l.id === lakeId);
  if (!lake || !tagTxt) { go('planen'); return h('div'); }
  const tag = ausIso(tagTxt);
  const r = await bewerte(lake, [tag]);
  const x = r.tage[0];
  if (!x.b) return seite([h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck: () => history.back() }), h('h1', {}, lang(tag)), h('div', { class: 'leer' }, 'Für diesen Tag liegt keine Vorhersage vor.'))]);
  const { t, b } = x;
  const f = beissfenster(t, b);
  const kachel = (l, w, s) => h('div', { class: 'kachel' }, h('span', { class: 'lbl' }, l), h('b', { style: 'font-size:26px' }, w), h('small', {}, s));
  return seite([
    h('div', { class: 'block', style: 'gap:14px' }, kopf({ zurueck: () => history.back(), pille: kurzM(tag) + ' · ' + lake.short }), h('h1', {}, lang(tag)),
      h('div', { class: 'reihe' }, sterneEl(b.sterne, true), h('b', { style: 'font:700 22px/1 var(--cond);text-transform:uppercase' }, STERNE_WORT[b.sterne]), x.tendenz ? h('span', { class: 'pille' }, 'Tendenz') : null)),
    h('div', { class: 'kacheln' },
      kachel('Nacht', isNum(t.nachtMin) ? zahl(t.nachtMin, 0) + ' °C' : '–', isNum(t.nachtMin) ? (t.nachtMin < -2 ? 'Frost' : t.nachtMin < 0 ? 'leichter Frost' : t.nachtMin < 5 ? 'kalt' : 'mild') : ''),
      kachel('Tag', isNum(t.tagMax) ? zahl(t.tagMax, 0) + ' °C' : '–', 'höchstens'),
      kachel('Druck', druckWort(b).replace('Druck ', ''), isNum(t.druckVon) ? zahl(t.druckVon, 0) + '→' + zahl(t.druckBis, 0) : ''),
      kachel('Wind', t.wind || '–', windWort(t.windKmh) + (isNum(t.boeen) && t.boeen >= 40 ? ', Böen ' + zahl(t.boeen, 0) : '')),
      kachel('Wolken', isNum(t.wolken) ? Math.round(t.wolken) + ' %' : '–', wolkenWort(t.wolken)),
      kachel('Regen', zahl(t.regen) + ' mm', t.regen < 0.2 ? 'trocken' : t.regen <= 8 ? 'leicht' : 'viel')),
    b.gruende.length ? h('div', { class: 'karte' }, lbl('Warum so viele Sterne'), h('span', { style: 'font-size:15px' }, b.gruende.join(' · '))) : null,
    f ? h('div', { class: 'karte bester' }, lbl('Bestes Fenster'), h('b', { class: 'kontext-titel' }, f.zeit), h('span', { style: 'font-size:15px;line-height:1.45' }, f.text)) : null,
    h('div', { class: 'karte' }, lbl('Platz und Montage · ' + lake.short), h('span', { style: 'font-size:15px;line-height:1.45' }, platzTipp(lake, t, b))),
    h('p', { class: 'klein' }, 'Beruht auf: Vorhersage ' + (r.quelle || 'Wetterdienst') + ' vom ' + new Date().getDate() + '.' + (new Date().getMonth() + 1) + '. und deinen Faustregeln. Keine Garantie – Fische lesen keine Wetterberichte.'),
    h('button', { class: 'btn neutral', type: 'button', onclick: () => go('krisiu') }, k(26), 'Krisiu dazu fragen')
  ]);
});

/* ---------- Krisius Frage auf dem Start: „Wann gehen wir angeln?“ (nur ab ★★★★) ---------- */
export async function krisiuFrage() {
  const best = await besteChance(5).catch(() => null);
  if (!best || best.b.sterne < 4) return null;
  const woche = (() => { const d = new Date(); const j = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + '-' + Math.ceil(((d - j) / DAY + j.getDay() + 1) / 7); })();
  if ((await settings.get('krisiuFrageZu')) === woche) return null;
  return {
    text: '🤩 ' + lang(best.tag) + ' sieht gut aus am ' + best.lake.short + ' (' + '★'.repeat(best.b.sterne) + '). Wann gehen wir angeln?',
    kurz: lang(best.tag) + ' ' + '★'.repeat(best.b.sterne) + ' am ' + best.lake.short,
    planen: () => go('plantag', best.lake.id + '~' + iso(best.tag) + '~tn'),
    keineZeit: async () => { await settings.set('krisiuFrageZu', woche); toast('Verstanden, ich halt die Füße still … bis nächste Woche. 🥲'); }
  };
}
