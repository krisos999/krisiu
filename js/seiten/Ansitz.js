// Ansitz läuft – 1:1 wie Entwurf Ansitz (mit Fehlbiss-Rutenfrage).
import V from '../vorlagen/Ansitz.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { on } from '../core/bus.js';
import { lakes, entries, settings } from '../core/repo.js';
import { syncWeather } from '../core/weather-sync.js';
import { go, sicher, uhrzeit, datumKurz, dauer } from '../ui/app.js';
import { jetzt, laufenderAnsitz, zahlen, rutenVon, wetterJetzt, krisiuHinweise, STIMMUNG } from '../ui/daten.js';
import { tagesBewertung } from './wetter.js';

export const ROT = '#ff1e1e', AUS = '#2e2e2e';
export const sternFarben = n => [0, 1, 2, 3, 4].map(i => (i < n ? ROT : AUS));
export const rutenText = r => (r && (r.spot || (r.koeder && r.koeder.length))) ? [r.spot || 'Spot offen', (r.koeder || []).join(', ') || 'Köder offen'].join(' · ') : null;
export const eingerichtet = r => !!rutenText(r);

/** Fehlbiss an einer Rute speichern (mit Spot, Köder, Montage der Rute). */
export async function fehlbissSpeichern(s, nr) {
  const r = rutenVon(s).find(x => x.nr === nr) || {};
  const e = await sicher(() => entries.save({
    lakeId: s.lakeId, sessionId: s.id, type: 'fehlbiss', time: jetzt(), rod: 'Rute ' + nr,
    bait: (r.koeder || []).join(' + ') || null, spotName: r.spot || null, rig: r.montage || null,
    spotXY: r.kx != null ? { x: r.kx, y: r.ky } : null, entfernungM: r.entfernungM || null
  }));
  if (e) syncWeather();
  return e;
}

async function laden() {
  const s = await laufenderAnsitz();
  if (!s) return null;
  const lake = await lakes.get(s.lakeId);
  return { s, lake, z: await zahlen(s) };
}

