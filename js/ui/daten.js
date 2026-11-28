// Daten für die Oberfläche: laufender Ansitz, Wetter jetzt, Chancen nach Faustregeln, Krisius Stimmung.

import { lakes, sessions, entries, settings, entriesOfSession } from '../core/repo.js';
import { fetchPoint, loadHours } from '../core/weather.js';
import { sunTimes } from '../core/astro.js';
import { toLocalIso, isNum, DAY, HOUR } from '../core/util.js';

export const jetzt = () => toLocalIso(new Date());

export async function alleSeen() {
  return (await lakes.list()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
export async function laufenderAnsitz() {
  const s = (await sessions.list()).filter(x => x.endTs == null).sort((a, b) => b.startTs - a.startTs);
  return s[0] || null;
}
export async function beendeteAnsitze() {
  return (await sessions.list()).filter(x => x.endTs != null).sort((a, b) => b.startTs - a.startTs);
}
export async function eintraegeVon(s) {
  return entriesOfSession(s, await entries.list()).sort((a, b) => a.ts - b.ts);
}
export async function zahlen(s) {
  const e = await eintraegeVon(s);
  const fische = e.filter(x => x.type === 'fang').length;
  const fehl = e.filter(x => x.type === 'fehlbiss').length;
  const verloren = e.filter(x => x.type === 'verloren').length;
  // Ansitze ohne Uhrzeiten (nachgetragen) tragen ihre Zahlen direkt
  return {
    eintraege: e,
    fische: Math.max(fische, s.fishCount || 0),
    bisse: Math.max(fische + fehl + verloren, s.bitesCount || 0),
    futterKg: (s.feedings || []).reduce((sum, f) => sum + (f.kg || 0), 0)
  };
}

/** Ruten eines Ansitzes; ältere Ansitze ohne Angaben bekommen leere Ruten nach der Anzahl. */
export function rutenVon(s) {
  const r = Array.isArray(s.rodSetups) ? s.rodSetups : [];
  if (r.length) return r;
  return Array.from({ length: s.rods || 2 }, (_, i) => ({ nr: i + 1 }));
}

/* ---------- Wetter jetzt (mit Zwischenspeicher für ohne Netz) ---------- */
export async function wetterJetzt(lake, { frisch = false } = {}) {
  if (!lake || !isNum(lake.lat)) return { wx: null, grund: 'ohne-ort' };
  const key = 'wx:' + lake.id;
  const alt = await settings.get(key);
  if (!frisch && alt && Date.now() - alt.at < 20 * 60000) return { wx: alt.wx, at: alt.at };
  if (navigator.onLine === false) return { wx: alt ? alt.wx : null, at: alt && alt.at, grund: 'offline' };
  try {
    const wx = await fetchPoint(lake.lat, lake.lon, Date.now());
    await settings.set(key, { at: Date.now(), wx });
    return { wx, at: Date.now() };
  } catch (err) {
    return { wx: alt ? alt.wx : null, at: alt && alt.at, grund: 'fehler' };
  }
}

/* ---------- Chancen nach Faustregeln (Beißzeiten-Methodik, noch nicht an eigenen Fängen geprüft) ---------- */
export function chancen(wx) {
  if (!wx) return null;
  let p = 3; const plus = [], minus = [];
  if (isNum(wx.pressure3h)) {
    if (wx.pressure3h <= -0.5) { p += 1; plus.push('Druck fällt'); }
    else if (wx.pressure3h >= 0.8) { p -= 1; minus.push('Druck steigt'); }
  }
  if (isNum(wx.nightMinC)) {
    if (wx.nightMinC < 0) { p -= 1; minus.push('Frostnacht'); }
    else if (wx.nightMinC >= 4) { p += 0.5; plus.push('milde Nacht'); }
  }
  if (wx.windDir) {
    if (['S', 'SW', 'W'].includes(wx.windDir)) { p += 0.5; plus.push('Wind ' + wx.windDir); }
    else if (['N', 'NO', 'O'].includes(wx.windDir) && (wx.windKmh || 0) >= 8) { p -= 0.5; minus.push('Wind ' + wx.windDir); }
  }
  if (isNum(wx.cloudPct) && wx.cloudPct >= 70) { p += 0.5; plus.push('bedeckt'); }
  if (isNum(wx.precipMm) && wx.precipMm > 0 && wx.precipMm < 3) { p += 0.5; plus.push('leichter Regen'); }
  const sterne = Math.max(1, Math.min(5, Math.round(p)));
  return { sterne, plus, minus };
}

/* ---------- Krisiu: Stimmung und Hinweise (feste Regeln) ---------- */
export const STIMMUNG = {
  happy: ['😄', 'ist happy', 'gruen'], vermisst: ['🥺', 'vermisst das Wasser', ''], unruhig: ['😬', 'wird unruhig', ''],
  genervt: ['😤', 'ist genervt', 'rot'], zufrieden: ['😌', 'ist zufrieden', 'gruen'], hallo: ['👋', 'sagt Hallo', ''],
  langweilt: ['🥱', 'langweilt sich', ''], daumen: ['🤞', 'drückt die Daumen', 'gruen'], sorge: ['😟', 'macht sich Sorgen', ''], friert: ['🥶', 'friert mit', ''], freut: ['🎉', 'freut sich mit', 'gruen']
};

/** Grundstimmung für Start und Lasche. */
export async function krisiuLage() {
  const lauf = await laufenderAnsitz();
  const fertig = await beendeteAnsitze();
  if (!(await lakes.list()).length) return { art: 'hallo', text: 'Ei gude! Ich bin Krisiu. Leg zuerst dein Gewässer an.' };
  if (lauf) return { art: 'happy', text: 'Krisiu ist happy – er ist am Wasser' };
  if (!fertig.length) return { art: 'daumen', text: 'Krisiu wartet auf deinen ersten Ansitz' };
  const letzte = fertig[0];
  const tage = Math.floor((Date.now() - letzte.endTs) / DAY);
  const zwei = fertig.slice(0, 2);
  if (zwei.length === 2) {
    const z = await Promise.all(zwei.map(zahlen));
    if (z.every(x => x.fische === 0) && tage < 7) return { art: 'genervt', text: 'Zweimal nix. Ich hab da so ’ne Idee – anderer Platz oder anderer Köder?' };
  }
  if (tage >= 30) return { art: 'unruhig', text: `Ein Monat ohne Ansitz. Ich hab schon Moos angesetzt.`, tage };
  if (tage >= 14) return { art: 'unruhig', text: `Krisiu wird unruhig · ${tage} Tage ohne Ansitz`, tage };
  if (tage >= 7) return { art: 'vermisst', text: `Krisiu vermisst das Wasser · ${tage} Tage ohne Ansitz`, tage };
  return { art: 'zufrieden', text: tage === 0 ? 'Krisiu ist zufrieden – war gut heute' : `Krisiu ist zufrieden · letzter Ansitz vor ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`, tage };
}

/** Hinweise beim laufenden Ansitz. Jeder sagt, worauf er beruht. */
export async function krisiuHinweise(s, lake, wx) {
  const out = [];
  const now = new Date();
  if (lake && isNum(lake.lat)) {
    const sun = sunTimes(now, lake.lat, lake.lon);
    if (sun && sun.sunset != null) {
      const set = new Date(sun.sunset);
      const bis = (set - now) / 60000;
      sun.set = String(set.getHours()).padStart(2, '0') + ':' + String(set.getMinutes()).padStart(2, '0');
      if (bis > 0 && bis <= 40) out.push({ art: 'daumen', text: `In ${Math.round(bis)} Minuten wird es dunkel. Ruten jetzt liegen lassen – das letzte Licht bringt oft noch einen.`, grund: `Sonnenuntergang ${sun.set} · deine Regel` });
      if (bis < 0 && bis > -90) out.push({ art: 'happy', text: 'Die erste Zeit nach Einbruch der Dunkelheit ist oft ruhig – die Karpfen müssen sich erst umstellen. Net nervös werden.', grund: 'deine Regel' });
    }
  }
  if (wx) {
    if (isNum(wx.pressure3h) && wx.pressure3h <= -0.5) out.push({ art: 'daumen', text: 'Druck fällt seit drei Stunden. Jetzt net einpacken.', grund: `Wetter jetzt · ${String(wx.pressure3h).replace('.', ',')} hPa in 3 h` });
    if (isNum(wx.pressure3h) && wx.pressure3h >= 1) out.push({ art: 'sorge', text: 'Druck steigt. Wird zäh: kleine Köder, wenig Futter.', grund: 'Wetter jetzt · Faustregel' });
    if (isNum(wx.nightMinC) && wx.nightMinC < 0) out.push({ art: 'friert', text: `Heut Nacht ${String(wx.nightMinC).replace('.', ',')} Grad. Ich frier mit – Schlafsack und Mütze dabei?`, grund: 'Wetter · Nacht davor' });
    if (isNum(wx.tempC) && wx.tempC >= 28) out.push({ art: 'sorge', text: `${Math.round(wx.tempC)} Grad. Die Karpfen haben genug Wasser – du auch? Trink mal was, gell.`, grund: 'Wetter jetzt' });
    if (isNum(wx.gustKmh) && wx.gustKmh >= 60) out.push({ art: 'sorge', text: `Böen bis ${Math.round(wx.gustKmh)} km/h. Steht dein Zelt unter Bäumen?`, grund: 'Wetter jetzt' });
  }
  if (s) {
    const z = await zahlen(s);
    const fehl = z.eintraege.filter(e => e.type === 'fehlbiss');
    if (fehl.length && Date.now() - fehl[fehl.length - 1].ts < 2 * HOUR) out.push({ art: 'daumen', text: 'Fehlbiss? Haken noch scharf? Einmal übern Daumennagel.', grund: 'dein Fehlbiss um ' + fehl[fehl.length - 1].time.slice(11) });
    const fang = z.eintraege.filter(e => e.type === 'fang');
    if (fang.length && Date.now() - fang[fang.length - 1].ts < HOUR) out.push({ art: 'freut', text: 'Glückwunsch' + (fang[fang.length - 1].species ? ' zum ' + fang[fang.length - 1].species : '') + '! Schon deinen Angelkollegen Bescheid gesagt? Schick ihnen das Foto, gell.', grund: 'dein Fang um ' + fang[fang.length - 1].time.slice(11) });
    const ohne = (Date.now() - s.startTs) / HOUR;
    if (!z.bisse && ohne >= 24) out.push({ art: 'unruhig', text: '24 Stunden ohne Biss. Wie wär’s mit einem Zig, 3 bis 5 Meter über Grund?', grund: 'dein Ansitz · Faustregel' });
    else if (!z.bisse && ohne >= 6) out.push({ art: 'unruhig', text: 'Sechs Stunden ruhig. Neu legen?', grund: 'dein Ansitz' });
  }
  return out;
}

/* ---------- Stundenwerte für Auswertung und Planung (vergangene Zeiträume bleiben auf dem Gerät) ---------- */
export async function stundenFuer(lake, fromMs, toMs, { merken = true } = {}) {
  if (!lake || !isNum(lake.lat)) return { hours: [], grund: 'ohne-ort' };
  const key = 'std:' + lake.id + ':' + Math.floor(fromMs / HOUR) + ':' + Math.ceil(toMs / HOUR);
  const alt = await settings.get(key);
  if (alt && (alt.fertig || Date.now() - alt.at < 30 * 60000)) return alt.data;
  if (navigator.onLine === false) return alt ? alt.data : { hours: [], grund: 'offline' };
  try {
    const d = await loadHours(lake.lat, lake.lon, fromMs, toMs);
    const data = { hours: d.hours.map(x => ({ t: x.t, tempC: x.tempC, pressureHpa: x.pressureHpa, windKmh: x.windKmh, gustKmh: x.gustKmh, windDeg: x.windDeg, cloudPct: x.cloudPct, precipMm: x.precipMm, measured: x.measured })), quelle: d.provider };
    const fertig = toMs < Date.now() - 6 * HOUR && data.hours.every(x => x.measured);
    if (merken) await settings.set(key, { at: Date.now(), fertig, data });
    return data;
  } catch (err) {
    return alt ? alt.data : { hours: [], grund: 'fehler', fehler: err.message };
  }
}
