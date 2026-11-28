// Auswertung ohne Oberfläche: Bisse nach Wetter, Tageszeit, Köder, Uhrzeit; Tagesbewertung für die Planung.
// Grundsatz: nur echte Werte. Fehlt etwas, bleibt es leer und wird so benannt.

import { isNum, HOUR, DAY, compass } from '../core/util.js';
import { sunTimes } from '../core/astro.js';

export const BISS_ARTEN = ['fang', 'verloren', 'fehlbiss'];
export const bisseAus = e => e.filter(x => BISS_ARTEN.includes(x.type));
export const fischeAus = e => e.filter(x => x.type === 'fang');
export const KARPFEN = ['Spiegler', 'Schuppi', 'Spiegelkarpfen', 'Schuppenkarpfen', 'Zeilkarpfen', 'Lederkarpfen', 'Karpfen'];
export const istKarpfen = sp => !!sp && KARPFEN.some(k => sp.toLowerCase().includes(k.toLowerCase()));
const zahlDe = (n, d = 1) => (isNum(n) ? Number(n).toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: d }) : '–');

/* ---------- Einordnung eines Bisses ---------- */
export const WIND_GRUPPE = { N: 'N/NO', NO: 'N/NO', O: 'O/SO', SO: 'O/SO', S: 'S/SW', SW: 'S/SW', W: 'W/NW', NW: 'W/NW' };
export function druckKlasse(w) {
  if (!w) return null;
  const d = isNum(w.pressure3h) ? w.pressure3h : isNum(w.pressure24h) ? w.pressure24h / 8 : null;
  if (d == null) return null;
  return d <= -0.5 ? 'fallend' : d >= 0.5 ? 'steigend' : 'stabil';
}
export const tagesKlasse = e => {
  const p = e.ctx && e.ctx.dayPhase;
  if (!p) return null;
  return p === 'Nacht' ? 'Nacht' : /dämmerung/i.test(p) ? 'Dämmerung' : 'Tag';
};
export const regenKlasse = w => (w && isNum(w.precipMm) ? (w.precipMm > 0.05 ? 'Regen' : 'trocken') : null);
export const luftKlasse = w => (w && isNum(w.tempC) ? (w.tempC < 3 ? 'kalt' : w.tempC < 7 ? 'kühl' : w.tempC < 14 ? 'mild' : 'warm') : null);
export const windKlasse = w => (w && w.windDir ? WIND_GRUPPE[w.windDir] || null : null);
const staerke = kmh => (!isNum(kmh) ? '' : kmh < 10 ? 'schwach' : kmh < 25 ? 'mäßig' : 'kräftig');

function zaehle(liste, f) {
  const z = {};
  let n = 0;
  liste.forEach(x => { const k = f(x); if (k) { z[k] = (z[k] || 0) + 1; n++; } });
  const top = Object.keys(z).sort((a, b) => z[b] - z[a])[0] || null;
  return { z, n, top, k: top ? z[top] : 0 };
}

