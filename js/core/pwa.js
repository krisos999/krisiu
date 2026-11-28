// App-Hülle: Offline-Betrieb (Service Worker), Installation, Updates, dauerhafter Speicher.

import { emit } from './bus.js';

let registration = null;
let installEvent = null;

/** Meldet den Service Worker an. Ab dann startet die App auch ohne Netz. */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch (err) {
    console.error('Service Worker ließ sich nicht anmelden', err);
    return null;
  }
  if (!registration) return null;
  const announce = () => { if (registration && registration.waiting && navigator.serviceWorker.controller) emit('pwa', { updateReady: true }); };
  announce();
  registration.addEventListener('updatefound', () => {
    const fresh = registration.installing;
    if (fresh) fresh.addEventListener('statechange', announce);
  });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !window.__fangbuchUpdating) return;
    reloaded = true;
    location.reload();
  });
  return registration;
}

/** Sucht nach einer neuen Version (z. B. beim Öffnen). */
export const checkForUpdate = () => (registration ? registration.update().catch(() => {}) : Promise.resolve());

/** Schaltet auf die wartende neue Version um und lädt neu. */
export function applyUpdate() {
  if (!registration || !registration.waiting) return false;
  window.__fangbuchUpdating = true;
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

window.addEventListener('beforeinstallprompt', ev => {
  ev.preventDefault();
  installEvent = ev;
  emit('pwa', { canInstall: true });
});
window.addEventListener('appinstalled', () => { installEvent = null; emit('pwa', { installed: true }); });

/** Wie die App gerade läuft und wie man sie installiert. */
export function installState() {
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  return { standalone, canPrompt: !!installEvent, platform: ios ? 'ios' : /Android/.test(ua) ? 'android' : 'other' };
}

/** Android/Chrome: zeigt den Installieren-Dialog. iPhone hat keinen, dort geht es über Teilen. */
export async function promptInstall() {
  if (!installEvent) return 'unavailable';
  installEvent.prompt();
  const choice = await installEvent.userChoice;
  installEvent = null;
  return choice.outcome;
}

/** Speicherstand. persisted = das System räumt die Daten nicht von sich aus weg. */
export async function storageInfo() {
  const out = { persisted: null, usageMb: null, quotaMb: null, workerActive: !!(navigator.serviceWorker && navigator.serviceWorker.controller) };
  if (!navigator.storage) return out;
  try {
    if (navigator.storage.persisted) out.persisted = await navigator.storage.persisted();
    if (navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      out.usageMb = Math.round(((e.usage || 0) / 1048576) * 10) / 10;
      out.quotaMb = Math.round((e.quota || 0) / 1048576);
    }
  } catch (err) { /* nicht verfügbar */ }
  return out;
}

/** Bittet das System, die Daten dauerhaft zu behalten. */
export async function requestPersistence() {
  try { return !!(navigator.storage && navigator.storage.persist && await navigator.storage.persist()); }
  catch (err) { return false; }
}
