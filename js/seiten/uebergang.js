// Seiten aus dem Entwurf, die noch nicht umgebaut sind, zeigen vorerst die bisherige Seite.
import { alias } from '../ui/app.js';
[['Ansitz', 'ansitz'], ['Replay', 'auswertung'],
 ['Wecker', 'krisiu'], ['Assistent', 'krisiu'],
 ['Fang', 'fang'], 
 ['Rute', 'rute'], ['RuteWieVorher', 'rutewie'], ['WindSee', 'karte'], ['KantenFinder', 'karte'], ['WetterZwilling', 'krisiu'], ['SaisonKalender', 'logbuch'], ['Schneider', 'logbuch'], ['DeeperImport', 'karte']]
  .forEach(([neu, alt]) => alias(neu, alt));