/** Kacheln „Die meisten Bisse kamen …“: je Merkmal die häufigste Lage und wie viele Bisse dazu passen. */
export function faktoren(bisse) {
  const mitWetter = bisse.filter(b => b.weather);
  const w = b => b.weather;
  const out = [];
  const druck = zaehle(mitWetter, b => druckKlasse(w(b)));
  if (druck.n) {
    const p = mitWetter.filter(b => isNum(w(b).pressureHpa)).map(b => w(b).pressureHpa);
    const von = p.length ? zahlDe(p[0], 0) : '', bis = p.length ? zahlDe(p[p.length - 1], 0) : '';
    const spanne = p.length > 1 ? (von === bis ? ', um ' + von : ', ' + von + ' → ' + bis) : '';
    out.push({ key: 'druck', label: 'Luftdruck', wert: druck.top + spanne, k: druck.k, n: druck.n, klasse: druck.top });
  }
  const tag = zaehle(bisse, tagesKlasse);
  if (tag.n) out.push({ key: 'tag', label: 'Tageszeit', wert: tag.top, k: tag.k, n: tag.n, klasse: tag.top });
  const regen = zaehle(mitWetter, b => regenKlasse(w(b)));
  if (regen.n) out.push({ key: 'regen', label: 'Regen', wert: regen.top === 'Regen' ? 'meist bei Regen' : 'meist trocken', k: regen.k, n: regen.n, klasse: regen.top,
    detail: (regen.z.Regen || 0) + ' mit · ' + (regen.z.trocken || 0) + ' ohne' });
  const wind = zaehle(mitWetter, b => windKlasse(w(b)));
  if (wind.n) {
    const passend = mitWetter.filter(b => windKlasse(w(b)) === wind.top);
    const kmh = passend.map(b => w(b).windKmh).filter(isNum);
    const mittel = kmh.length ? kmh.reduce((s, v) => s + v, 0) / kmh.length : null;
    const dirs = zaehle(passend, b => w(b).windDir);
    out.push({ key: 'wind', label: 'Wind', wert: (staerke(mittel) ? staerke(mittel) + ' aus ' : 'aus ') + dirs.top, k: wind.k, n: wind.n, klasse: wind.top });
  }
  const luft = zaehle(mitWetter, b => luftKlasse(w(b)));
  if (luft.n) {
    const t = mitWetter.map(b => w(b).tempC).filter(isNum);
    out.push({ key: 'luft', label: 'Luft', wert: luft.top + ', ' + zahlDe(Math.min(...t), 0) + ' bis ' + zahlDe(Math.max(...t), 0) + ' °C', k: luft.k, n: luft.n, klasse: luft.top });
  }
  return out;
}

const PHRASE = {
  druck: { fallend: 'bei fallendem Druck', steigend: 'bei steigendem Druck', stabil: 'bei stabilem Druck' },
  tag: { Nacht: 'nachts', Dämmerung: 'in der Dämmerung', Tag: 'tagsüber' },
  regen: { Regen: 'bei Regen', trocken: 'bei trockenem Wetter' },
  luft: { kalt: 'bei kalter Luft', kühl: 'bei kühler Luft', mild: 'bei milder Luft', warm: 'bei warmer Luft' }
};
/** Überschrift: die zwei deutlichsten Merkmale (mind. 60 % der Bisse, mind. 3 Bisse). */
export function muster(bisse, f = faktoren(bisse)) {
  if (bisse.length < 3) return { titel: bisse.length ? 'Zu wenig Bisse für ein Muster' : 'Noch keine Bisse', klar: false };
  const stark = f.filter(x => x.n >= 3 && x.k / x.n >= 0.6).sort((a, b) => b.k / b.n - a.k / a.n || (a.key === 'tag' ? -1 : 1));
  if (!stark.length) return { titel: 'Kein klares Muster', klar: false };
  const teile = stark.slice(0, 2).map(x => (x.key === 'wind' ? 'bei Wind aus ' + x.klasse : (PHRASE[x.key] || {})[x.klasse])).filter(Boolean);
  const t = teile.join(', ');
  return { titel: t.charAt(0).toUpperCase() + t.slice(1), klar: true, merkmale: stark.slice(0, 2) };
}

/** Paare für „Bisse nach Wetterlage“. */
export function wetterPaare(bisse) {
  const mw = bisse.filter(b => b.weather);
  const c = (liste, f) => liste.filter(f).length;
  const paare = [];
  const dk = mw.filter(b => druckKlasse(b.weather));
  if (dk.length) paare.push([['Druck fällt', c(dk, b => druckKlasse(b.weather) === 'fallend')], ['Druck steigt', c(dk, b => druckKlasse(b.weather) === 'steigend')]]);
  const tk = bisse.filter(b => tagesKlasse(b));
  if (tk.length) paare.push([['Nacht', c(tk, b => tagesKlasse(b) === 'Nacht')], ['Tag', c(tk, b => tagesKlasse(b) !== 'Nacht')]]);
  const rk = mw.filter(b => regenKlasse(b.weather));
  if (rk.length) paare.push([['Bei Regen', c(rk, b => regenKlasse(b.weather) === 'Regen')], ['Ohne Regen', c(rk, b => regenKlasse(b.weather) === 'trocken')]]);
  const wk = zaehle(mw, b => windKlasse(b.weather));
  if (wk.n) paare.push([['Wind aus ' + wk.top, wk.k], ['Andere Richtung', wk.n - wk.k]]);
  return paare;
}

