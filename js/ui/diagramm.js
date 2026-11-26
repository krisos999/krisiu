// Diagramme als SVG: Wetterverlauf mit Bissen, Bisse nach Uhrzeit. Tippen zeigt die Werte zur Stelle.

import { sv } from './karte.js';
import { h } from './app.js';
import { isNum, HOUR, DAY, compass } from '../core/util.js';

const BONE = '#ece8dc', ROT = '#ff1e1e', BLAU = '#4da3ff', GRAU = '#a39f93';
const TAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const z = (n, d = 1) => (isNum(n) ? Number(n).toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: d }) : '–');
const uhr = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const tag = t => { const d = new Date(t); return TAGE[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.'; };
const mitternacht = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/**
 * Luftdruck als Linie, Bisse als rote Punkte, Regen als blaue Säulen, Wind als Pfeile, Nächte dunkel.
 * band = { von, bis } hebt einen Zeitraum hell hervor (Ansitz im Kontext).
 */
export function verlaufDiagramm({ hours, von, bis, bisse = [], naechte = [], band = null }) {
  if (!(bis - von >= 2 * HOUR)) { const m = (von + bis) / 2; von = m - HOUR; bis = m + HOUR; }
  const W = 342, H = 214, L = 36, R = 8, T = 10, PB = 118, RT = 126, RB = 156, WY = 172, XY = 200;
  const pw = W - L - R;
  const hs = hours.filter(x => x.t >= von - HOUR && x.t <= bis + HOUR);
  const x = t => L + Math.max(0, Math.min(1, (t - von) / (bis - von))) * pw;
  const ps = hs.map(x2 => x2.pressureHpa).filter(isNum);
  const teile = [];
  if (!ps.length) return h('div', { class: 'leer' }, 'Für diesen Zeitraum liegen keine Wetterwerte vor.');
  let pmin = Math.floor(Math.min(...ps) - 1), pmax = Math.ceil(Math.max(...ps) + 1);
  if (pmax - pmin < 6) { const m = (pmax + pmin) / 2; pmin = Math.floor(m - 3); pmax = Math.ceil(m + 3); }
  const y = p => PB - (p - pmin) / (pmax - pmin) * (PB - T);
  naechte.forEach(n => teile.push(sv('rect', { x: x(n.von), y: T, width: Math.max(0, x(n.bis) - x(n.von)), height: RB - T, fill: '#ffffff', 'fill-opacity': 0.06 })));
  if (band) teile.push(sv('rect', { x: x(band.von), y: T, width: Math.max(2, x(band.bis) - x(band.von)), height: RB - T, fill: '#00FF5E', 'fill-opacity': 0.12 }));
  // Achse: drei Druckwerte
  const schritt = Math.max(1, Math.round((pmax - pmin) / 3));
  for (let p = Math.ceil(pmin / schritt) * schritt; p <= pmax; p += schritt) {
    teile.push(sv('line', { x1: L, x2: W - R, y1: y(p), y2: y(p), stroke: '#2e2e2e', 'stroke-width': 1 }));
    teile.push(sv('text', { x: L - 5, y: y(p) + 3.5, 'text-anchor': 'end', fill: GRAU, 'font-size': 10, 'font-family': 'Barlow, sans-serif' }, z(p, 0)));
  }
  // Regen
  const regen = hs.filter(r => isNum(r.precipMm) && r.precipMm > 0);
  const rmax = Math.max(2, ...regen.map(r => r.precipMm));
  const bw = Math.max(1.2, pw / Math.max(1, (bis - von) / HOUR) - 0.4);
  regen.forEach(r => { const hh = (r.precipMm / rmax) * (RB - RT); teile.push(sv('rect', { x: x(r.t) - bw / 2, y: RB - hh, width: bw, height: hh, fill: BLAU, rx: 0.5 })); });
  teile.push(sv('line', { x1: L, x2: W - R, y1: RB, y2: RB, stroke: '#444', 'stroke-width': 1 }));
  // Druck-Linie
  const pts = hs.filter(r => isNum(r.pressureHpa));
  teile.push(sv('path', { d: 'M' + pts.map(r => x(r.t).toFixed(1) + ' ' + y(r.pressureHpa).toFixed(1)).join('L'), fill: 'none', stroke: BONE, 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  // Wind-Pfeile (zeigen, wohin der Wind weht)
  const stdSchritt = Math.max(1, Math.ceil((bis - von) / HOUR / 14));
  hs.filter((r, i) => i % stdSchritt === 0 && isNum(r.windDeg)).forEach(r =>
    teile.push(sv('path', { d: 'M0 -6L0 6M-3.2 2.4L0 6L3.2 2.4', transform: `translate(${x(r.t).toFixed(1)} ${WY}) rotate(${(r.windDeg + 180) % 360})`, stroke: GRAU, 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' })));
  // Zeitachse
  const spanne = bis - von;
  const tick = spanne <= 40 * HOUR ? 6 * HOUR : spanne <= 6 * DAY ? DAY : 2 * DAY;
  for (let t = mitternacht(von); t <= bis; t += tick) {
    if (t < von) continue;
    const d = new Date(t);
    const text = tick < DAY && d.getHours() !== 0 ? d.getHours() + ' Uhr' : tag(t);
    teile.push(sv('line', { x1: x(t), x2: x(t), y1: RB, y2: RB + 4, stroke: '#444' }));
    teile.push(sv('text', { x: x(t), y: XY, 'text-anchor': 'middle', fill: GRAU, 'font-size': 10, 'font-family': 'Barlow, sans-serif' }, text));
  }
  // Bisse
  const druckBei = t => { let best = null; pts.forEach(r => { if (!best || Math.abs(r.t - t) < Math.abs(best.t - t)) best = r; }); return best ? best.pressureHpa : null; };
  bisse.filter(b => b.ts >= von && b.ts <= bis).forEach(b => {
    const p = isNum(b.weather && b.weather.pressureHpa) ? b.weather.pressureHpa : druckBei(b.ts);
    if (!isNum(p)) return;
    teile.push(sv('circle', { cx: x(b.ts), cy: y(p), r: 4.5, fill: b.type === 'fang' ? ROT : '#000', stroke: ROT, 'stroke-width': 2 }));
  });
  const marke = sv('line', { x1: 0, x2: 0, y1: T, y2: RB, stroke: BONE, 'stroke-opacity': 0.5, 'stroke-dasharray': '3 3', visibility: 'hidden' });
  teile.push(marke);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Wetterverlauf: Luftdruck, Regen, Wind und Bisse' }, teile);
  const ablesen = h('p', { class: 'klein', style: 'margin:0;min-height:17px' }, 'Tippe ins Diagramm für die Werte zu einer Stunde.');
  svg.addEventListener('click', ev => {
    const b = svg.getBoundingClientRect();
    const t = von + ((ev.clientX - b.left) / b.width * W - L) / pw * (bis - von);
    let best = null; hs.forEach(r => { if (!best || Math.abs(r.t - t) < Math.abs(best.t - t)) best = r; });
    if (!best) return;
    marke.setAttribute('x1', x(best.t)); marke.setAttribute('x2', x(best.t)); marke.setAttribute('visibility', 'visible');
    const nah = bisse.filter(bb => Math.abs(bb.ts - best.t) < 45 * 60000).length;
    ablesen.textContent = [tag(best.t) + ' ' + uhr(best.t), z(best.pressureHpa, 1) + ' hPa', z(best.tempC) + ' °C',
      (compass(best.windDeg) || '–') + ' ' + z(best.windKmh, 0) + ' km/h', z(best.precipMm) + ' mm', nah ? nah + (nah === 1 ? ' Biss' : ' Bisse') : null].filter(Boolean).join(' · ');
  });
  return h('div', { class: 'diagramm' }, svg, ablesen);
}

/** Bisse nach Uhrzeit in Blöcken zu drei Stunden; dunkle Blöcke liegen in der Nacht. */
export function uhrzeitDiagramm(bloecke, sonne) {
  const W = 342, H = 130, L = 8, R = 8, T = 16, B = 104;
  const max = Math.max(1, ...bloecke.map(b => b.n));
  const bw = (W - L - R) / 8;
  const teile = [];
  bloecke.forEach((b, i) => {
    const mitte = b.von + 1.5;
    const nacht = sonne ? (mitte < sonne.auf || mitte > sonne.unter) : (mitte < 6 || mitte > 18);
    if (nacht) teile.push(sv('rect', { x: L + i * bw, y: T - 10, width: bw, height: B - T + 10, fill: '#ffffff', 'fill-opacity': 0.06 }));
    const hh = (b.n / max) * (B - T);
    if (b.n) teile.push(sv('rect', { x: L + i * bw + 6, y: B - hh, width: bw - 12, height: hh, fill: '#ff1e1e', rx: 3 }));
    teile.push(sv('text', { x: L + i * bw + bw / 2, y: b.n ? B - hh - 4 : B - 4, 'text-anchor': 'middle', fill: b.n ? BONE : '#444', 'font-size': 11, 'font-weight': 600, 'font-family': 'Barlow, sans-serif' }, String(b.n)));
    teile.push(sv('text', { x: L + i * bw + bw / 2, y: B + 16, 'text-anchor': 'middle', fill: GRAU, 'font-size': 10, 'font-family': 'Barlow, sans-serif' }, b.von + '–' + (b.von + 3)));
  });
  teile.push(sv('line', { x1: L, x2: W - R, y1: B, y2: B, stroke: '#444' }));
  return sv('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Bisse nach Uhrzeit in Blöcken zu drei Stunden: ' + bloecke.map(b => b.von + ' bis ' + (b.von + 3) + ' Uhr ' + b.n).join(', ') }, teile);
}

/** Waagrechte Balken (z. B. Bisse nach Köder). */
export function balken(liste) {
  const max = Math.max(1, ...liste.map(x => x.n));
  return h('div', { class: 'balkenliste' }, ...liste.map(x => h('div', { class: 'balkenzeile' },
    h('span', { class: 'name' }, x.name),
    h('span', { class: 'spur' }, h('span', { class: 'fuell', style: 'width:' + Math.round(x.n / max * 100) + '%' })),
    h('b', {}, String(x.n)))));
}
