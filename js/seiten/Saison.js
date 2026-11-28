// 11 · Saison-Kalender und 11a · Schneider-Analyse – 1:1 wie Entwurf, mit echten Ansitzen.
// „Beispiel“ bleibt als eigener, klar beschrifteter Schalter wie im Entwurf.
import VK from '../vorlagen/SaisonKalender.js';
import macheK from '../vorlagen/SaisonKalender.logik.js';
import VS from '../vorlagen/Schneider.js';
import macheS from '../vorlagen/Schneider.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum, HOUR, DAY } from '../core/util.js';
import { dauer, zahl } from '../ui/app.js';
import { alleSeen, beendeteAnsitze, zahlen } from '../ui/daten.js';
import { istKarpfen } from '../ui/analyse.js';
import { wetterKurz } from './Logbuch.js';
import { zeitraumKurz } from './Auswertung.js';

const p2 = n => String(n).padStart(2, '0');
const isoTag = ms => { const d = new Date(ms); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
const tag0 = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const WORT = ['kein', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
const minus = v => String(v).replace('-', '−');

async function ansitzeMitZahlen() {
  const seen = await alleSeen(), kurz = {};
  seen.forEach(l => { kurz[l.id] = l.short; });
  const out = [];
  for (const s of await beendeteAnsitze()) {
    const z = await zahlen(s), arten = z.eintraege.filter(e => e.type === 'fang').map(e => e.species);
    out.push({ s, z, see: kurz[s.lakeId] || '?', karpfen: z.fische > 0 && arten.every(istKarpfen) });
  }
  return { seen, liste: out };
}

/* ---------- Saison-Kalender ---------- */
class SaisonKalender extends macheK(DCLogic) {}
dcSeite(VK, SaisonKalender, async () => {
  const jahr = new Date().getFullYear();
  const { liste } = await ansitzeMitZahlen();
  const echt = liste.filter(x => new Date(x.s.startTs).getFullYear() === jahr || new Date(x.s.endTs || x.s.startTs).getFullYear() === jahr)
    .sort((a, b) => a.s.startTs - b.s.startTs)
    .map(({ s, z, see, karpfen }) => {
      const tage = Math.round((tag0(s.endTs || s.startTs) - tag0(s.startTs)) / DAY) + 1;
      return { start: isoTag(s.startTs), tage, see, fische: z.fische, karpfen, dauer: tage > 1 ? tage + ' Tage' : s.timed === false ? 'ohne Uhrzeit' : dauer((s.endTs || s.startTs) - s.startTs),
        info: wetterKurz(s.weather) || 'Wetter fehlt noch', link: '#/Auswertung/' + s.id };
    });
  const krisiu = (see, l) => {
    if (!l.length) return see !== 'alle' ? `Am ${see} hast du dieses Jahr noch keinen Ansitz eingetragen. Der erste Tag dort füllt das erste Kästchen.` : 'Dieses Jahr ist noch kein Ansitz eingetragen. Jeder Ansitz füllt ein Kästchen, auch Schneider.';
    const best = l.slice().sort((a, b) => b.fische - a.fische)[0];
    const n = l.length;
    const anfang = n === 1 ? 'Erst ein Ansitz' : n < 5 ? 'Erst ' + WORT[n] + ' Ansitze' : n + ' Ansitze';
    const bestT = best.fische ? (n === 1 ? ' – mit ' : ' – der beste mit ') + best.fische + (best.karpfen ? ' Karpfen' : best.fische === 1 ? ' Fisch' : ' Fischen') + '.' : ' – noch ohne Fisch.';
    return anfang + bestT + ' Jeder Ansitz füllt ein Kästchen, auch Schneider.' + (n < 5 ? ' Ab nächstem Jahr siehst du, welche Monate wieder so laufen.' : '');
  };
  return { jahr, D: { echt }, krisiu };
}, { auch: ['saison', 'saisonkalender'] });

/* ---------- Schneider-Analyse ---------- */
const nachtKlasse = t => (!isNum(t) ? null : t > 5 ? 'mild' : t >= 0 ? 'kuehl' : 'frost');
const druckTrend = w => (!w || !isNum(w.pressureStartHpa) || !isNum(w.pressureEndHpa) ? null : w.pressureEndHpa - w.pressureStartHpa <= -1.5 ? 'faellt' : w.pressureEndHpa - w.pressureStartHpa >= 1.5 ? 'steigt' : 'hoch');
const WIND_GRUPPE = { N: 'NO', NO: 'NO', O: 'NO', SO: 'SO', S: 'SW', SW: 'SW', W: 'SW', NW: 'NW' };
const FARBE = { '≠': '#ff8a8a', '≈': '#ffd21e', '=': '#00FF5E' };
const ARIA = { '≠': 'deutlich anders', '≈': 'ähnlich', '=': 'gleich' };
const DEF = [
  { name: 'Wind', key: a => (!a.w ? null : ['S', 'SW', 'W'].indexOf(a.w) >= 0 ? 'Süd bis West' : 'Nord bis Ost'), werte: ['Süd bis West', 'Nord bis Ost'] },
  { name: 'Luftdruck', key: a => ({ faellt: 'fällt', steigt: 'steigt', hoch: 'hoch, stabil' })[a.d] || null, werte: ['fällt', 'steigt', 'hoch, stabil'] },
  { name: 'Nacht', key: a => ({ mild: 'über 5 °C', kuehl: '0 bis 5 °C', frost: 'Frost' })[a.n] || null, werte: ['über 5 °C', '0 bis 5 °C', 'Frost'] },
  { name: 'Regen', key: a => (a.r == null ? null : a.r ? 'mit Regen' : 'trocken'), werte: ['mit Regen', 'trocken'] }
];
function muster(B) {
  let held = '', heldZeile = '', bestQ = -1;
  const schneiderGes = B.filter(a => a.f === 0).length, max = Math.max(6, ...DEF.map(g => Math.max(...g.werte.map(w => B.filter(a => g.key(a) === w).length))));
  const gruppen = DEF.map(g => ({ name: g.name, zeilen: g.werte.map(w => {
    const alle = B.filter(a => g.key(a) === w), leer = alle.filter(a => a.f === 0).length, fang = alle.length - leer;
    const q = alle.length ? leer / alle.length : 0;
    if (alle.length >= 3 && leer >= 2 && (q > bestQ || (q === bestQ && leer > 0))) { bestQ = q; held = leer + ' von ' + alle.length + ' Ansitzen leer'; heldZeile = g.name + ': ' + w + '. ' + leer + ' deiner ' + schneiderGes + ' Schneider gab es dabei.'; }
    const voll = 100 / max;
    return { label: w, zahl: fang + ' · ' + leer, farbe: q >= 0.6 && alle.length >= 2 ? '#ff8a8a' : '#ece8dc', aria: w + ': ' + fang + ' mit Fisch, ' + leer + ' Schneider',
      fang: 'display: block; height: 14px; border-radius: 3px; background: #00FF5E; width: ' + (fang * voll).toFixed(1) + '%',
      leer: 'display: block; height: 14px; border-radius: 3px; background: #6e6a60; width: ' + (leer * voll).toFixed(1) + '%' };
  }) }));
  return { gruppen, held: held || 'Noch kein klares Muster', heldZeile: heldZeile || 'Kein Wetter hatte bisher zwei oder mehr Schneider bei mindestens drei Ansitzen.', schneiderGes };
}
function vergleich(F, S) {
  const wf = F.s.weather || {}, ws = S.s.weather || {};
  const zeilen = [];
  const t = v => (isNum(v) ? minus(zahl(v, 1)) + ' °C' : '–');
  const nachtT = w => (!isNum(w.tempMinC) ? '–' : w.tempMinC < 0 ? t(w.tempMinC) + ', Frost' : t(w.tempMinC));
  const stufe = (d, a, b) => (d == null ? '≈' : Math.abs(d) < a ? '=' : Math.abs(d) < b ? '≈' : '≠');
  zeilen.push({ p: 'Nacht', f: nachtT(wf), s: nachtT(ws), z: isNum(wf.tempMinC) && isNum(ws.tempMinC) ? stufe(wf.tempMinC - ws.tempMinC, 2, 4) : '≈' });
  zeilen.push({ p: 'Tag', f: isNum(wf.tempMaxC) ? 'bis ' + t(wf.tempMaxC) : '–', s: isNum(ws.tempMaxC) ? 'bis ' + t(ws.tempMaxC) : '–', z: isNum(wf.tempMaxC) && isNum(ws.tempMaxC) ? stufe(wf.tempMaxC - ws.tempMaxC, 2, 4) : '≈' });
  const dr = w => (isNum(w.pressureStartHpa) ? ({ faellt: 'fiel ', steigt: 'stieg ', hoch: 'stabil ' })[druckTrend(w)] + Math.round(w.pressureStartHpa) + ' → ' + Math.round(w.pressureEndHpa) : '–');
  const tf = druckTrend(wf), ts = druckTrend(ws);
  zeilen.push({ p: 'Druck', f: dr(wf), s: dr(ws), z: !tf || !ts ? '≈' : tf !== ts ? '≠' : Math.abs((wf.pressureStartHpa + wf.pressureEndHpa) / 2 - (ws.pressureStartHpa + ws.pressureEndHpa) / 2) < 8 ? '=' : '≈' });
  const wi = w => (w.windDir ? w.windDir + (isNum(w.windKmh) ? ', ' + (w.windKmh < 10 ? 'schwach' : Math.round(w.windKmh) + ' km/h') : '') : '–');
  zeilen.push({ p: 'Wind', f: wi(wf), s: wi(ws), z: !wf.windDir || !ws.windDir ? '≈' : wf.windDir === ws.windDir ? '=' : WIND_GRUPPE[wf.windDir] === WIND_GRUPPE[ws.windDir] ? '≈' : '≠' });
  zeilen.push({ p: 'Wolken', f: isNum(wf.cloudPct) ? Math.round(wf.cloudPct) + ' %' : '–', s: isNum(ws.cloudPct) ? Math.round(ws.cloudPct) + ' %' : '–', z: isNum(wf.cloudPct) && isNum(ws.cloudPct) ? stufe(wf.cloudPct - ws.cloudPct, 10, 25) : '≈' });
  const rg = w => (!isNum(w.precipMm) ? '–' : w.precipMm < 0.5 ? 'trocken' : zahl(w.precipMm) + ' mm');
  zeilen.push({ p: 'Regen', f: rg(wf), s: rg(ws), z: !isNum(wf.precipMm) || !isNum(ws.precipMm) ? '≈' : (wf.precipMm < 0.5) !== (ws.precipMm < 0.5) ? '≠' : Math.abs(wf.precipMm - ws.precipMm) < 3 ? '=' : '≈' });
  const lf = (F.s.endTs || F.s.startTs) - F.s.startTs, ls = (S.s.endTs || S.s.startTs) - S.s.startTs;
  const dt = (x, ms) => { const tage = Math.round((tag0(x.s.endTs || x.s.startTs) - tag0(x.s.startTs)) / DAY) + 1; return tage > 1 ? tage + ' Tage' : ms < HOUR ? Math.round(ms / 60000) + ' Minuten' : dauer(ms); };
  const q = Math.max(lf, ls) / Math.max(1, Math.min(lf, ls));
  zeilen.push({ p: 'Dauer', f: dt(F, lf), s: dt(S, ls), z: q < 1.5 ? '=' : q < 3 ? '≈' : '≠' });
  // Krisiu: größter Unterschied
  const anders = zeilen.filter(z => z.z === '≠' && z.p !== 'Dauer');
  let k = anders.length ? 'Der größte Unterschied: ' + anders.slice(0, 2).map(z => z.p + ' (' + z.s + ' statt ' + z.f + ')').join(', ') + '.' : 'Vom Wetter her kaum ein Unterschied – dann lag es eher an Platz, Köder oder Glück.';
  if (ls < 2 * HOUR) k += ' Aber ' + dt(S, ls) + ' sind kein echter Versuch – so kurze Ansitze zähl ich nur halb.';
  return { zeilen: zeilen.map(v => Object.assign(v, { farbe: FARBE[v.z], aria: ARIA[v.z], bg: v.z === '≠' ? 'rgba(255,30,30,0.06)' : 'transparent' })), krisiu: k };
}

class Schneider extends macheS(DCLogic) {
  renderVals() {
    const basis = super.renderVals();
    const d = this.props.daten, st = this.state || {}, modus = st.modus || 'echt';
    const L = d.liste, n = L.length;
    const F = L.filter(x => x.z.fische > 0).sort((a, b) => b.z.fische - a.z.fische)[0];
    const S = L.filter(x => x.z.fische === 0).sort((a, b) => b.s.startTs - a.s.startTs)[0];
    const v = F && S ? vergleich(F, S) : null;
    const B = L.map(x => ({ w: x.s.weather && x.s.weather.windDir, d: druckTrend(x.s.weather), n: nachtKlasse(x.s.weather && x.s.weather.tempMinC), r: x.s.weather && isNum(x.s.weather.precipMm) ? (x.s.weather.precipMm >= 0.5 ? 1 : 0) : null, f: x.z.fische }));
    const echtMuster = n >= 5 ? muster(B) : null;
    const fischText = x => x.z.fische + (x.karpfen ? ' Karpfen' : x.z.fische === 1 ? ' Fisch' : ' Fische');
    const teile = [F ? (L.filter(x => x.z.fische > 0).length === 1 ? 'einer mit ' + fischText(F) : L.filter(x => x.z.fische > 0).length + ' mit Fisch') : null,
      S ? (L.filter(x => x.z.fische === 0).length === 1 ? 'ein Schneider' : L.filter(x => x.z.fische === 0).length + ' Schneider') : null].filter(Boolean);
    const echt = {
      pille: d.seen.map(l => l.short).join(' + ') || 'Alle Gewässer',
      zuWenig: modus === 'echt' && n < 5, zuWenigTitel: 'Noch zu wenig für ein Muster',
      fortschritt: [0, 1, 2, 3, 4].map(i => (i >= n ? '#2e2e2e' : L.slice().sort((a, b) => a.s.startTs - b.s.startTs)[i].z.fische ? '#00FF5E' : '#a39f93')),
      fortschrittAria: Math.min(n, 5) + ' von 5 Ansitzen',
      zuWenigText: n ? `${n} von 5 Ansitzen${teile.length ? ': ' + teile.join(', ') : ''}. Ab 5 zeigt Krisiu Muster, ab 10 werden sie belastbar.` : 'Noch kein Ansitz gespeichert. Ab 5 zeigt Krisiu Muster, ab 10 werden sie belastbar.',
      mitVergleich: !!v, vergl: v ? v.zeilen : [], echtKrisiu: v ? v.krisiu : null,
      fKopf: F ? zeitraumKurz(F.s) : '', fZahl: F ? fischText(F) : '', sKopf: S ? zeitraumKurz(S.s) : ''
    };
    if (modus === 'bsp') return Object.assign(basis, echt, { zuWenig: false, mitVergleich: false, echtKrisiu: null, zeigMuster: true });
    return Object.assign(basis, echt, echtMuster ? { zeigMuster: true, gruppen: echtMuster.gruppen, held: echtMuster.held, heldZeile: echtMuster.heldZeile,
      tipp: echtMuster.schneiderGes ? 'Das sind Zusammenhänge aus ' + n + ' Ansitzen, keine Gewissheit. Je mehr du einträgst, desto sicherer wird es.' : 'Noch kein Schneider – weiter so!' } : { zeigMuster: false });
  }
}
dcSeite(VS, Schneider, ansitzeMitZahlen, { auch: ['schneider'] });
