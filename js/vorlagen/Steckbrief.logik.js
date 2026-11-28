// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/Steckbrief.js.
export default function (DCLogic) {
class Component extends DCLogic {
gruppen() { return {}; }
renderVals() {
const st = this.state || {};
const G = this.gruppen();
const ch = {};
Object.keys(G).forEach((g) => {
const cur = this.aktuell(g);
G[g].an.forEach((_, i) => {
const an = cur.indexOf(i) >= 0;
ch[g + '_' + i] = { s: an ? G[g].an[i] : G[g].aus[i], p: an, k: () => this.wahl(g, i) };
});
});
const swAn = st.sw || {};
const SW = {};
const sw = {};
Object.keys(SW).forEach((w) => {
const an = swAn[w] === undefined ? SW[w] : swAn[w];
sw[w] = { p: an, s: an ? "position: relative; width: 50px; height: 30px; flex: none; box-sizing: border-box; padding: 0; border: 0; border-radius: 999px; background: #00FF5E; cursor: pointer" : "position: relative; width: 50px; height: 30px; flex: none; box-sizing: border-box; padding: 0; border: 1px solid #444444; border-radius: 999px; background: #2e2e2e; cursor: pointer", knopf: an ? "position: absolute; right: 3px; top: 3px; width: 24px; height: 24px; border-radius: 50%; background: #000000" : "position: absolute; left: 3px; top: 3px; width: 22px; height: 22px; border-radius: 50%; background: #a39f93", k: () => this.setState({ sw: Object.assign({}, this.state && this.state.sw, { [w]: !an }) }) };
});
const INFO = {"i0": "In der App gibst du hier den Namen ein."};
const info = {};
Object.keys(INFO).forEach((n) => { info[n] = (e) => { if (e && e.preventDefault) e.preventDefault(); this.zeige(INFO[n]); }; });
return Object.assign({ ch: ch, sw: sw, info: info, toastAn: !!st.toast, toastText: st.toast || '' }, this.extra(st));
}
aktuell(g) {
const st = this.state || {};
const x = this.aktuellSpezial ? this.aktuellSpezial(g, st) : null;
if (x) return x;
return (st.sel && st.sel[g]) || this.gruppen()[g].init;
}
wahl(g, i) {
if (this.wahlSpezial && this.wahlSpezial(g, i)) return;
const G = this.gruppen()[g];
const sel = Object.assign({}, (this.state && this.state.sel) || {});
const cur = this.aktuell(g).slice();
if (G.multi) { const j = cur.indexOf(i); if (j >= 0) cur.splice(j, 1); else cur.push(i); sel[g] = cur; }
else sel[g] = [i];
this.setState({ sel: sel });
}
zeige(t) {
this.setState({ toast: t });
clearTimeout(this._t);
this._t = setTimeout(() => this.setState({ toast: '' }), 2600);
}
componentWillUnmount() { clearTimeout(this._t); }
extra(st) { return {}; }
}
return Component;
}
