// 8 · Meine Fänge und 8a · Fangkarte – 1:1 wie Entwurf Faenge / FangKarte.
import VF from '../vorlagen/Faenge.js';
import VK from '../vorlagen/FangKarte.js';
import macheK from '../vorlagen/FangKarte.logik.js';
import { dcSeite } from './basis.js';
import { DCLogic } from '../dc/laufzeit.js';
import { isNum } from '../core/util.js';
import { lakes, entries } from '../core/repo.js';
import { photosOf } from '../core/photos.js';
import { syncWeather } from '../core/weather-sync.js';
import { go, toast, zahl, datumKurz } from '../ui/app.js';
import { druckKlasse, tagesKlasse, regenKlasse } from '../ui/analyse.js';
import { fotoVon, wetterZeile, kandidaten } from '../ui/fische.js';

const kg = n => (isNum(n) ? zahl(n) + ' kg' : '');
export function istRekord(e, alle) {
  const frueher = alle.filter(x => x.id !== e.id && x.lakeId === e.lakeId && x.type === 'fang' && x.species === e.species && isNum(x.weightKg) && x.ts < e.ts);
  return isNum(e.weightKg) && frueher.length > 0 && e.weightKg > Math.max(...frueher.map(x => x.weightKg));
}

class Faenge extends DCLogic {
  renderVals() {
    const d = this.props.daten, letzter = d.faenge[0];
    return {
      anzahl: d.faenge.length + (d.faenge.length === 1 ? ' Fang' : ' Fänge'),
      karteLink: letzter ? '#/FangKarte/' + letzter.e.id : '#/Faenge',
      erkennenLink: d.kandidat ? '#/Wiederfang/' + d.kandidat.id : letzter ? '#/Wiederfang/' + letzter.e.id : '#/Fische',
      faenge: d.faenge.slice(0, 12).map(x => ({ id: x.e.id, art: x.e.species, info: [x.lake ? x.lake.short : null, datumKurz(new Date(x.e.ts)), x.e.rod, x.rekord ? 'Rekord' : null].filter(Boolean).join(' · '), gewicht: kg(x.e.weightKg) })),
      keine: !d.faenge.length,
      krisiuText: d.kandidat ? `Den ${d.kandidat.species} vom ${new Date(d.kandidat.ts).getDate()}.${new Date(d.kandidat.ts).getMonth() + 1}. kennst du vielleicht schon.` : null
    };
  }
}
dcSeite(VF, Faenge, async () => {
  const alle = (await entries.list()).filter(e => e.type === 'fang').sort((a, b) => b.ts - a.ts);
  const seen = {}; for (const l of await lakes.list()) seen[l.id] = l;
  const faenge = alle.map(e => ({ e, lake: seen[e.lakeId], rekord: istRekord(e, alle) }));
  let kandidat = null;
  for (const x of faenge.slice(0, 5)) if (!x.e.fishId && (await photosOf(x.e.id)).length && (await kandidaten(x.e)).length) { kandidat = x.e; break; }
  return { faenge, kandidat };
}, { auch: ['faenge'] });

class FangKarte extends macheK(DCLogic) {
  async componentDidMount() {
    const d = this.props.daten; if (!d) return go('Faenge');
    this.setState({ foto: await fotoVon(d.e.id, true) });
    if (!d.e.weather && navigator.onLine !== false) { await Promise.race([syncWeather(), new Promise(r => setTimeout(r, 6000))]); const e = await entries.get(d.e.id); if (e) { d.e = e; this.forceUpdate(); } }
  }
  extra(st) {
    const d = this.props.daten; if (!d) return {};
    const { e, lake, rekord } = d, w = e.weather;
    return {
      pille: d.frisch ? 'Gespeichert ✓' : datumKurz(new Date(e.ts)),
      foto: st.foto || null, ohneFoto: !st.foto,
      art: e.species, gewicht: kg(e.weightKg),
      ort: [lake ? lake.name : null, datumKurz(new Date(e.ts)), e.time.slice(11)].filter(Boolean).join(' · '),
      wetter: wetterZeile(w) || 'Wetter wird nachgeholt, sobald Netz da ist.',
      rute: [e.rod, e.bait ? e.bait.replace(' + ', ' mit ') : null].filter(Boolean).join(' · ') || null,
      spruch: w && druckKlasse(w) === 'fallend' ? 'Druck fällt – und du fängst. Sauber! 🎉' : tagesKlasse(e) === 'Nacht' ? 'Nachtfisch! Sauber gemacht. 🎉' : w && regenKlasse(w) === 'Regen' ? 'Bei Regen gefangen – merk ich mir. 🎉' : 'Petri Heil! 🎉',
      rekord: rekord ? 'Neuer Rekord: schwerster ' + e.species + ' am ' + (lake ? lake.short : 'Gewässer') : null,
      teilen: async ev => {
        if (ev) ev.preventDefault();
        const text = `${e.species}${e.weightKg ? ' ' + zahl(e.weightKg) + ' kg' : ''} · ${lake ? lake.name : ''} · ${datumKurz(new Date(e.ts))} ${e.time.slice(11)} Uhr`;
        try {
          const p = (await photosOf(e.id))[0];
          const datei = p && p.blob ? new File([p.blob], 'fang.jpg', { type: 'image/jpeg' }) : null;
          if (datei && navigator.canShare && navigator.canShare({ files: [datei] })) await navigator.share({ files: [datei], text });
          else if (navigator.share) await navigator.share({ text });
          else { await navigator.clipboard.writeText(text); toast('Text kopiert – jetzt einfügen, wo du willst.'); }
        } catch (err) { if (!err || err.name !== 'AbortError') toast('Teilen hat nicht geklappt.', { fehler: true }); }
      }
    };
  }
}
dcSeite(VK, FangKarte, async id => {
  const e = id ? await entries.get(id) : (await entries.list()).filter(x => x.type === 'fang').sort((a, b) => b.ts - a.ts)[0];
  if (!e) return null;
  const alle = (await entries.list()).filter(x => x.type === 'fang');
  return { e, lake: await lakes.get(e.lakeId), rekord: istRekord(e, alle), frisch: Date.now() - (e.createdAt || 0) < 10 * 60000 };
}, { auch: ['fangkarte'] });
