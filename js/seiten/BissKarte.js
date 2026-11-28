// 6c · Biss-Karte – 1:1 wie Entwurf. Jeder Biss sitzt auf dem Spot seiner Rute (aus „Rute einrichten“).
// Karte, Tiefe und Grund kommen aus der privaten Startdatei; Wind beim Biss aus den stündlichen Wetterwerten.
import V from '../vorlagen/BissKarte.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum } from '../core/util.js';
import { sessions, entries, mapOf, spotsOf } from '../core/repo.js';
import { datumKurz } from '../ui/app.js';
import { alleSeen, eintraegeVon, rutenVon, laufenderAnsitz, wetterJetzt } from '../ui/daten.js';
import { bisseAus } from '../ui/analyse.js';
import { bewerte, platzTipp } from '../ui/planen.js';
import { uferSeiten } from './ufer.js';

const R8 = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const FARBEN = ['#7ee0ff', '#ff8a3d', '#c792ff', '#ffd21e', '#ff5fa2', '#9dff7a'];
const TIEF = [null, [200, 236, 255], [170, 222, 255], [140, 206, 255], [110, 186, 255], [80, 164, 250], [58, 140, 240], [44, 118, 226], [34, 96, 206], [26, 76, 184], [20, 58, 160], [14, 40, 130]];
const GRUND = [[59, 139, 255], [127, 178, 255], [154, 150, 140], [255, 176, 138], [255, 106, 61], [216, 30, 30]];
const komma = v => String(v).replace('.', ',');
const f1 = v => Math.round(v * 10) / 10;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const W = 342, H = 300;
const chipAn = "height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000; font: 700 16px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap";
const chipAus = "height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 16px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap";

/** Pixel einer Schicht (Tiefe/Grund) lesen: Bild einmal in ein Canvas. */
async function schichtLeser(L) {
  if (!L || !L.image) return null;
  const img = new Image(); img.src = L.image;
  try { await img.decode(); } catch (e) { return null; }
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const daten = g.getImageData(0, 0, c.width, c.height).data;
  return (x, y) => {
    const px = Math.floor((x - L.x) / L.w * c.width), py = Math.floor((y - L.y) / L.h * c.height);
    if (px < 0 || py < 0 || px >= c.width || py >= c.height) return null;
    const i = (py * c.width + px) * 4;
    return daten[i + 3] ? [daten[i], daten[i + 1], daten[i + 2]] : null;
  };
}
const klasse = (rgb, pal) => {
  if (!rgb) return null;
  let best = null, d = 1e9;
  pal.forEach((c, k) => { if (!c) return; const e = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2; if (e < d) { d = e; best = k; } });
  return d < 2500 ? best : null;
};

const auflandig = (map, dir) => uferSeiten(map, dir).auf;

