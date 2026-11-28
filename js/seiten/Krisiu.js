// 5 · Krisiu: Assistent, Chats, Chat und neuer Chat – 1:1 wie Entwurf. Feste Antworten (keine KI),
// aber mit deinen echten Daten: Wetter und Sterne von heute, Ruten, Futter, Fänge, letzter Ansitz, Platz-Regeln aus der Startdatei.
import VA from '../vorlagen/Assistent.js';
import VL from '../vorlagen/KrisiuChats.js';
import VC from '../vorlagen/KrisiuChat.js';
import VN from '../vorlagen/KrisiuChatNeu.js';
import macheNeu from '../vorlagen/KrisiuChatNeu.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum, HOUR } from '../core/util.js';
import { lakes, settings, mapOf } from '../core/repo.js';
import { go, zahl, uhrzeit, dauer } from '../ui/app.js';
import { laufenderAnsitz, beendeteAnsitze, zahlen, krisiuLage, krisiuHinweise, wetterJetzt, STIMMUNG, alleSeen, rutenVon } from '../ui/daten.js';
import { bisseAus, muster, istKarpfen } from '../ui/analyse.js';
import { platzTipp } from '../ui/planen.js';
import { tagesBewertung, faktoren, TAG_WORT } from './wetter.js';
import { uferSeiten, seitenName } from './ufer.js';
import { zeitraumKurz } from './Auswertung.js';
const fokus = () => { const f = document.querySelector('#app input[type=text], #app textarea'); if (f) f.focus(); };

const CHATS = 'krisiu-chats';
const p2 = n => String(n).padStart(2, '0');
const neueId = () => 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export async function chatsLaden() { return (await settings.get(CHATS, [])) || []; }
async function chatSpeichern(chat) {
  const alle = await chatsLaden(), i = alle.findIndex(c => c.id === chat.id);
  if (i >= 0) alle[i] = chat; else alle.unshift(chat);
  await settings.set(CHATS, alle.slice(0, 60));
}
const fischText = z => { const n = z.fische, k = z.eintraege.filter(e => e.type === 'fang').every(e => istKarpfen(e.species)); return n + (k ? ' Karpfen' : n === 1 ? ' Fisch' : ' Fische'); };

/** Was Krisiu für Antworten braucht – einmal laden, dann wird nur noch nachgeschaut. */
async function kontext(sessionId) {
  const lauf = await laufenderAnsitz();
  const fertig = await beendeteAnsitze();
  const s = sessionId ? (lauf && lauf.id === sessionId ? lauf : fertig.find(x => x.id === sessionId) || null) : lauf;
  const lake = s ? await lakes.get(s.lakeId) : (await alleSeen()).find(l => isNum(l.lat)) || null;
  return { s, lauf, lake, letzter: fertig[0] || null, fertig };
}
async function kontextWetter(ctx) {
  if (ctx.bw || !ctx.lake || !isNum(ctx.lake.lat)) return ctx;
  try { ctx.bw = await tagesBewertung(ctx.lake); } catch (e) { ctx.bw = null; }
  try { ctx.map = await mapOf(ctx.lake.id); } catch (e) { ctx.map = null; }
  if (ctx.s) ctx.z = await zahlen(ctx.s);
  if (ctx.letzter) ctx.zl = await zahlen(ctx.letzter);
  return ctx;
}

