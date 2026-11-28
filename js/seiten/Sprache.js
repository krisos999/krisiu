// 3h · Sprechen – 1:1 wie Entwurf Sprache. Spracherkennung des Handys (Chrome), sonst Tastatur-Diktat.
import V from '../vorlagen/Sprache.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { lakes, sessions, entries } from '../core/repo.js';
import { syncWeather } from '../core/weather-sync.js';
import { go, sicher, datumKurz, dauer, zahl } from '../ui/app.js';
import { jetzt, laufenderAnsitz, zahlen, rutenVon } from '../ui/daten.js';
import { verstehe } from '../ui/ansitz.js';
import { tagesBewertung } from './wetter.js';
import { sternFarben, fehlbissSpeichern } from './Ansitz.js';
import { eingerichtet, fangMerken, fangSpeichern } from './fangfluss.js';

const TYP = { fang: 'Fang', fehlbiss: 'Fehlbiss', futter: 'Gefüttert', beobachtung: 'Beobachtung' };
const Erkenner = window.SpeechRecognition || window.webkitSpeechRecognition;

class Sprache extends DCLogic {
  componentDidMount() {
    const d = this.props.daten; if (!d) return go('Main');
    if (d.lake) tagesBewertung(d.lake).then(bw => this.setState({ bw })).catch(() => {});
    this.hoeren();
  }
  componentWillUnmount() { if (this.rec) try { this.rec.abort(); } catch (e) { /* egal */ } }
  hoeren() {
    if (!Erkenner) {
      const t = window.prompt('Sag oder tipp, was passiert ist (Mikrofon der Tastatur):', '');
      this.setState({ text: t || '', hoert: false, ohne: true });
      return;
    }
    if (this.rec) try { this.rec.abort(); } catch (e) { /* egal */ }
    const r = new Erkenner(); this.rec = r;
    r.lang = 'de-DE'; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = ev => { const t = Array.from(ev.results).map(x => x[0].transcript).join(' '); this.setState({ text: t }); };
    r.onerror = ev => this.setState({ hoert: false, fehler: ev.error === 'not-allowed' ? 'Mikrofon nicht erlaubt' : 'Nicht verstanden' });
    r.onend = () => this.setState({ hoert: false });
    this.setState({ text: '', hoert: true, fehler: null });
    try { r.start(); } catch (e) { this.setState({ hoert: false }); }
  }
  async speichern() {
    const d = this.props.daten, st = this.state || {}, v = verstehe(st.text || '');
    if (!(st.text || '').trim()) return;
    const s = d.s, nr = v.rute || (rutenVon(s).find(eingerichtet) || { nr: 1 }).nr;
    if (v.typ === 'fehlbiss') { await fehlbissSpeichern(s, nr); go('Ansitz'); return; }
    if (v.typ === 'futter') {
      const f = (s.feedings || []).concat([{ time: jetzt(), kg: v.kg || 1, type: /partikel/i.test(st.text) ? 'Partikel' : /pellet/i.test(st.text) ? 'Pellets' : /tiger/i.test(st.text) ? 'Tigernüsse' : 'Boilies', rod: v.rute ? 'Rute ' + v.rute : 'Ganzer Platz' }]);
      if (await sicher(() => sessions.save(Object.assign({}, s, { feedings: f })))) go('Ansitz');
      return;
    }
    if (v.typ === 'beobachtung') {
      if (await sicher(() => entries.save({ lakeId: s.lakeId, sessionId: s.id, type: 'beobachtung', time: jetzt(), kind: v.was || 'Sonstiges', notes: st.text }))) { syncWeather(); go('Ansitz'); }
      return;
    }
    fangMerken({ s, art: v.art || 'Karpfen', gewichtKg: v.kg || null, zeit: jetzt(), foto: null, nr, vorgefuettert: null });
    fangSpeichern();
  }
  renderVals() {
    const d = this.props.daten; if (!d) return {};
    const st = this.state || {}, v = verstehe(st.text || ''), n = st.bw && st.bw.b ? st.bw.b.sterne : 0;
    const chips = st.text ? [TYP[v.typ] + ' · ' + jetzt().slice(11), v.rute ? 'Rute ' + v.rute : null, v.art || null, v.kg ? zahl(v.kg).replace(/^(\d+)$/, '$1,0') + ' kg' : null, v.was || null].filter(Boolean) : [];
    const ruten = rutenVon(d.s);
    return {
      status: st.hoert ? 'Krisiu hört zu …' : st.fehler || (st.text ? 'Krisiu hat zugehört' : 'Tipp aufs Mikro'),
      hinweis: st.hoert ? 'Sag einfach, was passiert ist.' : st.ohne ? 'Mikrofon der Tastatur benutzt' : 'Mikro antippen zum Sprechen',
      text: st.text ? '„' + st.text + '“' : '…',
      verstanden: !!st.text, chips,
      speichern: ev => { ev.preventDefault(); this.speichern(); },
      nochmal: ev => { if (ev && ev.preventDefault) ev.preventDefault(); this.hoeren(); },
      dauer: dauer(Date.now() - d.s.startTs), seeName: d.lake ? d.lake.name : 'Ansitz', heute: datumKurz(new Date()),
      sterne: sternFarben(n), sterneAria: n + ' von 5 Sternen',
      eingerichtetText: ruten.filter(eingerichtet).length + ' eingerichtet',
      statsText: `${d.z.fische} ${d.z.fische === 1 ? 'Fisch' : 'Fische'} · ${d.z.bisse} ${d.z.bisse === 1 ? 'Biss' : 'Bisse'} · ${ruten.length} Ruten`
    };
  }
}

dcSeite(V, Sprache, async () => { const s = await laufenderAnsitz(); if (!s) return null; return { s, lake: await lakes.get(s.lakeId), z: await zahlen(s) }; }, { auch: ['sprechen'] });
