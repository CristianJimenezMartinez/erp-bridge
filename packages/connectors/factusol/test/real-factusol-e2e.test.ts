import assert from 'assert';
import fs from 'fs';
import { FactusolConnector } from '../src/factusol.connector';

import path from 'path';

console.log('--- Running Factusol Real ACCDB Integration Test ---');

const testDbPath1 = 'D:\\Proyectos\\Bentian\\API\\bentian\\2252025.accdb';
const testDbPath2 = 'D:\\Proyectos\\Bentian\\API\\asd\\0022025.accdb';
const testDbPath3 = path.resolve(__dirname, '../../../../../API/bentian/2252025.accdb');
const dbPath = fs.existsSync(testDbPath1) ? testDbPath1 : (fs.existsSync(testDbPath2) ? testDbPath2 : testDbPath3);

if (!fs.existsSync(dbPath)) {
  console.warn('⚠️ No se encontró la base de datos de prueba, omitiendo test E2E. Buscado en:', dbPath);
  process.exit(0);
}

async function runTest() {
  const connector = new FactusolConnector();

  console.log(`1. Conectando a Factusol en: ${dbPath}...`);
  await connector.connect({
    configuration: {
      databasePath: dbPath,
      tariffCode: '1',
      activeOnly: false,
    },
  });

  console.log('2. Ejecutando Health Check...');
  const health = await connector.healthCheck();
  console.log('Health check result:', health);
  assert.strictEqual(health.status, 'HEALTHY');

  console.log('3. Leyendo primeros 5 productos...');
  const products = await connector.readProducts({ limit: 5, activeOnly: false });
  console.log(`Leídos ${products.length} productos con éxito:`);
  products.forEach((p, idx) => {
    console.log(`  [${idx + 1}] SKU: ${p.sku} | Nombre: ${p.name} | Precio: ${p.regularPrice}€ | Stock: ${p.stockQuantity} | Categorías: ${p.categories.map(c => c.name).join(', ')}`);
  });

  assert(products.length > 0, 'Debe devolver al menos 1 producto');
  assert(products[0]?.sku, 'El producto debe tener un SKU');
  assert(products[0]?.name, 'El producto debe tener un nombre');

  await connector.disconnect();
  console.log('✓ Factusol Real ACCDB Integration Test Passed');
}

runTest().catch((err) => {
  console.error('❌ Error en test E2E Factusol:', err);
  process.exit(1);
});
