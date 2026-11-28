// 9 · Deine Fische, 9a · Steckbrief, 9b · Kennst du den? (Wiederfang), Rekorde – 1:1 wie Entwurf.
// Krisiu vergleicht keine Fotos selbst – das entscheidet der Angler. Alles bleibt auf dem Gerät.
import VF from '../vorlagen/Fische.js';
import macheF from '../vorlagen/Fische.logik.js';
import VS from '../vorlagen/Steckbrief.js';
import macheS from '../vorlagen/Steckbrief.logik.js';
import VW from '../vorlagen/Wiederfang.js';
import macheW from '../vorlagen/Wiederfang.logik.js';
import VR from '../vorlagen/Rekorde.js';
import macheR from '../vorlagen/Rekorde.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum, HOUR } from '../core/util.js';
import { lakes, entries, fish } from '../core/repo.js';
import { photosOf } from '../core/photos.js';
import { go, toast, sicher, zahl, datumKurz } from '../ui/app.js';
import { alleSeen, beendeteAnsitze, zahlen } from '../ui/daten.js';
import { druckKlasse, tagesKlasse, bisseAus, istKarpfen } from '../ui/analyse.js';
import { fotoVon, fangVonFisch, kandidaten } from '../ui/fische.js';
import { zeitraumKurz } from './Auswertung.js';
import { wetterKurz } from './Logbuch.js';

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const kg = n => (isNum(n) ? zahl(n) + ' kg' : '–');
const plusMinus = d => (d >= 0 ? '+' : '−') + zahl(Math.abs(d)) + ' kg';
const p2 = n => String(n).padStart(2, '0');
const datumJahr = ts => { const d = new Date(ts); return `${datumKurz(d).slice(0, 2)} ${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`; };
const name = f => f.name || 'Ohne Namen';

/** See-Chips wie im Entwurf (ACW · VSA); wahl = Index in seen. */
function seeChips(that, seen, wahl) {
  const G = that.gruppen().g0;
  return seen.map((l, i) => ({ text: l.short, p: i === wahl, s: i === wahl ? G.an[0] : G.aus[0], k: () => that.wahl('g0', i) }));
}
function seeWahl(st, d) {
  if (st.see !== undefined) return st.see;
  const i = d.seen.findIndex(l => l.id === d.start);
  return i >= 0 ? i : 0;
}
async function neu(that) { const d = await that.props.neuLaden(); if (d) { that.props.daten = d; that.forceUpdate(); } }

/* ---------- Deine Fische ---------- */
class Fische extends macheF(DCLogic) {
  wahlSpezial(g, i) { if (g === 'g0') { this.setState({ see: i }); return true; } return false; }
  extra(st) {
    const d = this.props.daten, wahl = seeWahl(st, d), lake = d.seen[wahl];
    const liste = lake ? d.fische.filter(x => x.f.lakeId === lake.id) : [];
    const ohne = lake ? d.ohne[lake.id] : null;
    return {
      seen: seeChips(this, d.seen, wahl),
      anzahl: liste.length + (liste.length === 1 ? ' Fisch' : ' Fische'),
      zeigListe: liste.length > 0, leer: !liste.length,
      leerText: lake ? 'Vom ' + lake.short + ' gibt es noch keinen Fisch mit Foto.' : 'Leg zuerst ein Gewässer an.',
      fische: liste.map(x => ({ id: x.f.id, name: name(x.f), info: x.f.species + ' · ' + x.faenge.length + '× gefangen', gewicht: isNum(x.letzter.weightKg) ? kg(x.letzter.weightKg) : '', foto: x.foto, ohne: !x.foto })),
      hinweis: ohne || null
    };
  }
}
dcSeite(VF, Fische, async param => {
  const seen = await alleSeen(), alle = await entries.list();
  const fische = [];
  for (const f of await fish.list()) {
    const faenge = await fangVonFisch(f);
    if (!faenge.length) continue;
    const letzter = faenge[faenge.length - 1];
    fische.push({ f, faenge, letzter, foto: await fotoVon(letzter.id) });
  }
  fische.sort((a, b) => b.letzter.ts - a.letzter.ts);
  // Fische ohne Steckbrief: nachgetragene Ansitze (nur Anzahl) und Fänge ohne Foto
  const ohne = {};
  const ansitze = await beendeteAnsitze();
  for (const l of seen) {
    const teile = []; let rest = 0;
    for (const s of ansitze.filter(s => s.lakeId === l.id)) {
      const z = await zahlen(s), eingetragen = z.eintraege.filter(e => e.type === 'fang');
      const n = Math.max(0, z.fische - eingetragen.length);
      if (n) teile.push({ n, s, karpfen: eingetragen.every(e => istKarpfen(e.species)) });
    }
    for (const e of alle.filter(e => e.lakeId === l.id && e.type === 'fang' && !e.fishId)) if (!(await photosOf(e.id)).length) rest++;
    if (teile.length === 1 && !rest) {
      const t = teile[0];
      ohne[l.id] = `Die ${t.n} ${t.karpfen ? 'Karpfen' : t.n === 1 ? 'Fisch' : 'Fische'} vom ${zeitraumKurz(t.s)} haben kein Foto und kein Gewicht. Für die gibt's leider keinen Steckbrief.`;
    } else {
      const n = teile.reduce((m, t) => m + t.n, 0) + rest;
      if (n) ohne[l.id] = `${n} ${n === 1 ? 'Fisch hat' : 'Fische haben'} kein Foto. Für die gibt's leider keinen Steckbrief – beim nächsten Mal ein Foto machen.`;
    }
  }
  return { seen, fische, ohne, start: param || (fische[0] ? fische[0].f.lakeId : null) };
}, { auch: ['fische'] });

