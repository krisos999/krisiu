// Krisiu-Mitteilungen – Cloudflare Worker (der Einstiegstarif reicht).
// Was er tut: Alle 15 Minuten schaut er in die Vorhersage (Bright Sky / DWD) für deine Gewässer und
// schickt deinem Handy eine Mitteilung, wenn es sich lohnt (Umschwung, Front, Wochenend-Ausblick, Warnungen),
// beim laufenden Ansitz abends „Alles okay? Kurz daheim melden“ und vor einer Front „Front im Anmarsch“.
// Datenschutz: Gespeichert wird nur, was die App ihm schickt (Gewässer-Lage, Schalter, Handy-Adresse für Mitteilungen).
// Die Mitteilung selbst geht ohne Inhalt raus; das Handy holt den Text hier ab.
//
// Einrichten (einmalig, im Cloudflare-Dashboard):
//   1. Workers & Pages → Worker erstellen → Name „krisiu“ → diesen Code einfügen → Bereitstellen.
//   2. Speicher → KV → Namespace „krisiu“ anlegen. Im Worker unter Einstellungen → Bindungen → KV: Variable KRISIU = krisiu.
//   3. Im Worker unter Einstellungen → Trigger → Cron: */15 * * * *
//   4. Die Worker-Adresse (https://krisiu.<dein-name>.workers.dev) in der App unter Mehr → Mitteilungen eintragen.

const TZ = 'Europe/Berlin';
const APP = 'https://krisos999.github.io/krisiu/';
const KOPF = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: Object.assign({ 'content-type': 'application/json' }, KOPF) });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: KOPF });
    const url = new URL(req.url), weg = url.pathname.replace(/\/+$/, '');
    try {
      if (weg === '' || weg === '/') return json({ ok: true, name: 'krisiu-mitteilungen' });
      if (weg === '/schluessel') return json({ schluessel: (await schluessel(env)).pub });
      if (req.method === 'POST' && weg === '/anmelden') {
        const d = await req.json();
        if (!d.id || !d.sub || !d.sub.endpoint) return json({ fehler: 'id und sub fehlen' }, 400);
        const alt = (await env.KRISIU.get('g:' + d.id, 'json')) || {};
        await env.KRISIU.put('g:' + d.id, JSON.stringify(Object.assign(alt, { id: d.id, sub: d.sub, einst: d.einst || alt.einst || {}, ansitz: d.ansitz === undefined ? alt.ansitz || null : d.ansitz, seit: alt.seit || Date.now() })));
        return json({ ok: true });
      }
      if (req.method === 'POST' && weg === '/ansitz') {
        const d = await req.json(), g = await env.KRISIU.get('g:' + d.id, 'json');
        if (!g) return json({ fehler: 'unbekannt' }, 404);
        g.ansitz = d.ansitz || null; if (!g.ansitz) g.gesendet = Object.assign({}, g.gesendet, { daheim: null, front: null });
        await env.KRISIU.put('g:' + d.id, JSON.stringify(g));
        return json({ ok: true });
      }
      if (req.method === 'POST' && weg === '/abmelden') { const d = await req.json(); await env.KRISIU.delete('g:' + d.id); return json({ ok: true }); }
      if (req.method === 'POST' && weg === '/keinezeit') {
        const d = await req.json(), g = await env.KRISIU.get('g:' + d.id, 'json');
        if (g) { g.keineZeitBis = Date.now() + 6 * 864e5; await env.KRISIU.put('g:' + d.id, JSON.stringify(g)); }
        return json({ ok: true });
      }
      if (weg === '/meldung') {
        const id = url.searchParams.get('id'); if (!id) return json([], 400);
        const liste = (await env.KRISIU.get('m:' + id, 'json')) || [];
        await env.KRISIU.delete('m:' + id);
        return json(liste);
      }
      if (req.method === 'POST' && weg === '/test') {
        const d = await req.json(), g = await env.KRISIU.get('g:' + d.id, 'json');
        if (!g) return json({ fehler: 'unbekannt' }, 404);
        const r = await melden(env, g, { art: 'test', titel: 'Krisiu sagt Hallo 👋', text: 'Mitteilungen klappen. Ich meld mich, wenn es sich lohnt – versprochen.' });
        return json({ ok: r.ok, status: r.status });
      }
      return json({ fehler: 'nicht gefunden' }, 404);
    } catch (e) { return json({ fehler: String(e && e.message || e) }, 500); }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(runde(env)); }
};

