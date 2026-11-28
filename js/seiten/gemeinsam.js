// Gemeinsame Abläufe der Entwurfs-Seiten.
import { sessions } from '../core/repo.js';
import { getPosition, nearestLake } from '../core/geo.js';
import { go, toast, sicher } from '../ui/app.js';
import { jetzt, alleSeen, beendeteAnsitze } from '../ui/daten.js';

/** „Angeln starten“: Gewässer über den Standort erkennen und den Ansitz sofort beginnen. */
export async function ansitzStarten() {
  const seen = await alleSeen();
  if (!seen.length) return go('gewaesser', 'neu');
  let lake = seen.length === 1 ? seen[0] : null;
  if (!lake) {
    toast('Standort wird gesucht …', { ms: 6000 });
    try {
      const n = nearestLake(await getPosition({ timeoutMs: 7000 }), seen);
      if (n && n.distanceM < 3000) lake = n.lake;
    } catch (e) { /* ohne Standort: wählen lassen */ }
  }
  if (!lake) return go('gewaesser');
  const vorher = (await beendeteAnsitze()).find(s => s.lakeId === lake.id);
  const setups = vorher && Array.isArray(vorher.rodSetups) && vorher.rodSetups.length
    ? vorher.rodSetups.map((r, i) => Object.assign({}, r, { nr: i + 1 }))
    : [{ nr: 1 }, { nr: 2 }];
  const s = await sicher(() => sessions.save({ lakeId: lake.id, start: jetzt(), rods: setups.length, rodSetups: setups, feedings: [], erkannt: !!seen.length }));
  if (s) { toast('Petri Heil! Ansitz am ' + lake.short + ' läuft.'); import('../core/mitteilungen.js').then(M => M.ansitzMelden(s, lake)).catch(() => {}); go('Ansitz'); }
}
