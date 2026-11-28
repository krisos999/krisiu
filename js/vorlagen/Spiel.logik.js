// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/Spiel.js.
export default function (DCLogic) {
class Component extends DCLogic {
stufen() {
return [
null,
{ nr: 1, name: 'Allrounder', kurz: 'Allrounder', sub: 'Gemütlich, kaum Montagen', faktor: 1, t0: 140, tMax: 330, rate: 22, fallenAb: 700, fallenMax: 0.35, hechtAb: 900, krabbeAb: 1400, welsAb: 2200, astMax: 90, groesse: 1.2, krisiu: 400 },
{ nr: 2, name: 'Karpfenspezialist', kurz: 'Spezialist', sub: 'Schneller, mehr Montagen', faktor: 1.5, t0: 165, tMax: 420, rate: 16, fallenAb: 350, fallenMax: 0.55, hechtAb: 600, krabbeAb: 800, welsAb: 1200, astMax: 110, groesse: 1.2, krisiu: 800 },
{ nr: 3, name: 'Big-Fish-Angler', kurz: 'Big Fish', sub: 'Großer Karpfen, alles drin', faktor: 2, t0: 190, tMax: 480, rate: 13, fallenAb: 200, fallenMax: 0.7, hechtAb: 400, krabbeAb: 500, welsAb: 700, astMax: 120, groesse: 1.45, krisiu: 1200 }
];
}
liste() { if (!this._liste) { let l = []; try { l = JSON.parse(localStorage.getItem('krisiu-boilie-bestenliste') || '[]') || []; } catch (e) { l = []; } this._liste = Array.isArray(l) ? l : []; } return this._liste; }
listeSpeichern() { try { localStorage.setItem('krisiu-boilie-bestenliste', JSON.stringify(this._liste.slice(0, 60))); } catch (e) {} }
rangliste(level) {
const L = this.stufen()[level];
const echte = this.liste().filter((e) => e.level === level);
return echte.concat([{ id: 'krisiu-' + level, name: 'Krisiu', punkte: L.krisiu, level, datum: 'Vorgabe', dist: 0, krisiu: true }]).sort((a, b) => b.punkte - a.punkte);
}
renderVals() {
const s = this.state || {};
const phase = s.phase || 'start';
const r = s.erg || {};
const ST = this.stufen();
const level = s.level || 1;
const GRUND = { krabbe: 'Die Wollhandkrabbe hat zugezwickt.', hecht: 'Der Hecht war schneller.', wels: 'Der Wels hat dich verschluckt.', stein: 'Volle Kanne gegen den Stein.', ast: 'Im Ast hängen geblieben.', zig: 'Gehakt! Der Zig-Rig hat dich rausgezogen.', snowman: 'Gehakt! Snowman gefressen – ab in den Kescher.' };
const gehakt = r.grund === 'zig' || r.grund === 'snowman';
const teile = [];
if (r.boilies) teile.push(r.boilies + (r.boilies === 1 ? ' Boilie' : ' Boilies'));
if (r.larven) teile.push(r.larven + (r.larven === 1 ? ' Larve' : ' Larven'));
if (r.mais) teile.push(r.mais + ' Mais');
if (r.dosen) teile.push(r.dosen + (r.dosen === 1 ? ' Dose' : ' Dosen'));
if (r.extras) teile.push(r.extras + (r.extras === 1 ? ' Extra' : ' Extras'));
teile.push(Math.round((r.dist || 0) / 20) + ' m');
const bestVon = (lv) => { const e = this.liste().filter((x) => x.level === lv); return e.length ? Math.max(...e.map((x) => x.punkte)) : 0; };
const levels = [1, 2, 3].map((n) => { const L = ST[n], an = n === level, b = bestVon(n);
return { nr: n, name: L.name, sub: L.sub + ' · ×' + String(L.faktor).replace('.', ','), rekord: b ? 'Dein Rekord ' + b : 'Krisiu: ' + L.krisiu, an,
tipp: () => this.setState({ level: n }),
stil: 'display: flex; align-items: center; gap: 12px; width: 100%; min-height: 58px; box-sizing: border-box; padding: 8px 12px; border-radius: 12px; cursor: pointer; text-align: left; font: inherit; color: #ece8dc; ' + (an ? 'border: 2px solid #00FF5E; background: #0f2a18' : 'border: 1px solid #444444; background: #141414'),
badge: 'display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; flex: none; border-radius: 8px; font: 700 20px/1 \'Barlow Condensed\', sans-serif; ' + (an ? 'background: #00FF5E; color: #000000' : 'background: #2e2e2e; color: #ece8dc') };
});
const tab = s.tab || level;
const rl = this.rangliste(tab);
const liste = rl.slice(0, 10).map((e, k) => ({ platz: k + 1, name: e.name, punkte: e.punkte, info: e.krisiu ? 'Vorgabe von Krisiu' : (e.datum + ' · ' + Math.round((e.dist || 0) / 20) + ' m'),
stil: 'display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 6px 12px; border-top: ' + (k ? '1px solid #2e2e2e' : '0') + '; background: ' + (e.id === s.neuId ? '#0f2a18' : 'transparent'),
platzStil: "width: 26px; flex: none; font: 700 18px/1 'Barlow Condensed', sans-serif; color: " + (k === 0 ? '#ffd21e' : k === 1 ? '#d8dde2' : k === 2 ? '#d08a4a' : '#a39f93'),
nameStil: 'font-size: 15px; font-weight: 600; ' + (e.krisiu ? 'font-style: italic; color: #00FF5E' : '') }));
const tabs = [1, 2, 3].map((n) => ({ name: ST[n].kurz, an: n === tab, tipp: () => this.setState({ tab: n }),
stil: "flex: 1; height: 40px; padding: 0 6px; border-radius: 999px; cursor: pointer; white-space: nowrap; font: 700 15px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.04em; " + (n === tab ? 'border: 1px solid #00FF5E; background-color: #00FF5E; color: #000000' : 'border: 1px solid #444444; background: #141414; color: #ece8dc') }));
let platzText = '';
if (phase === 'aus' && r.platz) platzText = 'Platz ' + r.platz + ' von ' + r.von + ' · ' + ST[r.level].kurz + (r.vorKrisiu ? ' · vor Krisiu!' : '');
return {
canvasRef: (el) => { this._cv = el; if (el) this.zeichneStand(); },
druck: (e) => this.schwimm(e),
loslassen: () => { if (this._g) this._g.steuer = 0; },
hoch: (e) => this.steuern(e, -1), runter: (e) => this.steuern(e, 1),
istStart: phase === 'start', istLauf: phase === 'lauf', istPause: phase === 'pause', istAus: phase === 'aus', istListe: phase === 'liste', istRegeln: phase === 'regeln',
los: () => this.start(),
zurStart: () => this.setState({ phase: 'start' }),
zurListe: () => this.setState({ phase: 'liste', tab: (r.level || level) }),
zuRegeln: () => this.setState({ phase: 'regeln' }),
pause: () => { if (this._g) { this._g.pause = true; } this.stopLoop(); this.setState({ phase: 'pause' }); },
weiter: () => { this.setState({ phase: 'lauf' }); this._g.pause = false; this._g.last = 0; this.startLoop(); },
levels, liste, tabs, listeTitel: ST[tab].name,
levelText: 'Level ' + level + ' · ' + ST[level].name,
punkte: r.punkte || 0, statZeile: teile.join(' · ') + (r.level ? ' · ×' + String(ST[r.level].faktor).replace('.', ',') : ''),
grund: GRUND[r.grund] || '',
neuRekord: !!r.neu, platzText, hatPlatz: !!platzText,
nameWert: s.name === undefined ? 'Du' : s.name,
nameAendern: (e) => { const v = (e.target.value || '').slice(0, 14); const L = this.liste(); const x = L.find((q) => q.id === s.neuId); if (x) { x.name = v.trim() || 'Du'; this.listeSpeichern(); } this.setState({ name: v }); },
krisiu: gehakt ? 'Haha – jetzt weißt du, wie sich unsere Karpfen fühlen. Achte auf die Schnur!' : r.vorKrisiu ? 'Du hast mich geschlagen! Respekt – das erzähl ich am Wasser rum.' : r.neu ? 'Neuer Rekord! Ich sag’s keinem – oder doch, deinen Angelkollegen.' : (r.punkte || 0) < 150 ? 'Oha, das war kurz. Tief durchatmen, nochmal!' : 'Gar net schlecht! Noch eine Runde, bis sich was an den Ruten tut?'
};
}
componentDidMount() { this.zeichneStand(); }
componentWillUnmount() { this.stopLoop(); }
neuesSpiel() {
const cfg = this.stufen()[(this.state && this.state.level) || 1];
return { cfg, steuer: 0, extras: 0, y: 300, vy: 0, dist: 0, tempo: 150, objs: [], partikel: [], texte: [], naechstes: 320, boilies: 0, mais: 0, larven: 0, dosen: 0, t: 0, last: 0, aus: null, ausZeit: 0, maul: 0, pause: false, haken: null, runde: 0 };
}
start() {
this._g = this.neuesSpiel();
this.setState({ phase: 'lauf', erg: null, neuId: null });
this.startLoop();
}
startLoop() { this.stopLoop(); const tick = (ts) => { this._raf = requestAnimationFrame(tick); this.schritt(ts); }; this._raf = requestAnimationFrame(tick); }
stopLoop() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; }
schwimm(e) {
if (e && e.target && e.target.closest && e.target.closest('button, a')) return;
let richtung = -1;
if (e && e.currentTarget && e.currentTarget.getBoundingClientRect && e.clientY !== undefined) { const r = e.currentTarget.getBoundingClientRect(); richtung = (e.clientY - r.top) < r.height / 2 ? -1 : 1; }
this.steuern(e, richtung);
}
steuern(e, richtung) {
if (e && e.preventDefault) e.preventDefault();
const ph = (this.state && this.state.phase) || 'start';
if (ph === 'start') { this.start(); }
if (ph !== 'lauf' && ph !== 'start') return;
const g = this._g; if (!g || g.aus || g.pause) return;
g.steuer = richtung;
if (richtung < 0) { g.maul = 0.15; for (let i = 0; i < 2; i++) g.partikel.push({ x: 128, y: g.y - 4, vx: -20 - Math.random() * 30, vy: -30 - Math.random() * 40, r: 2 + Math.random() * 2.5, leben: 1.2 }); }
}
// ---------- Spielwelt ----------
spawn(g) {
const H = 650, BODEN = H - 46;
const x = 390 + 60;
g.runde++;
const arten = ['stein', 'ast', 'stein'];
if (g.dist > g.cfg.hechtAb) arten.push('hecht', 'hecht');
if (g.dist > g.cfg.welsAb) arten.push('wels');
if (g.dist > g.cfg.krabbeAb) arten.push('krabbe');
const art = arten[Math.floor(Math.random() * arten.length)];
let sicherY, steinX = null;
if (art === 'stein') {
const h = 50 + Math.random() * Math.min(150, 60 + g.dist / 40), w = 46 + Math.random() * 40;
const pts = []; const n = 7;
for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; pts.push([Math.cos(Math.PI - a) * w / 2 * (0.85 + Math.random() * 0.2), -Math.sin(a) * h * (0.8 + Math.random() * 0.25)]); }
g.objs.push({ art, x, w, h, pts, y: BODEN }); steinX = x;
sicherY = 80 + Math.random() * (BODEN - h - 140);
} else if (art === 'ast') {
const len = 70 + Math.random() * Math.min(g.cfg.astMax, 40 + g.dist / 50);
const neig = (Math.random() - 0.5) * 0.5;
const zweige = [];
for (let i = 0; i < 3; i++) { const t = 0.3 + i * 0.22 + Math.random() * 0.08; zweige.push({ t, a: (i % 2 ? 1 : -1) * (0.6 + Math.random() * 0.5), l: 14 + Math.random() * 18 }); }
g.objs.push({ art, x, len, neig, zweige, y: 14 });
sicherY = Math.min(BODEN - 60, len + 80 + Math.random() * Math.max(10, BODEN - len - 160));
} else if (art === 'hecht') {
const y = 90 + Math.random() * (BODEN - 180);
g.objs.push({ art, x: x + 30, y, eigen: 70 + Math.random() * 60, phase: Math.random() * 6 });
sicherY = y < BODEN / 2 ? y + 150 + Math.random() * 60 : y - 150 - Math.random() * 60;
sicherY = Math.max(70, Math.min(BODEN - 60, sicherY));
} else if (art === 'krabbe') {
g.objs.push({ art, x, y: BODEN - 9, start: x, phase: Math.random() * 6, weite: 30 + Math.random() * 30 });
sicherY = 90 + Math.random() * (BODEN - 260);
} else {
const y = BODEN - 60 - Math.random() * 180;
g.objs.push({ art, x: x + 90, y, eigen: 25 + Math.random() * 25, phase: Math.random() * 6 });
sicherY = Math.max(70, y - 170 - Math.random() * 60);
}
// Futter und Fallen hinter dem Hindernis
const gx = x + 160 + Math.random() * 30;
const fallen = g.dist > g.cfg.fallenAb && Math.random() < Math.min(g.cfg.fallenMax, 0.25 + g.dist / 9000);
const amBoden = art !== 'wels' && art !== 'krabbe' && (g.runde % 2 === 0 || art === 'ast');
if (Math.random() < 0.22 && art !== 'krabbe') g.objs.push({ art: Math.random() < 0.5 ? 'schnecke' : 'muschel', x: gx + 70 + Math.random() * 40, y: BODEN - 7 });
if (Math.random() < 0.1) g.objs.push({ art: 'dose', x: gx, y: sicherY, ph: Math.random() * 6 });
else if (amBoden) {
if (Math.random() < 0.55) { const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) g.objs.push({ art: 'boilie', x: gx + i * 26 - n * 13 + Math.random() * 6, y: BODEN - 8, rot: Math.random() < 0.3, ph: 0, boden: true }); }
else { const n = 4 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) g.objs.push({ art: 'mais', x: gx + i * 13 - n * 6 + Math.random() * 6, y: BODEN - 5 - Math.random() * 3, rot: Math.random() * 3 }); }
if (fallen) g.objs.push({ art: 'snowman', x: gx + 90 + Math.random() * 30, y: BODEN - 10 });
} else {
const n = 2 + Math.floor(Math.random() * 2);
for (let i = 0; i < n; i++) g.objs.push({ art: 'larve', x: gx + i * 34, y: sicherY + (Math.random() - 0.5) * 30, ph: Math.random() * 6 });
if (fallen) g.objs.push({ art: 'zig', x: gx + n * 34 + 40 + Math.random() * 30, y: Math.max(80, Math.min(BODEN - 70, sicherY + (Math.random() - 0.5) * 60)) });
}
g.naechstes = g.dist + 250 + Math.random() * 120 - Math.min(70, g.dist / 120);
}
schritt(ts) {
const g = this._g; if (!g || g.pause) return;
if (!g.last) g.last = ts;
let dt = (ts - g.last) / 1000; g.last = ts; if (dt > 0.05) dt = 0.05;
const H = 650, BODEN = H - 46, KX = 104;
g.t += dt;
if (g.aus) {
g.ausZeit += dt;
if (g.haken) { g.vy = Math.max(-520, g.vy - 900 * dt); g.y += g.vy * dt; }
else { g.vy += 300 * dt; g.y = Math.min(BODEN - 14, g.y + g.vy * dt); }
this.zeichne(g);
if (g.ausZeit > (g.haken ? 1.3 : 0.9)) {
this.stopLoop();
const punkte = this.punkte(g); const lv = g.cfg.nr;
const vorher = this.liste().filter((e) => e.level === lv); const alt = vorher.length ? Math.max(...vorher.map((e) => e.punkte)) : 0;
const d = new Date(); const datum = String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.';
const st = this.state || {}; const id = 'r' + Date.now();
this.liste().push({ id, name: (st.name || 'Du').trim() || 'Du', punkte, level: lv, datum, dist: Math.round(g.dist), grund: g.aus });
this._liste.sort((a, b) => b.punkte - a.punkte); this.listeSpeichern();
const rl = this.rangliste(lv); const platz = rl.findIndex((e) => e.id === id) + 1;
const vorKrisiu = punkte > g.cfg.krisiu;
this.setState({ phase: 'aus', neuId: id, erg: { punkte, boilies: g.boilies, mais: g.mais, larven: g.larven, dosen: g.dosen, extras: g.extras, dist: g.dist, grund: g.aus, neu: punkte > alt && alt > 0, level: lv, platz, von: rl.length, vorKrisiu } });
}
return;
}
g.tempo = Math.min(g.cfg.tMax, g.cfg.t0 + g.dist / g.cfg.rate);
const dx = g.tempo * dt; g.dist += dx;
const zielV = g.steuer < 0 ? -250 : g.steuer > 0 ? 270 : 28;
g.vy += (zielV - g.vy) * Math.min(1, dt * 7); g.y += g.vy * dt;
if (g.y < 34) { g.y = 34; g.vy = Math.max(0, g.vy); }
if (g.y > BODEN - 14) { g.y = BODEN - 14; g.vy = 0; }
g.maul = Math.max(0, g.maul - dt);
if (g.dist >= g.naechstes) this.spawn(g);
const keep = [];
const PUNKTE = { boilie: 10, mais: 5, larve: 15, dose: 50, schnecke: 20, muschel: 25 };
for (const o of g.objs) {
o.x -= dx;
if (o.art === 'krabbe') { o.x = o.x + Math.cos(g.t * 2.2 + o.phase) * o.weite * 2.2 * dt; }
if (o.art === 'hecht' || o.art === 'wels') { o.x -= o.eigen * dt; o.y += Math.sin(g.t * (o.art === 'wels' ? 1.2 : 2) + o.phase) * 14 * dt; }
if (o.x < -220) continue;
const maulX = KX + 44;
if (PUNKTE[o.art]) {
const r = o.art === 'dose' ? 18 : o.art === 'mais' ? 9 : 12;
if (Math.abs(o.x - maulX) < r + 10 && Math.abs(o.y - g.y) < r + 8) {
const p = PUNKTE[o.art];
if (o.art === 'dose') { g.dosen++; g.texte.push({ x: o.x, y: o.y - 10, t: '+50 MAIS!', leben: 1.1, gelb: true }); }
else if (o.art === 'boilie') { g.boilies++; g.texte.push({ x: o.x, y: o.y - 12, t: '+10', leben: 0.8 }); }
else if (o.art === 'mais') { g.mais++; g.texte.push({ x: o.x, y: o.y - 12, t: '+5', leben: 0.6, gelb: true }); }
else if (o.art === 'larve') { g.larven++; g.texte.push({ x: o.x, y: o.y - 10, t: '+15', leben: 0.8 }); }
else { g.extras++; g.extrapunkte = (g.extrapunkte || 0) + p; g.texte.push({ x: o.x, y: o.y - 14, t: o.art === 'schnecke' ? '+20 SCHNECKE' : '+25 MUSCHEL', leben: 1.1, gelb: true }); }
g.maul = 0.25;
for (let i = 0; i < 4; i++) g.partikel.push({ x: o.x, y: o.y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, r: 1.5 + Math.random() * 2, leben: 0.6, krumen: true, rot: o.art === 'larve' || o.rot === true, gelb: o.art === 'mais' });
continue;
}
} else if (o.art === 'zig' || o.art === 'snowman') {
const by = o.art === 'snowman' ? o.y - 8 : o.y;
if (Math.abs(o.x - maulX) < 18 && Math.abs(by - g.y) < 16) { g.aus = o.art; g.haken = { x: o.x, lx: o.art === 'snowman' ? o.x - 170 : o.x + 40 }; g.vy = -120; o.weg = true; g.maul = 1; }
} else if (this.kollision(o, g.y, KX, BODEN)) { g.aus = o.art; g.vy = -60; }
if (!o.weg) keep.push(o);
}
g.objs = keep;
for (const p of g.partikel) { p.x += (p.vx - (p.krumen ? 0 : g.tempo * 0.2)) * dt; p.y += p.vy * dt; if (!p.krumen) p.vy -= 20 * dt; p.leben -= dt; }
g.partikel = g.partikel.filter((p) => p.leben > 0 && p.y > 8);
if (Math.random() < dt * 1.4) g.partikel.push({ x: KX + 58, y: g.y - 3, vx: -10, vy: -40, r: 1.6 + Math.random() * 2, leben: 1.6 });
for (const t of g.texte) { t.y -= 40 * dt; t.leben -= dt; }
g.texte = g.texte.filter((t) => t.leben > 0);
this.zeichne(g);
}
punkte(g) { return Math.round((Math.floor(g.dist / 20) + g.boilies * 10 + g.mais * 5 + g.larven * 15 + g.dosen * 50 + (g.extrapunkte || 0)) * (g.cfg ? g.cfg.faktor : 1)); }
kollision(o, y, KX, BODEN) {
const k = this._g && this._g.cfg ? this._g.cfg.groesse / 1.2 : 1; const kreise = [[KX + 18 + 24 * k, y, 12 * k], [KX + 18 - 6 * k, y, 12 * k]];
const inRect = (cx, cy, r, x0, y0, x1, y1) => { const nx = Math.max(x0, Math.min(cx, x1)), ny = Math.max(y0, Math.min(cy, y1)); return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r; };
const zuSeg = (cx, cy, r, ax, ay, bx, by, dicke) => { const vx = bx - ax, vy = by - ay; const t = Math.max(0, Math.min(1, ((cx - ax) * vx + (cy - ay) * vy) / (vx * vx + vy * vy))); const px = ax + t * vx, py = ay + t * vy; return (cx - px) ** 2 + (cy - py) ** 2 < (r + dicke) ** 2; };
for (const [cx, cy, r] of kreise) {
if (o.art === 'stein') { if (inRect(cx, cy, r - 3, o.x - o.w / 2 + 6, BODEN - o.h + 8, o.x + o.w / 2 - 6, BODEN)) return true; }
else if (o.art === 'ast') {
const ex = o.x + o.neig * o.len, ey = o.y + o.len;
if (zuSeg(cx, cy, r, o.x, o.y, ex, ey, 5)) return true;
for (const z of o.zweige) { const ax = o.x + o.neig * o.len * z.t, ay = o.y + o.len * z.t; if (zuSeg(cx, cy, r, ax, ay, ax + Math.sin(z.a) * z.l, ay + Math.cos(z.a) * z.l * 0.6, 2)) return true; }
} else if (o.art === 'hecht') { if (inRect(cx, cy, r - 2, o.x - 44, o.y - 7, o.x + 40, o.y + 7)) return true; }
else if (o.art === 'wels') { if (inRect(cx, cy, r - 2, o.x - 72, o.y - 13, o.x + 70, o.y + 12)) return true; }
else if (o.art === 'krabbe') { if (inRect(cx, cy, r - 2, o.x - 22, BODEN - 26, o.x + 22, BODEN)) return true; }
}
return false;
}
// ---------- Zeichnen ----------
ctx() {
const cv = this._cv; if (!cv) return null;
const dpr = Math.min(2, window.devicePixelRatio || 1);
if (cv.width !== 390 * dpr) { cv.width = 390 * dpr; cv.height = 650 * dpr; }
const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return c;
}
zeichneStand() {
const ph = (this.state && this.state.phase) || 'start';
if (this._g && ph !== 'start') { this.zeichne(this._g); return; }
const g = this.neuesSpiel(); g.y = 330;
g.objs = [{ art: 'stein', x: 300, w: 70, h: 90, y: 604, pts: [[-35, 0], [-32, -40], [-20, -76], [0, -88], [18, -80], [31, -48], [35, 0]] },
{ art: 'dose', x: 150, y: 200, ph: 0 }, { art: 'larve', x: 220, y: 300, ph: 0 }, { art: 'larve', x: 256, y: 290, ph: 2 },
{ art: 'boilie', x: 120, y: 596, boden: true }, { art: 'boilie', x: 146, y: 596, rot: true, boden: true }, { art: 'schnecke', x: 250, y: 597 }, { art: 'mais', x: 190, y: 598, rot: 1 }, { art: 'mais', x: 202, y: 597, rot: 2 },
{ art: 'ast', x: 360, y: 14, len: 150, neig: -0.15, zweige: [{ t: 0.35, a: -0.9, l: 34 }, { t: 0.6, a: 0.8, l: 28 }, { t: 0.82, a: -0.7, l: 22 }] }];
this.zeichne(g, true);
}
zeichne(g, still) {
const c = this.ctx(); if (!c) return;
const W = 390, H = 650, BODEN = H - 46, KX = 104;
const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#12403a'); gr.addColorStop(0.45, '#0b2a26'); gr.addColorStop(1, '#050f0d');
c.fillStyle = gr; c.fillRect(0, 0, W, H);
c.save(); c.globalCompositeOperation = 'lighter';
for (let i = 0; i < 4; i++) { const x0 = ((i * 140 - g.dist * 0.15) % 560 + 560) % 560 - 80; c.fillStyle = 'rgba(120,200,170,0.045)'; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + 60, 0); c.lineTo(x0 + 160, H); c.lineTo(x0 + 70, H); c.fill(); }
c.restore();
c.fillStyle = 'rgba(200,240,220,0.10)'; c.fillRect(0, 0, W, 14);
c.strokeStyle = 'rgba(210,245,230,0.45)'; c.lineWidth = 2; c.beginPath();
for (let x = 0; x <= W; x += 6) { const y = 14 + Math.sin((x + g.dist * 0.6) / 22 + g.t * 2) * 2.2; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
c.fillStyle = '#0a2219';
for (let i = 0; i < 9; i++) { const bx = ((i * 61 - g.dist * 0.35) % 549 + 549) % 549 - 40, hh = 40 + (i * 37 % 50); c.beginPath(); c.moveTo(bx, BODEN); c.quadraticCurveTo(bx + 8 + Math.sin(g.t * 1.4 + i) * 6, BODEN - hh * 0.6, bx + 4 + Math.sin(g.t * 1.4 + i) * 9, BODEN - hh); c.quadraticCurveTo(bx + 14, BODEN - hh * 0.5, bx + 12, BODEN); c.fill(); }
c.fillStyle = '#1c170e'; c.fillRect(0, BODEN, W, H - BODEN);
c.fillStyle = '#2a2215'; c.beginPath(); c.moveTo(0, BODEN);
for (let x = 0; x <= W; x += 10) c.lineTo(x, BODEN + Math.sin((x + g.dist) / 31) * 2.5); c.lineTo(W, BODEN + 10); c.lineTo(0, BODEN + 10); c.fill();
c.fillStyle = '#3a3122';
for (let i = 0; i < 26; i++) { const px = ((i * 47 - g.dist) % 1222 + 1222) % 1222 - 20; const py = BODEN + 14 + (i * 13 % 26); c.beginPath(); c.ellipse(px % (W + 40), py, 3 + i % 3, 2, 0, 0, Math.PI * 2); c.fill(); }
for (const o of g.objs) {
if (o.art === 'stein') this.stein(c, o, BODEN);
else if (o.art === 'ast') this.ast(c, o, g.t);
else if (o.art === 'hecht') this.hecht(c, o, g.t);
else if (o.art === 'wels') this.wels(c, o, g.t);
else if (o.art === 'boilie') this.boilie(c, o.x, o.boden ? o.y : o.y + Math.sin(g.t * 3 + o.ph) * 2.5, o.rot);
else if (o.art === 'mais') this.mais(c, o.x, o.y, o.rot);
else if (o.art === 'larve') this.larve(c, o.x, o.y + Math.sin(g.t * 2 + o.ph) * 4, g.t + o.ph);
else if (o.art === 'dose') this.dose(c, o.x, o.y + Math.sin(g.t * 2.5 + o.ph) * 3, g.t);
else if (o.art === 'zig') this.zig(c, o, BODEN, g.t);
else if (o.art === 'snowman') this.snowman(c, o, BODEN);
else if (o.art === 'krabbe') this.krabbe(c, o, BODEN, g.t);
else if (o.art === 'schnecke') this.schnecke(c, o.x, o.y);
else if (o.art === 'muschel') this.muschel(c, o.x, o.y, g.t);
}
for (const p of g.partikel) {
if (p.krumen) { const a = Math.min(1, p.leben * 2); c.fillStyle = p.gelb ? 'rgba(255,214,60,' + a + ')' : p.rot ? 'rgba(200,80,60,' + a + ')' : 'rgba(225,180,110,' + a + ')'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
else { c.strokeStyle = 'rgba(200,240,230,' + Math.min(0.7, p.leben * 0.5) + ')'; c.lineWidth = 1.2; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.stroke(); }
}
if (g.haken) { c.strokeStyle = 'rgba(235,235,225,0.85)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(KX + 50, g.y + 2); c.lineTo(g.haken.lx, -10); c.stroke(); }
const kipp = g.haken ? -0.9 - Math.sin(g.ausZeit * 25) * 0.15 : g.aus ? Math.PI * Math.min(1, g.ausZeit * 1.6) * 0.9 : Math.max(-0.4, Math.min(0.4, g.vy / 700));
this.karpfen(c, KX + 18, g.y, kipp, g.t, g.maul > 0, !!g.aus && !g.haken, g.cfg ? g.cfg.groesse : 1.2);
c.textAlign = 'center';
for (const t of g.texte) { c.font = '700 ' + (t.gelb && t.t.length > 3 ? 20 : 18) + "px 'Barlow Condensed', sans-serif"; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.strokeText(t.t, t.x, t.y); c.fillStyle = t.gelb ? '#ffd23f' : '#00FF5E'; c.globalAlpha = Math.min(1, t.leben * 2); c.fillText(t.t, t.x, t.y); c.globalAlpha = 1; }
if (g.haken && g.ausZeit > 0.15) { c.font = "700 40px 'Barlow Condensed', sans-serif"; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,0.8)'; c.strokeText('GEHAKT!', W / 2, 250); c.fillStyle = '#ff1e1e'; c.fillText('GEHAKT!', W / 2, 250); }
if (!still) {
c.textAlign = 'left'; c.font = "700 15px 'Barlow Condensed', sans-serif"; c.fillStyle = '#a39f93'; c.fillText('PUNKTE', 16, 42);
c.font = "700 34px 'Barlow Condensed', sans-serif"; c.fillStyle = '#ece8dc'; c.fillText(String(this.punkte(g)), 16, 74);
if (g.cfg) { c.font = "700 13px 'Barlow Condensed', sans-serif"; c.fillStyle = '#00FF5E'; c.fillText('LEVEL ' + g.cfg.nr + ' · ' + g.cfg.kurz.toUpperCase() + (g.cfg.faktor > 1 ? ' · ×' + String(g.cfg.faktor).replace('.', ',') : ''), 16, 124); }
c.font = "700 16px 'Barlow Condensed', sans-serif";
this.boilie(c, 22, 94, false); c.fillStyle = '#ece8dc'; c.fillText(String(g.boilies), 34, 100);
this.larve(c, 66, 94, 0, 0.8); c.fillStyle = '#ece8dc'; c.fillText(String(g.larven), 80, 100);
this.mais(c, 108, 95, 0); c.fillStyle = '#ece8dc'; c.fillText(String(g.mais), 118, 100);
this.dose(c, 148, 94, 0, 0.55); c.fillStyle = '#ece8dc'; c.fillText(String(g.dosen), 158, 100);
}
if (g.aus) { c.fillStyle = 'rgba(255,30,30,' + Math.max(0, 0.35 - g.ausZeit * 0.4) + ')'; c.fillRect(0, 0, W, H); }
}
boilie(c, x, y, rot) {
c.fillStyle = rot ? '#b8473a' : '#d9a35f'; c.beginPath(); c.arc(x, y, 7.5, 0, 7); c.fill();
c.fillStyle = rot ? '#7c2a22' : '#9c6a32'; for (const [a, b] of [[-3, -1], [2, 3], [3, -3], [-1, 4]]) { c.beginPath(); c.arc(x + a, y + b, 0.9, 0, 7); c.fill(); }
c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(x - 2.5, y - 2.8, 2, 0, 7); c.fill();
}
mais(c, x, y, rot) {
c.save(); c.translate(x, y); c.rotate(rot || 0);
c.fillStyle = '#f5c518'; c.beginPath(); c.moveTo(-4, 3.5); c.quadraticCurveTo(-5, -4, 0, -5); c.quadraticCurveTo(5, -4, 4, 3.5); c.closePath(); c.fill();
c.fillStyle = '#fff3a8'; c.beginPath(); c.ellipse(-1, -1.5, 1.4, 2, 0, 0, 7); c.fill();
c.fillStyle = '#c99a0a'; c.fillRect(-3, 2.5, 6, 1.5);
c.restore();
}
larve(c, x, y, t, s) {
s = s || 1; c.save(); c.translate(x, y); c.scale(s, s);
c.strokeStyle = '#c4382c'; c.lineWidth = 3.6; c.lineCap = 'round'; c.beginPath();
for (let i = 0; i <= 8; i++) { const px = -9 + i * 2.25, py = Math.sin(i * 0.9 + t * 7) * 2.6; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
c.strokeStyle = 'rgba(255,170,150,0.6)'; c.lineWidth = 1; for (let i = 1; i < 8; i += 2) { const px = -9 + i * 2.25, py = Math.sin(i * 0.9 + t * 7) * 2.6; c.beginPath(); c.moveTo(px, py - 1.8); c.lineTo(px, py + 1.8); c.stroke(); }
c.fillStyle = '#3a1410'; c.beginPath(); c.arc(9.5, Math.sin(8 * 0.9 + t * 7) * 2.6, 1.8, 0, 7); c.fill();
c.restore();
}
zig(c, o, BODEN, t) {
// Schnur vom Blei nach oben zum Köder
c.strokeStyle = 'rgba(225,225,215,0.38)'; c.lineWidth = 1; c.beginPath(); c.moveTo(o.x - 2, o.y + 3); c.lineTo(o.x + 4, BODEN - 6); c.stroke();
c.fillStyle = '#55575a'; c.beginPath(); c.ellipse(o.x + 4, BODEN - 4, 5, 7, 0.2, 0, 7); c.fill();
// Köder: Schaum, ähnlich einer Larve, aber steif
c.save(); c.translate(o.x, o.y + Math.sin(t * 1.5 + o.x) * 1.5);
c.fillStyle = '#c4382c'; c.beginPath(); c.ellipse(0, 0, 9, 3.4, 0, 0, 7); c.fill();
c.fillStyle = '#1b1b1b'; c.fillRect(-3.5, -3.4, 2.4, 6.8); c.fillRect(2.5, -3.4, 2.4, 6.8);
c.strokeStyle = '#d8dde2'; c.lineWidth = 1.3; c.beginPath(); c.arc(-2, 6, 3, 0.2, Math.PI * 1.2); c.stroke();
c.restore();
}
snowman(c, o, BODEN) {
// Hauptschnur schräg zur Oberfläche (Richtung Ufer)
c.strokeStyle = 'rgba(225,225,215,0.38)'; c.lineWidth = 1; c.beginPath(); c.moveTo(o.x + 18, BODEN - 4); c.lineTo(o.x - 170, 0); c.stroke();
c.beginPath(); c.moveTo(o.x + 18, BODEN - 4); c.quadraticCurveTo(o.x + 8, BODEN - 1, o.x + 2, o.y + 2); c.stroke();
c.fillStyle = '#55575a'; c.beginPath(); c.ellipse(o.x + 20, BODEN - 4, 7, 4.5, 0, 0, 7); c.fill();
this.boilie(c, o.x, o.y, false);
c.fillStyle = '#ffd9ef'; c.beginPath(); c.arc(o.x, o.y - 12, 5.6, 0, 7); c.fill();
c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(o.x - 2, o.y - 14, 1.6, 0, 7); c.fill();
c.strokeStyle = '#d8dde2'; c.lineWidth = 1.4; c.beginPath(); c.arc(o.x - 7, o.y + 2, 3.2, -0.6, Math.PI * 0.9); c.stroke();
}
dose(c, x, y, t, s) {
s = s || 1; c.save(); c.translate(x, y); c.scale(s, s);
if (s === 1) { c.strokeStyle = 'rgba(255,210,63,' + (0.35 + Math.sin(t * 5) * 0.2) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 24 + Math.sin(t * 5) * 2, 0, 7); c.stroke(); }
const gr = c.createLinearGradient(-11, 0, 11, 0); gr.addColorStop(0, '#8d9399'); gr.addColorStop(0.45, '#e6eaee'); gr.addColorStop(1, '#7d838a');
c.fillStyle = gr; c.fillRect(-11, -15, 22, 30);
c.fillStyle = '#f5c518'; c.fillRect(-11, -8, 22, 16);
c.fillStyle = '#2f7d32'; c.beginPath(); c.moveTo(-9, 8); c.quadraticCurveTo(-2, -2, 6, -7); c.quadraticCurveTo(0, 3, -9, 8); c.fill();
c.fillStyle = '#ffe680'; for (const [a, b] of [[2, 1], [6, 3], [4, -2], [-3, 3]]) { c.beginPath(); c.ellipse(a, b, 1.6, 2, 0, 0, 7); c.fill(); }
c.fillStyle = '#5f646a'; c.fillRect(-11, -16, 22, 2.5); c.fillRect(-11, 13.5, 22, 2.5);
c.restore();
}
stein(c, o, BODEN) {
c.save(); c.translate(o.x, BODEN + 2);
const gr = c.createLinearGradient(0, -o.h, 0, 0); gr.addColorStop(0, '#77756c'); gr.addColorStop(1, '#3d3c37');
c.fillStyle = gr; c.beginPath(); o.pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.closePath(); c.fill();
c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; c.stroke();
c.fillStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); c.ellipse(-o.w * 0.12, -o.h * 0.68, o.w * 0.16, o.h * 0.1, -0.4, 0, 7); c.fill();
c.fillStyle = 'rgba(60,110,50,0.55)'; c.beginPath(); c.ellipse(o.w * 0.15, -o.h * 0.35, o.w * 0.12, o.h * 0.07, 0.3, 0, 7); c.fill();
c.restore();
}
ast(c, o, t) {
const ex = o.x + o.neig * o.len, ey = o.y + o.len;
c.strokeStyle = '#4a3420'; c.lineCap = 'round'; c.lineWidth = 11; c.beginPath(); c.moveTo(o.x - o.neig * 20, o.y - 20); c.lineTo(ex, ey); c.stroke();
c.strokeStyle = '#6b4c2e'; c.lineWidth = 4; c.beginPath(); c.moveTo(o.x - 2, o.y); c.lineTo(ex - 2, ey); c.stroke();
c.strokeStyle = '#4a3420'; c.lineWidth = 4;
for (const z of o.zweige) { const ax = o.x + o.neig * o.len * z.t, ay = o.y + o.len * z.t; const bx = ax + Math.sin(z.a) * z.l, by = ay + Math.cos(z.a) * z.l * 0.6; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
c.fillStyle = '#2f4a22'; c.beginPath(); c.ellipse(bx, by, 6, 3, z.a + Math.sin(t * 2 + z.t * 9) * 0.2, 0, 7); c.fill(); }
}
hecht(c, o, t) {
c.save(); c.translate(o.x, o.y);
const s = Math.sin(t * 10 + o.phase) * 4;
c.fillStyle = '#4c5f2a'; c.beginPath(); c.moveTo(38, 0); c.lineTo(56, -11 + s); c.lineTo(51, 0); c.lineTo(56, 11 + s); c.closePath(); c.fill();
c.fillStyle = '#b5762e'; c.beginPath(); c.moveTo(18, -6); c.lineTo(32, -13); c.lineTo(32, -5); c.fill(); c.beginPath(); c.moveTo(18, 6); c.lineTo(32, 13); c.lineTo(32, 5); c.fill();
const gr = c.createLinearGradient(0, -10, 0, 10); gr.addColorStop(0, '#3c5222'); gr.addColorStop(0.6, '#6f8a3a'); gr.addColorStop(1, '#d9dcb0');
c.fillStyle = gr; c.beginPath(); c.moveTo(-48, 1); c.quadraticCurveTo(-36, -9, -10, -9); c.quadraticCurveTo(24, -9, 40, -2); c.lineTo(40, 2); c.quadraticCurveTo(24, 9, -10, 9); c.quadraticCurveTo(-36, 8, -48, 3); c.closePath(); c.fill();
c.fillStyle = 'rgba(230,235,170,0.55)'; for (const [a, b] of [[-14, -3], [-2, -5], [8, -2], [18, -4], [26, 0], [-6, 1], [12, 3]]) { c.beginPath(); c.ellipse(a, b, 2.2, 1.3, 0, 0, 7); c.fill(); }
c.strokeStyle = '#1f2a12'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-48, 2); c.lineTo(-32, 3); c.stroke();
c.fillStyle = '#f4f1e8'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-45 + i * 4, 2); c.lineTo(-43.5 + i * 4, 4.5); c.lineTo(-42 + i * 4, 2); c.fill(); }
c.fillStyle = '#f2d34a'; c.beginPath(); c.arc(-33, -2.5, 3, 0, 7); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.arc(-33.6, -2.5, 1.6, 0, 7); c.fill();
c.restore();
}
wels(c, o, t) {
c.save(); c.translate(o.x, o.y);
const s = Math.sin(t * 4 + o.phase) * 5;
// Schwanz und lange Afterflosse
c.fillStyle = '#2c2c24'; c.beginPath(); c.moveTo(66, -2); c.quadraticCurveTo(84, -10 + s, 86, 2 + s); c.quadraticCurveTo(82, 12 + s, 66, 6); c.fill();
c.beginPath(); c.moveTo(-10, 10); c.quadraticCurveTo(30, 22 + s * 0.4, 68, 6); c.lineTo(66, 2); c.quadraticCurveTo(30, 12, -10, 8); c.fill();
// Körper
const gr = c.createLinearGradient(0, -16, 0, 14); gr.addColorStop(0, '#26261f'); gr.addColorStop(0.6, '#4b4a3c'); gr.addColorStop(1, '#a9a58f');
c.fillStyle = gr; c.beginPath(); c.moveTo(-74, 2); c.quadraticCurveTo(-72, -14, -48, -16); c.quadraticCurveTo(10, -17, 68, -3); c.lineTo(68, 4); c.quadraticCurveTo(10, 14, -48, 13); c.quadraticCurveTo(-72, 12, -74, 2); c.closePath(); c.fill();
c.fillStyle = 'rgba(0,0,0,0.25)'; for (const [a, b] of [[-30, -8], [-8, -10], [14, -7], [36, -5], [-20, 2], [6, 0]]) { c.beginPath(); c.ellipse(a, b, 4, 2.4, 0, 0, 7); c.fill(); }
// Brustflosse, kleine Rückenflosse
c.fillStyle = '#3a3930'; c.beginPath(); c.moveTo(-44, 8); c.quadraticCurveTo(-36, 20 + s * 0.3, -30, 10); c.fill(); c.beginPath(); c.moveTo(-26, -15); c.lineTo(-18, -24); c.lineTo(-14, -15); c.fill();
// Maul und Barteln
c.strokeStyle = '#141410'; c.lineWidth = 2; c.beginPath(); c.moveTo(-74, 3); c.quadraticCurveTo(-64, 8, -54, 6); c.stroke();
c.strokeStyle = '#2a2a22'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-66, -4); c.quadraticCurveTo(-92, -18 + s, -104, -6 + s); c.moveTo(-66, -3); c.quadraticCurveTo(-88, 6 - s, -98, 14 - s); c.stroke();
c.lineWidth = 1.2; c.beginPath(); c.moveTo(-68, 8); c.lineTo(-76, 16); c.moveTo(-64, 9); c.lineTo(-68, 18); c.stroke();
c.fillStyle = '#d8d2a8'; c.beginPath(); c.arc(-60, -6, 2.2, 0, 7); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.arc(-60.4, -6, 1.1, 0, 7); c.fill();
c.restore();
}
schnecke(c, x, y) {
c.fillStyle = '#8f7a5a'; c.beginPath(); c.moveTo(x - 12, y + 6); c.quadraticCurveTo(x - 2, y + 3, x + 12, y + 6); c.lineTo(x + 14, y + 7); c.lineTo(x - 13, y + 7); c.fill();
c.strokeStyle = '#8f7a5a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x + 10, y + 4); c.lineTo(x + 13, y - 2); c.moveTo(x + 8, y + 4); c.lineTo(x + 9, y - 2); c.stroke();
const gr = c.createRadialGradient(x - 2, y - 3, 1, x, y, 10); gr.addColorStop(0, '#e2b778'); gr.addColorStop(1, '#7a4c22');
c.fillStyle = gr; c.beginPath(); c.arc(x, y, 8.5, 0, 7); c.fill();
c.strokeStyle = '#4e2e12'; c.lineWidth = 1.4; c.beginPath();
for (let a = 0; a < 10; a += 0.3) { const r = 7.5 - a * 0.7; if (r < 0.6) break; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; a ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
}
muschel(c, x, y, t) {
c.save(); c.translate(x, y); c.rotate(-0.15);
const gr = c.createLinearGradient(0, -7, 0, 7); gr.addColorStop(0, '#5a6b78'); gr.addColorStop(0.5, '#25303a'); gr.addColorStop(1, '#141a20');
c.fillStyle = gr; c.beginPath(); c.ellipse(0, 0, 13, 6.5, 0, 0, 7); c.fill();
c.strokeStyle = 'rgba(200,220,235,0.35)'; c.lineWidth = 1; for (let i = 1; i <= 3; i++) { c.beginPath(); c.ellipse(-4, 1, 3 * i, 1.6 * i, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
c.fillStyle = 'rgba(210,235,255,' + (0.35 + Math.sin(t * 4) * 0.2) + ')'; c.beginPath(); c.ellipse(4, -3, 3, 1.2, -0.3, 0, 7); c.fill();
c.restore();
}
krabbe(c, o, BODEN, t) {
const x = o.x, y = BODEN - 8, s = Math.sin(t * 14 + o.phase);
c.save(); c.translate(x, y); c.scale(1.35, 1.35); c.translate(-x, -y);
c.strokeStyle = '#5a4a2a'; c.lineWidth = 2; c.lineCap = 'round';
for (let i = 0; i < 4; i++) { const dx = -6 + i * 4, k = (i % 2 ? s : -s) * 2; c.beginPath(); c.moveTo(x + dx - 4, y + 2); c.lineTo(x + dx - 12, y - 2 + k); c.lineTo(x + dx - 14, y + 8); c.moveTo(x + dx + 4, y + 2); c.lineTo(x + dx + 12, y - 2 - k); c.lineTo(x + dx + 14, y + 8); c.stroke(); }
// Scheren mit Haar-„Handschuhen"
c.strokeStyle = '#6e5a30'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 8, y - 3); c.lineTo(x - 16, y - 11); c.moveTo(x + 8, y - 3); c.lineTo(x + 16, y - 11); c.stroke();
c.fillStyle = '#2b2416'; c.beginPath(); c.ellipse(x - 18, y - 13, 5, 4, -0.5, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + 18, y - 13, 5, 4, 0.5, 0, 7); c.fill();
c.fillStyle = '#e9ddb0'; c.beginPath(); c.ellipse(x - 21, y - 16 + s, 2.4, 1.6, -0.5, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + 21, y - 16 - s, 2.4, 1.6, 0.5, 0, 7); c.fill();
const gr = c.createLinearGradient(0, y - 10, 0, y + 6); gr.addColorStop(0, '#8a7340'); gr.addColorStop(1, '#4a3c1e');
c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, 11, 8, 0, 0, 7); c.fill();
c.fillStyle = '#000'; c.beginPath(); c.arc(x - 4, y - 8, 1.6, 0, 7); c.arc(x + 4, y - 8, 1.6, 0, 7); c.fill();
c.restore();
}
karpfen(c, x, y, kipp, t, maulAuf, aus, skala) {
skala = skala || 1.2;
c.save(); c.translate(x, y); c.rotate(kipp); c.scale(skala, skala);
const w = aus ? 0 : Math.sin(t * 9) * 6;
c.fillStyle = '#9a5f22'; c.beginPath(); c.moveTo(-30, 0); c.quadraticCurveTo(-42, -4 + w * 0.3, -50, -15 + w); c.quadraticCurveTo(-44, 0, -50, 15 + w); c.quadraticCurveTo(-42, 4 + w * 0.3, -30, 0); c.fill();
c.fillStyle = '#8a541c'; c.beginPath(); c.moveTo(-14, -11); c.quadraticCurveTo(-6, -22, 12, -14); c.lineTo(10, -10); c.closePath(); c.fill();
const gr = c.createLinearGradient(0, -14, 0, 14); gr.addColorStop(0, '#7a4a16'); gr.addColorStop(0.45, '#d29a3e'); gr.addColorStop(1, '#f2d9a0');
c.fillStyle = gr; c.beginPath(); c.ellipse(0, 0, 32, 13.5, 0, 0, 7); c.fill();
c.strokeStyle = 'rgba(90,50,10,0.45)'; c.lineWidth = 1;
for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { c.beginPath(); c.arc(-14 + i * 8, -4 + j * 7, 4, -1.2, 1.2); c.stroke(); }
c.fillStyle = 'rgba(190,120,50,0.9)'; c.beginPath(); c.moveTo(12, 5); c.quadraticCurveTo(6, 14 + w * 0.4, 0, 12); c.lineTo(8, 4); c.fill();
c.fillStyle = '#c48a35'; c.beginPath(); c.ellipse(24, 1, 9, 10.5, 0, 0, 7); c.fill();
c.fillStyle = '#4a2a0c'; c.beginPath(); c.ellipse(32, 3, maulAuf ? 3.2 : 1.6, maulAuf ? 3.2 : 1.4, 0, 0, 7); c.fill();
c.strokeStyle = '#6b4012'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(30, 5); c.quadraticCurveTo(33, 10, 30, 13); c.moveTo(28, 5); c.quadraticCurveTo(29, 9, 26, 11); c.stroke();
c.fillStyle = '#f4f1e8'; c.beginPath(); c.arc(25, -3, 3.3, 0, 7); c.fill();
c.fillStyle = '#000'; if (aus) { c.strokeStyle = '#000'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(23, -5); c.lineTo(27, -1); c.moveTo(27, -5); c.lineTo(23, -1); c.stroke(); } else { c.beginPath(); c.arc(25.8, -3, 1.8, 0, 7); c.fill(); }
c.restore();
}
}
return Component;
}
