// 6d · Ansitz-Replay – 1:1 wie Entwurf: der Ansitz im Zeitraffer, Stunde für Stunde, mit echtem Wetter und echten Bissen.
// „Als Video teilen“ macht einen kurzen Clip ohne Luftbild und ohne GPS – der Platz bleibt geheim.
import V from '../vorlagen/Replay.js';
import mache from '../vorlagen/Replay.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum, HOUR } from '../core/util.js';
import { mapOf, spotsOf } from '../core/repo.js';
import { zahl, go } from '../ui/app.js';
import { stundenFuer, rutenVon } from '../ui/daten.js';
import { ladeAnsitz } from '../ui/auswertung.js';
import { naechte, istKarpfen } from '../ui/analyse.js';
import { sunTimes } from '../core/astro.js';
import { zeitraumKurz } from './Auswertung.js';

const W = 342, H = 290;
const f1 = v => Math.round(v * 10) / 10;
const TAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const p2 = n => String(n).padStart(2, '0');
const R8 = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];

function rahmen(map, pts) {
  let vx, vy, vw, vh;
  if (pts.length) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), rand = 70;
    vx = Math.min(...xs) - rand; vy = Math.min(...ys) - rand; vw = Math.max(...xs) + rand - vx; vh = Math.max(...ys) + rand - vy;
    if (vw < 320) { vx -= (320 - vw) / 2; vw = 320; }
  } else { vx = 0; vy = 0; vw = map.w; vh = map.h; }
  const ziel = H / W;
  if (vh / vw < ziel) { const n = vw * ziel; vy -= (n - vh) / 2; vh = n; } else { const n = vh / ziel; vx -= (n - vw) / 2; vw = n; }
  vx = Math.max(Math.min(0, map.w - vw), Math.min(Math.max(0, map.w - vw), vx)); vy = Math.max(Math.min(0, map.h - vh), Math.min(Math.max(0, map.h - vh), vy));
  return { vx, vy, vw, vh, sc: W / vw };
}

