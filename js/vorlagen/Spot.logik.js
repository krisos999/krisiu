// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/Spot.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const platzModus = s.modus === 'platz';
const P = { x: s.px === undefined ? 173.8 : s.px, y: s.py === undefined ? 209.5 : s.py };
const K = { x: s.kx === undefined ? 174.6 : s.kx, y: s.ky === undefined ? 125.8 : s.ky };
const dx = K.x - P.x, dy = K.y - P.y;
const len = Math.sqrt(dx * dx + dy * dy);
const ang = Math.atan2(dy, dx) * 180 / Math.PI;
const meter = Math.max(5, Math.round(len / 0.7620 / 5) * 5);
const an = "display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; box-sizing: border-box; border-radius: 12px; font: 600 17px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; cursor: pointer; border: 1px solid #00FF5E; background: #00FF5E; color: #000000";
const aus = "display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; box-sizing: border-box; border-radius: 12px; font: 600 17px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; cursor: pointer; border: 1px solid #444444; background: #141414; color: #ece8dc";
const pAn = "flex: 1; display: flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 13px; font: 700 12.5px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.8px; cursor: pointer; background: #00FF5E; color: #000000";
const pAus = "flex: 1; display: flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 13px; font: 600 12.5px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.8px; cursor: pointer; background: transparent; color: #ece8dc";
const gruen = platzModus || !!s.platz;
const r = platzModus ? 8.5 : 7;
return {
spotModus: !platzModus,
platzModus: platzModus,
tabSpot: platzModus ? aus : an,
tabPlatz: platzModus ? an : aus,
zeigeSpot: () => this.setState({ modus: 'spot' }),
zeigePlatz: () => this.setState({ modus: 'platz' }),
speicherePlatz: () => this.setState({ modus: 'spot', platz: true }),
luftbild: s.kontur !== true,
tabLuft: s.kontur ? pAus : pAn,
tabKontur: s.kontur ? pAn : pAus,
zeigeLuft: (e) => { e.stopPropagation(); this.setState({ kontur: false }); },
zeigeKontur: (e) => { e.stopPropagation(); this.setState({ kontur: true }); },
tippen: (e) => {
const b = e.currentTarget.getBoundingClientRect();
const f = b.width / 342;
const x = Math.max(4, Math.min(336, (e.clientX - b.left) / f - 1));
const y = Math.max(4, Math.min(394, (e.clientY - b.top) / f - 1));
if (platzModus) this.setState({ px: x, py: y }); else this.setState({ kx: x, ky: y });
},
linie: 'position: absolute; left: ' + P.x + 'px; top: ' + (P.y - 1) + 'px; width: ' + len + 'px; height: 0; border-top: 2px dashed #00FF5E; transform-origin: 0 1px; transform: rotate(' + ang + 'deg); pointer-events: none; opacity: ' + (platzModus ? 0.35 : 1),
pin: 'position: absolute; left: ' + (K.x - 15) + 'px; top: ' + (K.y - 37) + 'px; width: 30px; height: 38px; pointer-events: none; opacity: ' + (platzModus ? 0.35 : 1),
ring: platzModus ? 'position: absolute; left: ' + (P.x - 19) + 'px; top: ' + (P.y - 19) + 'px; width: 38px; height: 38px; box-sizing: border-box; border-radius: 50%; background: rgba(0, 255, 94, 0.2); border: 1.5px solid rgba(0, 255, 94, 0.7); pointer-events: none' : 'display: none',
punkt: 'position: absolute; left: ' + (P.x - r) + 'px; top: ' + (P.y - r) + 'px; width: ' + (2 * r) + 'px; height: ' + (2 * r) + 'px; box-sizing: border-box; border-radius: 50%; background: ' + (gruen ? '#00FF5E' : '#ece8dc') + '; border: 2px solid #000000; pointer-events: none',
schild: 'position: absolute; top: ' + (P.y - 8) + 'px; ' + 'right: ' + (340 - (P.x - 13)) + 'px' + '; font: 600 12px/16px Barlow, sans-serif; white-space: nowrap; color: ' + (gruen ? '#00FF5E' : '#ece8dc') + '; text-shadow: 0 0 3px #000000, 0 0 3px #000000, 0 0 2px #000000; pointer-events: none',
schildText: gruen ? 'Angelplatz' : 'Du',
entfernung: meter + ' m'
};
}
}
return Component;
}
