// 3d · Rute einrichten (vor dem Fang) – 1:1 wie Entwurf RuteEinrichten, gleiches Formular wie 4a.
import V from '../vorlagen/RuteEinrichten.js';
import mache from '../vorlagen/RuteEinrichten.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { lakes } from '../core/repo.js';
import { go } from '../ui/app.js';
import { laufenderAnsitz } from '../ui/daten.js';
import { eingerichtet, rutenEntwurfWeg } from './fangfluss.js';
import { rutenFormular, spotZeile } from './Rute.js';

class RuteEinrichten extends rutenFormular(mache(DCLogic)) {
  get zweck() { return this.props.daten && this.props.daten.fehlbiss ? 'fehlbiss' : 'einrichten'; }
  componentDidMount() { if (!this.props.daten) go('Ansitz'); }
  extra() {
    const d = this.props.daten; if (!d) return {};
    const { r, e } = this.ruteDaten();
    const zurueck = () => { rutenEntwurfWeg(); go(d.fehlbiss ? 'Ansitz' : 'Ruten'); };
    return Object.assign(this.formular(), {
      chip: (d.lake ? d.lake.short + ' · ' : '') + (eingerichtet(r) || d.nr <= 2 ? 'Vor dem Fang' : 'Neue Rute'),
      istACW: true, istVSA: false,
      spotText: spotZeile(e, r) || 'Noch nicht markiert',
      eingebettet: true, allein: false,
      fertig: async () => {
        if (!(await this.setupSpeichern())) return;
        if (!d.fehlbiss) sessionStorage.setItem('krisiu-toast-ruten', 'Rute ' + d.nr + ' gespeichert');
        go(d.fehlbiss ? 'Ansitz' : 'Ruten');
      },
      zurueck
    });
  }
}

dcSeite(V, RuteEinrichten, async p => {
  const s = await laufenderAnsitz(); if (!s) return null;
  const [n, zweck] = String(p || '1').split('~');
  return { s, lake: await lakes.get(s.lakeId), nr: Number(n) || 1, fehlbiss: zweck === 'fehlbiss' };
});
