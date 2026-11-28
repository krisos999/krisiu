// 4c · Lag sie wie vorher? / Liegt sie wie eingerichtet? – 1:1 wie Entwurf RuteWieVorher.
import V from '../vorlagen/RuteWieVorher.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { go } from '../ui/app.js';
import { laufenderAnsitz, rutenVon, zahlen } from '../ui/daten.js';
import { fangOffen, fangSpeichern } from './fangfluss.js';
import { spotZeile } from './Rute.js';

class RuteWieVorher extends DCLogic {
  componentDidMount() { if (!this.props.daten) go('Ansitz'); else if (!fangOffen()) go('Fang'); }
  renderVals() {
    const d = this.props.daten; if (!d) return {};
    const { nr, art, r, fische } = d, vorher = art === 'vorher';
    const letzter = fische[fische.length - 1];
    return {
      abzeichen: 'Rute ' + nr + ' · ' + (fische.length + 1) + '. Fisch',
      titel: vorher ? 'Lag sie wie vorher?' : 'Liegt sie wie eingerichtet?',
      frage: vorher ? `Rute ${nr} hat heute schon gefangen. Liegt sie wieder genauso?` : `Rute ${nr} hast du vorab eingerichtet. Liegt sie noch genauso?`,
      solag: vorher && letzter ? `So lag Rute ${nr} beim letzten Fisch · ${letzter.time.slice(11)} Uhr` : `So ist Rute ${nr} eingerichtet`,
      spot: spotZeile(null, r) || 'Kein Spot eingetragen',
      koeder: r && r.koeder && r.koeder.length ? r.koeder.join(' mit ') : 'Kein Köder eingetragen',
      montage: r && r.montageFoto ? 'Foto gespeichert' : 'Kein Foto gespeichert',
      jaText: vorher ? 'Ja, wie vorher' : 'Ja, wie eingerichtet',
      ja: ev => { ev.preventDefault(); fangSpeichern(); },
      nein: ev => { ev.preventDefault(); go('Rute', nr + '~fang'); }
    };
  }
}

dcSeite(V, RuteWieVorher, async p => {
  const s = await laufenderAnsitz(); if (!s) return null;
  const [n, art] = String(p || '1~vorher').split('~'); const nr = Number(n) || 1;
  const z = await zahlen(s);
  return { nr, art: art || 'vorher', r: rutenVon(s).find(x => x.nr === nr) || null, fische: z.eintraege.filter(e => e.type === 'fang' && e.rod === 'Rute ' + nr) };
}, { auch: ['rutewie'] });
