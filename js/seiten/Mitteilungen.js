// 10c · Beißphasen-Wecker und 5d · Schnell-Biss (aus der Ansitz-Mitteilung) – 1:1 wie Entwurf.
import VW from '../vorlagen/Wecker.js';
import macheW from '../vorlagen/Wecker.logik.js';
import VB from '../vorlagen/SchnellBiss.js';
import macheB from '../vorlagen/SchnellBiss.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum } from '../core/util.js';
import { lakes, entries } from '../core/repo.js';
import { go, toast, sicher, dauer } from '../ui/app.js';
import { alleSeen, laufenderAnsitz, zahlen, rutenVon, jetzt } from '../ui/daten.js';
import { weckerHolen, weckerSpeichern, serverHolen, erlaubnis } from '../core/mitteilungen.js';
import { fischText } from './Main.js';

const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const TAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const p2 = n => String(n).padStart(2, '0');

/* ---------- Beißphasen-Wecker ---------- */
class Wecker extends macheW(DCLogic) {
  wahlSpezial(g, i) {
    if (g !== 'g0') return false;
    const d = this.props.daten, an = new Set(this.gewaehlt());
    const id = d.seen[i].id; if (an.has(id)) an.delete(id); else an.add(id);
    this.setState({ seenAn: [...an] });
    return true;
  }
  gewaehlt() { const d = this.props.daten, st = this.state || {}; return st.seenAn || (d.w.seen || d.seen.map(l => l.id)); }
  extra(st) {
    const d = this.props.daten, G = this.gruppen().g0, an = this.gewaehlt(), min = st.minSterne || d.w.minSterne || 4;
    const sw = Object.assign({ w0: d.w.umschwung, w1: d.w.front, w2: d.w.wochenende, w3: d.w.warnungen, w4: !!(d.w.daheim && d.w.daheim.an) }, st.sw || {});
    const daheim = st.daheim || d.w.daheim || {};
    return {
      seen: d.seen.map((l, i) => ({ text: l.short, p: an.includes(l.id), s: an.includes(l.id) ? G.an[0] : G.aus[0], k: () => this.wahl('g0', i) })),
      sterneText: 'ab ' + '★'.repeat(min) + ' ▾',
      sterneWahl: () => this.setState({ minSterne: min >= 5 ? 3 : min + 1 }),
      daheimText: 'Beim Ansitz abends um ' + (daheim.um || '21:30') + (daheim.name ? ': kurz ' + daheim.name + ' Bescheid geben' : ': „Alles okay? Kurz daheim melden“'),
      pushText: d.server ? (erlaubnis() === 'granted' ? 'Eingerichtet ✓ – Krisiu meldet sich aufs Handy' : 'Server da, aber Mitteilungen noch nicht erlaubt') : 'Noch nicht eingerichtet – einmal kurz einrichten',
      pushRand: d.server && erlaubnis() === 'granted' ? '#00FF5E' : '#444444',
      speichern: async ev => {
        if (ev) ev.preventDefault();
        let dh = Object.assign({ um: '21:30', nummer: '', name: '' }, daheim, { an: !!sw.w4 });
        if (dh.an && !dh.nummer) {
          const name = (window.prompt('Wem sollst du Bescheid geben? (z. B. Schatz)', dh.name || '') || '').trim();
          const nummer = (window.prompt('Telefonnummer für „Schreiben“ und „Anrufen“:', dh.nummer || '') || '').replace(/[^\d+]/g, '');
          const um = (window.prompt('Um wie viel Uhr soll Krisiu fragen? (HH:MM)', dh.um || '21:30') || '21:30').trim();
          dh = Object.assign(dh, { name, nummer, um: /^\d{1,2}:\d{2}$/.test(um) ? um.padStart(5, '0') : '21:30' });
          this.setState({ daheim: dh });
        }
        const w = { umschwung: !!sw.w0, front: !!sw.w1, wochenende: !!sw.w2, warnungen: !!sw.w3, daheim: dh, seen: an, minSterne: min };
        const r = await weckerSpeichern(w);
        if (!d.server) { toast('Gespeichert. Damit Krisiu sich meldet: einmal Mitteilungen einrichten.'); return go('einstellungen'); }
        toast(r && r.ok ? 'Gespeichert – Krisiu meldet sich, wenn es sich lohnt.' : 'Gespeichert. Der Server bekommt es, sobald Netz da ist.');
        go('Planen');
      }
    };
  }
}
dcSeite(VW, Wecker, async () => {
  const w = await weckerHolen();
  return { w, seen: (await alleSeen()).filter(l => isNum(l.lat)), server: await serverHolen(), SW: { w0: w.umschwung, w1: w.front, w2: w.wochenende, w3: w.warnungen, w4: !!(w.daheim && w.daheim.an) } };
}, { auch: ['wecker'] });

