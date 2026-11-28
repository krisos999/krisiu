// 3f · Kanten-Finder – 1:1 wie Entwurf. Punkte, Gefälle und Karte kommen aus der privaten Startdatei (Deeper).
import V from '../vorlagen/KantenFinder.js';
import mache from '../vorlagen/KantenFinder.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { lakes, mapOf, spotsOf } from '../core/repo.js';
import { alleSeen, laufenderAnsitz } from '../ui/daten.js';

const W = 342, H = 400;
const f1 = v => Math.round(v * 10) / 10;

class KantenFinder extends mache(DCLogic) {
  karte(el) {
    const d = this.props.daten; if (!el || el.__fertig || !d.map) return;
    el.__fertig = true;
    const m = d.map, R = d.rahmen || { x: 0, y: 0, w: d.map.w, h: d.map.h }, sx = W / R.w, sy = H / R.h;
    const X = x => f1((x - R.x) * sx), Y = y => f1((y - R.y) * sy);
    const pfad = pts => 'M' + pts.map(p => X(p[0]) + ' ' + Y(p[1])).join('L') + 'Z';
    const g = m.layers && m.layers.gefaelle;
    const linien = m.lines.filter(l => l.art === 'ufer' || l.art === 'insel').map(l => `<path d="${pfad(l.pts)}" fill="none" stroke="#ece8dc" stroke-width="1.2"${l.art === 'ufer' ? ' stroke-opacity="0.7" stroke-linejoin="round"' : ''}></path>`).join('');
    const zonen = d.spots.filter(s => s.kind === 'bereich').map(s => `<ellipse cx="${X(s.x)}" cy="${Y(s.y)}" rx="${f1(70 * sx)}" ry="${f1(27 * sy)}" fill="#00FF5E" fill-opacity="0.04" stroke="#00FF5E" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="5 4"></ellipse>`).join('');
    const platz = m.platz ? `<circle cx="${X(m.platz.x)}" cy="${Y(m.platz.y)}" r="6" fill="#ece8dc" stroke="#000000" stroke-width="2"></circle>` : '';
    el.innerHTML = `<img src="${m.image}" alt="" style="position: absolute; left: ${X(0)}px; top: ${Y(0)}px; width: ${f1(m.w * sx)}px; height: ${f1(m.h * sy)}px; display: block; max-width: none">`
      + `<div style="position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; background: rgba(0,0,0,0.38)"></div>`
      + (g ? `<img src="${g.image}" alt="" style="position: absolute; left: ${X(g.x)}px; top: ${Y(g.y)}px; width: ${f1(g.w * sx)}px; height: ${f1(g.h * sy)}px; display: block; max-width: none">` : '')
      + `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="position: absolute; left: 0; top: 0">${linien}${zonen}${platz}</svg>`;
  }
  renderVals() {
    const r = super.renderVals(), d = this.props.daten || {};
    const K = d.kanten, n = K ? K.punkte.length : 0;
    const zahl = g => (K ? K.punkte.filter(p => p.gruppe === g).length : 0);
    const gr = g => (K ? K.gruppen.find(x => x.g === g) : null);
    return Object.assign(r, {
      hat: n > 0, seeKurz: d.lake ? d.lake.short : '',
      unter: n ? 'Alle Kanten, Kuppen und Rinnen, die dein Deeper' + (K.datum ? ' am ' + K.datum : '') + ' gefunden hat. Bereich antippen zum Hinzoomen.'
        : 'Für ' + (d.lake ? d.lake.name : 'dieses Gewässer') + ' sind noch keine Kanten aus dem Deeper auf dem Handy. Sie kommen mit deiner Startdatei – lies sie unter „Mehr“ ein.',
      lbl_alle: 'Alle ' + n, lbl_damm: gr('damm') ? (gr('damm').filter || 'Gruppe 1') + ' ' + zahl('damm') : '–', lbl_nord: gr('nord') ? (gr('nord').filter || 'Gruppe 2') : '–',
      karteRef: el => this.karte(el),
      quelle: d.map ? [(d.map.source || '').split(' · ')[0], d.map.layers && d.map.layers.gefaelle ? 'Gefälle aus deinem Deeper' : null].filter(Boolean).join(' · ') : '',
      tippKopf: (K && K.tippKopf) || 'Krisiu-Tipp',
      tipp: (K && K.tipp) || 'Leg eine Rute an die stärkste Kante und eine an eine Kuppe oder Rinne – so lernst du am schnellsten, wo die Fische ziehen.',
      hinweis: (K && K.hinweis) || 'Gefunden wird nur, wo das Boot gefahren ist; zwischen den Spuren kann mehr liegen. Punkte mit „1× überfahren“ bitte nachloten.'
    });
  }
}

dcSeite(V, KantenFinder, async param => {
  const lauf = await laufenderAnsitz();
  const seen = await alleSeen();
  let lake = param ? await lakes.get(param) : lauf ? await lakes.get(lauf.lakeId) : null;
  // ohne Vorgabe: das erste Gewässer mit Kanten
  if (!lake) for (const l of seen) { const m = await mapOf(l.id); if (m && m.kanten) { lake = l; break; } }
  if (!lake) lake = seen[0] || null;
  if (!lake) return null;
  const map = await mapOf(lake.id), K = map && map.kanten, spots = map ? await spotsOf(lake.id) : [];
  if (!K) return { lake, map, spots, kanten: null, leer: { kartenStil: 'position: absolute; left: 0; top: 0; width: 342px; height: 400px' } };
  const R = K.rahmen || (map.layers && map.layers.gefaelle) || { x: 0, y: 0, w: map.w, h: map.h };
  const fx = x => (x - R.x) / R.w * 342, fy = y => (y - R.y) / R.h * 400;
  const P = K.punkte.map(p => Object.assign({}, p, { x: fx(p.x), y: fy(p.y) }));
  const Z = { alle: { k: 1, cx: 171, cy: 200 } };
  const CL = [];
  K.gruppen.forEach(g => {
    Z[g.g] = { k: g.k, cx: g.c ? fx(g.c[0]) : 171, cy: g.c ? fy(g.c[1]) : 200 };
    CL.push({ g: g.g, name: g.name, n: P.filter(p => p.gruppe === g.g).length, x: g.label ? fx(g.label[0]) : 171, y: g.label ? fy(g.label[1]) : 200 });
  });
  return { lake, map, spots, kanten: K, rahmen: R, P, Z, CL, start: K.start };
}, { auch: ['kantenfinder'] });
