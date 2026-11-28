// 3c · Ruten und Plätze – 1:1 wie Entwurf Ruten.
import V from '../vorlagen/Ruten.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { lakes, mapOf } from '../core/repo.js';
import { go, zahl } from '../ui/app.js';
import { laufenderAnsitz, rutenVon, zahlen } from '../ui/daten.js';
import { eingerichtet } from './fangfluss.js';
import { spotZeile } from './Rute.js';
import { tagesBewertung } from './wetter.js';

const kantenZahl = m => (m && m.kanten && Array.isArray(m.kanten.punkte) ? m.kanten.punkte.length : 0);

class Ruten extends DCLogic {
  componentDidMount() {
    const d = this.props.daten; if (!d) return go('Main');
    if (d.lake) tagesBewertung(d.lake).then(bw => this.setState({ wind: bw.t && bw.t.wind })).catch(() => {});
  }
  renderVals() {
    const d = this.props.daten; if (!d) return {};
    const ruten = rutenVon(d.s).filter(eingerichtet);
    const st = this.state || {};
    return {
      ruten: ruten.map(r => ({
        nr: r.nr, spot: spotZeile(null, r) || 'Spot noch offen',
        koeder: [(r.koeder || []).join(' mit ') || 'Köder offen', r.montageFoto ? 'mit Foto' : 'ohne Foto'].join(' · '),
        oeffnen: () => go('RuteEinrichten', String(r.nr))
      })),
      hinzufuegen: () => { const frei = rutenVon(d.s).find(r => !eingerichtet(r)); go('RuteEinrichten', String(frei ? frei.nr : rutenVon(d.s).length + 1)); },
      futterText: 'bisher ' + zahl(d.z.futterKg || 0) + ' kg',
      mitKanten: kantenZahl(d.karte) > 0,
      kantenText: kantenZahl(d.karte) + ' Punkte',
      windText: st.wind ? 'heute ' + st.wind : 'heute'
    };
  }
}

dcSeite(V, Ruten, async () => {
  const s = await laufenderAnsitz(); if (!s) return null;
  const lake = await lakes.get(s.lakeId);
  return { s, lake, z: await zahlen(s), karte: lake ? await mapOf(lake.id) : null };
}, { auch: ['ruten'] });