class BissKarte extends DCLogic {
  async componentDidMount() {
    const d = this.props.daten; if (!d) return;
    const L = d.map && d.map.layers;
    const [tl, gl] = await Promise.all([schichtLeser(L && L.tiefe), schichtLeser(L && L.grund)]);
    d.B.forEach(b => { b.tief = tl && b.x != null ? klasse(tl(b.x, b.y), TIEF) : null; b.grund = gl && b.x != null ? klasse(gl(b.x, b.y), GRUND) : null; });
    this.forceUpdate();
    // Heute: Wind und Tipp
    if (d.lake) {
      const [w, r] = await Promise.all([wetterJetzt(d.lake), bewerte(d.lake, [new Date(new Date().setHours(0, 0, 0, 0))]).catch(() => null)]);
      const x = r && r.tage[0];
      this.setState({ wx: w.wx || null, heuteT: x && x.t, heuteB: x && x.b });
    }
  }
  ansicht() {
    const d = this.props.daten, map = d.map;
    const pts = [];
    d.B.forEach(b => { if (b.x != null) pts.push([b.x, b.y]); });
    d.linien.forEach(l => pts.push([l.x, l.y]));
    if (d.platz) pts.push([d.platz.x, d.platz.y]);
    let vx, vy, vw, vh;
    if (pts.length) {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), rand = 60;
      vx = Math.min(...xs) - rand; vy = Math.min(...ys) - rand; vw = Math.max(...xs) + rand - vx; vh = Math.max(...ys) + rand - vy;
      const mind = Math.min(map.w, 300); if (vw < mind) { vx -= (mind - vw) / 2; vw = mind; }
    } else { vx = 0; vy = 0; vw = map.w; vh = map.h; }
    const ziel = H / W;
    if (vh / vw < ziel) { const n = vw * ziel; vy -= (n - vh) / 2; vh = n; } else { const n = vh / ziel; vx -= (n - vw) / 2; vw = n; }
    if (vw > map.w && vh > map.h) { const k = Math.min(vw / map.w, vh / map.h); vw /= k; vh /= k; }
    vx = Math.max(Math.min(0, map.w - vw), Math.min(Math.max(0, map.w - vw), vx)); vy = Math.max(Math.min(0, map.h - vh), Math.min(Math.max(0, map.h - vh), vy));
    return { vx, vy, vw, vh, sc: W / vw };
  }
  karte(el, w) {
    const d = this.props.daten, st = this.state || {};
    if (!el) return;
    if (!d.map) { el.innerHTML = `<p style="margin: 0; padding: 110px 24px 0; text-align: center; font-size: 14px; line-height: 1.4; color: #a39f93">Für ${esc(d.lake ? d.lake.name : 'dieses Gewässer')} ist noch keine Karte auf dem Handy. Lies unter „Mehr“ deine Startdatei ein.</p>`; return; }
    const key = JSON.stringify([w.ansicht, w.unter, w.rutenAn, w.heuteAn, w.sel, st.wx && st.wx.windDir, st.heuteT ? 1 : 0, d.B.map(b => b.tief)]);
    if (el.__key === key) return;
    el.__key = key;
    const map = d.map, v = this.ansicht(), X = x => f1((x - v.vx) * v.sc), Y = y => f1((y - v.vy) * v.sc);
    const L = map.layers || {}, schicht = w.unter === 'tiefe' ? L.tiefe : w.unter === 'grund' ? L.grund : null;
    const k = 1 / v.sc;
    // Untergrund in Kartenmetern
    const ns = 'vector-effect="non-scaling-stroke"';
    const linien = map.lines.filter(l => l.art === 'ufer' || l.art === 'insel').map(l => `<path d="M${l.pts.map(p => p[0] + ' ' + p[1]).join('L')}Z" fill="none" stroke="#ece8dc" stroke-opacity="0.7" stroke-width="1.2" ${ns}></path>`).join('');
    const unten = `<svg width="${W}" height="${H}" viewBox="${f1(v.vx)} ${f1(v.vy)} ${f1(v.vw)} ${f1(v.vh)}" preserveAspectRatio="xMidYMid slice" style="position: absolute; left: 0; top: 0" aria-hidden="true">`
      + `<image href="${map.image}" x="0" y="0" width="${map.w}" height="${map.h}" preserveAspectRatio="none"></image>`
      + `<rect x="${f1(v.vx)}" y="${f1(v.vy)}" width="${f1(v.vw)}" height="${f1(v.vh)}" fill="#000000" fill-opacity="${w.abdunkeln}"></rect>`
      + (schicht ? `<image href="${schicht.image}" x="${schicht.x}" y="${schicht.y}" width="${schicht.w}" height="${schicht.h}" preserveAspectRatio="none"></image>` : '')
      + linien + '</svg>';
    // Darüber in Bildpunkten: Namen, Heute, Ruten, Bisse
    const o = [];
    o.push(`<defs><radialGradient id="bk-waerme"><stop offset="0" stop-color="#ff5a1e" stop-opacity="0.9"></stop><stop offset="0.45" stop-color="#ff9a1e" stop-opacity="0.45"></stop><stop offset="1" stop-color="#ffd21e" stop-opacity="0"></stop></radialGradient></defs>`);
    // Spots mit Bissen bekommen einen gestrichelten Ring und ihren Namen
    const zonen = new Map();
    d.B.forEach(b => { if (b.x != null && b.spotName) zonen.set(b.spotName, (zonen.get(b.spotName) || 0) + 1); });
    d.spots.filter(sp => zonen.has(sp.name)).forEach(sp => {
      const zx = X(sp.x), zy = Y(sp.y);
      o.push(`<ellipse cx="${zx}" cy="${zy}" rx="44" ry="26" fill="#00FF5E" fill-opacity="0" stroke="#00FF5E" stroke-opacity="0.7" stroke-width="1.2" stroke-dasharray="5 4"></ellipse>`,
        `<text x="${zx}" y="${f1(zy - 32)}" fill="#ece8dc" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Barlow, sans-serif" font-size="12" font-weight="700" text-anchor="middle">${esc(sp.name)}</text>`);
    });
    if (w.heuteAn) {
      const wx = st.wx;
      if (wx && wx.windDir) {
        auflandig(map, wx.windDir).forEach(l => {
          const dd = 'M' + l.map(p => X(p[0]) + ' ' + Y(p[1])).join('L');
          o.push(`<path d="${dd}" fill="none" stroke="#000000" stroke-opacity="0.6" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"></path><path d="${dd}" fill="none" stroke="#00FF5E" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"></path>`);
        });
        const rot = (R8.indexOf(wx.windDir) * 45 + 180) % 360;
        o.push(`<g transform="translate(40 250)"><circle r="22" fill="#000000" fill-opacity="0.75" stroke="#ece8dc" stroke-opacity="0.5"></circle><text y="-11" fill="#ece8dc" font-family="Barlow Condensed, sans-serif" font-size="9.5" font-weight="700" text-anchor="middle">N</text><g transform="rotate(${rot})"><path d="M0 11V-8" stroke="#00FF5E" stroke-width="2.6" stroke-linecap="round"></path><path d="M-6 -2L0 -10L6 -2" fill="none" stroke="#00FF5E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path></g></g>`,
          `<text x="70" y="254" fill="#ece8dc" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Barlow Condensed, sans-serif" font-size="13" font-weight="700">aus ${wx.windDir}${isNum(wx.windKmh) ? ' · ' + Math.round(wx.windKmh) : ''}</text>`);
      }
      w.heuteSpots.forEach(s => o.push(`<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="19" fill="#00FF5E" fill-opacity="0.12" stroke="#00FF5E" stroke-width="2" stroke-dasharray="5 4"></circle>`,
        `<text x="${X(s.x)}" y="${Y(s.y) + 34}" fill="#00FF5E" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Barlow Condensed, sans-serif" font-size="12.5" font-weight="700" text-anchor="middle">Heute ${esc(s.name)}</text>`));
    }
    if (w.rutenAn && d.platz) {
      d.linien.forEach(l => o.push(`<path d="M${X(d.platz.x)} ${Y(d.platz.y)}L${X(l.x)} ${Y(l.y)}" stroke="${l.farbe}" stroke-width="1.8" stroke-dasharray="6 5" fill="none"></path>`,
        `<rect x="${X(l.x) - 5}" y="${Y(l.y) - 5}" width="10" height="10" rx="2" fill="#000000" stroke="${l.farbe}" stroke-width="2"></rect>`,
        `<text x="${X(l.x)}" y="${Y(l.y) + (l.unten ? 26 : -12)}" fill="${l.farbe}" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Barlow Condensed, sans-serif" font-size="12.5" font-weight="700" text-anchor="middle">${esc(l.text)}</text>`));
      o.push(`<circle cx="${X(d.platz.x)}" cy="${Y(d.platz.y)}" r="6" fill="#ece8dc" stroke="#000000" stroke-width="2"></circle>`);
      const pn = (d.platz.name || 'Angelplatz').split(' (')[0];
      o.push(`<text x="${f1(X(d.platz.x) - 10)}" y="${f1(Y(d.platz.y) + 4)}" fill="#ece8dc" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Barlow, sans-serif" font-size="12" font-weight="600" text-anchor="end">${esc(pn)}</text>`);
    }
    const an = new Set(w.sel);
    if (w.ansicht === 'waerme') o.push('<g style="mix-blend-mode: screen">' + d.B.filter(b => b.x != null && an.has(b)).map(b => `<circle cx="${X(b.x)}" cy="${Y(b.y)}" r="30" fill="url(#bk-waerme)" opacity="0.55"></circle>`).join('') + '</g>');
    else d.B.filter(b => b.x != null).forEach(b => {
      const r = b.fang ? 4 + (b.kg || 6) / 2.2 : 6;
      o.push(`<circle cx="${X(b.x) + b.jx}" cy="${Y(b.y) + b.jy}" r="${f1(r)}" fill="${b.fang ? b.farbe : 'none'}" stroke="${b.fang ? '#000000' : '#ece8dc'}" stroke-width="${b.fang ? 1.5 : 2.2}" opacity="${an.has(b) ? 0.95 : 0.12}"></circle>`);
    });
    const quelle = (map.source || '').split(' · ')[0];
    el.innerHTML = unten + `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position: absolute; left: 0; top: 0" aria-hidden="true">${o.join('')}</svg>`
      + `<span style="position: absolute; left: 10px; top: 8px; padding: 3px 7px; border-radius: 6px; background: rgba(0,0,0,0.6); font: 700 11px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.1em; text-transform: uppercase; color: #ffd21e">${esc(w.eckText)}</span>`
      + (quelle ? `<span style="position: absolute; right: 10px; top: 8px; font-size: 9.5px; color: rgba(236,232,220,0.8); text-shadow: 0 0 3px #000">${esc(quelle)}</span>` : '')
      + (w.unter !== 'luft' && !schicht ? `<span style="position: absolute; left: 10px; right: 10px; bottom: 10px; padding: 6px 8px; border-radius: 6px; background: rgba(0,0,0,0.7); font-size: 12.5px; color: #cfcabb">Für ${esc(d.lake.short)} gibt es noch keine ${w.unter === 'tiefe' ? 'Tiefenkarte' : 'Grundkarte'} in deiner Startdatei.</span>` : '');
  }
  renderVals() {
    const d = this.props.daten; if (!d) return {};
    const s = this.state || {};
    const ansicht = s.ansicht || 'punkte', unter = s.unter || 'luft';
    const rutenAn = s.ruten === undefined ? true : s.ruten, heuteAn = !!s.heute;
    const ganz = s.stunde === undefined || s.stunde === null, std = ganz ? 18 : s.stunde, wind = s.wind || null;
    const B = d.B;
    const imFenster = b => { if (ganz) return true; let x = Math.abs(b.h - std); x = Math.min(x, 24 - x); return x <= 2; };
    const passt = b => imFenster(b) && (!wind || b.wd === wind);
    const sel = B.filter(passt);
    // Stunden-Balken
    const proStd = new Array(24).fill(0); B.forEach(b => { if (!wind || b.wd === wind) proStd[Math.floor(b.h) % 24]++; });
    const maxS = Math.max(1, ...proStd);
    const stunden = proStd.map((n, h) => { let x = Math.abs(h + 0.5 - std); x = Math.min(x, 24 - x); const drin = ganz || x <= 2.5;
      return 'display: block; height: ' + Math.max(3, n / maxS * 36) + 'px; border-radius: 2px; background: ' + (n === 0 ? '#2e2e2e' : drin ? '#00FF5E' : '#3c5a46'); });
    // Windrose
    const zaehl = {}; B.filter(imFenster).forEach(b => { if (b.wd) zaehl[b.wd] = (zaehl[b.wd] || 0) + 1; });
    const maxW = Math.max(1, ...R8.map(r => zaehl[r] || 0));
    const rose = R8.map((r, i) => {
      const n = zaehl[r] || 0, a = (i * 45 - 90) * Math.PI / 180, b1 = a - 0.32, b2 = a + 0.32, Lg = 12 + 68 * n / maxW;
      const dd = n ? 'M0 0L' + (Math.cos(b1) * Lg).toFixed(1) + ' ' + (Math.sin(b1) * Lg).toFixed(1) + 'A' + Lg.toFixed(1) + ' ' + Lg.toFixed(1) + ' 0 0 1 ' + (Math.cos(b2) * Lg).toFixed(1) + ' ' + (Math.sin(b2) * Lg).toFixed(1) + 'Z' : '';
      const istAn = wind === r, bx = 115 + Math.cos(a) * 96, by = 115 + Math.sin(a) * 96;
      return { d: dd, fill: istAn ? '#00FF5E' : 'rgba(0,255,94,0.35)', name: r, n: n ? String(n) : '–', an: istAn, aria: 'Wind aus ' + r + ': ' + n + ' Bisse',
        tipp: () => this.setState({ wind: istAn ? null : r }),
        stil: 'left: ' + bx.toFixed(1) + 'px; top: ' + by.toFixed(1) + 'px; ' + "position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; padding: 0; border-radius: 50%; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; font: 700 13px/1 'Barlow Condensed', sans-serif; " + (istAn ? 'border: 1px solid #00FF5E; background: #00FF5E; color: #000000' : 'border: 1px solid #444444; background: #141414; color: #ece8dc') };
    });
    // Zusammenfassung
    const f = sel.filter(b => b.fang), fb = sel.filter(b => !b.fang);
    const tiefen = sel.map(b => b.tief).filter(x => x != null);
    const tMin = tiefen.length ? Math.min(...tiefen) : null, tMax = tiefen.length ? Math.max(...tiefen) : null;
    const tiefText = tMin === null ? '–' : (0.5 + 0.25 * tMin).toFixed(2).replace('.', ',') + '–' + (0.75 + 0.25 * tMax).toFixed(2).replace('.', ',') + ' m';
    const gr = sel.map(b => b.grund).filter(x => x != null), weich = gr.filter(x => x <= 1).length;
    const grundText = gr.length ? Math.round(weich / gr.length * 100) + ' %' : '–';
    const kgs = f.map(b => b.kg).filter(isNum), schwer = kgs.length ? Math.max(...kgs) : 0;
    const mitOrt = B.filter(b => b.x != null).length;
    let krisiu;
    if (!B.length) krisiu = d.s ? 'In diesem Ansitz ist noch kein Biss mit Uhrzeit eingetragen.' : 'Hier ist noch kein Biss mit Uhrzeit eingetragen.';
    else if (!sel.length) krisiu = 'In diesem Fenster gab es keinen Biss. Schieb die Uhrzeit oder nimm „Alle“ beim Wind.';
    else krisiu = sel.length + ' von ' + B.length + ' Bissen' + (gr.length ? ', davon ' + weich + ' von ' + gr.length + ' auf eher weichem Grund' : '') + (tMin !== null ? ' in ' + tiefText : '') + '.'
      + (mitOrt < B.length ? ' ' + (B.length - mitOrt) + ' ohne Spot fehlen auf der Karte.' : '');
    // Ruten im Vergleich
    const ruten = d.ruten.map((r, i) => {
      const alle = sel.filter(b => b.rute === r.kurz), fa = alle.filter(b => b.fang).length;
      return Object.assign({}, r, { linie: i ? '1px solid #2e2e2e' : '0', faenge: fa + (fa === 1 ? ' Fang' : ' Fänge'), fehl: (alle.length - fa) + ' Fehlbiss' + (alle.length - fa === 1 ? '' : 'e') });
    });
    // Tipp für heute
    const T = s.heuteT, wx = s.wx;
    const tipp = d.lake && T ? platzTipp(d.lake, T, s.heuteB || {}) : null;
    const heuteSpots = tipp ? d.spots.filter(sp => tipp.includes(sp.name)).slice(0, 2) : [];
    const luft = T && isNum(T.nachtMin) ? (T.nachtMin < 2 ? 'kalt' : T.nachtMin >= 4 ? 'mild' : 'kühl') : null;
    const C = (k, an, fn) => ({ ['c_' + k]: fn, ['a_' + k]: an, ['s_' + k]: an ? chipAn : chipAus });
    const rosAlle = "position: absolute; left: 115px; top: 115px; width: 56px; height: 56px; margin: -28px 0 0 -28px; padding: 0; border-radius: 50%; cursor: pointer; font: 700 14px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; " + (!wind ? 'border: 1px solid #00FF5E; background: #00FF5E; color: #000000' : 'border: 1px solid #444444; background: #141414; color: #ece8dc');
    const L = d.map && d.map.layers || {};
    const ohne = B.length - mitOrt;
    const w = {
      ansicht, unter, rutenAn, heuteAn, sel, heuteSpots, abdunkeln: unter === 'luft' ? 0.15 : 0.35,
      eckText: B.length ? 'Punkte: ' + mitOrt + (mitOrt === 1 ? ' Biss' : ' Bisse') : 'Noch keine Bisse'
    };
    return Object.assign({},
      C('punkte', ansicht === 'punkte', () => this.setState({ ansicht: 'punkte' })), C('waerme', ansicht === 'waerme', () => this.setState({ ansicht: 'waerme' })),
      C('ruten', rutenAn, () => this.setState({ ruten: !rutenAn })), C('heute', heuteAn, () => this.setState({ heute: !heuteAn })),
      C('luft', unter === 'luft', () => this.setState({ unter: 'luft' })), C('tiefe', unter === 'tiefe', () => this.setState({ unter: 'tiefe' })), C('grund', unter === 'grund', () => this.setState({ unter: 'grund' })),
      C('tag', ganz, () => this.setState({ stunde: null })),
      {
        zurueckLink: d.s ? '#/Auswertung/' + d.s.id : '#/Logbuch', zurueckText: d.s ? 'Auswertung' : 'Zurück', seeKurz: d.lake ? d.lake.short : '',
        hinweis: !d.map ? null : ohne && B.length ? `${ohne} von ${B.length} Bissen ${ohne === 1 ? 'hat' : 'haben'} keinen Spot – leg beim Einrichten der Rute den Spot auf der Karte fest, dann landet jeder Biss hier.` : null,
        c_wind: () => this.setState({ wind: null }), a_wind: !wind, s_wind: rosAlle,
        zeigTiefe: unter === 'tiefe' && !!L.tiefe, zeigGrund: unter === 'grund' && !!L.grund, legPunkte: unter === 'luft',
        tiefeVon: L.tiefe ? L.tiefe.von || '' : '', tiefeBis: L.tiefe ? L.tiefe.bis || '' : '',
        stunden, rose,
        stunde: std, schieb: e => this.setState({ stunde: parseInt(e.target.value, 10) }),
        zeitText: ganz ? 'ganzer Tag' : ((std + 22) % 24) + ' bis ' + ((std + 2) % 24) + ' Uhr',
        stundenAria: 'Bisse je Stunde, ' + (ganz ? 'alle Stunden' : 'Fenster ' + ((std + 22) % 24) + ' bis ' + ((std + 2) % 24) + ' Uhr'),
        kopfZahl: f.length + (f.length === 1 ? ' Fang' : ' Fänge') + ' · ' + fb.length + ' Fehlb.',
        filterText: (ganz ? 'ganzer Tag' : ((std + 22) % 24) + '–' + ((std + 2) % 24) + ' Uhr') + ' · ' + (wind ? 'Wind ' + wind : 'jeder Wind'),
        kacheln: [{ w: tiefText, l: 'Tiefe am Biss' }, { w: grundText, l: 'auf eher weichem Grund' }, { w: schwer ? komma(schwer.toFixed(1)) + ' kg' : '–', l: 'schwerster Fisch' }],
        krisiu, ruten,
        tippKopf: 'Tipp für heute (' + [datumKurz(new Date()).slice(3), luft, wx && wx.windDir].filter(Boolean).join(', ') + ')',
        tippText: tipp ? tipp + (heuteSpots.length ? ' Schalte oben „Heute“ ein, dann siehst du ' + (heuteSpots.length === 1 ? 'den Platz' : 'die Plätze') + ' auf der Karte.' : '') : (d.lake && d.lake.lat == null ? 'Für einen Tipp braucht das Gewässer seine Lage.' : 'Der Tipp kommt, sobald das Wetter für heute da ist.'),
        tippLink: d.laeuft ? '#/Ruten' : '#/Planen', tippKnopf: d.laeuft ? 'Ruten so legen' : 'Ansitz planen',
        fussnote: [L.quelle, 'Wind beim Biss: stündliche Wetterwerte.', 'Jeder Biss landet auf dem Spot, den du beim Einrichten seiner Rute festgelegt hast.'].filter(Boolean).join(' '),
        karteAria: 'Biss-Karte ' + (d.lake ? d.lake.short : '') + ' mit ' + sel.length + ' Bissen ' + (ansicht === 'waerme' ? 'als Wärmekarte' : 'als Punkte'),
        karteRef: el => this.karte(el, w)
      });
  }
}

