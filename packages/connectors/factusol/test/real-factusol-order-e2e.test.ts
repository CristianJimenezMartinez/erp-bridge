import assert from 'assert';
import fs from 'fs';
import { FactusolConnector } from '../src/factusol.connector';
import { AccessDriver } from '../src/access-driver';
import { CanonicalOrder } from '@erp-bridge/shared';

import path from 'path';

console.log('--- Running Factusol Real ACCDB Order & Customer Integration Test ---');

const altPath = path.resolve(__dirname, '../../../../../API/bentian/2252025.accdb');
const REAL_DB_PATH = fs.existsSync('D:\\Proyectos\\Bentian\\API\\bentian\\2252025.accdb') 
  ? 'D:\\Proyectos\\Bentian\\API\\bentian\\2252025.accdb' 
  : altPath;

async function runTest() {
  if (!fs.existsSync(REAL_DB_PATH)) {
    console.log(`⚠️ Archivo real ${REAL_DB_PATH} no encontrado. Omitiendo prueba E2E OLEDB de pedidos.`);
    return;
  }

  const connector = new FactusolConnector();
  await connector.connect({
    configuration: {
      databasePath: REAL_DB_PATH,
      tariffCode: '1',
      orderSeries: '1',
    },
  });

  const driver = new AccessDriver({ databasePath: REAL_DB_PATH });

  // 1. Read existing orders
  console.log('1. Leyendo pedidos existentes de Factusol...');
  const orders = await connector.readOrders({ limit: 5 });
  console.log(`Leídos ${orders.length} pedidos existentes de Factusol.`);

  // 2. Test Customer search
  console.log('2. Buscando cliente...');
  const customer = await connector.findCustomer({ taxId: 'B12345678' });
  console.log('Resultado búsqueda cliente:', customer ? customer.fiscalName : 'No encontrado (OK para prueba)');

  // 3. Create a unique test order
  const testRef = `TEST_WC_${Date.now()}`;
  console.log(`3. Insertando pedido de prueba con referencia: ${testRef}...`);

  const testOrder: CanonicalOrder = {
    id: `ord_${Date.now()}`,
    orderNumber: String(Date.now()).substring(5),
    series: '1',
    reference: testRef,
    date: new Date(),
    status: 'pending',
    customer: {
      id: 'cust_test',
      fiscalName: 'CLIENTE PRUEBA ERP BRIDGE SL',
      taxId: 'B99999999',
      phone: '910000000',
      address: {
        street: 'Calle Mayor 1',
        city: 'Madrid',
        postalCode: '28001',
        state: 'Madrid',
        country: 'ES',
      },
    },
    lines: [
      {
        id: 'ln_test_1',
        position: 1,
        sku: '000001',
        name: 'M. TUBO PVC ENC 8/ 50 MM.',
        quantity: 2,
        unitPrice: 1.92,
        discountPercent: 0,
        vatPercent: 21,
        vatType: 0,
        subtotal: 3.84,
        total: 3.84,
      },
    ],
    netAmount: 3.84,
    taxAmount: 0.81,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 4.65,
    currency: 'EUR',
    warehouse: 'GEN',
  };

  const createResult = await connector.createOrder(testOrder);
  assert.strictEqual(createResult.success, true, `Debe insertar el pedido: ${createResult.error}`);
  assert(createResult.externalId, 'Debe devolver un externalId (CODPCL)');
  const createdOrderCode = Number(createResult.externalId);
  console.log(`✓ Pedido creado exitosamente con CODPCL = ${createdOrderCode}`);

  // 4. Test Idempotency: re-inserting same reference
  console.log('4. Verificando idempotencia ante misma referencia...');
  const duplicateResult = await connector.createOrder(testOrder);
  assert.strictEqual(duplicateResult.success, true);
  assert.strictEqual(duplicateResult.externalId, String(createdOrderCode), 'Debe devolver el mismo ID existente');
  console.log('✓ Idempotencia verificada');

  // 5. Update status
  console.log('5. Actualizando estado a "completed"...');
  const updateResult = await connector.updateOrderStatus(String(createdOrderCode), 'completed');
  assert.strictEqual(updateResult.success, true);
  console.log('✓ Estado de pedido actualizado a completed (ESTPCL = 2)');

  // 6. Cleanup test records so the real accdb stays unmodified
  console.log('6. Limpiando registros de prueba en F_PCL, F_LPC...');
  try {
    await driver.execute(`DELETE FROM F_LPC WHERE CODLPC = ${createdOrderCode} AND TIPLPC = '1'`);
    await driver.execute(`DELETE FROM F_PCL WHERE CODPCL = ${createdOrderCode} AND TIPPCL = '1'`);
    await driver.execute(`DELETE FROM F_CLI WHERE NIFCLI = 'B99999999'`);
    console.log('✓ Limpieza completada con éxito.');
  } catch (cleanErr) {
    console.warn('Aviso durante limpieza:', cleanErr);
  }

  await connector.disconnect();
  console.log('✓ Factusol Real ACCDB Order Integration Test Passed');
}

runTest().catch((err) => {
  console.error('❌ Error en test Factusol Order Real:', err);
  process.exit(1);
});
