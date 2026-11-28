// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/Nachtragen.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const see = s.see || 'ACW';
const beginn = s.beginn || '2026-11-21T15:00';
const ende = s.ende || '2026-11-22T11:00';
const fische = s.fische || 0;
const bisse = s.bisse || 0;
const wie = s.wie === undefined ? true : s.wie;
const AN = "height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000; font: 700 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer";
const AUS = "height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer";
const std = (Date.parse(ende) - Date.parse(beginn)) / 3600000;
let dauerText = 'Dauer: ' + String(Math.round(std * 2) / 2).replace('.', ',') + ' Std.';
let dauerFarbe = '#a39f93';
if (!(std > 0)) { dauerText = 'Das Ende liegt vor dem Beginn.'; dauerFarbe = '#ff4a4a'; }
const RUTEN = { ACW: 'Rute 1 West · Boilie, Rute 2 Ost · Pop-up', VSA: 'Noch keine Ruten am VSA eingetragen' };
return {
istACW: see === 'ACW', istVSA: see === 'VSA',
stilACW: see === 'ACW' ? AN : AUS, stilVSA: see === 'VSA' ? AN : AUS,
seeACW: () => this.setState({ see: 'ACW' }),
seeVSA: () => this.setState({ see: 'VSA' }),
beginn: beginn, ende: ende,
beginnNeu: (e) => this.setState({ beginn: e.target.value }),
endeNeu: (e) => this.setState({ ende: e.target.value }),
dauerText: dauerText, dauerFarbe: dauerFarbe,
fische: fische, bisse: bisse,
fischMinus: () => this.setState({ fische: Math.max(0, fische - 1) }),
fischPlus: () => this.setState({ fische: fische + 1 }),
bissMinus: () => this.setState({ bisse: Math.max(0, bisse - 1) }),
bissPlus: () => this.setState({ bisse: bisse + 1 }),
wieZuletzt: wie,
rutenText: wie ? RUTEN[see] : 'Ruten danach einzeln eintragen',
umschalten: () => this.setState({ wie: !wie }),
schalter: 'position: relative; width: 50px; height: 30px; flex: none; box-sizing: border-box; border-radius: 999px; ' + (wie ? 'background: #00FF5E' : 'background: #2e2e2e; border: 1px solid #444444'),
knopf: wie ? 'position: absolute; right: 3px; top: 3px; width: 24px; height: 24px; border-radius: 50%; background: #000000' : 'position: absolute; left: 3px; top: 3px; width: 22px; height: 22px; border-radius: 50%; background: #a39f93'
};
}
}
return Component;
}
