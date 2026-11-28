// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/SaisonKalender.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const DD = (this.props.daten || {});
const D = Object.assign({"echt":[],"bsp":[{"start":"2026-03-11","tage":1,"see":"ACW","fische":0,"dauer":"13 h","info":"Beispiel","link":""},{"start":"2026-04-02","tage":1,"see":"ACW","fische":0,"dauer":"10 h","info":"Beispiel","link":""},{"start":"2026-04-08","tage":2,"see":"ACW","fische":0,"dauer":"36 h","info":"Beispiel","link":""},{"start":"2026-04-19","tage":1,"see":"VSA","fische":0,"dauer":"7 h","info":"Beispiel","link":""},{"start":"2026-05-02","tage":1,"see":"ACW","fische":1,"dauer":"12 h","info":"Beispiel","link":""},{"start":"2026-05-27","tage":1,"see":"ACW","fische":5,"dauer":"7 h","info":"Beispiel","link":""},{"start":"2026-05-12","tage":2,"see":"VSA","fische":1,"dauer":"38 h","info":"Beispiel","link":""},{"start":"2026-05-14","tage":1,"see":"ACW","fische":2,"dauer":"9 h","info":"Beispiel","link":""},{"start":"2026-06-10","tage":2,"see":"ACW","fische":3,"dauer":"39 h","info":"Beispiel","link":""},{"start":"2026-06-24","tage":2,"see":"VSA","fische":0,"dauer":"38 h","info":"Beispiel","link":""},{"start":"2026-06-14","tage":2,"see":"ACW","fische":5,"dauer":"45 h","info":"Beispiel","link":""},{"start":"2026-07-25","tage":1,"see":"VSA","fische":1,"dauer":"9 h","info":"Beispiel","link":""},{"start":"2026-07-23","tage":2,"see":"ACW","fische":0,"dauer":"42 h","info":"Beispiel","link":""},{"start":"2026-08-16","tage":1,"see":"ACW","fische":1,"dauer":"8 h","info":"Beispiel","link":""},{"start":"2026-08-21","tage":1,"see":"VSA","fische":0,"dauer":"9 h","info":"Beispiel","link":""},{"start":"2026-09-01","tage":1,"see":"ACW","fische":5,"dauer":"11 h","info":"Beispiel","link":""},{"start":"2026-09-07","tage":1,"see":"ACW","fische":4,"dauer":"5 h","info":"Beispiel","link":""},{"start":"2026-09-15","tage":2,"see":"ACW","fische":0,"dauer":"40 h","info":"Beispiel","link":""},{"start":"2026-10-18","tage":2,"see":"ACW","fische":2,"dauer":"44 h","info":"Beispiel","link":""},{"start":"2026-10-03","tage":2,"see":"ACW","fische":0,"dauer":"39 h","info":"Beispiel","link":""},{"start":"2026-10-27","tage":1,"see":"ACW","fische":7,"dauer":"13 h","info":"Beispiel","link":""},{"start":"2026-10-11","tage":1,"see":"VSA","fische":5,"dauer":"13 h","info":"Beispiel","link":""},{"start":"2026-11-21","tage":1,"see":"ACW","fische":6,"dauer":"12 h","info":"Beispiel","link":""},{"start":"2026-11-13","tage":2,"see":"ACW","fische":0,"dauer":"40 h","info":"Beispiel","link":""},{"start":"2026-11-02","tage":2,"see":"VSA","fische":2,"dauer":"45 h","info":"Beispiel","link":""}]}, DD.D);
const J = DD.jahr || new Date().getFullYear();
const modus = s.modus || 'echt', see = s.see || 'alle';
const liste = D[modus].filter((a) => see === 'alle' || a.see === see);
// Tage -> Ansitz
const tagMap = {};
liste.forEach((a, idx) => { const d0 = new Date(a.start + 'T12:00:00'); for (let k = 0; k < a.tage; k++) { const d = new Date(d0.getTime() + k * 86400000); const key = d.getMonth() + '-' + d.getDate(); tagMap[key] = { a, idx, k }; } });
const farbe = (f) => (f === 0 ? 'background: #000000; border: 1.5px solid #a39f93' : f <= 2 ? 'background: #0f6b33' : f <= 5 ? 'background: #14b04f' : 'background: #00FF5E');
const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const mWahl = s.monat === undefined ? (J === new Date().getFullYear() ? new Date().getMonth() : 11) : s.monat;
const heute = J === new Date().getFullYear() ? { m: new Date().getMonth(), d: new Date().getDate() } : { m: 12, d: 0 };
const jahr = MON.map((n, m) => {
const tageImMonat = new Date(J, m + 1, 0).getDate();
const tage = [];
let anz = 0;
for (let d = 1; d <= 31; d++) {
const e = tagMap[m + '-' + d];
if (e) anz++;
let st = 'display: block; height: 13px; border-radius: 2px; box-sizing: border-box; ';
if (d > tageImMonat) st += 'background: transparent';
else if (e) st += farbe(e.a.fische);
else st += (m > heute.m || (m === heute.m && d > heute.d)) ? 'background: #101010' : 'background: #1d1d1d';
if (m === heute.m && d === heute.d) st += '; outline: 1.5px solid #ece8dc; outline-offset: -1.5px';
tage.push(st);
}
const an = m === mWahl;
return { name: n.slice(0, 3), tage, an, farbe: an ? '#00FF5E' : '#a39f93', aria: n + ': ' + anz + ' Tage am Wasser', tipp: () => this.setState({ monat: m, tag: null }),
stil: 'display: flex; align-items: center; gap: 6px; width: 100%; height: 20px; padding: 0 4px; margin: 0 -4px; box-sizing: content-box; border: 0; border-radius: 4px; cursor: pointer; background: ' + (an ? '#0f2a18' : 'transparent') };
});
// Monatsansicht
const erster = new Date(J, mWahl, 1); const versatz = (erster.getDay() + 6) % 7; const n = new Date(J, mWahl + 1, 0).getDate();
const monat = [];
for (let i = 0; i < versatz; i++) monat.push({ feld: true, knopf: false, tag: '', stil: 'height: 44px' });
let auto = null;
for (let d = 1; d <= n; d++) {
const e = tagMap[mWahl + '-' + d];
const istHeute = mWahl === heute.m && d === heute.d;
if (e) {
if (auto === null) auto = d;
const gew = (s.tag || auto) === d || (s.tag && tagMap[mWahl + '-' + s.tag] && tagMap[mWahl + '-' + s.tag].idx === e.idx && false);
const f = e.a.fische;
const hell = f > 5;
monat.push({ knopf: true, feld: false, tag: d, zahl: f === 0 ? '0' : f + (e.a.tage > 1 ? '*' : ''), an: gew,
aria: d + '. ' + MON[mWahl] + ', ' + e.a.see + ', ' + (f === 0 ? 'Schneider' : f + ' Fische'),
tipp: () => this.setState({ tag: d }),
stil: 'display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; height: 44px; padding: 0; border-radius: 8px; cursor: pointer; font: 700 15px/1 \'Barlow Condensed\', sans-serif; box-sizing: border-box; ' + farbe(f) + '; color: ' + (hell ? '#000000' : '#ece8dc') + (gew ? '; box-shadow: 0 0 0 2px #000000, 0 0 0 4px #ece8dc' : '') });
} else monat.push({ feld: true, knopf: false, tag: d, stil: 'display: flex; align-items: center; justify-content: center; height: 44px; border-radius: 8px; font: 600 14px/1 \'Barlow Condensed\', sans-serif; color: ' + (istHeute ? '#ece8dc' : '#6e6a60') + '; background: #141414' + (istHeute ? '; outline: 1.5px solid #ece8dc; outline-offset: -1.5px' : '') });
}
const tagW = s.tag || auto;
const eW = tagW ? tagMap[mWahl + '-' + tagW] : null;
let w = { datum: '', fische: '', zeile: '', rand: '#2e2e2e', hatLink: false };
if (eW) {
const a = eW.a; const d0 = new Date(a.start + 'T12:00:00');
const dat = d0.getDate() + '.' + (d0.getMonth() + 1) + '.' + (a.tage > 1 ? '–' + (d0.getDate() + 1) + '.' + (d0.getMonth() + 1) + '.' : '');
w = { datum: dat + ' · ' + a.see, fische: a.fische === 0 ? 'Schneider' : a.fische + (a.karpfen ? ' Karpfen' : ' Fische'), zeile: a.dauer + ' · ' + a.info + (a.tage > 1 ? ' · * Fische für beide Tage zusammen' : ''), rand: a.fische === 0 ? '#a39f93' : '#00FF5E', hatLink: !!a.link, link: a.link };
}
const ansitze = liste.length, fische = liste.reduce((x, a) => x + a.fische, 0), schneider = liste.filter((a) => a.fische === 0).length;
const tageWasser = liste.reduce((x, a) => x + a.tage, 0);
const proMonat = {}; liste.forEach((a) => { const m = parseInt(a.start.slice(5, 7), 10) - 1; proMonat[m] = (proMonat[m] || 0) + a.fische; });
let best = -1, bestF = -1; Object.keys(proMonat).forEach((m) => { if (proMonat[m] > bestF) { bestF = proMonat[m]; best = +m; } });
const zahlen = [{ w: ansitze, l: 'Ansitze' }, { w: tageWasser, l: 'Tage am Wasser' }, { w: fische, l: 'Fische' }, { w: ansitze ? Math.round(schneider / ansitze * 100) + ' %' : '–', l: 'Schneider' }];
const chipAn = "height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000; font: 700 17px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap";
const chipAus = "height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 17px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap";
let krisiu;
if (modus === 'echt') krisiu = DD.krisiu ? DD.krisiu(see, liste) : "";
else { const sm = {}; liste.forEach((a) => { if (a.fische === 0) { const m = parseInt(a.start.slice(5, 7), 10) - 1; sm[m] = (sm[m] || 0) + 1; } }); let sb = -1, sn = 0; Object.keys(sm).forEach((m) => { if (sm[m] > sn) { sn = sm[m]; sb = +m; } });
krisiu = 'Beispiel: Bester Monat wäre der ' + (best >= 0 ? MON[best] : '–') + ' mit ' + bestF + ' Fischen.' + (sb >= 0 ? ' Die meisten Schneider gab es im ' + MON[sb] + ' (' + sn + ') – warum, zeigt die Schneider-Analyse.' : ''); }
return {
istBsp: modus === 'bsp',
c_echt: () => this.setState({ modus: 'echt', tag: null, monat: undefined }), c_bsp: () => this.setState({ modus: 'bsp', tag: null }),
a_echt: modus === 'echt', a_bsp: modus === 'bsp', s_echt: modus === 'echt' ? chipAn : chipAus, s_bsp: modus === 'bsp' ? chipAn : chipAus,
c_alle: () => this.setState({ see: 'alle', tag: null }), c_acw: () => this.setState({ see: 'ACW', tag: null }), c_vsa: () => this.setState({ see: 'VSA', tag: null }),
a_alle: see === 'alle', a_acw: see === 'ACW', a_vsa: see === 'VSA', s_alle: see === 'alle' ? chipAn : chipAus, s_acw: see === 'ACW' ? chipAn : chipAus, s_vsa: see === 'VSA' ? chipAn : chipAus,
jahr, monat, monatName: MON[mWahl] + ' ' + J, jahrText: String(J),
zurueck: () => this.setState({ monat: Math.max(0, mWahl - 1), tag: null }), vor: () => this.setState({ monat: Math.min(11, mWahl + 1), tag: null }),
hatWahl: !!eW, w, zahlen, krisiu
};
}
}
return Component;
}
