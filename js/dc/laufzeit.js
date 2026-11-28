// Seiten-Laufzeit: stellt die Vorlagen aus dem Design-Entwurf 1:1 dar.
// Vorlagen-Sprache wie im Entwurf: Löcher {{ a.b }} (nur Pfade), <sc-if value="{{ x }}">, <sc-for list="{{ xs }}" as="x">,
// Ereignisse onClick="{{ fn }}" usw., ref="{{ fn }}". Logik: class extends DCLogic mit renderVals().
// Neu gerendert wird per DOM-Abgleich, damit Fokus, Eingaben, Canvas und Scroll-Lage erhalten bleiben.

const HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
const SVG_NS = 'http://www.w3.org/2000/svg';

export class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; this.__pending = false; }   // nie null: Eingabe-Felder schreiben direkt in this.state
  setState(teil) {
    const d = typeof teil === 'function' ? teil(this.state || {}, this.props) : teil;
    this.state = Object.assign({}, this.state || {}, d || {});
    this.__plan();
  }
  forceUpdate() { this.__plan(); }
  zeige(t) { import('../ui/app.js').then(m => m.toast(t)).catch(() => {}); }   // Standard-Meldung; Entwurfs-Seiten haben ihre eigene
  __plan() {
    if (!this.__mounted || this.__pending) return;
    this.__pending = true;
    queueMicrotask(() => { this.__pending = false; if (this.__mounted) { this.__render(); if (this.componentDidUpdate) this.componentDidUpdate(); } });
  }
}

function look(path, scope) {
  if (path === 'true') return true;
  if (path === 'false') return false;
  if (path === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
  if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
  let v = scope;
  for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
  return v;
}
const ganz = s => { const m = /^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/.exec(s); return m ? m[1] : null; };
const fuellen = (s, scope) => s.replace(HOLE, (_, p) => { const v = look(p, scope); return v == null ? '' : String(v); });

/** Vorlage einlesen. Links auf Entwurfs-Seiten (X.dc.html) werden zu App-Adressen (#/X). */
export function vorlage(html) {
  const t = document.createElement('template');
  t.innerHTML = html.replace(/href="([A-Za-z0-9-]+)\.dc\.html(?:\?([^"]*))?"/g, (_, n, q) => `href="#/${n}${q ? '/' + q : ''}"`);
  return Array.from(t.content.childNodes);
}

const EVENT_NAME = { change: 'input', doubleclick: 'dblclick' };
function ereignis(n, el) {
  const typ = n.slice(2);
  if (typ === 'change' && (el.type === 'checkbox' || el.type === 'radio' || el.localName === 'select')) return 'change';
  return EVENT_NAME[typ] || typ;
}

function baue(node, scope, out, refs, svg) {
  if (node.nodeType === 3) { out.push(document.createTextNode(node.data.indexOf('{{') >= 0 ? fuellen(node.data, scope) : node.data)); return; }
  if (node.nodeType !== 1) return;
  const tag = node.localName;
  if (tag === 'sc-if') {
    if (look(ganz(node.getAttribute('value') || '') || '', scope)) node.childNodes.forEach(c => baue(c, scope, out, refs, svg));
    return;
  }
  if (tag === 'sc-for') {
    const liste = look(ganz(node.getAttribute('list') || '') || '', scope) || [];
    const als = node.getAttribute('as') || 'item';
    liste.forEach((it, i) => {
      const s = Object.create(scope); s[als] = it; s.$index = i;
      node.childNodes.forEach(c => baue(c, s, out, refs, svg));
    });
    return;
  }
  const inSvg = svg || tag === 'svg';
  const el = inSvg ? document.createElementNS(SVG_NS, node.tagName === 'svg' ? 'svg' : node.localName) : document.createElement(tag);
  for (const a of Array.from(node.attributes)) {
    const n = a.name, v = a.value;
    if (n.startsWith('hint-')) continue;
    const w = v.indexOf('{{') >= 0 ? ganz(v) : null;
    if (/^on[a-z]+$/.test(n)) {
      const f = w !== null ? look(w, scope) : null;
      if (typeof f === 'function') (el.__ev || (el.__ev = {}))[ereignis(n, node)] = f;
      continue;
    }
    if (n === 'ref' && w !== null) { const r = look(w, scope); if (r) refs.push([el, r]); continue; }
    if (w !== null) {
      const val = look(w, scope);
      if (n.startsWith('aria-') && typeof val === 'boolean') { el.setAttribute(n, String(val)); continue; }
      if (val === false || val == null) continue;
      if (val === true) { el.setAttribute(n, ''); continue; }
      el.setAttribute(n, String(val));
      continue;
    }
    el.setAttribute(n, v.indexOf('{{') >= 0 ? fuellen(v, scope) : v);
  }
  const kinder = [];
  const quelle = tag === 'template' ? node.content.childNodes : node.childNodes;
  quelle.forEach(c => baue(c, scope, kinder, refs, inSvg && tag !== 'foreignObject'));
  kinder.forEach(k => el.appendChild(k));
  out.push(el);
}

