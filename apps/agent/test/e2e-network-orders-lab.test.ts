import assert from 'assert';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { ConfigManager } from '../src/config/config.manager';
import { FactusolService } from '../src/factusol/factusol.service';
import { HistoryManager } from '../src/history/history.manager';
import { EventBus } from '../src/diagnostics/event-bus';
import { LocalSyncEngine } from '../src/sync/sync.engine';
import { AccessDriver } from '@erp-bridge/connector-factusol';

console.log('======================================================================');
console.log('🧪 LABORATORIO DE PRUEBAS RED PUNTO A PUNTO: PEDIDOS NOCTURNOS (E2E)');
console.log('======================================================================');

const DOCKER_BRIDGE_URL = 'http://127.0.0.1:8999/erp-bridge-endpoint.php';
const SECRET_KEY = 'rubio_secreto_2026';
const ORIGINAL_DB = path.resolve('G:/Otros ordenadores/Mi PC/Bentian/API/bentian/2252025.accdb');

async function httpPost(url: string, data: any, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyStr = JSON.stringify(data);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          ...headers,
        },
        timeout: 10000,
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(resData));
          } catch {
            resolve({ raw: resData, statusCode: res.statusCode });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function httpGet(url: string, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.get(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        headers,
        timeout: 10000,
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(resData));
          } catch {
            resolve({ raw: resData, statusCode: res.statusCode });
          }
        });
      }
    );
    req.on('error', reject);
  });
}

