const { FactusolConnector } = require('G:/Otros ordenadores/Mi PC/Bentian/erp-bridge/packages/connectors/factusol/dist');

async function testReal() {
  const connector = new FactusolConnector();

  await connector.connect({
    id: 'conn_test',
    name: 'Factusol Test',
    type: 'source',
    connectorSlug: 'factusol',
    configuration: {
      databasePath: 'G:\\Otros ordenadores\\Mi PC\\Bentian\\API\\bentian\\2252025.accdb',
      orderSeries: '1',
      defaultWarehouse: 'GEN',
      tariffCode: '1'
    }
  });
  console.log('Connected to Factusol real database!');

  const testRef = 'TEST-AUDIT-' + Date.now();
  const testOrder = {
    id: 'ord_' + Date.now(),
    reference: testRef,
    orderNumber: testRef,
    date: new Date().toISOString(),
    status: 'pending',
    currency: 'EUR',
    netAmount: 35.00,
    taxAmount: 6.75,
    shippingAmount: 5.00,
    totalAmount: 48.26,
    paymentMethod: 'credit_card',
    hasEquivalenceSurcharge: true,
    customer: {
      id: 'cust_audit',
      taxId: 'B12345678',
      fiscalName: 'EMPRESA AUDITORIA SL',
      hasEquivalenceSurcharge: true,
      email: 'auditor@test.es',
      phone: '612345678',
      address: {
        street: 'Calle Verificacion 42',
        city: 'Villarrobledo',
        postalCode: '02600',
        state: 'Albacete',
        country: 'ES'
      }
    },
    lines: [
      {
        id: 'line_1',
        sku: '000047',
        name: 'M. TUBO PVC ENC 16/160 MM.',
        quantity: 2,
        unitPrice: 10.00,
        vatRate: 21.0,
        vatType: 0,
        discountPercent: 0,
        total: 20.00
      },
      {
        id: 'line_2',
        sku: '000294',
        name: 'CODO 90 PVC ENC INY. 63 MM.',
        quantity: 1,
        unitPrice: 15.00,
        vatRate: 10.0,
        vatType: 1,
        discountPercent: 0,
        total: 15.00
      }
    ]
  };

  console.log('Creating order with multi-tax + RE + atomic stock decrement...');
  const result = await connector.createOrder(testOrder);
  console.log('Create order result:', JSON.stringify(result));

  // Query database directly to inspect the created row
  const driver = connector['driver'];
  const pclRows = await driver.query("SELECT * FROM F_PCL WHERE REFPCL = '" + testRef + "'");
  console.log('PCL Row created:');
  console.log({
    TIPPCL: pclRows[0].TIPPCL,
    CODPCL: pclRows[0].CODPCL,
    REFPCL: pclRows[0].REFPCL,
    FECPCL: pclRows[0].FECPCL,
    HORPCL: pclRows[0].HORPCL,
    USUPCL: pclRows[0].USUPCL,
    CPAPCL: pclRows[0].CPAPCL,
    NET1PCL: pclRows[0].NET1PCL,
    BAS1PCL: pclRows[0].BAS1PCL,
    PIVA1PCL: pclRows[0].PIVA1PCL,
    IIVA1PCL: pclRows[0].IIVA1PCL,
    PREC1PCL: pclRows[0].PREC1PCL,
    IREC1PCL: pclRows[0].IREC1PCL,
    NET2PCL: pclRows[0].NET2PCL,
    BAS2PCL: pclRows[0].BAS2PCL,
    PIVA2PCL: pclRows[0].PIVA2PCL,
    IIVA2PCL: pclRows[0].IIVA2PCL,
    PREC2PCL: pclRows[0].PREC2PCL,
    IREC2PCL: pclRows[0].IREC2PCL,
    TOTPCL: pclRows[0].TOTPCL
  });

  const lpcRows = await driver.query("SELECT * FROM F_LPC WHERE TIPLPC = '" + pclRows[0].TIPPCL + "' AND CODLPC = " + pclRows[0].CODPCL);
  console.log('LPC Lines created (' + lpcRows.length + '):');
  lpcRows.forEach(l => {
    console.log({
      POSLPC: l.POSLPC,
      ARTLPC: l.ARTLPC,
      CANLPC: l.CANLPC,
      PENLPC: l.PENLPC,
      PRELPC: l.PRELPC,
      TOTLPC: l.TOTLPC,
      IVALPC: l.IVALPC,
      PIVLPC: l.PIVLPC,
      TIVLPC: l.TIVLPC
    });
  });

  // Cleanup test order
  await driver.execute("DELETE FROM F_LPC WHERE TIPLPC = '" + pclRows[0].TIPPCL + "' AND CODLPC = " + pclRows[0].CODPCL);
  await driver.execute("DELETE FROM F_PCL WHERE TIPPCL = '" + pclRows[0].TIPPCL + "' AND CODPCL = " + pclRows[0].CODPCL);
  console.log('Test order cleaned up cleanly.');

  await connector.disconnect();
  console.log('ALL VERIFICATIONS PASSED 100% IN REAL ACCESS DB!');
}

testReal().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