class Ansitz extends DCLogic {
  componentDidMount() {
    if (!this.props.daten) { go('Main'); return; }
    this.uhr = setInterval(() => this.forceUpdate(), 30000);
    this.aus = on('data', async () => { const d = await this.props.neuLaden(); if (d) { this.props.daten = d; this.forceUpdate(); } });
    if (this.props.daten.lake) tagesBewertung(this.props.daten.lake).then(bw => this.setState({ bw })).catch(() => {});
    this.hinweiseHolen(); this.hUhr = setInterval(() => this.hinweiseHolen(), 5 * 60000);
    const t = sessionStorage.getItem('krisiu-toast');
    if (t) { sessionStorage.removeItem('krisiu-toast'); this.zeige(t); }
  }
  componentWillUnmount() { clearInterval(this.uhr); clearInterval(this.hUhr); clearTimeout(this._t); if (this.aus) this.aus(); }
  /** Krisiu-Hinweise nach festen Regeln; „Später“ blendet 30 Minuten aus, die andere Antwort für diesen Ansitz. */
  async hinweiseHolen() {
    const { s, lake } = this.props.daten;
    const { wx } = await wetterJetzt(lake).catch(() => ({ wx: null }));
    const liste = await krisiuHinweise(s, lake, wx).catch(() => []);
    const prio = x => (/^dein Fang/.test(x.grund || '') ? 3 : /^dein Fehlbiss/.test(x.grund || '') ? 2 : 1);
    liste.sort((a, b) => prio(b) - prio(a));
    const zu = (await settings.get('hinweise-zu:' + s.id)) || {};
    const h = liste.find(x => !(zu[x.text] > Date.now()));
    this.setState({ hinweisRoh: h || null });
  }
  async hinweisWeg(dauerMs) {
    const h = (this.state || {}).hinweisRoh; if (!h) return;
    const key = 'hinweise-zu:' + this.props.daten.s.id;
    const zu = (await settings.get(key)) || {};
    zu[h.text] = Date.now() + dauerMs; await settings.set(key, zu);
    this.setState({ hinweisRoh: null });
    setTimeout(() => this.hinweiseHolen(), 50);
  }
  zeige(text, mehr) {
    this.setState(Object.assign({ schritt: '', toast: text }, mehr || {}));
    clearTimeout(this._t);
    this._t = setTimeout(() => this.setState({ toast: '' }), 2600);
  }
  async fehlbiss(nr) {
    const e = await fehlbissSpeichern(this.props.daten.s, nr);
    if (e) this.zeige('Fehlbiss an Rute ' + nr + ' um ' + e.time.slice(11) + ' gespeichert');
    else this.setState({ schritt: '' });
  }
  renderVals() {
    const d = this.props.daten;
    if (!d) return {};
    const st = this.state || {}, { s, lake, z } = d;
    const ruten = rutenVon(s);
    const n = st.bw && st.bw.b ? st.bw.b.sterne : 0;
    const schritt = st.schritt || '', nr = st.nr || 1;
    const [emo, txt] = STIMMUNG.happy;
    const anzahl = ruten.filter(eingerichtet).length;
    return {
      kEmo: emo, kAria: 'Krisiu-Assistent öffnen – Krisiu ' + txt + ', er ist am Wasser',
      dauer: dauer(Date.now() - s.startTs),
      seeName: lake ? lake.name : 'Ansitz',
      heute: datumKurz(new Date()),
      sterne: sternFarben(n),
      sterneAria: n ? n + ' von 5 Sternen' : 'Wetter wird geholt',
      chancenAria: n ? `Chancen heute: ${n} von 5 Sternen. Antippen für alle Werte des Tages und warum.` : 'Chancen heute: Wetter wird geholt',
      uhrJetzt: uhrzeit(new Date()),
      toast: !!st.toast, toastText: st.toast || '',
      frageAn: schritt === 'rute' || schritt === 'eintragen',
      schrittRute: schritt === 'rute', schrittEintragen: schritt === 'eintragen',
      nr,
      rutenWahl: [1, 2, 3, 4].map(k => {
        const r = ruten.find(x => x.nr === k), t = rutenText(r);
        return { nr: k, unter: t || 'noch nicht eingetragen', waehle: () => (t ? this.fehlbiss(k) : this.setState({ schritt: 'eintragen', nr: k })) };
      }),
      eingerichtetText: anzahl + ' eingerichtet',
      statsText: `${z.fische} ${z.fische === 1 ? 'Fisch' : 'Fische'} · ${z.bisse} ${z.bisse === 1 ? 'Biss' : 'Bisse'} · ${ruten.length} ${ruten.length === 1 ? 'Rute' : 'Ruten'}`,
      fehlbiss: () => this.setState({ schritt: 'rute' }),
      abbrechen: () => this.setState({ schritt: '' }),
      eintragen: async () => {
        const e = await fehlbissSpeichern(s, nr);
        if (e) sessionStorage.setItem('krisiu-toast', 'Rute ' + nr + ' eingetragen, Fehlbiss gespeichert');
        go('RuteEinrichten', nr + '~fehlbiss');
      },
      nurSpeichern: () => this.fehlbiss(nr),
      hinweis: st.hinweisRoh ? (() => {
        const h = st.hinweisRoh, [e, t] = STIMMUNG[h.art] || ['🙂', 'sagt'];
        const rot = ['sorge', 'genervt', 'unruhig', 'friert'].includes(h.art);
        return { stimmung: t + ' ' + e, wann: 'jetzt', text: h.text, ja: h.art === 'freut' ? 'Gemacht' : 'Okay', nein: 'Später', farbe: rot ? '#ff1e1e' : '#00FF5E' };
      })() : null,
      hinweisJa: ev => { if (ev) { ev.preventDefault(); ev.stopPropagation(); } this.hinweisWeg(1e12); },
      hinweisSpaeter: ev => { if (ev) { ev.preventDefault(); ev.stopPropagation(); } this.hinweisWeg(30 * 60000); }
    };
  }
}

dcSeite(V, Ansitz, laden, { auch: ['ansitz'] });
