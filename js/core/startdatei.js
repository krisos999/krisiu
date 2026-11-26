// Private Startdatei: bringt Gewässer, Karten und Spots aufs Gerät.
// Sie liegt nie im öffentlichen Programm, sondern kommt als Datei vom Angler selbst.
// Abgleich über das Kürzel (z. B. VSA): Vorhandenes wird ergänzt, nichts doppelt angelegt.

import { lakes, spots, maps, mapOf, spotsOf } from './repo.js';
import { emit } from './bus.js';

export const START_FORMAT = 'krisiu-start';
export const START_VERSION = 1;
export const istStartdatei = d => !!d && d.format === START_FORMAT;

export async function importStart(d) {
  if (!istStartdatei(d)) throw new Error('Das ist keine Krisiu-Startdatei.');
  if (!(d.version <= START_VERSION)) throw new Error('Die Startdatei ist neuer als die App. Bitte zuerst die App aktualisieren.');
  if (!Array.isArray(d.lakes) || !d.lakes.length) throw new Error('In der Startdatei steht kein Gewässer.');
  const bestand = await lakes.list();
  const ergebnis = [];
  for (const L of d.lakes) {
    const kurz = String(L.short || '').trim().toUpperCase();
    const name = String(L.name || '').trim().toLowerCase();
    let lake = bestand.find(l => kurz && l.short === kurz) || bestand.find(l => name && l.name.toLowerCase() === name) || null;
    const neu = !lake;
    let lageNeu = false;
    try {
      if (lake) {
        // Name und Kürzel des Anglers bleiben; die Lage aus der Startdatei ist genauer (aus dem Luftbild).
        lageNeu = L.lat != null && (Math.abs((lake.lat || 0) - L.lat) > 0.001 || Math.abs((lake.lon || 0) - L.lon) > 0.001);
        lake = await lakes.save({ id: lake.id, lat: L.lat != null ? L.lat : lake.lat, lon: L.lon != null ? L.lon : lake.lon, note: lake.note || L.note || null });
      } else {
        lake = await lakes.save({ name: L.name, short: L.short, lat: L.lat, lon: L.lon, note: L.note || null });
        bestand.push(lake);
      }
      let karte = false;
      if (L.map) {
        const alt = await mapOf(lake.id);
        await maps.save(Object.assign({}, L.map, { id: alt ? alt.id : undefined, lakeId: lake.id, platz: (alt && alt.platz) || L.map.platz || null }));
        karte = true;
      }
      const vorhanden = await spotsOf(lake.id);
      let spotsNeu = 0, spotsAlt = 0;
      for (const S of L.spots || []) {
        const sName = String(S.name || '').trim();
        if (!sName) continue;
        const alt = vorhanden.find(x => x.name.toLowerCase() === sName.toLowerCase());
        await spots.save(Object.assign(alt ? { id: alt.id } : {}, {
          lakeId: lake.id, name: sName, x: S.x, y: S.y, kind: S.kind, depthText: S.depthText,
          depthM: S.depthM, ground: S.ground, note: S.note
        }));
        if (alt) spotsAlt++; else spotsNeu++;
      }
      ergebnis.push({ short: lake.short, name: lake.name, neu, lageNeu, karte, spotsNeu, spotsAlt });
    } catch (err) {
      throw new Error((L.short || L.name || 'Gewässer') + ': ' + err.message);
    }
  }
  emit('data', { store: '*' });
  return ergebnis;
}

/** Kurzer Text für die Meldung nach dem Einlesen. */
export const startText = r => r.map(x => x.short + (x.neu ? ' neu' : ' ergänzt') + (x.karte ? ', Karte' : '') +
  (x.spotsNeu + x.spotsAlt ? ', ' + (x.spotsNeu + x.spotsAlt) + ' Spots' : '') + (x.lageNeu ? ', Lage korrigiert' : '')).join(' · ');
