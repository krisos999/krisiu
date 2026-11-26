// Oberflächen-Kern: Elemente bauen, Seiten wechseln (#/seite/wert), Meldungen, Krisiu-Lasche.

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false || kid === '') continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const ICON = {
  zurueck: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  pfeil: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  kamera: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  mikro: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF5E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>',
  pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF5E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
  info: '<svg width="20" height="20" viewBox="0 0 24 24" style="flex:none" fill="none" stroke="#00FF5E" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>'
};
export const icon = name => h('span', { html: ICON[name], style: 'display:inline-flex' });

/* ---------- Seiten ---------- */
const routes = new Map();
let current = null;
export const route = (name, render) => routes.set(name, render);
export function go(name, param) {
  const hash = '#/' + name + (param != null ? '/' + encodeURIComponent(param) : '');
  if (location.hash === hash) show(); else location.hash = hash;
}
export const back = fallback => (history.length > 1 ? history.back() : go(fallback || 'start'));

export async function show() {
  const [, name = 'start', param] = (location.hash || '#/start').split('/');
  const render = routes.get(name) || routes.get('start');
  const root = document.getElementById('app');
  const token = {};
  current = token;
  let node;
  try {
    node = await render(param == null ? null : decodeURIComponent(param));
  } catch (err) {
    console.error(err);
    node = h('div', { class: 'block' }, h('h1', {}, 'Hoppla'), h('p', { class: 'unter' }, String((err && err.message) || err)),
      h('button', { class: 'btn neutral', onclick: () => go('start') }, 'Zum Start'));
  }
  if (current !== token) return;
  root.className = node && node.dataset && node.dataset.voll ? 'voll' : '';
  root.replaceChildren(...(node && node.dataset && node.dataset.teile ? [...node.childNodes] : [node]));
  window.scrollTo(0, 0);
}
/** Seite mit mehreren Teilen direkt im #app (für space-between). */
export function seite(teile, { voll = false } = {}) {
  const frag = h('div', { 'data-teile': '1' }, ...teile);
  if (voll) frag.dataset.voll = '1';
  return frag;
}

/* ---------- Bausteine ---------- */
export function kopf({ zurueck = 'start', text = 'Zurück', pille = null, rechts = null } = {}) {
  return h('div', { class: 'kopf' },
    h('button', { class: 'zurueck', type: 'button', onclick: () => (typeof zurueck === 'function' ? zurueck() : go(zurueck)) }, icon('zurueck'), text),
    rechts || (pille ? h('span', { class: 'pille' }, pille) : null));
}
export const lbl = t => h('span', { class: 'lbl' }, t);

export function k(size = 32, badge = null) {
  return h('span', { class: 'k', style: `width:${size}px;height:${size}px;font-size:${Math.round(size / 2)}px` }, 'K',
    badge ? h('span', { class: 'badge', 'aria-hidden': 'true' }, badge) : null);
}
export function krisiuTab(badge) {
  return h('a', { class: 'ktab', href: '#/krisiu', 'aria-label': 'Krisiu öffnen' }, k(32, badge || null));
}

export function chips(werte, gewaehlt, { mehrfach = false, grau = false, raster = false, onchange } = {}) {
  let sel = new Set([].concat(gewaehlt == null ? [] : gewaehlt));
  const box = h('div', { class: 'chips' + (raster ? ' raster' : '') });
  const knoepfe = werte.map(w => {
    const [wert, text] = Array.isArray(w) ? w : [w, w];
    const b = h('button', { type: 'button', class: 'chip' + (grau ? ' grau' : ''), 'aria-pressed': String(sel.has(wert)) }, text);
    b.addEventListener('click', () => {
      if (mehrfach) { if (sel.has(wert)) sel.delete(wert); else sel.add(wert); }
      else sel = new Set([wert]);
      knoepfe.forEach(([w2, b2]) => b2.setAttribute('aria-pressed', String(sel.has(w2))));
      if (onchange) onchange(mehrfach ? [...sel] : wert);
    });
    box.append(b);
    return [wert, b];
  });
  box.wert = () => (mehrfach ? [...sel] : [...sel][0]);
  box.setze = v => { sel = new Set([].concat(v == null ? [] : v)); knoepfe.forEach(([w2, b2]) => b2.setAttribute('aria-pressed', String(sel.has(w2)))); };
  return box;
}

let toastTimer = null;
export function toast(text, { fehler = false, ms = 2800 } = {}) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = h('div', { class: 'toast' + (fehler ? ' fehler' : ''), role: 'status' }, icon('info'), h('span', {}, text));
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), ms);
}

/** Führt eine Speicher-Aktion aus und zeigt Prüffehler als Meldung. */
export async function sicher(fn) {
  try { return await fn(); } catch (err) {
    console.error(err);
    toast((err && err.message) || 'Das hat nicht geklappt.', { fehler: true, ms: 4200 });
    return undefined;
  }
}

/* ---------- Zeit ---------- */
const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const pad = n => String(n).padStart(2, '0');
export const uhrzeit = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const datumKurz = d => `${TAGE[d.getDay()].slice(0, 2)} ${d.getDate()}.${d.getMonth() + 1}.`;
export const datumLang = d => `${TAGE[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`;
export function dauer(ms) {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60 * 24) return `${Math.floor(min / 60)}:${pad(min % 60)} h`;
  const t = Math.floor(min / 1440), s = Math.round((min % 1440) / 60);
  return `${t} ${t === 1 ? 'Tag' : 'Tage'}${s ? ' ' + s + ' h' : ''}`;
}
export const zahl = (n, d = 1) => (n == null || Number.isNaN(n) ? '–' : Number(n).toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: d, minimumFractionDigits: 0 }));
