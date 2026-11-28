// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/Replay.js.
export default function (DCLogic) {
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const DD = this.props.daten || {};
const D = DD.D;
if (!D) return { log: [], echos: [], bisse: [], tempi: [], logLeer: true, uhr: "", hMax: 0 };
const NN = Math.max(1, D.P.length - 1);
const h = s.h === undefined ? DD.h0 : s.h;
const i = Math.min(NN, Math.floor(h));
const komma = (v, n) => v.toFixed(n === undefined ? 1 : n).replace('.', ',');
const NAME = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const wd = D.WD[i]; const wName = NAME[Math.floor(((wd % 360) + 22.5) / 45) % 8];
const nachtAn = D.NACHT.some((n) => h >= n[0] && h < n[1]);
let dunkel = 0.08;
D.NACHT.forEach((n) => { const a = n[0], b = n[1]; if (h >= a && h < b) { dunkel = Math.max(dunkel, Math.min(0.58, 0.08 + 0.5 * Math.min(1, (h - a) / 0.75, (b - h) / 0.75))); } });
const r = D.R[i];
let regenD = '';
if (r > 0) { const n = Math.round(8 + r * 22); for (let k = 0; k < n; k++) { const x = (k * 53 + i * 31) % 342, y = (k * 97 + i * 17) % 290; regenD += 'M' + x + ' ' + y + 'l-4 10'; } }
const hm = DD.hm;
const echos = D.ECHO.filter((e) => e.t <= h).map((e) => { const alt = h - e.t, neu = alt < 1.5; return { k: e.k, x: e.x, y: e.y, lx: e.x + 7, ly: e.y - 7, r: neu ? 8 + alt * 8 : 7, deck: neu ? String(1 - alt / 1.5) : '0.35' }; });
const bisse = D.BISS.filter((b) => b.t <= h).map((b) => { const alt = h - b.t, neu = alt < 1.5; return { x: b.x, y: b.y, r: neu ? 9 + alt * 9 : 9, deck: neu ? String(1 - alt / 1.5) : '0.5' }; });
const boot = D.FAHRT.some((f) => h >= f[0] && h <= f[1]);
let wasser = '–'; D.WASSER.forEach((w) => { if (h >= w[0]) wasser = w[1]; });
const p3 = D.P[Math.max(0, i - 3)], pTrend = D.P[i] - p3;
const FARBE = { echo: '#3be0ff', biss: '#ff1e1e', boot: '#3be0ff', sonne: '#ffd21e', regen: '#3b9eff', druck: '#ece8dc' };
const ev = D.EV.filter((e) => e.t <= h).slice(-4).reverse();
const X0 = 32, X1 = 306, xp = (t) => X0 + (X1 - X0) * t / NN, yp = (v) => 86 - (v - DD.pLo) / DD.pSpan * 76;
const pv = D.P[i] + (D.P[Math.min(NN, i + 1)] - D.P[i]) * (h - i);
const tempi = [1, 3, 6].map((f) => ({ name: f + '×', an: (s.tempo || 3) === f, tipp: () => { this.setState({ tempo: f }); if (this._iv) this.play(true); },
stil: "height: 40px; padding: 0 12px; border-radius: 999px; cursor: pointer; font: 700 15px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; " + ((s.tempo || 3) === f ? 'border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000' : 'border: 1px solid #444444; background: #141414; color: #ece8dc') }));
return {
h, uhr: DD.uhr(h), hMax: NN, mitEcho: D.ECHO.length > 0,
tageszeit: nachtAn ? 'Nacht' : 'Tag',
nachtStil: 'position: absolute; left: 0; top: 0; width: 342px; height: 290px; background: #000814; opacity: ' + dunkel.toFixed(2) + '; transition: opacity 0.3s',
regenD, regenDeck: r > 0 ? String(Math.min(0.9, 0.35 + r * 0.4)) : '0',
echos, bisse, bootAn: boot,
windDreh: 'rotate(' + ((wd + 180) % 360) + ')', windText: 'aus ' + wName,
karteAria: 'Karte um ' + hm(h) + ' Uhr: Wind aus ' + wName + ', ' + echos.length + ' Echos, ' + bisse.length + ' Bisse',
luft: komma(D.T[i]) + '°', druck: Math.round(D.P[i]) + (pTrend < -0.5 ? '↓' : pTrend > 0.5 ? '↑' : '→'), wind: wName, regen: komma(r), wasser,
kopfD: 'M' + xp(h).toFixed(1) + ' 8V128', kopfX: xp(h).toFixed(1), kopfY: yp(pv).toFixed(1),
playIcon: s.laeuft ? 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' : 'M8 5l11 7-11 7z', playAria: s.laeuft ? 'Pause' : 'Abspielen',
playPause: () => (s.laeuft ? this.halt() : this.play()),
scrub: (e) => { this.halt(); this.setState({ h: parseFloat(e.target.value) }); },
anfang: () => { this.halt(); this.setState({ h: 0 }); },
tempi,
log: ev.map((e, k) => ({ zeit: e.zeit, txt: e.txt, linie: k ? '1px solid #2e2e2e' : '0', farbe: e.echt ? '#ece8dc' : '#ff8a8a',
punkt: 'width: 10px; height: 10px; flex: none; border-radius: ' + (e.art === 'echo' || e.art === 'biss' ? '50%' : '2px') + '; background: ' + FARBE[e.art] })),
logLeer: ev.length === 0,
toastAn: !!s.toast, toastText: s.toastText || "",
teilen: () => DD.teilen(this)
};
}
play(neu) {
clearInterval(this._iv);
const st = this.state || {};
if (!neu && (st.h || 0) >= this.props.daten.D.P.length - 1) this.setState({ h: 0 });
this.setState({ laeuft: true });
this._iv = setInterval(() => {
const s = this.state || {};
const NN = this.props.daten.D.P.length - 1;
const nh = (s.h === undefined ? this.props.daten.h0 : s.h) + 0.25 * (s.tempo || 3) / 3 * Math.max(1, NN / 47);
if (nh >= NN) { this.halt(); this.setState({ h: NN }); return; }
this.setState({ h: nh });
}, 110);
}
halt() { clearInterval(this._iv); this._iv = 0; this.setState({ laeuft: false }); }
componentWillUnmount() { clearInterval(this._iv); clearTimeout(this._t); }
}
return Component;
}
