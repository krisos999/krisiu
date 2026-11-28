// 4d · Wind am See – 1:1 wie Entwurf: welches Ufer der Wind der nächsten Tage trifft, aus der Uferform der Startdatei.
import V from '../vorlagen/WindSee.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum, DAY, HOUR } from '../core/util.js';
import { mapOf, spotsOf } from '../core/repo.js';
import { alleSeen, laufenderAnsitz, stundenFuer } from '../ui/daten.js';
import { tagesWerte } from '../ui/analyse.js';
import { R8, RICHTUNG_NAME as NAME, uferSeiten, seitenName, abstand } from './ufer.js';

const WINKEL = { N: 0, NO: 45, O: 90, SO: 135, S: 180, SW: 225, W: 270, NW: 315 };
const KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const f1 = v => Math.round(v * 10) / 10;
const W = 342, H = 400;
const chipAn = "height: 44px; border-radius: 999px; border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000; font: 700 18px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.08em; cursor: pointer";
const chipAus = "height: 44px; border-radius: 999px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 18px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.08em; cursor: pointer";
const tagStil = an => 'display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; height: 70px; padding: 0; border-radius: 12px; cursor: pointer; ' + (an ? 'border: 1.5px solid #00FF5E; background: #0f2a18; color: #00FF5E' : 'border: 1px solid #2e2e2e; background: #141414; color: #ece8dc');
const rStil = an => "height: 44px; padding: 0; border-radius: 10px; cursor: pointer; font: 700 15px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; " + (an ? 'border: 1.5px solid #00FF5E; background: #00FF5E; color: #000000' : 'border: 1px solid #444444; background: #141414; color: #ece8dc');

function ansicht(map, spots, platz) {
  const pts = spots.map(s => [s.x, s.y]).concat(platz ? [[platz.x, platz.y]] : []);
  const ufer = map.lines.filter(l => l.art === 'ufer').flatMap(l => l.pts);
  const basis = pts.length ? pts : ufer;
  const xs = basis.map(p => p[0]), ys = basis.map(p => p[1]), rand = 60;
  let vx = Math.min(...xs) - rand, vy = Math.min(...ys) - rand, vw = Math.max(...xs) + rand - vx, vh = Math.max(...ys) + rand - vy;
  const ziel = H / W;
  if (vh / vw < ziel) { const n = vw * ziel; vy -= (n - vh) / 2; vh = n; } else { const n = vh / ziel; vx -= (n - vw) / 2; vw = n; }
  if (vh > map.h) { const k = map.h / vh; vw *= k; vh = map.h; vx += (vw / k - vw) / 2; }
  vx = Math.max(0, Math.min(map.w - vw, vx)); vy = Math.max(0, Math.min(map.h - vh, vy));
  return { vx, vy, vw, vh, sc: W / vw };
}

