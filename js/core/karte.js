// Rechnen auf der Karte: Kartenkoordinaten sind Meter ab der linken oberen Bildecke
// (x nach Osten, y nach Süden). Mit `geo` lässt sich GPS auf die Karte umrechnen.

/** GPS → Karte (Meter). null, wenn die Karte keine Lage kennt. */
export function geoZuKarte(map, lat, lon) {
  if (!map || !map.geo) return null;
  return { x: (lon - map.geo.lon0) / map.geo.dlon, y: (map.geo.lat0 - lat) / map.geo.dlat };
}

/** Karte (Meter) → GPS. */
export function karteZuGeo(map, x, y) {
  if (!map || !map.geo) return null;
  return { lat: map.geo.lat0 - y * map.geo.dlat, lon: map.geo.lon0 + x * map.geo.dlon };
}

export const abstand = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);

/** Wurfweite wie am Wasser: auf 5 m gerundet, mindestens 5 m. */
export const wurfweite = (a, b) => {
  const d = abstand(a, b);
  return d == null ? null : Math.max(5, Math.round(d / 5) * 5);
};

/** Liegt der Punkt auf der Karte (mit etwas Rand)? */
export const aufKarte = (map, p, rand = 0) => !!p && p.x >= -rand && p.y >= -rand && p.x <= map.w + rand && p.y <= map.h + rand;
