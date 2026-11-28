// Wetter des Tages nach der Beißzeiten-Methodik: Sterne, Faktoren mit Begründung, Stunden-Balken, bestes Fenster,
// Wetter-Zwilling (welcher frühere Ansitz hatte ähnliches Wetter). Grundlage: DWD-Stundenwerte (Bright Sky).
import { isNum, DAY, HOUR } from '../core/util.js';
import { sunTimes } from '../core/astro.js';
import { stundenFuer } from '../ui/daten.js';
import { tagesWerte, tagesSterne, beissfenster } from '../ui/analyse.js';
import { uhrzeit } from '../ui/app.js';

export const TAG_WORT = ['', 'Schlecht', 'Schwach', 'Ordentlich', 'Gut', 'Sehr gut'];
export const CHANCE_WORT = ['', 'gering', 'mittel', 'gut', 'sehr gut'];
const r0 = n => (isNum(n) ? Math.round(n) : null);
const de = (n, d = 0) => (isNum(n) ? Number(n).toLocaleString('de-DE', { maximumFractionDigits: d, useGrouping: false }) : '–');
export const heute0 = (ms = Date.now()) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Bewertung für einen Tag am Gewässer (Standard: heute). */
export async function tagesBewertung(lake, tagMs = heute0()) {
  const d = await stundenFuer(lake, tagMs - DAY - 4 * HOUR, tagMs + DAY + HOUR);
  const hours = d.hours || [];
  const t = tagesWerte(hours, tagMs), v = tagesWerte(hours, tagMs - DAY);
  const b = t ? tagesSterne(t, v, lake.art) : null;
  return { tagMs, hours, t, v, b, fenster: t && b ? beissfenster(t, b) : null, grund: d.grund, quelle: d.quelle, at: Date.now() };
}

