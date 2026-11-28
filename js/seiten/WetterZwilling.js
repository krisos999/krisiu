// 4c · Wetter-Zwilling – 1:1 wie Entwurf: der eigene Ansitz, dessen Wetter dem von heute am meisten ähnelt.
import V from '../vorlagen/WetterZwilling.js';
import mache from '../vorlagen/WetterZwilling.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum, DAY, HOUR } from '../core/util.js';
import { lakes, spotsOf } from '../core/repo.js';
import { go, zahl, dauer } from '../ui/app.js';
import { alleSeen, beendeteAnsitze, laufenderAnsitz, zahlen, rutenVon, stundenFuer } from '../ui/daten.js';
import { tagesWerte, tagesSterne, istKarpfen } from '../ui/analyse.js';
import { tagesBewertung, ZWILLING_GEWICHT } from './wetter.js';
import { zeitraumKurz } from './Auswertung.js';

const NACHBAR = { N: ['NW', 'NO'], NO: ['N', 'O'], O: ['NO', 'SO'], SO: ['O', 'S'], S: ['SO', 'SW'], SW: ['S', 'W'], W: ['SW', 'NW'], NW: ['W', 'N'] };
const tag0 = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const minus = v => String(v).replace('-', '−');
const r0 = v => minus(zahl(v, 0));
const dm = ms => { const d = new Date(ms); return d.getDate() + '.' + (d.getMonth() + 1) + '.'; };
const WORT = ['null', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
const trend = (a, b) => (!isNum(a) || !isNum(b) ? null : b - a <= -1.5 ? 'fällt' : b - a >= 1.5 ? 'steigt' : 'stabil');
const PERF = { 'fällt': 'fiel', steigt: 'stieg', stabil: 'blieb' };
const wolkenWort = w => (!isNum(w) ? '' : w >= 80 ? 'bedeckt' : w >= 40 ? 'wechselnd bewölkt' : 'klar');

/** Werte von heute und damals Punkt für Punkt, gleiche Gewichte wie die Chancen-Seite. */
function punkte(H, D, weiher) {
  const P = [];
  const z = p => (p >= 0.8 ? '=' : p >= 0.4 ? '≈' : '≠');
  // Nacht
  if (isNum(H.nacht) && isNum(D.nacht)) {
    const d = H.nacht - D.nacht, p = Math.max(0, 1 - Math.abs(d) / 8);
    P.push({ name: 'Nacht', heute: r0(H.nacht) + ' °C', damals: D.nachtText, p, warum: z(p) === '=' ? 'Die Nacht zählt am meisten – und sie ist fast so wie damals.' : 'Die Nacht zählt am meisten. Damals war sie ' + (d < 0 ? 'milder' : 'kälter') + ' – um ' + r0(Math.abs(d)) + ' Grad.' + (weiher ? ' Im flachen Weiher macht das viel aus.' : '') });
  }
  // Luftdruck
  if (H.dTrend && D.dTrend) {
    const dh = H.p1 - H.p0, dd = D.p1 - D.p0, p = Math.max(0, 1 - Math.abs(dh - dd) / 10);
    let w = H.dTrend === D.dTrend ? 'Beide Male ' + (H.dTrend === 'stabil' ? 'bleibt der Druck ruhig.' : H.dTrend + ' der Druck' + (H.dTrend === 'fällt' ? ' – das ist das Gute.' : '.')) : 'Damals ' + PERF[D.dTrend] + ' der Druck, heute ' + H.dTrend + ' er' + (H.dTrend === 'stabil' ? ' ruhig.' : '.');
    if (H.dTrend === D.dTrend && Math.abs(dd) > 2 * Math.abs(dh) + 2) w += ' Damals ging es aber deutlich schneller.';
    P.push({ name: 'Luftdruck', heute: H.dTrend + ', ' + Math.round(H.p0) + ' → ' + Math.round(H.p1), damals: PERF[D.dTrend] + ', ' + Math.round(D.p0) + ' → ' + Math.round(D.p1), p, warum: w });
  }
  // Wind
  if (H.wind && D.wind) {
    const p = H.wind === D.wind ? 1 : (NACHBAR[H.wind] || []).includes(D.wind) ? 0.5 : ((H.kmh || 0) < 8 && (D.kmh || 0) < 8 ? 0.6 : 0);
    const st = k => (!isNum(k) ? '' : k < 10 ? ', schwach' : ', ' + Math.round(k) + ' km/h');
    P.push({ name: 'Wind', heute: H.wind + st(H.kmh), damals: D.wind + st(D.kmh), p, warum: p === 1 ? 'Gleiche Richtung' + (isNum(H.kmh) && isNum(D.kmh) ? (H.kmh > D.kmh + 5 ? ', heute etwas kräftiger.' : H.kmh < D.kmh - 5 ? ', heute schwächer.' : ', ähnlich stark.') : '.') : p >= 0.5 ? 'Ähnliche Richtung wie damals.' : 'Andere Richtung als damals – der Wind drückt auf ein anderes Ufer.' });
  }
  // Wolken
  if (isNum(H.wolken) && isNum(D.wolken)) {
    const p = 1 - Math.abs(H.wolken - D.wolken) / 100;
    P.push({ name: 'Wolken', heute: Math.round(H.wolken) + ' %', damals: Math.round(D.wolken) + ' %', p, warum: wolkenWort(H.wolken) === wolkenWort(D.wolken) ? 'Beide Male ' + wolkenWort(H.wolken) + '.' + (H.wolken >= 80 ? ' Die Fische sind weniger scheu und fressen auch tagsüber.' : '') : 'Damals ' + wolkenWort(D.wolken) + ', heute ' + wolkenWort(H.wolken) + '.' });
  }
  // Regen
  if (isNum(H.regen) && isNum(D.regen)) {
    const nh = H.regen >= 0.5, nd = D.regen >= 0.5, p = nh === nd ? 1 : 0.2;
    const t = mm => (mm >= 0.5 ? zahl(mm) + ' mm' : 'trocken');
    P.push({ name: 'Regen', heute: t(H.regen), damals: t(D.regen), p, warum: nh === nd ? (nh ? 'Beide Male Regen – milder Regen gilt als Plus.' : 'Beide Male trocken.') : nd ? 'Damals hat es geregnet. Milder Regen gilt als Plus – heute fehlt er.' : 'Heute regnet es, damals war es trocken. Milder Regen gilt als Plus.' });
  }
  // Umschwung
  if (H.um != null && D.um != null) {
    const p = H.um && D.um ? 1 : !H.um && !D.um ? (Math.sign(H.waerme || 0) === Math.sign(D.waerme || 0) ? 0.6 : 0.4) : 0.2;
    const t = (um, dw) => (um ? 'kalt-klar → mild-trüb' : isNum(dw) ? (dw >= 0 ? '+' : '−') + zahl(Math.abs(dw), 0) + ' °C zu gestern' : '–');
    P.push({ name: 'Umschwung', heute: t(H.um, H.waerme), damals: t(D.um, D.waerme), p, warum: D.um && !H.um ? 'Damals kam der Umschwung von kalt-klar zu mild-trüb – die Top-Beißphase. Heute nicht.' : H.um && D.um ? 'Beide Male der Umschwung kalt-klar → mild-trüb – die Top-Beißphase.' : H.um ? 'Heute kommt der Umschwung kalt-klar → mild-trüb – damals nicht. Das spricht für heute.' : 'Kein Umschwung, weder damals noch heute.' });
  }
  const gw = { Nacht: ZWILLING_GEWICHT.Nacht, Luftdruck: ZWILLING_GEWICHT.Luftdruck, Wind: ZWILLING_GEWICHT.Wind, Wolken: ZWILLING_GEWICHT.Wolken, Regen: ZWILLING_GEWICHT.Regen, Umschwung: ZWILLING_GEWICHT.Umschwung };
  let s = 0, g = 0;
  P.forEach(x => { x.gw = gw[x.name]; x.z = z(x.p); s += x.p * x.gw; g += x.gw; });
  return { P, prozent: g ? Math.round(s / g * 100) : 0 };
}

/** Tageswerte eines Ansitzes aus den Stundenwerten (erster Tag) – für den Vergleich mit heute. */
function damalsWerte(s, hours) {
  const w = s.weather || {};
  const t = tagesWerte(hours, tag0(s.startTs)), v = tagesWerte(hours, tag0(s.startTs) - DAY);
  const hs = hours.filter(h => h.t >= s.startTs && h.t <= (s.endTs || s.startTs));
  const nachtH = hs.filter(h => { const x = new Date(h.t).getHours(); return x >= 20 || x < 8; }).map(h => h.tempC).filter(isNum);
  const nacht = nachtH.length ? Math.min(...nachtH) : isNum(w.tempMinC) ? w.tempMinC : t && t.nachtMin;
  const nachtText = nachtH.length > 1 && Math.round(Math.min(...nachtH)) !== Math.round(Math.max(...nachtH)) ? r0(Math.min(...nachtH)) + '–' + r0(Math.max(...nachtH)) + ' °C' : isNum(nacht) ? r0(nacht) + ' °C' : '–';
  const b = t ? tagesSterne(t, v) : null;
  return { nacht: nachtH.length ? nachtH.reduce((a, x) => a + x, 0) / nachtH.length : nacht, nachtText, p0: w.pressureStartHpa, p1: w.pressureEndHpa, dTrend: trend(w.pressureStartHpa, w.pressureEndHpa),
    wind: w.windDir, kmh: w.windKmh, wolken: w.cloudPct, regen: w.precipMm, um: b ? b.umschwung : null, waerme: t && v && isNum(t.tagMax) && isNum(v.tagMax) ? t.tagMax - v.tagMax : null };
}
function heuteWerte(bw) {
  const t = bw.t, v = bw.v;
  return { nacht: t.nachtMin, p0: t.druckVon, p1: t.druckBis, dTrend: trend(t.druckVon, t.druckBis), wind: t.wind, kmh: t.windKmh, wolken: t.wolken, regen: t.regen,
    um: bw.b ? bw.b.umschwung : null, waerme: v && isNum(t.tagMax) && isNum(v.tagMax) ? t.tagMax - v.tagMax : null };
}

function druckSvg(heute, damals, damalsLabel) {
  const x0 = 34, x1 = 306, span = 45 * HOUR;
  const pts = (hs, a) => hs.filter(h => h.t >= a && h.t <= a + span && new Date(h.t).getHours() % 3 === 0 && isNum(h.pressureHpa)).map(h => [x0 + (h.t - a) / span * (x1 - x0), h.pressureHpa]);
  const A = pts(heute.hours, heute.a), B = pts(damals.hours, damals.a);
  const alle = A.concat(B).map(p => p[1]);
  if (!alle.length) return '<p style="margin: 0; padding: 60px 0; text-align: center; font-size: 14px; color: #a39f93">Der Druckverlauf kommt, sobald Netz da ist.</p>';
  const lo = Math.min(...alle), hi = Math.max(...alle), k = Math.min(4.74, 110 / Math.max(1, hi - lo)), mitte = (lo + hi) / 2;
  const Y = p => 74 + (mitte - p) * k, f1 = v => Math.round(v * 10) / 10;
  const out = [];
  for (let v = Math.ceil((mitte - 64 / k) / 10) * 10; v <= mitte + 62 / k; v += 10) { const y = Y(v); if (y >= 14 && y <= 136) out.push(`<path d="M34 ${f1(y)}H306" stroke="#ffffff" stroke-opacity="0.12"></path><text x="28" y="${f1(y + 3.5)}" fill="#a39f93" font-family="Barlow, sans-serif" font-size="10.5" text-anchor="end">${v}</text>`); }
  [12, 24, 36].forEach(hh => out.push(`<path d="M${f1(x0 + hh / 45 * (x1 - x0))} 12V140" stroke="#ffffff" stroke-opacity="0.08"></path>`));
  const pfad = (P, farbe, w) => (P.length > 1 ? `<path d="${P.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(Y(p[1]))).join('')}" fill="none" stroke="${farbe}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"></path>` : '');
  out.push(pfad(B, '#ece8dc', 2.2), pfad(A, '#00FF5E', 2.6));
  if (A.length) out.push(`<text x="308" y="${f1(Y(A[A.length - 1][1]) - 6)}" fill="#00FF5E" font-family="Barlow Condensed, sans-serif" font-size="12" font-weight="700" text-anchor="end">HEUTE</text>`);
  if (B.length) { const m = B[Math.min(B.length - 1, Math.round(B.length * 2 / 3))]; out.push(`<text x="${f1(m[0])}" y="${f1(Math.min(150, Y(m[1]) + 18))}" fill="#ece8dc" font-family="Barlow Condensed, sans-serif" font-size="12" font-weight="700" text-anchor="middle">${damalsLabel}</text>`); }
  [[0, '0 Uhr'], [12, '12'], [24, '0 Uhr'], [36, '12'], [45, '21']].forEach(([hh, t]) => out.push(`<text x="${f1(x0 + hh / 45 * (x1 - x0))}" y="166" fill="#a39f93" font-family="Barlow, sans-serif" font-size="10.5" text-anchor="middle">${t}</text>`));
  return `<svg width="314" height="172" viewBox="0 0 314 172" role="img" aria-label="Luftdruck über zwei Tage: heute und ${damalsLabel}" style="display: block">${out.join('')}</svg>`;
}

class WetterZwilling extends mache(DCLogic) {
  async componentDidMount() {
    const d = this.props.daten; if (!d || !d.lake) return go('ChancenHeute');
    const bw = await tagesBewertung(d.lake);
    if (!bw.t) return this.setState({ fertig: true, ohne: true });
    const H = heuteWerte(bw), weiher = d.lake.art === 'weiher';
    const liste = [];
    for (const s of d.ansitze) {
      const h = await stundenFuer(d.lake, tag0(s.startTs) - DAY, tag0(s.startTs) + 2 * DAY);
      const D = damalsWerte(s, h.hours || []), v = punkte(H, D, weiher);
      liste.push({ s, D, v, hours: h.hours || [] });
    }
    liste.sort((a, b) => b.v.prozent - a.v.prozent);
    const best = liste[0] || null;
    const morgen = await stundenFuer(d.lake, tag0(Date.now()), tag0(Date.now()) + 2 * DAY);
    let z = null, spots = [];
    if (best) { z = await zahlen(best.s); spots = await spotsOf(d.lake.id); }
    this.setState({ fertig: true, H, liste, best, z, spots, heuteHours: morgen.hours || [], quelle: bw.quelle });
  }
  renderVals() {
    const basis = super.renderVals();
    const d = this.props.daten || {}, st = this.state || {}, lake = d.lake;
    const best = st.best, offen = st.offen === undefined ? -1 : st.offen;
    const leer = {
      pille: 'Heute · ' + (lake ? lake.short : ''), prozentText: '–', prozentAria: 'noch kein Vergleich', ringDash: '0 282.7',
      zwTitel: st.fertig ? 'Noch kein Zwilling' : 'Krisiu sucht …', damals: st.ohne ? 'Für heute fehlt noch die Vorhersage.' : st.fertig ? 'Dafür braucht es einen beendeten Ansitz mit Wetter.' : '', gleichText: '',
      zwKurz: 'damals', punkte: [], druckRef: el => { if (el && !el.__k) { el.__k = 1; el.innerHTML = '<p style="margin: 0; padding: 60px 0; text-align: center; font-size: 14px; color: #a39f93">' + (st.fertig ? 'Noch nichts zu vergleichen.' : 'Wird geladen …') + '</p>'; } },
      druckText: '', kacheln: [], damalsHinweis: '', krisiuKopf: '🤔 Krisiu wartet', krisiuText: 'Sobald ein Ansitz mit Wetter im Logbuch steht, sucht Krisiu hier den ähnlichsten Tag.', beruht: '',
      rutenLink: '#/Planen', rutenText: 'Ansitz planen', weitereText: '', rechnung: '', gewichte: basis.gewichte
    };
    if (!best) return Object.assign(basis, leer);
    const s = best.s, z = st.z, P = best.v.P, pz = best.v.prozent, wann = zeitraumKurz(s);
    const gleich = P.filter(p => p.z !== '≠').length;
    const ruten = rutenVon(s).filter(r => r.spot);
    const spotDaten = ruten.map(r => st.spots.find(x => x.name === r.spot)).filter(Boolean);
    const namen = [...new Set(ruten.map(r => r.spot))];
    const ersteWorte = namen.map(n => n.split(' ')[0]);
    const spotText = namen.length === 2 && ersteWorte[0] === ersteWorte[1] ? ersteWorte[0] + ' ' + namen[0].split(' ').slice(1).join(' ') + ' + ' + namen[1].split(' ').slice(1).join(' ') : namen.join(' + ');
    const tiefen = spotDaten.map(x => x.depthText).filter(Boolean);
    const wasser = [s.waterTempC, ...z.eintraege.map(e => e.waterTempC)].filter(isNum);
    const tage = Math.round((tag0(s.endTs || s.startTs) - tag0(s.startTs)) / DAY) + 1;
    const karpfen = z.eintraege.filter(e => e.type === 'fang').every(e => istKarpfen(e.species));
    const fischT = z.fische ? z.fische + (karpfen ? ' Karpfen' : z.fische === 1 ? ' Fisch' : ' Fische') : 'Schneider';
    const ohneZeit = Math.max(0, z.fische - z.eintraege.filter(e => e.type === 'fang').length);
    const gleiches = P.filter(p => p.z === '=').map(p => p.name), anders = P.filter(p => p.z === '≠');
    const art = pz >= 75 ? 'Fast ein Zwilling' : pz >= 45 ? 'Halber Zwilling' : 'Kaum ein Zwilling';
    let kt = art + (gleiches.length ? ': gleich bei ' + gleiches.join(', ') : '') + (anders.length ? (gleiches.length ? ' – aber ' : ': ') + anders.map(p => p.name + ' anders (' + p.heute + ' statt ' + p.damals + ')').slice(0, 2).join(', ') : '') + '.';
    if (z.fische && namen.length) kt += ' Ich würd die Plätze vom ' + dm(s.startTs) + ' nehmen: ' + namen.join(' und ') + (anders.some(p => p.name === 'Nacht') && best.D.nacht > (st.H.nacht || 0) ? ' – nur etwas tiefer und mit wenig Futter.' : '.');
    else if (!z.fische) kt += ' Damals war es ein Schneider – also lieber etwas anderes probieren als damals.';
    const R = (x, i) => x.gw.toString().replace('.', ',') + '·' + Math.round(x.p * 100);
    return Object.assign(basis, {
      pille: 'Heute · ' + lake.short, prozentText: pz + ' %', prozentAria: pz + ' Prozent ähnlich', ringDash: (282.7 * pz / 100).toFixed(1) + ' 282.7',
      zwTitel: wann + ' · ' + lake.short, damals: 'Damals: ' + fischT, gleichText: 'Gleich oder ähnlich in ' + gleich + ' von ' + P.length + ' Punkten', zwKurz: wann,
      punkte: P.map((p, i) => ({
        name: p.name, heute: p.heute, damals: p.damals, warum: p.warum, zeichen: p.z, wert: Math.round(p.p * 100) + ' % · zählt ' + Math.round(p.gw * 100) + ' %',
        offen: offen === i, linie: i === 0 ? '0' : '1px solid #2e2e2e',
        marke: "display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: none; border-radius: 50%; font: 700 15px/1 'Barlow Condensed', sans-serif; background: " + ({ '=': '#00FF5E;color:#000000', '≈': '#ece8dc;color:#000000', '≠': '#ff1e1e;color:#ffffff' })[p.z],
        balken: 'display: block; height: 100%; width: ' + Math.round(p.p * 100) + '%; border-radius: 3px; background: ' + (p.p >= 0.6 ? '#00FF5E' : p.p >= 0.4 ? '#ece8dc' : '#ff1e1e'),
        tipp: () => this.setState({ offen: offen === i ? -1 : i })
      })),
      druckRef: el => { if (!el || el.__k === s.id) return; el.__k = s.id; el.innerHTML = druckSvg({ hours: st.heuteHours, a: tag0(Date.now()) }, { hours: best.hours, a: tag0(s.startTs) }, wann); },
      druckText: 'Grün: heute und morgen laut Vorhersage. Hell: ' + wann + ', ' + (best.hours.some(h => h.measured) ? 'Messwerte.' : 'Wetterwerte.'),
      kacheln: [
        { w: fischT, l: tage > 1 ? 'in ' + tage + ' Tagen' : 'in ' + dauer((s.endTs || s.startTs) - s.startTs), stil: "font: 700 24px/1 'Barlow Condensed', sans-serif; color: " + (z.fische ? '#00FF5E' : '#a39f93') },
        { w: tiefen.length ? tiefen.join(' / ') : '–', l: spotDaten.some(x => x.ground === 'weich') ? 'eher weicher Grund' : spotDaten.some(x => x.ground === 'hart') ? 'eher harter Grund' : 'Tiefe an den Spots', stil: "font: 700 " + (tiefen.join(' / ').length > 12 ? 18 : 24) + "px/1 'Barlow Condensed', sans-serif" },
        { w: spotText || '–', l: namen.length ? ruten.length + (ruten.length === 1 ? ' Rute' : ' Ruten') : 'Spots nicht eingetragen', stil: "font: 700 20px/1.1 'Barlow Condensed', sans-serif; text-transform: uppercase" },
        { w: wasser.length ? zahl(Math.min(...wasser)) + (wasser.length > 1 && Math.min(...wasser) !== Math.max(...wasser) ? '–' + zahl(Math.max(...wasser)) : '') + ' °C' : '–', l: wasser.length ? 'Wasser, eingetragen' : 'Wasser nicht gemessen', stil: "font: 700 24px/1 'Barlow Condensed', sans-serif" }
      ],
      damalsHinweis: ohneZeit ? 'Für ' + ohneZeit + (ohneZeit === 1 ? ' Fisch fehlen' : ' Fische fehlen') + ' noch Bisszeit, Köder und Spot im Logbuch.' : 'Alle Bisse mit Uhrzeit im Logbuch – mehr in der Auswertung.',
      krisiuKopf: pz >= 75 ? '🤩 Krisiu ist zuversichtlich' : pz >= 45 ? '🤞 Krisiu drückt die Daumen' : '🤔 Krisiu ist skeptisch',
      krisiuText: kt,
      beruht: 'Beruht auf: Ansitz ' + wann + ' · Wetterwerte' + (st.quelle ? ' ' + st.quelle : '') + ' · deine Faustregeln',
      rutenLink: d.laeuft ? '#/Ruten' : '#/Planen', rutenText: d.laeuft ? 'Ruten wie am ' + dm(s.startTs) + ' legen' : 'Ansitz planen',
      weitereText: st.liste.length > 1 ? 'Auch ähnlich: ' + st.liste.slice(1, 4).map(x => zeitraumKurz(x.s) + ' (' + x.v.prozent + ' %)').join(', ') + '. Je mehr du einträgst – Schneider eingeschlossen –, desto genauer findet Krisiu deinen Zwilling.'
        : 'Im Logbuch steht bisher ein abgeschlossener Ansitz mit Wetter an diesem See. Je mehr du einträgst – Schneider eingeschlossen –, desto genauer findet Krisiu deinen Zwilling. Ab 5 Ansitzen zeigt er dir die drei ähnlichsten.',
      rechnung: 'Rechnung heute: ' + P.map(R).join(' + ') + ' = ' + pz + ' %' + (P.length < 6 ? ' (fehlende Punkte zählen nicht)' : '') + '. Verglichen wird immer derselbe See.'
    });
  }
}

dcSeite(V, WetterZwilling, async param => {
  const lauf = await laufenderAnsitz();
  let lake = param ? await lakes.get(param) : lauf ? await lakes.get(lauf.lakeId) : null;
  if (!lake) lake = (await alleSeen()).find(l => isNum(l.lat)) || null;
  if (!lake) return null;
  const ansitze = (await beendeteAnsitze()).filter(s => s.lakeId === lake.id && s.weather);
  return { lake, ansitze, laeuft: !!(lauf && lauf.lakeId === lake.id) };
}, { auch: ['wetterzwilling'] });