/* ---------- DOM-Abgleich ---------- */
const lauscher = new WeakSet();
function verteiler(ev) { const f = this.__ev && this.__ev[ev.type]; if (f) f(ev); }
function ereignisseAn(el) {
  if (!el.__ev) return;
  el.__lauscht = el.__lauscht || new Set();
  for (const typ of Object.keys(el.__ev)) if (!el.__lauscht.has(typ)) { el.addEventListener(typ, verteiler); el.__lauscht.add(typ); }
}
function alleEreignisse(root) {
  ereignisseAn(root);
  if (root.querySelectorAll) root.querySelectorAll('*').forEach(ereignisseAn);
}
const gleich = (a, b) => a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.namespaceURI === b.namespaceURI && a.localName === b.localName && a.getAttribute('data-key') === b.getAttribute('data-key')));

function abgleich(alt, neu) {
  neu.__alt = alt;
  if (alt.nodeType === 3) { if (alt.data !== neu.data) alt.data = neu.data; return; }
  // Attribute
  for (const a of Array.from(alt.attributes)) if (!neu.hasAttribute(a.name)) alt.removeAttribute(a.name);
  for (const a of Array.from(neu.attributes)) if (alt.getAttribute(a.name) !== a.value) alt.setAttribute(a.name, a.value);
  if ((alt.localName === 'input' || alt.localName === 'textarea' || alt.localName === 'select') && neu.hasAttribute('value')) {
    const v = neu.getAttribute('value');
    if (alt.value !== v && (document.activeElement !== alt || v === '')) alt.value = v;   // beim Tippen nicht stören, Leeren aber immer
  }
  if (alt.localName === 'input' && (alt.type === 'checkbox' || alt.type === 'radio')) alt.checked = neu.hasAttribute('checked');
  // Ereignisse
  alt.__ev = neu.__ev; if (alt.__ev) ereignisseAn(alt);
  if (alt.localName === 'canvas' || alt.hasAttribute('data-eigen')) return;   // Inhalt wird von der Logik selbst gezeichnet
  kinderAbgleich(alt, Array.from(neu.childNodes));
}
function kinderAbgleich(parent, neue) {
  const alte = Array.from(parent.childNodes);
  let i = 0;
  for (; i < neue.length; i++) {
    const n = neue[i], a = alte[i];
    if (a && gleich(a, n)) abgleich(a, n);
    else if (a) { parent.replaceChild(n, a); alleEreignisse(n); }
    else { parent.appendChild(n); alleEreignisse(n); }
  }
  for (; i < alte.length; i++) alte[i].remove();
}

/* ---------- Seite einhängen ---------- */
let aktuell = null;
/** Hängt eine Seite in root ein. vorlageKnoten aus vorlage(), Logik = Klasse. Gibt die Instanz zurück. */
export function einhaengen(root, vorlageKnoten, Logik, props) {
  abhaengen();
  const inst = new Logik(props || {});
  inst.__root = root;
  inst.__render = function () {
    const werte = (this.renderVals && this.renderVals()) || {};
    const out = [], refs = [];
    vorlageKnoten.forEach(c => baue(c, werte, out, refs, false));
    if (!this.__erst) { root.replaceChildren(...out); alleEreignisse(root); this.__erst = true; }
    else kinderAbgleich(root, out);
    // Refs zeigen auf die Elemente, die jetzt im Dokument stehen (nach dem Abgleich).
    for (const [el, r] of refs) {
      const echt = el.isConnected ? el : (el.__alt || el);
      if (typeof r === 'function') r(echt); else if (r && typeof r === 'object') r.current = echt;
    }
  };
  inst.__render();
  inst.__mounted = true;
  aktuell = inst;
  if (inst.componentDidMount) inst.componentDidMount();
  // Meldung von der vorigen Seite („Gespeichert“ …) auf der neuen Seite zeigen
  try { const t = sessionStorage.getItem('krisiu-toast'); if (t && inst.zeige) { sessionStorage.removeItem('krisiu-toast'); inst.zeige(t); } } catch (e) { /* ohne Speicher */ }
  return inst;
}
export function abhaengen() {
  if (aktuell) { aktuell.__mounted = false; if (aktuell.componentWillUnmount) try { aktuell.componentWillUnmount(); } catch (e) { console.error(e); } }
  aktuell = null;
}