/** Bisse in Blöcken zu je drei Stunden (0–3, 3–6 … 21–24 Uhr). */
export function nachUhrzeit(bisse) {
  const bl = Array.from({ length: 8 }, (_, i) => ({ von: i * 3, n: 0 }));
  bisse.forEach(b => { const hr = new Date(b.ts).getHours(); bl[Math.floor(hr / 3)].n++; });
  return bl;
}

/** Zählt nach einem Feld (z. B. Köder); leere Werte als „ohne Angabe“. */
export function nachFeld(liste, f, leer = 'ohne Angabe') {
  const z = new Map();
  liste.forEach(x => { const k = f(x) || leer; z.set(k, (z.get(k) || 0) + 1); });
  return [...z.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
}

/* ---------- Wetter über Stunden: Nächte, Tage, Zusammenfassung ---------- */
/** Nächte (Sonnenuntergang bis -aufgang) im Zeitraum. */
export function naechte(fromMs, toMs, lat, lon) {
  if (!isNum(lat)) return [];
  const out = [];
  for (let t = fromMs - DAY; t <= toMs + DAY; t += DAY) {
    const d = new Date(t), heute = sunTimes(d, lat, lon), morgen = sunTimes(new Date(t + DAY), lat, lon);
    if (heute.sunset != null && morgen.sunrise != null) out.push({ von: heute.sunset, bis: morgen.sunrise });
  }
  return out.filter(n => n.bis > fromMs && n.von < toMs);
}

/** Tageswerte aus Stundenwerten (Ortszeit): Nacht davor (20–8 Uhr), Tag 8–20 Uhr, Druck, Wind, Wolken, Regen. */
export function tagesWerte(hours, tagStartMs) {
  const sel = (a, b) => hours.filter(h => h.t >= a && h.t < b);
  const nacht = sel(tagStartMs - 4 * HOUR, tagStartMs + 8 * HOUR), tag = sel(tagStartMs + 8 * HOUR, tagStartMs + 20 * HOUR), ganz = sel(tagStartMs, tagStartMs + DAY);
  const v = (l, f) => l.map(h => h[f]).filter(isNum);
  if (ganz.length < 12) return null;
  const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const p = v(ganz, 'pressureHpa');
  const dirs = {};
  ganz.forEach(h => { const c = compass(h.windDeg); if (c) dirs[c] = (dirs[c] || 0) + 1; });
  return {
    nachtMin: v(nacht, 'tempC').length ? Math.min(...v(nacht, 'tempC')) : null,
    tagMax: v(tag, 'tempC').length ? Math.max(...v(tag, 'tempC')) : null,
    druckVon: p.length ? p[0] : null, druckBis: p.length ? p[p.length - 1] : null,
    druckMittel: mean(p),
    wind: Object.keys(dirs).sort((a, b) => dirs[b] - dirs[a])[0] || null,
    windKmh: mean(v(ganz, 'windKmh')),
    boeen: v(ganz, 'gustKmh').length ? Math.max(...v(ganz, 'gustKmh')) : null,
    wolken: mean(v(ganz, 'cloudPct')),
    regen: v(ganz, 'precipMm').reduce((s, x) => s + x, 0),
    vorhersage: ganz.some(h => !h.measured)
  };
}

/**
 * Tagesbewertung nach der Beißzeiten-Methodik des Anglers (Faustregeln, keine Garantie):
 * milde Nächte, Erwärmung, bedeckt, fallender Druck, S/SW-Wind, leichter Regen = gut;
 * Frost, klar + Hochdruck, N/O-Wind, steigender Druck nach Kaltfront = schlecht.
 * Weiher (flach) reagiert stärker als der Baggersee; in kalten, stabilen Phasen läuft tiefes Wasser besser.
 */
export function tagesSterne(t, vortag, art = 'baggersee') {
  if (!t) return null;
  let p = 3;
  const gruende = [];
  const dp = isNum(t.druckVon) && isNum(t.druckBis) ? t.druckBis - t.druckVon : null;
  if (isNum(t.nachtMin)) {
    if (t.nachtMin < -2) { p -= 1.5; gruende.push('Frostnacht'); } else if (t.nachtMin < 0) { p -= 1; gruende.push('leichter Frost'); }
    else if (t.nachtMin < 3) p -= 0.5; else if (t.nachtMin >= 9) { p += 1; gruende.push('sehr milde Nacht'); } else if (t.nachtMin >= 6) { p += 0.5; gruende.push('milde Nacht'); }
  }
  if (dp != null) {
    if (dp <= -4) { p += 1; gruende.push('Druck fällt deutlich'); } else if (dp <= -1.5) { p += 0.5; gruende.push('Druck fällt'); }
    else if (dp >= 4) { p -= 1; gruende.push('Druck steigt stark'); } else if (dp >= 1.5) { p -= 0.5; gruende.push('Druck steigt'); }
  }
  if (isNum(t.wolken)) {
    if (t.wolken >= 70) { p += 0.5; gruende.push('bedeckt'); }
    else if (t.wolken <= 25 && isNum(t.druckMittel) && t.druckMittel >= 1022) { p -= 0.5; gruende.push('klar bei Hochdruck'); }
  }
  if (t.wind && (t.windKmh || 0) >= 6) {
    if (['S', 'SW', 'W'].includes(t.wind)) { p += 0.5; gruende.push('Wind aus ' + t.wind); }
    else if (['N', 'NO', 'O'].includes(t.wind)) { p -= 0.5; gruende.push('Wind aus ' + t.wind); }
  }
  // Erwärmung gegenüber dem Vortag (Methodik: „Erwärmung“ ist gut)
  if (vortag && isNum(vortag.tagMax) && isNum(t.tagMax)) {
    const dt = t.tagMax - vortag.tagMax;
    if (dt >= 2) { p += 0.5; gruende.push('wärmer als am Vortag'); } else if (dt <= -3) { p -= 0.5; gruende.push('kälter als am Vortag'); }
  }
  if (t.regen >= 0.5 && t.regen <= 8) { p += 0.5; gruende.push('leichter Regen'); } else if (t.regen > 20) { p -= 0.5; gruende.push('sehr viel Regen'); }
  let umschwung = false;
  if (vortag && isNum(vortag.nachtMin) && isNum(t.nachtMin) && t.nachtMin - vortag.nachtMin >= 3 && (t.wolken || 0) >= 60 && ((vortag.wolken || 100) <= 50 || vortag.nachtMin < 2)) {
    p += 1; umschwung = true; gruende.unshift('Umschwung kalt-klar → mild-trüb');
  }
  const kaltStabil = isNum(t.nachtMin) && t.nachtMin < 2 && dp != null && dp > -1.5 && (t.druckMittel || 0) >= 1018;
  const mildNass = isNum(t.nachtMin) && t.nachtMin >= 5 && t.regen >= 0.5;
  if (art === 'weiher') {
    p = 3 + (p - 3) * 1.2;
    if (kaltStabil) p -= 0.5;
    if (mildNass) p += 0.5;
  } else if (kaltStabil) p += 0.5;
  const sterne = Math.max(1, Math.min(5, Math.round(p)));
  return { sterne, roh: p, gruende, umschwung, kaltStabil, mildNass, druckAenderung: dp };
}
export const STERNE_WORT = ['', 'schlecht', 'schwach', 'mäßig', 'gut', 'sehr gut'];

/** Bestes Beißfenster nach der Methodik. */
export function beissfenster(t, b) {
  if (!t || !b) return null;
  if (b.druckAenderung != null && b.druckAenderung <= -4) return { zeit: 'je später, desto besser – bis die Front durch ist', text: 'Vor der Front fressen sie. Bleib bis in den Abend und die Nacht.' };
  if ((isNum(t.nachtMin) && t.nachtMin < 3) && (t.wolken == null || t.wolken < 60)) return { zeit: '11 bis 15 Uhr und die Dämmerung', text: 'Kalt und klar: mittags, wenn es am wärmsten ist, und in der Dämmerung.' };
  if (isNum(t.nachtMin) && t.nachtMin >= 4 && (t.wolken || 0) >= 60) return { zeit: 'ganztags bis in die Nacht', text: 'Mild und trüb: Die Fische sind über den ganzen Tag aktiv, auch nachts.' };
  return { zeit: '11 bis 15 Uhr und die Dämmerung', text: 'Keine klare Wetterlage: am ehesten mittags und in der Dämmerung.' };
}
