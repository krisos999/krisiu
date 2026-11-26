// Wetter: holt Stundenwerte und leitet daraus die Angaben für einen Biss oder einen Ansitz ab.
//
// Quellen, in dieser Reihenfolge:
//   1. Bright Sky  – Messwerte der DWD-Stationen (nur Deutschland, ab 2010, ohne Schlüssel).
//   2. Open-Meteo  – Wettermodell, weltweit. Kostenlos für nicht-kommerzielle Nutzung,
//                    Namensnennung nötig (CC BY 4.0).
// Eine weitere Quelle braucht nur ein Objekt mit covers() und hours().

import { HOUR, DAY, isNum, compass, round } from './util.js';

export class WeatherError extends Error {
  constructor(message, causes) { super(message); this.name = 'WeatherError'; this.causes = causes || []; }
}

async function getJson(url, timeoutMs = 15000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const brightSky = {
  id: 'brightsky',
  label: 'DWD-Messwerte (Bright Sky)',
  covers: (lat, lon) => lat > 47.2 && lat < 55.1 && lon > 5.8 && lon < 15.1,
  async hours(lat, lon, fromMs, toMs) {
    const url = 'https://api.brightsky.dev/weather' +
      '?lat=' + lat.toFixed(4) + '&lon=' + lon.toFixed(4) +
      '&date=' + encodeURIComponent(new Date(fromMs).toISOString()) +
      '&last_date=' + encodeURIComponent(new Date(toMs).toISOString());
    const json = await getJson(url);
    const sources = {};
    (json.sources || []).forEach(s => { sources[s.id] = s; });
    const hours = (json.weather || []).map(r => ({
      t: Date.parse(r.timestamp),
      tempC: r.temperature, pressureHpa: r.pressure_msl,
      windKmh: r.wind_speed, gustKmh: r.wind_gust_speed, windDeg: r.wind_direction,
      cloudPct: r.cloud_cover, precipMm: r.precipitation,
      measured: !sources[r.source_id] || sources[r.source_id].observation_type !== 'forecast',
      sourceId: r.source_id
    })).filter(h => Number.isFinite(h.t)).sort((a, b) => a.t - b.t);
    const used = new Set(hours.map(h => h.sourceId));
    const stations = Object.values(sources).filter(s => used.has(s.id) && s.station_name)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 4)
      .map(s => ({ name: s.station_name, distanceKm: isNum(s.distance) ? round(s.distance / 1000, 1) : null, heightM: isNum(s.height) ? Math.round(s.height) : null }));
    return { hours, stations };
  }
};

const OPEN_METEO_FIELDS = 'temperature_2m,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,precipitation';
const openMeteo = {
  id: 'openmeteo',
  label: 'Open-Meteo (Wettermodell)',
  covers: () => true,
  async hours(lat, lon, fromMs, toMs) {
    const day = ms => new Date(ms).toISOString().slice(0, 10);
    // Die letzten Wochen liefert die Vorhersage-Adresse, Älteres das Archiv.
    const host = Date.now() - fromMs < 80 * DAY
      ? 'https://api.open-meteo.com/v1/forecast'
      : 'https://archive-api.open-meteo.com/v1/archive';
    const url = host + '?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) +
      '&hourly=' + OPEN_METEO_FIELDS + '&start_date=' + day(fromMs) + '&end_date=' + day(toMs) +
      '&timeformat=unixtime&timezone=GMT';
    const json = await getJson(url);
    const h = json.hourly || {}, now = Date.now();
    const col = name => h[name] || [];
    const hours = (h.time || []).map((sec, i) => ({
      t: sec * 1000,
      tempC: col('temperature_2m')[i], pressureHpa: col('pressure_msl')[i],
      windKmh: col('wind_speed_10m')[i], gustKmh: col('wind_gusts_10m')[i], windDeg: col('wind_direction_10m')[i],
      cloudPct: col('cloud_cover')[i], precipMm: col('precipitation')[i],
      measured: sec * 1000 <= now
    })).filter(x => x.t >= fromMs - HOUR && x.t <= toMs + HOUR && isNum(x.tempC));
    return { hours, stations: [] };
  }
};

export const PROVIDERS = [brightSky, openMeteo];

const memo = new Map();

/** Stundenwerte für Ort und Zeitraum von der ersten Quelle, die liefert. */
export async function loadHours(lat, lon, fromMs, toMs) {
  const key = [lat.toFixed(3), lon.toFixed(3), Math.floor(fromMs / HOUR), Math.ceil(toMs / HOUR)].join('|');
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < 10 * 60000) return hit.result;
  const causes = [];
  for (const provider of PROVIDERS) {
    if (!provider.covers(lat, lon)) continue;
    try {
      const data = await provider.hours(lat, lon, fromMs, toMs);
      if (!data.hours.length) throw new Error('keine Stundenwerte');
      const result = Object.assign({ provider: provider.label, providerId: provider.id }, data);
      memo.set(key, { at: Date.now(), result });
      if (memo.size > 40) memo.delete(memo.keys().next().value);
      return result;
    } catch (err) {
      causes.push(provider.label + ': ' + (err && err.name === 'AbortError' ? 'Zeitüberschreitung' : (err && err.message) || err));
    }
  }
  throw new WeatherError('Kein Wetterdienst hat geantwortet.', causes);
}