class Replay extends mache(DCLogic) {
  componentDidMount() { if (!this.props.daten) go('Logbuch'); }
  karte(el) {
    const d = this.props.daten; if (!el || el.__fertig) return;
    el.__fertig = true;
    if (!d.map) { el.innerHTML = '<div style="position: absolute; inset: 0; background: linear-gradient(160deg, #1c2a22 0%, #0c1410 60%, #050807 100%)"></div>'; return; }
    const m = d.map, v = d.v, X = x => f1((x - v.vx) * v.sc), Y = y => f1((y - v.vy) * v.sc);
    const pfad = pts => 'M' + pts.map(p => X(p[0]) + ' ' + Y(p[1])).join('L') + 'Z';
    const o = m.lines.map(l => l.art === 'loch' ? `<path d="${pfad(l.pts)}" fill="#000000" fill-opacity="0.35" stroke="#ece8dc" stroke-opacity="0.8" stroke-width="1"></path>`
      : l.art === 'tiefe' ? '' : `<path d="${pfad(l.pts)}" fill="none" stroke="#ece8dc" stroke-width="1.2"${l.art === 'ufer' ? ' stroke-opacity="0.7" stroke-linejoin="round"' : ''}></path>`);
    d.zonen.forEach(s => o.push(`<ellipse cx="${X(s.x)}" cy="${Y(s.y)}" rx="40" ry="24" fill="#00FF5E" fill-opacity="0.10" stroke="#00FF5E" stroke-opacity="0.75" stroke-width="1.2" stroke-dasharray="5 4"></ellipse><text x="${X(s.x)}" y="${f1(Y(s.y) - 30)}" fill="#ece8dc" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Barlow, sans-serif" font-size="12" font-weight="700" text-anchor="middle">${s.name.replace(/</g, '&lt;')}</text>`));
    if (d.platz) o.push(`<circle cx="${X(d.platz.x)}" cy="${Y(d.platz.y)}" r="6" fill="#ece8dc" stroke="#000000" stroke-width="2"></circle>`);
    el.innerHTML = `<img src="${m.image}" alt="" style="position: absolute; left: ${X(0)}px; top: ${Y(0)}px; width: ${f1(m.w * v.sc)}px; height: ${f1(m.h * v.sc)}px; display: block; max-width: none">`
      + `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="position: absolute; left: 0; top: 0">${o.join('')}</svg>`;
  }
  zeitleiste(el) {
    const d = this.props.daten; if (!el || el.__fertig) return;
    el.__fertig = true;
    const D = d.D, NN = Math.max(1, D.P.length - 1), xp = t => 32 + 274 * t / NN, yp = v => 86 - (v - d.pLo) / d.pSpan * 76;
    const o = [];
    D.NACHT.forEach(n => { const a = Math.max(0, n[0]), b = Math.min(NN, n[1]); if (b > a) o.push(`<rect x="${f1(xp(a))}" y="10" width="${f1(xp(b) - xp(a))}" height="106" fill="#ffffff" fill-opacity="0.04"></rect>`); });
    for (let v = Math.ceil(d.pLo / 10) * 10; v <= d.pLo + d.pSpan; v += 10) { const y = yp(v); if (y > 12 && y < 100) o.push(`<path d="M32 ${f1(y)}H306" stroke="#ffffff" stroke-opacity="0.12"></path><text x="27" y="${f1(y + 3.5)}" fill="#a39f93" font-family="Barlow, sans-serif" font-size="10" text-anchor="end">${v}</text>`); }
    const P = D.P.map((p, i) => [xp(i), yp(p)]);
    o.push(`<path d="${P.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('')}" fill="none" stroke="#ece8dc" stroke-width="2" stroke-linejoin="round"></path>`);
    o.push('<path d="M32 112H306" stroke="#ffffff" stroke-opacity="0.12"></path>');
    D.R.forEach((r, i) => { if (r >= 0.05) { const hgt = Math.min(30, r * 12); o.push(`<rect x="${f1(xp(i) - 2)}" y="${f1(112 - hgt)}" width="4" height="${f1(hgt)}" rx="1" fill="#3b9eff"></rect>`); } });
    D.ECHO.forEach(e => o.push(`<path d="M${f1(xp(e.t))} 118v8" stroke="#3be0ff" stroke-width="2"></path>`));
    d.alleBisse.forEach(b => o.push(`<path d="M${f1(xp(b.t))} 118v8" stroke="#ff1e1e" stroke-width="2"></path>`));
    d.ticks.forEach(t => o.push(`<text x="${f1(xp(t.h))}" y="140" fill="#a39f93" font-family="Barlow, sans-serif" font-size="10" text-anchor="middle">${t.text}</text>`));
    el.innerHTML = `<svg width="314" height="146" viewBox="0 0 314 146" role="img" aria-label="Luftdruck über den Ansitz, Regen als blaue Balken, Striche unten: Bisse" style="display: block">${o.join('')}</svg>`;
  }
  renderVals() {
    const r = super.renderVals(), d = this.props.daten;
    if (!d) return r;
    return Object.assign(r, {
      pille: d.pille, unter: d.unter, quelle: d.quelle, fussnote: d.fussnote,
      karteRef: el => this.karte(el), zeitRef: el => this.zeitleiste(el)
    });
  }
}