/** Antworten mit echten Daten; null = die festen Regeln aus dem Entwurf antworten. */
function echteAntwort(t, ctx, allg) {
  const f = t.toLowerCase(), hat = (...w) => w.some(x => f.includes(x));
  const { s, lake, bw, z } = ctx;
  if (hat('nachfütter', 'mehr futter', 'noch mehr', 'nochmal füttern') && s && z && !allg) {
    const std = Math.round((Date.now() - s.startTs) / HOUR), tage = std >= 48 ? Math.round(std / 24) + ' Tage' : std + ' Stunden';
    if (!z.bisse && z.futterKg >= 3) return { mood: 'genervt', text: `🤦‍♂️🤦‍♂️🤦‍♂️\nAch Junge … ${tage}, ${zahl(z.futterKg)} kg auf dem Platz und noch kein Biss – am Futter liegt’s net. Lass die Boilies im Eimer und probier lieber was anderes: ein Zig oder eine Rute umlegen.` };
    if (z.bisse) return { mood: 'rechnet', text: `Es beißt ja – ${z.bisse} ${z.bisse === 1 ? 'Biss' : 'Bisse'} bisher. Leg nur da nach, wo’s gebissen hat: eine Handvoll pro Rute, net mehr.` };
  }
  if (hat('letzt', 'wie lief', 'wie war')) {
    const L = ctx.letzter, zl = ctx.zl;
    if (L && zl) {
      const b = bisseAus(zl.eintraege), m = b.length ? muster(b) : null;
      return { mood: zl.fische ? 'freut' : 'lacht', text: `${zeitraumKurz(L)}: ${zl.fische ? fischText(zl) : 'Schneider'}${zl.bisse ? ', ' + zl.bisse + (zl.bisse === 1 ? ' Biss' : ' Bisse') : ''}, ${dauer((L.endTs || L.startTs) - L.startTs)} am Wasser.` + (m && m.titel ? ` Die meisten Bisse kamen: ${m.titel}.` : '') + ' Alles Weitere steht in der Auswertung.' };
    }
    return { mood: 'neugierig', text: 'Ich hab noch keinen beendeten Ansitz von dir. Fang einen an – dann erzähl ich dir hinterher alles.' };
  }
  if (hat('wann gehen', 'wann angeln', 'wann geht')) return null;
  if (hat('platz', 'spot', 'stelle', 'wo ', 'umleg', 'umlegen')) {
    if (!lake) return null;
    if (!bw || !bw.t) return { mood: 'rechnet', text: lake.tipps ? (lake.tipps.normal || lake.tipps.kalt) : 'Für ' + lake.name + ' hab ich noch keine Platz-Regeln. Die kommen mit deiner Startdatei.' };
    let txt = platzTipp(lake, bw.t, bw.b || {});
    if (ctx.map && bw.t.wind) { const auf = seitenName(ctx.map, uferSeiten(ctx.map, bw.t.wind).auf); if (auf && !txt.includes('auflandig')) txt += ` Heute drückt der ${bw.t.wind}-Wind aufs ${auf}.`; }
    if (s && z && !allg) {
      const pro = rutenVon(s).map(r => ({ r, n: z.eintraege.filter(e => e.rod === 'Rute ' + r.nr && e.type !== 'beobachtung').length }));
      const leer = pro.filter(x => !x.n), voll = pro.filter(x => x.n);
      if (voll.length && leer.length) txt += ` ${leer.map(x => 'Rute ' + x.r.nr).join(' und ')} hat noch nix – leg sie näher an ${voll[0].r.spot || 'Rute ' + voll[0].r.nr}.`;
      else if (!z.bisse && (Date.now() - s.startTs) / HOUR >= 4) txt += ' Nach vier Stunden ohne Biss würd ich eine Rute umlegen.';
    }
    return { mood: 'rechnet', text: txt };
  }
  if (hat('wetter', 'druck', 'wind', 'beiß', 'beiss', 'chance', 'heute', 'nacht', 'wann', 'lohnt')) {
    if (!bw || !bw.b) return lake ? { mood: 'denkt', text: 'Das Wetter für heute hab ich gerade net – ohne Netz kann ich nix nachschauen. Probier’s gleich nochmal.' } : null;
    const n = bw.b.sterne, F = faktoren(bw.t, bw.v, bw.b, lake.art);
    const kurz = x => x.name + ' ' + (x.name === 'Druck' || x.name === 'Wind' ? x.wert : x.notiz);
    const plus = F.filter(x => x.art > 0).map(kurz).slice(0, 3), minus = F.filter(x => x.art < 0).map(kurz).slice(0, 3);
    const fenster = bw.fenster ? ' Bestes Fenster: ' + bw.fenster.zeit + '.' : '';
    return { mood: n >= 4 ? 'aufgeregt' : n <= 2 ? 'friert' : 'daumen', text: `Heute am ${lake.short}: ${'★'.repeat(n)}${'☆'.repeat(5 - n)} – ${TAG_WORT[n].toLowerCase()}.` + (plus.length ? ' Dafür: ' + plus.join(', ') + '.' : '') + (minus.length ? ' Dagegen: ' + minus.join(', ') + '.' : '') + fenster };
  }
  if (hat('köder', 'boilie', 'pop-up', 'popup', 'wafter', 'mais', 'tigernuss') && !hat('futter', 'füttern', 'kilo', 'kg')) {
    return null;
  }
  if (hat('rekord', 'schwerst', 'größt')) return null;
  return null;
}

