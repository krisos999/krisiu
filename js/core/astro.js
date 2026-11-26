// Sonne und Mond: rechnet das Gerät selbst, ohne Netz.
// Standardformeln der Positionsastronomie; Genauigkeit rund 2 Minuten bzw. 1 % Mondbeleuchtung.

import { pad } from './util.js';

const RAD = Math.PI / 180, DAY = 86400000, J1970 = 2440588, J2000 = 2451545, OBL = RAD * 23.4397;

const toDays = ms => ms / DAY - 0.5 + J1970 - J2000;
const fromJulian = j => (j + 0.5 - J1970) * DAY;
const sunAnomaly = d => RAD * (357.5291 + 0.98560028 * d);
const eclipticLon = M => M + RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI;
const declination = (l, b) => Math.asin(Math.sin(b) * Math.cos(OBL) + Math.cos(b) * Math.sin(OBL) * Math.sin(l));
const rightAsc = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OBL) - Math.tan(b) * Math.sin(OBL), Math.cos(l));

/** Sonnenzeiten (Millisekunden) für den Kalendertag von `date` am Ort. Polartag/-nacht ergibt null. */
export function sunTimes(date, lat, lon) {
  const lw = RAD * -lon, phi = RAD * lat;
  const localNoon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTime();
  const n = Math.round(toDays(localNoon) - 0.0009 - lw / (2 * Math.PI));
  const ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = sunAnomaly(ds), L = eclipticLon(M), dec = declination(L, 0);
  const transit = a => J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const noon = transit(ds);
  const setAt = altitudeDeg => {
    const c = (Math.sin(altitudeDeg * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    return c > 1 || c < -1 ? null : transit(0.0009 + (Math.acos(c) + lw) / (2 * Math.PI) + n);
  };
  const set = setAt(-0.833), dusk = setAt(-6);
  return {
    noon: fromJulian(noon),
    sunrise: set == null ? null : fromJulian(noon - (set - noon)),
    sunset: set == null ? null : fromJulian(set),
    dawn: dusk == null ? null : fromJulian(noon - (dusk - noon)),
    dusk: dusk == null ? null : fromJulian(dusk)
  };
}

/** Mond zum Zeitpunkt: phase 0 = Neumond, 0,5 = Vollmond; illum = beleuchteter Anteil 0..1. */
export function moonAt(ms) {
  const d = toDays(ms);
  const M = sunAnomaly(d), L = eclipticLon(M), sDec = declination(L, 0), sRa = rightAsc(L, 0);
  const mm = RAD * (134.963 + 13.064993 * d);
  const l = RAD * (218.316 + 13.176396 * d) + RAD * 6.289 * Math.sin(mm);
  const b = RAD * 5.128 * Math.sin(RAD * (93.272 + 13.22935 * d));
  const dist = 385001 - 20905 * Math.cos(mm), mRa = rightAsc(l, b), mDec = declination(l, b), sunDist = 149598000;
  const phi = Math.acos(Math.sin(sDec) * Math.sin(mDec) + Math.cos(sDec) * Math.cos(mDec) * Math.cos(sRa - mRa));
  const inc = Math.atan2(sunDist * Math.sin(phi), dist - sunDist * Math.cos(phi));
  const angle = Math.atan2(Math.cos(sDec) * Math.sin(sRa - mRa),
    Math.sin(sDec) * Math.cos(mDec) - Math.cos(sDec) * Math.sin(mDec) * Math.cos(sRa - mRa));
  return { illum: (1 + Math.cos(inc)) / 2, phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI };
}

export function moonName(p) {
  if (p < 0.03 || p > 0.97) return 'Neumond';
  if (p < 0.22) return 'zunehmende Sichel';
  if (p < 0.28) return 'erstes Viertel';
  if (p < 0.47) return 'zunehmender Mond';
  if (p < 0.53) return 'Vollmond';
  if (p < 0.72) return 'abnehmender Mond';
  if (p < 0.78) return 'letztes Viertel';
  return 'abnehmende Sichel';
}

export const DAY_PHASES = ['Nacht', 'Morgendämmerung', 'Vormittag', 'Mittag', 'Nachmittag', 'Abenddämmerung'];

/**
 * Tagesphase. Dämmerung = bürgerliche Dämmerung bis eine Stunde nach Sonnenaufgang
 * bzw. ab eine Stunde vor Sonnenuntergang; Mittag = 11 bis 14 Uhr.
 */
export function dayPhase(date, t) {
  if (!t || t.dawn == null || t.sunrise == null) return null;
  const ms = date.getTime(), H = 3600000;
  if (ms < t.dawn || ms >= t.dusk) return 'Nacht';
  if (ms < t.sunrise + H) return 'Morgendämmerung';
  if (ms >= t.sunset - H) return 'Abenddämmerung';
  const hour = date.getHours() + date.getMinutes() / 60;
  return hour < 11 ? 'Vormittag' : hour < 14 ? 'Mittag' : 'Nachmittag';
}

const clock = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/** Alles, was die App zu einem Zeitpunkt ohne Netz weiß. Ohne Koordinaten gibt es nur Mond und Uhrzeit. */
export function context(date, lat, lon) {
  const moon = moonAt(date.getTime());
  const hasPlace = Number.isFinite(lat) && Number.isFinite(lon);
  const t = hasPlace ? sunTimes(date, lat, lon) : null;
  return {
    dayPhase: dayPhase(date, t),
    sunrise: t && t.sunrise != null ? clock(t.sunrise) : null,
    sunset: t && t.sunset != null ? clock(t.sunset) : null,
    moonPhase: Math.round(moon.phase * 1000) / 1000,
    moonIllum: Math.round(moon.illum * 100),
    moonName: moonName(moon.phase),
    weekday: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][date.getDay()],
    hour: date.getHours()
  };
}
