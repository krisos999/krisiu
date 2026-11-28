// 10 · Ansitz planen, 10a · Deine Chancen, 10b · Ein Tag – 1:1 wie Entwurf.
// Sterne nach den Faustregeln des Anglers aus der Vorhersage; ab dem 7. Tag nur Tendenz.
import VP from '../vorlagen/Planen.js';
import macheP from '../vorlagen/Planen.logik.js';
import VE from '../vorlagen/PlanErgebnis.js';
import VT from '../vorlagen/PlanTag.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum } from '../core/util.js';
import { settings } from '../core/repo.js';
import { go, toast, zahl } from '../ui/app.js';
import { alleSeen } from '../ui/daten.js';
import { beissfenster, STERNE_WORT } from '../ui/analyse.js';
import { bewerte, platzTipp } from '../ui/planen.js';

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ausIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const heute0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const plusTag = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const wt = d => TAGE[d.getDay()].slice(0, 2);
const dm = d => d.getDate() + '.' + (d.getMonth() + 1) + '.';
const lang = d => TAGE[d.getDay()] + ', ' + dm(d);
const minus = v => String(v).replace('-', '−');
const gross = s => s.charAt(0).toUpperCase() + s.slice(1);
const WORT = ['null', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
const sterneListe = n => [0, 1, 2, 3, 4].map(i => (i < n ? '#ff1e1e' : '#2e2e2e'));
const quelleText = q => (!q ? 'der Wettervorhersage' : /dwd/i.test(q) ? 'des DWD' : 'von ' + q);
const druckPhrase = (t, b) => {
  const dp = b.druckAenderung, auf = isNum(t.druckBis) ? ' auf ' + Math.round(t.druckBis) : '';
  if (dp == null) return null;
  if (dp <= -4) return 'Druck fällt deutlich' + auf; if (dp <= -1.5) return 'Druck fällt' + (dp > -2.5 ? ' leicht' : '');
  if (dp >= 4) return 'Druck steigt stark' + auf; if (dp >= 1.5) return 'Druck steigt';
  return isNum(t.druckMittel) && t.druckMittel >= 1022 ? 'Hoch bei ' + Math.round(t.druckMittel) : 'Druck stabil';
};
const POSITIV = /milde Nacht|Druck fällt|bedeckt|Wind aus (S|SW|W)$|wärmer|leichter Regen|Umschwung/;

/* ---------- Ansitz planen ---------- */
class Planen extends macheP(DCLogic) {
  async componentDidMount() { const w = await settings.get('wecker', null); this.setState({ wecker: !!(w && w.an) }); }
  aktuellSpezial(g, st) {
    const d = this.props.daten; if (g !== 'g0' || (st.sel && st.sel.g0)) return null;
    return [d.seen.length > 1 ? d.seen.length : 0];
  }
  extra(st) {
    const d = this.props.daten, G = this.gruppen();
    const tage = Array.from({ length: 10 }, (_, i) => plusTag(heute0(), i));
    const see = this.aktuell('g0')[0];
    const chipsSee = d.seen.map(l => ({ text: l.short })).concat(d.seen.length > 1 ? [{ text: d.seen.length === 2 ? 'Beide' : 'Alle' }] : [])
      .map((c, i) => ({ text: c.text, p: i === see, s: i === see ? G.g0.an[0] : G.g0.aus[0], k: () => this.wahl('g0', i) }));
    const gew = this.aktuell('g3').slice().sort((x, y) => x - y);
    let zt = 'Noch kein Tag gewählt';
    if (gew.length === 1) zt = wt(tage[gew[0]]) + ' ' + tage[gew[0]].getDate() + '. · Tag und Nacht';
    else if (gew.length > 1) {
      const amStueck = gew[gew.length - 1] - gew[0] === gew.length - 1;
      const k = i => wt(tage[i]) + ' ' + tage[i].getDate() + '.';
      zt = (amStueck ? k(gew[0]) + ' – ' + k(gew[gew.length - 1]) : gew.length + ' Tage gewählt') + ' · ' + gew.length + ' Tage und Nächte';
    }
    if (gew.some(i => i >= 6)) zt += ' · ab dem 7. Tag nur Tendenz';
    if (!d.seen.length) zt = 'Zum Planen braucht ein Gewässer seine Lage – lies deine Startdatei ein.';
    const cur = this.aktuell('g3');
    return {
      seen: chipsSee, zeitraumText: zt,
      tage: tage.map((t, i) => { const an = cur.indexOf(i) >= 0; return { wt: wt(t), tag: t.getDate() + '.', p: an, s: an ? G.g3.an[0] : G.g3.aus[0], k: () => this.wahl('g3', i) }; }),
      weckerText: st.wecker ? 'an' : 'aus',
      pruefen: ev => {
        if (ev) ev.preventDefault();
        if (!d.seen.length) return toast('Erst ein Gewässer mit Lage – über „Mehr“ die Startdatei einlesen.', { fehler: true });
        if (!gew.length) return this.zeige('Wähl mindestens einen Tag.');
        const s = see >= d.seen.length ? 'alle' : d.seen[see].id;
        const param = [s, 'tn', gew.map(i => iso(tage[i])).join(',')].join('~');
        sessionStorage.setItem('plan-ergebnis', param);
        go('PlanErgebnis', param);
      }
    };
  }
}
dcSeite(VP, Planen, async () => ({ seen: (await alleSeen()).filter(l => isNum(l.lat)) }), { auch: ['planen'] });

/* ---------- Deine Chancen ---------- */
class PlanErgebnis extends DCLogic {
  async componentDidMount() {
    const d = this.props.daten; if (!d) return go('Planen');
    const erg = [];
    for (const lake of d.seen) erg.push(Object.assign({ lake }, await bewerte(lake, d.tage).catch(() => ({ tage: [] }))));
    this.setState({ erg });
  }
  renderVals() {
    const d = this.props.daten; if (!d) return {};
    const st = this.state || {}, tage = d.tage;
    const titel = tage.length === 1 ? wt(tage[0]) + ' ' + dm(tage[0]) : tage[0].getDate() + '.–' + dm(tage[tage.length - 1]);
    const unter = d.seen.map(l => l.short).join(' und ') + ' · Tag und Nacht · ' + (tage.length <= 10 ? WORT[tage.length] : tage.length) + (tage.length === 1 ? ' Tag' : ' Tage') + ' geprüft';
    const basis = { titel, unter, zeilen: [], mitBest: false, bestSterne: [], bestSterneAria: '', bestWort: '' };
    if (!st.erg) return Object.assign(basis, { bestTitel: 'Einen Moment …', lage: 'Die Vorhersage wird geholt.', beruht: '' });
    const alle = st.erg.flatMap(r => r.tage.filter(x => x.b).map(x => Object.assign({ lake: r.lake }, x)));
    if (!alle.length) return Object.assign(basis, { bestTitel: 'Keine Vorhersage', lage: navigator.onLine === false ? 'Ohne Netz gibt es keine Vorhersage. Versuch es gleich noch mal.' : 'Für diese Tage liegt noch keine Vorhersage vor – meist reicht sie etwa zehn Tage voraus.', beruht: '' });
    const best = alle.slice().sort((a, b) => b.b.roh - a.b.roh || a.tag - b.tag)[0];
    const kaltStabil = alle.filter(x => x.b.kaltStabil).length >= alle.length * 0.6;
    const mildNass = alle.filter(x => x.b.mildNass).length >= alle.length * 0.5;
    const frost = alle.filter(x => isNum(x.t.nachtMin) && x.t.nachtMin < 0).length;
    const hoch = alle.filter(x => isNum(x.t.druckMittel) && x.t.druckMittel >= 1022).length >= alle.length * 0.5;
    const umschwung = alle.find(x => x.b.umschwung);
    const satz = [];
    if (kaltStabil) satz.push('Es bleibt ' + (tage.length > 1 ? 'die ganze Zeit ' : '') + 'kalt' + (frost || hoch ? ', mit ' + [frost ? (frost === 1 ? 'einer Frostnacht' : 'Frostnächten') : null, hoch ? 'hohem Druck' : null].filter(Boolean).join(' und ') : '') + '.');
    else if (mildNass) satz.push('Mild und feucht – gute Bedingungen.');
    const plus = best.b.gruende.filter(g => POSITIV.test(g));
    if (best.b.umschwung) satz.push('Am ' + TAGE[best.tag.getDay()] + ' kommt der Umschwung von kalt-klar zu mild-trüb – das ist eine Top-Beißphase.');
    else if (plus.length) satz.push('Am ' + TAGE[best.tag.getDay()] + ' spricht am meisten dafür: ' + plus.slice(0, 3).join(', ') + '.');
    else satz.push('Am ' + TAGE[best.tag.getDay()] + ' ist es noch am wenigsten schlecht.');
    if (umschwung && umschwung !== best) satz.push('Achtung: Umschwung kalt-klar → mild-trüb am ' + lang(umschwung.tag) + '.');
    if (d.seen.length > 1 && kaltStabil) satz.push('Bei so einer Phase läuft der tiefe Baggersee besser als der flache Weiher.');
    else if (d.seen.length > 1 && mildNass) satz.push('Ein flacher Weiher reagiert darauf schneller und stärker als ein tiefer Baggersee.');
    const quellen = [...new Set(st.erg.map(r => r.quelle).filter(Boolean))];
    const tendenz = alle.some(x => x.tendenz);
    const zeilen = tage.map(tag => {
      const jeSee = st.erg.map(r => Object.assign({ lake: r.lake }, r.tage.find(x => x.tag.getTime() === tag.getTime())));
      const gut = jeSee.filter(x => x.b).sort((a, b) => b.b.roh - a.b.roh)[0];
      if (!gut) return { link: '#/PlanErgebnis/' + d.param, titel: wt(tag) + ' · ' + dm(tag), wort: '–', sterne: sterneListe(0), aria: 'keine Vorhersage', info: 'noch keine Vorhersage' };
      const t = gut.t;
      return {
        link: '#/PlanTag/' + gut.lake.id + '~' + iso(tag), titel: wt(tag) + ' · ' + dm(tag),
        wort: STERNE_WORT[gut.b.sterne] + (gut.tendenz ? ' · Tendenz' : ''), sterne: sterneListe(gut.b.sterne), aria: gut.b.sterne + ' von 5 Sternen',
        info: [jeSee.length > 1 ? 'am besten ' + gut.lake.short : null, isNum(t.nachtMin) ? 'Nacht ' + minus(zahl(t.nachtMin, 0)) + ' °C' : null, isNum(t.tagMax) && t.tagMax < 0 ? 'Dauerfrost' : isNum(t.wolken) ? (t.wolken >= 70 ? 'bedeckt' : t.wolken <= 25 ? 'klar' : null) : null,
          druckPhrase(t, gut.b), t.wind ? 'Wind ' + t.wind + (isNum(t.windKmh) && t.windKmh < 10 ? ', schwach' : '') : null].filter(Boolean).join(' · ')
      };
    });
    return Object.assign(basis, {
      bestTitel: lang(best.tag) + ' · ' + best.lake.short, mitBest: true,
      bestSterne: sterneListe(best.b.sterne), bestSterneAria: best.b.sterne + ' von 5 Sternen', bestWort: best.b.sterne + ' von 5 · ' + STERNE_WORT[best.b.sterne] + (best.tendenz ? ' · nur Tendenz' : ''),
      lage: satz.join(' '),
      beruht: 'Beruht auf: Vorhersage ' + quelleText(quellen[0]) + ' vom ' + dm(new Date()) + ' und deinen Faustregeln' + (tendenz ? ' · ab dem 7. Tag nur Tendenz' : ''),
      zeilen
    });
  }
}
dcSeite(VE, PlanErgebnis, async param => {
  const [see, , tageTxt] = String(param || sessionStorage.getItem('plan-ergebnis') || '').split('~');
  const seen = (await alleSeen()).filter(l => isNum(l.lat) && (see === 'alle' || l.id === see));
  const tage = (tageTxt || '').split(',').filter(Boolean).map(ausIso);
  if (!seen.length || !tage.length) return null;
  return { seen, tage, param: param || sessionStorage.getItem('plan-ergebnis') };
}, { auch: ['planergebnis'] });

/* ---------- Ein Tag ---------- */
class PlanTag extends DCLogic {
  async componentDidMount() {
    const d = this.props.daten; if (!d) return go('Planen');
    const r = await bewerte(d.lake, [d.tag]).catch(() => null);
    this.setState({ r, x: r && r.tage[0] });
  }
  renderVals() {
    const d = this.props.daten; if (!d) return {};
    const st = this.state || {}, x = st.x, tag = d.tag;
    const leer = { pille: wt(tag) + ' ' + dm(tag) + ' · ' + d.lake.short, titel: lang(tag), sterne: sterneListe(0), sterneAria: '', wort: st.r ? 'Keine Vorhersage' : '…',
      nacht: '–', nachtText: '', tag: '–', druck: '–', druckText: '', wind: '–', windText: '', wolken: '–', wolkenText: '', regen: '–', regenText: '',
      fenster: st.r ? 'Keine Vorhersage' : 'Einen Moment …', fensterText: st.r ? 'Für diesen Tag liegt noch keine Vorhersage vor.' : 'Die Vorhersage wird geholt.', beruht: '',
      zurueckLink: sessionStorage.getItem('plan-ergebnis') ? '#/PlanErgebnis/' + sessionStorage.getItem('plan-ergebnis') : '#/Planen' };
    if (!x || !x.b) return leer;
    const { t, b } = x, f = beissfenster(t, b), dp = b.druckAenderung;
    return Object.assign(leer, {
      sterne: sterneListe(b.sterne), sterneAria: b.sterne + ' von 5 Sternen', wort: gross(STERNE_WORT[b.sterne]) + (x.tendenz ? ' · Tendenz' : ''),
      nacht: isNum(t.nachtMin) ? minus(zahl(t.nachtMin, 0)) + ' °C' : '–', nachtText: isNum(t.nachtMin) ? (t.nachtMin < -2 ? 'Frost' : t.nachtMin < 0 ? 'leichter Frost' : t.nachtMin < 5 ? 'kalt' : 'mild') : '',
      tag: isNum(t.tagMax) ? minus(zahl(t.tagMax, 0)) + ' °C' : '–',
      druck: dp == null ? '–' : dp <= -1.5 ? 'fällt' : dp >= 1.5 ? 'steigt' : 'stabil', druckText: isNum(t.druckVon) ? Math.round(t.druckVon) + ' → ' + Math.round(t.druckBis) + ' hPa' : '',
      wind: t.wind || '–', windText: !isNum(t.windKmh) ? '' : t.windKmh < 10 ? 'schwach' : t.windKmh < 25 ? 'mäßig' : 'kräftig',
      wolken: isNum(t.wolken) ? Math.round(t.wolken) + ' %' : '–', wolkenText: !isNum(t.wolken) ? '' : t.wolken >= 80 ? 'bedeckt' : t.wolken >= 40 ? 'wolkig' : 'klar',
      regen: zahl(t.regen) + ' mm', regenText: t.regen < 0.2 ? 'trocken' : t.regen <= 8 ? 'leicht' : 'viel',
      fenster: f ? gross(f.zeit.split(' – ')[0]) : '–', fensterText: [f && f.zeit.includes(' – ') ? gross(f.zeit.split(' – ')[1]) + '.' : null, f ? f.text : null, platzTipp(d.lake, t, b)].filter(Boolean).join(' '),
      beruht: 'Beruht auf: Vorhersage ' + quelleText(st.r.quelle) + ' vom ' + dm(new Date()) + ' und deinen Faustregeln' + (x.tendenz ? ' · nur Tendenz' : '')
    });
  }
}
dcSeite(VT, PlanTag, async param => {
  const [lakeId, tagTxt] = String(param || '').split('~');
  const lake = (await alleSeen()).find(l => l.id === lakeId);
  if (!lake || !tagTxt) return null;
  return { lake, tag: ausIso(tagTxt) };
}, { auch: ['plantag'] });
