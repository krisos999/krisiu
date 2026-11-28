// „Wetter und Bisse im Verlauf“ – SVG genau wie im Entwurf: Tag hell mit Sonne, Nacht dunkel mit Mond,
// Druck- und Temperaturkurve, Windpfeile alle 6 Stunden, Regen als blaue Balken, Bisse als rote Linien mit Punkt.
import { isNum, DAY, HOUR } from '../core/util.js';
import { sunTimes } from '../core/astro.js';

const X0 = 34, X1 = 308, BONE = '#ece8dc', GRAU = '#a39f93';
const RICHTUNG = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const kompass = d => RICHTUNG[Math.round((((d % 360) + 360) % 360) / 45) % 8];
const f1 = n => Math.round(n * 10) / 10;
const sonne = (x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="#ffd21e"></circle><path d="${[0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = a * Math.PI / 180; return `M${f1(x + Math.cos(r) * 6)} ${f1(y + Math.sin(r) * 6)}L${f1(x + Math.cos(r) * 8.5)} ${f1(y + Math.sin(r) * 8.5)}`; }).join('')}" stroke="#ffd21e" stroke-width="1.6" stroke-linecap="round"></path>`;
const mond = (x, y) => `<path d="M${f1(x - 3.4)} ${y - 7}a7 7 0 1 0 7.6 9.4a5.6 5.6 0 0 1 -7.6 -9.4z" fill="${BONE}"></path>`;
const tag0 = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Zeitfenster: ganze Kalendertage des Ansitzes (höchstens 4). */
export function fenster(von, bis) {
  const a = tag0(von); let b = tag0(bis) + DAY;
  if (b - a > 4 * DAY) b = a + 4 * DAY;
  return { a, b };
}

export function verlaufSvg({ hours, von, bis, bisse = [], lake }) {
  const { a, b } = fenster(von, bis);
  const X = t => f1(X0 + (t - a) / (b - a) * (X1 - X0));
  const teile = [];
  // Tag und Nacht
  const nachtTeile = [], tagTeile = [];
  for (let t = a; t < b; t += DAY) {
    const s = lake && isNum(lake.lat) ? sunTimes(new Date(t + 12 * HOUR), lake.lat, lake.lon) : { sunrise: t + 7.5 * HOUR, sunset: t + 16.75 * HOUR };
    const auf = s.sunrise || t + 7.5 * HOUR, unter = s.sunset || t + 16.75 * HOUR;
    nachtTeile.push([t, auf]); tagTeile.push([auf, unter]); nachtTeile.push([unter, t + DAY]);
  }
  // benachbarte Nachtstücke zusammenlegen
  const naechte = [];
  nachtTeile.forEach(([p, q]) => { const l = naechte[naechte.length - 1]; if (l && Math.abs(l[1] - p) < 1000) l[1] = q; else naechte.push([p, q]); });
  naechte.forEach(([p, q]) => teile.push(`<rect x="${X(p)}" y="-14" width="${f1(X(q) - X(p))}" height="348" fill="#050505"></rect>`));
  tagTeile.forEach(([p, q]) => teile.push(`<rect x="${X(p)}" y="-14" width="${f1(X(q) - X(p))}" height="348" fill="#6c6c6c"></rect>`));
  tagTeile.forEach(([p, q]) => teile.push(sonne(f1((X(p) + X(q)) / 2), 2)));
  naechte.forEach(([p, q]) => { if (X(q) - X(p) > 16) teile.push(mond(f1((X(p) + X(q)) / 2), 2)); });
  // Skalen
  const inF = hours.filter(h => h.t >= a && h.t <= b);
  const druck = inF.filter(h => isNum(h.pressureHpa)), temp = inF.filter(h => isNum(h.tempC));
  if (druck.length) {
    const ps = druck.map(h => h.pressureHpa);
    let pMax = Math.ceil(Math.max(...ps)), pMin = Math.floor(Math.min(...ps)); if (pMax - pMin < 4) { pMax += 2; pMin -= 2; }
    const Y = p => f1(101 - (p - pMin) / (pMax - pMin) * 66);
    teile.push(`<path d="M34 35H308" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1"></path><text x="28" y="38.5" fill="${GRAU}" font-family="Barlow, sans-serif" font-size="10.5" text-anchor="end">${pMax}</text>`);
    teile.push(`<path d="M34 101H308" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1"></path><text x="28" y="104.5" fill="${GRAU}" font-family="Barlow, sans-serif" font-size="10.5" text-anchor="end">${pMin}</text>`);
    var druckPfad = 'M' + druck.map(h => X(h.t) + ' ' + Y(h.pressureHpa)).join('L');
    const tief = druck.reduce((m, h) => (!m || h.pressureHpa < m.pressureHpa ? h : m), null);
    var tiefMarke = tief && tief.t > a + 2 * HOUR && tief.t < b - 2 * HOUR ? `<circle cx="${X(tief.t)}" cy="${Y(tief.pressureHpa)}" r="4" fill="#000000" stroke="${BONE}" stroke-width="2"></circle><text x="${X(tief.t)}" y="${f1(Y(tief.pressureHpa) + 17)}" fill="${BONE}" font-family="Barlow, sans-serif" font-size="11" font-weight="600" text-anchor="middle">Tief ${Math.round(tief.pressureHpa)}</text>` : '';
  }
  if (temp.length) {
    const ts = temp.map(h => h.tempC);
    const tMin = Math.min(0, Math.floor(Math.min(...ts) / 5) * 5), tMax = Math.max(10, Math.ceil(Math.max(...ts) / 5) * 5);
    const T = c => f1(204 - (c - tMin) / (tMax - tMin) * 56.7);
    teile.push(`<path d="M34 147.3H308" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1"></path><text x="28" y="150.8" fill="${GRAU}" font-family="Barlow, sans-serif" font-size="10.5" text-anchor="end">${tMax}°</text>`);
    teile.push(`<path d="M34 204H308" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1"></path><text x="28" y="207.5" fill="${GRAU}" font-family="Barlow, sans-serif" font-size="10.5" text-anchor="end">${tMin}°</text>`);
    var tempPfad = 'M' + temp.map(h => X(h.t) + ' ' + T(h.tempC)).join('L');
  }
  // Bisse (Linien unter den Kurven)
  const imFenster = bisse.filter(x => x.ts >= a && x.ts <= b);
  imFenster.forEach(x => teile.push(`<path d="M${X(x.ts)} 20V322" stroke="#ff1e1e" stroke-width="1.6" opacity="0.95"></path>`));
  if (druckPfad) teile.push(`<path d="${druckPfad}" fill="none" stroke="${BONE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>`);
  if (tempPfad) teile.push(`<path d="${tempPfad}" fill="none" stroke="${BONE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>`);
  if (druckPfad) teile.push(`<text x="38" y="94" fill="${BONE}" font-family="Barlow Condensed, sans-serif" font-size="11.5" font-weight="600" letter-spacing="1.4">DRUCK · HPA</text>`);
  if (tempPfad) teile.push(`<text x="38" y="166.5" fill="${BONE}" font-family="Barlow Condensed, sans-serif" font-size="11.5" font-weight="600" letter-spacing="1.4">LUFT · °C</text>`);
  if (tiefMarke) teile.push(tiefMarke);
  // Wind alle 6 Stunden
  for (let t = a + 3 * HOUR; t < b; t += 6 * HOUR) {
    const h = inF.reduce((m, x) => (!m || Math.abs(x.t - t) < Math.abs(m.t - t) ? x : m), null);
    if (!h || !isNum(h.windDeg) || Math.abs(h.t - t) > 2 * HOUR) continue;
    teile.push(`<g transform="translate(${X(t)} 232) rotate(${Math.round(h.windDeg)})"><path d="M0 -6V6M-3.5 2.5L0 6L3.5 2.5" fill="none" stroke="${BONE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g><text x="${X(t)}" y="251" fill="${BONE}" font-family="Barlow Condensed, sans-serif" font-size="11" font-weight="600" text-anchor="middle">${kompass(h.windDeg)}</text>`);
  }
  // Regen je Stunde
  const breite = Math.max(1.5, Math.min(4, (X1 - X0) / ((b - a) / HOUR) - 1.8));
  inF.filter(h => isNum(h.precipMm) && h.precipMm > 0.04).forEach(h => {
    const hh = Math.min(26, h.precipMm * 17.33);
    teile.push(`<rect x="${f1(X(h.t) - breite / 2)}" y="${f1(296 - hh)}" width="${f1(breite)}" height="${f1(hh)}" rx="1" fill="#3b9eff"></rect>`);
  });
  imFenster.forEach(x => teile.push(x.type === 'fang'
    ? `<circle cx="${X(x.ts)}" cy="322" r="5" fill="#ff1e1e" stroke="#000000" stroke-width="1.5"></circle>`
    : `<circle cx="${X(x.ts)}" cy="322" r="4.5" fill="#000000" stroke="#ff1e1e" stroke-width="2"></circle>`));
  // Zeitachse
  const tage = (b - a) / DAY;
  for (let t = a, i = 0; t < b; t += DAY, i++) {
    const d = new Date(t);
    teile.push(`<text x="${i === 0 ? X(t) : X(t)}" y="346" fill="${GRAU}" font-family="Barlow, sans-serif" font-size="10.5" text-anchor="${i === 0 ? 'start' : 'middle'}">${d.getDate()}.${d.getMonth() + 1}.</text>`);
    if (tage <= 2) teile.push(`<text x="${X(t + 12 * HOUR)}" y="346" fill="${GRAU}" font-family="Barlow, sans-serif" font-size="10.5" text-anchor="middle">12 Uhr</text>`);
  }
  return `<svg width="314" height="386" viewBox="0 -18 314 386" role="img" aria-label="Verlauf von Luftdruck, Lufttemperatur, Windrichtung und Regen über den Ansitz mit Tag und Nacht, dazu die Bisse als rote Linien" style="display: block">${teile.join('')}</svg>`;
}
