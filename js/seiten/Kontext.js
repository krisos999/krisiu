// 6a · Kontext (Wetter vor und nach dem Ansitz) und 6b · Erweitert – 1:1 wie Entwurf.
// Alles aus echten Stundenwerten und eigenen Einträgen; fehlende Werte werden benannt, nicht geschätzt.
import VK from '../vorlagen/Kontext.js';
import macheK from '../vorlagen/Kontext.logik.js';
import VE from '../vorlagen/Erweitert.js';
import macheE from '../vorlagen/Erweitert.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum, HOUR, DAY, compass } from '../core/util.js';
import { sunTimes, moonAt, moonName } from '../core/astro.js';
import { go, zahl } from '../ui/app.js';
import { stundenFuer, rutenVon } from '../ui/daten.js';
import { ladeAnsitz } from '../ui/auswertung.js';
import { druckKlasse, regenKlasse, istKarpfen, wetterPaare, nachUhrzeit, nachFeld, tagesWerte, naechte } from '../ui/analyse.js';
import { fotoVon } from '../ui/fische.js';
import { zeitraumKurz } from './Auswertung.js';

const p2 = n => String(n).padStart(2, '0');
const tagStart = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const plusTage = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
const dm = ms => { const d = new Date(ms); return d.getDate() + '.' + (d.getMonth() + 1) + '.'; };
const spanne = (a, b) => { const x = new Date(a), y = new Date(b); return x.getMonth() === y.getMonth() ? `${x.getDate()}.–${y.getDate()}.${y.getMonth() + 1}.` : `${dm(a)}–${dm(b)}`; };
const WORT = ['null', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
const wort = n => WORT[n] || String(n);
const gross = s => s.charAt(0).toUpperCase() + s.slice(1);
const r0 = v => zahl(v, 0);
const minus = v => String(v).replace('-', '−');

/* ---------- Grafik: Druck, Luft, Regen je Tag, Ansitz-Streifen, Bisse (wie Entwurf) ---------- */
function skala(lo, hi, yTop, yBot, k, v0, y0, schritt) {
  for (let i = 0; i <= 12; i++) {
    for (const s of i ? [i, -i] : [0]) {
      const v = v0 + s * schritt, y = p => y0 + (v - p) * k;
      if (y(hi) >= yTop && y(lo) <= yBot) return y;
    }
  }
  const k2 = (yBot - yTop) / ((hi - lo) || 1);
  return p => yTop + (hi - p) * k2;
}
export function kontextSvg({ hours, tag0, tage, bandA, bandB, bisse }) {
  const x0 = 34, pw = 274, dw = pw / tage, X = t => x0 + (t - tag0) / DAY * dw;
  const f1 = v => Math.round(v * 10) / 10;
  const out = [`<rect x="34" y="8" width="274" height="294" fill="#050505"></rect>`,
    `<rect x="${f1(X(bandA))}" y="8" width="${f1(X(bandB) - X(bandA))}" height="294" fill="#6c6c6c"></rect>`];
  for (let i = 1; i < tage; i++) { const t = plusTage(tag0, i); if (t === bandA || t === bandB) continue; out.push(`<path d="M${f1(X(t))} 8V302" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"></path>`); }
  out.push(`<text x="${f1((X(bandA) + X(bandB)) / 2)}" y="22" fill="#ece8dc" font-family="Barlow Condensed, sans-serif" font-size="11.5" font-weight="600" letter-spacing="1.4" text-anchor="middle">ANSITZ</text>`);
  const ende = plusTage(tag0, tage);
  const pts = hours.filter(h => h.t >= tag0 && h.t <= ende && new Date(h.t).getHours() % 3 === 0);
  const P = pts.filter(h => isNum(h.pressureHpa)), T = pts.filter(h => isNum(h.tempC));
  const yP = P.length ? skala(Math.min(...P.map(h => h.pressureHpa)), Math.max(...P.map(h => h.pressureHpa)), 30, 135, 2.26, 1020, 52.6, 20) : null;
  const yT = T.length ? skala(Math.min(...T.map(h => h.tempC)), Math.max(...T.map(h => h.tempC)), 150, 240, 5.2, 10, 173.6, 10) : null;
  const linie = (y, v, text) => `<path d="M34 ${f1(y)}H308" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1"></path><text x="28" y="${f1(y + 3.5)}" fill="#a39f93" font-family="Barlow, sans-serif" font-size="10.5" text-anchor="end">${text}</text>`;
  if (yP) for (let v = 940; v <= 1060; v += 20) { const y = yP(v); if (y >= 36 && y <= 140) out.push(linie(y, v, String(v))); }
  if (yT) for (let v = -30; v <= 40; v += 10) { const y = yT(v); if (y >= 150 && y <= 245) out.push(linie(y, v, minus(v) + '°')); }
  bisse.filter(b => b.ts >= tag0 && b.ts <= ende).forEach(b => out.push(`<path d="M${f1(X(b.ts))} 28V302" stroke="#ff1e1e" stroke-width="1.6" opacity="0.95"></path>`));
  const pfad = (l, f, y) => l.length > 1 ? `<path d="${l.map((h, i) => (i ? 'L' : 'M') + f1(X(h.t)) + ' ' + f1(y(h[f]))).join('')}" fill="none" stroke="#ece8dc" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>` : '';
  if (yP) out.push(pfad(P, 'pressureHpa', yP));
  if (yT) out.push(pfad(T, 'tempC', yT));
  out.push(`<text x="38" y="61" fill="#ece8dc" font-family="Barlow Condensed, sans-serif" font-size="11.5" font-weight="600" letter-spacing="1.4" text-anchor="start">DRUCK · HPA</text>`,
    `<text x="38" y="166.1" fill="#ece8dc" font-family="Barlow Condensed, sans-serif" font-size="11.5" font-weight="600" letter-spacing="1.4" text-anchor="start">LUFT · °C</text>`);
  const regen = [];
  for (let i = 0; i < tage; i++) {
    const a = plusTage(tag0, i), b = plusTage(tag0, i + 1), hs = hours.filter(h => h.t >= a && h.t < b && isNum(h.precipMm));
    regen.push(hs.length ? hs.reduce((s, h) => s + h.precipMm, 0) : null);
  }
  const rmax = Math.max(0, ...regen.filter(isNum)), k = rmax > 22 ? 40 / rmax : 40 / 22;
  regen.forEach((mm, i) => {
    if (!isNum(mm) || mm < 0.1) return;
    const c = x0 + (i + 0.5) * dw, hgt = Math.max(2, mm * k);
    out.push(`<rect x="${f1(c - 6)}" y="${Math.round((296 - hgt) * 1000) / 1000}" width="12" height="${Math.round(hgt * 1000) / 1000}" rx="2" fill="#3b9eff"></rect>`);
    if (Math.round(mm) >= 1) out.push(`<text x="${f1(c)}" y="${Math.round((292 - hgt) * 1000) / 1000}" fill="#ece8dc" font-family="Barlow Condensed, sans-serif" font-size="11" font-weight="600" text-anchor="middle">${Math.round(mm)}</text>`);
  });
  for (let i = 0; i < tage; i++) {
    const t = plusTage(tag0, i), imBand = t >= bandA && t < bandB;
    out.push(`<text x="${f1(x0 + (i + 0.5) * dw)}" y="318" fill="${imBand ? '#ece8dc' : '#a39f93'}" font-family="Barlow, sans-serif" font-size="10.5" font-weight="${imBand ? 600 : 400}" text-anchor="middle">${new Date(t).getDate()}.</text>`);
  }
  const label = `Luftdruck, Lufttemperatur und Tagesregen vom ${dm(tag0)} bis ${dm(plusTage(tag0, tage - 1))}, der Ansitz ist hervorgehoben`;
  return `<svg width="314" height="340" viewBox="0 0 314 340" role="img" aria-label="${label}" style="display: block">${out.join('')}</svg>`;
}

/* ---------- Texte: was das Wetter davor und danach gemacht hat ---------- */
function nachtWerte(hours, a, b) {
  const out = [];
  for (let d = tagStart(a); d < b; d = plusTage(d, 1)) { const tw = tagesWerte(hours, d); if (tw && isNum(tw.nachtMin) && d + 8 * HOUR > a) out.push({ d, v: tw.nachtMin }); }
  return out;
}
function regenJeTag(hours, a, b) {
  const out = [];
  for (let d = tagStart(a); d < b; d = plusTage(d, 1)) {
    const hs = hours.filter(h => h.t >= Math.max(a, d) && h.t < Math.min(b, plusTage(d, 1)) && isNum(h.precipMm));
    out.push({ d, mm: hs.reduce((s, h) => s + h.precipMm, 0) });
  }
  return out;
}
const naechteText = n => {
  if (!n.length) return '';
  const lo = Math.min(...n.map(x => x.v)), hi = Math.max(...n.map(x => x.v));
  return Math.round(lo) === Math.round(hi) ? `Nächte um ${minus(r0(lo))} °C` : `Nächte um ${minus(r0(lo))} bis ${minus(r0(hi))} °C`;
};
const frostText = n => { const f = n.filter(x => x.v < 0).length; return f ? (f === 1 ? 'eine Frostnacht' : wort(f) + ' Frostnächte') : null; };
const regenWort = mm => (mm < 0.5 ? 'trocken' : mm < 5 ? 'etwas Regen' : r0(mm) + ' mm Regen');
const dauerDativ = ms => { const h = Math.round(ms / HOUR); return h < 36 ? h + ' Stunden' : (Math.round(h / 24) === 1 ? 'einem Tag' : wort(Math.round(h / 24)) + ' Tagen'); };
const regenTage = tage => {
  const viel = tage.filter(t => t.mm >= 5);
  if (!viel.length) return null;
  const sum = viel.reduce((s, t) => s + t.mm, 0);
  if (viel.length === 1) return `am ${dm(viel[0].d)} ${r0(viel[0].mm)} mm Regen`;
  if (viel.length === 2) return `am ${new Date(viel[0].d).getDate()}. und ${dm(viel[1].d)} viel Regen`;
  return `vom ${new Date(viel[0].d).getDate()}. bis ${dm(viel[viel.length - 1].d)} rund ${r0(sum)} mm Regen`;
};

export function davorText(hours, von, start) {
  const hs = hours.filter(h => h.t >= von && h.t <= start && isNum(h.pressureHpa));
  if (hs.length < 12) return null;
  const pEnd = hs[hs.length - 1].pressureHpa, fenster = hs.filter(h => h.t >= start - 96 * HOUR);
  const hoch = fenster.reduce((m, h) => (h.pressureHpa > m.pressureHpa ? h : m)), tief = fenster.reduce((m, h) => (h.pressureHpa < m.pressureHpa ? h : m));
  let zug = null;
  if (hoch.pressureHpa - pEnd >= 5 && hoch.pressureHpa - pEnd >= pEnd - tief.pressureHpa) zug = { art: 'fall', t: hoch.t, d: hoch.pressureHpa - pEnd };
  else if (pEnd - tief.pressureHpa >= 5) zug = { art: 'steig', t: tief.t, d: pEnd - tief.pressureHpa };
  const vorTeil = hs.filter(h => h.t <= (zug ? zug.t : start));
  const tageVor = Math.round(((zug ? zug.t : start) - von) / DAY);
  const n = nachtWerte(hours, von, start), frost = frostText(n);
  const regen = regenJeTag(hours, von, zug ? zug.t : start).reduce((s, t) => s + t.mm, 0);
  let erst = null;
  if (vorTeil.length >= 12 && tageVor >= 1) {
    const p = vorTeil.map(h => h.pressureHpa), lo = Math.min(...p), hi = Math.max(...p), m = p.reduce((s, x) => s + x, 0) / p.length, d = p[p.length - 1] - p[0];
    erst = { ruhig: hi - lo < 7, m, lo, hi, titel: hi - lo < 7 ? (m >= 1020 ? 'Stabiles Hoch' : m < 1005 ? 'Tiefdruck' : 'Ruhige Lage') : d >= 5 ? 'Der Druck stieg' : d <= -5 ? 'Der Druck fiel' : 'Wechselhaft' };
  }
  let titel;
  if (erst && zug) titel = erst.titel === 'Der Druck fiel' && zug.art === 'fall' ? 'Der Druck fiel bis zum Start' : erst.titel === 'Der Druck stieg' && zug.art === 'steig' ? 'Der Druck stieg bis zum Start' : `${erst.titel}, dann ${zug.art === 'fall' ? 'fiel' : 'stieg'} der Druck`;
  else if (zug) titel = `Der Druck ${zug.art === 'fall' ? 'fiel' : 'stieg'} bis zum Start`;
  else titel = (erst ? erst.titel : 'Ruhige Lage') + ' bis zum Start';
  if (frost) titel += ', ' + frost;
  const satz = [];
  if (erst) satz.push(`${gross(tageVor === 1 ? 'ein Tag' : wort(tageVor) + ' Tage')} ${erst.ruhig ? 'ruhig um ' + r0(erst.m) + ' hPa' : 'zwischen ' + r0(erst.lo) + ' und ' + r0(erst.hi) + ' hPa'}, ${regenWort(regen)}${n.length ? ', ' + naechteText(n) : ''}.`);
  else if (n.length) satz.push(naechteText(n) + '.');
  if (zug) satz.push(`Ab dem ${dm(zug.t)} ging es ${zug.art === 'fall' ? 'abwärts' : 'aufwärts'}: ${r0(zug.d)} hPa in ${dauerDativ(start - zug.t)} bis zum Start.`);
  return { titel, text: satz.join(' ') };
}

export function danachText(hours, ende, bis) {
  const hs = hours.filter(h => h.t >= ende && h.t <= bis && isNum(h.pressureHpa));
  if (hs.length < 12) return null;
  const p0 = hs[0].pressureHpa, erste = hs.filter(h => h.t <= ende + 72 * HOUR);
  const hoch = erste.reduce((m, h) => (h.pressureHpa > m.pressureHpa ? h : m)), tief = erste.reduce((m, h) => (h.pressureHpa < m.pressureHpa ? h : m));
  let zug = null;
  if (hoch.pressureHpa - p0 >= 5 && hoch.pressureHpa - p0 >= p0 - tief.pressureHpa) zug = { art: 'steig', h: hoch, d: hoch.pressureHpa - p0 };
  else if (p0 - tief.pressureHpa >= 5) zug = { art: 'fall', h: tief, d: p0 - tief.pressureHpa };
  const n = nachtWerte(hours, ende, bis), frost = frostText(n), tage = regenJeTag(hours, ende, bis);
  const regen = tage.reduce((s, t) => s + t.mm, 0);
  const p = hs.map(h => h.pressureHpa), m = p.reduce((s, x) => s + x, 0) / p.length;
  let titel;
  if (zug) {
    const rate = zug.d / Math.max(1, (zug.h.t - ende) / HOUR);
    titel = zug.art === 'steig' ? (zug.d >= 10 && rate >= 0.4 ? 'Druck schoss hoch' : 'Druck stieg') : (zug.d >= 10 ? 'Druck fiel stark' : 'Druck fiel');
  } else titel = m >= 1020 ? 'Stabiles Hoch' : 'Ruhige Lage';
  titel += frost ? ', ' + frost : regen >= 15 ? ', dann viel Regen' : '';
  const satz = [];
  const nacht = n.length ? (Math.min(...n.map(x => x.v)) < 0 ? 'nachts bis ' + minus(zahl(Math.min(...n.map(x => x.v)))) + ' °C' : naechteText(n)) : null;
  if (zug) satz.push(`In ${Math.round((zug.h.t - ende) / HOUR)} Stunden von ${r0(p0)} auf ${r0(zug.h.pressureHpa)} hPa${nacht ? ', ' + nacht : ''}.`);
  else satz.push(`Um ${r0(m)} hPa${nacht ? ', ' + nacht : ''}.`);
  // Danach: dreht der Druck wieder?
  const rest = hs.filter(h => h.t > (zug ? zug.h.t : ende));
  if (rest.length >= 6) {
    const start = zug ? zug.h : hs[0], pr = rest.map(h => h.pressureHpa), pe = pr[pr.length - 1];
    const lo = Math.min(...pr), hi = Math.max(...pr);
    const rt = regenTage(tage.filter(t => t.d >= tagStart(start.t)));
    if ((!zug || zug.art === 'steig') && start.pressureHpa - lo >= 5) {
      satz.push(`Ab dem ${dm(start.t)} ${zug ? 'wieder fallend' : 'fiel der Druck'}` + (rt ? ', ' + rt : '') + (lo < 995 ? ` und ein Tief bis ${r0(lo)} hPa.` : `, bis zum ${dm(rest[rest.length - 1].t)} auf ${r0(pe)} hPa.`));
    } else if (zug && zug.art === 'fall' && hi - start.pressureHpa >= 5) {
      satz.push(`Ab dem ${dm(start.t)} stieg er wieder, bis auf ${r0(hi)} hPa` + (rt ? '; ' + rt : '') + '.');
    } else if (rt) satz.push(gross(rt) + '.');
  }
  if (hs.some(h => !h.measured)) satz.push('Teilweise Vorhersage.');
  return { titel, text: satz.join(' ') };
}

/* ---------- Kontext ---------- */
class Kontext extends macheK(DCLogic) {
  componentDidMount() {
    const a = this.props.daten; if (!a) return go('Logbuch');
    this.lade(this.tage());
  }
  tage() { return [3, 5, 7][this.aktuell('g0')[0]]; }
  aktuellSpezial(g, st) { return g === 'g0' && !(st.sel && st.sel.g0) ? [this.props.param && /~3$/.test(this.props.param) ? 0 : /~7$/.test(this.props.param || '') ? 2 : 1] : null; }
  wahlSpezial(g, i) {
    if (g !== 'g0') return false;
    this.setState({ sel: Object.assign({}, this.state && this.state.sel, { g0: [i] }) });
    this.lade([3, 5, 7][i]);
    return true;
  }
  rahmen(tage) {
    const a = this.props.daten, bandA = tagStart(a.von), bandB = plusTage(tagStart(a.bis), 1);
    return { tage: tage * 2 + Math.round((bandB - bandA) / DAY), tag0: plusTage(bandA, -tage), bandA, bandB };
  }
  async lade(tage) {
    const a = this.props.daten, r = this.rahmen(tage);
    this.setState({ laedt: tage });
    const d = await stundenFuer(a.lake, r.tag0, Math.min(plusTage(r.tag0, r.tage), Date.now() + 2 * DAY));
    if ((this.state || {}).laedt !== tage) return;
    this.setState({ hours: d.hours || [], grund: d.grund, quelle: d.quelle, fuer: tage });
  }
  zeichne(el) {
    const a = this.props.daten, st = this.state || {};
    if (!el) return;
    const key = st.hours ? st.fuer : 'leer';
    if (el.__key === key) return;
    el.__key = key;
    if (!st.hours) { el.innerHTML = '<p style="margin: 0; padding: 150px 0; text-align: center; font-size: 14px; color: #a39f93">Wetter wird geladen …</p>'; return; }
    const r = this.rahmen(st.fuer);
    el.innerHTML = st.hours.length ? kontextSvg({ hours: st.hours, tag0: r.tag0, tage: r.tage, bandA: r.bandA, bandB: r.bandB, bisse: a.bisse })
      : `<p style="margin: 0; padding: 150px 0; text-align: center; font-size: 14px; color: #a39f93">${a.lake && a.lake.lat == null ? 'Das Gewässer hat keine Koordinaten.' : 'Das Wetter kommt, sobald Netz da ist.'}</p>`;
  }
  extra(st) {
    const a = this.props.daten; if (!a) return {};
    const tage = this.tage(), r = this.rahmen(tage), karten = [];
    const vorBis = plusTage(r.bandA, -1), nachVon = r.bandB, nachBis = plusTage(r.bandB, tage - 1);
    if (st.hours && st.hours.length && st.fuer === tage) {
      const vor = davorText(st.hours, r.tag0, a.von), nach = a.bis > Date.now() - 12 * HOUR ? null : danachText(st.hours, a.bis, plusTage(r.bandB, tage));
      karten.push({ label: `${tage} Tage davor · ${spanne(r.tag0, vorBis)}`, titel: vor ? vor.titel : 'Keine Werte', text: vor ? vor.text : 'Für diese Tage gibt es keine Wetterwerte.' });
      karten.push({ label: `${tage} Tage danach · ${spanne(nachVon, nachBis)}`, titel: nach ? nach.titel : 'Noch nicht vorbei', text: nach ? nach.text : 'Die Tage nach dem Ansitz kommen erst noch – schau später wieder rein.' });
    }
    return { id: a.s.id, kopf: 'Ansitz · ' + zeitraumKurz(a.s), karten, grafikRef: el => this.zeichne(el) };
  }
}
dcSeite(VK, Kontext, param => ladeAnsitz(String(param || '').split('~')[0] || null), { auch: ['kontext'] });

/* ---------- Erweitert ---------- */
const hm = ms => { const d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
const luftWort = t => (t < 3 ? 'kalt' : t < 7 ? 'kühl' : t < 14 ? 'mild' : 'warm');
function mondSvg(phase, illum) {
  const r = 24, rx = Math.round(Math.abs(1 - 2 * illum) * r * 10) / 10, zu = phase < 0.5, schmal = illum < 0.5;
  const name = moonName(phase);
  const lit = illum < 0.02 ? '' : illum > 0.98 ? `<circle cx="28" cy="28" r="24" fill="#ece8dc"></circle>`
    : `<path d="M28 4a24 24 0 0 ${zu ? 1 : 0} 0 48a${rx} 24 0 0 ${zu === schmal ? 0 : 1} 0-48z" fill="#ece8dc"></path>`;
  return `<svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="${gross(name)}"><circle cx="28" cy="28" r="24" fill="#141414" stroke="#444444" stroke-width="1"></circle>${lit}</svg>`;
}
function uhrSvg(bloecke, nachtStunden) {
  const max = Math.max(1, ...bloecke.map(b => b.n));
  const out = bloecke.map((b, i) => {
    const x = 4 + i * 38.5, c = x + 17, dunkel = nachtStunden(b.von);
    let s = `<rect x="${x}" y="8" width="34" height="86" fill="${dunkel ? '#141414' : 'none'}"></rect>`;
    if (b.n) { const hgt = Math.max(6, 40 * b.n / max); s += `<rect x="${x + 4}" y="${92 - hgt}" width="26" height="${hgt}" rx="4" fill="#00FF5E"></rect><text x="${c}" y="${87 - hgt}" fill="#ece8dc" font-family="Barlow Condensed, sans-serif" font-size="15" font-weight="700" text-anchor="middle">${b.n}</text>`; }
    else s += `<text x="${c}" y="87" fill="#6f6f6f" font-family="Barlow Condensed, sans-serif" font-size="15" font-weight="700" text-anchor="middle">0</text>`;
    return s + `<text x="${c}" y="112" fill="#a39f93" font-family="Barlow, sans-serif" font-size="10.5" text-anchor="middle">${b.von}–${b.von + 3}</text>`;
  });
  return `<svg width="314" height="120" viewBox="0 0 314 120" role="img" aria-label="Bisse nach Uhrzeit in Blöcken von drei Stunden" style="display: block">${out.join('')}<path d="M4 92H310" stroke="#2e2e2e" stroke-width="1"></path></svg>`;
}
const wetterBiss = w => (w ? [isNum(w.pressureHpa) ? zahl(w.pressureHpa) + ' hPa' + (druckKlasse(w) ? ' ' + druckKlasse(w) : '') : null, isNum(w.tempC) ? zahl(w.tempC) + ' °C' : null,
  regenKlasse(w)].filter(Boolean).join(' · ') : 'Wetter fehlt noch');

class Erweitert extends macheE(DCLogic) {
  async componentDidMount() {
    const a = this.props.daten; if (!a) return go('Logbuch');
    const fotos = {};
    for (const r of rutenVon(a.s)) fotos[r.nr] = await fotoVon('rute:' + a.s.id + ':' + r.nr + ':montage');
    this.setState({ fotos });
    if (a.lake) { const d = await stundenFuer(a.lake, a.von, a.bis); this.setState({ hours: d.hours || [] }); }
  }
  extra(st) {
    const a = this.props.daten; if (!a) return {};
    const { s, lake, z, bisse, fische } = a, w = s.weather || null;
    const hs = (st.hours || []).filter(h => h.t >= a.von && h.t <= a.bis);
    const v = f => hs.map(h => h[f]).filter(isNum);
    const ohneZeit = Math.max(0, z.fische - fische.length);
    // Kopf-Kacheln
    const pv = v('pressureHpa'), pa = pv.length ? pv[0] : w && w.pressureStartHpa, pe = pv.length ? pv[pv.length - 1] : w && w.pressureEndHpa;
    const dp = isNum(pa) && isNum(pe) ? pe - pa : null;
    const tv = v('tempC'), tmin = tv.length ? Math.min(...tv) : w && w.tempMinC, tmax = tv.length ? Math.max(...tv) : w && w.tempMaxC;
    let luftText = '–';
    if (tv.length >= 6) {
      const dr = Math.max(1, Math.floor(tv.length / 3)), am = tv.slice(0, dr).reduce((x, y) => x + y, 0) / dr, ae = tv.slice(-dr).reduce((x, y) => x + y, 0) / dr;
      luftText = luftWort(am) !== luftWort(ae) ? luftWort(am) + ', dann ' + luftWort(ae) : luftWort((am + ae) / 2);
      if (tmin < 0) luftText += ', Frost';
    } else if (isNum(tmin)) luftText = tmin < 0 ? 'mit Frost' : luftWort((tmin + tmax) / 2);
    const alleKarpfen = fische.length > 0 && fische.every(e => istKarpfen(e.species));
    // Bisse nach Wetterlage
    const lage = [];
    wetterPaare(bisse).forEach((paar, i) => {
      if (i) lage.push({ sep: true });
      const sum = paar.reduce((x, p) => x + p[1], 0) || 1;
      paar.forEach(([label, n]) => lage.push({ zeile: true, label, n, w: Math.round(n / sum * 100) }));
    });
    // Fische mit Wetter
    const alle = !!st.alle, liste = alle ? fische : fische.slice(0, 3);
    // Ruten
    const ruten = rutenVon(s).map(r => {
      const meine = bisse.filter(b => b.rod === 'Rute ' + r.nr), f = meine.filter(b => b.type === 'fang').length;
      return {
        name: 'Rute ' + r.nr, foto: st.fotos ? st.fotos[r.nr] : null,
        bisse: meine.length + (meine.length === 1 ? ' Biss' : ' Bisse') + ' · ' + f + (f === 1 ? ' Fisch' : ' Fische'),
        spot: [r.spot, r.entfernungM ? r.entfernungM + ' m' : null].filter(Boolean).join(' · ') || 'Spot nicht eingetragen',
        koeder: [(r.koeder || []).join(' + '), r.montage].filter(Boolean).join(' mit ') || 'Köder nicht eingetragen'
      };
    });
    const kd = nachFeld(bisse, b => b.bait), kmax = Math.max(1, ...kd.map(x => x.n));
    // Mond, Nacht
    const mond = moonAt((a.von + a.bis) / 2);
    const tageSeitNeu = Math.round(mond.phase * 29.53), tageBisNeu = Math.round((1 - mond.phase) * 29.53), tageVoll = Math.round(Math.abs(mond.phase - 0.5) * 29.53);
    const lage2 = mond.phase < 0.25 ? (tageSeitNeu <= 1 ? 'kurz nach Neumond' : tageSeitNeu + ' Tage nach Neumond') : mond.phase < 0.5 ? (tageVoll <= 1 ? 'kurz vor Vollmond' : tageVoll + ' Tage vor Vollmond')
      : mond.phase < 0.75 ? (tageVoll <= 1 ? 'kurz nach Vollmond' : tageVoll + ' Tage nach Vollmond') : (tageBisNeu <= 1 ? 'kurz vor Neumond' : tageBisNeu + ' Tage vor Neumond');
    const proz = Math.round(mond.illum * 100);
    const nacht = lake && isNum(lake.lat) ? naechte(a.von, a.bis, lake.lat, lake.lon)[0] : null;
    const istNacht = std => {
      if (!lake || !isNum(lake.lat)) return std < 6 || std >= 18;
      const st0 = sunTimes(new Date(a.von), lake.lat, lake.lon); if (st0.sunrise == null) return false;
      const auf = new Date(st0.sunrise).getHours() + new Date(st0.sunrise).getMinutes() / 60, unter = new Date(st0.sunset).getHours() + new Date(st0.sunset).getMinutes() / 60;
      const mitte = std + 1.5; return mitte < auf || mitte > unter;
    };
    // Wind, Wolken, Regen, Wasser
    const wk = v('windKmh').sort((x, y) => x - y), dirs = {};
    hs.forEach(h => { const c = compass(h.windDeg); if (c) dirs[c] = (dirs[c] || 0) + 1; });
    const windDir = Object.keys(dirs).sort((x, y) => dirs[y] - dirs[x])[0] || (w && w.windDir) || null;
    const q = p => wk[Math.min(wk.length - 1, Math.floor(p * wk.length))];
    const gust = v('gustKmh'), wol = v('cloudPct'), wolke = wol.length ? wol.reduce((x, y) => x + y, 0) / wol.length : w && w.cloudPct;
    const rg = regenJeTag(hs, a.von, a.bis), rsum = hs.length ? rg.reduce((x, t) => x + t.mm, 0) : w && w.precipMm;
    const rtop = rg.slice().sort((x, y) => y.mm - x.mm)[0];
    const wasser = [s.waterTempC, ...z.eintraege.map(e => e.waterTempC)].filter(isNum);
    return {
      id: s.id, kopf: 'Ansitz · ' + zeitraumKurz(s),
      hinweis: ohneZeit ? `${ohneZeit} ${ohneZeit === 1 ? 'Fisch hat' : 'Fische haben'} noch keine Uhrzeit – die fehlen hier. Mit echten Bisszeiten rechnet die App neu.` : null,
      fische: String(z.fische), fischeArt: !z.fische ? 'keine' : alleKarpfen || !fische.length ? 'Karpfen' : nachFeld(fische, e => e.species).map(x => x.name).slice(0, 2).join(', '),
      druck: dp == null ? '–' : (dp > 0 ? '+' : dp < 0 ? '−' : '±') + zahl(Math.abs(dp)), druckText: isNum(pa) && isNum(pe) ? r0(pa) + ' → ' + r0(pe) : 'Wetter fehlt',
      luft: isNum(tmin) ? (Math.round(tmin) === Math.round(tmax) ? minus(r0(tmin)) : minus(r0(tmin)) + '–' + minus(r0(tmax))) + ' °C' : '–', luftText,
      lage, keineLage: !lage.length,
      fischListe: liste.map(e => ({ zeit: hm(e.ts), farbe: '#00FF5E', titel: [e.rod, e.species, isNum(e.weightKg) ? zahl(e.weightKg) + ' kg' : null].filter(Boolean).join(' · '), wetter: wetterBiss(e.weather) })),
      keineFische: !fische.length,
      mehrText: !alle && fische.length > 3 ? 'Alle ' + fische.length + ' anzeigen' : null,
      alleZeigen: ev => { if (ev) ev.preventDefault(); this.setState({ alle: true }); },
      ruten, keineRuten: !ruten.length,
      koeder: kd.map(x => ({ label: x.name, n: x.n, w: Math.round(x.n / kmax * 100) })), keineKoeder: !kd.length,
      uhrRef: el => { if (!el) return; const k = bisse.length + ':' + (lake ? lake.id : ''); if (el.__k === k) return; el.__k = k; el.innerHTML = uhrSvg(nachUhrzeit(bisse), istNacht); },
      mondRef: el => { if (!el || el.__fertig) return; el.__fertig = true; el.innerHTML = mondSvg(mond.phase, mond.illum); },
      mondName: gross(moonName(mond.phase)),
      mondText: `ca. ${proz} % beleuchtet · ${lage2}` + (mond.illum < 0.25 ? ' · dunkle Nächte' : mond.illum > 0.75 ? ' · helle Nächte' : ''),
      wind: windDir || '–', windText: wk.length ? (Math.round(q(0.1)) === Math.round(q(0.9)) ? 'um ' + r0(q(0.5)) + ' km/h' : 'meist ' + r0(q(0.1)) + '–' + r0(q(0.9)) + ' km/h') : w && isNum(w.windKmh) ? 'Ø ' + r0(w.windKmh) + ' km/h' : 'kein Wert',
      boeen: gust.length ? r0(Math.max(...gust)) + ' km/h' : w && isNum(w.gustKmh) ? r0(w.gustKmh) + ' km/h' : '–',
      wolken: isNum(wolke) ? r0(wolke) + ' %' : '–', wolkenText: isNum(wolke) ? (wolke >= 90 ? 'fast durchweg bedeckt' : wolke >= 70 ? 'meist bedeckt' : wolke >= 35 ? 'wechselnd' : 'meist klar') : 'kein Wert',
      regen: isNum(rsum) ? zahl(rsum) + ' mm' : '–', regenText: isNum(rsum) ? (rsum < 0.1 ? 'trocken' : rtop && rg.length > 1 && rtop.mm / rsum >= 0.6 ? 'v. a. am ' + dm(rtop.d) : 'im Ansitz') : 'kein Wert',
      wasser: wasser.length ? zahl(wasser[0]) + ' °C' : '–', wasserText: wasser.length ? 'eingetragen' : 'kein Wert',
      nacht: nacht ? (m => Math.floor(m / 60) + ':' + p2(m % 60))(Math.round((nacht.bis - nacht.von) / 60000)) + ' h' : '–',
      nachtText: nacht ? 'ca. ' + new Date(nacht.von).getHours() + ':' + p2(new Date(nacht.von).getMinutes()) + '–' + new Date(nacht.bis).getHours() + ':' + p2(new Date(nacht.bis).getMinutes()) : '–'
    };
  }
}
dcSeite(VE, Erweitert, id => ladeAnsitz(id), { auch: ['erweitert'] });