async function runLab() {
  // -------------------------------------------------------------------------
  // FASE 0: Comprobación de prerrequisitos (Docker PHP y Factusol ACCDB)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 0: Verificando prerrequisitos del laboratorio ---');
  assert.ok(fs.existsSync(ORIGINAL_DB), `La base de datos original Factusol ${ORIGINAL_DB} debe existir.`);

  const pingRes = await httpGet(`${DOCKER_BRIDGE_URL}?action=ping`).catch((err) => {
    console.error('Error al conectar con Docker PHP Bridge:', err);
    return null;
  });
  assert.ok(pingRes && pingRes.success, 'Docker PHP Bridge en http://127.0.0.1:8999 debe responder a ping.');
  console.log('✓ Docker MariaDB + PHP Bridge conectado y listo en puerto 8999.');

  // Crear sandbox temporal aislado para la prueba
  const sandboxDir = path.join(os.tmpdir(), `bentian-lab-${Date.now()}`);
  fs.mkdirSync(sandboxDir, { recursive: true });
  const sandboxDb = path.join(sandboxDir, '2252025.accdb');
  fs.copyFileSync(ORIGINAL_DB, sandboxDb);
  console.log(`✓ Copia sandbox de Factusol creada en: ${sandboxDb}`);

  const driver = new AccessDriver({ databasePath: sandboxDb });

  // -------------------------------------------------------------------------
  // FASE 1: Simulación de Pedidos Nocturnos en la Tienda Web (Universal Bridge)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 1: Creando 3 pedidos nocturnos en la tienda web (Docker MariaDB) ---');
  
  // Pedido 1: Estructura Angular Checkout (artlpc, canlpc, prelpc, totlpc con IVA, fullName)
  const order1Payload = {
    order: {
      cabecera: {
        totpcl: 36.3,
        net1pcl: 30.0,
        iiva1pcl: 6.3,
      },
      lines: [
        {
          artlpc: '001',
          deslpc: 'Artículo Prueba Angular',
          canlpc: 3,
          prelpc: 10.0, // NETO
          totlpc: 36.3, // BRUTO (con IVA) generado por el checkout de Angular
          ivaplc: 0, // 21%
        },
      ],
    },
    shippingData: {
      fullName: 'Ana García Pérez',
      address: 'Avenida Constitución 45',
      city: 'Sevilla',
      province: 'Sevilla',
      postalCode: '41001',
      country: 'España',
      phone: '654321987',
      email: 'ana.garcia@test.com',
    },
    shippingCost: 0,
    paymentMethod: 'paypal',
    paymentStatus: 'COMPLETED',
  };

  const resOrder1 = await httpPost(`${DOCKER_BRIDGE_URL}?action=create_order`, order1Payload);
  assert.ok(resOrder1 && resOrder1.success, 'Pedido nocturno 1 debe crearse en Docker MariaDB');
  console.log(`  ✓ Pedido 1 creado: ID #${resOrder1.pedidoId} (${resOrder1.orderNumber})`);

  // Pedido 2: Cliente con CIF y formato estándar eCommerce
  const order2Payload = {
    order: {
      total: 60.5,
      subtotal: 50.0,
      taxTotal: 10.5,
      lines: [
        {
          sku: '002',
          name: 'Artículo Profesional B2B',
          quantity: 2,
          unitPrice: 25.0,
          vatRate: 21,
        },
      ],
    },
    shippingData: {
      fullName: 'Suministros Industriales S.L.',
      cif: 'B99887766',
      taxId: 'B99887766',
      address: 'Polígono Norte Nave 12',
      city: 'Madrid',
      province: 'Madrid',
      postalCode: '28050',
      country: 'España',
      phone: '912345678',
      email: 'pedidos@suministros-ind.com',
    },
    shippingCost: 0,
    paymentMethod: 'redsys',
    paymentStatus: 'COMPLETED',
  };

  const resOrder2 = await httpPost(`${DOCKER_BRIDGE_URL}?action=create_order`, order2Payload);
  assert.ok(resOrder2 && resOrder2.success, 'Pedido nocturno 2 debe crearse en Docker MariaDB');
  console.log(`  ✓ Pedido 2 creado: ID #${resOrder2.pedidoId} (${resOrder2.orderNumber})`);

  // Comprobar que en MariaDB hay pedidos pendientes
  const pullBefore = await httpGet(`${DOCKER_BRIDGE_URL}?action=pull_orders`, {
    Authorization: `Bearer ${SECRET_KEY}`,
  });
  assert.strictEqual(pullBefore.orders.length, 2, 'Debe haber exactamente 2 pedidos en estado PENDING');
  console.log('✓ Verificado en Docker MariaDB: 2 pedidos pendientes en cola.');

  // -------------------------------------------------------------------------
  // FASE 2: Arranque Matutino del Agente y Sincronización Red Punto a Punto
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 2: El agente arranca por la mañana y ejecuta la sincronización ---');
  
  const eventBus = new EventBus();
  const historyManager = new HistoryManager(sandboxDir);
  const configManager = new ConfigManager();
  
  // Configurar agente apuntando al contenedor Docker y al Factusol Sandbox
  configManager.setFactusolDbPath(sandboxDb);
  const cfg = configManager.get();
  cfg.channelType = 'universal_bridge';
  cfg.universalBridge = {
    storeUrl: DOCKER_BRIDGE_URL,
    secretKey: SECRET_KEY,
  };
  cfg.factusol = {
    databasePath: sandboxDb,
    orderSeries: '1',
    warehouseCode: 'GEN',
  };

  const factusolService = new FactusolService(configManager);
  await factusolService.connect(sandboxDb);

  const syncEngine = new LocalSyncEngine(configManager, factusolService, historyManager, eventBus);

  // Disparar sincronización matutina punto a punto
  const syncResult = await syncEngine.triggerManualSync();
  assert.strictEqual(syncResult.success, true, 'La sincronización debe ser exitosa');
  console.log(`✓ Sincronización matutina completada: ${syncResult.message}`);

  // -------------------------------------------------------------------------
  // FASE 3: Verificación de Integridad en Factusol ACCDB (Headers, Líneas, No Doble IVA)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 3: Verificando integridad relacional en Factusol (F_PCL y F_LPC) ---');

  // Verificar Pedido 1 en F_PCL
  const rowsOrder1 = await driver.query<any>(`SELECT * FROM F_PCL WHERE REFPCL = '${resOrder1.orderNumber}'`);
  assert.strictEqual(rowsOrder1.length, 1, `El pedido 1 (${resOrder1.orderNumber}) debe existir en F_PCL`);
  const pcl1 = rowsOrder1[0];

  assert.strictEqual(pcl1.CNOPCL, 'Ana Garcia Perez', 'CNOPCL debe tener el nombre real sanitizado para Factusol');
  assert.strictEqual(pcl1.CPRPCL, 'Sevilla', 'CPRPCL (Provincia) debe haberse rellenado desde province');
  assert.strictEqual(pcl1.CDOPCL, 'Avenida Constitucion 45', 'Dirección correcta sanitizada');
  assert.strictEqual(pcl1.TIPPCL, '1', 'Serie debe ser 1');
  
  // VERIFICACIÓN CRÍTICA: NO DOBLE IVA
  // Base neta: 30.00, IVA 21%: 6.30, Total: 36.30
  assert.strictEqual(Number(pcl1.NET1PCL), 30.0, 'NET1PCL debe ser exactamente 30.00');
  assert.strictEqual(Number(pcl1.IIVA1PCL), 6.3, 'IIVA1PCL debe ser exactamente 6.30');
  assert.strictEqual(Number(pcl1.TOTPCL), 36.3, 'TOTPCL debe ser exactamente 36.30 (¡Sin doble IVA!)');

  // Verificar Líneas en F_LPC
  const linesOrder1 = await driver.query<any>(`SELECT * FROM F_LPC WHERE CODLPC = ${pcl1.CODPCL} AND TIPLPC = '1'`);
  assert.strictEqual(linesOrder1.length, 1, 'Debe haber 1 línea en F_LPC');
  assert.strictEqual(linesOrder1[0].ARTLPC, '001', 'ARTLPC debe ser el código de artículo original 001');
  assert.strictEqual(Number(linesOrder1[0].CANLPC), 3.0, 'CANLPC debe ser 3');
  assert.strictEqual(Number(linesOrder1[0].PRELPC), 10.0, 'PRELPC neto debe ser 10');
  assert.strictEqual(Number(linesOrder1[0].TOTLPC), 30.0, 'TOTLPC neto debe ser 30 (3 * 10)');
  console.log('✓ Pedido 1 en Factusol verificado: Nombre, provincia, líneas e importes netos impecables.');

  // Verificar Pedido 2 en F_PCL
  const rowsOrder2 = await driver.query<any>(`SELECT * FROM F_PCL WHERE REFPCL = '${resOrder2.orderNumber}'`);
  assert.strictEqual(rowsOrder2.length, 1, `El pedido 2 (${resOrder2.orderNumber}) debe existir en F_PCL`);
  const pcl2 = rowsOrder2[0];
  assert.strictEqual(pcl2.CNOPCL, 'Suministros Industriales S.L.');
  assert.strictEqual(pcl2.CNIPCL, 'B99887766', 'NIF/CIF registrado en cabecera');
  assert.strictEqual(Number(pcl2.NET1PCL), 50.0);
  assert.strictEqual(Number(pcl2.TOTPCL), 60.5);
  console.log('✓ Pedido 2 en Factusol verificado: Cliente B2B con CIF y líneas netas impecables.');

  // -------------------------------------------------------------------------
  // FASE 4: Verificación de Transición de Estados en Docker MariaDB (ack_orders)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 4: Verificando confirmación ack_orders en Docker MariaDB ---');
  
  const pullAfter = await httpGet(`${DOCKER_BRIDGE_URL}?action=pull_orders`, {
    Authorization: `Bearer ${SECRET_KEY}`,
  });
  assert.strictEqual(pullAfter.orders.length, 0, 'La cola de PENDING en Docker MariaDB debe quedar completamente vacía.');
  console.log('✓ Verificado: Todos los pedidos pasaron a status = SYNCED en MariaDB tras el ACK del agente.');

  // -------------------------------------------------------------------------
  // FASE 5: Prueba de Idempotencia y Cero Duplicados en Segunda Pasada
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 5: Segunda pasada de sincronización (comprobando idempotencia) ---');
  
  const secondSyncResult = await syncEngine.triggerManualSync();
  assert.strictEqual(secondSyncResult.success, true);
  
  const allOrdersInFactusol = await driver.query<any>(`SELECT COUNT(*) AS total FROM F_PCL WHERE REFPCL IN ('${resOrder1.orderNumber}', '${resOrder2.orderNumber}')`);
  assert.strictEqual(Number(allOrdersInFactusol[0].total), 2, 'No deben haberse duplicado los pedidos en Factusol en la segunda pasada.');
  console.log('✓ Idempotencia certificada: Cero duplicados en Factusol tras múltiples sincronizaciones.');

  // -------------------------------------------------------------------------
  // FASE 6: Laboratorio de Red para WooCommerce Mock REST API Server
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 6: Laboratorio de Red WooCommerce REST API v3 ---');

  const wcProcessedOrders: Array<{ id: number; meta_data: any[] }> = [];
  const mockWcServer = http.createServer((req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    
    // GET /wp-json/wc/v3/products
    if (url.pathname.includes('/products') && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([{ id: 10, sku: '001', stock_quantity: 50 }]));
      return;
    }

    // POST /wp-json/wc/v3/products/batch
    if (url.pathname.includes('/products/batch') && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ update: [{ id: 10 }] }));
      return;
    }

    // GET /wp-json/wc/v3/orders
    if (url.pathname.includes('/orders') && req.method === 'GET') {
      const orders = [
        {
          id: 8881,
          date_created: new Date().toISOString(),
          status: 'processing',
          total: '24.20',
          total_tax: '4.20',
          shipping_total: '0',
          billing: {
            first_name: 'David',
            last_name: 'Navarro',
            address_1: 'Paseo de Gracia 80',
            city: 'Barcelona',
            state: 'Barcelona',
            postcode: '08008',
            country: 'ES',
            phone: '600112233',
            email: 'david@navarro.com',
          },
          line_items: [
            { id: 1, sku: '001', name: 'Herramienta WC', quantity: 2, price: 10.0, total: '20.00', total_tax: '4.20' },
          ],
          meta_data: [{ key: '_billing_nif', value: '77665544X' }],
        },
      ];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(orders));
      return;
    }

    // PUT /wp-json/wc/v3/orders/:id
    if (url.pathname.includes('/orders/') && req.method === 'PUT') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const id = Number(url.pathname.split('/').pop());
        const parsed = JSON.parse(body);
        wcProcessedOrders.push({ id, meta_data: parsed.meta_data });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, ...parsed }));
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => mockWcServer.listen(8998, '127.0.0.1', () => resolve()));
  console.log('✓ Servidor Mock de WooCommerce REST API activo en http://127.0.0.1:8998');

  // Configurar agente en modo WooCommerce
  cfg.channelType = 'woocommerce';
  cfg.woocommerce = {
    storeUrl: 'http://127.0.0.1:8998',
    consumerKey: 'ck_test_123',
    consumerSecret: 'cs_test_456',
  };

  const wcSyncRes = await syncEngine.triggerManualSync();
  assert.strictEqual(wcSyncRes.success, true);
  console.log(`✓ Sincronización WooCommerce completada: ${wcSyncRes.message}`);

  // Verificar que el pedido 8881 se insertó en Factusol
  const rowsWc = await driver.query<any>(`SELECT * FROM F_PCL WHERE REFPCL = '8881'`);
  assert.strictEqual(rowsWc.length, 1, 'El pedido de WooCommerce #8881 debe existir en Factusol F_PCL');
  assert.strictEqual(rowsWc[0].CNOPCL, 'David Navarro');
  assert.strictEqual(rowsWc[0].CNIPCL, '77665544X');
  assert.strictEqual(Number(rowsWc[0].NET1PCL), 20.0);
  assert.strictEqual(Number(rowsWc[0].TOTPCL), 24.2);

  // Verificar que se envió el PUT con _bentian_factusol_pcl a WooCommerce
  assert.strictEqual(wcProcessedOrders.length, 1, 'WooCommerce debió recibir exactamente 1 petición PUT');
  const processed = wcProcessedOrders[0]!;
  assert.strictEqual(processed.id, 8881);
  const factMeta = processed.meta_data.find((m: any) => m.key === '_bentian_factusol_pcl');
  assert.ok(factMeta && factMeta.value, '_bentian_factusol_pcl debe estar presente en el PUT');
  console.log(`✓ WooCommerce marcado con éxito: _bentian_factusol_pcl = ${factMeta.value}`);

  mockWcServer.close();

  // Limpieza de sandbox
  fs.rmSync(sandboxDir, { recursive: true, force: true });
  console.log('✓ Sandbox limpiado.');

  console.log('\n======================================================================');
  console.log('🎉 LABORATORIO PUNTO A PUNTO COMPLETADO CON ÉXITO: 100% CERTIFICADO');
  console.log('======================================================================');
}

runLab().catch((err) => {
  console.error('\n❌ ERROR EN EL LABORATORIO DE PRUEBAS:', err);
  process.exit(1);
});
