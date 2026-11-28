// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/Ansitz.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const ruten = s.ruten || { 1: 'West · Boilie', 2: 'Ost · Pop-up' };
const anzahl = Object.keys(ruten).length;
const bisse = s.bisse || 0;
const schritt = s.schritt || '';
const nr = s.nr || 3;
return {
toast: !!s.toast,
toastText: s.toast || '',
frageAn: schritt === 'rute' || schritt === 'eintragen',
schrittRute: schritt === 'rute',
schrittEintragen: schritt === 'eintragen',
einrichtenAn: schritt === 'einrichten',
nr: nr,
rutenWahl: [1, 2, 3, 4].map((n) => ({
nr: n,
unter: ruten[n] || 'noch nicht eingetragen',
waehle: () => {
if (ruten[n]) this.speichern('Fehlbiss an Rute ' + n + ' um 16:20 gespeichert');
else this.setState({ schritt: 'eintragen', nr: n });
}
})),
eingerichtetText: anzahl + ' eingerichtet',
statsText: '0 Fische · ' + bisse + (bisse === 1 ? ' Biss' : ' Bisse') + ' · ' + anzahl + ' Ruten',
fehlbiss: () => this.setState({ schritt: 'rute' }),
abbrechen: () => this.setState({ schritt: '' }),
eintragen: () => this.setState({ schritt: 'einrichten' }),
nurSpeichern: () => this.speichern('Fehlbiss an Rute ' + nr + ' um 16:20 gespeichert'),
rutFertig: (d) => {
const r = Object.assign({}, ruten);
const k = d && d.koeder && d.koeder.length ? d.koeder.join(', ') : 'Köder offen';
r[nr] = 'neu · ' + k;
this.speichern('Rute ' + nr + ' eingetragen, Fehlbiss gespeichert', { ruten: r });
},
rutZurueck: () => this.speichern('Fehlbiss an Rute ' + nr + ' um 16:20 gespeichert')
};
}
speichern(text, mehr) {
const b = ((this.state && this.state.bisse) || 0) + 1;
this.setState(Object.assign({ schritt: '', bisse: b, toast: text }, mehr || {}));
clearTimeout(this._t);
this._t = setTimeout(() => this.setState({ toast: '' }), 2600);
}
componentWillUnmount() { clearTimeout(this._t); }
}
return Component;
}
