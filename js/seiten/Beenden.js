// 3f · Ansitz beenden und 3g · Ende nachtragen – 1:1 wie Entwurf Beenden / BeendenZeit.
import VB from '../vorlagen/Beenden.js';
import VZ from '../vorlagen/BeendenZeit.js';
import macheZ from '../vorlagen/BeendenZeit.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { lakes, sessions, entries } from '../core/repo.js';
import { syncWeather } from '../core/weather-sync.js';
import { go, sicher, toast, dauer as dauerText } from '../ui/app.js';
import { jetzt, laufenderAnsitz, zahlen } from '../ui/daten.js';
import { toLocalIso } from '../core/util.js';
import { auswahl } from './Fang.js';

const TAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const tagKurz = d => `${TAGE[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
const hhmm = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
const ENDE_KEY = 'krisiu-ende';
/** Gewähltes Ende (ms) aus „Ende nachtragen“, sonst jetzt. */
const endeMs = s => { const v = Number(sessionStorage.getItem(ENDE_KEY + ':' + s.id)); return v > s.startTs ? v : Date.now(); };

class Beenden extends DCLogic {
  componentDidMount() { if (!this.props.daten) go('Main'); this.uhr = setInterval(() => this.forceUpdate(), 30000); }
  componentWillUnmount() { clearInterval(this.uhr); }
  renderVals() {
    const d = this.props.daten; if (!d) return {};
    const { s, lake, z } = d, ende = endeMs(s), gewaehlt = !!sessionStorage.getItem(ENDE_KEY + ':' + s.id);
    return {
      krisiu: z.fische ? `🎉 Krisiu freut sich mit – ${z.fische} ${z.fische === 1 ? 'Fisch' : 'Fische'}, das war ’ne Session!` : '😌 Krisiu ist zufrieden – auch ohne Fisch war’s gut, draußen zu sein.',
      see: (lake ? lake.name : 'Ansitz') + ' · Karpfen',
      beginnZeit: hhmm(new Date(s.startTs)) + ' Uhr', beginnTag: tagKurz(new Date(s.startTs)),
      endeZeit: hhmm(new Date(ende)) + ' Uhr', endeTag: gewaehlt ? tagKurz(new Date(ende)) : 'Vergessen? Antippen',
      dauer: dauerText(ende - s.startTs), zahlen: z.fische + ' · ' + z.bisse,
      speichern: async ev => {
        ev.preventDefault();
        const neu = await sicher(() => sessions.save(Object.assign({}, s, { end: toLocalIso(new Date(ende)) })));
        if (!neu) return;
        sessionStorage.removeItem(ENDE_KEY + ':' + s.id);
        syncWeather();
        toast('Ansitz gespeichert. Petri Dank!');
        go('Logbuch');
      },
      verwerfen: async ev => {
        ev.preventDefault();
        if (!window.confirm('Ansitz nicht speichern? Er wird mit allen Fängen und Bissen gelöscht.')) return;
        for (const e of z.eintraege) await entries.remove(e.id);
        await sessions.remove(s.id);
        sessionStorage.removeItem(ENDE_KEY + ':' + s.id);
        go('Main');
      }
    };
  }
}
const ladeB = async () => { const s = await laufenderAnsitz(); if (!s) return null; return { s, lake: await lakes.get(s.lakeId), z: await zahlen(s) }; };
dcSeite(VB, Beenden, ladeB, { auch: ['beenden'] });

const AKTIV = "height: 34px; padding: 0; border-radius: 9px; background: transparent; border: 1px solid transparent; color: #ece8dc; font-weight: 600; font-family: 'Barlow Condensed', sans-serif; font-size: 19px; line-height: 1; cursor: pointer";
const AUS = "height: 34px; padding: 0; border-radius: 9px; background: transparent; border: 1px solid transparent; color: #5a5a5a; font-weight: 600; font-family: 'Barlow Condensed', sans-serif; font-size: 19px; line-height: 1; cursor: default";
const AN = "height: 34px; padding: 0; border-radius: 9px; background-color: #00FF5E; border: 1px solid #00FF5E; color: #000000; font-weight: 700; font-family: 'Barlow Condensed', sans-serif; font-size: 19px; line-height: 1; cursor: pointer";
const tag0 = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

class BeendenZeit extends macheZ(DCLogic) {
  componentDidMount() { if (!this.props.daten) go('Main'); }
  extra(st) {
    const d = this.props.daten; if (!d) return {};
    const s = d.s, start = new Date(s.startTs), ende = new Date(endeMs(s));
    const tag = st.tag === undefined ? tag0(ende.getTime()) : st.tag;
    const min = st.zeit === undefined ? ende.getHours() * 60 + ende.getMinutes() : st.zeit;
    const ref = new Date(tag), j = ref.getFullYear(), m = ref.getMonth();
    const erster = new Date(j, m, 1), tageImMonat = new Date(j, m + 1, 0).getDate();
    const lead = (erster.getDay() + 6) % 7;
    const zellen = [];
    for (let i = 0; i < lead; i++) zellen.push({ leer: true });
    for (let n = 1; n <= tageImMonat; n++) {
      const t = new Date(j, m, n).getTime(), aus = t < tag0(s.startTs) || t > tag0(Date.now()), an = t === tag;
      zellen.push({ tag: true, n, aus, p: an, s: an ? AN : aus ? AUS : AKTIV, k: () => !aus && this.setState({ tag: t }) });
    }
    while (zellen.length % 7) zellen.push({ leer: true });
    const f = n => String(n).padStart(2, '0');
    return {
      monat: MONATE[m] + ' ' + j, beginn: 'Beginn: ' + tagKurz(start) + ' · ' + hhmm(start), zellen,
      zeitText: f(Math.floor(min / 60)) + ':' + f(min % 60),
      frueher: () => this.setState({ zeit: Math.max(0, min % 30 ? min - (min % 30) : min - 30) }),
      spaeter: () => this.setState({ zeit: Math.min(1410, min + (30 - (min % 30))) }),
      zeitWaehlen: () => auswahl('time', { value: f(Math.floor(min / 60)) + ':' + f(min % 60) }, v => { if (v) { const [h, mm] = v.split(':').map(Number); this.setState({ zeit: h * 60 + mm }); } }),
      uebernehmen: ev => {
        const ms = tag + min * 60000;
        if (ms <= s.startTs) { ev.preventDefault(); return this.zeige('Das Ende liegt vor dem Beginn.'); }
        if (ms > Date.now() + 60000) { ev.preventDefault(); return this.zeige('Das Ende liegt in der Zukunft.'); }
        sessionStorage.setItem(ENDE_KEY + ':' + s.id, String(ms));
      }
    };
  }
}
dcSeite(VZ, BeendenZeit, async () => { const s = await laufenderAnsitz(); return s ? { s } : null; });
