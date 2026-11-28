// Seiten aus dem Entwurf, die noch nicht umgebaut sind, zeigen vorerst die bisherige Seite.
import { alias } from '../ui/app.js';
[['Ansitz', 'ansitz'], 

 ['Fang', 'fang'], 
 ['Rute', 'rute'], ['RuteWieVorher', 'rutewie']]
  .forEach(([neu, alt]) => alias(neu, alt));
