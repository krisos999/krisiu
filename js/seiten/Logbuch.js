// 7 · Logbuch – 1:1 wie Entwurf Logbuch.
import V from '../vorlagen/Logbuch.js';
import mache from '../vorlagen/Logbuch.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum } from '../core/util.js';
import { dauer } from '../ui/app.js';
import { alleSeen, laufenderAnsitz, beendeteAnsitze, zahlen, rutenVon } from '../ui/daten.js';
import { fischText } from './Main.js';

const TAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const p2 = n => String(n).padStart(2, '0');
const hm = d => p2(d.getHours()) + ':' + p2(d.getMinutes());
export function ansitzTitel(s) {
  const a = new Date(s.startTs), b = new Date(s.endTs || Date.now());
  if (a.toDateString() === b.toDateString()) return `${TAGE[a.getDay()]} ${a.getDate()}.${a.getMonth() + 1}.` + (s.timed ? ` · ${hm(a)}–${s.endTs ? hm(b) : 'jetzt'}` : '');
  return (a.getMonth() === b.getMonth() ? `${a.getDate()}.–${b.getDate()}.${b.getMonth() + 1}.` : `${a.getDate()}.${a.getMonth() + 1}.–${b.getDate()}.${b.getMonth() + 1}.`) + b.getFullYear();
}
export function wetterKurz(w) {
  if (!w) return null;
  const t = [];
  if (isNum(w.tempMaxC)) t.push(w.tempMaxC < 3 ? 'kalt' : w.tempMaxC < 8 ? 'kühl' : w.tempMaxC < 16 ? 'mild' : 'warm');
  if (isNum(w.pressureStartHpa) && isNum(w.pressureEndHpa)) { const d = w.pressureEndHpa - w.pressureStartHpa; t.push('Druck ' + (d <= -1.5 ? 'fallend' : d >= 1.5 ? 'steigend' : 'stabil')); }
  if (isNum(w.precipMm) && w.precipMm >= 0.5) t.push('Regen');
  return t.join(', ') || null;
}

class Logbuch extends mache(DCLogic) {
  wahlSpezial(g, i) { if (g === 'g0') { this.setState({ see: i }); return true; } return false; }
  extra(st) {
    const d = this.props.daten, G = this.gruppen();
    const wahl = st.see === undefined ? (d.start ? d.seen.findIndex(l => l.id === d.start) + 1 : 0) : st.see;
    const lake = wahl ? d.seen[wahl - 1] : null;
    const liste = d.liste.filter(x => !lake || x.s.lakeId === lake.id);
    const zuletzt = d.liste.find(x => x.s.endTs);
    return {
      anzahl: liste.length + (liste.length === 1 ? ' Ansitz' : ' Ansitze'),
      seen: [{ text: 'Alle' }].concat(d.seen.map(l => ({ text: l.short }))).map((c, i) => ({ text: c.text, p: i === wahl, s: i === wahl ? G.g0.an[0] : G.g0.aus[0], k: () => this.wahl('g0', i) })),
      zeigListe: liste.length > 0, leer: !liste.length,
      leerText: lake ? 'Am ' + lake.short + ' hast du noch keinen Ansitz gespeichert.' : 'Noch kein Ansitz gespeichert. Starte einen oder trag einen nach.',
      ansitze: liste.map(x => {
        const s = x.s, l = d.seen.find(k => k.id === s.lakeId), laeuft = s.endTs == null;
        const neu = laeuft ? 'Läuft' : zuletzt && zuletzt.s.id === s.id && Date.now() - s.endTs < 36 * 3600e3 ? 'Neu' : null;
        return {
          link: laeuft ? '#/Ansitz' : '#/Auswertung/' + s.id, titel: ansitzTitel(s), neu, rand: neu ? '#00FF5E' : '#2e2e2e',
          info: [l ? l.short : null, dauer((s.endTs || Date.now()) - s.startTs), rutenVon(s).length + ' Ruten', wetterKurz(s.weather)].filter(Boolean).join(' · '),
          fische: fischText(x.z)
        };
      }),
      rekordText: d.rekord ? d.rekord + ' Karpfen an einem Ansitz' : 'noch keiner',
      jahr: String(new Date().getFullYear()),
      schneiderText: d.schneider + (d.schneider === 1 ? ' Schneider' : ' Schneider')
    };
  }
}

dcSeite(V, Logbuch, async param => {
  const seen = await alleSeen(), lauf = await laufenderAnsitz(), fertig = await beendeteAnsitze();
  const liste = await Promise.all([lauf, ...fertig].filter(Boolean).map(async s => ({ s, z: await zahlen(s) })));
  const fertigZ = liste.filter(x => x.s.endTs);
  return { seen, liste, start: param || null, rekord: fertigZ.reduce((m, x) => Math.max(m, x.z.fische), 0), schneider: fertigZ.filter(x => !x.z.fische).length };
}, { auch: ['logbuch'] });
