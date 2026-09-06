import assert from 'assert';
import fs from 'fs';
import { FactusolConnector } from '../src/factusol.connector';

import path from 'path';

console.log('--- Running Factusol Real ACCDB Stock Integration Test ---');

const altPath = path.resolve(__dirname, '../../../../../API/bentian/2252025.accdb');
const REAL_DB_PATH = fs.existsSync('D:\\Proyectos\\Bentian\\API\\bentian\\2252025.accdb') 
  ? 'D:\\Proyectos\\Bentian\\API\\bentian\\2252025.accdb' 
  : altPath;

async function runTest() {
  if (!fs.existsSync(REAL_DB_PATH)) {
    console.log(`⚠️ Archivo real ${REAL_DB_PATH} no encontrado. Omitiendo prueba real de stock.`);
    return;
  }

  const connector = new FactusolConnector();
  await connector.connect({
    configuration: {
      databasePath: REAL_DB_PATH,
      tariffCode: '1',
      defaultWarehouse: 'GEN',
    },
  });

  console.log('1. Consultando registros de stock en F_STO...');
  const stockItems = await connector.readStock({ limit: 10 });
  console.log(`Leídos ${stockItems.length} registros de stock de F_STO.`);

  if (stockItems.length > 0) {
    const first = stockItems[0]!;
    console.log(`Primer artículo de stock: SKU=${first.sku}, Cantidad=${first.quantity}, Almacén=${first.warehouse}`);
    assert(first.sku.length > 0, 'SKU debe estar presente');
    assert(typeof first.quantity === 'number', 'Cantidad debe ser numérica');
  }

  console.log('2. Consultando stock para SKUs específicos (000001, 000002)...');
  const filtered = await connector.readStock({ skus: ['000001', '000002'] });
  console.log(`Leídos ${filtered.length} artículos por SKU.`);

  await connector.disconnect();
  console.log('✓ Factusol Real ACCDB Stock Integration Test Passed');
}

runTest().catch((err) => {
  console.error('❌ Error en test Factusol Stock Real:', err);
  process.exit(1);
});
