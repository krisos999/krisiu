// Standort: nur auf Wunsch, bleibt auf dem Gerät.

import { distanceM, isNum } from './util.js';

/** Fragt den Standort einmal ab. Wirft einen Fehler mit deutschem Text, wenn es nicht klappt. */
export function getPosition({ timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Dieses Gerät gibt keinen Standort heraus.')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracyM: Math.round(pos.coords.accuracy), at: pos.timestamp }),
      err => reject(new Error(err.code === 1 ? 'Der Standort-Zugriff wurde nicht erlaubt.'
        : err.code === 3 ? 'Der Standort kam nicht rechtzeitig.' : 'Der Standort ist gerade nicht verfügbar.')),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

/** Das nächstgelegene Gewässer mit Koordinaten, samt Entfernung in Metern. */
export function nearestLake(pos, lakes) {
  let best = null;
  lakes.forEach(lake => {
    if (!isNum(lake.lat) || !isNum(lake.lon)) return;
    const d = distanceM(pos.lat, pos.lon, lake.lat, lake.lon);
    if (!best || d < best.distanceM) best = { lake, distanceM: Math.round(d) };
  });
  return best;
}