function nearest(hours, t, maxGapMs) {
  let best = null, gap = Infinity;
  for (const h of hours) {
    const g = Math.abs(h.t - t);
    if (g < gap) { gap = g; best = h; }
  }
  return gap <= maxGapMs ? best : null;
}

/**
 * Wetter zu einem Zeitpunkt (nächstgelegene volle Stunde) samt Tendenzen.
 * Felder ohne ausreichende Daten bleiben null, es wird nichts geschätzt.
 */
export function pointFeatures(hours, tMs) {
  const base = nearest(hours, tMs, 90 * 60000);
  if (!base) return null;
  const at = ms => nearest(hours, ms, 30 * 60000);
  const delta = (field, backMs) => {
    const old = at(base.t - backMs);
    return old && isNum(old[field]) && isNum(base[field]) ? round(base[field] - old[field], 1) : null;
  };
  // "Nacht davor": 20 Uhr des Vorabends bis 8 Uhr; vor 8 Uhr zählt die laufende Nacht bis zum Biss.
  const d = new Date(tMs);
  let nightEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8).getTime();
  const nightStart = nightEnd - 12 * HOUR;
  if (d.getHours() < 8) nightEnd = tMs;
  const night = hours.filter(h => h.t >= nightStart && h.t <= nightEnd && isNum(h.tempC));
  const last24 = hours.filter(h => h.t > base.t - 24 * HOUR && h.t <= base.t && isNum(h.precipMm));
  return {
    at: base.t,
    tempC: round(base.tempC, 1),
    nightMinC: night.length >= 4 ? round(Math.min(...night.map(h => h.tempC)), 1) : null,
    temp24h: delta('tempC', 24 * HOUR),
    pressureHpa: round(base.pressureHpa, 1),
    pressure3h: delta('pressureHpa', 3 * HOUR),
    pressure24h: delta('pressureHpa', 24 * HOUR),
    windDeg: isNum(base.windDeg) ? base.windDeg : null,
    windDir: compass(base.windDeg),
    windKmh: round(base.windKmh, 1),
    gustKmh: round(base.gustKmh, 1),
    cloudPct: isNum(base.cloudPct) ? Math.round(base.cloudPct) : null,
    precipMm: round(base.precipMm, 1),
    precip24hMm: last24.length >= 20 ? round(last24.reduce((sum, h) => sum + h.precipMm, 0), 1) : null,
    provisional: !base.measured
  };
}

/** Wetter über einen Zeitraum (Ansitz): Spannen, Druckverlauf, vorherrschender Wind, Regensumme. */
export function rangeFeatures(hours, fromMs, toMs) {
  const span = hours.filter(h => h.t >= fromMs - 30 * 60000 && h.t <= toMs + 30 * 60000);
  if (!span.length) return null;
  const vals = field => span.map(h => h[field]).filter(isNum);
  const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const temps = vals('tempC'), press = span.filter(h => isNum(h.pressureHpa));
  const dirs = {};
  span.forEach(h => { const c = compass(h.windDeg); if (c) dirs[c] = (dirs[c] || 0) + 1; });
  const lowest = press.reduce((m, h) => (!m || h.pressureHpa < m.pressureHpa ? h : m), null);
  return {
    from: span[0].t, to: span[span.length - 1].t,
    tempMinC: temps.length ? round(Math.min(...temps), 1) : null,
    tempMaxC: temps.length ? round(Math.max(...temps), 1) : null,
    pressureStartHpa: press.length ? round(press[0].pressureHpa, 1) : null,
    pressureEndHpa: press.length ? round(press[press.length - 1].pressureHpa, 1) : null,
    pressureMinHpa: lowest ? round(lowest.pressureHpa, 1) : null,
    pressureMinAt: lowest ? lowest.t : null,
    windDir: Object.keys(dirs).sort((a, b) => dirs[b] - dirs[a])[0] || null,
    windKmh: round(mean(vals('windKmh')), 1),
    gustKmh: vals('gustKmh').length ? round(Math.max(...vals('gustKmh')), 1) : null,
    cloudPct: vals('cloudPct').length ? Math.round(mean(vals('cloudPct'))) : null,
    precipMm: vals('precipMm').length ? round(vals('precipMm').reduce((s, v) => s + v, 0), 1) : null,
    provisional: span.some(h => !h.measured)
  };
}

const withSource = (features, data) => Object.assign(features, {
  source: data.provider, stations: data.stations, fetchedAt: new Date().toISOString()
});

/** Wetter für einen Biss: lädt 37 Stunden Vorlauf für Nachtwert und Tendenzen. */
export async function fetchPoint(lat, lon, tMs) {
  const data = await loadHours(lat, lon, tMs - 37 * HOUR, tMs + HOUR);
  const features = pointFeatures(data.hours, tMs);
  if (!features) throw new WeatherError('Für diesen Zeitpunkt liegen keine Werte vor.');
  return withSource(features, data);
}

/** Wetter für einen Ansitz. */
export async function fetchRange(lat, lon, fromMs, toMs) {
  const data = await loadHours(lat, lon, fromMs, toMs);
  const features = rangeFeatures(data.hours, fromMs, toMs);
  if (!features) throw new WeatherError('Für diesen Zeitraum liegen keine Werte vor.');
  return withSource(features, data);
}
