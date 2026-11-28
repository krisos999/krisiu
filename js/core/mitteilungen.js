// Mitteilungen: Anmeldung beim eigenen Krisiu-Server (Cloudflare Worker), Einstellungen dorthin schicken,
// und die Ansitz-Mitteilung mit „Biss!“ und „Sprechen“ auf dem Handy. Ohne Server gibt es nur die Ansitz-Mitteilung.
import { settings, lakes } from './repo.js';
import { isNum } from './util.js';

const SERVER = 'push-server', GERAET = 'push-geraet', WECKER = 'wecker';
export const serverHolen = () => settings.get(SERVER, null);
export async function geraetId() {
  let id = await settings.get(GERAET, null);
  if (!id) { id = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); await settings.set(GERAET, id); }
  return id;
}
export const unterstuetzt = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const erlaubnis = () => ('Notification' in window ? Notification.permission : 'denied');
const sauber = u => String(u || '').trim().replace(/\/+$/, '');
const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };

/** Einstellungen fürs Wecken (Schalter, Gewässer, Sterne, daheim melden). */
export async function weckerHolen() {
  return Object.assign({ umschwung: true, front: true, wochenende: true, warnungen: true, daheim: { an: false, um: '21:30', nummer: '', name: '' }, seen: null, minSterne: 4 }, await settings.get(WECKER, {}) || {});
}
export async function weckerSpeichern(w) { await settings.set(WECKER, Object.assign({}, w, { an: !!(w.umschwung || w.front || w.wochenende || w.warnungen || (w.daheim && w.daheim.an)) })); return einstellungenSenden(); }

async function einstellungenFuerServer() {
  const w = await weckerHolen(), alle = await lakes.list();
  const seen = alle.filter(l => isNum(l.lat) && (!w.seen || w.seen.includes(l.id))).map(l => ({ short: l.short, lat: Math.round(l.lat * 100) / 100, lon: Math.round(l.lon * 100) / 100, art: l.art || null }));
  return { umschwung: w.umschwung, front: w.front, wochenende: w.wochenende, warnungen: w.warnungen, daheim: w.daheim, minSterne: w.minSterne, seen };
}
async function senden(pfad, daten) {
  const server = await serverHolen(); if (!server) return { ok: false, grund: 'kein-server' };
  const r = await fetch(server + pfad, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ id: await geraetId() }, daten)) });
  return { ok: r.ok, status: r.status };
}
/** Server merken, Erlaubnis holen, beim Server anmelden. */
export async function einschalten(serverUrl) {
  if (!unterstuetzt()) throw new Error('Dieses Handy oder dieser Browser kann keine Mitteilungen empfangen.');
  const server = sauber(serverUrl || await serverHolen());
  if (!/^https:\/\//.test(server)) throw new Error('Bitte die Adresse deines Krisiu-Servers eintragen (beginnt mit https://).');
  const k = await fetch(server + '/schluessel').then(r => r.json()).catch(() => null);
  if (!k || !k.schluessel) throw new Error('Der Server antwortet nicht. Stimmt die Adresse?');
  const erl = await Notification.requestPermission();
  if (erl !== 'granted') throw new Error('Mitteilungen sind für Krisiu nicht erlaubt. In den Handy-Einstellungen bei der App erlauben.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  const passt = sub && sub.options && sub.options.applicationServerKey && btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') === k.schluessel;
  if (sub && !passt) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.schluessel) });
  await settings.set(SERVER, server);
  swBescheid(server, await geraetId());
  const r = await fetch(server + '/anmelden', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: await geraetId(), sub: sub.toJSON(), einst: await einstellungenFuerServer() }) });
  if (!r.ok) throw new Error('Anmelden beim Server hat nicht geklappt (' + r.status + ').');
  return true;
}
export async function ausschalten() {
  try { await senden('/abmelden', {}); } catch (e) { /* egal */ }
  try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) { /* egal */ }
  await settings.set(SERVER, null);
}
export const testSchicken = () => senden('/test', {});
export async function einstellungenSenden() {
  const server = await serverHolen(); if (!server || erlaubnis() !== 'granted') return { ok: false };
  try {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (!sub) return { ok: false };
    const r = await fetch(server + '/anmelden', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: await geraetId(), sub: sub.toJSON(), einst: await einstellungenFuerServer() }) });
    return { ok: r.ok };
  } catch (e) { return { ok: false }; }
}
/** Dem Service Worker sagen, wo er die Texte abholt (er hat keinen Zugriff auf die App-Daten). */
export function swBescheid(server, id) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => reg.active && reg.active.postMessage({ type: 'PUSH_SERVER', server, id })).catch(() => {});
}

/** Ansitz läuft / ist vorbei: Server Bescheid geben und die Ansitz-Mitteilung zeigen oder wegnehmen. */
export async function ansitzMelden(s, lake, info) {
  const server = await serverHolen();
  if (server) { try { await senden('/ansitz', { ansitz: s ? { start: s.startTs, lat: lake && isNum(lake.lat) ? Math.round(lake.lat * 100) / 100 : null, lon: lake && isNum(lake.lon) ? Math.round(lake.lon * 100) / 100 : null, short: lake ? lake.short : null } : null }); } catch (e) { /* ohne Netz: beim nächsten Mal */ } }
  await ansitzMitteilung(s ? { titel: 'Krisiu · Ansitz läuft', text: info || (lake ? lake.name : 'Ansitz') } : null);
}
/** Die stille Mitteilung beim Ansitz mit den Knöpfen „Biss!“ und „Sprechen“. */
export async function ansitzMitteilung(m) {
  if (!('serviceWorker' in navigator) || erlaubnis() !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!m) { (await reg.getNotifications({ tag: 'ansitz' })).forEach(n => n.close()); return; }
    await reg.showNotification(m.titel, { body: m.text, tag: 'ansitz', renotify: false, silent: true, requireInteraction: true, icon: './icons/icon-192.png', badge: './icons/icon-192.png',
      actions: [{ action: 'biss', title: 'Biss!' }, { action: 'sprechen', title: 'Sprechen' }], data: { url: './#/Ansitz' } });
  } catch (e) { /* manche Browser können keine Knöpfe */ }
}
