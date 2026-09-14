import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  getNextPaymentIdQuery,
  insertPaymentRecordQuery,
  insertInvoicePaymentLineQuery,
  selectPaymentsByInvoiceQuery,
  deletePaymentByIdQuery,
  deleteInvoicePaymentLinesQuery,
  PaymentRecordParams,
} from '../src/queries/payment.queries';
import { FactusolInvoiceHandler } from '../src/handlers/invoice.handler';
import { FactusolConnector } from '../src/factusol.connector';
import { AccessDriver } from '../src/access-driver';
import { CanonicalInvoice, Logger } from '@erp-bridge/shared';

async function runPaymentTests() {
  console.log('--- Running Factusol Payment & F_COB Unit Tests ---');

  // =========================================================================
  // 1. UNIT TESTS: Query Generation
  // =========================================================================
  console.log('1. Testing getNextPaymentIdQuery...');
  const nextIdSql = getNextPaymentIdQuery('1');
  assert(nextIdSql.includes('MAX(CODCOB)'), 'Query must query MAX(CODCOB)');
  assert(nextIdSql.includes('F_COB'), 'Query must target F_COB');
  console.log('✓ getNextPaymentIdQuery passed');

  console.log('2. Testing insertPaymentRecordQuery...');
  const sampleParams: PaymentRecordParams = {
    id: 50,
    series: '1',
    invoiceNumber: 123,
    date: new Date('2025-05-15T10:00:00Z'),
    amount: 150.75,
    paymentMethod: 'TAR',
    customerCode: 10008,
    status: 2,
  };

  const paymentSql = insertPaymentRecordQuery(sampleParams);
  assert(paymentSql.includes('INSERT INTO F_COB'), 'SQL must insert into F_COB');
  assert(paymentSql.includes('CODCOB'), 'SQL must include CODCOB');
  assert(paymentSql.includes('50'), 'SQL must include payment ID 50');
  assert(paymentSql.includes('#2025-05-15#'), 'Date must be formatted as #YYYY-MM-DD#');
  assert(paymentSql.includes('150.75'), 'SQL must include amount 150.75');
  assert(paymentSql.includes('COBRO FACTURA Nº: 1 - 000123'), 'SQL must include default concept with padded invoice number');
  assert(paymentSql.includes('CPACOB'), 'SQL must include CPACOB');
  assert(paymentSql.includes('TRACOB'), 'SQL must include TRACOB');
  assert(paymentSql.includes('TIPCOB'), 'SQL must include TIPCOB');
  console.log('✓ insertPaymentRecordQuery passed');

  console.log('3. Testing insertInvoicePaymentLineQuery (F_LCO)...');
  const paymentLineSql = insertInvoicePaymentLineQuery(sampleParams);
  assert(paymentLineSql.includes('INSERT INTO F_LCO'), 'SQL must insert into F_LCO');
  assert(paymentLineSql.includes("'1'"), 'SQL must include series');
  assert(paymentLineSql.includes('123'), 'SQL must include invoice number');
  assert(paymentLineSql.includes('#2025-05-15#'), 'Date must be formatted as #YYYY-MM-DD#');
  assert(paymentLineSql.includes('150.75'), 'SQL must include amount');
  assert(paymentLineSql.includes("'TAR'"), 'SQL must include payment method');
  assert(paymentLineSql.includes('50'), 'MULLCO must match payment ID 50');
  console.log('✓ insertInvoicePaymentLineQuery passed');

  console.log('4. Testing helper queries (select, delete)...');
  const selectSql = selectPaymentsByInvoiceQuery('1', 123);
  assert(selectSql.includes('F_LCO'), 'Select must query F_LCO');
  assert(selectSql.includes("TFALCO = '1'"), 'Select must filter by TFALCO');
  assert(selectSql.includes('CFALCO = 123'), 'Select must filter by CFALCO');

  const deleteCobSql = deletePaymentByIdQuery(50);
  assert(deleteCobSql.includes('DELETE FROM F_COB WHERE CODCOB = 50'), 'Delete must target F_COB');

  const deleteLcoSql = deleteInvoicePaymentLinesQuery('1', 123);
  assert(deleteLcoSql.includes("DELETE FROM F_LCO WHERE TFALCO = '1' AND CFALCO = 123"), 'Delete must target F_LCO');
  console.log('✓ Helper queries passed');

  // =========================================================================
  // 2. MOCK TESTS: FactusolInvoiceHandler with Payment Registration
  // =========================================================================
  console.log('5. Testing FactusolInvoiceHandler transaction behavior for paid invoice...');
  let executedTransactions: string[][] = [];

  const mockDriver = {
    query: async (sql: string) => {
      if (sql.includes('MAX(CODFAC)')) return [{ maxid: 100 }];
      if (sql.includes('MAX(CODLFA)')) return [{ maxid: 100 }];
      if (sql.includes('MAX(CODCOB)')) return [{ maxid: 40 }];
      if (sql.includes('REFFAC')) return [];
      if (sql.includes('F_LCO')) return [];
      return [];
    },
    executeTransaction: async (sqls: string[]) => {
      executedTransactions.push(sqls);
    },
    execute: async (_sql: string) => {},
  } as unknown as AccessDriver;

  const handlerPaid = new FactusolInvoiceHandler(
    mockDriver,
    { databasePath: 'dummy.accdb', invoiceSeries: '1', defaultWarehouse: 'GEN' },
    new Logger('TestLogger')
  );

  const testPaidInvoice: CanonicalInvoice = {
    id: 'inv_paid_test',
    series: '1',
    invoiceNumber: '',
    orderReference: 'TEST_PAID_REF_1',
    issueDate: new Date('2025-06-01'),
    status: 'paid',
    customer: {
      customerCode: '10008',
      name: 'CLIENTE PRUEBA',
    },
    lines: [
      {
        position: 1,
        sku: '000001',
        description: 'ARTICULO 1',
        quantity: 1,
        unitPrice: 50,
        taxRate: 21,
        taxAmount: 10.5,
        lineTotal: 50,
      },
    ],
    netAmount: 50,
    taxAmount: 10.5,
    totalAmount: 60.5,
    currency: 'EUR',
  };

  const createPaidRes = await handlerPaid.createInvoice(testPaidInvoice);
  assert.strictEqual(createPaidRes.success, true);
  assert.strictEqual(createPaidRes.status, 'paid');
  assert.strictEqual(executedTransactions.length, 1);
  const txSqls = executedTransactions[0]!;
  assert.strictEqual(txSqls.length, 4, 'Transaction must contain headerSql, 1 lineSql, F_COB paymentSql, and F_LCO paymentLineSql');
  assert(txSqls[0]!.includes('INSERT INTO F_FAC'), 'Statement 1 must be F_FAC');
  assert(txSqls[1]!.includes('INSERT INTO F_LFA'), 'Statement 2 must be F_LFA');
  assert(txSqls[2]!.includes('INSERT INTO F_COB'), 'Statement 3 must be F_COB');
  assert(txSqls[3]!.includes('INSERT INTO F_LCO'), 'Statement 4 must be F_LCO');
  console.log('✓ FactusolInvoiceHandler atomic payment registration verified');

  // Test with recordPayments: false
  console.log('6. Testing FactusolInvoiceHandler when recordPayments is false...');
  executedTransactions = [];
  const handlerNoPayment = new FactusolInvoiceHandler(
    mockDriver,
    { databasePath: 'dummy.accdb', invoiceSeries: '1', defaultWarehouse: 'GEN', recordPayments: false },
    new Logger('TestLogger')
  );
  await handlerNoPayment.createInvoice(testPaidInvoice);
  assert.strictEqual(executedTransactions.length, 1);
  assert.strictEqual(executedTransactions[0]!.length, 2, 'Must only have F_FAC and F_LFA statements when recordPayments is false');
  console.log('✓ recordPayments: false correctly skipped payment registration');

  // =========================================================================
  // 3. REAL DATABASE INTEGRATION TEST (if database is available)
  // =========================================================================
  const altPath = path.resolve(__dirname, '../../../../../API/bentian/2252025.accdb');
  const realDbPath = fs.existsSync('D:\\Proyectos\\Bentian\\API\\bentian\\2252025.accdb') 
    ? 'D:\\Proyectos\\Bentian\\API\\bentian\\2252025.accdb' 
    : altPath;

  if (fs.existsSync(realDbPath)) {
    console.log('\n--- Running Real Database Integration Test on F_COB ---');
    const connector = new FactusolConnector();
    await connector.connect({
      configuration: {
        databasePath: realDbPath,
        invoiceSeries: '1',
        defaultWarehouse: 'GEN',
      },
    });

    const realDriver = (connector as any).driver as AccessDriver;
    const testRef = `INV_PAY_${Date.now()}`;

    const realPaidInvoice: CanonicalInvoice = {
      id: `inv_real_pay_${Date.now()}`,
      series: '1',
      invoiceNumber: '',
      orderReference: testRef,
      issueDate: new Date(),
      status: 'paid',
      customer: {
        customerCode: '10008',
        name: 'CLIENTE PRUEBA COBRO SL',
        taxId: 'B12345678',
      },
      lines: [
        {
          position: 1,
          sku: '000001',
          description: 'M. TUBO PVC ENC 8/ 50 MM.',
          quantity: 2,
          unitPrice: 10,
          discountPercent: 0,
          taxRate: 21,
          taxAmount: 4.2,
          lineTotal: 20,
        },
      ],
      netAmount: 20,
      taxAmount: 4.2,
      totalAmount: 24.2,
      currency: 'EUR',
    };

    console.log(`Creando factura cobrada en Factusol real (Ref: ${testRef})...`);
    const createRes = await connector.createInvoice(realPaidInvoice);
    assert.strictEqual(createRes.success, true, 'Creación de factura debe ser exitosa');
    const codfac = Number(createRes.externalId);
    console.log(`✓ Factura creada con CODFAC = ${codfac}`);

    // Verify F_FAC status is 2 (paid)
    const facRows = await realDriver.query<any>(`SELECT ESTFAC, TOTFAC FROM F_FAC WHERE TIPFAC = '1' AND CODFAC = ${codfac}`);
    assert.strictEqual(facRows.length, 1);
    assert.strictEqual(facRows[0].ESTFAC, 2, 'ESTFAC debe ser 2 (cobrada)');
    console.log(`✓ Factura F_FAC verificada con ESTFAC = ${facRows[0].ESTFAC}`);

    // Verify F_LCO has record for this invoice
    const lcoRows = await realDriver.query<any>(selectPaymentsByInvoiceQuery('1', codfac));
    assert.strictEqual(lcoRows.length, 1, 'Debe existir 1 registro de cobro en F_LCO');
    const mullco = Number(lcoRows[0].MULLCO);
    assert.strictEqual(lcoRows[0].IMPLCO, 24.2, 'Importe en F_LCO debe coincidir con total de factura');
    console.log(`✓ Línea de cobro F_LCO verificada (MULLCO=${mullco}, IMPLCO=${lcoRows[0].IMPLCO})`);

    // Verify F_COB has matching payment record
    const cobRows = await realDriver.query<any>(`SELECT * FROM F_COB WHERE CODCOB = ${mullco}`);
    assert.strictEqual(cobRows.length, 1, 'Debe existir el apunte de cobro en F_COB');
    assert.strictEqual(cobRows[0].IMPCOB, 24.2, 'Importe en F_COB debe coincidir');
    assert.strictEqual(cobRows[0].TIPCOB, 0, 'TIPCOB debe ser 0');
    console.log(`✓ Apunte de cobro F_COB verificado (CODCOB=${mullco}, IMPCOB=${cobRows[0].IMPCOB})`);

    // Test updating invoice status to 'cancelled' to verify payment cleanup (integrity)
    console.log('Actualizando estado a "cancelled" para verificar integridad...');
    const updateRes = await connector.updateInvoiceStatus(String(codfac), 'cancelled');
    assert.strictEqual(updateRes.success, true);

    const lcoAfterCancel = await realDriver.query<any>(selectPaymentsByInvoiceQuery('1', codfac));
    assert.strictEqual(lcoAfterCancel.length, 0, 'F_LCO debe quedar limpio tras cancelación');

    const cobAfterCancel = await realDriver.query<any>(`SELECT * FROM F_COB WHERE CODCOB = ${mullco}`);
    assert.strictEqual(cobAfterCancel.length, 0, 'F_COB debe quedar limpio tras cancelación');
    console.log('✓ Integridad de cobros verificada tras cancelación de factura');

    // Clean up F_FAC and F_LFA
    await realDriver.execute(`DELETE FROM F_FAC WHERE TIPFAC = '1' AND CODFAC = ${codfac}`);
    await realDriver.execute(`DELETE FROM F_LFA WHERE TIPLFA = '1' AND CODLFA = ${codfac}`);
    console.log('✓ Limpieza de factura de prueba completada');

    await connector.disconnect();
    console.log('✓ Real Factusol Payment & Collection Integration Test Passed');
  } else {
    console.log(`[AVISO] Base de datos ${realDbPath} no encontrada. Saltando parte e2e.`);
  }

  console.log('\n✓ ALL FACTUSOL PAYMENT TESTS PASSED SUCCESSFULLY');
}

runPaymentTests().catch((err) => {
  console.error('❌ Error en factusol-payment.test.ts:', err);
  process.exit(1);
});
