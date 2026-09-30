import { FactusolDetector } from '../apps/agent/src/detector';

const instances = FactusolDetector.detectAll();
console.log('Total detectadas:', instances.length);
instances.forEach(i => console.log(' -', i.databasePath, `(Empresa: ${i.companyCode}, Año: ${i.year})`));
