// Fang eintragen über mehrere Seiten: Fang → (Lag sie wie vorher? / Angaben zur Rute?) → speichern → Ansitz mit Krisiu-Glückwunsch.
import { sessions, entries, fish } from '../core/repo.js';
import { savePhoto } from '../core/photos.js';
import { syncWeather } from '../core/weather-sync.js';
import { go, sicher } from '../ui/app.js';
import { rutenVon, zahlen } from '../ui/daten.js';

let offen = null;   // { s, art, gewichtKg, zeit 'YYYY-MM-DDTHH:MM', foto File|null, nr, vorgefuettert true|false|null }
export const fangOffen = () => offen;
export const fangMerken = f => { offen = f; };

export const eingerichtet = r => !!(r && (r.spot || (r.koeder && r.koeder.length) || r.montage));

/** Welche Frage kommt nach „Speichern“? 'vorher' (Rute hat schon gefangen), 'eingerichtet' (vorab eingerichtet) oder 'angaben'. */
export async function naechsterSchritt(f) {
  const z = await zahlen(f.s);
  const schon = z.eintraege.some(e => e.type === 'fang' && e.rod === 'Rute ' + f.nr);
  const r = rutenVon(f.s).find(x => x.nr === f.nr);
  return schon ? 'vorher' : eingerichtet(r) ? 'eingerichtet' : 'angaben';
}

/** Setup einer Rute ändern (ab jetzt gültig); fehlende Ruten werden ergänzt. */
export async function ruteSetzen(s, nr, setup) {
  const ruten = rutenVon(s).map(r => Object.assign({}, r));
  while (ruten.length < nr) ruten.push({ nr: ruten.length + 1 });
  const alt = ruten[nr - 1];
  const neu = Object.assign({}, alt, setup, { nr, seit: new Date().toISOString() });
  ruten[nr - 1] = neu;
  const verlauf = (s.rodSetupsVerlauf || []).concat(alt && eingerichtet(alt) ? [Object.assign({ bis: neu.seit }, alt)] : []);
  return sicher(() => sessions.save(Object.assign({}, s, { rodSetups: ruten, rods: Math.max(s.rods || 0, ruten.length), rodSetupsVerlauf: verlauf })));
}

/** Speichert den offenen Fang mit dem Setup der Rute (oder ohne Angaben). */
export async function fangSpeichern({ ohneAngaben = false } = {}) {
  const f = offen; if (!f) return go('Ansitz');
  const s = await sessions.get(f.s.id);
  const r = ohneAngaben ? {} : (rutenVon(s).find(x => x.nr === f.nr) || {});
  const e = await sicher(() => entries.save({
    lakeId: s.lakeId, sessionId: s.id, type: 'fang', species: f.art, weightKg: f.gewichtKg, time: f.zeit,
    rod: 'Rute ' + f.nr, bait: (r.koeder || []).join(' + ') || null, spotName: r.spot || null, rig: r.montage || null,
    spotXY: r.kx != null ? { x: r.kx, y: r.ky } : null, entfernungM: r.entfernungM || null, vorgefuettert: f.vorgefuettert
  }));
  if (!e) return;
  // Ein offener Schnell-Biss dieser Rute (aus der Mitteilung) war genau dieser Fisch – der fällt weg.
  const schnell = (await zahlen(s)).eintraege.filter(x => x.notes === 'Schnell-Biss (offen)' && x.id !== e.id && (!x.rod || x.rod === e.rod) && e.ts - x.ts >= -10 * 60000 && e.ts - x.ts < 6 * 3600e3);
  if (schnell.length) await sicher(() => entries.remove(schnell[schnell.length - 1].id));
  if (f.foto) {
    await sicher(() => savePhoto(e.id, f.foto));
    // Erster Fisch dieser Art mit Foto bekommt gleich einen Steckbrief; sonst fragt „Meine Fänge“: Kennst du den?
    const { kandidaten } = await import('../ui/fische.js');
    if (!(await kandidaten(e)).length) {
      const fi = await sicher(() => fish.save({ lakeId: e.lakeId, species: e.species }));
      if (fi) await sicher(() => entries.save({ id: e.id, fishId: fi.id }));
    }
  }
  offen = null;
  syncWeather();
  go('Ansitz');
}

/* ---------- Entwurf einer Rute (Spot von der Karte, Fotos), bis „übernehmen“ / „speichern“ ---------- */
let rutenEntwurf = null;   // { sid, nr, spot, entfernungM, kx, ky, fotos: { spot, screenshot, montage } }
export function rutenEntwurfVon(s, nr) {
  if (!rutenEntwurf || rutenEntwurf.sid !== s.id || rutenEntwurf.nr !== nr) rutenEntwurf = { sid: s.id, nr, fotos: {} };
  return rutenEntwurf;
}
export const rutenEntwurfWeg = () => { rutenEntwurf = null; };

/** Speichert die Fotos eines Rutensetups (Spot, Screenshot, Montage) – sie hängen an „rute:<Ansitz>:<Rute>:<Art>“. */
export async function rutenFotosSpeichern(s, nr, fotos) {
  for (const [art, f] of Object.entries(fotos || {})) if (f) await sicher(() => savePhoto('rute:' + s.id + ':' + nr + ':' + art, f));
}
