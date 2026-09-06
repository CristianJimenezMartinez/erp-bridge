import assert from 'assert';
import fs from 'fs';
import { FactusolConnector } from '../src/factusol.connector';
import { CanonicalInvoice } from '@erp-bridge/shared';

import path from 'path';

const altPath = path.resolve(__dirname, '../../../../../API/bentian/2252025.accdb');
const realDbPath = fs.existsSync('D:\\Proyectos\\Bentian\\API\\bentian\\2252025.accdb') 
  ? 'D:\\Proyectos\\Bentian\\API\\bentian\\2252025.accdb' 
  : altPath;

async function runRealInvoiceTests() {
  console.log('--- Running Factusol Real ACCDB Invoice Integration Test ---');

  if (!fs.existsSync(realDbPath)) {
    console.log(`[AVISO] Base de datos ${realDbPath} no encontrada. Saltando test.`);
    return;
  }

  const connector = new FactusolConnector();
  await connector.connect({
    configuration: {
      databasePath: realDbPath,
      invoiceSeries: '1',
      defaultWarehouse: 'GEN',
    },
  });

  // 1. Read existing invoices from F_FAC
  console.log('1. Leyendo facturas existentes de Factusol...');
  const invoices = await connector.readInvoices({ limit: 5 });
  console.log(`Leídas ${invoices.length} facturas existentes de Factusol.`);
  if (invoices.length > 0) {
    console.log(`Primera factura: #${invoices[0]!.invoiceNumber} | Total: ${invoices[0]!.totalAmount}€ | Cliente: ${invoices[0]!.customer.name}`);
  }

  // 2. Insert test invoice
  const testRef = `INV_TEST_${Date.now()}`;
  console.log(`2. Insertando factura de prueba con referencia: ${testRef}...`);

  const testInvoice: CanonicalInvoice = {
    id: `inv_${Date.now()}`,
    series: '1',
    invoiceNumber: '',
    orderReference: testRef,
    issueDate: new Date(),
    status: 'issued',
    customer: {
      customerCode: '10008',
      name: 'CLIENTE PRUEBA FACTURA SL',
      taxId: 'B99887766',
      email: 'facturas@clienteprueba.es',
      billingAddress: {
        street: 'Calle Industria 45',
        city: 'Valencia',
        postalCode: '46001',
        province: 'Valencia',
        country: 'ESPAÑA',
      },
    },
    lines: [
      {
        position: 1,
        sku: '000001',
        description: 'M. TUBO PVC ENC 8/ 50 MM.',
        quantity: 5,
        unitPrice: 1.92,
        discountPercent: 0,
        taxRate: 21,
        taxAmount: 2.02,
        lineTotal: 9.6,
      },
    ],
    shippingCost: 3.5,
    netAmount: 9.6,
    taxAmount: 2.02,
    taxBreakdown: [
      {
        rate: 21,
        baseAmount: 9.6,
        taxAmount: 2.02,
      },
    ],
    totalAmount: 15.12,
    currency: 'EUR',
  };

  const createRes = await connector.createInvoice(testInvoice);
  assert.strictEqual(createRes.success, true, 'La creación de factura debe ser exitosa');
  assert(createRes.externalId, 'Debe devolver CODFAC generado');
  const createdCodfac = Number(createRes.externalId);
  console.log(`✓ Factura creada exitosamente con CODFAC = ${createdCodfac}`);

  // 3. Verify idempotency
  console.log('3. Verificando idempotencia ante misma referencia...');
  const duplicateRes = await connector.createInvoice(testInvoice);
  assert.strictEqual(duplicateRes.success, true);
  assert.strictEqual(duplicateRes.externalId, String(createdCodfac), 'Debe devolver el mismo CODFAC sin duplicar');
  console.log('✓ Idempotencia de factura verificada');

  // 4. Update status
  console.log('4. Actualizando estado a "paid" (ESTFAC = 2)...');
  const updateRes = await connector.updateInvoiceStatus(String(createdCodfac), 'paid');
  assert.strictEqual(updateRes.success, true);
  console.log('✓ Estado de factura actualizado a paid (ESTFAC = 2)');

  // 5. Clean up test record in Access
  console.log('5. Limpiando registros de prueba en F_FAC, F_LFA...');
  const driver = (connector as any).driver;
  if (driver) {
    await driver.execute(`DELETE FROM F_FAC WHERE TIPFAC = '1' AND CODFAC = ${createdCodfac}`);
    await driver.execute(`DELETE FROM F_LFA WHERE TIPLFA = '1' AND CODLFA = ${createdCodfac}`);
    console.log('✓ Limpieza de factura de prueba completada con éxito.');
  }

  await connector.disconnect();
  console.log('✓ Factusol Real ACCDB Invoice Integration Test Passed');
}

runRealInvoiceTests().catch((err) => {
  console.error('❌ Error en test de facturas Factusol:', err);
  process.exit(1);
});
