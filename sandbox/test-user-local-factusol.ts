import { FactusolConnector } from '../packages/connectors/factusol/src/factusol.connector';
import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';
import { CanonicalOrder } from '@erp-bridge/shared';

async function testOrder() {
  const dbPath = 'C:\\Software DELSOL\\FactuSOL\\Datos\\FS\\0012026.accdb';
  const connector = new FactusolConnector();

  await connector.connect({
    configuration: {
      databasePath: dbPath,
      tariffCode: '1',
      defaultWarehouse: 'GEN',
      orderSeries: '1',
    },
  });

  const driver = new AccessDriver({ databasePath: dbPath });

  // 1. Actualizar el cliente 1 (CLIENTE CONTADO WEB) con caracteres españoles limpios
  console.log('-> Actualizando cliente 1 en F_CLI con caracteres especiales españoles...');
  await driver.execute(
    'UPDATE F_CLI SET NOFCLI = "Juan Pérez García - Cabañas & Señores S.L.", NOCCLI = "Juan Pérez García" WHERE CODCLI = 1'
  );
  const updatedCli = await driver.query<any>('SELECT CODCLI, NOFCLI, NOCCLI FROM F_CLI WHERE CODCLI = 1');
  console.log('✓ Cliente F_CLI verificado:', updatedCli);

  // 2. Inyectar nuevo pedido de prueba con referencia única y nombres con tildes, eñes y caracteres especiales
  const testRef = `WEB-TEST-UNICODE-${Date.now().toString().slice(-6)}`;
  const sampleOrder: CanonicalOrder = {
    id: `ord_${Date.now()}`,
    orderNumber: testRef,
    series: '1',
    reference: testRef,
    currency: 'EUR',
    date: new Date(),
    status: 'processing',
    customer: {
      id: 'cust_01',
      customerNumber: '1',
      taxId: '12345678Z',
      fiscalName: 'Juan Pérez García áéíóúÁÉÍÓÚñÑüÜºª',
      hasEquivalenceSurcharge: false,
      address: {
        street: 'C/ Peña Nº 4, 1º A (Cabaña)',
        city: 'Logroño',
        postalCode: '26001',
        state: 'La Rioja',
        country: 'ES',
      },
    },
    lines: [
      {
        id: 'ln_1',
        position: 1,
        sku: '000001',
        name: 'Tubería y Caños Especiales 850W',
        quantity: 1,
        unitPrice: 73.55,
        discountPercent: 0,
        vatPercent: 21,
        vatType: 0,
        subtotal: 73.55,
        total: 89.00,
      },
    ],
    netAmount: 73.55,
    taxAmount: 15.45,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 89.00,
    warehouse: 'GEN',
    hasEquivalenceSurcharge: false,
  };

  console.log(`-> Inyectando pedido de prueba (${testRef}) en Factusol...`);
  const res = await connector.createOrder(sampleOrder);
  console.log('✓ Resultado de createOrder:', res);

  // 3. Consultar y verificar el pedido insertado en F_PCL
  const orderRows = await driver.query<any>(
    `SELECT CODPCL, TIPPCL, FECPCL, TOTPCL, CNOPCL, CDOPCL, CPOPCL, CPRPCL, REFPCL FROM F_PCL WHERE REFPCL = '${testRef}'`
  );
  console.log('✓ Pedido insertado en Factusol F_PCL:', orderRows);

  if (orderRows.length > 0) {
    const p = orderRows[0];
    console.log('\n--- VERIFICACIÓN DETALLADA DE CARACTERES EN F_PCL ---');
    console.log(`CNOPCL (Nombre): "${p.CNOPCL}"`);
    console.log(`CDOPCL (Dirección): "${p.CDOPCL}"`);
    console.log(`CPOPCL (Población): "${p.CPOPCL}"`);
    console.log(`CPRPCL (Provincia): "${p.CPRPCL}"`);

    const hasMojibake = [p.CNOPCL, p.CDOPCL, p.CPOPCL, p.CPRPCL].some(
      (str: string) => /Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|\uFFFD/.test(str)
    );
    if (hasMojibake) {
      console.error('❌ ERROR: Se detectó Mojibake o caracteres corruptos en el pedido.');
      process.exit(1);
    } else {
      console.log('✅ ÉXITO TOTAL: Cero Mojibake. Todos los caracteres españoles (á, é, í, ó, ú, ñ, ü, º, ª) son 100% íntegros.');
    }
  }

  await connector.disconnect();
}

testOrder().catch((err) => {
  console.error('Error en testOrder:', err);
  process.exit(1);
});
