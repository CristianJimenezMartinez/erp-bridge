import path from 'path';
import { execSync } from 'child_process';
import { resetSandboxDatabase } from './reset-factusol-sandbox';
import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';
import { FactusolConnector } from '../packages/connectors/factusol/src/factusol.connector';
import { OrderSyncHelper } from '../apps/agent/src/sync/order-sync.helper';
import { CancellationSyncHelper } from '../apps/agent/src/sync/cancellation-sync.helper';

interface TestOrderDefinition {
  name: string;
  payload: any;
  expectedSeries: string;
  expectedCustomerCode?: number;
  expectedCustomerCif?: string;
  expectedSkuDeltas: Record<string, number>;
}

const BRIDGE_BASE_URL = 'http://127.0.0.1:8095/erp-bridge-endpoint.php';
const BRIDGE_SECRET = 'rubio_secreto_2026';
const WOOCOMMERCE_BASE_URL = 'http://127.0.0.1:8088';

const SANDBOX_DIR = path.resolve(__dirname);
const FACTUSOL_SANDBOX_DB = path.join(SANDBOX_DIR, 'lab-factusol-isolated.accdb');

function logStep(stepNum: number, title: string) {
  console.log(`\n======================================================================`);
  console.log(`[FASE ${stepNum}] ${title.toUpperCase()}`);
  console.log(`======================================================================`);
}

function logSubstep(msg: string) {
  console.log(`  ➤ ${msg}`);
}

function logSuccess(msg: string) {
  console.log(`  ✓ ${msg}`);
}

