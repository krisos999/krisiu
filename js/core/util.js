// Kleine Helfer ohne Abhängigkeiten: Zeit, Zahlen, Kennungen, Himmelsrichtung, Entfernung.

export const HOUR = 3600000;
export const DAY = 86400000;

export const pad = n => String(n).padStart(2, '0');

/** Ortszeit als "YYYY-MM-DDTHH:mm" (so speichert die App jeden Zeitpunkt). */
export const toLocalIso = d =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const hasTime = s => typeof s === 'string' && s.length > 10;

/** Liest "YYYY-MM-DD" oder "YYYY-MM-DDTHH:mm" als Ortszeit. Ungültig ergibt null. */
export function parseLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s || '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const isNum = v => typeof v === 'number' && Number.isFinite(v);

/** Liest Eingaben wie "12,4" oder "12.4". Leer ergibt null, Unlesbares NaN. */
export function num(v) {
  if (isNum(v)) return v;
  const s = String(v == null ? '' : v).trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export const round = (n, digits = 1) => (isNum(n) ? Math.round(n * 10 ** digits) / 10 ** digits : null);

export const fmt = (n, digits = 1) =>
  Number(n).toLocaleString('de-DE', { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: digits });

/** Eindeutige, zeitlich sortierbare Kennung, z. B. "e_mhx3k2a17q9zt". */
export function newId(prefix) {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const rnd = Array.from(bytes, b => (b % 36).toString(36)).join('');
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}

export const COMPASS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
export const compass = deg => (isNum(deg) ? COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8] : null);

/** Entfernung zweier Punkte in Metern. */
export function distanceM(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

export const clone = o => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