/* ---------- Chat (bestehend und neu) ---------- */
const Basis = macheNeu(DCLogic);
class Chat extends Basis {
  async componentDidMount() {
    const d = this.props.daten || {};
    this.ctx = d.ctx;
    const vorher = (d.chat && d.chat.nachrichten) || [];
    const st = { art: d.art, verlauf: vorher.map(m => (m.ich ? { ich: true, text: m.text } : { krisiu: true, mood: m.mood, voll: m.text, n: Array.from(m.text).length })), status: '' };
    this.chatId = d.chat ? d.chat.id : null;
    this.gespeichert = st.verlauf.length;
    this.setState(st);
    kontextWetter(this.ctx).then(() => { this.bereit = true; if (this.wartend) { this.wartend = false; this.antwortAufLetzte(); } });
    if (this._liste) this._liste.scrollTop = this._liste.scrollHeight;
    if (d.frage) this.frage(d.frage, st.verlauf);
    else if (!vorher.length) this.antworten(this.gruss(d.art), st.verlauf);
  }
  antwortAufLetzte() {
    const v = (this.state || {}).verlauf || [], letzte = v.filter(m => m.ich).pop();
    if (letzte) this.antworten(this.waehle(letzte.text), v);
  }
  frage(t, verlauf) {
    const v = (verlauf || (this.state || {}).verlauf || []).concat([{ ich: true, text: t }]);
    if (!this.bereit) { this.stopp(); this.setState({ verlauf: v, status: 'denkt', eingabe: '' }); this.wartend = true; return; }
    this.antworten(this.waehle(t), v);
  }
  senden() {
    const st = this.state || {}, t = (st.eingabe || '').trim();
    if (!t) { fokus(); return; }
    if (this.beschaeftigt()) return;
    this.frage(t);
  }
  waehle(t) {
    const allg = (this.state || {}).art === 'allgemein';
    return (this.ctx && echteAntwort(t, this.ctx, allg)) || super.waehle(t);
  }
  amWasser() { const d = this.props.daten || {}; return (this.state || {}).art !== 'allgemein' && !!(d.ctx && d.ctx.lauf && d.ctx.s && d.ctx.lauf.id === d.ctx.s.id); }
  async componentDidUpdate() {
    super.componentDidUpdate && super.componentDidUpdate();
    const st = this.state || {}, v = st.verlauf || [];
    if (this.beschaeftigt() || !v.some(m => m.ich) || v.length === this.gespeichert) return;
    this.gespeichert = v.length;
    const d = this.props.daten || {};
    const chat = { id: this.chatId || neueId(), art: st.art || 'ansitz', sessionId: st.art === 'allgemein' ? null : (d.ctx.s ? d.ctx.s.id : null), lakeId: d.ctx.lake ? d.ctx.lake.id : null,
      nachrichten: v.map(m => (m.ich ? { ich: true, text: m.text } : { mood: m.mood, text: m.voll })), updated: Date.now() };
    this.chatId = chat.id;
    await chatSpeichern(chat);
  }
  renderVals() {
    const r = super.renderVals(), d = this.props.daten || {}, st = this.state || {};
    const allg = st.art === 'allgemein';
    return Object.assign(r, {
      pille: allg ? 'Allgemein' : d.ctx && d.ctx.lauf && d.ctx.s && d.ctx.lauf.id === d.ctx.s.id ? 'Ansitz läuft' : d.ctx && d.ctx.s ? zeitraumKurz(d.ctx.s) : 'Neuer Chat',
      unter: allg ? 'allgemein · ohne Ansitz' : d.unter || 'zum Ansitz'
    });
  }
}
async function chatDaten(param, neu) {
  const [a, b] = String(param || '').split('~');
  const frage = b || null;
  let chat = null, sessionId = null, art = null;
  if (!neu && a) chat = (await chatsLaden()).find(c => c.id === a) || null;
  if (neu && a && a !== 'allgemein') sessionId = a;
  if (neu && a === 'allgemein') art = 'allgemein';
  if (chat) { sessionId = chat.sessionId; art = chat.art; }
  const ctx = await kontext(sessionId);
  if (!art) art = ctx.s ? 'ansitz' : 'allgemein';
  const s = ctx.s, laeuft = s && ctx.lauf && ctx.lauf.id === s.id;
  const unter = s ? 'zum Ansitz am ' + (ctx.lake ? ctx.lake.short : '?') + (laeuft ? ' · läuft seit ' + uhrzeit(new Date(s.startTs)) : ' · ' + zeitraumKurz(s)) : 'zum Ansitz';
  const gruss = s ? (laeuft ? `Ei gude! Chat zu deinem Ansitz am ${ctx.lake.short}. Ich kenn dein Wetter, deine Ruten und was du heute eingetragen hast. Was liegt an?` : `Ei gude! Chat zu deinem Ansitz am ${ctx.lake.short}, ${zeitraumKurz(s)}. Frag mich, was da los war.`) : 'Ei gude! Was liegt an?';
  return { chat, ctx, art, frage, unter, gruss };
}
dcSeite(VC, Chat, p => chatDaten(p, false), { auch: ['krisiuchat'] });
dcSeite(VN, Chat, p => chatDaten(p, true), { auch: ['krisiuchatneu'] });