dcSeite(V, BissKarte, async param => {
  const [lakeId, sessionId] = String(param || '').split('~');
  const seen = await alleSeen();
  const s = sessionId ? await sessions.get(sessionId) : null;
  const lake = seen.find(l => l.id === (s ? s.lakeId : lakeId)) || seen[0];
  if (!lake) return null;
  const map = await mapOf(lake.id), spots = await spotsOf(lake.id);
  const roh = s ? bisseAus(await eintraegeVon(s)) : bisseAus((await entries.list()).filter(e => e.lakeId === lake.id)).sort((a, b) => a.ts - b.ts);
  // Ruten des Ansitzes mit Verlauf (umgelegt)
  const rutenListe = [], linien = [];
  if (s) {
    const verlauf = s.rodSetupsVerlauf || [];
    rutenVon(s).forEach((r, i) => {
      const farbe = FARBEN[(r.nr - 1) % FARBEN.length], kurz = 'R' + r.nr;
      const alt = verlauf.filter(x => x.nr === r.nr);
      const lagen = alt.concat([r]).filter(x => x.kx != null);
      lagen.forEach((x, j) => {
        const umgelegt = lagen.length > 1;
        const uhr = t => new Date(t).getHours();
        linien.push({ x: x.kx, y: x.ky, farbe, unten: true, text: !umgelegt ? kurz : x.bis ? kurz + ' bis ' + uhr(x.bis) + ' Uhr' : kurz + ' ab ' + uhr(x.seit) });
      });
      const spots2 = alt.concat([r]).map(x => x.spot).filter(Boolean);
      const letzteAend = alt.length ? alt[alt.length - 1].bis : null;
      rutenListe.push({ kurz, farbe, name: 'Rute ' + r.nr + (spots2.length ? ' · ' + [...new Set(spots2)].join(' → ') : ''),
        info: letzteAend ? 'umgelegt am ' + new Date(letzteAend).getDate() + '.' + (new Date(letzteAend).getMonth() + 1) + '. um ' + new Date(letzteAend).getHours() + ' Uhr'
          : [(r.koeder || []).join(' + '), r.entfernungM ? r.entfernungM + ' m' : null].filter(Boolean).join(', ') || 'ohne Angaben' });
    });
  }
  const B = roh.map((e, i) => {
    const nr = Number(String(e.rod || '').replace(/\D/g, '')) || null;
    const art = e.species || '';
    const d = new Date(e.ts);
    return {
      id: e.id, fang: e.type === 'fang', rute: nr ? 'R' + nr : null, art, kg: e.weightKg, spotName: e.spotName || null,
      x: e.spotXY && isNum(e.spotXY.x) ? e.spotXY.x : null, y: e.spotXY && isNum(e.spotXY.y) ? e.spotXY.y : null,
      jx: f1(Math.sin(i * 2.3) * 7), jy: f1(Math.cos(i * 1.7) * 5),
      farbe: /spieg/i.test(art) ? '#00FF5E' : /schupp/i.test(art) ? '#ffd21e' : '#ece8dc',
      h: d.getHours() + d.getMinutes() / 60, wd: e.weather && e.weather.windDir || null
    };
  });
  if (!s) {
    const nrs = [...new Set(B.map(b => b.rute).filter(Boolean))].sort();
    nrs.forEach(k => rutenListe.push({ kurz: k, farbe: FARBEN[(Number(k.slice(1)) - 1) % FARBEN.length], name: 'Rute ' + k.slice(1), info: 'alle Ansitze am ' + lake.short }));
  }
  const lauf = await laufenderAnsitz();
  return { lake, s, map, spots, B, ruten: rutenListe, linien, platz: (s && s.platz) || (map && map.platz) || null, laeuft: !!(lauf && lauf.lakeId === lake.id) };
}, { auch: ['bisskarte'] });
