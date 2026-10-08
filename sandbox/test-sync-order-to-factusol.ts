import { FactusolConnector } from '../packages/connectors/factusol/src';
import { OrderSyncHelper } from '../apps/agent/src/sync/order-sync.helper';
import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

async function main() {
  const storeUrl = 'https://www.suministrosrubio.com/erp-bridge-endpoint.php';
  const secretKey = 'rubio_secreto_2026';
  const dbPath = 'C:\\Software DELSOL\\Factusol\\Datos\\FS\\0012026.accdb';
  const series = '1';
  const warehouse = 'GEN';

  const orderData = {
    id: 3,
    order_number: 'WEB-20261008-50E30',
    orderNumber: 'WEB-20261008-50E30',
    status: 'PENDING',
    customer: {
      fullName: 'Pablo Rubio',
      email: 'info@suministrosrubio.com',
      address: 'C/ Suministros Rubio',
      city: 'Tomelloso',
      province: 'Ciudad Real',
      postalCode: '13700',
      country: 'España',
      phone: '',
    },
    lines: [
      {
        artlpc: '67466',
        code: '67466',
        sku: '67466',
        deslpc: 'PRUEBAS',
        name: 'PRUEBAS',
        description: 'PRUEBAS',
        canlpc: 1,
        quantity: 1,
        prelpc: 0.51,
        price: 0.51,
        unitPrice: 0.51,
        ivaplc: 21,
        ivalpc: 0.11,
        vatRate: 21,
        vatPercent: 21,
        tivart: 21,
        totlpc: 0.62,
        total: 0.62,
      },
    ],
    payment_method: 'paypal',
    paymentMethod: 'paypal',
    payment_status: 'PENDING_PAYMENT',
    payment_reference: 'PAYPAL-PABLO-RUBIO-062',
    subtotal: 0.51,
    tax_total: 0.11,
    shipping_cost: 0,
    total: 0.62,
    created_at: '2026-10-08 17:15:56',
    createdAt: '2026-10-08 17:15:56',
  };

  console.log('1. Pedido a verificar:', orderData.order_number, '(ID:', orderData.id, ')');

  const canonicalOrder = OrderSyncHelper.universalBridgeToCanonical(orderData, series, warehouse);
  console.log('\n2. Canonical Order transformado por OrderSyncHelper:');
  console.log(JSON.stringify(canonicalOrder, null, 2));

  console.log('\n3. Conectando con Factusol Connector en:', dbPath);
  const connector = new FactusolConnector();
  await connector.connect({
    configuration: {
      databasePath: dbPath,
      orderSeries: series,
      invoiceSeries: '1',
      defaultWarehouse: warehouse,
      tariffCode: '1',
    },
  });

  console.log('\n4. Ejecutando createOrder...');
  const mutRes = await connector.createOrder(canonicalOrder);
  console.log('Resultado createOrder:', JSON.stringify(mutRes, null, 2));

  if (!mutRes.success) {
    console.error('ERROR al crear pedido:', mutRes.error);
    return;
  }

  const factusolOrderNum = Number(mutRes.externalId || mutRes.orderNumber);
  console.log(`\n✓ Pedido registrado exitosamente en Factusol: CODPCL = ${factusolOrderNum}, Serie = ${series}`);

  console.log('\n5. Verificando datos guardados en Access (F_PCL y F_LPC)...');
  const driver = new AccessDriver({ databasePath: dbPath });
  const pclRows = await driver.query<any>(`SELECT TIPPCL, CODPCL, REFPCL, FECPCL, TOTPCL, NET1PCL, BAS1PCL, PIVA1PCL, IIVA1PCL, ESTPCL, CNOPCL, CEMPCL, CDOPCL, CPOPCL, CCPPCL, CPRPCL, FOPPCL FROM F_PCL WHERE CODPCL = ${factusolOrderNum} AND TIPPCL = '${series}'`);
  console.log('Cabecera F_PCL:', JSON.stringify(pclRows, null, 2));

  const lpcRows = await driver.query<any>(`SELECT TIPLPC, CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, PRELPC, TOTLPC, PIVLPC FROM F_LPC WHERE CODLPC = ${factusolOrderNum} AND TIPLPC = '${series}'`);
  console.log('Líneas F_LPC:', JSON.stringify(lpcRows, null, 2));
}

main().catch(console.error);
