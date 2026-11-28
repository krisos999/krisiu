// 5a · Boilie-Jagd (läuft ohne Netz, Bestenliste bleibt auf dem Handy) und 5c · Kein Netz – 1:1 wie Entwurf.
import VS from '../vorlagen/Spiel.js';
import macheS from '../vorlagen/Spiel.logik.js';
import VK from '../vorlagen/KeinNetz.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';

dcSeite(VS, macheS(DCLogic), null, { auch: ['spiel'] });
class KeinNetz extends DCLogic { renderVals() { return {}; } }
dcSeite(VK, KeinNetz, null, { auch: ['keinnetz'] });
