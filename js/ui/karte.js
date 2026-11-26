// Karte am Wasser: Köder-Spot und Angelplatz auf dem Luftbild antippen, Entfernung in Metern.
// Verschieben mit einem Finger (normales Scrollen), Zoomen mit zwei Fingern oder den Knöpfen + / −.

import { lakes, sessions, maps, mapOf, spotsOf } from '../core/repo.js';
import { geoZuKarte, wurfweite, aufKarte, abstand } from '../core/karte.js';
import { getPosition } from '../core/geo.js';
import { h, icon, route, go, seite, kopf, lbl, chips, toast, sicher, zahl } from './app.js';
import { laufenderAnsitz, rutenVon } from './daten.js';

const NS = 'http://www.w3.org/2000/svg';
const BONE = '#ece8dc', GRUEN = '#00FF5E';
const PIN = 'M0 0s-13-12-13-22a13 13 0 0 1 26 0c0 10-13 22-13 22z';
const r1 = v => Math.round(v * 10) / 10;

export function sv(tag, attrs, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) el.setAttribute(k, v);
  kids.flat().forEach(k => { if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k))); });
  return el;
}
const pfad = pts => 'M' + pts.map(p => r1(p[0]) + ' ' + r1(p[1])).join('L') + 'Z';
const schrift = (gr, extra = {}) => Object.assign({ fill: BONE, stroke: '#000', 'stroke-width': 3, 'paint-order': 'stroke', 'font-family': 'Barlow, system-ui, sans-serif', 'font-size': gr, 'font-weight': 600 }, extra);

