// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/Planen.js.
export default function (DCLogic) {
class Component extends DCLogic {
gruppen() { return {"g0": {"multi": false, "init": [2], "an": ["flex: 1; height: 56px; padding: 0; border-radius: 14px; border: 1px solid #00FF5E; color: #000000; font: 700 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; background-color: #00FF5E; cursor: pointer", "flex: 1; height: 56px; padding: 0; border-radius: 14px; border: 1px solid #00FF5E; color: #000000; font: 700 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; background-color: #00FF5E; cursor: pointer", "flex: 1; height: 56px; padding: 0; border-radius: 14px; border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000; font: 700 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer"], "aus": ["flex: 1; height: 56px; padding: 0; border-radius: 14px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer", "flex: 1; height: 56px; padding: 0; border-radius: 14px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer", "flex: 1; height: 56px; padding: 0; border-radius: 14px; border: 1px solid #444444; color: #ece8dc; font: 600 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; background: #141414; cursor: pointer"]}, "g1": {"multi": false, "init": [2], "an": ["height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid #00FF5E; color: #000000; font: 700 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; background-color: #00FF5E; cursor: pointer", "height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid #00FF5E; color: #000000; font: 700 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; background-color: #00FF5E; cursor: pointer", "height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000; font: 700 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer"], "aus": ["height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer", "height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid #444444; background: #141414; color: #ece8dc; font: 600 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; cursor: pointer", "height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid #444444; color: #ece8dc; font: 600 19px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; background: #141414; cursor: pointer"]}, "g2": {"multi": false, "init": [1], "an": ["flex: 1; height: 44px; border: 0; border-radius: 10px; color: #000000; font: 700 18px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; background-color: #00FF5E; cursor: pointer", "flex: 1; height: 44px; border: 0; border-radius: 10px; background-color: #00FF5E; color: #000000; font: 700 18px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer"], "aus": ["flex: 1; height: 44px; border: 0; border-radius: 10px; background: transparent; color: #ece8dc; font: 600 18px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer", "flex: 1; height: 44px; border: 0; border-radius: 10px; color: #ece8dc; font: 600 18px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; background: transparent; cursor: pointer"]}, "g3": {"multi": true, "init": [1, 2, 3, 4], "an": ["display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; border: 1px solid #cfcabb; color: #ffffff; background-color: #4a4a4a; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; background-color: #4a4a4a; border: 1px solid #cfcabb; color: #ffffff; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; border: 1px solid #cfcabb; color: #ffffff; background-color: #4a4a4a; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; border: 1px solid #cfcabb; color: #ffffff; background-color: #4a4a4a; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; background-color: #4a4a4a; border: 1px solid #cfcabb; color: #ffffff; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; border: 1px solid #cfcabb; color: #ffffff; background-color: #4a4a4a; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; border: 1px solid #cfcabb; color: #ffffff; background-color: #4a4a4a; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; border: 1px solid #cfcabb; color: #ffffff; background-color: #4a4a4a; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; border: 1px solid #cfcabb; color: #ffffff; background-color: #4a4a4a; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; border: 1px solid #cfcabb; color: #ffffff; background-color: #4a4a4a; cursor: pointer"], "aus": ["display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; background: #141414; border: 1px solid #444444; color: #ece8dc; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; border: 1px solid #444444; color: #ece8dc; background: #141414; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; background: #141414; border: 1px solid #444444; color: #ece8dc; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; background: #141414; border: 1px solid #444444; color: #ece8dc; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; border: 1px solid #444444; color: #ece8dc; background: #141414; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; background: #141414; border: 1px solid #444444; color: #ece8dc; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; background: #141414; border: 1px solid #444444; color: #ece8dc; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; background: #141414; border: 1px solid #444444; color: #ece8dc; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; background: #141414; border: 1px solid #444444; color: #ece8dc; cursor: pointer", "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 64px; padding: 0; border-radius: 12px; background: #141414; border: 1px solid #444444; color: #ece8dc; cursor: pointer"]}}; }
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
const INFO = {};
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
extra(st) {
const T = ['Do 26.', 'Fr 27.', 'Sa 28.', 'So 29.', 'Mo 30.', 'Di 1.', 'Mi 2.', 'Do 3.', 'Fr 4.', 'Sa 5.'];
const d = this.aktuell('g3').slice().sort((x, y) => x - y);
let t = 'Noch kein Tag gewählt';
if (d.length === 1) t = T[d[0]] + ' · Tag und Nacht';
else if (d.length > 1) {
const amStueck = d[d.length - 1] - d[0] === d.length - 1;
t = (amStueck ? T[d[0]] + ' – ' + T[d[d.length - 1]] : d.length + ' Tage gewählt') + ' · ' + d.length + ' Tage und Nächte';
}
return { zeitraumText: t };
}
wahlSpezial(g, i) {
const sel = Object.assign({}, (this.state && this.state.sel) || {});
if (g === 'g3' && this.aktuell('g2')[0] === 0) { sel.g3 = [i]; this.setState({ sel: sel }); return true; }
if (g === 'g2' && i === 0) { const d = this.aktuell('g3'); sel.g2 = [0]; sel.g3 = d.length ? [Math.min.apply(null, d)] : [0]; this.setState({ sel: sel }); return true; }
return false;
}
}
return Component;
}