/* ---------- Alle Chats ---------- */
class Chats extends DCLogic {
  renderVals() {
    const d = this.props.daten;
    return { ansitze: d.ansitze, allgemein: d.allgemein };
  }
}
dcSeite(VL, Chats, async () => {
  const chats = await chatsLaden(), lauf = await laufenderAnsitz(), fertig = (await beendeteAnsitze()).slice(0, 6);
  const seen = {}; (await lakes.list()).forEach(l => { seen[l.id] = l; });
  const letzteZeile = c => { const m = c.nachrichten[c.nachrichten.length - 1]; return m ? (m.ich ? 'Du: ' : 'Krisiu: ') + m.text.replace(/\s+/g, ' ') : 'noch leer'; };
  const tag = s => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(s.startTs).getDay()] + ' ' + new Date(s.startTs).getDate() + '.' + (new Date(s.startTs).getMonth() + 1) + '.';
  const ansitze = [];
  for (const s of [lauf, ...fertig].filter(Boolean)) {
    const c = chats.find(x => x.sessionId === s.id && x.art !== 'allgemein'), laeuft = lauf && s.id === lauf.id, l = seen[s.lakeId];
    const titel = (l ? l.short : '?') + ' · ' + (laeuft ? tag(s) : zeitraumKurz(s) + new Date(s.endTs || s.startTs).getFullYear());
    const z = c ? null : await zahlen(s);
    ansitze.push({ link: c ? '#/KrisiuChat/' + c.id : '#/KrisiuChatNeu/' + s.id, rand: laeuft ? '#00FF5E' : '#2e2e2e', titel,
      zeile: c ? letzteZeile(c) : (z.fische ? fischText(z) : 'Schneider') + ' · noch kein Chat', laeuft: !!laeuft, rechts: laeuft ? null : c ? null : 'Starten' });
  }
  const allg = chats.filter(c => c.art === 'allgemein').map(c => ({ link: '#/KrisiuChat/' + c.id, rand: '#2e2e2e', titel: 'Allgemein · ' + new Date(c.updated).getDate() + '.' + (new Date(c.updated).getMonth() + 1) + '.', zeile: letzteZeile(c), laeuft: false, rechts: null }));
  if (!allg.length) allg.push({ link: '#/KrisiuChatNeu/allgemein', rand: '#2e2e2e', titel: 'Noch kein allgemeiner Chat', zeile: 'Planung, Köder, Montagen – ohne Ansitz', laeuft: false, rechts: 'Starten' });
  if (!ansitze.length) ansitze.push({ link: '#/KrisiuChatNeu/allgemein', rand: '#2e2e2e', titel: 'Noch kein Ansitz', zeile: 'Sobald du einen startest, bekommt er seinen Chat', laeuft: false, rechts: null });
  return { ansitze, allgemein: allg };
}, { auch: ['krisiuchats'] });

