// 4b · Spot markieren – 1:1 wie Entwurf Spot. Die Karte (Luftbild, Ufer, Tiefenlinien, Spots) kommt aus der privaten Startdatei.
import V from '../vorlagen/Spot.js';
import mache from '../vorlagen/Spot.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { lakes, sessions, mapOf, spotsOf } from '../core/repo.js';
import { getPosition } from '../core/geo.js';
import { geoZuKarte, wurfweite, aufKarte } from '../core/karte.js';
import { sv, grundkarte } from '../ui/karte.js';
import { go, sicher } from '../ui/app.js';
import { laufenderAnsitz, rutenVon } from '../ui/daten.js';
import { rutenEntwurfVon } from './fangfluss.js';
import { tiefenPunkte, deeperSchluessel } from './DeeperImport.js';
import { settings } from '../core/repo.js';

const B = 342, H = 400, BONE = '#ece8dc';

/** Ausschnitt: alle Spots, Platz und Köder-Spot passen hinein (höchstens 4 px je Meter). */
function ausschnitt(map, punkte) {
  const ganz = Math.min(B / map.w, H / map.h);
  if (!punkte.length) return { sc: ganz, x0: (map.w - B / ganz) / 2, y0: (map.h - H / ganz) / 2 };
  const xs = punkte.map(p => p.x), ys = punkte.map(p => p.y), rand = 40;
  const bx = Math.min(...xs) - rand, by = Math.min(...ys) - rand, bw = Math.max(...xs) - bx + rand, bh = Math.max(...ys) - by + rand;
  const sc = Math.max(ganz, Math.min(4, B / bw, H / bh));
  const vw = B / sc, vh = H / sc;
  let x0 = bx + bw / 2 - vw / 2, y0 = by + bh / 2 - vh / 2;
  if (vw <= map.w) x0 = Math.max(0, Math.min(map.w - vw, x0));
  if (vh <= map.h) y0 = Math.max(0, Math.min(map.h - vh, y0));
  return { sc, x0, y0 };
}