/** Die Faktoren für „Warum x Sterne?“ – gleiche Regeln wie tagesSterne. art: +1 hilft, −1 bremst, 0 egal. */
export function faktoren(t, v, b, lakeArt) {
  if (!t) return [];
  const weiher = lakeArt === 'weiher';
  const out = [];
  if (isNum(t.nachtMin)) {
    const n = t.nachtMin;
    const [notiz, art, warum] = n < -2 ? ['Frostnacht', -1, 'Frost in der Nacht kühlt das Wasser deutlich ab. Die Karpfen werden träge und fressen kaum.']
      : n < 0 ? ['leichter Frost', -1, 'Leichter Frost kühlt das Wasser ab. Die Nacht zählt mehr als der Tag.']
        : n < 3 ? ['knapp über Frost', -1, 'Die Nacht zählt mehr als der Tag. Knapp über null kühlt ' + (weiher ? 'der flache Weiher' : 'das Wasser') + ' weiter aus, die Karpfen bleiben träge.']
          : n >= 9 ? ['sehr mild', 1, 'Eine sehr milde Nacht hält das Wasser warm. Die Fische bleiben aktiv, auch nachts.']
            : n >= 6 ? ['mild', 1, 'Eine milde Nacht: Das Wasser kühlt kaum ab, die Fische bleiben in Bewegung.']
              : ['kühl', 0, 'Eine kühle Nacht, aber kein Frost. Sie hilft nicht und bremst nicht.'];
    out.push({ name: 'Nacht', wert: de(n) + ' °C', notiz, art, warum });
  }
  if (isNum(t.tagMax)) {
    const dt = v && isNum(v.tagMax) ? t.tagMax - v.tagMax : null;
    const notiz = dt == null ? 'höchstens' : Math.abs(dt) < 1 ? 'wie gestern' : de(Math.abs(dt)) + ' Grad ' + (dt > 0 ? 'wärmer' : 'kälter') + ' als gestern';
    const art = dt == null ? 0 : dt >= 2 ? 1 : dt <= -3 ? -1 : 0;
    const warum = art > 0 ? 'Wärmer als gestern. Jede Erwärmung macht die Fische munterer, am meisten über Mittag.'
      : art < 0 ? 'Deutlich kälter als gestern. Abkühlung macht die Fische vorsichtig.' : 'Etwa wie gestern – das ändert wenig.';
    out.push({ name: 'Tag', wert: de(t.tagMax) + ' °C', notiz, art, warum });
  }
  if (isNum(t.druckVon) && isNum(t.druckBis)) {
    const dp = t.druckBis - t.druckVon;
    const wert = dp <= -1.5 ? 'fällt' : dp >= 1.5 ? 'steigt' : 'stabil';
    const art = dp <= -1.5 ? 1 : dp >= 1.5 ? -1 : 0;
    const warum = dp <= -4 ? 'Der Druck fällt deutlich – eine Front kommt. Vor der Front fressen Karpfen oft am besten.'
      : art > 0 ? 'Fallender Druck kündigt die nächste Front an. Vor der Front fressen Karpfen oft besser.'
        : dp >= 4 ? 'Der Druck steigt stark, oft nach einer Kaltfront. Dann sind die Fische meist zäh.'
          : art < 0 ? 'Steigender Druck nach einer Front bremst die Fische eher.' : 'Der Druck bleibt etwa gleich – kein Schub in die eine oder andere Richtung.';
    out.push({ name: 'Druck', wert, notiz: r0(t.druckVon) + ' → ' + r0(t.druckBis) + ' hPa', art, warum });
  }
  if (t.wind) {
    const kmh = t.windKmh || 0, schwach = kmh < 6;
    const warm = ['S', 'SW', 'W'].includes(t.wind), kalt = ['N', 'NO', 'O'].includes(t.wind);
    const art = schwach ? 0 : warm ? 1 : kalt ? -1 : 0;
    const notiz = de(kmh) + ' km/h' + (schwach ? ', kaum Wind' : warm ? ', gute Richtung' : kalt ? ', kalte Richtung' : '');
    const warum = schwach ? 'Kaum Wind – die Richtung spielt heute kaum eine Rolle.'
      : warm ? 'Wind aus ' + t.wind + ' bringt milde Luft und gilt als gute Windrichtung. Am Windufer sammelt sich Futter.'
        : kalt ? 'Wind aus ' + t.wind + ' bringt kalte Luft und gilt als schlechte Windrichtung. Süd- oder Westwind wäre besser.'
          : 'Wind aus ' + t.wind + ' – weder gut noch schlecht.';
    out.push({ name: 'Wind', wert: t.wind, notiz, art, warum, karte: true });
  }
  if (isNum(t.wolken)) {
    const w = t.wolken, hoch = isNum(t.druckMittel) && t.druckMittel >= 1022;
    const art = w >= 70 ? 1 : w <= 25 && hoch ? -1 : 0;
    const notiz = w >= 80 ? 'bedeckt' : w >= 40 ? 'wolkig' : 'klar';
    const warum = art > 0 ? 'Bedeckter Himmel: Die Fische sind weniger scheu und fressen länger, nicht nur mittags.'
      : art < 0 ? 'Klar bei Hochdruck: hell und stabil – die Fische sind vorsichtig, am ehesten mittags.' : 'Teils bewölkt – das ändert wenig.';
    out.push({ name: 'Wolken', wert: de(w) + ' %', notiz, art, warum });
  }
  if (isNum(t.regen)) {
    const mm = t.regen;
    const art = mm >= 0.5 && mm <= 8 ? 1 : mm > 20 ? -1 : 0;
    const notiz = mm < 0.5 ? 'trocken' : mm <= 8 ? 'leichter Regen' : mm <= 20 ? 'viel Regen' : 'sehr viel Regen';
    const warum = art > 0 ? 'Leichter Regen bringt Sauerstoff und trübt das Wasser – das hilft.'
      : art < 0 ? 'Sehr viel Regen kühlt und trübt stark – eher hinderlich.' : mm < 0.5 ? 'Kein Regen. Leichter, milder Regen hätte noch geholfen.' : 'Kräftiger Regen – weder gut noch schlecht.';
    out.push({ name: 'Regen', wert: de(mm, mm < 10 ? 1 : 0) + ' mm', notiz, art, warum });
  }
  if (b && b.umschwung) out.push({ name: 'Umschwung', wert: 'mild', notiz: 'nach kalt-klar', art: 1, warum: 'Nach kalten, klaren Tagen wird es mild und trüb – das ist die Top-Beißphase.' });
  return out;
}