/* ---------- Zeit in Deutschland ---------- */
function ortszeit(ms = Date.now()) {
  const f = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false });
  const t = {}; f.formatToParts(new Date(ms)).forEach(p => { t[p.type] = p.value; });
  return { tag: t.year + '-' + t.month + '-' + t.day, std: Number(t.hour) % 24, min: Number(t.minute), wt: t.weekday.replace('.', '') };
}
const WT = { 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 0 };
const TAGNAME = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/* ---------- Wetter (Bright Sky, Stundenwerte) ---------- */
async function stunden(lat, lon, tage) {
  const von = new Date(Date.now() - 864e5).toISOString(), bis = new Date(Date.now() + tage * 864e5).toISOString();
  const r = await fetch('https://api.brightsky.dev/weather?lat=' + lat.toFixed(4) + '&lon=' + lon.toFixed(4) + '&date=' + encodeURIComponent(von) + '&last_date=' + encodeURIComponent(bis) + '&tz=' + TZ);
  if (!r.ok) throw new Error('Wetter ' + r.status);
  const j = await r.json();
  return (j.weather || []).map(w => ({ t: Date.parse(w.timestamp), temp: w.temperature, p: w.pressure_msl, wind: w.wind_speed, boe: w.wind_gust_speed, dir: w.wind_direction, wolken: w.cloud_cover, regen: w.precipitation, lage: w.condition })).filter(h => Number.isFinite(h.t)).sort((a, b) => a.t - b.t);
}
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const R8 = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const kompass = d => (isNum(d) ? R8[Math.round(((d % 360) + 360) % 360 / 45) % 8] : null);
/** Tageswerte wie in der App: Nacht davor 20–8 Uhr, Tag 8–20 Uhr. tag0 = Mitternacht (UTC-ms) des Tages in Deutschland. */
function tagesWerte(h, tag0) {
  const sel = (a, b) => h.filter(x => x.t >= a && x.t < b), v = (l, f) => l.map(x => x[f]).filter(isNum);
  const nacht = sel(tag0 - 4 * 36e5, tag0 + 8 * 36e5), tag = sel(tag0 + 8 * 36e5, tag0 + 20 * 36e5), ganz = sel(tag0, tag0 + 864e5);
  if (ganz.length < 12) return null;
  const p = v(ganz, 'p'), dirs = {};
  ganz.forEach(x => { const c = kompass(x.dir); if (c) dirs[c] = (dirs[c] || 0) + 1; });
  const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  return { nachtMin: v(nacht, 'temp').length ? Math.min(...v(nacht, 'temp')) : null, tagMax: v(tag, 'temp').length ? Math.max(...v(tag, 'temp')) : null,
    druckVon: p[0], druckBis: p[p.length - 1], druckMittel: mean(p), wind: Object.keys(dirs).sort((a, b) => dirs[b] - dirs[a])[0] || null,
    windKmh: mean(v(ganz, 'wind')), boeen: v(ganz, 'boe').length ? Math.max(...v(ganz, 'boe')) : null, wolken: mean(v(ganz, 'wolken')), regen: v(ganz, 'regen').reduce((s, x) => s + x, 0),
    gewitter: ganz.some(x => x.lage === 'thunderstorm') };
}
/** Sterne nach den Faustregeln des Anglers (gleich wie in der App). */
function sterne(t, vortag, art) {
  let p = 3; const dp = isNum(t.druckVon) && isNum(t.druckBis) ? t.druckBis - t.druckVon : null;
  if (isNum(t.nachtMin)) { if (t.nachtMin < -2) p -= 1.5; else if (t.nachtMin < 0) p -= 1; else if (t.nachtMin < 3) p -= 0.5; else if (t.nachtMin >= 9) p += 1; else if (t.nachtMin >= 6) p += 0.5; }
  if (dp != null) { if (dp <= -4) p += 1; else if (dp <= -1.5) p += 0.5; else if (dp >= 4) p -= 1; else if (dp >= 1.5) p -= 0.5; }
  if (isNum(t.wolken)) { if (t.wolken >= 70) p += 0.5; else if (t.wolken <= 25 && isNum(t.druckMittel) && t.druckMittel >= 1022) p -= 0.5; }
  if (t.wind && (t.windKmh || 0) >= 5) { if (['S', 'SW', 'W'].includes(t.wind)) p += 0.5; else if (['N', 'NO', 'O'].includes(t.wind)) p -= 0.5; }
  if (vortag && isNum(vortag.tagMax) && isNum(t.tagMax)) { const d = t.tagMax - vortag.tagMax; if (d >= 2) p += 0.5; else if (d <= -3) p -= 0.5; }
  if (t.regen >= 0.5 && t.regen <= 8) p += 0.5; else if (t.regen > 20) p -= 0.5;
  let umschwung = false;
  if (vortag && isNum(vortag.nachtMin) && isNum(t.nachtMin) && t.nachtMin - vortag.nachtMin >= 3 && (t.wolken || 0) >= 60 && ((vortag.wolken || 100) <= 50 || vortag.nachtMin < 2)) { p += 1; umschwung = true; }
  const kaltStabil = isNum(t.nachtMin) && t.nachtMin < 2 && dp != null && dp > -1.5 && (t.druckMittel || 0) >= 1018;
  const mildNass = isNum(t.nachtMin) && t.nachtMin >= 5 && t.regen >= 0.5;
  if (art === 'weiher') { p = 3 + (p - 3) * 1.2; if (kaltStabil) p -= 0.5; if (mildNass) p += 0.5; } else if (kaltStabil) p += 0.5;
  return { n: Math.max(1, Math.min(5, Math.round(p))), roh: p, umschwung };
}
/** Mitternacht eines Tages in Deutschland als UTC-ms (Sommer-/Winterzeit beachtet). */
function mitternacht(tagIso) {
  const [y, m, d] = tagIso.split('-').map(Number);
  for (const off of [1, 2]) { const ms = Date.UTC(y, m - 1, d, 0 - off, 0); const o = ortszeit(ms); if (o.tag === tagIso && o.std === 0) return ms; }
  return Date.UTC(y, m - 1, d, -1, 0);
}
const plusTag = (tagIso, n) => { const d = new Date(tagIso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/* ---------- Eine Runde (Cron) ---------- */
async function runde(env) {
  const jetzt = ortszeit();
  let cursor;
  do {
    const l = await env.KRISIU.list({ prefix: 'g:', cursor });
    for (const k of l.keys) {
      const g = await env.KRISIU.get(k.name, 'json'); if (!g || !g.sub) continue;
      try { if (await pruefe(env, g, jetzt)) await env.KRISIU.put(k.name, JSON.stringify(g)); } catch (e) { /* nächste Runde */ }
    }
    cursor = l.list_complete ? null : l.cursor;
  } while (cursor);
}

async function pruefe(env, g, jetzt) {
  const e = g.einst || {}, s = g.gesendet = g.gesendet || {};
  let geaendert = false;
  const merke = (k, v) => { s[k] = v; geaendert = true; };
  // Beim Ansitz: daheim melden (einmal am Abend zur gewählten Uhrzeit)
  const a = g.ansitz;
  if (a && e.daheim && e.daheim.an) {
    const [hh, mm] = String(e.daheim.um || '21:30').split(':').map(Number);
    const faellig = jetzt.std > hh || (jetzt.std === hh && jetzt.min >= mm);
    if (faellig && s.daheim !== jetzt.tag && Date.now() - a.start > 30 * 60000) {
      await melden(env, g, { art: 'daheim', titel: 'Alles okay bei dir? 🙂', text: 'Schreib oder ruf kurz daheim an, dass alles in Ordnung ist.', nummer: e.daheim.nummer || null, name: e.daheim.name || null });
      merke('daheim', jetzt.tag);
    }
  }
  // Beim Ansitz: Front im Anmarsch (höchstens alle 6 Stunden)
  if (a && isNum(a.lat) && e.front !== false && (!s.front || Date.now() - s.front > 6 * 36e5) && jetzt.min < 15) {
    const h = await stunden(a.lat, a.lon, 1), jetztMs = Date.now();
    const vor = h.filter(x => x.t >= jetztMs - 36e5 && x.t <= jetztMs + 9 * 36e5 && isNum(x.p));
    if (vor.length >= 6) {
      const p0 = vor[0].p; let tief = vor[0];
      vor.forEach(x => { if (x.p < tief.p) tief = x; });
      const fall = p0 - tief.p, nach = h.filter(x => x.t > tief.t && x.t <= tief.t + 4 * 36e5 && isNum(x.p));
      const steigtDanach = nach.length && Math.max(...nach.map(x => x.p)) - tief.p >= 1;
      if (fall >= 3 && (steigtDanach || nach.some(x => (x.regen || 0) >= 1))) {
        const um = ortszeit(tief.t).std;
        await melden(env, g, { art: 'front', titel: 'Front im Anmarsch 🤞', text: `Front gegen ${um} Uhr. Die zwei Stunden davor sind die besten – Kaffee kochen, wach bleiben.` });
        merke('front', Date.now());
      }
    }
  }
  // Vorhersage für die Gewässer: einmal am Tag gegen 18 Uhr, Wochenend-Ausblick donnerstags 19 Uhr
  const seen = (e.seen || []).filter(x => isNum(x.lat) && x.an !== false);
  if (!seen.length) return geaendert;
  const tagesCheck = jetzt.std >= 18 && s.tag !== jetzt.tag;
  const wochenende = e.wochenende !== false && WT[jetzt.wt] === 4 && jetzt.std >= 19 && s.we !== jetzt.tag;
  const warnCheck = e.warnungen !== false && jetzt.std >= 17 && s.warn !== jetzt.tag;
  if (!tagesCheck && !wochenende && !warnCheck) return geaendert;
  const min = e.minSterne || 4, tage = [];
  for (const L of seen) {
    const h = await stunden(L.lat, L.lon, 5);
    for (let i = 0; i <= 4; i++) {
      const tag = plusTag(jetzt.tag, i), t0 = mitternacht(tag), t = tagesWerte(h, t0), v = tagesWerte(h, t0 - 864e5);
      if (t) tage.push({ L, i, tag, t, b: sterne(t, v, L.art) });
    }
  }
  const name = x => (x.i === 0 ? 'heute' : x.i === 1 ? 'morgen' : TAGNAME[new Date(x.tag + 'T12:00:00Z').getUTCDay()]);
  const st = n => '★'.repeat(n);
  if (tagesCheck) {
    merke('tag', jetzt.tag);
    const um = tage.filter(x => x.i >= 1 && x.i <= 3 && x.b.umschwung).sort((x, y) => x.i - y.i)[0];
    if (um && e.umschwung !== false && s.umschwungTag !== um.tag) {
      await melden(env, g, { art: 'umschwung', titel: 'Umschwung kommt ' + name(um) + ' 🤞', text: `Erste milde Nacht nach der Kälte – ${name(um)} am ${um.L.short} ${st(um.b.n)}. Das ist deine Top-Beißphase.` });
      merke('umschwungTag', um.tag);
    } else if (!(g.keineZeitBis > Date.now())) {
      const best = tage.filter(x => x.i >= 1).sort((x, y) => y.b.roh - x.b.roh)[0];
      const woche = Math.floor(Date.now() / (7 * 864e5));
      if (best && best.b.n >= min && s.frageWoche !== woche) {
        const d = best.t, warum = [isNum(d.nachtMin) && d.nachtMin >= 4 ? 'mild' : null, isNum(d.druckVon) && d.druckBis - d.druckVon <= -1.5 ? 'der Druck fällt' : null].filter(Boolean).join(' und ');
        await melden(env, g, { art: 'frage', titel: 'Wann gehen wir angeln? 🤩', text: `${name(best).replace(/^./, c => c.toUpperCase())} sieht richtig gut aus: ${st(best.b.n)} am ${best.L.short}${warum ? ', ' + warum : ''}.` });
        merke('frageWoche', woche);
      }
    }
  }
  if (wochenende) {
    merke('we', jetzt.tag);
    const we = tage.filter(x => x.i === 2 || x.i === 3);
    if (we.length) {
      const zeilen = seen.map(L => L.short + ': Sa ' + st((we.find(x => x.L === L && x.i === 2) || { b: { n: 0 } }).b.n) + ' · So ' + st((we.find(x => x.L === L && x.i === 3) || { b: { n: 0 } }).b.n));
      await melden(env, g, { art: 'wochenende', titel: 'Dein Wochenende 🎣', text: zeilen.join(' – ') });
    }
  }
  if (warnCheck) {
    merke('warn', jetzt.tag);
    const morgen = tage.filter(x => x.i <= 1);
    const frost = morgen.find(x => x.i === 1 && isNum(x.t.nachtMin) && x.t.nachtMin < 0 && g.ansitz);
    const sturm = morgen.find(x => isNum(x.t.boeen) && x.t.boeen >= 60);
    const gew = morgen.find(x => x.t.gewitter);
    const w = gew ? { titel: 'Gewitter-Warnung ⚡', text: `${name(gew).replace(/^./, c => c.toUpperCase())} am ${gew.L.short} Gewitter möglich. Ruten flach legen, weg vom Wasser – Carbon leitet.` }
      : sturm ? { titel: 'Sturm-Warnung 💨', text: `${name(sturm).replace(/^./, c => c.toUpperCase())} am ${sturm.L.short} Böen bis ${Math.round(sturm.t.boeen)} km/h. Steht dein Zelt unter Bäumen?` }
        : frost ? { titel: 'Frostnacht 🥶', text: `Heut Nacht ${Math.round(frost.t.nachtMin)} Grad am ${frost.L.short}. Schlafsack, Mütze und was Heißes dabei?` } : null;
    if (w) await melden(env, g, Object.assign({ art: 'warnung' }, w));
  }
  return geaendert;
}

/* ---------- Mitteilung ablegen und Web-Push ohne Inhalt schicken ---------- */
async function melden(env, g, m) {
  const key = 'm:' + g.id, liste = (await env.KRISIU.get(key, 'json')) || [];
  liste.push(Object.assign({ zeit: Date.now() }, m));
  await env.KRISIU.put(key, JSON.stringify(liste.slice(-10)), { expirationTtl: 3 * 864e5 });
  const k = await schluessel(env), ziel = new URL(g.sub.endpoint);
  const jwt = await vapidJwt(k, ziel.origin);
  const r = await fetch(g.sub.endpoint, { method: 'POST', headers: { TTL: '86400', Urgency: 'high', Authorization: 'vapid t=' + jwt + ', k=' + k.pub, 'Content-Length': '0' } });
  if (r.status === 404 || r.status === 410) await env.KRISIU.delete('g:' + g.id);   // Handy hat sich abgemeldet
  return r;
}

/* ---------- VAPID: Schlüssel einmal erzeugen und im KV behalten ---------- */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uText = t => b64u(new TextEncoder().encode(t));
async function schluessel(env) {
  let k = await env.KRISIU.get('vapid', 'json');
  if (!k) {
    const paar = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const priv = await crypto.subtle.exportKey('jwk', paar.privateKey), pub = await crypto.subtle.exportKey('raw', paar.publicKey);
    k = { priv, pub: b64u(pub) };
    await env.KRISIU.put('vapid', JSON.stringify(k));
  }
  return k;
}
async function vapidJwt(k, aud) {
  const kopf = b64uText(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const inhalt = b64uText(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: APP }));
  const key = await crypto.subtle.importKey('jwk', k.priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(kopf + '.' + inhalt));
  return kopf + '.' + inhalt + '.' + b64u(sig);
}
