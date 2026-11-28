// 3e · Gefüttert – 1:1 wie Entwurf Futter.
import V from '../vorlagen/Futter.js';
import mache from '../vorlagen/Futter.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { sessions } from '../core/repo.js';
import { go, sicher, zahl } from '../ui/app.js';
import { jetzt, laufenderAnsitz, rutenVon } from '../ui/daten.js';
import { eingerichtet } from './fangfluss.js';
import { spotZeile } from './Rute.js';
import { auswahl } from './Fang.js';

const MENGEN = [0.5, 1, 2, 5];
const ARTEN = ['Boilies', 'Partikel', 'Pellets', 'Tigernüsse', 'Method-Mix'];
const kg = n => zahl(n).replace(/^(\d+)$/, '$1,0') + ' kg';

const Basis = mache(DCLogic);
class Futter extends Basis {
  componentDidMount() { if (!this.props.daten) go('Main'); }
  wahlSpezial(g, i) {
    if (g === 'g0') { this.setState({ menge: MENGEN[i], sel: Object.assign({}, (this.state || {}).sel, { g0: [i] }) }); return true; }
    if (g === 'g1' && i === 5) { const t = (window.prompt('Welches Futter?') || '').trim(); if (!t) return true; this.state = Object.assign({}, this.state || {}, { andere: t }); }
    if (g === 'g2') { this.setState({ fuer: i }); return true; }
    return false;
  }
  extra(st) {
    const d = this.props.daten; if (!d) return {};
    const s = d.s, ruten = rutenVon(s).filter(eingerichtet), G = this.gruppen();
    const m = st.menge === undefined ? 1 : st.menge;
    const feed = s.feedings || [], bisher = feed.reduce((x, f) => x + (f.kg || 0), 0);
    const ziele = ruten.map(r => ({ text: 'Rute ' + r.nr, r })).concat([{ text: 'Ganzer Platz' }]);
    const fuer = st.fuer === undefined ? ziele.length - 1 : st.fuer;
    const z = ziele[fuer] || ziele[ziele.length - 1];
    const setze = v => { const n = Math.max(0.5, Math.min(50, v)); const i = MENGEN.indexOf(n); this.setState({ menge: n, sel: Object.assign({}, st.sel, { g0: i >= 0 ? [i] : [] }) }); };
    return {
      zeitText: st.zeit ? st.zeit + ' Uhr' : 'Jetzt · ' + jetzt().slice(11),
      zeitWaehlen: () => auswahl('time', { value: st.zeit || jetzt().slice(11) }, v => v && this.setState({ zeit: v })),
      bisher: kg(bisher), zuletzt: feed.length ? ' · zuletzt ' + String(feed[feed.length - 1].time).slice(11, 16) + ' Uhr' : '',
      mengeText: kg(m), weniger: () => setze(m - 0.5), mehr: () => setze(m + 0.5),
      fuer: ziele.map((x, i) => ({ text: x.text, p: i === fuer, s: i === fuer ? G.g2.an[0] : G.g2.aus[0], k: () => this.wahl('g2', i) })),
      fuerText: z.r ? z.text + ' liegt auf ' + (spotZeile(null, z.r) || 'einem Spot ohne Namen') : 'Futter für den ganzen Platz',
      speichern: async ev => {
        ev.preventDefault();
        const ai = this.aktuell('g1')[0];
        const art = ai === 5 ? (st.andere || 'Andere') : ARTEN[ai] || 'Boilies';
        const f = feed.concat([{ time: jetzt().slice(0, 11) + (st.zeit || jetzt().slice(11)), kg: m, type: art, rod: z.text }]);
        if (await sicher(() => sessions.save(Object.assign({}, s, { feedings: f })))) { sessionStorage.setItem('krisiu-toast', kg(m) + ' ' + art + ' gespeichert'); go('Ansitz'); }
      }
    };
  }
}

dcSeite(V, Futter, async () => { const s = await laufenderAnsitz(); return s ? { s } : null; }, { auch: ['futter'] });