/** Stunden-Balken 8–22 Uhr (alle 2 Stunden) mit Chance 1–4 nach dem Beißfenster. */
export function stunden(bw, lake) {
  const { t, b, hours, fenster, tagMs } = bw;
  const sonne = isNum(lake.lat) ? sunTimes(new Date(tagMs + 12 * HOUR), lake.lat, lake.lon) : {};
  const sunset = sonne.sunset ? new Date(sonne.sunset) : null;
  const jetztH = new Date().getHours(), heute = heute0() === tagMs;
  const front = b && b.druckAenderung != null && b.druckAenderung <= -4;
  const ganztags = fenster && /ganztags/.test(fenster.zeit);
  const bonus = b ? (b.sterne >= 4 ? 1 : b.sterne <= 2 ? -1 : 0) : 0;
  return [8, 10, 12, 14, 16, 18, 20, 22].map(u => {
    let stufe = front ? [1, 1, 2, 2, 3, 3, 4, 4][(u - 8) / 2] : ganztags ? (u >= 10 ? 3 : 2) : (u >= 11 && u <= 15 ? 3 : u === 10 ? 2 : 1);
    if (!front && !ganztags && sunset && Math.abs(u - (sunset.getHours() + sunset.getMinutes() / 60)) <= 1) stufe = Math.max(stufe, 2);
    stufe = Math.max(1, Math.min(4, stufe + bonus));
    const h = hours.find(x => x.t === tagMs + u * HOUR) || hours.reduce((m, x) => (!m || Math.abs(x.t - (tagMs + u * HOUR)) < Math.abs(m.t - (tagMs + u * HOUR)) ? x : m), null);
    const jetzt = heute && jetztH >= u && jetztH < u + 2;
    const daemm = sunset && sunset.getHours() >= u && sunset.getHours() < u + 2 ? 'Dämmerung ab ' + uhrzeit(sunset) : null;
    return { u, stufe, jetzt, extra: daemm, h };
  });
}

/** Bestes Fenster als zwei Teile (groß, klein). */
export function fensterText(bw, lake) {
  const f = bw.fenster;
  if (!f) return { gross: '–', klein: 'Noch kein Wetter' };
  const sonne = isNum(lake.lat) ? sunTimes(new Date(bw.tagMs + 12 * HOUR), lake.lat, lake.lon) : {};
  const ab = sonne.sunset ? uhrzeit(new Date(sonne.sunset)) : null;
  if (/je später/.test(f.zeit)) return { gross: 'Je später, desto besser', klein: 'bis die Front durch ist' };
  if (/ganztags/.test(f.zeit)) return { gross: 'Ganztags', klein: 'bis in die Nacht' };
  return { gross: '11 bis 15 Uhr', klein: ab ? 'und Dämmerung ab ' + ab : 'und die Dämmerung' };
}

/* ---------- Wetter-Zwilling: welcher frühere Ansitz hatte ähnliches Wetter? ---------- */
const NACHBAR = { N: ['NW', 'NO'], NO: ['N', 'O'], O: ['NO', 'SO'], SO: ['O', 'S'], S: ['SO', 'SW'], SW: ['S', 'W'], W: ['SW', 'NW'], NW: ['W', 'N'] };
export const ZWILLING_GEWICHT = { Nacht: 0.30, Luftdruck: 0.25, Wind: 0.15, Wolken: 0.10, Regen: 0.10, Umschwung: 0.10 };
/** Vergleicht die Tageswerte t (heute) mit dem Wetter eines Ansitzes (rangeFeatures). Liefert Punkte je Merkmal 0..1 und Prozent. */
export function vergleich(t, b, w) {
  if (!t || !w) return null;
  const p = {};
  p.Nacht = isNum(t.nachtMin) && isNum(w.tempMinC) ? Math.max(0, 1 - Math.abs(t.nachtMin - w.tempMinC) / 8) : null;
  const dpH = isNum(t.druckVon) && isNum(t.druckBis) ? t.druckBis - t.druckVon : null;
  const dpA = isNum(w.pressureStartHpa) && isNum(w.pressureEndHpa) ? w.pressureEndHpa - w.pressureStartHpa : null;
  p.Luftdruck = dpH != null && dpA != null ? Math.max(0, 1 - Math.abs(dpH - dpA) / 10) : null;
  p.Wind = t.wind && w.windDir ? (t.wind === w.windDir ? 1 : (NACHBAR[t.wind] || []).includes(w.windDir) ? 0.5 : ((t.windKmh || 0) < 8 && (w.windKmh || 0) < 8 ? 0.6 : 0)) : null;
  p.Wolken = isNum(t.wolken) && isNum(w.cloudPct) ? 1 - Math.abs(t.wolken - w.cloudPct) / 100 : null;
  p.Regen = isNum(t.regen) && isNum(w.precipMm) ? ((t.regen >= 0.5) === (w.precipMm >= 0.5) ? 1 : 0.2) : null;
  p.Umschwung = b ? (b.umschwung ? 0.5 : 0.5) : null;
  let s = 0, g = 0;
  for (const [k, gw] of Object.entries(ZWILLING_GEWICHT)) if (p[k] != null) { s += p[k] * gw; g += gw; }
  return g ? { punkte: p, prozent: Math.round((s / g) * 100) } : null;
}
