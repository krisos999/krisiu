// Uferform und Wind: welches Ufer der Wind trifft (auflandig) und welches im Lee liegt – aus der Uferlinie der Startdatei.
export const R8 = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
export const RICHTUNG_NAME = { N: 'Nord', NO: 'Nordost', O: 'Ost', SO: 'Südost', S: 'Süd', SW: 'Südwest', W: 'West', NW: 'Nordwest' };
const UFER_NAME = { N: 'Nordufer', NO: 'Nordostufer', O: 'Ostufer', SO: 'Südostufer', S: 'Südufer', SW: 'Südwestufer', W: 'Westufer', NW: 'Nordwestufer' };

const drin = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
/** Liegt der Punkt (Kartenmeter) im Wasser? */
export function imWasser(map, x, y) {
  return map.lines.filter(l => l.art === 'ufer').some(l => drin(l.pts, x, y)) && !map.lines.filter(l => l.art === 'insel').some(l => drin(l.pts, x, y));
}
/** Ufer-Abschnitte zum Wind aus windVon: auf = auflandig (Wind drückt drauf), lee = windgeschützt. */
export function uferSeiten(map, windVon, schwelle = 0.55) {
  const deg = R8.indexOf(windVon) * 45; if (deg < 0) return { auf: [], lee: [] };
  const rad = (deg + 180) * Math.PI / 180, wx = Math.sin(rad), wy = -Math.cos(rad);
  const auf = [], lee = [];
  map.lines.filter(l => l.art === 'ufer').forEach(l => {
    let la = [], ll = [];
    const n = l.pts.length;
    const ende = (lauf, ziel) => { if (lauf.length > 2) ziel.push(lauf); return []; };
    for (let i = 0; i < n; i++) {
      const a = l.pts[i], b = l.pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      let nx = dy / len, ny = -dx / len;
      if (imWasser(map, (a[0] + b[0]) / 2 + nx * 3, (a[1] + b[1]) / 2 + ny * 3)) { nx = -nx; ny = -ny; }
      const dot = nx * wx + ny * wy;
      if (dot > schwelle) { if (!la.length) la.push(a); la.push(b); } else la = ende(la, auf);
      if (dot < -schwelle) { if (!ll.length) ll.push(a); ll.push(b); } else ll = ende(ll, lee);
    }
    ende(la, auf); ende(ll, lee);
  });
  return { auf, lee };
}
/** Name der Uferseite (Nordufer …) aus der Lage der Abschnitte zur Seemitte. */
export function seitenName(map, teile) {
  const pts = teile.flat(); if (!pts.length) return null;
  const alle = map.lines.filter(l => l.art === 'ufer').flatMap(l => l.pts);
  const mx = alle.reduce((s, p) => s + p[0], 0) / alle.length, my = alle.reduce((s, p) => s + p[1], 0) / alle.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const w = (Math.atan2(cx - mx, -(cy - my)) * 180 / Math.PI + 360) % 360;
  return UFER_NAME[R8[Math.round(w / 45) % 8]];
}
/** Abstand eines Punktes zu den Abschnitten (Kartenmeter). */
export function abstand(teile, x, y) {
  let best = Infinity;
  teile.forEach(l => { for (let i = 0; i < l.length - 1; i++) {
    const [ax, ay] = l[i], [bx, by] = l[i + 1], dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / ((dx * dx + dy * dy) || 1)));
    best = Math.min(best, Math.hypot(ax + t * dx - x, ay + t * dy - y));
  } });
  return best;
}
