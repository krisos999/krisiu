// Winziger Nachrichtenkanal: Die Datenebene meldet Änderungen, die Oberfläche hört zu.
// Ereignisse: "data" {store, id}, "settings" {key}, "weather" {…}, "pwa" {…}.

const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

export function emit(event, detail) {
  (listeners.get(event) || []).forEach(fn => {
    try { fn(detail); } catch (err) { console.error('Fehler in Zuhörer für', event, err); }
  });
}
