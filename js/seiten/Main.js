// Start („Bist du am Wasser?“) – 1:1 wie Entwurf Main.
import M from '../vorlagen/Main.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { on } from '../core/bus.js';
import { lakes } from '../core/repo.js';
import { go, uhrzeit, datumLang } from '../ui/app.js';
import { laufenderAnsitz, beendeteAnsitze, zahlen, krisiuLage } from '../ui/daten.js';
import { krisiuFrage } from '../ui/planen.js';
import { ansitzStarten } from './gemeinsam.js';

/** „14 Karpfen“ – die App ist eine Karpfen-App; andere Arten nur, wenn sie eingetragen sind. */
export function fischText(z) {
  const n = z.fische, arten = new Set(z.eintraege.filter(e => e.type === 'fang').map(e => e.species));
  if (arten.size <= 1 && (!arten.size || arten.has('Karpfen'))) return n + ' Karpfen';
  return n + (n === 1 ? ' Fisch' : ' Fische');
}
function zeitraum(s) {
  const a = new Date(s.startTs), b = s.endTs ? new Date(s.endTs) : a;
  const j = b.getFullYear();
  if (a.toDateString() === b.toDateString()) return `${a.getDate()}.${a.getMonth() + 1}.${j}`;
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}.–${b.getDate()}.${b.getMonth() + 1}.${j}`;
  return `${a.getDate()}.${a.getMonth() + 1}.–${b.getDate()}.${b.getMonth() + 1}.${j}`;
}

async function laden() {
  const [lauf, lage, fertig] = await Promise.all([laufenderAnsitz(), krisiuLage(), beendeteAnsitze()]);
  let letzter = null;
  if (fertig[0]) {
    const s = fertig[0], lk = await lakes.get(s.lakeId), z = await zahlen(s);
    letzter = { id: s.id, text: (lk ? lk.short : '') + ' · ' + zeitraum(s), fische: fischText(z) };
  }
  const frage = lauf ? null : await krisiuFrage().catch(() => null);
  return { lauf, lage, letzter, frage };
}

function krisiuZeile(lage, frage) {
  if (frage) return { titel: 'Wann gehen wir angeln?', rest: frage.kurz ? ' · ' + frage.kurz : '', link: '#/Planen' };
  const t = lage.text || '';
  const m = /^(.*?)( · | – )(.*)$/.exec(t);
  if (m) return { titel: m[1], rest: ' · ' + m[3], link: '#/Assistent' };
  return { titel: t, rest: '', link: '#/Assistent' };
}

class Main extends DCLogic {
  componentDidMount() {
    this.uhr = setInterval(() => this.forceUpdate(), 20000);
    this.aus = on('data', async () => { this.props.daten = await this.props.neuLaden(); this.forceUpdate(); });
  }
  componentWillUnmount() { clearInterval(this.uhr); if (this.aus) this.aus(); }
  renderVals() {
    const d = this.props.daten, jetzt = new Date();
    return {
      datum: datumLang(jetzt) + ' · ' + uhrzeit(jetzt) + ' Uhr',
      krisiu: krisiuZeile(d.lage, d.frage),
      titel: d.lauf ? 'Du bist am Wasser.' : 'Bist du am Wasser?',
      startText: d.lauf ? 'Zum Ansitz' : 'Angeln starten',
      starten: ev => { ev.preventDefault(); if (d.lauf) go('Ansitz'); else ansitzStarten(); },
      letzter: d.letzter
    };
  }
}

dcSeite(M, Main, laden, { auch: ['start'] });