/* ---------- Assistent ---------- */
class Assistent extends DCLogic {
  async componentDidMount() {
    const d = this.props.daten;
    const wx = d.lake ? (await wetterJetzt(d.lake).catch(() => ({}))).wx : null;
    this.setState({ hinweise: d.lauf ? await krisiuHinweise(d.lauf, d.lake, wx) : [] });
  }
  renderVals() {
    const d = this.props.daten, st = this.state || {};
    const S = STIMMUNG[d.lage.art] || STIMMUNG.hallo;
    const H = (st.hinweise || []).map(h => ({ text: h.text, grund: 'Beruht auf: ' + h.grund }));
    const zuChat = q => (d.lauf ? (d.chatId ? '#/KrisiuChat/' + d.chatId : '#/KrisiuChatNeu/' + d.lauf.id) : d.chatAllg ? '#/KrisiuChat/' + d.chatAllg : '#/KrisiuChatNeu/allgemein') + '~' + encodeURIComponent(q);
    const heute = new Date(); const iso = heute.getFullYear() + '-' + p2(heute.getMonth() + 1) + '-' + p2(heute.getDate());
    const fragen = [];
    if (d.lauf) fragen.push({ text: 'Rute umlegen?', link: zuChat('Rute umlegen?') });
    else fragen.push({ text: 'Wann gehen wir angeln?', link: '#/Planen' });
    if (d.lake && isNum(d.lake.lat)) fragen.push({ text: 'Lohnt sich die Nacht?', link: '#/PlanTag/' + d.lake.id + '~' + iso });
    if (d.letzter) fragen.push({ text: 'Wie lief der letzte Ansitz?', link: '#/Auswertung/' + d.letzter.id });
    const senden = ev => {
      if (ev) ev.preventDefault();
      const t = (st.eingabe || '').trim(); if (!t) { fokus(); return; }
      if (d.lauf) go(d.chatId ? 'KrisiuChat' : 'KrisiuChatNeu', (d.chatId || d.lauf.id) + '~' + t);
      else go(d.chatAllg ? 'KrisiuChat' : 'KrisiuChatNeu', (d.chatAllg || 'allgemein') + '~' + t);
    };
    return {
      heimLink: d.lauf ? '#/Ansitz' : '#/Main', heimAria: d.lauf ? 'Zurück zum laufenden Ansitz' : 'Zur Startseite', zurueckLink: d.lauf ? '#/Ansitz' : '#/Main',
      pille: d.lauf ? 'Ansitz läuft' : 'Zu Hause',
      stimmung: S[0] + ' ' + (d.lage.text || '').replace(/^Krisiu /, ''), stimmungFarbe: S[2] === 'rot' ? '#ff1e1e' : S[2] === 'gruen' ? '#00FF5E' : '#cfcabb',
      hinweise: H, keineHinweise: !H.length,
      ruheText: d.lauf ? (st.hinweise ? 'Grad nix Besonderes. Ich meld mich, wenn sich was tut.' : 'Ich schau grad nach dem Wetter …') : 'Kein Ansitz läuft. Wenn du am Wasser bist, sag ich dir hier, was gerade wichtig ist.',
      fragen, eingabe: st.eingabe || '',
      tippe: e => this.setState({ eingabe: e.target.value }), taste: e => { if (e.key === 'Enter') { e.preventDefault(); senden(); } }, senden
    };
  }
}
dcSeite(VA, Assistent, async () => {
  const lauf = await laufenderAnsitz(), fertig = await beendeteAnsitze();
  const lake = lauf ? await lakes.get(lauf.lakeId) : (await alleSeen()).find(l => isNum(l.lat)) || null;
  const chats = await chatsLaden();
  const c = lauf ? chats.find(x => x.sessionId === lauf.id && x.art !== 'allgemein') : null;
  const ca = chats.find(x => x.art === 'allgemein');
  return { lauf, lake, letzter: fertig[0] || null, lage: await krisiuLage(), chatId: c ? c.id : null, chatAllg: ca ? ca.id : null };
}, { auch: ['krisiu', 'assistent'] });
