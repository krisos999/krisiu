// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/ChancenHeute.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const offen = s.offen === undefined ? -1 : s.offen;
const std = s.std === undefined ? 4 : s.std;
const F = [
{ name: 'Nacht', wert: '1 °C', notiz: 'knapp über Frost', art: -1, warum: 'Die Nacht zählt mehr als der Tag. Knapp über null kühlt der flache Weiher weiter aus, die Karpfen bleiben träge.' },
{ name: 'Tag', wert: '6 °C', notiz: '2 Grad wärmer als gestern', art: 1, warum: 'Wärmer als gestern. Jede Erwärmung macht die Fische munterer, am meisten über Mittag.' },
{ name: 'Druck', wert: 'fällt', notiz: '1018 → 1014 hPa', art: 1, warum: 'Fallender Druck kündigt die nächste Front an. Vor der Front fressen Karpfen oft besser.' },
{ name: 'Wind', wert: 'NO', notiz: '14 km/h, kalte Richtung', art: -1, warum: 'Nordost bringt kalte Luft und gilt als schlechte Windrichtung. Süd- oder Westwind wäre besser.' },
{ name: 'Wolken', wert: '90 %', notiz: 'bedeckt', art: 1, warum: 'Bedeckter Himmel: Die Fische sind weniger scheu und fressen länger, nicht nur mittags.' },
{ name: 'Regen', wert: '0 mm', notiz: 'trocken', art: 0, warum: 'Kein Regen. Leichter, milder Regen hätte noch geholfen.' }
];
const MARKE = {
'1': 'display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; border-radius: 50%; background: #00FF5E; color: #000000; font: 700 17px/1 \'Barlow Condensed\', sans-serif',
'-1': 'display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; border-radius: 50%; background: #ff1e1e; color: #ffffff; font: 700 17px/1 \'Barlow Condensed\', sans-serif',
'0': 'display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; box-sizing: border-box; border-radius: 50%; border: 1px solid #6c6c6c; color: #a39f93; font: 700 17px/1 \'Barlow Condensed\', sans-serif'
};
const H = [
{ u: 8, grad: 2, wind: 10, druck: 1018, stufe: 1 },
{ u: 10, grad: 4, wind: 12, druck: 1017, stufe: 2 },
{ u: 12, grad: 6, wind: 14, druck: 1016, stufe: 3 },
{ u: 14, grad: 6, wind: 14, druck: 1015, stufe: 3 },
{ u: 16, grad: 5, wind: 12, druck: 1015, stufe: 2, jetzt: true, extra: 'Dämmerung ab 16:30' },
{ u: 18, grad: 3, wind: 10, druck: 1014, stufe: 1 },
{ u: 20, grad: 2, wind: 8, druck: 1014, stufe: 1 },
{ u: 22, grad: 1, wind: 8, druck: 1014, stufe: 1 }
];
const WORT = ['', 'gering', 'mittel', 'gut', 'sehr gut'];
const h = H[std];
return {
faktoren: F.map((f, i) => ({
name: f.name, wert: f.wert, notiz: f.notiz, warum: f.warum, karte: f.name === 'Wind',
zeichen: f.art > 0 ? '+' : f.art < 0 ? '−' : '=',
urteil: f.art > 0 ? 'hilft' : f.art < 0 ? 'bremst' : 'egal',
marke: MARKE[String(f.art)],
linie: i === 0 ? '0' : '1px solid #2e2e2e',
offen: offen === i,
pfeil: offen === i ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6',
tipp: () => this.setState({ offen: offen === i ? -1 : i })
})),
stunden: H.map((x, i) => {
const an = std === i;
const gut = x.u >= 11 && x.u <= 15;
return {
an: an,
marke: x.jetzt ? 'jetzt' : String(x.u),
aria: x.u + ' Uhr, Chance ' + WORT[x.stufe],
knopf: 'display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 5px; height: 74px; box-sizing: border-box; padding: 4px 0 5px; border-radius: 6px; background: ' + (an ? '#1c1c1c' : 'transparent') + '; border: 1px solid ' + (an ? '#ece8dc' : 'transparent') + '; cursor: pointer',
balken: 'display: block; width: 18px; height: ' + (x.stufe * 13) + 'px; border-radius: 3px 3px 0 0; background: ' + (gut ? '#00FF5E' : '#6c6c6c'),
schrift: 'font: ' + (an ? '700' : '500') + ' 12px/1 \'Barlow\', sans-serif; color: ' + (x.jetzt ? '#00FF5E' : an ? '#ece8dc' : '#a39f93'),
tipp: () => this.setState({ std: i })
};
}),
zeile1: h.u + ' Uhr' + (h.jetzt ? ' · jetzt' : '') + ' · Chance ' + WORT[h.stufe] + (h.extra ? ' · ' + h.extra : ''),
zeile2: h.grad + ' °C · Wind NO ' + h.wind + ' km/h · ' + h.druck + ' hPa'
};
}
}
return Component;
}