/** Kurzer Clip vom Ansitz: Uferlinie auf dunklem Grund (ohne Luftbild, ohne GPS), Uhr, Wetter, Bisse. */
async function videoTeilen(comp) {
  const d = comp.props.daten;
  const zeige = t => { comp.setState({ toast: true, toastText: t }); clearTimeout(comp._t); comp._t = setTimeout(() => comp.setState({ toast: false }), 4000); };
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return zeige('Dieses Handy kann hier keine Videos aufnehmen.');
  if (comp.__nimmtAuf) return;
  comp.__nimmtAuf = true;
  zeige('Video wird gemacht … etwa 15 Sekunden.');
  try {
    const c = document.createElement('canvas'); c.width = 720; c.height = 1280;
    const g = c.getContext('2d'), D = d.D, NN = Math.max(1, D.P.length - 1);
    const typ = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(c.captureStream(30), typ ? { mimeType: typ, videoBitsPerSecond: 2500000 } : undefined);
    const teile = []; rec.ondataavailable = e => { if (e.data.size) teile.push(e.data); };
    const fertig = new Promise(res => { rec.onstop = res; });
    const v = d.v, sk = 680 / W, X = x => 20 + (x - v.vx) * v.sc * sk, Y = y => 300 + (y - v.vy) * v.sc * sk;
    const bild = h => {
      const i = Math.min(NN, Math.floor(h));
      g.fillStyle = '#000'; g.fillRect(0, 0, 720, 1280);
      g.fillStyle = '#ece8dc'; g.font = '700 64px "Barlow Condensed", sans-serif'; g.fillText('ANSITZ-REPLAY', 40, 110);
      g.font = '600 34px Barlow, sans-serif'; g.fillStyle = '#cfcabb'; g.fillText(d.pille, 40, 160);
      g.fillStyle = '#00FF5E'; g.font = '700 56px "Barlow Condensed", sans-serif'; g.fillText(d.uhr(h), 40, 250);
      // Karte: nur Uferlinien
      g.save(); g.beginPath(); g.rect(20, 300, 680, 576); g.clip();
      g.fillStyle = '#0b0d0c'; g.fillRect(20, 300, 680, 576);
      const nacht = D.NACHT.some(n => h >= n[0] && h < n[1]);
      if (d.map) d.map.lines.filter(l => l.art === 'ufer' || l.art === 'insel').forEach(l => { g.beginPath(); l.pts.forEach((p, k) => (k ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.closePath(); g.fillStyle = l.art === 'ufer' ? '#14211c' : '#0b0d0c'; g.fill(); g.strokeStyle = 'rgba(236,232,220,0.8)'; g.lineWidth = 3; g.stroke(); });
      if (nacht) { g.fillStyle = 'rgba(0,8,20,0.5)'; g.fillRect(20, 300, 680, 576); }
      D.BISS.filter(b => b.t <= h).forEach(b => {
        const x = 20 + b.x * sk, y = 300 + b.y * sk, alt = h - b.t;
        if (alt < 1.5) { g.beginPath(); g.arc(x, y, 18 + alt * 18, 0, 7); g.strokeStyle = `rgba(255,30,30,${1 - alt / 1.5})`; g.lineWidth = 4; g.stroke(); }
        g.beginPath(); g.arc(x, y, 11, 0, 7); g.fillStyle = '#ff1e1e'; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 3; g.stroke();
      });
      g.restore();
      // Wind
      const wd = D.WD[i] || 0; g.save(); g.translate(100, 800); g.fillStyle = 'rgba(0,0,0,0.72)'; g.beginPath(); g.arc(0, 0, 50, 0, 7); g.fill();
      g.rotate((wd + 180) * Math.PI / 180); g.strokeStyle = '#00FF5E'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 26); g.lineTo(0, -22); g.moveTo(-14, -8); g.lineTo(0, -26); g.lineTo(14, -8); g.stroke(); g.restore();
      // Werte
      const werte = [[zahl(D.T[i]) + '°', 'Luft'], [String(Math.round(D.P[i])), 'Druck hPa'], [R8[Math.round(((wd % 360) + 360) % 360 / 45) % 8], 'Wind aus'], [zahl(D.R[i]), 'Regen mm']];
      werte.forEach(([w, l], k) => { const x = 40 + k * 165; g.fillStyle = '#141414'; g.fillRect(x, 920, 150, 110); g.fillStyle = '#ece8dc'; g.font = '700 48px "Barlow Condensed", sans-serif'; g.fillText(w, x + 16, 980); g.fillStyle = '#a39f93'; g.font = '500 24px Barlow, sans-serif'; g.fillText(l, x + 16, 1015); });
      // Druckkurve mit Kopf
      const xp = t => 40 + 640 * t / NN, yp = p => 1190 - (p - d.pLo) / d.pSpan * 110;
      g.strokeStyle = '#ece8dc'; g.lineWidth = 4; g.beginPath(); D.P.forEach((p, k) => (k ? g.lineTo(xp(k), yp(p)) : g.moveTo(xp(k), yp(p)))); g.stroke();
      g.strokeStyle = '#00FF5E'; g.lineWidth = 4; g.beginPath(); g.moveTo(xp(h), 1065); g.lineTo(xp(h), 1210); g.stroke();
      g.fillStyle = '#ff1e1e'; d.alleBisse.forEach(b => g.fillRect(xp(b.t) - 3, 1215, 6, 20));
      const n = D.BISS.filter(b => b.t <= h).length;
      g.fillStyle = '#ece8dc'; g.font = '700 40px "Barlow Condensed", sans-serif'; g.fillText(n + (n === 1 ? ' BISS' : ' BISSE'), 40, 1265);
      g.fillStyle = '#a39f93'; g.font = '500 24px Barlow, sans-serif'; g.fillText('Krisiu · Fangbuch', 500, 1265);
    };
    rec.start();
    const dauer = 15000, start = performance.now();
    await new Promise(res => {
      const schritt = () => { const t = Math.min(1, (performance.now() - start) / dauer); bild(t * NN); if (t < 1) requestAnimationFrame(schritt); else setTimeout(res, 400); };
      schritt();
    });
    rec.stop(); await fertig;
    const blob = new Blob(teile, { type: rec.mimeType || 'video/webm' });
    const datei = new File([blob], 'ansitz-replay.' + (/mp4/.test(blob.type) ? 'mp4' : 'webm'), { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [datei] })) { await navigator.share({ files: [datei], text: 'Ansitz-Replay ' + d.pille }); zeige('Geteilt.'); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = datei.name; a.click(); zeige('Video gespeichert.'); }
  } catch (e) {
    if (!e || e.name !== 'AbortError') zeige('Das Video hat nicht geklappt.');
  } finally { comp.__nimmtAuf = false; }
}

