// Fang eintragen – 1:1 wie Entwurf Fang.
import V from '../vorlagen/Fang.js';
import mache from '../vorlagen/Fang.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { go, toast } from '../ui/app.js';
import { jetzt, laufenderAnsitz, rutenVon } from '../ui/daten.js';
import { fangMerken, naechsterSchritt, eingerichtet } from './fangfluss.js';

const ARTEN = ['Schuppi', 'Spiegler', 'Graser', 'Schleie', 'Andere'];
const AN = "display: flex; align-items: center; justify-content: center; height: 48px; box-sizing: border-box; border-radius: 10px; border: 1px solid #00FF5E; color: #000000; font: 700 20px/1 'Barlow Condensed', sans-serif; background-color: #00FF5E";
const AUS = "display: flex; align-items: center; justify-content: center; box-sizing: border-box; height: 48px; border-radius: 10px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 20px/1 'Barlow Condensed', sans-serif";

/** Unsichtbares Eingabefeld kurz öffnen (Uhrzeit-Auswahl, Kamera). */
export function auswahl(typ, attrs, fertig) {
  const i = document.createElement('input'); i.type = typ;
  Object.entries(attrs || {}).forEach(([k, v]) => i.setAttribute(k, v));
  i.style.cssText = 'position:fixed;left:50%;top:40%;width:1px;height:1px;opacity:0';
  document.body.append(i);
  i.addEventListener('change', () => { fertig(typ === 'file' ? (i.files[0] || null) : i.value); setTimeout(() => i.remove(), 100); });
  i.addEventListener('blur', () => setTimeout(() => i.remove(), 30000));
  try { i.showPicker(); } catch (e) { i.focus(); i.click(); }
}
export const ruteKurz = r => [r.spot, (r.koeder || []).join(' und ')].filter(Boolean);

const Basis = mache(DCLogic);
class Fang extends Basis {
  componentDidMount() { if (!this.props.daten) go('Main'); }
  extra(st) {
    const d = this.props.daten; if (!d) return {};
    const s = d.s, ruten = rutenVon(s);
    const nr = st.nr || (ruten.find(eingerichtet) || ruten[0] || { nr: 1 }).nr;
    const r = ruten.find(x => x.nr === nr);
    const zeit = st.zeit || null;
    const teile = r ? ruteKurz(r) : [];
    return {
      zeitText: zeit ? zeit + ' Uhr' : 'Jetzt · ' + jetzt().slice(11),
      zeitWaehlen: () => auswahl('time', { value: zeit || jetzt().slice(11) }, v => v && this.setState({ zeit: v })),
      gewicht: st.gewicht || '',
      gewichtAendern: ev => { this.state.gewicht = ev.target.value; },
      fotoText: st.foto ? 'Foto ist dabei ✓' : 'Foto aufnehmen',
      fotoWaehlen: () => auswahl('file', { accept: 'image/*', capture: 'environment' }, f => this.setState({ foto: f })),
      ruten: ruten.map(x => ({ nr: x.nr, an: x.nr === nr, stil: x.nr === nr ? AN : AUS, waehle: ev => { ev.preventDefault(); this.setState({ nr: x.nr }); } })),
      neueRute: ev => { ev.preventDefault(); this.weiter(ruten.length + 1, 'angaben'); },
      vorschlag: teile.length ? `Vorschlag aus deinen Ruten: Rute ${nr} liegt auf ${teile[0]}${teile[1] ? ' mit ' + teile[1] : ''}.` : `Rute ${nr} ist noch nicht eingerichtet – die Angaben fragt die App gleich, freiwillig.`,
      speichern: async ev => { ev.preventDefault(); this.weiter(nr); }
    };
  }
  async weiter(nr, schritt) {
    const st = this.state || {}, s = this.props.daten.s;
    let art = ARTEN[this.aktuell('g0')[0]];
    if (art === 'Andere') { art = (window.prompt('Welcher Fisch?') || '').trim(); if (!art) return; }
    const g = String(st.gewicht || '').replace(',', '.').trim();
    if (g && !(Number(g) > 0 && Number(g) < 150)) return toast('Das Gewicht wirkt nicht plausibel.', { fehler: true });
    const vf = this.aktuell('g1');
    const f = { s, art, gewichtKg: g ? Number(g) : null, zeit: jetzt().slice(0, 11) + (st.zeit || jetzt().slice(11)), foto: st.foto || null, nr, vorgefuettert: vf.length ? vf[0] === 0 : null };
    fangMerken(f);
    const w = schritt || await naechsterSchritt(f);
    if (w === 'angaben') go('Rute', nr + '~fang'); else go('RuteWieVorher', nr + '~' + w);
  }
}

dcSeite(V, Fang, async () => { const s = await laufenderAnsitz(); return s ? { s } : null; }, { auch: ['fang'] });
