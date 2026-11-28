// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/BissKarte.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const D = {"B":[{"fang":true,"rute":"R1","spot":"A","t":15.5,"kg":12.4,"art":"Spiegler","x":165.0,"y":133.0,"wd":"NO","h":15.5,"tief":5,"grund":null,"zeit":"Mi 15:30"},{"fang":true,"rute":"R1","spot":"A","t":17.2,"kg":8.9,"art":"Schuppi","x":170.2,"y":127.4,"wd":"N","h":17.2,"tief":5,"grund":null,"zeit":"Mi 17:12"},{"fang":true,"rute":"R1","spot":"A","t":19.1,"kg":15.2,"art":"Spiegler","x":158.0,"y":123.2,"wd":"NO","h":19.1,"tief":5,"grund":1,"zeit":"Mi 19:06"},{"fang":true,"rute":"R1","spot":"A","t":22.3,"kg":10.1,"art":"Spiegler","x":169.0,"y":129.9,"wd":"NO","h":22.3,"tief":5,"grund":null,"zeit":"Mi 22:18"},{"fang":true,"rute":"R1","spot":"A","t":24.9,"kg":7.6,"art":"Schuppi","x":166.6,"y":132.3,"wd":"NO","h":0.9,"tief":5,"grund":null,"zeit":"Do 0:54"},{"fang":true,"rute":"R1","spot":"A","t":27.9,"kg":13.8,"art":"Spiegler","x":158.9,"y":125.0,"wd":"NO","h":3.9,"tief":5,"grund":1,"zeit":"Do 3:54"},{"fang":true,"rute":"R1","spot":"B","t":31.8,"kg":9.4,"art":"Schuppi","x":234.6,"y":102.4,"wd":"W","h":7.8,"tief":4,"grund":2,"zeit":"Do 7:48"},{"fang":true,"rute":"R1","spot":"B","t":33.5,"kg":17.3,"art":"Spiegler","x":225.3,"y":109.9,"wd":"W","h":9.5,"tief":5,"grund":1,"zeit":"Do 9:30"},{"fang":true,"rute":"R1","spot":"B","t":38.0,"kg":11.0,"art":"Spiegler","x":225.0,"y":108.6,"wd":"N","h":14.0,"tief":4,"grund":1,"zeit":"Do 14:00"},{"fang":true,"rute":"R2","spot":"C","t":18.4,"kg":6.8,"art":"Schuppi","x":302.7,"y":111.4,"wd":"NO","h":18.4,"tief":5,"grund":null,"zeit":"Mi 18:24"},{"fang":true,"rute":"R2","spot":"C","t":20.6,"kg":14.6,"art":"Spiegler","x":290.1,"y":114.6,"wd":"NO","h":20.6,"tief":5,"grund":1,"zeit":"Mi 20:36"},{"fang":true,"rute":"R2","spot":"C","t":23.7,"kg":9.9,"art":"Schuppi","x":297.2,"y":120.9,"wd":"NO","h":23.7,"tief":6,"grund":null,"zeit":"Mi 23:42"},{"fang":true,"rute":"R2","spot":"C","t":29.2,"kg":12.0,"art":"Spiegler","x":300.4,"y":116.1,"wd":"NO","h":5.2,"tief":5,"grund":null,"zeit":"Do 5:12"},{"fang":true,"rute":"R2","spot":"C","t":41.2,"kg":8.2,"art":"Schuppi","x":289.0,"y":111.0,"wd":"NW","h":17.2,"tief":5,"grund":1,"zeit":"Do 17:12"},{"fang":false,"rute":"R1","spot":"A","t":21.0,"kg":0,"art":"","x":169.9,"y":129.2,"wd":"NO","h":21.0,"tief":5,"grund":null,"zeit":"Mi 21:00"},{"fang":false,"rute":"R2","spot":"C","t":26.4,"kg":0,"art":"","x":296.4,"y":120.7,"wd":"NO","h":2.4,"tief":6,"grund":null,"zeit":"Do 2:24"},{"fang":false,"rute":"R2","spot":"C","t":35.1,"kg":0,"art":"","x":290.5,"y":113.6,"wd":"N","h":11.1,"tief":5,"grund":1,"zeit":"Do 11:06"},{"fang":false,"rute":"R1","spot":"B","t":40.3,"kg":0,"art":"","x":234.9,"y":101.9,"wd":"N","h":16.3,"tief":4,"grund":2,"zeit":"Do 16:18"}],"SPOT":{"A":[165,128],"B":[228,106],"C":[296,116]},"aufNO":"M316 298L323 298L326 297 M-16 149L-10 153L-6 158L-1 162L3 167L8 172L14 172L21 170L27 168L32 170L36 168L43 168L50 168L56 170L63 172L71 172L79 176L85 179L90 175L95 173L103 175L109 175L115 177L121 178L130 179L138 185L145 187L152 190L159 194L164 198L169 202L174 206L174 213L170 218L171 224L174 230L180 234L183 239L186 245L189 250L192 255L195 261L200 267L208 273L211 280L214 286L216 294L219 303L223 307L227 312L233 312L239 314L245 320L247 326L250 332L258 338L266 340L266 340","GNAME":["weich","eher weich","mittel","eher hart","hart","sehr hart"]};
const ansicht = s.ansicht || 'punkte', unter = s.unter || 'luft';
const rutenAn = s.ruten === undefined ? true : s.ruten, heuteAn = !!s.heute;
const ganz = s.stunde === undefined || s.stunde === null;
const std = ganz ? 18 : s.stunde;
const wind = s.wind || null;
const imFenster = (b) => { if (ganz) return true; let d = Math.abs(b.h - std); d = Math.min(d, 24 - d); return d <= 2; };
const passt = (b) => imFenster(b) && (!wind || b.wd === wind);
const sel = D.B.filter(passt);
const komma = (v) => String(v).replace('.', ',');
const punkte = D.B.map((b) => { const an = passt(b); const r = b.fang ? 4 + b.kg / 2.2 : 6;
return { x: b.x, y: b.y, r: r.toFixed(1), fill: b.fang ? (b.art === 'Spiegler' ? '#00FF5E' : '#ffd21e') : 'none', stroke: b.fang ? '#000000' : '#ece8dc', sw: b.fang ? '1.5' : '2.2', deck: an ? '0.95' : '0.12', waerme: an ? '0.55' : '0' }; });
const FARBE = { R1: '#7ee0ff', R2: '#ff8a3d' };
const rutenLinien = [
{ d: 'M173.8 209.5L' + D.SPOT.A[0] + ' ' + D.SPOT.A[1], farbe: FARBE.R1, rx: D.SPOT.A[0] - 5, ry: D.SPOT.A[1] - 5, tx: D.SPOT.A[0] - 14, ty: D.SPOT.A[1] + 26, anker: 'middle', text: 'R1 bis 6 Uhr' },
{ d: 'M173.8 209.5L' + D.SPOT.B[0] + ' ' + D.SPOT.B[1], farbe: FARBE.R1, rx: D.SPOT.B[0] - 5, ry: D.SPOT.B[1] - 5, tx: D.SPOT.B[0] + 4, ty: D.SPOT.B[1] + 28, anker: 'middle', text: 'R1 ab 6' },
{ d: 'M173.8 209.5L' + D.SPOT.C[0] + ' ' + D.SPOT.C[1], farbe: FARBE.R2, rx: D.SPOT.C[0] - 5, ry: D.SPOT.C[1] - 5, tx: D.SPOT.C[0], ty: D.SPOT.C[1] + 28, anker: 'middle', text: 'R2' }
];
// Stunden-Balken
const proStd = new Array(24).fill(0); D.B.forEach((b) => { if (!wind || b.wd === wind) proStd[Math.floor(b.h)]++; });
const maxS = Math.max(1, ...proStd);
const stunden = proStd.map((n, h) => { let d = Math.abs(h + 0.5 - std); d = Math.min(d, 24 - d); const drin = ganz || d <= 2.5;
return 'display: block; height: ' + Math.max(3, n / maxS * 36) + 'px; border-radius: 2px; background: ' + (n === 0 ? '#2e2e2e' : drin ? '#00FF5E' : '#3c5a46'); });
// Windrose
const R8 = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const zaehl = {}; D.B.filter(imFenster).forEach((b) => { zaehl[b.wd] = (zaehl[b.wd] || 0) + 1; });
const maxW = Math.max(1, ...R8.map((r) => zaehl[r] || 0));
const rose = R8.map((r, i) => { const n = zaehl[r] || 0; const a = (i * 45 - 90) * Math.PI / 180, b1 = a - 0.32, b2 = a + 0.32; const L = 12 + 68 * n / maxW;
const d = n ? 'M0 0L' + (Math.cos(b1) * L).toFixed(1) + ' ' + (Math.sin(b1) * L).toFixed(1) + 'A' + L.toFixed(1) + ' ' + L.toFixed(1) + ' 0 0 1 ' + (Math.cos(b2) * L).toFixed(1) + ' ' + (Math.sin(b2) * L).toFixed(1) + 'Z' : '';
const an = wind === r; const bx = 115 + Math.cos(a) * 96, by = 115 + Math.sin(a) * 96;
return { d, fill: an ? '#00FF5E' : 'rgba(0,255,94,0.35)', name: r, n: n ? String(n) : '–', an, aria: 'Wind aus ' + r + ': ' + n + ' Bisse',
tipp: () => this.setState({ wind: an ? null : r }),
stil: 'left: ' + bx.toFixed(1) + 'px; top: ' + by.toFixed(1) + 'px; ' + "position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; padding: 0; border-radius: 50%; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; font: 700 13px/1 'Barlow Condensed', sans-serif; " + (an ? 'border: 1px solid #00FF5E; background: #00FF5E; color: #000000' : 'border: 1px solid #444444; background: #141414; color: #ece8dc') };
});
// Zusammenfassung
const f = sel.filter((b) => b.fang), fb = sel.filter((b) => !b.fang);
const tiefen = sel.map((b) => b.tief).filter((k) => k !== null);
const tMin = tiefen.length ? Math.min(...tiefen) : null, tMax = tiefen.length ? Math.max(...tiefen) : null;
const tiefText = tMin === null ? '–' : (0.5 + 0.25 * tMin).toFixed(2).replace('.', ',') + '–' + (0.75 + 0.25 * tMax).toFixed(2).replace('.', ',') + ' m';
const gr = sel.map((b) => b.grund).filter((k) => k !== null);
const weich = gr.filter((k) => k <= 1).length;
const grundText = gr.length ? Math.round(weich / gr.length * 100) + ' %' : '–';
const schwer = f.length ? Math.max(...f.map((b) => b.kg)) : 0;
let krisiu;
if (!sel.length) krisiu = 'In diesem Fenster gab es keinen Biss. Schieb die Uhrzeit oder nimm „Alle“ beim Wind.';
else krisiu = sel.length + ' von ' + D.B.length + ' Bissen' + (gr.length ? ', davon ' + weich + ' von ' + gr.length + ' auf eher weichem Grund' : '') + (tMin !== null ? ' in ' + tiefText : '') + '. Beispielwerte – aber genau so rechne ich, sobald echte Bisse drin sind.';
const ruten = [
{ kurz: 'R1', farbe: FARBE.R1, name: 'Rute 1 · Spot West → Rinne', info: 'umgelegt am 12.11. um 6 Uhr' },
{ kurz: 'R2', farbe: FARBE.R2, name: 'Rute 2 · Spot Ost', info: 'Bucht an der Landzunge, 201 m' }
].map((r, k) => { const alle = sel.filter((b) => b.rute === r.kurz); const fa = alle.filter((b) => b.fang).length;
return Object.assign(r, { linie: k ? '1px solid #2e2e2e' : '0', faenge: fa + (fa === 1 ? ' Fang' : ' Fänge'), fehl: (alle.length - fa) + ' Fehlbiss' + (alle.length - fa === 1 ? '' : 'e') }); });
const chipAn = "height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000; font: 700 16px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap";
const chipAus = "height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 16px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap";
const C = (k, an, fn) => { const o = {}; o['c_' + k] = fn; o['a_' + k] = an; o['s_' + k] = an ? chipAn : chipAus; return o; };
const rosAlle = "position: absolute; left: 115px; top: 115px; width: 56px; height: 56px; margin: -28px 0 0 -28px; padding: 0; border-radius: 50%; cursor: pointer; font: 700 14px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; " + (!wind ? 'border: 1px solid #00FF5E; background: #00FF5E; color: #000000' : 'border: 1px solid #444444; background: #141414; color: #ece8dc');
return Object.assign({},
C('punkte', ansicht === 'punkte', () => this.setState({ ansicht: 'punkte' })), C('waerme', ansicht === 'waerme', () => this.setState({ ansicht: 'waerme' })),
C('ruten', rutenAn, () => this.setState({ ruten: !rutenAn })), C('heute', heuteAn, () => this.setState({ heute: !heuteAn })),
C('luft', unter === 'luft', () => this.setState({ unter: 'luft' })), C('tiefe', unter === 'tiefe', () => this.setState({ unter: 'tiefe' })), C('grund', unter === 'grund', () => this.setState({ unter: 'grund' })),
C('tag', ganz, () => this.setState({ stunde: null })),
{
c_wind: () => this.setState({ wind: null }), a_wind: !wind, s_wind: rosAlle,
istPunkte: ansicht === 'punkte', istWaerme: ansicht === 'waerme', rutenAn, heuteAn, aufD: D.aufNO,
zeigTiefe: unter === 'tiefe', zeigGrund: unter === 'grund', legPunkte: unter === 'luft', abdunkeln: unter === 'luft' ? '0.15' : '0.35',
punkte, rutenLinien, stunden, rose,
stunde: std, schieb: (e) => this.setState({ stunde: parseInt(e.target.value, 10) }),
zeitText: ganz ? 'ganzer Tag' : ((std + 22) % 24) + ' bis ' + ((std + 2) % 24) + ' Uhr',
stundenAria: 'Bisse je Stunde, ' + (ganz ? 'alle Stunden' : 'Fenster ' + ((std + 22) % 24) + ' bis ' + ((std + 2) % 24) + ' Uhr'),
kopfZahl: f.length + (f.length === 1 ? ' Fang' : ' Fänge') + ' · ' + fb.length + ' Fehlb.',
filterText: (ganz ? 'ganzer Tag' : ((std + 22) % 24) + '–' + ((std + 2) % 24) + ' Uhr') + ' · ' + (wind ? 'Wind ' + wind : 'jeder Wind'),
kacheln: [{ w: tiefText, l: 'Tiefe am Biss' }, { w: grundText, l: 'auf eher weichem Grund' }, { w: schwer ? komma(schwer.toFixed(1)) + ' kg' : '–', l: 'schwerster Fisch' }],
krisiu, ruten,
karteAria: 'Biss-Karte ACW mit ' + sel.length + ' Bissen (Beispiel) ' + (ansicht === 'waerme' ? 'als Wärmekarte' : 'als Punkte')
});
}
}
return Component;
}
