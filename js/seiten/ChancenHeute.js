// Chancen heute – Tagesseite mit Sternen, Faktoren zum Aufklappen, Stunden-Balken und Wetter-Zwilling.
import V from '../vorlagen/ChancenHeute.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum } from '../core/util.js';
import { lakes, sessions } from '../core/repo.js';
import { uhrzeit, datumLang } from '../ui/app.js';
import { alleSeen, laufenderAnsitz, beendeteAnsitze, zahlen } from '../ui/daten.js';
import { tagesBewertung, faktoren, stunden, fensterText, vergleich, TAG_WORT, CHANCE_WORT } from './wetter.js';
import { sternFarben } from './Ansitz.js';
import { fischText } from './Main.js';

const MARKE = {
  '1': "display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; border-radius: 50%; background: #00FF5E; color: #000000; font: 700 17px/1 'Barlow Condensed', sans-serif",
  '-1': "display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; border-radius: 50%; background: #ff1e1e; color: #ffffff; font: 700 17px/1 'Barlow Condensed', sans-serif",
  '0': "display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; box-sizing: border-box; border-radius: 50%; border: 1px solid #6c6c6c; color: #a39f93; font: 700 17px/1 'Barlow Condensed', sans-serif"
};
const zeitraumKurz = s => {
  const a = new Date(s.startTs), b = new Date(s.endTs || s.startTs);
  return a.toDateString() === b.toDateString() ? `${a.getDate()}.${a.getMonth() + 1}.` : a.getMonth() === b.getMonth() ? `${a.getDate()}.–${b.getDate()}.${b.getMonth() + 1}.` : `${a.getDate()}.${a.getMonth() + 1}.–${b.getDate()}.${b.getMonth() + 1}.`;
};

/** Bester Wetter-Zwilling unter den beendeten Ansitzen am selben Gewässer (mit Wetter). */
export async function besterZwilling(lake, bw) {
  if (!bw.t) return null;
  const alle = (await beendeteAnsitze()).filter(s => s.lakeId === lake.id && s.weather);
  let best = null;
  for (const s of alle) {
    const v = vergleich(bw.t, bw.b, s.weather);
    if (v && (!best || v.prozent > best.v.prozent)) best = { s, v };
  }
  if (!best) return null;
  const z = await zahlen(best.s);
  return { id: best.s.id, prozent: best.v.prozent, punkte: best.v.punkte, wann: zeitraumKurz(best.s), fische: z.fische ? fischText(z) : 'Schneider', s: best.s };
}

async function laden(param) {
  const lauf = await laufenderAnsitz();
  let lake = lauf ? await lakes.get(lauf.lakeId) : null;
  if (param) lake = (await lakes.get(param)) || lake;
  if (!lake) lake = (await alleSeen()).find(l => isNum(l.lat)) || null;
  return { lauf, lake };
}

class ChancenHeute extends DCLogic {
  componentDidMount() {
    const { lake } = this.props.daten;
    if (!lake) return;
    tagesBewertung(lake).then(async bw => {
      this.setState({ bw, zw: await besterZwilling(lake, bw).catch(() => null) });
    });
  }
  renderVals() {
    const { lauf, lake } = this.props.daten, st = this.state || {}, bw = st.bw;
    const n = bw && bw.b ? bw.b.sterne : 0;
    const offen = st.offen === undefined ? -1 : st.offen;
    const F = bw ? faktoren(bw.t, bw.v, bw.b, lake.art) : [];
    const S = bw ? stunden(bw, lake) : [];
    const jetztIdx = S.findIndex(x => x.jetzt);
    const std = st.std === undefined ? (jetztIdx >= 0 ? jetztIdx : 2) : st.std;
    const h = S[std];
    return {
      zurueck: lauf ? '#/Ansitz' : '#/Main', zurueckAria: lauf ? 'Zurück zum laufenden Ansitz' : 'Zurück zum Start',
      kopf: 'Heute · ' + (lake ? lake.short : '–'),
      datum: datumLang(new Date()),
      sterne: sternFarben(n), sterneAria: n + ' von 5 Sternen', wort: n ? TAG_WORT[n] : (lake ? 'Wetter kommt …' : 'Kein Gewässer'),
      stand: !lake ? 'Leg zuerst ein Gewässer mit Lage an.' : !bw ? 'Wetter wird geholt …' : bw.t ? 'Stand ' + uhrzeit(new Date(bw.at)) + ' · Wetter vom DWD' : 'Kein Wetter – ohne Netz oder ohne Lage',
      mitWetter: !!(bw && bw.t),
      sterneText: n + (n === 1 ? ' Stern' : ' Sterne'),
      faktoren: F.map((f, i) => ({
        name: f.name, wert: f.wert, notiz: f.notiz, warum: f.warum, karte: !!f.karte,
        zeichen: f.art > 0 ? '+' : f.art < 0 ? '−' : '=', urteil: f.art > 0 ? 'hilft' : f.art < 0 ? 'bremst' : 'egal',
        marke: MARKE[String(f.art)], linie: i === 0 ? '0' : '1px solid #2e2e2e',
        offen: offen === i, pfeil: offen === i ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6',
        tipp: () => this.setState({ offen: offen === i ? -1 : i })
      })),
      fenster: bw ? fensterText(bw, lake) : { gross: '', klein: '' },
      stunden: S.map((x, i) => {
        const an = std === i, gut = x.stufe >= 3;
        return {
          an, marke: x.jetzt ? 'jetzt' : String(x.u), aria: x.u + ' Uhr, Chance ' + CHANCE_WORT[x.stufe],
          knopf: 'display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 5px; height: 74px; box-sizing: border-box; padding: 4px 0 5px; border-radius: 6px; background: ' + (an ? '#1c1c1c' : 'transparent') + '; border: 1px solid ' + (an ? '#ece8dc' : 'transparent') + '; cursor: pointer',
          balken: 'display: block; width: 18px; height: ' + (x.stufe * 13) + 'px; border-radius: 3px 3px 0 0; background: ' + (gut ? '#00FF5E' : '#6c6c6c'),
          schrift: 'font: ' + (an ? '700' : '500') + " 12px/1 'Barlow', sans-serif; color: " + (x.jetzt ? '#00FF5E' : an ? '#ece8dc' : '#a39f93'),
          tipp: () => this.setState({ std: i })
        };
      }),
      zeile1: h ? h.u + ' Uhr' + (h.jetzt ? ' · jetzt' : '') + ' · Chance ' + CHANCE_WORT[h.stufe] + (h.extra ? ' · ' + h.extra : '') : '',
      zeile2: h && h.h ? [isNum(h.h.tempC) ? Math.round(h.h.tempC) + ' °C' : null, h.h.windDeg != null ? 'Wind ' + kompass(h.h.windDeg) + ' ' + Math.round(h.h.windKmh || 0) + ' km/h' : null, isNum(h.h.pressureHpa) ? Math.round(h.h.pressureHpa) + ' hPa' : null].filter(Boolean).join(' · ') : '',
      zwilling: st.zw || null
    };
  }
}
const RICHTUNG = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const kompass = deg => RICHTUNG[Math.round(((deg % 360) + 360) % 360 / 45) % 8];

dcSeite(V, ChancenHeute, laden);