const Basis = mache(DCLogic);
class Spot extends Basis {
  componentDidMount() {
    const d = this.props.daten;
    if (!d) return go('Ansitz');
    if (!d.map) return go('karte', String(d.nr));
    const st = {};
    const pl = d.s.platz || d.map.platz;
    if (pl) Object.assign(st, this.inPx(pl, 'p'));
    const e = d.e, r = d.r;
    const k = e.kx != null ? { x: e.kx, y: e.ky } : r && r.kx != null ? { x: r.kx, y: r.ky } : null;
    if (k) Object.assign(st, this.inPx(k, 'k'));
    st.spotName = e.spot || (r && r.spot) || '';
    st.platzName = (d.s.platz && d.s.platz.name) || (d.map.platz && d.map.platz.name) || '';
    if (!pl) st.modus = 'platz';
    this.setState(st);
    if (!pl && d.map.geo) getPosition({ timeoutMs: 7000 }).then(p => {
      const m = geoZuKarte(d.map, p.lat, p.lon);
      if (m && aufKarte(d.map, m, 30) && (this.state || {}).px === undefined) this.setState(Object.assign(this.inPx(m, 'p'), { platzGps: true }));
    }).catch(() => {});
  }
  get v() { return this.props.daten.view; }
  inPx(m, a) { return { [a + 'x']: (m.x - this.v.x0) * this.v.sc, [a + 'y']: (m.y - this.v.y0) * this.v.sc }; }
  inM(x, y) { return { x: this.v.x0 + x / this.v.sc, y: this.v.y0 + y / this.v.sc }; }
  karteZeichnen(el) {
    if (!el) return;
    const d = this.props.daten, luft = !((this.state || {}).kontur);
    if (el.__luft === luft) return;
    el.__luft = luft;
    const { sc, x0, y0 } = this.v;
    const svg = sv('svg', { width: B, height: H, viewBox: `${x0} ${y0} ${B / sc} ${H / sc}`, style: 'position:absolute;left:0;top:0;display:block', role: 'img', 'aria-label': 'Karte ' + d.lake.name },
      ...grundkarte(d.map, sc, { luft, spots: d.spots, breite: B, x0 }), ...(d.deeper ? tiefenPunkte(d.deeper.punkte, sc, 1.3) : []));
    // Maßstab, Quelle, Übersicht – in Bildschirm-Pixeln
    const L = [5, 10, 20, 25, 50, 100, 200, 250, 500].find(m => m * sc >= 34) || 500, px = L * sc;
    const ov = sv('svg', { width: B, height: H, style: 'position:absolute;left:0;top:0;display:block;pointer-events:none' },
      sv('path', { d: `M${330 - px} 384h${px}`, stroke: BONE, 'stroke-width': 2 }),
      sv('path', { d: `M${330 - px} 380v8M330 380v8`, stroke: BONE, 'stroke-width': 2 }),
      sv('text', { x: 330 - px / 2, y: 377, fill: BONE, stroke: '#000', 'stroke-width': 3, 'paint-order': 'stroke', 'font-family': 'Barlow, sans-serif', 'font-size': 11, 'font-weight': 600, 'text-anchor': 'middle' }, L + ' m'),
      sv('text', { x: 10, y: 18, fill: BONE, 'fill-opacity': 0.8, stroke: '#000', 'stroke-width': 2.5, 'paint-order': 'stroke', 'font-family': 'Barlow, sans-serif', 'font-size': 9.5 }, (d.map.source || '').split(' · ')[0] || 'Karte'));
    // Übersicht unten links: ganzer See mit dem Ausschnitt
    const ow = 108, oh = Math.min(58, ow * d.map.h / d.map.w), os = Math.min(ow / d.map.w, oh / d.map.h);
    if (!(os * d.map.w > ow - 1 && sc <= os * 1.05)) {
      const g = sv('g', {});
      g.append(sv('rect', { x: 8, y: H - 8 - oh, width: ow, height: oh, rx: 8, fill: '#000', 'fill-opacity': 0.72, stroke: '#444444' }));
      d.map.lines.filter(l => l.art === 'ufer').forEach(l => g.append(sv('path', { d: 'M' + l.pts.map(p => (8 + p[0] * os).toFixed(1) + ' ' + (H - 8 - oh + p[1] * os).toFixed(1)).join('L'), fill: 'none', stroke: BONE, 'stroke-width': 1 })));
      g.append(sv('rect', { x: 8 + x0 * os, y: H - 8 - oh + y0 * os, width: B / sc * os, height: H / sc * os, fill: 'none', stroke: '#00FF5E', 'stroke-width': 1.5 }));
      ov.append(g);
    }
    el.replaceChildren(svg, ov);
  }
  renderVals() {
    const d = this.props.daten; if (!d || !d.map) return {};
    const st = this.state || {};
    const v = super.renderVals();
    const P = st.px !== undefined ? this.inM(st.px, st.py) : null, K = st.kx !== undefined ? this.inM(st.kx, st.ky) : null;
    const w = P && K ? wurfweite(P, K) : null;
    const basisTippen = v.tippen;
    // Ohne gesetzten Punkt keine Beispiel-Lage aus dem Entwurf zeigen
    if (st.kx === undefined) Object.assign(v, { pin: 'display: none', linie: 'display: none' });
    if (st.px === undefined) Object.assign(v, { punkt: 'display: none', schild: 'display: none', linie: 'display: none', ring: 'display: none' });
    return Object.assign(v, {
      kopf: 'Rute ' + d.nr + ' · Spot',
      zurueckLink: d.zweck === 'fang' ? '#/Rute/' + d.nr + '~fang' : '#/RuteEinrichten/' + d.nr + (d.zweck === 'fehlbiss' ? '~fehlbiss' : ''),
      karteRef: el => this.karteZeichnen(el),
      entfernung: w ? w + ' m' : (d.e.entfernungM || (d.r && d.r.entfernungM)) ? (d.e.entfernungM || d.r.entfernungM) + ' m' : '–',
      schildText: st.platz || d.s.platz ? 'Angelplatz' : st.platzGps ? 'Du' : 'Angelplatz',
      spotName: st.spotName || '', platzName: st.platzName || '',
      spotNameAendern: ev => { this.state.spotName = ev.target.value; this.state.spotAuto = false; },
      platzNameAendern: ev => { this.state.platzName = ev.target.value; },
      tippen: ev => {
        basisTippen(ev);
        if ((this.state || {}).modus === 'platz') return;
        // Bekannte Spots rasten ein (14 px)
        const s2 = this.state, m = this.inM(s2.kx, s2.ky);
        const nah = d.spots.filter(x => x.kind !== 'bereich').map(x => ({ x, dpx: Math.hypot((x.x - m.x) * this.v.sc, (x.y - m.y) * this.v.sc) })).sort((a, b) => a.dpx - b.dpx)[0];
        if (nah && nah.dpx <= 14) this.setState(Object.assign(this.inPx(nah.x, 'k'), { spotName: nah.x.name, spotAuto: true }));
        else if (s2.spotAuto) this.setState({ spotName: '', spotAuto: false });
      },
      speicherePlatz: async () => {
        const s2 = this.state || {}; if (s2.px === undefined) return;
        const m = this.inM(s2.px, s2.py);
        const neu = await sicher(() => sessions.save(Object.assign({}, d.s, { platz: { x: m.x, y: m.y, name: (s2.platzName || '').trim() || null } })));
        if (neu) { d.s = neu; this.setState({ modus: 'spot', platz: true }); this.zeige && this.zeige('Angelplatz gespeichert'); }
      },
      uebernehmen: ev => {
        const s2 = this.state || {};
        if (s2.kx === undefined) { ev.preventDefault(); this.zeige && this.zeige('Tipp erst auf die Karte, wo dein Köder liegt'); return; }
        const m = this.inM(s2.kx, s2.ky);
        Object.assign(d.e, { spot: (s2.spotName || '').trim() || 'Spot auf der Karte', entfernungM: w, kx: Math.round(m.x * 10) / 10, ky: Math.round(m.y * 10) / 10 });
      }
    });
  }
}

dcSeite(V, Spot, async p => {
  const s = await laufenderAnsitz(); if (!s) return null;
  const [n, zweck] = String(p || '1').split('~'); const nr = Number(n) || 1;
  const lake = await lakes.get(s.lakeId), map = await mapOf(s.lakeId);
  const spots = map ? (await spotsOf(lake.id)).filter(x => x.x != null) : [];
  const r = rutenVon(s).find(x => x.nr === nr) || null, e = rutenEntwurfVon(s, nr);
  if (!map) return { s, nr, map: null };
  const pkt = spots.map(x => ({ x: x.x, y: x.y })).concat(s.platz || map.platz ? [s.platz || map.platz] : [], e.kx != null ? [{ x: e.kx, y: e.ky }] : r && r.kx != null ? [{ x: r.kx, y: r.ky }] : []);
  return { s, lake, map, spots, nr, zweck: zweck || 'einrichten', r, e, view: ausschnitt(map, pkt), deeper: await settings.get(deeperSchluessel(lake.id), null) };
}, { auch: ['SpotVSA'] });
