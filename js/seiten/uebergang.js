// Seiten aus dem Entwurf, die noch nicht umgebaut sind, zeigen vorerst die bisherige Seite.
import { alias } from '../ui/app.js';
[['Ansitz', 'ansitz'], ['Auswertung', 'auswertung'], ['Logbuch', 'logbuch'], ['Faenge', 'fische'], ['Fische', 'fische'],
 ['Nachtragen', 'nachtragen'], ['Planen', 'planen'], ['Assistent', 'krisiu'], ['Rekorde', 'rekorde'], ['BissKarte', 'bisskarte'],
 ['Fang', 'fang'], 
 ['Rute', 'rute'], ['FangKarte', 'fangkarte'], ['RuteWieVorher', 'rutewie'], ['WindSee', 'karte'], ['KantenFinder', 'karte'], ['WetterZwilling', 'krisiu'], ['DeeperImport', 'karte']]
  .forEach(([neu, alt]) => alias(neu, alt));