/* ---------- Steckbrief ---------- */
class Steckbrief extends macheS(DCLogic) {
  async componentDidMount() {
    const d = this.props.daten; if (!d) return go('Fische');
    if (d.letzter) this.setState({ foto: await fotoVon(d.letzter.id, true) });
  }
  async speichern(aenderung, text) {
    const f = this.props.daten.f;
    if (await sicher(() => fish.save(Object.assign({ id: f.id }, aenderung)))) { await neu(this); if (text) this.zeige(text); }
  }
  extra(st) {
    const d = this.props.daten; if (!d) return {};
    const { f, faenge, lake } = d, erster = faenge[0], letzter = faenge[faenge.length - 1];
    const gew = faenge.filter(e => isNum(e.weightKg));
    const zugelegt = gew.length > 1 ? gew[gew.length - 1].weightKg - gew[0].weightKg : null;
    const mitDruck = faenge.filter(e => druckKlasse(e.weather)), fallend = mitDruck.filter(e => druckKlasse(e.weather) === 'fallend');
    const nacht = faenge.filter(e => tagesKlasse(e) === 'Nacht');
    const zahlWort = n => ['null', 'Einer', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs'][n] || String(n);
    let krisiuText = null;
    if (faenge.length >= 2 && mitDruck.length >= 2 && fallend.length / mitDruck.length >= 0.6) krisiuText = `${name(f)} kommt gern, wenn der Druck fällt. ${zahlWort(fallend.length)} von ${mitDruck.length} Fängen. Wenn's wieder so weit ist, sag ich Bescheid.`;
    else if (faenge.length >= 2 && nacht.length / faenge.length >= 0.6) krisiuText = `${name(f)} kommt gern nachts. ${zahlWort(nacht.length)} von ${faenge.length} Fängen.`;
    else if (faenge.length === 1) krisiuText = 'Fängst du ihn wieder, merk ich mir, bei welchem Wetter er kommt.';
    const merkmale = f.merkmale || [];
    return {
      pille: lake ? lake.short : f.species,
      foto: st.foto || null, ohneFoto: !st.foto,
      name: name(f), artOrt: f.species + (lake ? ' · ' + lake.name : ''),
      umbenennen: () => {
        const t = window.prompt('Wie heißt der Fisch?', f.name || '');
        if (t === null) return;
        this.speichern({ name: t.trim() }, t.trim() ? 'Name gespeichert: ' + t.trim() : 'Name entfernt');
      },
      anzahl: faenge.length + '×',
      seit: erster ? 'seit ' + MONATE[new Date(erster.ts).getMonth()] + ' ' + new Date(erster.ts).getFullYear() : '–',
      zuletzt: letzter ? kg(letzter.weightKg) : '–',
      zuletztDatum: letzter ? datumKurz(new Date(letzter.ts)) : '–',
      zugelegt: zugelegt == null ? '–' : plusMinus(zugelegt),
      zugelegtText: zugelegt == null ? (gew.length ? 'erst 1 Gewicht' : 'kein Gewicht') : 'seit dem 1. Fang',
      merkmale: merkmale.map((m, i) => ({
        text: m,
        k: () => { if (window.confirm('„' + m + '“ aus dem Steckbrief löschen?')) this.speichern({ merkmale: merkmale.filter((_, j) => j !== i) }, 'Gelöscht'); }
      })),
      merkmalNeuText: merkmale.length ? 'Weiteres Zeichen dazuschreiben' : 'Erkennungszeichen dazuschreiben',
      merkmalNeu: () => {
        const t = (window.prompt('Woran erkennst du ihn? z. B. Narbe an der Schwanzwurzel', '') || '').trim();
        if (t) this.speichern({ merkmale: merkmale.concat([t]) }, 'Gemerkt');
      },
      faenge: faenge.slice().reverse().map((e, i) => ({
        id: e.id, rand: i === 0 ? '#00FF5E' : '#2e2e2e',
        titel: datumJahr(e.ts) + ' · ' + e.time.slice(11),
        rute: [e.spotName || e.rod, e.bait ? e.bait.replace(' + ', ' mit ') : null].filter(Boolean).join(' · ') || 'ohne Angaben',
        wetter: wetterZeileKurz(e.weather) || 'Wetter fehlt noch',
        gewicht: isNum(e.weightKg) ? kg(e.weightKg) : ''
      })),
      krisiuText
    };
  }
}
function wetterZeileKurz(w) {
  if (!w) return null;
  const t = isNum(w.tempC) ? zahl(w.tempC) + ' °C' : null;
  const dk = druckKlasse(w);
  return [t, dk ? 'Druck ' + dk : null, w.windDir ? 'Wind ' + w.windDir : null].filter(Boolean).join(' · ') || null;
}
dcSeite(VS, Steckbrief, async id => {
  const f = id ? await fish.get(id) : null;
  if (!f) return null;
  const faenge = await fangVonFisch(f);
  return { f, faenge, letzter: faenge[faenge.length - 1] || null, lake: await lakes.get(f.lakeId) };
}, { auch: ['steckbrief'] });

/* ---------- Kennst du den? ---------- */
class Wiederfang extends macheW(DCLogic) {
  renderVals() { return this.extra(this.state || {}); }
  async componentDidMount() {
    const d = this.props.daten; if (!d) return go('Faenge');
    const fotos = {};
    for (const k of d.kandidaten) fotos[k.f.id] = await fotoVon(k.letzter.id, true);
    this.setState({ eFoto: await fotoVon(d.e.id, true), fotos });
  }
  extra(st) {
    const d = this.props.daten; if (!d) return {};
    const { e, lake } = d, liste = d.kandidaten, i = (st.nr || 0) % Math.max(1, liste.length), k = liste[i] || null;
    const diff = k && isNum(e.weightKg) && isNum(k.letzter.weightKg) ? e.weightKg - k.letzter.weightKg : null;
    const punkte = k ? (k.f.merkmale || []).slice(0, 4) : [];
    if (diff != null) punkte.push('Gewicht: ' + plusMinus(diff) + ' seit ' + MONATE[new Date(k.letzter.ts).getMonth()]);
    const wiederWort = n => (n === 1 ? 'einmal' : n === 2 ? 'zweimal' : n === 3 ? 'dreimal' : n + '-mal');
    const schon = d.zugeordnet;
    return {
      pille: e.species,
      eFoto: st.eFoto || null,
      eTitel: e.species + (isNum(e.weightKg) ? ' · ' + kg(e.weightKg) : ''),
      eInfo: [datumKurz(new Date(e.ts)), e.rod].filter(Boolean).join(' · '),
      kLabel: liste.length > 1 ? `Steckbrief ${i + 1}/${liste.length}` : 'Steckbrief',
      naechster: () => { if (liste.length > 1) this.setState({ nr: i + 1 }); },
      kFoto: k && st.fotos ? st.fotos[k.f.id] : null,
      kTitel: k ? '„' + name(k.f) + '“' + (isNum(k.letzter.weightKg) ? ' · ' + kg(k.letzter.weightKg) : '') : 'Noch kein Steckbrief',
      kInfo: k ? [datumKurz(new Date(k.letzter.ts)), k.letzter.spotName || k.letzter.rod].filter(Boolean).join(' · ') : 'von diesem ' + e.species + (lake ? ' am ' + lake.short : ''),
      krisiuText: schon && k ? `Der ist schon als „${name(k.f)}“ eingetragen.`
        : k ? `Vergleich Schuppenbild, Narben und Flossen mit „${name(k.f)}“. Der hat dich schon ${wiederWort(k.faenge.length)} besucht. Derselbe?` + (liste.length > 1 ? ' Tipp aufs Foto für den nächsten Steckbrief.' : '')
          : `Für diesen ${e.species} gibt's noch keinen Steckbrief. Leg einen an – beim nächsten Mal erkennst du ihn wieder.`,
      mitPunkten: punkte.length > 0, punkte,
      jaText: schon && k ? 'Zum Steckbrief' : k ? 'Ja, das ist ' + (k.f.name || 'derselbe') : 'Steckbrief anlegen',
      neinText: schon || !k ? 'Zu meinen Fängen' : 'Nein, neuer Fisch',
      ja: async ev => {
        if (ev) ev.preventDefault();
        if (schon && k) return go('Steckbrief', k.f.id);
        if (k) {
          if (await sicher(() => entries.save({ id: e.id, fishId: k.f.id }))) { sessionStorage.setItem('krisiu-toast', k.f.name ? 'Willkommen zurück, ' + k.f.name + '!' : 'Als Wiederfang gespeichert.'); go('Steckbrief', k.f.id); }
          return;
        }
        await this.neuerFisch();
      },
      nein: async ev => {
        if (ev) ev.preventDefault();
        if (schon || !k) return go('Faenge');
        await this.neuerFisch();
      }
    };
  }
  async neuerFisch() {
    const e = this.props.daten.e;
    const f = await sicher(() => fish.save({ lakeId: e.lakeId, species: e.species }));
    if (f && await sicher(() => entries.save({ id: e.id, fishId: f.id }))) { sessionStorage.setItem('krisiu-toast', 'Neuer Fisch – mit eigenem Steckbrief.'); go('Steckbrief', f.id); }
  }
}
dcSeite(VW, Wiederfang, async id => {
  let e = id ? await entries.get(id) : null;
  if (!e || e.type !== 'fang') e = (await entries.list()).filter(x => x.type === 'fang').sort((a, b) => b.ts - a.ts)[0];
  if (!e) return null;
  let liste = (await kandidaten(e)).map(x => ({ f: x.f, faenge: x.fänge, letzter: x.letzter })), zugeordnet = false;
  if (e.fishId) {
    const f = await fish.get(e.fishId);
    if (f) { const faenge = await fangVonFisch(f); liste = [{ f, faenge, letzter: faenge.filter(x => x.id !== e.id).pop() || faenge[faenge.length - 1] }]; zugeordnet = true; }
  }
  // Nächster zuerst: ähnlichstes Gewicht, dann zuletzt gefangen
  liste.sort((a, b) => {
    const da = isNum(e.weightKg) && isNum(a.letzter.weightKg) ? Math.abs(e.weightKg - a.letzter.weightKg) : 99;
    const db = isNum(e.weightKg) && isNum(b.letzter.weightKg) ? Math.abs(e.weightKg - b.letzter.weightKg) : 99;
    return da - db || b.letzter.ts - a.letzter.ts;
  });
  return { e, lake: await lakes.get(e.lakeId), kandidaten: liste, zugeordnet };
}, { auch: ['wiederfang'] });

/* ---------- Rekorde ---------- */
class Rekorde extends macheR(DCLogic) {
  wahlSpezial(g, i) { if (g === 'g0') { this.setState({ see: i }); return true; } return false; }
  extra(st) {
    const d = this.props.daten, wahl = seeWahl(st, d), lake = d.seen[wahl];
    const liste = lake ? d.rekorde[lake.id] : [];
    return {
      seen: seeChips(this, d.seen, wahl),
      zeigListe: liste.some(r => r.hat), leer: !liste.some(r => r.hat),
      leerText: lake ? 'Am ' + lake.short + ' gibt es noch keine Rekorde – dafür fehlen noch Fänge.' : 'Leg zuerst ein Gewässer an.',
      rekorde: liste.map(r => ({ titel: r.titel, info: r.info, wert: r.wert, link: r.link || '#/Rekorde', farbe: r.hat ? '#ece8dc' : '#5a5a5a', rand: r.neu ? '#00FF5E' : '#2e2e2e' }))
    };
  }
}
dcSeite(VR, Rekorde, async param => {
  const seen = await alleSeen(), alle = await entries.list(), ansitze = await beendeteAnsitze();
  const rekorde = {};
  const frisch = ts => Date.now() - ts < 14 * 24 * HOUR;
  for (const l of seen) {
    const z = [], faenge = alle.filter(e => e.lakeId === l.id && e.type === 'fang');
    let meist = null;
    for (const s of ansitze.filter(s => s.lakeId === l.id)) {
      const zz = await zahlen(s);
      if (zz.fische && (!meist || zz.fische > meist.z.fische)) meist = { s, z: zz };
    }
    z.push(meist
      ? { titel: 'Meiste Fische an einem Ansitz', info: [zeitraumKurz(meist.s) + new Date(meist.s.endTs || meist.s.startTs).getFullYear(), wetterKurz(meist.s.weather)].filter(Boolean).join(' · '), wert: fischTextKurz(meist.z), hat: true, neu: frisch(meist.s.endTs || meist.s.startTs), link: '#/Auswertung/' + meist.s.id }
      : { titel: 'Meiste Fische an einem Ansitz', info: 'noch kein Ansitz mit Fisch', wert: '–' });
    const arten = [['Schwerster Spiegler', /spieg/i, 'w'], ['Schwerster Schuppi', /schupp/i, 'w'], ['Längster Graser', /gras/i, 'l']];
    for (const [t, re, art] of arten) {
      const passend = faenge.filter(e => re.test(e.species || ''));
      const feld = art === 'w' ? 'weightKg' : 'lengthCm';
      const best = passend.filter(e => isNum(e[feld])).sort((a, b) => b[feld] - a[feld])[0];
      z.push(best
        ? { titel: t, info: [datumKurz(new Date(best.ts)), best.spotName || best.rod].filter(Boolean).join(' · '), wert: art === 'w' ? kg(best.weightKg) : zahl(best.lengthCm, 0) + ' cm', hat: true, neu: frisch(best.ts), link: '#/FangKarte/' + best.id }
        : { titel: t, info: passend.length ? (art === 'w' ? 'noch kein Gewicht eingetragen' : 'noch keine Länge eingetragen') : 'noch keiner gefangen', wert: '–' });
    }
    // Meiste Bisse in einer Nacht (18–8 Uhr zählt zur Nacht davor)
    const naechte = new Map();
    bisseAus(alle.filter(e => e.lakeId === l.id)).filter(e => tagesKlasse(e) === 'Nacht').forEach(e => {
      const k = new Date(e.ts - 12 * HOUR).toDateString(); naechte.set(k, (naechte.get(k) || []).concat([e]));
    });
    const best = [...naechte.values()].sort((a, b) => b.length - a.length)[0];
    z.push(best
      ? { titel: 'Meiste Bisse in einer Nacht', info: 'Nacht zum ' + datumKurz(new Date(best[best.length - 1].ts)), wert: String(best.length), hat: true, neu: frisch(best[best.length - 1].ts) }
      : { titel: 'Meiste Bisse in einer Nacht', info: 'Bisszeiten fehlen noch', wert: '–' });
    // nur der jüngste neue Rekord leuchtet
    let jung = null; z.forEach(r => { if (r.neu && !jung) jung = r; }); z.forEach(r => { r.neu = r === jung; });
    rekorde[l.id] = z;
  }
  const mitFang = seen.find(l => rekorde[l.id].some(r => r.hat));
  return { seen, rekorde, start: param || (mitFang ? mitFang.id : null) };
}, { auch: ['rekorde'] });

function fischTextKurz(z) {
  const arten = z.eintraege.filter(e => e.type === 'fang').map(e => e.species);
  return z.fische + (arten.every(istKarpfen) ? ' Karpfen' : z.fische === 1 ? ' Fisch' : ' Fische');
}
