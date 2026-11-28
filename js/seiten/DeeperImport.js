// 4d · Import aus Deeper – 1:1 wie Entwurf. Liest die CSV aus der Deeper-App (latitude, longtitude, depth, temperature, time),
// zeigt die Fahrten auf der Karte, und die angetippte Stelle wird zum Spot der Rute. Alles bleibt auf dem Handy.
import V from '../vorlagen/DeeperImport.js';
import mache from '../vorlagen/DeeperImport.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum } from '../core/util.js';
import { lakes, mapOf, spotsOf, settings } from '../core/repo.js';
import { geoZuKarte, aufKarte, wurfweite } from '../core/karte.js';
import { sv, grundkarte } from '../ui/karte.js';
import { go, zahl } from '../ui/app.js';
import { laufenderAnsitz } from '../ui/daten.js';
import { rutenEntwurfVon } from './fangfluss.js';
import { auswahl } from './Fang.js';

const B = 342, H = 250;
const TIEF = ['#c8ecff', '#aadeff', '#8ccef9', '#6ebaff', '#50a4fa', '#3a8cf0', '#2c76e2', '#2260ce', '#1a4cb8', '#143aa0', '#0e2882'];

/** CSV aus der Deeper-App lesen. Liefert Messpunkte (eine je Sekunde) mit Karte-Lage, Fahrten und Zeitraum. */
export function deeperLesen(text, map) {
  const zeilen = text.split(/\r?\n/).filter(z => z.trim());
  if (zeilen.length < 2) throw new Error('Die Datei ist leer.');
  const trenn = zeilen[0].includes(';') && !zeilen[0].includes(',') ? ';' : ',';
  const kopf = zeilen[0].split(trenn).map(x => x.trim().toLowerCase().replace(/"/g, ''));
  const sp = n => kopf.findIndex(k => n.some(x => k === x || k.startsWith(x)));
  const iLat = sp(['latitude', 'lat']), iLon = sp(['longtitude', 'longitude', 'lon', 'lng']), iD = sp(['depth']), iT = sp(['temperature', 'temp']), iZ = sp(['time', 'timestamp']);
  if (iLat < 0 || iLon < 0 || iD < 0) throw new Error('Das sieht nicht nach einer Deeper-Datei aus (Spalten latitude, longtitude, depth fehlen).');
  const roh = [];
  for (let k = 1; k < zeilen.length; k++) {
    const f = zeilen[k].split(trenn), lat = parseFloat(f[iLat]), lon = parseFloat(f[iLon]), dep = parseFloat(f[iD]);
    if (!isNum(lat) || !isNum(lon) || !isNum(dep) || (lat === 0 && lon === 0)) continue;
    let t = iZ >= 0 ? parseFloat(f[iZ]) : NaN; if (isNum(t) && t < 1e12) t *= 1000;
    roh.push({ lat, lon, dep, temp: iT >= 0 ? parseFloat(f[iT]) : NaN, t });
  }
  if (!roh.length) throw new Error('In der Datei stehen keine Messungen mit Position.');
  const mitte = roh.map(r => r.dep).sort((a, b) => a - b)[roh.length >> 1];
  const faktor = mitte > 40 ? 0.001 : 1;   // mm oder m
  // eine Messung je Sekunde (bei Dateien ohne Zeit jede 14.)
  const punkte = []; let letzte = null;
  roh.forEach((r, k) => {
    const s = isNum(r.t) ? Math.floor(r.t / 1000) : Math.floor(k / 14);
    if (s === letzte) return; letzte = s;
    const m = map && map.geo ? geoZuKarte(map, r.lat, r.lon) : null;
    punkte.push({ x: m ? Math.round(m.x * 10) / 10 : null, y: m ? Math.round(m.y * 10) / 10 : null, lat: r.lat, lon: r.lon, d: Math.round(r.dep * faktor * 100) / 100, w: isNum(r.temp) ? Math.round(r.temp * 10) / 10 : null, t: isNum(r.t) ? r.t : null });
  });
  let fahrten = punkte.length ? 1 : 0;
  for (let k = 1; k < punkte.length; k++) if (punkte[k].t && punkte[k - 1].t && punkte[k].t - punkte[k - 1].t > 5 * 60000) fahrten++;
  const zeiten = punkte.map(p => p.t).filter(Boolean);
  return { n: roh.length, fahrten, von: zeiten.length ? Math.min(...zeiten) : null, bis: zeiten.length ? Math.max(...zeiten) : null, punkte, aufKarte: punkte.filter(p => p.x != null && aufKarte(map, p, 0)).length };
}
const spanne = (a, b) => {
  if (!a) return 'ohne Datum';
  const x = new Date(a), y = new Date(b);
  if (x.toDateString() === y.toDateString()) return x.getDate() + '.' + (x.getMonth() + 1) + '.';
  return x.getMonth() === y.getMonth() ? x.getDate() + '.–' + y.getDate() + '.' + (y.getMonth() + 1) + '.' : x.getDate() + '.' + (x.getMonth() + 1) + '.–' + y.getDate() + '.' + (y.getMonth() + 1) + '.';
};
/** Tiefenpunkte als SVG-Kreise (Kartenmeter), hell = flach, dunkel = tief. */
export function tiefenPunkte(punkte, sc, r = 1.6) {
  const ds = punkte.map(p => p.d).filter(isNum); if (!ds.length) return [];
  const lo = Math.min(...ds), hi = Math.max(...ds), k = 1 / sc;
  return punkte.filter(p => p.x != null).map(p => sv('circle', { cx: p.x, cy: p.y, r: r * k, fill: TIEF[Math.min(TIEF.length - 1, Math.floor((p.d - lo) / ((hi - lo) || 1) * TIEF.length))], 'fill-opacity': 0.85 }));
}
export const deeperSchluessel = lakeId => 'deeper:' + lakeId;

function ausschnitt(map, punkte) {
  const ganz = Math.min(B / map.w, H / map.h);
  if (!punkte.length) return { sc: ganz, x0: (map.w - B / ganz) / 2, y0: (map.h - H / ganz) / 2 };
  const xs = punkte.map(p => p.x), ys = punkte.map(p => p.y), rand = 30;
  const bx = Math.min(...xs) - rand, by = Math.min(...ys) - rand, bw = Math.max(...xs) - bx + rand, bh = Math.max(...ys) - by + rand;
  const sc = Math.max(ganz, Math.min(4, B / bw, H / bh)), vw = B / sc, vh = H / sc;
  let x0 = bx + bw / 2 - vw / 2, y0 = by + bh / 2 - vh / 2;
  if (vw <= map.w) x0 = Math.max(0, Math.min(map.w - vw, x0));
  if (vh <= map.h) y0 = Math.max(0, Math.min(map.h - vh, y0));
  return { sc, x0, y0 };
}

class DeeperImport extends mache(DCLogic) {
  componentDidMount() { const d = this.props.daten; if (!d) return go('Ansitz'); }
  get daten() { return (this.state || {}).neu || this.props.daten.gespeichert; }
  waehlen(ev) {
    if (ev) ev.preventDefault();
    const d = this.props.daten;
    auswahl('file', { accept: '.csv,text/csv,text/plain' }, async f => {
      if (!f) return;
      try {
        const x = deeperLesen(await f.text(), d.map);
        x.name = f.name;
        if (d.map && !x.aufKarte) return this.zeige('Die Messungen liegen nicht auf der Karte vom ' + d.lake.short + '.');
        this.setState({ neu: x, wahl: null });
        if (this.speichernAn()) await settings.set(deeperSchluessel(d.lake.id), x);
        this.zeige(zahl(x.n, 0) + ' Messungen gelesen');
      } catch (e) { this.zeige(e.message || 'Die Datei ließ sich nicht lesen.'); }
    });
  }
  speichernAn() { const sw = (this.state || {}).sw || {}; return sw.w0 === undefined ? true : sw.w0; }
  get v() {
    const d = this.props.daten, x = this.daten;
    if (!this.__v || this.__vFuer !== x) {
      const pts = x ? x.punkte.filter(p => p.x != null) : [];
      const platz = d.s.platz || (d.map && d.map.platz);
      this.__v = d.map ? ausschnitt(d.map, pts.length ? pts.concat(platz ? [platz] : []) : d.spots.concat(platz ? [platz] : [])) : null; this.__vFuer = x;
    }
    return this.__v;
  }
  karte(el) {
    const d = this.props.daten, st = this.state || {}, x = this.daten;
    if (!el) return;
    if (!d.map) { el.innerHTML = '<p style="margin: 0; padding: 90px 20px 0; text-align: center; font-size: 14px; line-height: 1.4; color: #a39f93">Für dieses Gewässer ist noch keine Karte auf dem Handy. Lies unter „Mehr“ deine Startdatei ein.</p>'; return; }
    const key = (x ? x.name + x.n : '-') + ':' + (st.wahl ? st.wahl.x + ',' + st.wahl.y : '');
    if (el.__key === key) return; el.__key = key;
    const { sc, x0, y0 } = this.v, k = 1 / sc;
    const platz = d.s.platz || d.map.platz;
    const teile = grundkarte(d.map, sc, { luft: true, spots: d.spots, breite: B, x0 });
    if (x) teile.push(...tiefenPunkte(x.punkte, sc));
    if (platz) teile.push(sv('g', { transform: `translate(${platz.x} ${platz.y}) scale(${k})` }, sv('circle', { r: 6.5, fill: '#ece8dc', stroke: '#000', 'stroke-width': 2 }),
      sv('text', { x: -12, y: 4, fill: '#ece8dc', stroke: '#000', 'stroke-width': 3, 'paint-order': 'stroke', 'font-family': 'Barlow, sans-serif', 'font-size': 12, 'font-weight': 600, 'text-anchor': 'end' }, 'Du')));
    if (st.wahl) {
      if (platz) teile.push(sv('path', { d: `M${platz.x} ${platz.y}L${st.wahl.x} ${st.wahl.y}`, stroke: '#00FF5E', 'stroke-width': 2 * k, 'stroke-dasharray': `${5 * k} ${6 * k}` }));
      teile.push(sv('g', { transform: `translate(${st.wahl.x} ${st.wahl.y}) scale(${k})` }, sv('path', { d: 'M0 0C-6 -9 -11 -14 -11 -21a11 11 0 1 1 22 0c0 7 -5 12 -11 21z', fill: '#00FF5E', stroke: '#000', 'stroke-width': 2 }), sv('circle', { cy: -21, r: 4.5, fill: '#000' })));
    }
    const svg = sv('svg', { width: B, height: H, viewBox: `${x0} ${y0} ${B / sc} ${H / sc}`, style: 'position:absolute;left:0;top:0;display:block', role: 'img', 'aria-label': 'Karte ' + d.lake.name + (x ? ' mit ' + x.fahrten + ' Deeper-Fahrten' : '') }, ...teile);
    const quelle = sv('svg', { width: B, height: H, style: 'position:absolute;left:0;top:0;pointer-events:none' }, sv('text', { x: 10, y: 18, fill: '#ece8dc', 'fill-opacity': 0.8, stroke: '#000', 'stroke-width': 2.5, 'paint-order': 'stroke', 'font-family': 'Barlow, sans-serif', 'font-size': 9.5 }, (d.map.source || '').split(' · ')[0] || 'Karte'));
    el.replaceChildren(svg, quelle);
    if (!el.__klick) {
      el.__klick = true;
      el.addEventListener('click', ev => {
        const xx = this.daten; if (!xx) return this.zeige('Wähl zuerst oben deine Deeper-Datei.');
        const b = el.getBoundingClientRect(), v = this.v, mx = v.x0 + (ev.clientX - b.left) / v.sc, my = v.y0 + (ev.clientY - b.top) / v.sc;
        let best = null, bd = Infinity;
        xx.punkte.forEach(p => { if (p.x == null) return; const dd = Math.hypot(p.x - mx, p.y - my); if (dd < bd) { bd = dd; best = p; } });
        if (!best || bd * v.sc > 30) return this.zeige('Dort ist das Boot nicht gefahren – tipp näher an die Punkte.');
        this.setState({ wahl: best });
      });
    }
  }
  renderVals() {
    const r = super.renderVals(), d = this.props.daten;
    if (!d) return r;
    const st = this.state || {}, x = this.daten, p = st.wahl;
    const platz = d.s.platz || (d.map && d.map.platz);
    let karte = null;
    if (p) {
      const spot = d.spots.filter(s => s.x != null).map(s => ({ s, dd: Math.hypot(s.x - p.x, s.y - p.y) })).sort((a, b) => a.dd - b.dd)[0];
      const w = platz ? Math.round(wurfweite(platz, p) || Math.hypot(platz.x - p.x, platz.y - p.y)) : null;
      karte = { name: spot && spot.dd < 30 ? spot.s.name : 'Stelle auf der Karte', tiefe: zahl(p.d, 1) + ' m', wasser: isNum(p.w) ? zahl(p.w, 1) + ' °C' : '–', weg: w != null ? w + ' m' : '–',
        gps: p.lat.toFixed(5) + ' N · ' + p.lon.toFixed(5) + ' O' + (p.t ? ' · gemessen ' + new Date(p.t).getDate() + '.' + (new Date(p.t).getMonth() + 1) + '.' : ''), wurf: w, spot: spot && spot.dd < 30 ? spot.s.name : null };
    }
    const sw = r.sw || {};
    if (sw.w0) {
      const alt = sw.w0.k;
      sw.w0.k = async () => {
        const an = !this.speichernAn(); alt();
        if (an && x) { await settings.set(deeperSchluessel(d.lake.id), x); this.zeige('Fahrt gespeichert – sie liegt jetzt auch auf deiner Spot-Karte.'); }
        if (!an) { await settings.set(deeperSchluessel(d.lake.id), null); this.zeige('Gespeicherte Fahrt entfernt.'); }
      };
    }
    return Object.assign(r, {
      pille: 'Rute ' + d.nr + ' · Deeper', zurueckLink: d.zurueck, seeKurz: d.lake.short,
      waehlen: ev => this.waehlen(ev),
      datei: x ? x.name || 'Deeper-Datei' : 'Deeper-Datei wählen',
      dateiInfo: x ? zahl(x.n, 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Messungen · ' + x.fahrten + (x.fahrten === 1 ? ' Fahrt' : ' Fahrten') + ' · ' + spanne(x.von, x.bis) : 'CSV-Export aus der Deeper-App',
      aendernText: x ? 'Ändern' : 'Wählen',
      karteHinweis: x ? 'Tippe auf die Stelle deiner Rute' : 'Erst die Datei wählen, dann die Stelle antippen',
      karteRef: el => this.karte(el),
      hatPunkt: !!karte, p: karte || {},
      uebernehmen: ev => {
        if (!karte) { if (ev) ev.preventDefault(); return this.zeige('Tippe zuerst auf die Stelle deiner Rute.'); }
        Object.assign(d.e, { spot: karte.spot || ('Deeper ' + karte.tiefe), entfernungM: karte.wurf, kx: Math.round(p.x * 10) / 10, ky: Math.round(p.y * 10) / 10, tiefeM: p.d });
      }
    });
  }
}

dcSeite(V, DeeperImport, async param => {
  const s = await laufenderAnsitz(); if (!s) return null;
  const [n, zweck] = String(param || '1').split('~'); const nr = Number(n) || 1;
  const lake = await lakes.get(s.lakeId), map = await mapOf(s.lakeId);
  const spots = map ? (await spotsOf(lake.id)).filter(x => x.x != null) : [];
  const gespeichert = await settings.get(deeperSchluessel(lake.id), null);
  const zurueck = zweck === 'fang' ? '#/Rute/' + nr + '~fang' : '#/RuteEinrichten/' + nr + (zweck === 'fehlbiss' ? '~fehlbiss' : '');
  return { s, lake, map, spots, nr, zweck: zweck || 'einrichten', e: rutenEntwurfVon(s, nr), gespeichert, zurueck };
}, { auch: ['deeperimport'] });
