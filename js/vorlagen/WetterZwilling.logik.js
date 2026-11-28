// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/WetterZwilling.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const offen = s.offen === undefined ? -1 : s.offen;
const P = [
{ name: 'Nacht', heute: '1 °C', damals: '4–10 °C', z: '≠', pct: 20, gw: 30, warum: 'Die Nacht zählt am meisten. Damals war sie mild, heute geht es knapp an den Frost. Im flachen Weiher macht das viel aus – die Fische fressen träger.' },
{ name: 'Luftdruck', heute: 'fällt, 1018 → 1014', damals: 'fiel, 1010 → 998', z: '≈', pct: 60, gw: 25, warum: 'Beide Male fällt der Druck – das ist das Gute. Damals ging es aber dreimal so schnell runter, mit einer Front dahinter.' },
{ name: 'Wind', heute: 'NO, 14 km/h', damals: 'meist NO, schwach', z: '≈', pct: 70, gw: 15, warum: 'Gleiche Richtung, heute etwas kräftiger. Nordost gilt als schwacher Wind – ob das am ACW stimmt, zeigen erst mehr Ansitze.' },
{ name: 'Wolken', heute: '90 %', damals: '94 %', z: '=', pct: 100, gw: 10, warum: 'Beide Male dicht bedeckt. Die Fische sind weniger scheu und fressen auch tagsüber.' },
{ name: 'Regen', heute: 'trocken', damals: '12,6 mm', z: '≠', pct: 10, gw: 10, warum: 'Damals hat es fast durchgehend leicht geregnet. Milder Regen gilt als Plus – heute fehlt er.' },
{ name: 'Umschwung', heute: '+2 °C zu gestern', damals: 'kalt-klar → mild-trüb', z: '≈', pct: 50, gw: 10, warum: 'Damals kam nach drei Tagen stabilem Hoch der Umschwung – die Top-Beißphase. Heute wird es nur leicht wärmer.' }
];
const MARKE = { '=': '#00FF5E;color:#000000', '≈': '#ece8dc;color:#000000', '≠': '#ff1e1e;color:#ffffff' };
return {
punkte: P.map((p, i) => ({
name: p.name, heute: p.heute, damals: p.damals, warum: p.warum, zeichen: p.z,
wert: p.pct + ' % · zählt ' + p.gw + ' %',
offen: offen === i,
linie: i === 0 ? '0' : '1px solid #2e2e2e',
marke: 'display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: none; border-radius: 50%; font: 700 15px/1 \'Barlow Condensed\', sans-serif; background: ' + MARKE[p.z],
balken: 'display: block; height: 100%; width: ' + p.pct + '%; border-radius: 3px; background: ' + (p.pct >= 60 ? '#00FF5E' : p.pct >= 40 ? '#ece8dc' : '#ff1e1e'),
tipp: () => this.setState({ offen: offen === i ? -1 : i })
})),
rechnen: !!s.rechnen,
rechnenPfeil: s.rechnen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6',
rechnenUm: () => this.setState({ rechnen: !s.rechnen }),
gewichte: P.map((p) => ({ name: p.name, w: p.gw + ' %', balken: 'display: block; height: 100%; width: ' + (p.gw / 30 * 100) + '%; border-radius: 3px; background: #a39f93' }))
};
}
}
return Component;
}