/** Zeichnet Luftbild/Kontur, Linien und Spots einer Karte in ein SVG. Marker werden in Bildschirm-Pixeln gezeichnet. */
export function grundkarte(map, sc, { luft = true, spots = [], breite = map.w * sc } = {}) {
  const k = 1 / sc;
  const teile = [luft ? sv('image', { href: map.image, x: 0, y: 0, width: map.w, height: map.h, preserveAspectRatio: 'none' })
    : sv('rect', { x: 0, y: 0, width: map.w, height: map.h, fill: '#0b0d0c' })];
  const ns = { 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' };
  const stil = {
    ufer: Object.assign({ fill: luft ? 'none' : '#1b2321', stroke: BONE, 'stroke-width': 1.6 }, ns),
    tiefe: Object.assign({ fill: 'none', stroke: BONE, 'stroke-opacity': 0.55, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, ns),
    loch: Object.assign({ fill: '#000', 'fill-opacity': 0.35, stroke: BONE, 'stroke-opacity': 0.8, 'stroke-width': 1 }, ns),
    insel: Object.assign({ fill: luft ? 'none' : '#0b0d0c', stroke: BONE, 'stroke-width': 1.2 }, ns)
  };
  ['ufer', 'tiefe', 'loch', 'insel'].forEach(art => map.lines.filter(l => l.art === art).forEach(l => teile.push(sv('path', Object.assign({ d: pfad(l.pts) }, stil[art])))));
  // Beschriftungen: einfache Ausweich-Regel, damit sich Namen nicht überdecken (geschätzte Textbreite).
  const belegt = [];
  const frei = (x, y, w, hh) => !belegt.some(b => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + hh > b.y);
  const sortiert = spots.slice().sort((a, b) => (a.kind === 'bereich') - (b.kind === 'bereich'));
  sortiert.filter(sp => sp.kind !== 'bereich').forEach(sp => belegt.push({ x: sp.x * sc - 6, y: sp.y * sc - 6, w: 12, h: 12 }));
  sortiert.forEach(sp => {
    const px = sp.x * sc, py = sp.y * sc, bw = sp.name.length * 6.4 + 6;
    if (sp.kind === 'bereich') {
      const sw = Math.max(bw, (sp.depthText || '').length * 5.6 + 6);
      const lagen = [0, 16, -16, 30];
      const dy = lagen.find(d => frei(px - sw / 2, py - 11 + d, sw, 26)) ?? 0;
      belegt.push({ x: px - sw / 2, y: py - 11 + dy, w: sw, h: 26 });
      teile.push(sv('g', { transform: `translate(${sp.x} ${sp.y}) scale(${k})` },
        sv('text', schrift(11, { y: dy, 'text-anchor': 'middle', 'font-style': 'italic', 'fill-opacity': 0.9 }), sp.name),
        sp.depthText ? sv('text', schrift(10, { y: dy + 12, 'text-anchor': 'middle', 'font-weight': 400, 'fill-opacity': 0.75 }), sp.depthText) : null));
      return;
    }
    const rechtsPlatz = px + 9 + bw < breite;
    const lagen = [[9, 4, 'start'], [-9, 4, 'end'], [9, 18, 'start'], [-9, -8, 'end'], [9, -8, 'start'], [-9, 18, 'end']]
      .sort((a, b) => (rechtsPlatz ? 0 : (a[2] === 'start') - (b[2] === 'start')));
    const box = ([dx, dy, an]) => ({ x: an === 'start' ? px + dx : px + dx - bw, y: py + dy - 11, w: bw, h: 14 });
    const wahl = lagen.find(l => { const b = box(l); return frei(b.x, b.y, b.w, b.h); }) || lagen[0];
    belegt.push(box(wahl));
    teile.push(sv('g', { transform: `translate(${sp.x} ${sp.y}) scale(${k})` },
      sv('circle', { r: 4.5, fill: '#000', stroke: BONE, 'stroke-width': 2 }),
      sv('text', schrift(11.5, { x: wahl[0], y: wahl[1], 'text-anchor': wahl[2] }), sp.name)));
  });
  return teile;
}

/** Schöne Maßstabslänge für die aktuelle Zoomstufe. */
function massstab(sc) {
  const L = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(m => m * sc >= 48) || 1000;
  return { m: L, px: Math.round(L * sc) };
}

route('karte', async param => {
  const s = await laufenderAnsitz();
  if (!s) { go('start'); return h('div'); }
  const lake = await lakes.get(s.lakeId);
  const map = await mapOf(s.lakeId);
  const nurPlatz = param === 'platz';
  const nr = nurPlatz ? null : Number(param) || 1;
  const zurueck = () => (nurPlatz ? go('ruten') : go('rute', nr));
  if (!map) {
    return seite([
      h('div', { class: 'block', style: 'gap:16px' }, kopf({ zurueck }), h('h1', {}, 'Noch keine Karte'),
        h('p', { class: 'unter' }, `Für ${lake ? lake.name : 'dieses Gewässer'} ist noch keine Karte auf dem Handy. Lies unter „Mehr“ deine Startdatei ein – dann kommen Luftbild, Uferlinie und deine Spots dazu.`)),
      h('button', { class: 'btn rot', type: 'button', onclick: () => go('einstellungen') }, 'Zu „Mehr“')
    ], { voll: true });
  }
  const spotListe = (await spotsOf(lake.id)).filter(x => x.x != null).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const ruten = rutenVon(s);
  const rute = nurPlatz ? null : Object.assign({ nr }, ruten.find(x => x.nr === nr));
  const startPlatz = s.platz || map.platz || null;
  const st = {
    modus: nurPlatz || !startPlatz ? 'platz' : 'spot', luft: true, sc: 1,
    platz: startPlatz ? { x: startPlatz.x, y: startPlatz.y } : null, platzNeu: false,
    pin: rute && rute.kx != null ? { x: rute.kx, y: rute.ky } : null, autoName: null
  };

  /* ---- Bausteine ---- */
  const svg = sv('svg', { class: 'karte-svg', role: 'img', 'aria-label': 'Karte ' + lake.name });
  const box = h('div', { class: 'karte-box' }, svg);
  const tabLuft = h('button', { type: 'button' }, 'Luftbild');
  const tabKontur = h('button', { type: 'button' }, 'Kontur');
  const zoomRein = h('button', { class: 'karte-zoom', type: 'button', 'aria-label': 'Näher heran' }, '+');
  const zoomRaus = h('button', { class: 'karte-zoom', type: 'button', 'aria-label': 'Weiter weg' }, '−');
  const balken = h('span', { class: 'balken' });
  const balkenText = h('span', {});
  const rahmen = h('div', { class: 'karte-rahmen' }, box,
    h('div', { class: 'karte-umschalter' }, tabLuft, tabKontur),
    h('div', { class: 'karte-zooms' }, zoomRein, zoomRaus),
    h('div', { class: 'karte-mass' }, balkenText, balken),
    h('span', { class: 'karte-quelle' }, (map.source || '').split(' · ')[0]));
  const modusChips = nurPlatz ? null : chips([['spot', 'Köder-Spot'], ['platz', 'Angelplatz']], st.modus, { onchange: v => { st.modus = v; aktualisiere(); } });
  const titel = h('h1', {});
  const unter = h('p', { class: 'unter' });
  const spotName = h('input', { class: 'feld', placeholder: 'z. B. Kante links', value: rute && rute.spot ? rute.spot : '' });
  spotName.addEventListener('input', () => { st.autoName = null; });
  const weite = h('span', { class: 'anzeige', style: 'width:auto;min-width:84px;flex:none;text-align:right' }, '–');
  const spotInfo = h('p', { class: 'klein', style: 'margin:0;min-height:17px' });
  const bekannte = spotListe.length ? chips(spotListe.map(x => [x.id, x.name]), null, { onchange: id => waehleSpot(spotListe.find(x => x.id === id)) }) : null;
  if (bekannte) bekannte.classList.add('scrollreihe');
  const platzName = h('input', { class: 'feld', placeholder: 'z. B. Steg am Damm', value: (s.platz && s.platz.name) || (map.platz && map.platz.name) || '' });
  const hierBtn = map.geo ? h('button', { class: 'btn neutral', type: 'button', onclick: () => meinStandort() }, icon('pin'), 'Mein Standort') : null;
  const spotTeil = h('div', { class: 'block eng' },
    h('div', { class: 'feldzeile', style: 'align-items:flex-end' },
      h('div', { class: 'block eng', style: 'flex:1;min-width:0' }, lbl('Name · freiwillig'), spotName),
      h('div', { class: 'block eng', style: 'flex:none;align-items:flex-end' }, lbl('Entfernung'), weite)),
    spotInfo,
    bekannte ? h('div', { class: 'block eng' }, lbl('Bekannte Spots'), bekannte) : null);
  const platzTeil = h('div', { class: 'block eng' }, lbl('Name des Platzes · freiwillig'), platzName, hierBtn,
    map.geoNote && hierBtn ? h('p', { class: 'klein', style: 'margin:0' }, map.geoNote + '.') : null);
  const haupt = h('button', { class: 'btn rot', type: 'button' });

  /* ---- Zeichnen ---- */
  function zeichne() {
    const sc = st.sc, k = 1 / sc;
    svg.setAttribute('width', Math.round(map.w * sc));
    svg.setAttribute('height', Math.round(map.h * sc));
    svg.setAttribute('viewBox', `0 0 ${map.w} ${map.h}`);
    const teile = grundkarte(map, sc, { luft: st.luft, spots: spotListe });
    ruten.filter(r => r.kx != null && (!rute || r.nr !== rute.nr)).forEach(r => teile.push(
      sv('g', { transform: `translate(${r.kx} ${r.ky}) scale(${k})`, opacity: 0.85 },
        sv('circle', { r: 10, fill: '#141414', stroke: GRUEN, 'stroke-width': 1.5 }),
        sv('text', { y: 4, 'text-anchor': 'middle', fill: GRUEN, 'font-family': 'Barlow Condensed, sans-serif', 'font-size': 12, 'font-weight': 700 }, String(r.nr)))));
    const leise = st.modus === 'platz' ? 0.35 : 1;
    if (st.platz && st.pin) teile.push(sv('path', { d: `M${st.platz.x} ${st.platz.y}L${st.pin.x} ${st.pin.y}`, stroke: GRUEN, 'stroke-width': 2, 'stroke-dasharray': '5 6', 'vector-effect': 'non-scaling-stroke', opacity: leise }));
    if (st.platz) {
      const an = st.modus === 'platz';
      teile.push(sv('g', { transform: `translate(${st.platz.x} ${st.platz.y}) scale(${k})` },
        an ? sv('circle', { r: 19, fill: 'rgba(0,255,94,.2)', stroke: 'rgba(0,255,94,.7)', 'stroke-width': 1.5 }) : null,
        sv('circle', { r: an ? 8.5 : 6.5, fill: an ? GRUEN : BONE, stroke: '#000', 'stroke-width': 2 }),
        sv('text', schrift(12, { x: -13, y: 4, 'text-anchor': 'end' }), 'Du')));
    }
    if (st.pin) teile.push(sv('g', { transform: `translate(${st.pin.x} ${st.pin.y}) scale(${k})`, opacity: leise },
      sv('path', { d: PIN, fill: GRUEN, stroke: '#000', 'stroke-width': 2 }), sv('circle', { cy: -22, r: 4.5, fill: '#000' })));
    svg.replaceChildren(...teile);
    const m = massstab(sc);
    balken.style.width = m.px + 'px'; balkenText.textContent = m.m + ' m';
  }

  function aktualisiere() {
    const platzModus = st.modus === 'platz';
    titel.textContent = platzModus ? 'Angelplatz' : 'Spot markieren';
    unter.textContent = platzModus ? 'Tippe auf die Stelle, an der du sitzt.'
      : st.platz ? 'Tippe auf die Stelle, an der der Köder liegt.' : 'Setz zuerst deinen Angelplatz – dann rechnet die App die Entfernung.';
    spotTeil.hidden = platzModus; platzTeil.hidden = !platzModus;
    haupt.textContent = platzModus ? 'Angelplatz speichern' : 'Spot übernehmen';
    weite.textContent = st.platz && st.pin ? wurfweite(st.platz, st.pin) + ' m' : '–';
    tabLuft.className = st.luft ? 'an' : ''; tabKontur.className = st.luft ? '' : 'an';
    if (modusChips) modusChips.setze(st.modus);
    zeichne();
  }

  /* ---- Zoom und Lage ---- */
  let scMin = 0.2, scMax = 3;
  function setzeZoom(neu, ax, ay) {
    const bw = box.clientWidth, bh = box.clientHeight;
    if (ax == null) { ax = bw / 2; ay = bh / 2; }
    const mx = (box.scrollLeft + ax) / st.sc, my = (box.scrollTop + ay) / st.sc;
    st.sc = Math.max(scMin, Math.min(scMax, neu));
    zeichne();
    box.scrollLeft = mx * st.sc - ax; box.scrollTop = my * st.sc - ay;
    zoomRein.disabled = st.sc >= scMax - 1e-6; zoomRaus.disabled = st.sc <= scMin + 1e-6;
  }
  function zentriere(p) {
    if (!p) return;
    box.scrollLeft = p.x * st.sc - box.clientWidth / 2;
    box.scrollTop = p.y * st.sc - box.clientHeight / 2;
  }
  function waehleSpot(sp) {
    if (!sp) return;
    if (st.modus !== 'spot') { st.modus = 'spot'; }
    st.pin = { x: sp.x, y: sp.y };
    if (!spotName.value.trim() || st.autoName === spotName.value) { spotName.value = sp.name; st.autoName = sp.name; }
    spotInfo.textContent = [sp.name, sp.depthText, sp.ground ? 'Grund ' + sp.ground : null, sp.note].filter(Boolean).join(' · ');
    aktualisiere(); zentriere(st.pin);
  }

  /* ---- Tippen, Ziehen, zwei Finger ---- */
  let pinch = null, pinchEnde = 0, rahmenAnfrage = 0;
  const fingerAbstand = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  box.addEventListener('touchstart', ev => {
    if (ev.touches.length === 2) {
      const b = box.getBoundingClientRect();
      pinch = { d: fingerAbstand(ev.touches), sc: st.sc, ax: (ev.touches[0].clientX + ev.touches[1].clientX) / 2 - b.left, ay: (ev.touches[0].clientY + ev.touches[1].clientY) / 2 - b.top };
    }
  }, { passive: true });
  box.addEventListener('touchmove', ev => {
    if (!pinch || ev.touches.length !== 2) return;
    ev.preventDefault();
    const ziel = pinch.sc * fingerAbstand(ev.touches) / pinch.d;
    cancelAnimationFrame(rahmenAnfrage);
    rahmenAnfrage = requestAnimationFrame(() => setzeZoom(ziel, pinch ? pinch.ax : null, pinch ? pinch.ay : null));
  }, { passive: false });
  box.addEventListener('touchend', ev => { if (pinch && ev.touches.length < 2) { pinch = null; pinchEnde = Date.now(); } });
  box.addEventListener('click', ev => {
    if (Date.now() - pinchEnde < 400) return;
    const b = svg.getBoundingClientRect();
    const p = { x: Math.max(0, Math.min(map.w, (ev.clientX - b.left) / st.sc)), y: Math.max(0, Math.min(map.h, (ev.clientY - b.top) / st.sc)) };
    if (st.modus === 'platz') { st.platz = p; st.platzNeu = true; aktualisiere(); return; }
    const nah = spotListe.map(sp => ({ sp, d: abstand(sp, p) * st.sc })).filter(x => x.d < 22).sort((a, b2) => a.d - b2.d)[0];
    if (nah) { waehleSpot(nah.sp); bekannte && bekannte.setze(nah.sp.id); return; }
    st.pin = p;
    if (st.autoName && spotName.value === st.autoName) { spotName.value = ''; st.autoName = null; }
    spotInfo.textContent = '';
    if (bekannte) bekannte.setze(null);
    aktualisiere();
  });
  tabLuft.addEventListener('click', () => { st.luft = true; aktualisiere(); });
  tabKontur.addEventListener('click', () => { st.luft = false; aktualisiere(); });
  zoomRein.addEventListener('click', () => setzeZoom(st.sc * 1.6));
  zoomRaus.addEventListener('click', () => setzeZoom(st.sc / 1.6));

  async function meinStandort() {
    try {
      const pos = await getPosition();
      const p = geoZuKarte(map, pos.lat, pos.lon);
      if (!aufKarte(map, p, 30)) { toast('Du bist gerade nicht auf dieser Karte.', { fehler: true }); return; }
      st.platz = { x: Math.max(0, Math.min(map.w, p.x)), y: Math.max(0, Math.min(map.h, p.y)) }; st.platzNeu = true;
      aktualisiere(); zentriere(st.platz);
      toast('Standort übernommen (± ' + pos.accuracyM + ' m). Passt der Punkt? Sonst einfach tippen.', { ms: 4200 });
    } catch (err) { toast(err.message, { fehler: true }); }
  }

  /* ---- Speichern ---- */
  const punktMitName = (p, name) => ({ x: r1(p.x), y: r1(p.y), name: name || null });
  async function speicherePlatz() {
    if (!st.platz) { toast('Tippe auf die Karte, wo du sitzt.', { fehler: true }); return false; }
    const platz = punktMitName(st.platz, platzName.value.trim());
    const frisch = await sessions.get(s.id);
    const liste = rutenVon(frisch).map(r => (r.kx != null ? Object.assign({}, r, { entfernungM: wurfweite(platz, { x: r.kx, y: r.ky }) }) : r));
    const ok = await sicher(async () => {
      await sessions.save({ id: s.id, platz, rodSetups: liste, rods: liste.length });
      await maps.save({ id: map.id, platz });
      return true;
    });
    if (ok) { st.platzNeu = false; ruten.splice(0, ruten.length, ...liste); }
    return ok;
  }
  haupt.addEventListener('click', async () => {
    if (st.modus === 'platz') {
      if (!(await speicherePlatz())) return;
      toast('Angelplatz gespeichert');
      if (nurPlatz) { go('ruten'); return; }
      st.modus = 'spot'; aktualisiere(); return;
    }
    if (!st.pin) { toast('Tippe zuerst auf die Karte, wo der Köder liegt.', { fehler: true }); return; }
    if (st.platzNeu && !(await speicherePlatz())) return;
    const frisch = await sessions.get(s.id);
    const liste = rutenVon(frisch);
    const alt = liste.find(x => x.nr === nr) || { nr };
    const neu = Object.assign({}, alt, {
      spot: spotName.value.trim() || alt.spot || 'Spot auf der Karte', kx: r1(st.pin.x), ky: r1(st.pin.y),
      entfernungM: st.platz ? wurfweite(st.platz, st.pin) : alt.entfernungM || null
    });
    const r = liste.some(x => x.nr === nr) ? liste.map(x => (x.nr === nr ? neu : x)) : liste.concat([neu]);
    if (await sicher(() => sessions.save({ id: s.id, rodSetups: r, rods: r.length }))) {
      toast('Rute ' + nr + ': ' + neu.spot + (neu.entfernungM ? ' · ' + neu.entfernungM + ' m' : ''));
      go('rute', nr);
    }
  });

  /* ---- Start, sobald die Seite steht ---- */
  requestAnimationFrame(() => {
    const bw = box.clientWidth || 342, bh = box.clientHeight || 400;
    scMin = Math.min(bw / map.w, bh / map.h);
    scMax = Math.max(scMin * 8, 3);
    st.sc = Math.max(scMin, Math.min(scMax, Math.max(bw / map.w, bh / map.h)));
    aktualisiere();
    zoomRaus.disabled = st.sc <= scMin + 1e-6;
    zentriere(st.pin || st.platz || { x: map.w / 2, y: map.h / 2 });
  });
  aktualisiere();

  return seite([
    h('div', { class: 'block', style: 'gap:14px' },
      kopf({ zurueck, pille: nurPlatz ? lake.short + ' · Angelplatz' : 'Rute ' + nr + ' · Spot' }), titel, unter, modusChips),
    rahmen,
    spotTeil, platzTeil,
    haupt
  ], { voll: true });
});

export { zahl };
