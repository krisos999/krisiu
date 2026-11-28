// 4a · Angaben zur Rute? (beim Fang) – 1:1 wie Entwurf Rute.
import V from '../vorlagen/Rute.js';
import mache from '../vorlagen/Rute.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { go } from '../ui/app.js';
import { laufenderAnsitz, rutenVon } from '../ui/daten.js';
import { fangOffen, fangSpeichern, ruteSetzen, rutenEntwurfVon, rutenEntwurfWeg, rutenFotosSpeichern } from './fangfluss.js';
import { auswahl } from './Fang.js';

export const KOEDER = ['Boilie', 'Pop-up', 'Wafter', 'Fake-Mais', 'Tigernuss'];
export const spotZeile = (e, r) => {
  const spot = (e && e.spot) || (r && r.spot), m = (e && e.entfernungM) || (r && r.entfernungM);
  return spot ? spot + (m ? ' · ' + m + ' m' : '') : null;
};

/** Gemeinsamer Teil von 4a (Rute) und 3d (Rute einrichten): Köder-Auswahl, Fotos, Spot. */
export const rutenFormular = Basis => class extends Basis {
  ruteDaten() { const d = this.props.daten; return { s: d.s, nr: d.nr, r: rutenVon(d.s).find(x => x.nr === d.nr) || null, e: rutenEntwurfVon(d.s, d.nr) }; }
  aktuellSpezial(g, st) {
    if (g !== 'g0' || (st.sel && st.sel.g0)) return null;
    const { r, e } = this.ruteDaten();
    if (e.sel) return e.sel;
    if (!r || !r.koeder) return [];
    const idx = r.koeder.map(k => KOEDER.indexOf(k)).filter(i => i >= 0);
    if (r.koeder.some(k => !KOEDER.includes(k))) idx.push(5);
    return idx;
  }
  wahlSpezial(g, i) {
    if (g === 'g0' && i === 5 && !this.aktuell('g0').includes(5)) {
      const t = (window.prompt('Welcher Köder?') || '').trim(); if (!t) return true;
      this.state.anderer = t;
    }
    return false;
  }
  wahl(g, i) {
    super.wahl(g, i);
    if (g === 'g0') { const { e } = this.ruteDaten(); e.sel = this.aktuell('g0').slice(); if (this.state && this.state.anderer) e.anderer = this.state.anderer; }
  }
  koederListe() {
    const st = this.state || {}, { r } = this.ruteDaten();
    const andere = st.anderer || this.ruteDaten().e.anderer || (r && (r.koeder || []).find(k => !KOEDER.includes(k)));
    return this.aktuell('g0').map(i => (i === 5 ? andere : KOEDER[i])).filter(Boolean);
  }
  formular() {
    const { s, nr, r, e } = this.ruteDaten();
    const foto = art => () => auswahl('file', art === 'screenshot' ? { accept: 'image/*' } : { accept: 'image/*', capture: 'environment' }, f => { if (f) { e.fotos[art] = f; this.zeige(art === 'montage' ? 'Montage-Foto ist dabei ✓' : art === 'spot' ? 'Foto vom Spot ist dabei ✓' : 'Screenshot ist dabei ✓'); } });
    return {
      nr,
      spotLink: '#/Spot/' + nr + '~' + this.zweck,
      deeperLink: '#/DeeperImport/' + nr + '~' + this.zweck,
      fotoSpot: foto('spot'), screenshot: foto('screenshot'), fotoMontage: foto('montage'),
      montageText: e.fotos.montage || (r && r.montageFoto) ? 'Foto der Montage ✓' : 'Foto der Montage'
    };
  }
  async setupSpeichern() {
    const { s, nr, r, e } = this.ruteDaten();
    const setup = { koeder: this.koederListe() };
    if (e.spot) Object.assign(setup, { spot: e.spot, entfernungM: e.entfernungM || null, kx: e.kx ?? null, ky: e.ky ?? null });
    if (e.fotos.montage) setup.montageFoto = true;
    const neu = await ruteSetzen(s, nr, setup);
    if (neu) await rutenFotosSpeichern(neu, nr, e.fotos);
    rutenEntwurfWeg();
    return neu;
  }
};

class Rute extends rutenFormular(mache(DCLogic)) {
  get zweck() { return 'fang'; }
  componentDidMount() { if (!this.props.daten) go('Ansitz'); else if (!fangOffen()) go('Fang'); }
  extra() {
    if (!this.props.daten) return {};
    const { r, e } = this.ruteDaten();
    const z = spotZeile(e, r);
    return Object.assign(this.formular(), {
      spotText: e.spot ? z : z ? 'Vorschlag: ' + z : 'Noch kein Spot – freiwillig',
      neinText: 'Nein, ohne Angaben',
      uebernehmen: async ev => { ev.preventDefault(); if (await this.setupSpeichern()) fangSpeichern(); },
      ohne: ev => { ev.preventDefault(); rutenEntwurfWeg(); fangSpeichern({ ohneAngaben: true }); }
    });
  }
}

dcSeite(V, Rute, async p => {
  const s = await laufenderAnsitz(); if (!s) return null;
  return { s, nr: Number(String(p || '1').split('~')[0]) || 1 };
}, { auch: ['rute'] });
