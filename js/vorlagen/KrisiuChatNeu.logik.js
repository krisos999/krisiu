// Logik aus dem Design-Entwurf (unverändert) – als Grundlage für js/seiten/KrisiuChatNeu.js.
export default function (DCLogic) {
class Component extends DCLogic {
componentDidMount() {
if (this._liste) this._liste.scrollTop = this._liste.scrollHeight;
this.antworten(this.gruss('ansitz'), []);
}
componentDidUpdate() { if (this._liste) this._liste.scrollTop = this._liste.scrollHeight; }
componentWillUnmount() { this.stopp(); }
stopp() { clearTimeout(this._t1); clearTimeout(this._t2); clearInterval(this._iv); }
M() { return {"denkt": ["🤔", "Krisiu denkt nach", "#a39f93", "#2e2e2e"], "genervt": ["😤", "Krisiu ist genervt", "#ff1e1e", "#ff1e1e"], "happy": ["😄", "Krisiu ist happy", "#00FF5E", "#00FF5E"], "freut": ["🎉", "Krisiu freut sich mit", "#00FF5E", "#00FF5E"], "daumen": ["🤞", "Krisiu drückt die Daumen", "#00FF5E", "#00FF5E"], "sorge": ["😟", "Krisiu macht sich Sorgen", "#ece8dc", "#ece8dc"], "rechnet": ["🧮", "Krisiu rechnet", "#a39f93", "#2e2e2e"], "neugierig": ["🧐", "Krisiu ist neugierig", "#a39f93", "#2e2e2e"], "lacht": ["😂", "Krisiu lacht", "#a39f93", "#2e2e2e"], "gaehnt": ["🥱", "Krisiu gähnt", "#a39f93", "#2e2e2e"], "vermisst": ["🥺", "Krisiu vermisst das Wasser", "#ece8dc", "#2e2e2e"], "unruhig": ["😬", "Krisiu wird unruhig", "#ece8dc", "#2e2e2e"], "aufgeregt": ["🤩", "Krisiu ist aufgeregt", "#00FF5E", "#00FF5E"], "friert": ["🥶", "Krisiu friert mit", "#ece8dc", "#ece8dc"], "zufrieden": ["😌", "Krisiu ist zufrieden", "#00FF5E", "#00FF5E"]}; }
waehle(t) {
const f = t.toLowerCase();
const hat = (...w) => w.some((x) => f.indexOf(x) >= 0);
const allg = (this.state || {}).art === 'allgemein';
if (hat('zig nochmal')) return { mood: 'daumen', text: 'Klar, genau so wieder raus – gleiche Tiefe, gleicher Platz. Was läuft, lässt man laufen. Hakenspitze kurz checken, gell.' };
if (hat('nachfütter', 'mehr futter', 'noch mehr', 'nochmal füttern')) return { mood: 'genervt', text: '🤦‍♂️ Ach Junge … am Futter liegt’s net. Lass die Boilies im Eimer und probier lieber was anderes: ein Zig oder eine Rute umlegen.' };
if (hat('farb', 'gelb', 'pink', 'weiß', 'weiss')) return { mood: 'happy', text: 'Am ACW auffällig: Gelb, Weiß oder Pink als Pop-up oder Wafter. Im trüben Weiher über Schlamm muss man den Köder sehen. Am VSA eher dezent, Braun oder Natur – klares Wasser, und die Fische kennen jeden Trick.' };
if (hat('wann gehen', 'wann angeln', 'wann geht')) return { mood: 'aufgeregt', text: 'Sobald ★★★★ in der Vorhersage auftaucht, sag ich Bescheid – versprochen. Schau solang in „Ansitz planen“.' };
if (hat('umschwung', 'wird mild', 'milder')) return { mood: 'aufgeregt', text: 'Umschwung von kalt auf mild – genau auf so einen Tag warten wir! Dann nix wie hin und am besten bis in die Nacht bleiben.' };
if (hat('gewitter', 'sturm')) return { mood: 'sorge', text: 'Bei Gewitter zuerst du: Ruten flach legen, weg vom Wasser, Carbon leitet. Die Karpfen laufen dir net weg.' };
if (hat('frost', 'kalt', 'eis', 'frier')) return { mood: 'friert', text: 'Ich frier mit. Schlafsack zu, Mütze auf, was Heißes trinken. Die Karpfen stehen jetzt tief und träge – in einer kalten, stabilen Phase hat der VSA mit dem tiefen Wasser die besseren Karten.' };
if (hat('einpacken', 'heimfahr', 'feierabend', 'ich pack')) return { mood: 'zufrieden', text: 'War gut heut. Trag noch ein, wie’s war – auch Schneider sind Daten. Und sag daheim Bescheid, dass du losfährst.' };
if (hat('zig')) return { mood: 'rechnet', text: 'Zig lieber zu hoch anfangen und dann schrittweise runter. Am VSA hast du dir 3–5 m über Grund im tiefes Loch notiert. Und net alle halbe Stunde reinholen.' };
if (hat('futter', 'füttern', 'fütter', 'boilie', 'kilo', 'kg')) return { mood: 'rechnet', text: 'Bei der Kälte wenig. Zwei Hände pro Rute reichen. Lieber nachlegen, wenn’s beißt, als den Platz vorher zuschütten.' };
if (hat('platz', 'spot', 'stelle', 'wo ')) return allg ? { mood: 'rechnet', text: 'Im Winter am ACW: Dammbereich, Inselkante oder die tiefe Rinne. Am VSA: der Sattel zwischen den Löchern oder die Südkante vom tiefes Loch – da hast du tiefes Wasser in kurzer Wurfweite.' } : { mood: 'rechnet', text: 'Im Winter am ACW: Dammbereich, Inselkante oder die tiefe Rinne. Die flachen Enden kannst du dir sparen.' };
if (hat('wetter', 'druck', 'wind', 'beiß', 'beiss', 'chance', 'heute', 'nacht', 'wann')) return allg ? { mood: 'daumen', text: 'Schau in „Ansitz planen“, da rechne ich dir die nächsten Tage für ACW und VSA aus. Kurz gesagt: milde Nächte und fallender Druck sind gut, Frost und Nordost schlecht. Und wenn’s von kalt auf mild umschlägt – dann nix wie hin.' } : { mood: 'daumen', text: 'Druck fällt, die Nacht bleibt bei gut 4 °C – das passt. Der Nordost-Wind ist der Haken dran. Bleib dran.' };
if (hat('nix', 'nichts', 'kein biss', 'schneider', 'tote hose')) return { mood: 'lacht', text: 'Die Karpfen haben heute Homeoffice. Ernsthaft: Schneider ist nur ein Zwischenstand. Bleib dran.' };
if (hat('müde', 'schlafen', 'pennen')) return { mood: 'gaehnt', text: 'Ich auch. Leg dich hin, der Pieper weckt dich schon. Bissanzeiger an?' };
if (hat('gefangen', 'spiegler', 'schuppi', 'karpfen', 'fisch')) return { mood: 'freut', text: 'Sauber! Trag ihn gleich ein, dann merk ich mir Platz, Köder und Wetter. Und schick den Kollegen ein Foto, gell.' };
if (hat('danke', 'merci')) return { mood: 'happy', text: 'Passt scho. Und trink was, gell.' };
return { mood: 'neugierig', text: 'Erzähl mal mehr. Ich kenn mich aus bei Wetter und Beißzeit, Futter, Platz und Rute umlegen, Köder und Zig, Frost – und bei deinem letzten Ansitz.' };
}
beschaeftigt() {
const st = this.state || {};
const v = st.verlauf || [];
const l = v[v.length - 1];
return !!this.status() || !!(l && l.krisiu && l.n < Array.from(l.voll).length);
}
status() { const st = this.state || {}; return st.status === undefined ? 'denkt' : st.status; }
amWasser() { return (this.state || {}).art !== 'allgemein'; }
antworten(s, verlauf) {
if (this.amWasser() && (s.mood === 'rechnet' || s.mood === 'neugierig')) s = Object.assign({}, s, { mood: 'happy' });
this.stopp();
this.setState({ verlauf: verlauf, eingabe: '', status: 'denkt' });
this._t1 = setTimeout(() => this.setState({ status: s.mood }), 1200);
this._t2 = setTimeout(() => this.tippen(s), 2400);
}
tippen(s) {
const st = this.state || {};
this.setState({ verlauf: (st.verlauf || []).concat([{ krisiu: true, mood: s.mood, voll: s.text, n: 0 }]), status: '' });
this._iv = setInterval(() => {
const w = ((this.state || {}).verlauf || []).slice();
const l = Object.assign({}, w[w.length - 1]);
const g = Array.from(l.voll).length;
l.n = Math.min(g, l.n + 2);
w[w.length - 1] = l;
this.setState({ verlauf: w });
if (l.n >= g) clearInterval(this._iv);
}, 38);
}
senden() {
const st = this.state || {};
const t = (st.eingabe || '').trim();
if (!t || this.beschaeftigt()) return;
this.antworten(this.waehle(t), (st.verlauf || []).concat([{ ich: true, text: t }]));
}
gruss(art) {
return art === 'allgemein'
? { mood: 'happy', text: 'Ei gude! Allgemeiner Chat, ohne Ansitz. Planung, Köder, Montagen – frag einfach.' }
: { mood: 'happy', text: (this.props.daten || {}).gruss || 'Ei gude! Was liegt an?' };
}
art(a) {
const st = this.state || {};
if ((st.verlauf || []).some((m) => m.ich)) return;
this.setState({ art: a });
this.antworten(this.gruss(a), []);
}
mehr(st) {
const allg = st.art === 'allgemein';
const an = "display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; box-sizing: border-box; border-radius: 12px; font: 600 17px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; cursor: pointer; border: 1px solid #00FF5E; background: #00FF5E; color: #000000";
const aus = "display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; box-sizing: border-box; border-radius: 12px; font: 600 17px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; cursor: pointer; border: 1px solid #444444; background: #141414; color: #ece8dc";
return {
unter: allg ? 'allgemein · ohne Ansitz' : (this.props.daten || {}).unter || 'zum Ansitz',
leer: !(st.verlauf || []).some((m) => m.ich),
istAnsitz: !allg, istAllg: allg,
tabAnsitz: allg ? aus : an, tabAllg: allg ? an : aus,
zeigeAnsitz: () => this.art('ansitz'),
zeigeAllg: () => this.art('allgemein')
};
}
renderVals() {
const st = this.state || {};
const M = this.M();
const verlauf = (st.verlauf || []).map((m) => {
if (m.ich) return { ich: true, krisiu: false, text: m.text, label: '', labelStil: '', blase: '' };
const x = M[m.mood] || M.neugierig;
const z = Array.from(m.voll);
const fertig = m.n >= z.length;
return { ich: false, krisiu: true, text: z.slice(0, m.n).join('') + (fertig ? '' : ' ▍'), label: x[0] + ' ' + x[1], labelStil: "margin: 2px 0 -6px 40px; font-size: 12.5px; font-weight: 600; font-style: italic; color: " + x[2], blase: "flex: 1; min-width: 0; padding: 11px 14px; border-radius: 16px 16px 16px 4px; background: #0c0c0c; font-size: 15.5px; font-weight: 600; line-height: 1.38; white-space: pre-wrap; border: 1px solid " + x[3] };
});
const s = this.status();
const x = s ? M[s] : null;
return Object.assign({
amWasser: this.amWasser(),
verlauf: verlauf,
warte: !!s,
statusText: x ? x[1] + ' … ' + x[0] : '',
statusStil: x ? "padding: 11px 15px; border-radius: 16px 16px 16px 4px; background: #0c0c0c; font-size: 15px; font-style: italic; border: 1px solid " + x[3] + '; color: ' + (s === 'denkt' ? '#cfcabb' : x[2]) : '',
eingabe: st.eingabe || '',
tippe: (e) => this.setState({ eingabe: e.target.value }),
taste: (e) => { if (e.key === 'Enter') { e.preventDefault(); this.senden(); } },
senden: () => this.senden(),
liste: (el) => { this._liste = el; }
}, this.mehr ? this.mehr(st) : {});
}
}
return Component;
}
