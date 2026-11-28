// Hängt Entwurfs-Seiten als App-Seiten ein: Vorlage + Logik + Daten laden.
import { route } from '../ui/app.js';
import { vorlage, einhaengen } from '../dc/laufzeit.js';

const knoten = new Map();
const stile = new Set();

/** Registriert eine Seite. modul = Vorlagen-Modul (js/vorlagen), Logik = Klasse, laden(param) liefert die Daten. */
export function dcSeite(modul, Logik, laden, { auch = [] } = {}) {
  const render = async param => {
    if (modul.stil && !stile.has(modul.name)) {
      const st = document.createElement('style'); st.dataset.seite = modul.name; st.textContent = modul.stil;
      document.head.append(st); stile.add(modul.name);
    }
    if (!knoten.has(modul.name)) knoten.set(modul.name, vorlage(modul.html));
    const daten = laden ? await laden(param) : null;
    const box = document.createElement('div');
    box.dataset.dc = '1'; box.dataset.seite = modul.name;
    einhaengen(box, knoten.get(modul.name), Logik, { param, daten, neuLaden: () => (laden ? laden(param) : null) });
    return box;
  };
  route(modul.name, render);
  auch.forEach(n => route(n, render));
}
