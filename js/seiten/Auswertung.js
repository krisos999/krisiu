// 5 · Auswertung eines Ansitzes – 1:1 wie Entwurf Auswertung.
import V from '../vorlagen/Auswertung.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { HOUR } from '../core/util.js';
import { go } from '../ui/app.js';
import { stundenFuer } from '../ui/daten.js';
import { faktoren, muster } from '../ui/analyse.js';
import { ladeAnsitz } from '../ui/auswertung.js';
import { verlaufSvg, fenster } from './verlauf.js';

const p2 = n => String(n).padStart(2, '0');
const tagUhr = ms => { const d = new Date(ms); return `${d.getDate()}.${d.getMonth() + 1}. ${d.getHours()}:${p2(d.getMinutes())}`; };
export function zeitraumKurz(s) {
  const a = new Date(s.startTs), b = new Date(s.endTs || Date.now());
  if (a.toDateString() === b.toDateString()) return `${a.getDate()}.${a.getMonth() + 1}.`;
  return a.getMonth() === b.getMonth() ? `${a.getDate()}.–${b.getDate()}.${b.getMonth() + 1}.` : `${a.getDate()}.${a.getMonth() + 1}.–${b.getDate()}.${b.getMonth() + 1}.`;
}

class Auswertung extends DCLogic {
  componentDidMount() {
    const a = this.props.daten; if (!a) return go('Logbuch');
    if (a.lake) { const f = fenster(a.von, a.bis); stundenFuer(a.lake, f.a - HOUR, f.b + HOUR).then(d => this.setState({ hours: d.hours || [], grund: d.grund })); }
  }
  zeichne(el) {
    const a = this.props.daten, st = this.state || {};
    if (!el || !st.hours || el.__fertig) return;
    el.__fertig = true;
    el.innerHTML = st.hours.length ? verlaufSvg({ hours: st.hours, von: a.von, bis: a.bis, bisse: a.bisse, lake: a.lake })
      : `<p style="margin: 0; padding: 40px 0; text-align: center; font-size: 14px; color: #a39f93">${a.lake && a.lake.lat == null ? 'Das Gewässer hat keine Koordinaten – kein Wetterverlauf.' : 'Der Wetterverlauf kommt, sobald Netz da ist.'}</p>`;
  }
  renderVals() {
    const a = this.props.daten; if (!a) return {};
    const { s, lake, z, bisse } = a;
    const f = faktoren(bisse), m = muster(bisse, f);
    const ohneZeit = Math.max(0, z.fische - a.fische.length);
    const zeile = bisse.length
      ? (m.klar && m.merkmale ? m.merkmale[0].k + ' von ' + bisse.length + ' Bissen' : bisse.length + (bisse.length === 1 ? ' Biss' : ' Bisse')) +
        (bisse.length > 1 ? ' zwischen ' + tagUhr(bisse[0].ts) + ' und ' + tagUhr(bisse[bisse.length - 1].ts) + ' Uhr' : ' um ' + tagUhr(bisse[0].ts) + ' Uhr')
      : s.timed ? 'In diesem Ansitz ist kein Biss mit Uhrzeit eingetragen.' : 'Nachgetragen ohne Uhrzeiten – deshalb kein Muster nach Tageszeit oder Wetter.';
    return {
      id: s.id, bissParam: s.lakeId + '~' + s.id,
      kopf: 'Ansitz · ' + zeitraumKurz(s),
      hinweis: ohneZeit ? `${ohneZeit} ${ohneZeit === 1 ? 'Fisch hat' : 'Fische haben'} noch keine Uhrzeit. Trag die Bisszeiten nach – dann rechnet die Auswertung mit allen.` : null,
      titel: m.titel, zeile,
      mitFaktoren: f.length > 0,
      faktoren: f.map(x => ({ label: x.label, wert: x.wert, anteil: x.detail || (x.k + ' von ' + x.n), farbe: x.n >= 3 && x.k / x.n >= 0.6 ? '#00FF5E' : '#ece8dc' })),
      verlaufRef: el => this.zeichne(el)
    };
  }
}

dcSeite(V, Auswertung, id => ladeAnsitz(id), { auch: ['auswertung'] });
