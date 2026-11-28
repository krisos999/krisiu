// 7b · Ansitz nachtragen – 1:1 wie Entwurf Nachtragen (Wetter holt die App selbst).
import V from '../vorlagen/Nachtragen.js';
import mache from '../vorlagen/Nachtragen.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { sessions } from '../core/repo.js';
import { syncWeather } from '../core/weather-sync.js';
import { toLocalIso } from '../core/util.js';
import { go, sicher, toast } from '../ui/app.js';
import { alleSeen, beendeteAnsitze, rutenVon } from '../ui/daten.js';
import { eingerichtet } from './fangfluss.js';

const AN = "height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000; font: 700 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer";
const AUS = "height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer";

class Nachtragen extends mache(DCLogic) {
  componentDidMount() { if (!this.props.daten.seen.length) go('gewaesser', 'neu'); }
  renderVals() {
    const d = this.props.daten; if (!d.seen.length) return {};
    const st = this.state || {};
    const i = st.i || 0, lake = d.seen[i] || d.seen[0];
    if (!st.beginn) { const g = new Date(); g.setDate(g.getDate() - 1); g.setHours(15, 0, 0, 0); this.state = Object.assign({}, st, { beginn: toLocalIso(g).slice(0, 16), ende: toLocalIso(new Date(g.getTime() + 20 * 3600e3)).slice(0, 16) }); }
    const v = super.renderVals();
    const letzter = d.fertig.find(s => s.lakeId === lake.id);
    const ruten = letzter ? rutenVon(letzter).filter(eingerichtet) : [];
    const wie = (this.state.wie === undefined ? true : this.state.wie) && ruten.length > 0;
    return Object.assign(v, {
      seen: d.seen.map((l, k) => ({ text: l.short, p: k === i, s: k === i ? AN : AUS, k: () => this.setState({ i: k }) })),
      wieZuletzt: wie,
      rutenText: wie ? ruten.map(r => 'Rute ' + r.nr + (r.spot ? ' ' + r.spot : '') + ((r.koeder || []).length ? ' · ' + r.koeder.join(', ') : '')).join(', ') : ruten.length ? 'Ruten danach einzeln eintragen' : 'Noch keine Ruten am ' + lake.short + ' eingetragen',
      notizNeu: ev => { this.state.notiz = ev.target.value; },
      speichern: async ev => {
        ev.preventDefault();
        const s2 = this.state;
        const neu = await sicher(() => sessions.save({
          lakeId: lake.id, start: s2.beginn, end: s2.ende, fishCount: s2.fische || 0, bitesCount: (s2.fische || 0) + (s2.bisse || 0), notes: s2.notiz || null,
          rods: wie ? ruten.length : null, rodSetups: wie ? ruten.map((r, k) => Object.assign({}, r, { nr: k + 1 })) : [], nachgetragen: true
        }));
        if (neu) { syncWeather(); toast('Ansitz nachgetragen – das Wetter holt Krisiu.'); go('Logbuch'); }
      }
    });
  }
}

dcSeite(V, Nachtragen, async () => ({ seen: await alleSeen(), fertig: await beendeteAnsitze() }), { auch: ['nachtragen'] });