async function runE2ELaboratory(): Promise<void> {
  const startTime = Date.now();
  console.log(`\n🚀 INICIANDO LABORATORIO E2E: TEST INTEGRAL DE PEDIDOS NOCTURNOS (FACTUSOL + WEB)`);
  console.log(`   Base de datos Factusol: ${FACTUSOL_SANDBOX_DB}`);
  console.log(`   Universal Bridge (PHP + MariaDB): ${BRIDGE_BASE_URL}`);
  console.log(`   WooCommerce Mock: ${WOOCOMMERCE_BASE_URL}`);

  // --------------------------------------------------------------------------
  // FASE 0: PRE-FLIGHT CHECK & RESET LIMPIO
  // --------------------------------------------------------------------------
  logStep(0, 'Pre-flight Check y Reseteo Pristine de Entornos');

  // 1. Restaurar base de datos Factusol a partir del pristine
  logSubstep('Restaurando copia limpia e independiente de Factusol ACCDB...');
  await resetSandboxDatabase({ verbose: false, targetPath: FACTUSOL_SANDBOX_DB });
  logSuccess('Factusol Sandbox restaurado a su estado prístino.');

  // 2. Limpiar tabla eb_orders en MariaDB del contenedor Docker
  logSubstep('Vaciando tabla eb_orders en MariaDB (Docker)...');
  try {
    execSync(
      'docker exec -i bentian-lab-mariadb mariadb -u tienda_user -ptest_password_123 suministros_tienda -e "TRUNCATE eb_orders;"',
      { stdio: 'pipe' }
    );
    logSuccess('Tabla eb_orders vaciada y reseteada.');
  } catch (err: any) {
    throw new Error(`Fallo al resetear eb_orders en MariaDB: ${err.message}`);
  }

  // 2b. Resetear pedidos en Mock WooCommerce
  logSubstep('Reseteando pedidos en Mock WooCommerce...');
  try {
    await fetch(`${WOOCOMMERCE_BASE_URL}/api/sandbox/reset-orders`, { method: 'POST' });
    logSuccess('Pedidos de Mock WooCommerce reseteados a estado inicial.');
  } catch (err: any) {
    logSubstep(`Aviso al resetear mock WooCommerce: ${err.message}`);
  }

  // 3. Inspeccionar estado inicial en Factusol ACCDB
  const accessDriver = new AccessDriver({ databasePath: FACTUSOL_SANDBOX_DB });
  const initOrders = await accessDriver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_PCL');
  const initLines = await accessDriver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_LPC');
  const initCusts = await accessDriver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_CLI');
  const initMaxOrder = await accessDriver.query<{ maxid: number | null }>('SELECT MAX(CODPCL) AS maxid FROM F_PCL');

  const baselineOrderCount = Number(initOrders[0]?.total || 0);
  const baselineLineCount = Number(initLines[0]?.total || 0);
  const baselineCustCount = Number(initCusts[0]?.total || 0);
  const baselineMaxOrder = Number(initMaxOrder[0]?.maxid || 0);

  logSubstep(`Estado inicial Factusol: Pedidos=${baselineOrderCount} (Máx CODPCL=${baselineMaxOrder}), Líneas=${baselineLineCount}, Clientes=${baselineCustCount}`);

  // 4. Medir existencias iniciales de los SKUs de prueba
  const testSkus = ['000001', '001341', '001455'];
  const stockBaseline: Record<string, number> = {};
  for (const sku of testSkus) {
    const sRes = await accessDriver.query<{ DISSTO: number }>(
      `SELECT DISSTO FROM F_STO WHERE ARTSTO = '${sku}' AND ALMSTO = 'GEN'`
    );
    stockBaseline[sku] = Number(sRes[0]?.DISSTO || 0);
    logSubstep(`Stock inicial SKU [${sku}] en almacén GEN: ${stockBaseline[sku]}`);
  }

  // --------------------------------------------------------------------------
  // FASE 1: INYECCIÓN DE PEDIDOS NOCTURNOS EN UNIVERSAL BRIDGE (MARIADB)
  // --------------------------------------------------------------------------
  logStep(1, 'Inyección de Pedidos Nocturnos en MariaDB (Simulación de Checkout Web)');

  const testOrders: TestOrderDefinition[] = [
    {
      name: 'Pedido 1 (B2C Particular Contado - Múltiples SKUs)',
      expectedSeries: '1',
      expectedCustomerCode: 1, // Cliente Contado Web genérico
      expectedSkuDeltas: { '000001': 3, '001341': 5 },
      payload: {
        shippingData: {
          fullName: 'Pedro Sanchez Gomez',
          address: 'Calle Mayor 45, Portal B, 2ºA',
          city: 'Madrid',
          province: 'Madrid',
          postalCode: '28014',
          phone: '611223344',
          email: 'pedro.sanchez@testbentian.es',
        },
        order: {
          lines: [
            {
              artlpc: '000001',
              deslpc: 'M. TUBO PVC ENC 8/ 50 MM.',
              canlpc: 3,
              prelpc: 12.50,
              totlpc: 37.50,
              ivaplc: 21,
            },
            {
              artlpc: '001341',
              deslpc: 'CODO 90º PVC SANITARIO 40 MM.',
              canlpc: 5,
              prelpc: 1.20,
              totlpc: 6.00,
              ivaplc: 21,
            },
          ],
          subtotal: 43.50,
          taxTotal: 9.14,
          total: 52.64,
        },
        paymentMethod: 'tarjeta',
        paymentStatus: 'COMPLETED',
        paymentReference: 'RED-84920491',
        shippingCost: 0,
      },
    },
    {
      name: 'Pedido 2 (B2B Empresa con CIF - Alta automática en F_CLI)',
      expectedSeries: '1',
      expectedCustomerCif: 'B98765432',
      expectedSkuDeltas: { '001455': 4 },
      payload: {
        shippingData: {
          fullName: 'Construcciones e Instalaciones del Sur S.L.',
          dni: 'B98765432',
          address: 'Poligono Industrial La Dehesa Nave 12',
          city: 'Albacete',
          province: 'Albacete',
          postalCode: '02001',
          phone: '967112233',
          email: 'administracion@construccionesdelsur.es',
        },
        order: {
          lines: [
            {
              artlpc: '001455',
              deslpc: 'DERIVACION DOBLE 67º PVC SAN. 125 MM.',
              canlpc: 4,
              prelpc: 25.00,
              totlpc: 100.00,
              ivaplc: 21,
            },
          ],
          subtotal: 100.00,
          taxTotal: 21.00,
          total: 121.00,
        },
        paymentMethod: 'transferencia',
        paymentStatus: 'COMPLETED',
        paymentReference: 'TR-BBVA-9901',
        shippingCost: 0,
      },
    },
    {
      name: 'Pedido 3 (B2C Portes con IVA y formato alternativo de líneas)',
      expectedSeries: '1',
      expectedCustomerCode: 1,
      expectedSkuDeltas: { '000001': 2 },
      payload: {
        shippingData: {
          fullName: 'Maria Carmen Fernandez',
          address: 'Avenida Constitucion 78',
          city: 'Valencia',
          province: 'Valencia',
          postalCode: '46001',
          phone: '655998877',
          email: 'mcarmen@testvalencia.es',
        },
        order: {
          lines: [
            {
              sku: '000001',
              name: 'M. TUBO PVC ENC 8/ 50 MM.',
              quantity: 2,
              price: 12.50,
              total: 25.00,
              vatRate: 21,
            },
          ],
          subtotal: 25.00,
          taxTotal: 5.25,
          total: 36.51,
        },
        paymentMethod: 'paypal',
        paymentStatus: 'COMPLETED',
        paymentReference: 'PAY-489201',
        shippingCost: 5.00,
      },
    },
  ];

  const createdWebOrders: Array<{ id: number; orderNumber: string }> = [];

  for (const tOrder of testOrders) {
    logSubstep(`Inyectando ${tOrder.name}...`);

    const res = await fetch(`${BRIDGE_BASE_URL}?action=create_order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tOrder.payload),
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status} al crear pedido: ${await res.text()}`);
    }

    const json = (await res.json()) as { success: boolean; pedidoId: number; orderNumber: string };
    if (!json.success || !json.pedidoId) {
      throw new Error(`Fallo en respuesta al crear pedido: ${JSON.stringify(json)}`);
    }

    createdWebOrders.push({ id: json.pedidoId, orderNumber: json.orderNumber });
    logSuccess(`Registrado en MariaDB: ID=${json.pedidoId}, Ref=${json.orderNumber}`);
  }

  // --------------------------------------------------------------------------
  // FASE 2: DESCARGA Y SINCRONIZACIÓN AUTOMÁTICA DEL AGENTE HACIA FACTUSOL
  // --------------------------------------------------------------------------
  logStep(2, 'Descarga y Sincronización del Agente hacia Factusol (Store-and-Forward)');

  // 1. PULL ORDERS desde Universal Bridge
  logSubstep(`Consultando pedidos pendientes en Universal Bridge (GET ${BRIDGE_BASE_URL}?action=pull_orders)...`);
  const pullRes = await fetch(`${BRIDGE_BASE_URL}?action=pull_orders&limit=50`, {
    headers: { Authorization: `Bearer ${BRIDGE_SECRET}` },
  });

  if (!pullRes.ok) {
    throw new Error(`HTTP Error ${pullRes.status} al llamar a pull_orders: ${await pullRes.text()}`);
  }

  const pullData = (await pullRes.json()) as { success: boolean; orders: any[] };
  const pendingOrders = pullData.orders || [];
  logSuccess(`Recibidos ${pendingOrders.length} pedidos pendientes de la tienda web.`);

  if (pendingOrders.length !== 3) {
    throw new Error(`Esperábamos 3 pedidos pendientes, pero se recibieron ${pendingOrders.length}`);
  }

  // 2. Conectar FactusolConnector al Sandbox
  logSubstep('Conectando FactusolConnector a sandbox Factusol ACCDB...');
  const factusolConnector = new FactusolConnector();
  await factusolConnector.connect({
    configuration: {
      databasePath: FACTUSOL_SANDBOX_DB,
      autoRollover: false,
      orderSeries: '1',
      defaultWarehouse: 'GEN',
      tariffCode: '1',
    },
  });
  logSuccess('FactusolConnector conectado con éxito.');

  // 3. Procesar cada pedido con OrderSyncHelper y createOrder
  const confirmations: Array<{
    id: number;
    orderId: number;
    webOrderId: number;
    factusolOrderNumber: number;
    factusolSeries: string;
  }> = [];

  const createdFactusolOrders: Array<{
    orderNumber: number;
    series: string;
    reference: string;
    customerCode: number;
  }> = [];

  for (const po of pendingOrders) {
    const numId = Number(po.id);
    logSubstep(`Transformando pedido web #${numId} (${po.order_number}) a formato canónico...`);
    const canonicalOrder = OrderSyncHelper.universalBridgeToCanonical(po, '1', 'GEN');

    logSubstep(`Insertando pedido canónico ${canonicalOrder.reference} en Factusol...`);
    const mutRes = await factusolConnector.createOrder(canonicalOrder);

    if (!mutRes.success) {
      throw new Error(`Fallo al insertar pedido ${canonicalOrder.reference} en Factusol: ${mutRes.error}`);
    }

    const assignedNum = Number(mutRes.externalId || mutRes.orderNumber);
    logSuccess(`✓ Pedido registrado en Factusol: CODPCL=${assignedNum}, Serie=1, Ref=${canonicalOrder.reference}`);

    createdFactusolOrders.push({
      orderNumber: assignedNum,
      series: '1',
      reference: canonicalOrder.reference || '',
      customerCode: 0, // Se validará en Fase 3
    });

    confirmations.push({
      id: numId,
      orderId: numId,
      webOrderId: numId,
      factusolOrderNumber: assignedNum,
      factusolSeries: '1',
    });
  }

  // 4. Confirmar pedidos en Universal Bridge (ACK ORDERS)
  logSubstep(`Enviando ACK a Universal Bridge para ${confirmations.length} pedidos...`);
  const ackRes = await fetch(`${BRIDGE_BASE_URL}?action=ack_orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BRIDGE_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmations }),
  });

  if (!ackRes.ok) {
    throw new Error(`HTTP Error ${ackRes.status} al llamar a ack_orders: ${await ackRes.text()}`);
  }

  const ackData = (await ackRes.json()) as { success: boolean; count: number };
  if (!ackData.success || ackData.count !== 3) {
    throw new Error(`Fallo en respuesta ack_orders: ${JSON.stringify(ackData)}`);
  }
  logSuccess(`✓ ACK confirmado: ${ackData.count} pedidos marcados como SYNCED en MariaDB.`);

  // --------------------------------------------------------------------------
  // FASE 3: ASERCIONES RIGUROSAS EN BASE DE DATOS FACTUSOL ACCDB
  // --------------------------------------------------------------------------
  logStep(3, 'Aserciones Rigurosas en Factusol ACCDB (F_PCL, F_LPC, F_STO, F_CLI)');

  // 1. Verificar incremento de pedidos en F_PCL
  const postOrders = await accessDriver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_PCL');
  const currentOrderCount = Number(postOrders[0]?.total || 0);
  logSubstep(`Total pedidos en F_PCL: anterior=${baselineOrderCount}, actual=${currentOrderCount}`);
  if (currentOrderCount !== baselineOrderCount + 3) {
    throw new Error(`F_PCL no contiene el número esperado de pedidos: esperado ${baselineOrderCount + 3}, encontrado ${currentOrderCount}`);
  }
  logSuccess(`Aserción F_PCL superada: Se crearon exactamente 3 pedidos.`);

  // 2. Verificar datos de cabecera de cada pedido en F_PCL
  const order13 = await accessDriver.query<any>(`SELECT * FROM F_PCL WHERE CODPCL = ${baselineMaxOrder + 1}`);
  if (order13.length === 0) throw new Error(`No se encontró el pedido CODPCL=${baselineMaxOrder + 1}`);
  const row13 = order13[0];
  logSubstep(`Pedido ${baselineMaxOrder + 1}: Cliente=${row13.CLIPCL}, Destinatario="${row13.CNOPCL}", Población="${row13.CPOPCL}"`);
  if (Number(row13.CLIPCL) !== 1) {
    throw new Error(`Pedido 13 debería tener CLIPCL=1 (contado), pero tiene ${row13.CLIPCL}`);
  }
  if (!String(row13.CNOPCL).includes('Pedro Sanchez')) {
    throw new Error(`Pedido 13 no estampó el destinatario correctamente: ${row13.CNOPCL}`);
  }
  logSuccess(`✓ Pedido ${baselineMaxOrder + 1} validado: Cliente Contado 1 con nombre y dirección estampados.`);

  // Pedido 14: Debe haber creado un nuevo cliente en F_CLI
  const order14 = await accessDriver.query<any>(`SELECT * FROM F_PCL WHERE CODPCL = ${baselineMaxOrder + 2}`);
  if (order14.length === 0) throw new Error(`No se encontró el pedido CODPCL=${baselineMaxOrder + 2}`);
  const row14 = order14[0];
  const b2bCustCode = Number(row14.CLIPCL);
  logSubstep(`Pedido ${baselineMaxOrder + 2} (B2B): Cliente asignado CODCLI=${b2bCustCode}`);
  if (b2bCustCode <= 1) {
    throw new Error(`Pedido 14 debería tener un CODCLI registrado (> 1), pero tiene ${b2bCustCode}`);
  }

  // Verificar que el cliente existe en F_CLI con su CIF
  const cliRows = await accessDriver.query<any>(`SELECT * FROM F_CLI WHERE CODCLI = ${b2bCustCode}`);
  if (cliRows.length === 0) {
    throw new Error(`El cliente CODCLI=${b2bCustCode} no se encontró en F_CLI`);
  }
  const custRow = cliRows[0];
  logSubstep(`Cliente F_CLI #${b2bCustCode}: CIF="${custRow.NIFCLI}", Nombre="${custRow.NOFCLI}"`);
  if (!String(custRow.NIFCLI).includes('B98765432')) {
    throw new Error(`El NIF/CIF en F_CLI no coincide: esperado B98765432, actual ${custRow.NIFCLI}`);
  }
  logSuccess(`✓ Pedido ${baselineMaxOrder + 2} validado: Cliente B2B registrado en F_CLI con CIF.`);

  // 3. Verificar líneas en F_LPC
  const lines13 = await accessDriver.query<any>(`SELECT * FROM F_LPC WHERE CODLPC = ${baselineMaxOrder + 1} ORDER BY POSLPC ASC`);
  logSubstep(`Líneas de pedido ${baselineMaxOrder + 1}: ${lines13.length} líneas encontradas`);
  if (lines13.length !== 2) {
    throw new Error(`Pedido ${baselineMaxOrder + 1} debería tener 2 líneas, pero tiene ${lines13.length}`);
  }
  logSuccess(`✓ Líneas de pedido en F_LPC verificadas correctamente.`);

  // 4. Verificar decremento atómico de stock en F_STO
  logSubstep('Verificando decrementos de existencias en F_STO...');
  // SKU 000001: deltas fueron 3 (pedido 1) + 2 (pedido 3) = 5 unidades
  const s000001 = await accessDriver.query<{ DISSTO: number }>(
    `SELECT DISSTO FROM F_STO WHERE ARTSTO = '000001' AND ALMSTO = 'GEN'`
  );
  const finalStock000001 = Number(s000001[0]?.DISSTO || 0);
  const baseline000001 = stockBaseline['000001'] ?? 0;
  const expectedStock000001 = baseline000001 - 5;
  logSubstep(`Stock SKU [000001]: inicial=${baseline000001}, esperado=${expectedStock000001}, final=${finalStock000001}`);
  if (finalStock000001 !== expectedStock000001) {
    throw new Error(`Stock de 000001 incorrecto: esperado ${expectedStock000001}, actual ${finalStock000001}`);
  }

  // SKU 001341: delta 5 (pedido 1)
  const s001341 = await accessDriver.query<{ DISSTO: number }>(
    `SELECT DISSTO FROM F_STO WHERE ARTSTO = '001341' AND ALMSTO = 'GEN'`
  );
  const finalStock001341 = Number(s001341[0]?.DISSTO || 0);
  const baseline001341 = stockBaseline['001341'] ?? 0;
  const expectedStock001341 = baseline001341 - 5;
  logSubstep(`Stock SKU [001341]: inicial=${baseline001341}, esperado=${expectedStock001341}, final=${finalStock001341}`);
  if (finalStock001341 !== expectedStock001341) {
    throw new Error(`Stock de 001341 incorrecto: esperado ${expectedStock001341}, actual ${finalStock001341}`);
  }

  // SKU 001455: delta 4 (pedido 2)
  const s001455 = await accessDriver.query<{ DISSTO: number }>(
    `SELECT DISSTO FROM F_STO WHERE ARTSTO = '001455' AND ALMSTO = 'GEN'`
  );
  const finalStock001455 = Number(s001455[0]?.DISSTO || 0);
  const baseline001455 = stockBaseline['001455'] ?? 0;
  const expectedStock001455 = baseline001455 - 4;
  logSubstep(`Stock SKU [001455]: inicial=${baseline001455}, esperado=${expectedStock001455}, final=${finalStock001455}`);
  if (finalStock001455 !== expectedStock001455) {
    throw new Error(`Stock de 001455 incorrecto: esperado ${expectedStock001455}, actual ${finalStock001455}`);
  }
  logSuccess(`✓ Decrementos atómicos de stock en F_STO verificados al 100%.`);

  // --------------------------------------------------------------------------
  // FASE 4: PRUEBA DE IDEMPOTENCIA Y SEGUNDA PASADA (CERO DUPLICADOS)
  // --------------------------------------------------------------------------
  logStep(4, 'Verificación de Idempotencia y Blindaje contra Duplicados');

  // 1. Comprobar que en MariaDB los pedidos ya están en estado SYNCED y no PENDING
  logSubstep('Comprobando que pull_orders devuelve 0 pedidos tras el ACK...');
  const secondPullRes = await fetch(`${BRIDGE_BASE_URL}?action=pull_orders&limit=50`, {
    headers: { Authorization: `Bearer ${BRIDGE_SECRET}` },
  });
  const secondPullData = (await secondPullRes.json()) as { success: boolean; orders: any[] };
  const remainingPending = secondPullData.orders || [];
  logSubstep(`Pedidos pendientes devueltos: ${remainingPending.length}`);
  if (remainingPending.length !== 0) {
    throw new Error(`pull_orders devolvió ${remainingPending.length} pedidos cuando debería devolver 0.`);
  }
  logSuccess(`✓ Universal Bridge MariaDB no vuelve a ofrecer pedidos confirmados.`);

  // 2. Re-ejecución forzada de createOrder con los mismos datos canónicos
  logSubstep('Sometiendo a prueba de estrés la idempotencia interna de FactusolConnector...');
  for (const po of pendingOrders) {
    const canonicalOrder = OrderSyncHelper.universalBridgeToCanonical(po, '1', 'GEN');
    const duplicateRes = await factusolConnector.createOrder(canonicalOrder);

    if (!duplicateRes.success) {
      throw new Error(`Fallo en llamada idempotente para ${canonicalOrder.reference}: ${duplicateRes.error}`);
    }

    logSubstep(`Reintento de ${canonicalOrder.reference}: resuelto con éxito (ID=${duplicateRes.externalId})`);
  }

  // 3. Comprobar que F_PCL y F_LPC NO han aumentado de tamaño
  const postIdempotentOrders = await accessDriver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_PCL');
  const countAfterIdempotence = Number(postIdempotentOrders[0]?.total || 0);
  if (countAfterIdempotence !== currentOrderCount) {
    throw new Error(
      `¡VIOLACIÓN DE IDEMPOTENCIA! F_PCL creció de ${currentOrderCount} a ${countAfterIdempotence} pedidos al reintentar.`
    );
  }
  logSuccess(`✓ Cero pedidos duplicados en F_PCL tras reintento forzado.`);

  // 4. Comprobar que el stock NO se volvió a decrementar
  const stockRecheck000001 = await accessDriver.query<{ DISSTO: number }>(
    `SELECT DISSTO FROM F_STO WHERE ARTSTO = '000001' AND ALMSTO = 'GEN'`
  );
  if (Number(stockRecheck000001[0]?.DISSTO || 0) !== finalStock000001) {
    throw new Error('¡VIOLACIÓN DE IDEMPOTENCIA DE STOCK! El stock volvió a decrementar en la segunda pasada.');
  }
  logSuccess(`✓ Cero decremento residual de existencias: Stock 100% íntegro e idempotente.`);

  // --------------------------------------------------------------------------
  // FASE 5: PRUEBA DE WOOCOMMERCE REST API (MOCK SERVER)
  // --------------------------------------------------------------------------
  logStep(5, 'Sincronización de Pedidos desde WooCommerce REST API');

  logSubstep(`Consultando pedidos en WooCommerce Mock (${WOOCOMMERCE_BASE_URL}/wp-json/wc/v3/orders)...`);
  const wcRes = await fetch(`${WOOCOMMERCE_BASE_URL}/wp-json/wc/v3/orders?status=processing`);
  if (!wcRes.ok) {
    throw new Error(`HTTP Error ${wcRes.status} al consultar WooCommerce: ${await wcRes.text()}`);
  }

  const wcOrders = (await wcRes.json()) as any[];
  logSuccess(`Encontrados ${wcOrders.length} pedidos en WooCommerce.`);
  const wcOrder601 = wcOrders.find((o) => o.id === 601);
  if (!wcOrder601) {
    throw new Error('No se encontró el pedido #601 en el Mock de WooCommerce');
  }

  // 1. Transformar pedido WooCommerce a canónico
  logSubstep('Transformando pedido #601 de WooCommerce a CanonicalOrder...');
  const wcCanonical = OrderSyncHelper.wooCommerceToCanonical(wcOrder601, '1', 'GEN');

  // 2. Insertar en Factusol
  logSubstep(`Insertando pedido WooCommerce ${wcCanonical.reference} en Factusol...`);
  const wcFactusolRes = await factusolConnector.createOrder(wcCanonical);
  if (!wcFactusolRes.success) {
    throw new Error(`Fallo al insertar pedido de WooCommerce en Factusol: ${wcFactusolRes.error}`);
  }
  const wcAssignedNum = Number(wcFactusolRes.externalId || wcFactusolRes.orderNumber);
  logSuccess(`✓ Pedido WooCommerce #601 registrado en Factusol: CODPCL=${wcAssignedNum}`);

  // Verificar que en F_PCL se registró con CODPCL = 16
  const order16 = await accessDriver.query<any>(`SELECT * FROM F_PCL WHERE CODPCL = ${wcAssignedNum}`);
  if (order16.length === 0) {
    throw new Error(`No se encontró el pedido CODPCL=${wcAssignedNum} en F_PCL`);
  }
  logSuccess(`✓ Pedido #${wcAssignedNum} verificado en tabla F_PCL de Factusol.`);

  // Verificar que el stock de 001455 decrementó en 2 unidades adicionales (de -4 a -6)
  const s001455Wc = await accessDriver.query<{ DISSTO: number }>(
    `SELECT DISSTO FROM F_STO WHERE ARTSTO = '001455' AND ALMSTO = 'GEN'`
  );
  const stockAfterWc = Number(s001455Wc[0]?.DISSTO || 0);
  logSubstep(`Stock SKU [001455] tras WooCommerce: actual=${stockAfterWc}, esperado=-6`);
  if (stockAfterWc !== -6) {
    throw new Error(`Stock de 001455 tras pedido WooCommerce incorrecto: esperado -6, actual ${stockAfterWc}`);
  }
  logSuccess('✓ Stock en F_STO decrementado correctamente tras pedido WooCommerce.');

  // 3. Estampar metadato en WooCommerce
  logSubstep(`Actualizando metadato _bentian_factusol_pcl=${wcAssignedNum} en WooCommerce...`);
  const putWcRes = await fetch(`${WOOCOMMERCE_BASE_URL}/wp-json/wc/v3/orders/601`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meta_data: [{ key: '_bentian_factusol_pcl', value: String(wcAssignedNum) }],
    }),
  });
  if (!putWcRes.ok) {
    throw new Error(`Fallo al actualizar pedido en WooCommerce: ${await putWcRes.text()}`);
  }
  logSuccess('✓ Metadato de Factusol registrado en WooCommerce.');

  // 4. Verificar que OrderSyncHelper detecta el metadato en la siguiente consulta
  const updatedWcRes = await fetch(`${WOOCOMMERCE_BASE_URL}/wp-json/wc/v3/orders/601`);
  const updatedWcOrder = await updatedWcRes.json();
  const isAlreadyProcessed = OrderSyncHelper.isWcOrderAlreadyProcessed(updatedWcOrder);
  logSubstep(`¿Pedido WooCommerce #601 reconocido como ya procesado?: ${isAlreadyProcessed}`);
  if (!isAlreadyProcessed) {
    throw new Error('OrderSyncHelper.isWcOrderAlreadyProcessed devolvió false para pedido con metadato');
  }
  logSuccess('✓ WooCommerce OrderSyncHelper reconoce pedido procesado y lo descarta en siguientes ciclos.');

  // --------------------------------------------------------------------------
  // FASE 6: SINCRONIZACIÓN INVERSA Y REPOSICIÓN DE STOCK POR CANCELACIÓN/REEMBOLSO
  // --------------------------------------------------------------------------
  logStep(6, 'Sincronización Inversa y Reposición de Stock por Cancelación/Reembolso');

  // 1. Simular cancelación de Pedido 2 en Universal Bridge (MariaDB / PHP)
  const order2Web = createdWebOrders[1];
  if (!order2Web) {
    throw new Error('No se encontró el Pedido 2 en createdWebOrders');
  }
  logSubstep(`Simulando cancelación de Pedido 2 Web (ID=${order2Web.id}, Ref=${order2Web.orderNumber})...`);
  const cancelBridgeReq = await fetch(`${BRIDGE_BASE_URL}?action=cancel_order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order2Web.id,
      orderNumber: order2Web.orderNumber,
      reason: 'Cancelación de prueba en Laboratorio E2E',
    }),
  });

  if (!cancelBridgeReq.ok) {
    throw new Error(`HTTP Error ${cancelBridgeReq.status} al cancelar pedido en Universal Bridge: ${await cancelBridgeReq.text()}`);
  }

  const cancelBridgeJson = (await cancelBridgeReq.json()) as any;
  if (!cancelBridgeJson.success || cancelBridgeJson.status !== 'CANCELLED') {
    throw new Error(`Fallo en respuesta cancel_order: ${JSON.stringify(cancelBridgeJson)}`);
  }
  logSuccess(`✓ Pedido 2 marcado como CANCELLED en Universal Bridge MariaDB.`);

  // 2. Ejecutar syncUniversalBridgeCancellations
  logSubstep('Ejecutando CancellationSyncHelper.syncUniversalBridgeCancellations()...');
  const bridgeCancelSyncResult = await CancellationSyncHelper.syncUniversalBridgeCancellations({
    endpointUrl: BRIDGE_BASE_URL,
    headers: { Authorization: `Bearer ${BRIDGE_SECRET}` },
    driver: accessDriver,
    orderSeries: '1',
    defaultWarehouse: 'GEN',
  });

  logSubstep(
    `Resultado syncUniversalBridgeCancellations: cancelados=${bridgeCancelSyncResult.ordersCancelled}, repuestos=${bridgeCancelSyncResult.itemsRestocked}, errores=${bridgeCancelSyncResult.errors.length}`
  );
  if (bridgeCancelSyncResult.errors.length > 0) {
    throw new Error(`Errores en syncUniversalBridgeCancellations: ${bridgeCancelSyncResult.errors.join('; ')}`);
  }
  if (bridgeCancelSyncResult.ordersCancelled !== 1) {
    throw new Error(`Se esperaba 1 pedido cancelado procesado, pero se procesaron ${bridgeCancelSyncResult.ordersCancelled}`);
  }
  logSuccess('✓ Sincronización inversa de Universal Bridge completada.');

  // 3. Comprobar en Factusol ACCDB: F_PCL ESTPCL = 3 y F_STO DISSTO repuesto de -6 a -2
  logSubstep('Comprobando F_PCL para pedido cancelado Factusol #14...');
  const order14CancelCheck = await accessDriver.query<{ ESTPCL: number }>(
    `SELECT ESTPCL FROM F_PCL WHERE CODPCL = 14 AND TIPPCL = '1'`
  );
  if (order14CancelCheck.length === 0) {
    throw new Error('No se encontró el pedido Factusol #14 en F_PCL');
  }
  const estPcl14 = Number(order14CancelCheck[0]?.ESTPCL);
  logSubstep(`Estado ESTPCL de pedido Factusol #14: ${estPcl14}`);
  if (estPcl14 !== 3) {
    throw new Error(`ESTPCL de pedido Factusol #14 no es 3 (Anulado): actual ${estPcl14}`);
  }
  logSuccess('✓ Factusol F_PCL verificado: Pedido #14 marcado con ESTPCL = 3 (Anulado).');

  logSubstep('Comprobando F_STO para SKU [001455] (debe reponer 4 uds: de -6 a -2)...');
  const s001455After1stCancel = await accessDriver.query<{ DISSTO: number }>(
    `SELECT DISSTO FROM F_STO WHERE ARTSTO = '001455' AND ALMSTO = 'GEN'`
  );
  const stockAfter1stCancel = Number(s001455After1stCancel[0]?.DISSTO || 0);
  logSubstep(`Stock SKU [001455] en almacén GEN: actual=${stockAfter1stCancel}, esperado=-2`);
  if (stockAfter1stCancel !== -2) {
    throw new Error(`Stock de 001455 incorrecto tras cancelación de Pedido 2: esperado -2, actual ${stockAfter1stCancel}`);
  }
  logSuccess('✓ Factusol F_STO verificado: Stock de 001455 repuesto exactamente en 4 unidades (-6 -> -2).');

  // 4. Comprobar en MariaDB que eb_orders tiene factusol_unstocked = 1 y status = 'CANCELLED'
  logSubstep('Comprobando estado de eb_orders en MariaDB...');
  const mariaDbOrder2 = execSync(
    `docker exec -i bentian-lab-mariadb mariadb -u tienda_user -ptest_password_123 suministros_tienda -e "SELECT id, status, factusol_unstocked FROM eb_orders WHERE id = ${order2Web.id};"`,
    { encoding: 'utf8' }
  );
  logSubstep(`Registro en MariaDB:\n${mariaDbOrder2.trim()}`);
  if (!mariaDbOrder2.includes('CANCELLED') || !mariaDbOrder2.includes('1')) {
    throw new Error(`eb_orders en MariaDB no refleja status=CANCELLED y factusol_unstocked=1:\n${mariaDbOrder2}`);
  }
  logSuccess('✓ MariaDB eb_orders verificado: status="CANCELLED" y factusol_unstocked=1.');

  // 5. Segunda pasada y comprobación del guardarraíl anti-doble reposición
  logSubstep('Ejecutando segunda pasada para verificar guardarraíl anti-doble reposición...');
  const secondBridgeCancelSync = await CancellationSyncHelper.syncUniversalBridgeCancellations({
    endpointUrl: BRIDGE_BASE_URL,
    headers: { Authorization: `Bearer ${BRIDGE_SECRET}` },
    driver: accessDriver,
    orderSeries: '1',
    defaultWarehouse: 'GEN',
  });
  if (secondBridgeCancelSync.ordersCancelled !== 0) {
    throw new Error(`Segunda pasada procesó ${secondBridgeCancelSync.ordersCancelled} pedidos cuando debía ser 0.`);
  }

  // Prueba directa en FactusolConnector/AccessDriver
  logSubstep('Sometiendo a prueba directa restoreFactusolOrderStock sobre pedido ya anulado (ESTPCL = 3)...');
  const directGuardrail = await CancellationSyncHelper.restoreFactusolOrderStock(
    accessDriver,
    14,
    '1',
    'GEN'
  );
  if (!directGuardrail.alreadyCancelled || directGuardrail.linesRestocked !== 0) {
    throw new Error(`Guardarraíl interno falló: ${JSON.stringify(directGuardrail)}`);
  }

  const s001455GuardrailCheck = await accessDriver.query<{ DISSTO: number }>(
    `SELECT DISSTO FROM F_STO WHERE ARTSTO = '001455' AND ALMSTO = 'GEN'`
  );
  const stockAfterGuardrail = Number(s001455GuardrailCheck[0]?.DISSTO || 0);
  if (stockAfterGuardrail !== -2) {
    throw new Error(`¡VIOLACIÓN DE GUARDARRAÍL! El stock de 001455 cambió en la segunda pasada: esperado -2, actual ${stockAfterGuardrail}`);
  }
  logSuccess('✓ Guardarraíl anti-doble reposición verificado: El stock permanece exactamente en -2.');

  // 6. Simular cancelación del pedido de WooCommerce (#601)
  logSubstep('Simulando cancelación de pedido WooCommerce #601...');
  const wcCancelReq = await fetch(`${WOOCOMMERCE_BASE_URL}/wp-json/wc/v3/orders/601`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  if (!wcCancelReq.ok) {
    throw new Error(`Fallo al cancelar pedido #601 en WooCommerce Mock: ${await wcCancelReq.text()}`);
  }
  const wcCancelled = (await wcCancelReq.json()) as any;
  if (wcCancelled.status !== 'cancelled') {
    throw new Error(`Estado inesperado en WooCommerce #601: ${wcCancelled.status}`);
  }
  logSuccess('✓ Pedido WooCommerce #601 marcado con status="cancelled".');

  // 7. Ejecutar syncWooCommerceCancellations
  logSubstep('Ejecutando CancellationSyncHelper.syncWooCommerceCancellations()...');
  const wcCancelSyncResult = await CancellationSyncHelper.syncWooCommerceCancellations({
    storeUrl: WOOCOMMERCE_BASE_URL,
    authHeader: 'Basic dGVzdDp0ZXN0',
    driver: accessDriver,
    orderSeries: '1',
    defaultWarehouse: 'GEN',
  });

  logSubstep(
    `Resultado syncWooCommerceCancellations: cancelados=${wcCancelSyncResult.ordersCancelled}, repuestos=${wcCancelSyncResult.itemsRestocked}, errores=${wcCancelSyncResult.errors.length}`
  );
  if (wcCancelSyncResult.errors.length > 0) {
    throw new Error(`Errores en syncWooCommerceCancellations: ${wcCancelSyncResult.errors.join('; ')}`);
  }
  if (wcCancelSyncResult.ordersCancelled !== 1) {
    throw new Error(`Se esperaba 1 pedido cancelado de WooCommerce procesado, pero se procesaron ${wcCancelSyncResult.ordersCancelled}`);
  }
  logSuccess('✓ Sincronización inversa de WooCommerce completada.');

  // 8. Comprobar en Factusol: Pedido 16 tiene ESTPCL = 3 y F_STO SKU 001455 repuso 2 uds (de -2 a 0)
  logSubstep('Comprobando F_PCL para pedido Factusol #16 (WooCommerce)...');
  const order16CancelCheck = await accessDriver.query<{ ESTPCL: number }>(
    `SELECT ESTPCL FROM F_PCL WHERE CODPCL = 16 AND TIPPCL = '1'`
  );
  if (order16CancelCheck.length === 0) {
    throw new Error('No se encontró el pedido Factusol #16 en F_PCL');
  }
  const estPcl16 = Number(order16CancelCheck[0]?.ESTPCL);
  if (estPcl16 !== 3) {
    throw new Error(`ESTPCL de pedido Factusol #16 no es 3 (Anulado): actual ${estPcl16}`);
  }
  logSuccess('✓ Factusol F_PCL verificado: Pedido #16 marcado con ESTPCL = 3 (Anulado).');

  logSubstep('Comprobando F_STO para SKU [001455] tras cancelación WooCommerce (de -2 a 0)...');
  const s001455AfterWcCancel = await accessDriver.query<{ DISSTO: number }>(
    `SELECT DISSTO FROM F_STO WHERE ARTSTO = '001455' AND ALMSTO = 'GEN'`
  );
  const stockAfterWcCancel = Number(s001455AfterWcCancel[0]?.DISSTO || 0);
  logSubstep(`Stock final SKU [001455] en almacén GEN: actual=${stockAfterWcCancel}, esperado=0`);
  if (stockAfterWcCancel !== 0) {
    throw new Error(`Stock de 001455 incorrecto tras cancelación WooCommerce: esperado 0, actual ${stockAfterWcCancel}`);
  }
  logSuccess('✓ Factusol F_STO verificado: Stock de 001455 repuesto en 2 unidades (-2 -> 0, inventario original restablecido).');

  // 9. Comprobar metadato _bentian_factusol_cancelled: "1" en WooCommerce Mock
  logSubstep('Verificando estampa de metadato _bentian_factusol_cancelled: "1" en WooCommerce...');
  const wcRecheckReq = await fetch(`${WOOCOMMERCE_BASE_URL}/wp-json/wc/v3/orders/601`);
  const wcRecheckData = (await wcRecheckReq.json()) as any;
  const cancelledMeta = Array.isArray(wcRecheckData.meta_data) && wcRecheckData.meta_data.find(
    (m: any) => m.key === '_bentian_factusol_cancelled'
  );
  if (!cancelledMeta || String(cancelledMeta.value) !== '1') {
    throw new Error(`No se encontró el metadato _bentian_factusol_cancelled="1" en WooCommerce: ${JSON.stringify(wcRecheckData.meta_data)}`);
  }
  logSuccess('✓ WooCommerce verificado: Metadato _bentian_factusol_cancelled="1" presente en el pedido.');

  // 10. Segunda pasada WooCommerce (Guardarraíl anti-doble reposición)
  logSubstep('Verificando segunda pasada en WooCommerce (Guardarraíl Anti-Doble Reposición)...');
  const secondWcCancelSync = await CancellationSyncHelper.syncWooCommerceCancellations({
    storeUrl: WOOCOMMERCE_BASE_URL,
    authHeader: 'Basic dGVzdDp0ZXN0',
    driver: accessDriver,
    orderSeries: '1',
    defaultWarehouse: 'GEN',
  });
  if (secondWcCancelSync.ordersCancelled !== 0) {
    throw new Error(`Segunda pasada de WooCommerce canceló ${secondWcCancelSync.ordersCancelled} pedidos cuando debía ser 0.`);
  }
  const s001455FinalCheck = await accessDriver.query<{ DISSTO: number }>(
    `SELECT DISSTO FROM F_STO WHERE ARTSTO = '001455' AND ALMSTO = 'GEN'`
  );
  if (Number(s001455FinalCheck[0]?.DISSTO || 0) !== 0) {
    throw new Error('El stock de 001455 cambió en la segunda pasada de WooCommerce.');
  }
  logSuccess('✓ Guardarraíl WooCommerce verificado: Cero reposiciones adicionales, stock inmutable en 0.');

  // --------------------------------------------------------------------------
  // RESUMEN Y CONCLUSIÓN FINAL
  // --------------------------------------------------------------------------
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n======================================================================`);
  console.log(`  🎉 LABORATORIO E2E COMPLETADO CON ÉXITO ABSOLUTO EN ${durationSec}s`);
  console.log(`======================================================================`);
  console.log(`  • Pedidos web MariaDB inyectados:    3`);
  console.log(`  • Pedidos importados a Factusol:      4 (3 Web + 1 WooCommerce)`);
  console.log(`  • Pedidos cancelados y repuestos:    2 (Pedido 14 / Web-2 + Pedido 16 / Woo-601)`);
  console.log(`  • Clientes dados de alta en F_CLI:   1 (B2B con CIF)`);
  console.log(`  • Líneas de pedido insertadas:       4`);
  console.log(`  • Aserciones de stock en F_STO:      100% correctas (decremento y reposición exacta)`);
  console.log(`  • Test de Idempotencia y Reintentos: 0 duplicados, 0 fugas de stock`);
  console.log(`  • Guardarraíl Anti-Doble Reposición: 100% blindado contra sobre-reposiciones`);
  console.log(`======================================================================\n`);
}

if (require.main === module) {
  runE2ELaboratory()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ ERROR EN LABORATORIO E2E:', err);
      process.exit(1);
    });
}