/* ---------- Schnell-Biss: Zeit sofort speichern, Rute antippen, Rest nach dem Drill ---------- */
export const SCHNELL = 'Schnell-Biss (offen)';
export async function offeneSchnellBisse(s) {
  return (await zahlen(s)).eintraege.filter(e => e.notes === SCHNELL && Date.now() - e.ts < 6 * 3600e3);
}
class SchnellBiss extends macheB(DCLogic) {
  async componentDidMount() {
    const d = this.props.daten; if (!d) return go('Main');
    this.uhr = setInterval(() => this.forceUpdate(), 20000);
    await this.neuerBiss();
  }
  componentWillUnmount() { clearInterval(this.uhr); if (super.componentWillUnmount) super.componentWillUnmount(); }
  async neuerBiss() {
    const d = this.props.daten;
    const e = await sicher(() => entries.save({ lakeId: d.s.lakeId, sessionId: d.s.id, type: 'fehlbiss', time: jetzt(), notes: SCHNELL, rod: null }));
    if (e) this.setState({ eintrag: e, nr: null });
  }
  async rute(nr) {
    const st = this.state || {}; if (!st.eintrag) return;
    const e = await sicher(() => entries.save(Object.assign({}, st.eintrag, { rod: nr ? 'Rute ' + nr : null })));
    if (e) { this.setState({ eintrag: e, nr: nr || 0 }); this.zeige(nr ? 'Rute ' + nr + ' – Petri! Den Rest nach dem Drill.' : 'Gemerkt – den Rest nach dem Drill.'); setTimeout(() => go('Ansitz'), 1600); }
  }
  extra(st) {
    const d = this.props.daten; if (!d) return {};
    const t = new Date(), e = st.eintrag, G = this.gruppen().g0;
    const ruten = rutenVon(d.s).map(r => r.nr);
    const liste = (ruten.length ? ruten : [1, 2]).map(nr => ({ text: 'Rute ' + nr, nr })).concat([{ text: 'Weiß nicht', nr: 0 }]);
    return {
      datum: TAG[t.getDay()] + ', ' + t.getDate() + '. ' + MON[t.getMonth()], uhr: p2(t.getHours()) + ':' + p2(t.getMinutes()),
      info: [d.lake ? d.lake.name : null, dauer(Date.now() - d.s.startTs), fischText(d.z)].filter(Boolean).join(' · '),
      gespeichert: e ? '✓ Biss um ' + e.time.slice(11) + ' gespeichert' : 'Biss wird gespeichert …',
      ruten: liste.map((r, i) => { const an = st.nr === r.nr; return { text: r.text, p: an, s: an ? G.an[0] : G.aus[i === liste.length - 1 ? 2 : 0] || G.aus[0], k: () => this.rute(r.nr) }; }),
      krisiu: '🤞 Krisiu drückt die Daumen',
      nochEinBiss: ev => { if (ev) ev.preventDefault(); this.neuerBiss(); this.zeige('Noch ein Biss gespeichert'); }
    };
  }
}
dcSeite(VB, SchnellBiss, async () => {
  const s = await laufenderAnsitz(); if (!s) return null;
  return { s, lake: await lakes.get(s.lakeId), z: await zahlen(s) };
}, { auch: ['schnellbiss'] });