class WindSee extends DCLogic {
  async componentDidMount() {
    const d = this.props.daten; if (!d) return;
    const tage = {};
    for (const x of d.seen) {
      if (!isNum(x.lake.lat)) continue;
      const a = new Date(); a.setHours(0, 0, 0, 0);
      const h = await stundenFuer(x.lake, a.getTime() - DAY, a.getTime() + 5 * DAY + HOUR).catch(() => ({ hours: [] }));
      tage[x.lake.id] = [0, 1, 2, 3, 4].map(i => {
        const t0 = a.getTime() + i * DAY, t = tagesWerte(h.hours || [], t0), dd = new Date(t0);
        return t && t.wind ? { k: i === 0 ? 'Heute' : KURZ[dd.getDay()], d: dd.getDate() + '.' + (dd.getMonth() + 1) + '.', r: t.wind, v: isNum(t.windKmh) ? Math.round(t.windKmh) : null } : null;
      }).filter(Boolean);
    }
    this.setState({ tage });
  }
  karte(el, w) {
    const d = this.props.daten, x = w.x;
    if (!el) return;
    if (!x.map) { el.innerHTML = `<p style="margin: 0; padding: 150px 24px 0; text-align: center; font-size: 14px; line-height: 1.4; color: #a39f93">Für ${esc(x.lake.name)} ist noch keine Karte auf dem Handy. Lies unter „Mehr“ deine Startdatei ein.</p>`; return; }
    const key = x.lake.id + w.dir + w.kmh;
    if (el.__key === key) return; el.__key = key;
    const map = x.map, v = w.v, X = px => f1((px - v.vx) * v.sc), Y = py => f1((py - v.vy) * v.sc);
    const pfad = (pts, zu) => 'M' + pts.map(p => X(p[0]) + ' ' + Y(p[1])).join('L') + (zu ? 'Z' : '');
    const o = [`<image href="${map.image}" x="${f1(-v.vx * v.sc)}" y="${f1(-v.vy * v.sc)}" width="${f1(map.w * v.sc)}" height="${f1(map.h * v.sc)}" preserveAspectRatio="none"></image>`,
      `<rect width="${W}" height="${H}" fill="#000000" fill-opacity="0.18"></rect>`];
    map.lines.forEach(l => {
      if (l.art === 'ufer') o.push(`<path d="${pfad(l.pts, true)}" fill="none" stroke="#ece8dc" stroke-width="1.4" stroke-opacity="0.75" stroke-linejoin="round"></path>`);
      else if (l.art === 'insel') o.push(`<path d="${pfad(l.pts, true)}" fill="none" stroke="#ece8dc" stroke-width="1.2"></path>`);
      else if (l.art === 'loch') o.push(`<path d="${pfad(l.pts, true)}" fill="#000000" fill-opacity="0.35" stroke="#ece8dc" stroke-opacity="0.8" stroke-width="1"></path>`);
    });
    const belegt = [];
    const frei = (bx, by, bw, bh) => { if (belegt.some(b => bx < b[0] + b[2] && bx + bw > b[0] && by < b[1] + b[3] && by + bh > b[1])) return false; belegt.push([bx, by, bw, bh]); return true; };
    x.spots.slice().sort((a, b) => (b.kind === 'bereich') - (a.kind === 'bereich')).forEach(s => {
      const bw = s.name.length * 6.3 + 6;
      if (!frei(X(s.x) - bw / 2, Y(s.y) - (s.kind === 'bereich' ? 44 : 12), bw, s.kind === 'bereich' ? 16 : 14)) return;
      if (s.kind === 'bereich' || w.zonen.includes(s.name))  { const rx = f1(Math.max(18, Math.min(46, 55 * v.sc))); o.push(`<ellipse cx="${X(s.x)}" cy="${Y(s.y)}" rx="${rx}" ry="${f1(rx * 0.6)}" fill="#00FF5E" fill-opacity="0.12" stroke="#00FF5E" stroke-opacity="0.7" stroke-width="1.3" stroke-dasharray="5 4"></ellipse><text x="${X(s.x)}" y="${f1(Y(s.y) - rx * 0.6 - 6)}" fill="#ece8dc" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Barlow, sans-serif" font-size="12" font-weight="700" text-anchor="middle">${esc(s.name)}</text>`); }
      else o.push(`<text x="${X(s.x)}" y="${Y(s.y)}" fill="#ece8dc" fill-opacity="0.85" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Barlow, sans-serif" font-size="11" font-style="italic" text-anchor="middle">${esc(s.name)}</text>`);
    });
    if (x.platz) o.push(`<circle cx="${X(x.platz.x)}" cy="${Y(x.platz.y)}" r="6" fill="#ece8dc" stroke="#000000" stroke-width="2"></circle><text x="${f1(X(x.platz.x) - 10)}" y="${f1(Y(x.platz.y) + 4)}" fill="#ece8dc" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Barlow, sans-serif" font-size="12" font-weight="600" text-anchor="end">${esc((x.platz.name || 'Angelplatz').split(' (')[0])}</text>`);
    w.seiten.lee.forEach(l => { const dd = pfad(l); o.push(`<path d="${dd}" fill="none" stroke="#000000" stroke-opacity="0.5" stroke-width="6" stroke-dasharray="0.1 7" stroke-linecap="round"></path><path d="${dd}" fill="none" stroke="#ece8dc" stroke-width="3.5" stroke-dasharray="0.1 7" stroke-linecap="round"></path>`); });
    w.seiten.auf.forEach(l => { const dd = pfad(l); o.push(`<path d="${dd}" fill="none" stroke="#000000" stroke-opacity="0.6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path><path d="${dd}" fill="none" stroke="#00FF5E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>`); });
    const hin = (WINKEL[w.dir] + 180) % 360;
    const pfeil = (dx, lang, k) => { const sw = k ? 6.2 : 5.4, sl = k ? 3.2 : 2.4, a = -lang, b = lang * 0.66;
      return `<path d="M${dx} ${f1(b)}V${a + 14}" stroke="#000000" stroke-opacity="0.55" stroke-width="${sw}" stroke-linecap="round"></path><path class="wehen" d="M${dx} ${f1(b)}V${a + 14}" stroke="#ece8dc" stroke-width="${sl}" stroke-linecap="round" stroke-dasharray="12 9"></path>`
        + `<path d="M${dx - 10} ${a + 12}L${dx} ${a}L${dx + 10} ${a + 12}" fill="none" stroke="#000000" stroke-opacity="0.55" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"></path><path d="M${dx - 10} ${a + 12}L${dx} ${a}L${dx + 10} ${a + 12}" fill="none" stroke="#ece8dc" stroke-width="${sl}" stroke-linecap="round" stroke-linejoin="round"></path>`; };
    o.push(`<g transform="translate(${w.mitte}) rotate(${hin})" opacity="${w.kmh != null && w.kmh < 8 ? 0.55 : 1}">${pfeil(-58, 42, false)}${pfeil(0, 62, true)}${pfeil(58, 42, false)}</g>`);
    o.push(`<g transform="translate(44 330)"><circle r="30" fill="#000000" fill-opacity="0.72" stroke="#ece8dc" stroke-opacity="0.6" stroke-width="1"></circle><text y="-17" fill="#ece8dc" font-family="Barlow Condensed, sans-serif" font-size="11" font-weight="700" text-anchor="middle">N</text><g transform="rotate(${hin})"><path d="M0 16V-12" stroke="#00FF5E" stroke-width="3" stroke-linecap="round"></path><path d="M-7 -5L0 -14L7 -5" fill="none" stroke="#00FF5E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path></g></g>`,
      `<text x="12" y="384" fill="#ece8dc" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Barlow Condensed, sans-serif" font-size="14" font-weight="700">aus ${w.dir}${w.kmh == null ? '' : ' · ' + w.kmh + ' km/h'}</text>`);
    const quelle = (map.source || '').split(' · ')[0];
    if (quelle) o.push(`<text x="10" y="18" fill="#ece8dc" fill-opacity="0.8" stroke="#000000" stroke-width="2.5" paint-order="stroke" font-family="Barlow, sans-serif" font-size="9.5">${esc(quelle)}</text>`);
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="display: block; position: absolute; left: 0; top: 0">${o.join('')}</svg>`;
  }
  renderVals() {
    const d = this.props.daten; if (!d) return {};
    const st = this.state || {};
    const see = Math.min(st.see === undefined ? d.start : st.see, d.seen.length - 1), x = d.seen[see];
    const liste = (st.tage && st.tage[x.lake.id]) || [];
    const tag = st.tag === undefined ? 0 : st.tag, handDir = st.dir || null;
    const t = tag >= 0 ? liste[tag] : null;
    const dir = handDir || (t ? t.r : 'SW'), kmh = handDir || !t ? null : t.v;
    const seiten = x.map ? uferSeiten(x.map, dir) : { auf: [], lee: [] };
    const aufName = x.map ? seitenName(x.map, seiten.auf) : null, leeName = x.map ? seitenName(x.map, seiten.lee) : null;
    const nahAuf = x.map ? x.spots.filter(s => abstand(seiten.auf, s.x, s.y) < 80).slice(0, 2) : [];
    const nahLee = x.map ? x.spots.filter(s => abstand(seiten.lee, s.x, s.y) < 80 && !nahAuf.includes(s)).slice(0, 2) : [];
    const art = ['S', 'SW', 'W'].includes(dir) ? 1 : ['N', 'NO', 'O'].includes(dir) ? -1 : 0;
    const regel = x.lake.tipps && x.lake.tipps.wind && x.lake.tipps.wind[dir];
    let staerke;
    if (kmh === null) staerke = handDir ? 'Von Hand gewählt: so sähe es bei Wind aus ' + NAME[dir] + ' aus.' : 'Noch keine Vorhersage – zeigt Wind aus ' + NAME[dir] + '.';
    else if (kmh < 8) staerke = kmh + ' km/h – schwach. Am Ufer kommt kaum etwas an.';
    else if (kmh <= 20) staerke = kmh + ' km/h – mäßig. Das Windufer ist schon spürbar.';
    else staerke = kmh + ' km/h – kräftig. Am Windufer gibt es Wellen und Drift, Schnur absenken.';
    const tipp = regel || (art > 0 ? `${NAME[dir]}wind schiebt warmes Oberflächenwasser und Futter ans ${aufName || 'Windufer'}${nahAuf.length ? ' – zu ' + nahAuf.map(s => s.name).join(' und ') : ''}. Da würd ich hin.`
      : art < 0 ? `Kalter ${NAME[dir]}wind drückt aufs ${aufName || 'Windufer'}. An solchen Tagen lieber tief und ruhig fischen${nahLee.length ? ', etwa ' + nahLee.map(s => s.name).join(' oder ') : ''} – oder den tieferen See nehmen.`
        : `${NAME[dir]}wind: Das ${aufName || 'Windufer'} bekommt den Wind. Probier eine Rute dort und eine im ruhigen Wasser.`);
    const v = x.map ? ansicht(x.map, x.spots, x.platz) : null;
    const w = { x, dir, kmh, seiten, v, zonen: x.zonen, mitte: '171 190' };
    const n = d.seen.length;
    return {
      seeSpalten: Math.min(n, 3),
      seen: d.seen.map((y, i) => ({ text: y.lake.short, p: i === see, s: i === see ? chipAn : chipAus, k: () => this.setState({ see: i, tag: 0, dir: null }) })),
      pill: t ? t.k + ' ' + t.d + ' · ' + x.lake.short : 'Test · ' + x.lake.short,
      tageQuelle: liste.length ? 'Vorhersage' : st.tage ? 'keine Vorhersage' : 'wird geladen …',
      tage: liste.map((y, i) => ({ k: y.k, r: y.r, v: y.v == null ? '' : y.v, an: i === tag, dreh: 'rotate(' + ((WINKEL[y.r] + 180) % 360) + ')',
        aria: y.k + ' ' + y.d + ', Wind aus ' + NAME[y.r] + (y.v != null ? ', ' + y.v + ' km/h' : ''), stil: tagStil(i === tag), tipp: () => this.setState({ tag: i, dir: null }) })),
      richtungen: R8.map(r => ({ name: r, an: handDir === r, aria: 'Wind aus ' + NAME[r] + ' ausprobieren', stil: rStil(handDir === r), tipp: () => this.setState({ dir: r, tag: -1 }) })),
      karteRef: el => this.karte(el, w),
      karteAria: 'Luftbild ' + x.lake.name + ' mit Windrichtung und auflandigem Ufer in Grün',
      titel: 'Wind aus ' + NAME[dir],
      urteil: art > 0 ? '+ hilft' : art < 0 ? '− bremst' : '= neutral',
      urteilStil: "flex: none; padding: 6px 10px; border-radius: 999px; border: 1px solid " + (art > 0 ? '#00FF5E' : art < 0 ? '#ff1e1e' : '#a39f93') + "; color: " + (art > 0 ? '#00FF5E' : art < 0 ? '#ff1e1e' : '#a39f93') + "; font: 700 14px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap",
      auf: x.map ? (aufName || 'kein Ufer genau im Wind') + (nahAuf.length ? ' – ' + nahAuf.map(s => s.name).join(', ') : '') : 'Ohne Karte nicht berechenbar',
      lee: x.map ? (leeName || '–') + (nahLee.length ? ' – ' + nahLee.map(s => s.name).join(', ') : '') + ', ruhig' : '–',
      staerke,
      krisiuKopf: art > 0 ? 'Krisiu: da würd ich hin' : 'Krisiu überlegt',
      tipp, beruht: 'Beruht auf: Uferform aus deiner Startdatei' + (regel ? ', deiner Wind-Regel für diesen See' : '') + ' und der Vorhersage. Faustregel, keine Garantie.',
      rutenLink: d.laeuft ? '#/Ruten' : '#/Planen', rutenText: d.laeuft ? 'Ruten ans Windufer legen' : 'Ansitz planen',
      fussnote: 'Die grüne Linie rechnet Krisiu aus der Uferform: Wo der Wind übers Wasser kommt und aufs Ufer trifft. Ob die Fische dort wirklich stehen, zeigt dir mit der Zeit die Biss-Karte.'
    };
  }
}

dcSeite(V, WindSee, async param => {
  const lauf = await laufenderAnsitz();
  const seen = [];
  for (const lake of await alleSeen()) {
    const map = await mapOf(lake.id), spots = map ? (await spotsOf(lake.id)).filter(s => s.x != null) : [];
    seen.push({ lake, map, spots, platz: map && map.platz, zonen: [] });
  }
  if (!seen.length) return null;
  const want = param || (lauf && lauf.lakeId);
  const start = Math.max(0, seen.findIndex(x => x.lake.id === want));
  return { seen, start, laeuft: !!lauf };
}, { auch: ['windsee'] });
