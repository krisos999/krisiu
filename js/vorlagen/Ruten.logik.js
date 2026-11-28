// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/Ruten.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const liste = s.ruten || [
{ nr: 1, spot: 'Spot West · 110 m', koeder: 'Boilie mit Fake-Mais · ohne Foto' },
{ nr: 2, spot: 'Spot Ost · 201 m', koeder: 'Pop-up · ohne Foto' }
];
const naechste = liste.reduce((m, r) => Math.max(m, r.nr), 0) + 1;
return {
ruten: liste.map((r) => ({
nr: r.nr,
spot: r.spot,
koeder: r.koeder,
oeffnen: () => this.setState({ offen: r.nr })
})),
offenAn: !!s.offen,
offenNr: s.offen || naechste,
hinzufuegen: () => this.setState({ offen: naechste }),
zu: () => this.setState({ offen: 0 }),
fertig: (d) => {
const nr = (d && d.nr) || s.offen;
const k = d && d.koeder && d.koeder.length ? d.koeder.join(', ') : 'Köder offen';
const neu = liste.filter((r) => r.nr !== nr);
const alt = liste.find((r) => r.nr === nr);
neu.push({ nr: nr, spot: alt ? alt.spot : 'Spot noch nicht markiert', koeder: k + ' · ohne Foto' });
neu.sort((a, b) => a.nr - b.nr);
this.setState({ ruten: neu, offen: 0 });
}
};
}
}
return Component;
}
