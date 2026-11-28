// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/KantenFinder.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const DD = this.props.daten || {};
const P = DD.P || [];
if (!P.length) return Object.assign({ marker: [], cluster: [], liste: [], s: {}, labA: {}, labB: {} }, DD.leer || {});
const Z = DD.Z;
const filt = s.filt || 'alle';
const selId = P.some((p) => p.id === s.sel) ? s.sel : (DD.start || P[0].id);
const sel = P.find((p) => p.id === selId);
const z = Z[filt];
const tx = 171 - z.k * z.cx, ty = 200 - z.k * z.cy;
const zeigt = (p) => filt === 'alle' || p.gruppe === filt;
const komma = (v) => v.toFixed(2).replace('.', ',');
const FARBE = { Kante: '#ff8a3d', Kuppe: '#7ee0a0', Rinne: '#6ec6ff' };
const waehle = (p) => () => this.setState({ sel: p.id, filt: (filt === 'alle' || filt === p.gruppe) ? filt : p.gruppe });
const CL = DD.CL;
const cluster = filt !== 'alle' ? [] : CL.map((c) => {
const hat = sel.gruppe === c.g;
return {
tipp: () => this.setState({ filt: c.g, sel: hat ? selId : (P.find((p) => p.gruppe === c.g) || P[0]).id }),
text: c.name + ' · ' + c.n, aria: c.name + ': ' + c.n + ' Punkte, antippen zum Hinzoomen',
stil: 'position: absolute; left: ' + (c.x - 70) + 'px; top: ' + (c.y - 22) + "px; width: 140px; height: 44px; padding: 0; border: 0; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center",
innen: "display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; box-sizing: border-box; border-radius: 999px; border: 2px solid " + (hat ? '#00FF5E' : '#ff8a3d') + "; background: rgba(0,0,0,0.82); color: #ece8dc; font: 700 15px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.6)"
};
});
const marker = P.filter((p) => filt !== 'alle' && zeigt(p)).map((p) => {
const an = p.id === selId;
const x = tx + z.k * p.x, y = ty + z.k * p.y;
return {
id: p.id, an, tipp: waehle(p),
aria: p.id + ', ' + p.name + ', ' + p.art,
stil: 'position: absolute; left: ' + (x - 22).toFixed(1) + 'px; top: ' + (y - 22).toFixed(1) + 'px; width: 44px; height: 44px; padding: 0; border: 0; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: left 0.45s ease, top 0.45s ease',
punkt: 'display: flex; align-items: center; justify-content: center; width: ' + (an ? 34 : 28) + 'px; height: ' + (an ? 34 : 28) + 'px; box-sizing: border-box; border-radius: ' + (p.art === 'Kante' ? '7px' : '50%') + '; border: 2px solid ' + (an ? '#000000' : FARBE[p.art]) + '; background: ' + (an ? '#00FF5E' : 'rgba(0,0,0,0.78)') + '; color: ' + (an ? '#000000' : '#ece8dc') + "; font: 700 13px/1 'Barlow Condensed', sans-serif; box-shadow: 0 2px 6px rgba(0,0,0,0.6)"
};
});
// Profil (Schema)
const a = sel.a, b = sel.b, lo = a - 0.3, hi = b + 0.2;
const Y = (d) => 18 + (d - lo) / (hi - lo) * 70;
let pts;
if (sel.art === 'Kante') pts = [[0, a], [118, a], [150, (a + b) / 2], [182, b], [308, b]];
else if (sel.art === 'Rinne') pts = [[0, a], [122, a], [142, b], [166, b], [186, a + 0.04], [308, a + 0.06]];
else pts = [[0, b], [104, b], [138, a], [170, a], [204, b], [308, b]];
const linie = 'M' + pts.map((q) => q[0] + ' ' + Y(q[1]).toFixed(1)).join('L');
const flaeche = linie + 'L308 104L0 104Z';
const flachX = sel.art === 'Kuppe' ? 154 : 56, tiefX = sel.art === 'Kante' ? 250 : sel.art === 'Rinne' ? 154 : 56;
const labA = { x: flachX, y: (Y(a) - 6).toFixed(1), t: komma(a) + ' m' };
const labB = { x: tiefX, y: (Y(b) + (sel.art === 'Rinne' ? 18 : -6)).toFixed(1), t: komma(b) + ' m' };
const chipStil = (an) => "height: 44px; padding: 0 12px; border-radius: 999px; cursor: pointer; white-space: nowrap; font: " + (an ? 700 : 600) + " 16px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; " + (an ? 'border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000' : 'border: 1px solid #444444; background: #141414; color: #ece8dc');
const setF = (f) => () => this.setState({ filt: f, sel: f === 'alle' || P.find((p) => p.id === selId).gruppe === f ? selId : (P.find((p) => p.gruppe === f) || P[0]).id });
const liste = P.slice().sort((x, y) => y.sprung - x.sprung).map((p) => {
const an = p.id === selId;
return {
id: p.id, name: p.name, art: p.art, an, tipp: waehle(p), farbe: FARBE[p.art],
tief: komma(p.a) + ' → ' + komma(p.b) + ' m',
sprung: p.sprung + ' cm', sprungAria: 'Sprung bis ' + p.sprung + ' Zentimeter',
balken: Math.round(p.sprung / Math.max(1, ...P.map((q) => q.sprung || 0)) * 100) + '%',
stil: 'display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 8px 14px; border: 0; border-top: 1px solid #2e2e2e; text-align: left; cursor: pointer; font: inherit; color: #ece8dc; background: ' + (an ? '#0f2a18' : 'transparent')
};
});
return {
kartenStil: 'position: absolute; left: 0; top: 0; width: 342px; height: 400px; transform-origin: 0 0; transform: translate(' + tx.toFixed(1) + 'px, ' + ty.toFixed(1) + 'px) scale(' + z.k + '); transition: transform 0.45s ease',
marker, cluster, liste, s: sel,
f_alle: setF('alle'), f_damm: setF('damm'), f_nord: setF('nord'),
an_alle: filt === 'alle', an_damm: filt === 'damm', an_nord: filt === 'nord',
st_alle: chipStil(filt === 'alle'), st_damm: chipStil(filt === 'damm'), st_nord: chipStil(filt === 'nord'),
artStil: 'padding: 5px 9px; border-radius: 999px; border: 1px solid ' + FARBE[sel.art] + '; color: ' + FARBE[sel.art] + "; font: 700 14px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase",
malText: sel.mal + '× überfahren' + (sel.mal === 1 ? ' · nachloten' : ''),
tiefe: komma(a) + ' → ' + komma(b), sprung: 'bis ' + sel.sprung + ' cm',
profilAria: 'Querschnitt ' + sel.art + ': von ' + komma(a) + ' auf ' + komma(b) + ' Meter',
profilLinie: linie, profilFlaeche: flaeche, labA, labB
};
}
}
return Component;
}
