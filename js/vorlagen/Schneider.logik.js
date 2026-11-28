// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/Schneider.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const D = {"vergl":[],"bsp":[{"w":"SW","d":"faellt","n":"mild","r":1,"f":6},{"w":"S","d":"faellt","n":"mild","r":1,"f":4},{"w":"W","d":"hoch","n":"mild","r":0,"f":2},{"w":"SW","d":"faellt","n":"kuehl","r":1,"f":3},{"w":"NO","d":"hoch","n":"kuehl","r":0,"f":0},{"w":"NO","d":"hoch","n":"frost","r":0,"f":0},{"w":"O","d":"steigt","n":"frost","r":0,"f":0},{"w":"S","d":"steigt","n":"mild","r":0,"f":1},{"w":"NO","d":"faellt","n":"kuehl","r":0,"f":2},{"w":"W","d":"faellt","n":"mild","r":1,"f":5},{"w":"N","d":"hoch","n":"kuehl","r":0,"f":0},{"w":"SW","d":"steigt","n":"kuehl","r":0,"f":0}]};
const modus = s.modus || 'echt';
const FARBE = { '≠': '#ff8a8a', '≈': '#ffd21e', '=': '#00FF5E' };
const ARIA = { '≠': 'deutlich anders', '≈': 'ähnlich', '=': 'gleich' };
const vergl = D.vergl.map((v) => ({ p: v.p, f: v.f, s: v.s, z: v.z, farbe: FARBE[v.z], aria: ARIA[v.z], bg: v.z === '≠' ? 'rgba(255,30,30,0.06)' : 'transparent' }));
const B = D.bsp;
const DEF = [
{ name: 'Wind', key: (a) => (['S', 'SW', 'W'].indexOf(a.w) >= 0 ? 'Süd bis West' : 'Nord bis Ost'), werte: ['Süd bis West', 'Nord bis Ost'] },
{ name: 'Luftdruck', key: (a) => ({ faellt: 'fällt', steigt: 'steigt', hoch: 'hoch, stabil' })[a.d], werte: ['fällt', 'steigt', 'hoch, stabil'] },
{ name: 'Nacht', key: (a) => ({ mild: 'über 5 °C', kuehl: '0 bis 5 °C', frost: 'Frost' })[a.n], werte: ['über 5 °C', '0 bis 5 °C', 'Frost'] },
{ name: 'Regen', key: (a) => (a.r ? 'mit Regen' : 'trocken'), werte: ['mit Regen', 'trocken'] }
];
let held = '', heldZeile = '', bestQ = -1;
const schneiderGes = B.filter((a) => a.f === 0).length;
const gruppen = DEF.map((g) => ({ name: g.name, zeilen: g.werte.map((w) => {
const alle = B.filter((a) => g.key(a) === w); const leer = alle.filter((a) => a.f === 0).length; const fang = alle.length - leer;
const q = alle.length ? leer / alle.length : 0;
if (alle.length >= 3 && leer >= 2 && (q > bestQ || (q === bestQ && leer > 0))) { bestQ = q; held = leer + ' von ' + alle.length + ' Ansitzen leer'; heldZeile = g.name + ': ' + w + '. ' + leer + ' deiner ' + schneiderGes + ' Schneider gab es dabei.'; }
const voll = 100 / 6;
return { label: w, zahl: fang + ' · ' + leer, farbe: q >= 0.6 ? '#ff8a8a' : '#ece8dc',
aria: w + ': ' + fang + ' mit Fisch, ' + leer + ' Schneider',
fang: 'display: block; height: 14px; border-radius: 3px; background: #00FF5E; width: ' + (fang * voll).toFixed(1) + '%',
leer: 'display: block; height: 14px; border-radius: 3px; background: #6e6a60; width: ' + (leer * voll).toFixed(1) + '%' };
}) }));
const nordOst = B.filter((a) => ['S', 'SW', 'W'].indexOf(a.w) < 0); const noLeer = nordOst.filter((a) => a.f === 0).length;
const chipAn = "height: 44px; padding: 0 12px; border-radius: 999px; border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000; font: 700 16px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap";
const chipAus = "height: 44px; padding: 0 12px; border-radius: 999px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 16px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap";
return {
istEcht: modus === 'echt', istBsp: modus === 'bsp',
c_echt: () => this.setState({ modus: 'echt' }), c_bsp: () => this.setState({ modus: 'bsp' }),
a_echt: modus === 'echt', a_bsp: modus === 'bsp', s_echt: modus === 'echt' ? chipAn : chipAus, s_bsp: modus === 'bsp' ? chipAn : chipAus,
vergl, gruppen, held, heldZeile,
tipp: 'Beispiel: ' + noLeer + ' von ' + schneiderGes + ' Schneidern kamen bei Nord- bis Ostwind. An solchen Tagen würd ich an den VSA ins tiefe Wasser gehen – oder daheim Boilies rollen.'
};
}
}
return Component;
}
