# Krisiu – installierbare Web-App (Version 0.4.0)

Fangbuch für Angler: Fänge, Bisse, Beobachtungen und Ansitze mit Zeit, Sonne, Mond und Wetter.
Jeder Nutzer hat sein eigenes Fangbuch; alle Daten liegen nur auf seinem Gerät.

**Stand 0.4.0:** Start, Gewässer, Ansitz mit Wetter und Chancen, Fang mit Foto und Fangkarte, Fehlbiss, Sprechen, Ruten und Plätze, **Karte** (Luftbild, Köder-Spot und Angelplatz antippen, Entfernung), Futter, Beenden, **Auswertung** (Muster, Wetterverlauf, Erweitert, Kontext, Biss-Karte), **Rekorde**, **Fische mit Steckbrief und Wiederfang**, **Ansitz planen** (Sterne aus der Vorhersage), Logbuch, Nachtragen, Krisiu mit festen Regeln, Sicherung. Alles kostenlos, ohne Server; Daten nur auf dem Gerät. Gewässer, Karten, Spots und Platz-Tipps kommen über eine **private Startdatei** (Mehr → einlesen) und stehen nicht im Programm.

## Aufbau

```
index.html              Hülle der App
manifest.webmanifest    Name, Icon, Startverhalten für die Installation
sw.js                   Service Worker: App-Dateien auf dem Gerät, Start ohne Netz, Updates
css/app.css             Aussehen nach dem Design-Entwurf
icons/                  App-Symbole (K)
js/main.js              Einstieg
js/core/                Fundament, ohne Oberfläche
  version.js            Name und Version an einer Stelle
  util.js               Zeit, Zahlen, Kennungen, Himmelsrichtung, Entfernung
  bus.js                Meldungen von der Datenebene an die Oberfläche
  db.js                 Speicher auf dem Gerät (IndexedDB) mit Migrationen
  repo.js               Gewässer, Spots, Ansitze, Einträge, Einstellungen; prüft alle Angaben
  astro.js              Sonne, Mond, Tagesphase (ohne Netz)
  weather.js            Wetterdienste und Auswertung der Stundenwerte
  weather-sync.js       Warteschlange: Wetter nachholen, sobald Netz da ist
  backup.js             Sicherung hinaus und hinein, CSV, Teilen/Speichern
  geo.js                Standort, nächstgelegenes Gewässer
  photos.js             Fotos verkleinern, speichern, Aufnahmezeit lesen
  pwa.js                Installation, Updates, dauerhafter Speicher
js/ui/                  Oberfläche (Start, Ansitz, Daten, Technik-Test)
(Die Browser-Prüfungen liegen nicht in diesem öffentlichen Ordner.)
```

Regel: `js/ui/` spricht nur mit `repo.js` und den Diensten in `js/core/`, nie direkt mit `db.js`.
Es gibt keine fremden Bibliotheken und keinen Build-Schritt; die Dateien laufen so, wie sie sind.

## Daten

| Tabelle | Inhalt |
|---|---|
| `lakes` | Gewässer: `name`, `short`, `lat`, `lon`, `elevationM`, `note` |
| `spots` | Ablagestellen: `lakeId`, `name`, `depthM`, `ground`, `lat`, `lon`, `note` |
| `sessions` | Ansitze: `lakeId`, `start`, `end` (Ortszeit oder nur Datum, `end: null` = läuft), `rods`, `swim`, `fishCount`, `bitesCount`, `forecastStars`, `waterTempC`, `notes`, `weather` |
| `entries` | Einträge: `type` (`fang`, `verloren`, `fehlbiss`, `beobachtung`), `lakeId`, `time`, `ts`, `species`, `weightKg`, `lengthCm`, `spotId`, `spotName`, `depthM`, `rod`, `bait`, `rig`, `feed`, `waterTempC`, `pressureOwnHpa`, `kind`, `notes`, `pos`, `ctx`, `weather` |
| `photos` | Fotos zu Einträgen: `entryId`, `blob`, `thumb`, `takenAt` |
| `meta` | Einstellungen, Geräte-Kennung, Zeitpunkt der letzten Sicherung |