dcSeite(V, Replay, async id => {
  const a = await ladeAnsitz(id);
  if (!a || !a.lake) return null;
  const { s, lake, z, bisse } = a;
  const t0 = Math.floor(a.von / HOUR) * HOUR;
  const N = Math.min(96, Math.max(2, Math.ceil((a.bis - t0) / HOUR) + 1));
  const std = await stundenFuer(lake, t0 - HOUR, t0 + N * HOUR + HOUR);
  const hours = std.hours || [];
  const reihe = (f, ersatz) => { let last = ersatz; return Array.from({ length: N }, (_, i) => { const x = hours.find(hh => hh.t === t0 + i * HOUR); if (x && isNum(x[f])) last = x[f]; return last; }); };
  const P = reihe('pressureHpa', 1013), T = reihe('tempC', 0), WD = reihe('windDeg', 0), R = Array.from({ length: N }, (_, i) => { const x = hours.find(hh => hh.t === t0 + i * HOUR); return x && isNum(x.precipMm) ? x.precipMm : 0; });
  const NACHT = isNum(lake.lat) ? naechte(t0, t0 + N * HOUR, lake.lat, lake.lon).map(n => [(n.von - t0) / HOUR, (n.bis - t0) / HOUR]) : [];
  const map = await mapOf(lake.id), spots = map ? await spotsOf(lake.id) : [];
  const platz = (s.platz || (map && map.platz)) || null;
  const pts = bisse.filter(b => b.spotXY).map(b => [b.spotXY.x, b.spotXY.y]).concat(rutenVon(s).filter(r => r.kx != null).map(r => [r.kx, r.ky])).concat(platz ? [[platz.x, platz.y]] : []);
  const v = map ? rahmen(map, pts) : { vx: 0, vy: 0, vw: W, vh: H, sc: 1 };
  const BISS = bisse.filter(b => b.spotXY).map((b, k) => ({ t: (b.ts - t0) / HOUR, x: f1((b.spotXY.x - v.vx) * v.sc + Math.sin(k * 2.3) * 6), y: f1((b.spotXY.y - v.vy) * v.sc + Math.cos(k * 1.7) * 5) }));
  const zonenNamen = new Set(bisse.map(b => b.spotName).filter(Boolean));
  const zonen = spots.filter(x => zonenNamen.has(x.name) && x.x != null);
  // Ereignisse für „Was bisher passiert ist“
  const hm = h => { const t = new Date(t0 + h * HOUR); return t.getHours() + ':' + p2(t.getMinutes()); };
  const EV = [];
  bisse.forEach(b => { const h = (b.ts - t0) / HOUR; EV.push({ t: h, zeit: hm(h), art: 'biss', echt: true, txt: b.type === 'fang' ? [b.rod, b.species, isNum(b.weightKg) ? zahl(b.weightKg) + ' kg' : null].filter(Boolean).join(' · ') + (b.spotName ? ' · ' + b.spotName : '') : (b.type === 'fehlbiss' ? 'Fehlbiss' : 'Verloren') + (b.rod ? ' · ' + b.rod : '') }); });
  for (let i = 1; i < N; i++) if (R[i] >= 0.2 && R[i - 1] < 0.2) EV.push({ t: i, zeit: hm(i), art: 'regen', echt: true, txt: 'Regen setzt ein (' + zahl(R[i]) + ' mm/h)' });
  if (isNum(lake.lat)) for (let tag = new Date(t0).setHours(0, 0, 0, 0); tag < t0 + N * HOUR; tag += 24 * HOUR) {
    const st = sunTimes(new Date(tag + 12 * HOUR), lake.lat, lake.lon);
    [[st.sunrise, 'Sonnenaufgang'], [st.sunset, 'Sonnenuntergang']].forEach(([ts, txt]) => { if (ts != null && ts >= t0 && ts <= t0 + (N - 1) * HOUR) { const h = (ts - t0) / HOUR; EV.push({ t: h, zeit: hm(h), art: 'sonne', echt: true, txt }); } });
  }
  const pMin = P.indexOf(Math.min(...P));
  if (pMin > 0 && pMin < N - 1 && Math.max(...P.slice(pMin)) - P[pMin] >= 1.5) EV.push({ t: pMin, zeit: hm(pMin), art: 'druck', echt: true, txt: 'Tiefster Druck: ' + Math.round(P[pMin]) + ' hPa, danach steigt er' });
  (s.rodSetupsVerlauf || []).forEach(x => { if (x.bis) { const h = (Date.parse(x.bis) - t0) / HOUR; if (h >= 0 && h <= N) EV.push({ t: h, zeit: hm(h), art: 'boot', echt: true, txt: 'Rute ' + x.nr + ' umgelegt' }); } });
  EV.sort((x, y) => x.t - y.t);
  const WASSER = [];
  [[s.startTs, s.waterTempC], ...z.eintraege.map(e => [e.ts, e.waterTempC])].filter(x => isNum(x[1])).sort((x, y) => x[0] - y[0]).forEach(([ts, w]) => WASSER.push([(ts - t0) / HOUR, zahl(w) + '°']));
  const pLo = Math.floor(Math.min(...P) - 2), pSpan = Math.max(10, Math.ceil(Math.max(...P) + 2) - pLo);
  const ticks = [];
  for (let i = 0; i < N; i++) { const t = new Date(t0 + i * HOUR); if (t.getHours() === 0) ticks.push({ h: i, text: TAG[t.getDay()] + ' 0 Uhr' }); else if (t.getHours() === 12 && N <= 50) ticks.push({ h: i, text: '12' }); }
  if (!ticks.length || ticks[0].h > 3) ticks.unshift({ h: 0, text: hm(0) });
  const tageN = Math.round((N - 1) / 24);
  const karpfen = z.eintraege.filter(e => e.type === 'fang').every(e => istKarpfen(e.species));
  const ohneZeit = Math.max(0, z.fische - a.fische.length);
  const ersterBiss = bisse.length ? (bisse[0].ts - t0) / HOUR : 0;
  return {
    D: { P, T, WD, R, NACHT, ECHO: [], BISS, FAHRT: [], WASSER, EV },
    h0: Math.max(0, Math.min(N - 1, ersterBiss - 1)), pLo, pSpan, hm, ticks, alleBisse: bisse.map(b => ({ t: (b.ts - t0) / HOUR })),
    uhr: h => { const t = new Date(t0 + h * HOUR); return TAG[t.getDay()] + ' ' + t.getDate() + '.' + (t.getMonth() + 1) + '. · ' + t.getHours() + ':' + p2(Math.floor(t.getMinutes() / 15) * 15) + ' Uhr'; },
    teilen: comp => videoTeilen(comp),
    map, v, platz, zonen,
    pille: zeitraumKurz(s) + ' · ' + lake.short,
    unter: (tageN >= 2 ? WORT2(tageN) + ' Tage' : 'Der Ansitz') + ' im Zeitraffer: Wetter, Wind und Bisse – Stunde für Stunde.',
    quelle: map ? (map.source || '').split(' · ')[0] : '',
    fussnote: 'Echt: stündliche Wetterwerte' + (std.quelle ? ' (' + std.quelle + ')' : '') + ', deine Bisse mit Uhrzeit' + (BISS.length ? ' und Spot' : '') + (WASSER.length ? ' und die Wassertemperatur' : '') + '.'
      + (ohneZeit ? ' ' + ohneZeit + (karpfen ? ' Karpfen' : ' Fische') + ' ohne Uhrzeit fehlen hier – trag die Bisszeiten nach.' : '')
      + (bisse.length > BISS.length ? ' ' + (bisse.length - BISS.length) + ' Bisse ohne Spot stehen nur in der Liste.' : '')
  };
}, { auch: ['replay'] });

function WORT2(n) { return ['Null', 'Ein', 'Zwei', 'Drei', 'Vier'][n] || String(n); }