- Jeder Datensatz hat `id`, `createdAt`, `updatedAt`, `deletedAt`. Gelöscht wird mit Löschmarke.
  Damit lässt sich später ein Abgleich zwischen Geräten oder ein gemeinsamer Topf ergänzen.
- `ctx` (Tagesphase, Sonnenauf- und -untergang, Mond) rechnet das Gerät beim Speichern.
- `weather` kommt vom Wetterdienst. `weatherState`: `offen`, `vorlaeufig`, `ok`, `ohne-ort`.
  Ändert sich Zeit oder Gewässer eines Eintrags, wird das Wetter neu geholt.
- Fehlen Stundenwerte für eine Tendenz, bleibt das Feld leer. Es wird nichts geschätzt.

## Wetter

1. **Bright Sky** (`api.brightsky.dev`): Messwerte der DWD-Stationen, Deutschland, ab 2010, ohne Schlüssel.
2. **Open-Meteo**: Wettermodell, weltweit, als Ersatz. Kostenlos für nicht-kommerzielle Nutzung;
   die Datenlizenz (CC BY 4.0) verlangt die Nennung von Open-Meteo in der App.

Zum Biss gespeichert: Luft, Tiefstwert der Nacht davor, Änderung in 24 h, Luftdruck mit Änderung in 3 h
und 24 h, Wind (Richtung, Stärke, Böen), Wolken, Regen der Stunde und der letzten 24 h, Quelle und Stationen.
Zum Ansitz: Spannen, Druckverlauf mit Tiefpunkt, vorherrschender Wind, Regensumme.

## Lokal starten und prüfen

```
python3 -m http.server 8000        # dann http://localhost:8000 öffnen
python3 tests/run.py               # braucht das Python-Paket playwright und Chrome
```

Die Prüfungen ersetzen die Wetterdienste durch Testdaten (echte DWD-Werte vom 11./12.11.2026),
es geht kein Aufruf ins Internet.

## Online stellen (GitHub Pages)

1. Auf github.com ein Repository anlegen und diese Dateien hochladen.
2. Im Repository: Settings → Pages → Branch `main`, Ordner `/ (root)` → Save.
3. Nach ein bis zwei Minuten läuft die App unter `https://<name>.github.io/<repository>/`.
4. Auf dem Handy öffnen. iPhone (Safari): Teilen → „Zum Home-Bildschirm“. Android (Chrome): Menü → „App installieren“.

Alle Pfade sind relativ, die App läuft in jedem Unterordner und bei jedem Anbieter für statische Seiten.

## Neue Version veröffentlichen

1. `APP_VERSION` in `js/core/version.js` und `VERSION` in `sw.js` gleich erhöhen.
2. Neue Dateien in `SHELL` in `sw.js` eintragen.
3. `python3 tests/run.py` muss durchlaufen (prüft beides mit).
4. Hochladen. Installierte Geräte zeigen beim nächsten Öffnen „Neue Version ist bereit“.

## Datenschutz

- Im Repository stehen nur Programm-Dateien, keine Fänge, Spots oder Koordinaten.
- Fänge, Fotos und Standort verlassen das Gerät nur, wenn der Nutzer selbst eine Sicherung teilt.
- An die Wetterdienste gehen Koordinaten des Gewässers und der Zeitraum, sonst nichts.

## Noch offen

- Oberfläche: Funktionen und Layout werden gemeinsam festgelegt.
- Noch nicht auf echten Handys geprüft (vor allem iPhone/Safari).
- Der direkte Abruf der Wetterdienste aus dem Browser ist nur mit Testdaten geprüft.
- Name und Icon sind Platzhalter.
