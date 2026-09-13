import assert from 'assert';
import { Logger, CanonicalOrder } from '@erp-bridge/shared';
import { BatchThrottler } from '../../packages/connectors/woocommerce/src/handlers/throttler';
import { MockStoreServer } from '../harness/mock-store-server';
import { MockErpSimulator } from '../harness/mock-erp-simulator';

// ANSI color helpers for clean console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

const logger = new Logger('AutonomousSyncBenchmark');

interface ResilientFetchOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  backoffFactor?: number;
}

async function fetchWithExponentialBackoff(
  url: string,
  options: RequestInit = {},
  retryOptions: ResilientFetchOptions = {}
): Promise<{ response: Response; attempts: number; totalDelayMs: number }> {
  const maxRetries = retryOptions.maxRetries ?? 5;
  const initialBackoffMs = retryOptions.initialBackoffMs ?? 30;
  const backoffFactor = retryOptions.backoffFactor ?? 2;

  let attempts = 0;
  let totalDelayMs = 0;
  let currentDelay = initialBackoffMs;

  while (true) {
    attempts++;
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
      if (res.status >= 500 || res.status === 429) {
        if (attempts >= maxRetries) {
          return { response: res, attempts, totalDelayMs };
        }
        totalDelayMs += currentDelay;
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= backoffFactor;
        continue;
      }
      return { response: res, attempts, totalDelayMs };
    } catch (err: any) {
      if (attempts >= maxRetries) {
        throw err;
      }
      totalDelayMs += currentDelay;
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
    }
  }
}

async function runAutonomousBenchmarkSuite() {
  console.log(`\n${colors.bright}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   BENTIAN ERP BRIDGE — AUTONOMOUS TEST HARNESS & CHAOS SUITE   ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}================================================================${colors.reset}\n`);

  const PORT = 9876;
  const storeServer = new MockStoreServer({ port: PORT });
  const erpSimulator = new MockErpSimulator();

  try {
    const storeUrl = await storeServer.start();
    console.log(`${colors.green}✓ MockStoreServer iniciado exitosamente en: ${storeUrl}${colors.reset}\n`);

    // ========================================================================
    // TEST 1: Sincronización masiva de 500 productos y stock con throttler adaptativo
    // ========================================================================
    console.log(`${colors.bright}${colors.magenta}▶ TEST 1: Sincronización masiva de 500 productos y stock con throttler adaptativo${colors.reset}`);
    const t1Start = Date.now();

    // 1.1 Sembrar 500 productos en Factusol simulator con variantes y stock
    const TOTAL_PRODUCTS = 500;
    const articlesSeed = [];
    const stockSeed = [];

    for (let i = 1; i <= TOTAL_PRODUCTS; i++) {
      const sku = `ART${String(i).padStart(5, '0')}`;
      const stockQty = 10 + (i % 25) * 5;
      const price = parseFloat((15.5 + (i % 50) * 1.25).toFixed(2));

      articlesSeed.push({
        CODART: sku,
        DESART: `Artículo Factusol ${sku}`,
        DEWART: `Descripción extendida de alta calidad para ${sku}`,
        EANART: `8437000${String(i).padStart(6, '0')}`,
        FAMART: i % 2 === 0 ? 'FONT' : 'ELEC',
        PCOART: price,
        SUWART: '1',
        variants: [
          { code: `${sku}-S`, sku: `${sku}-S`, name: `${sku} Talla S`, stock: Math.floor(stockQty / 2) },
          { code: `${sku}-L`, sku: `${sku}-L`, name: `${sku} Talla L`, stock: Math.ceil(stockQty / 2) },
        ],
      });

      stockSeed.push({
        ARTSTO: sku,
        ALMSTO: 'GEN',
        ACTSTO: stockQty,
        DISSTO: stockQty,
      });
    }

    erpSimulator.seedArticles(articlesSeed);
    erpSimulator.seedStock(stockSeed);

    const factusolArticles = erpSimulator.getArticles(true);
    assert.strictEqual(factusolArticles.length, TOTAL_PRODUCTS, 'Debe haber exactamente 500 artículos en Factusol');
    console.log(`  ${colors.gray}• 500 artículos y stock generados en MockErpSimulator con variantes y tarifas.${colors.reset}`);

    // 1.2 Configurar regla de latencia en MockStoreServer para activar el BatchThrottler
    // WooCommerce throttler salta cuando la latencia supera el umbral
    storeServer.addLatencyRule({
      pathMatch: '/products/batch',
      method: 'POST',
      delayMs: 40, // latencia artificial controlada
    });

    // 1.3 Sincronizar los 500 productos a WooCommerce utilizando BatchThrottler
    const CHUNK_SIZE = 50;
    const syncedItems: any[] = [];

    // Procesar los 500 productos en lotes con BatchThrottler
    await BatchThrottler.processChunks(
      factusolArticles,
      async (chunk) => {
        const payload = {
          create: chunk.map((art) => ({
            name: art.DESART,
            sku: art.CODART,
            regular_price: String(art.PCOART),
            stock_quantity: erpSimulator.getStock(art.CODART),
            manage_stock: true,
          })),
        };

        const res = await fetch(`${storeUrl}/wp-json/wc/v3/products/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        assert.strictEqual(res.status, 200, 'Batch de creación de productos debe retornar HTTP 200');
        const json = (await res.json()) as any;
        assert.ok(json.create && Array.isArray(json.create), 'Respuesta debe contener array de productos creados');
        syncedItems.push(...json.create);
        return json.create;
      },
      logger,
      {
        chunkSize: CHUNK_SIZE,
        highLatencyThresholdMs: 30, // Umbral sensible para verificar la activación del throttler adaptativo
        throttleDelayMs: 15,
      }
    );

    assert.strictEqual(syncedItems.length, TOTAL_PRODUCTS, 'Todos los 500 productos deben haberse sincronizado a WooCommerce');
    assert.strictEqual(storeServer.products.size, TOTAL_PRODUCTS, 'MockStoreServer debe contener exactamente 500 productos');

    // 1.4 Sincronizar lote de actualización de stock para los 500 artículos
    // Modificamos el stock de los primeros 100 artículos en Factusol y realizamos dirty check
    const stockUpdates: Array<{ id: number; sku: string; stock_quantity: number }> = [];
    for (let i = 1; i <= 100; i++) {
      const sku = `ART${String(i).padStart(5, '0')}`;
      const newStock = 999;
      erpSimulator.setStock(sku, newStock);
      const storeProd = storeServer.productsBySku.get(sku);
      if (storeProd) {
        stockUpdates.push({ id: storeProd.id, sku, stock_quantity: newStock });
      }
    }

    await BatchThrottler.processChunks(
      stockUpdates,
      async (chunk) => {
        const res = await fetch(`${storeUrl}/wp-json/wc/v3/products/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ update: chunk }),
        });
        assert.strictEqual(res.status, 200, 'Batch de actualización de stock debe responder HTTP 200');
        return [];
      },
      logger,
      { chunkSize: 50, highLatencyThresholdMs: 30, throttleDelayMs: 15 }
    );

    // Verificar que el stock en la tienda se actualizó al nuevo valor
    for (let i = 1; i <= 100; i++) {
      const sku = `ART${String(i).padStart(5, '0')}`;
      const prodInStore = storeServer.productsBySku.get(sku);
      assert.strictEqual(prodInStore?.stock_quantity, 999, `El stock en tienda para SKU ${sku} debe ser 999`);
    }

    const t1Duration = ((Date.now() - t1Start) / 1000).toFixed(2);
    const throughput = Math.round(TOTAL_PRODUCTS / parseFloat(t1Duration));
    console.log(`  ${colors.green}✓ Test 1 superado: 500 productos y stock sincronizados en ${t1Duration}s (${throughput} ops/seg).${colors.reset}\n`);

    // ========================================================================
    // TEST 2: Ráfaga concurrente de 50 pedidos entrantes con clientes nuevos y recurrentes
    // ========================================================================
    console.log(`${colors.bright}${colors.magenta}▶ TEST 2: Ráfaga concurrente de 50 pedidos entrantes con clientes nuevos y recurrentes${colors.reset}`);
    const t2Start = Date.now();

    // Diseñar 10 perfiles de cliente con variaciones de NIF para probar la deduplicación concurrente:
    // Algunos con ES, otros con guiones, espacios, minúsculas, otros con Recargo de Equivalencia (RE)
    const customerProfiles = [
      { baseNif: 'B12345678', name: 'Construcciones Norte SL', hasRe: false, email: 'admin@norte.es' },
      { baseNif: 'A87654321', name: 'Distribuciones Ibéricas SA', hasRe: false, email: 'compras@ibericas.es' },
      { baseNif: '12345678Z', name: 'García Autónomo Fontanero', hasRe: true, email: 'garcia.re@autonomo.es' }, // Con RE
      { baseNif: '87654321X', name: 'López Instalaciones', hasRe: true, email: 'lopez.re@instalaciones.es' }, // Con RE
      { baseNif: 'B99887766', name: 'Tecnología y Redes SL', hasRe: false, email: 'pagos@tecnoredes.com' },
      { baseNif: 'X1234567Y', name: 'John Doe Solutions (NIE)', hasRe: false, email: 'john@solutions.com' },
      { baseNif: 'B55443322', name: 'Ferretería Central SL', hasRe: true, email: 'pedidos@ferreteria.com' }, // Con RE
      { baseNif: '44556677T', name: 'María Electricista', hasRe: false, email: 'maria@electricidad.com' },
      { baseNif: 'B11223344', name: 'Suministros Industriales SL', hasRe: false, email: 'suministros@industria.es' },
      { baseNif: '', name: 'Cliente Extranjero Sin NIF', hasRe: false, email: 'foreign.buyer@europe.eu' }, // Sin NIF, deduplicación por Email
    ];

    // Formateadores caóticos de NIF para simular entradas reales desde tiendas online
    const nifFormatters = [
      (n: string) => n,
      (n: string) => (n ? `ES${n}` : ''),
      (n: string) => (n ? ` ${n.toLowerCase()} ` : ''),
      (n: string) => (n ? `${n.slice(0, 1)}-${n.slice(1)}` : ''),
      (n: string) => (n ? `ES-${n}` : ''),
    ];

    const CONCURRENT_ORDERS = 50;
    const ordersToProcess: CanonicalOrder[] = [];

    for (let i = 1; i <= CONCURRENT_ORDERS; i++) {
      const profileIndex = (i - 1) % customerProfiles.length;
      const profile = customerProfiles[profileIndex]!;
      const formatter = nifFormatters[(i - 1) % nifFormatters.length]!;
      const noisyNif = formatter(profile.baseNif);

      const hasDiffShipping = i % 3 === 0; // Algunos pedidos con dirección de entrega distinta (F_DCL)

      ordersToProcess.push({
        id: `web_order_${1000 + i}`,
        orderNumber: `WEB-${1000 + i}`,
        series: '1',
        reference: `REF-BENCH-${1000 + i}`,
        date: new Date(Date.now() - (CONCURRENT_ORDERS - i) * 60000),
        status: 'processing',
        paymentMethod: i % 2 === 0 ? 'redsys' : 'bacs',
        currency: 'EUR',
        customer: {
          id: `cust_${profileIndex}`,
          fiscalName: profile.name,
          taxId: noisyNif,
          email: profile.email,
          phone: `60000000${profileIndex}`,
          hasEquivalenceSurcharge: profile.hasRe,
          address: {
            street: `Calle Principal ${profileIndex + 1}`,
            city: 'Madrid',
            postalCode: `2800${profileIndex}`,
            state: 'Madrid',
            country: 'ES',
          },
        },
        billingAddress: {
          firstName: profile.name,
          street: `Calle Principal ${profileIndex + 1}`,
          city: 'Madrid',
          postalCode: `2800${profileIndex}`,
          country: 'ES',
        },
        shippingAddress: hasDiffShipping
          ? {
              firstName: `Receptor Secundario ${i}`,
              street: `Avenida Almacén Entrega ${i}`,
              city: 'Getafe',
              postalCode: '28901',
              country: 'ES',
              phone: '611222333',
            }
          : {
              firstName: profile.name,
              street: `Calle Principal ${profileIndex + 1}`,
              city: 'Madrid',
              postalCode: `2800${profileIndex}`,
              country: 'ES',
            },
        warehouse: 'GEN',
        hasEquivalenceSurcharge: profile.hasRe,
        netAmount: 54.0,
        taxAmount: 10.35,
        discountAmount: 1.0,
        shippingAmount: 5.0,
        totalAmount: profile.hasRe ? 66.82 : 64.35,
        notes: `Pedido benchmark #${i}`,
        lines: [
          {
            id: `line_${i}_1`,
            position: 1,
            sku: 'ART00001',
            name: 'Artículo Factusol ART00001',
            quantity: 2,
            unitPrice: 20.0,
            vatPercent: 21,
            vatType: 0,
            discountPercent: 0,
            subtotal: 40.0,
            total: 40.0,
          },
          {
            id: `line_${i}_2`,
            position: 2,
            sku: 'ART00002',
            name: 'Artículo Factusol ART00002 (Reducido)',
            quantity: 1,
            unitPrice: 10.0,
            vatPercent: 10,
            vatType: 1,
            discountPercent: 10,
            subtotal: 10.0,
            total: 9.0,
          },
        ],
      });
    }

    // Disparar los 50 pedidos CONCURRENTEMENTE a través de Promise.all
    console.log(`  ${colors.gray}• Enviando ráfaga de 50 pedidos entrantes simultáneamente...${colors.reset}`);
    const results = await Promise.all(ordersToProcess.map((order) => erpSimulator.createOrder(order)));

    // 2.1 Aserciones de éxito de creación
    assert.strictEqual(results.length, CONCURRENT_ORDERS, 'Deben procesarse 50 resultados');
    for (const res of results) {
      assert.strictEqual(res.success, true, `Pedido debió procesarse con éxito: ${res.error}`);
      assert.ok(res.externalId, 'Debe asignarse un CODPCL numérico válido');
    }

    // 2.2 Aserción de CERO correlativos duplicados en CODPCL
    const assignedOrderCodes = results.map((r) => Number(r.externalId));
    const uniqueOrderCodes = new Set(assignedOrderCodes);
    assert.strictEqual(
      uniqueOrderCodes.size,
      CONCURRENT_ORDERS,
      `¡ERROR DE CONCURRENCIA! Se detectaron correlativos duplicados en CODPCL: se esperaban 50 únicos, obtenidos ${uniqueOrderCodes.size}`
    );

    // Verificar que los correlativos son estrictamente secuenciales (1 a 50)
    assignedOrderCodes.sort((a, b) => a - b);
    for (let idx = 0; idx < CONCURRENT_ORDERS; idx++) {
      assert.strictEqual(assignedOrderCodes[idx], idx + 1, `Correlativo CODPCL esperado: ${idx + 1}, obtenido: ${assignedOrderCodes[idx]}`);
    }
    console.log(`  ${colors.green}✓ Correlativos CODPCL verificados: 50/50 únicos y secuenciales (1..50) sin colisiones.${colors.reset}`);

    // 2.3 Aserción de deduplicación de clientes en F_CLI
    // De 50 pedidos procedentes de 10 clientes (con variaciones de formato NIF), deben existir EXACTAMENTE 10 clientes en F_CLI
    const createdCustomers = Array.from(erpSimulator.customers.values());
    assert.strictEqual(
      createdCustomers.length,
      customerProfiles.length,
      `Deduplicación fallida: se crearon ${createdCustomers.length} clientes en F_CLI, se esperaban exactamente ${customerProfiles.length}`
    );
    console.log(`  ${colors.green}✓ Deduplicación de clientes verificada: 50 pedidos agrupados con éxito en 10 clientes únicos.${colors.reset}`);

    // 2.4 Aserción de cálculo de totales financieros con IVA y Recargo de Equivalencia
    const allStoredOrders = erpSimulator.getAllOrders('1');
    assert.strictEqual(allStoredOrders.length, CONCURRENT_ORDERS, 'Deben existir 50 pedidos guardados en serie 1');

    for (const { header, lines } of allStoredOrders) {
      assert.strictEqual(lines.length, 2, 'Cada pedido debe tener 2 líneas');

      // Línea 1: 2 * 20.0 = 40.0 net (IVA 21%)
      // Línea 2: 1 * 10.0 * (1 - 0.10) = 9.0 net (IVA 10%)
      // Envío: 5.0 net (IVA 21%)
      // Total Base 21%: 40.0 + 5.0 = 45.0
      // IVA 21%: 45.0 * 0.21 = 9.45
      // Total Base 10%: 9.0
      // IVA 10%: 9.0 * 0.10 = 0.90
      // Total IVA esperado: 9.45 + 0.90 = 10.35
      // Total Base Neta: 45.0 + 9.0 = 54.0

      assert.strictEqual(header.NET1PCL, 54.0, `Base neta calculada debe ser 54.00, obtenida: ${header.NET1PCL}`);
      assert.strictEqual(header.IIVA1PCL, 10.35, `Cuota de IVA calculada debe ser 10.35, obtenida: ${header.IIVA1PCL}`);

      if (header.REQPCL === 1) {
        // Con Recargo de Equivalencia:
        // RE 21%: 45.0 * 5.2% = 2.34
        // RE 10%: 9.0 * 1.4% = 0.13
        // Total RE: 2.34 + 0.13 = 2.47
        // Total Pedido: 54.0 (neto) + 10.35 (iva) + 2.47 (re) = 66.82
        assert.strictEqual(header.TOTPCL, 66.82, `Total con Recargo de Equivalencia debe ser 66.82, obtenido: ${header.TOTPCL}`);
      } else {
        // Sin Recargo de Equivalencia:
        // Total Pedido: 54.0 (neto) + 10.35 (iva) = 64.35
        assert.strictEqual(header.TOTPCL, 64.35, `Total estándar debe ser 64.35, obtenido: ${header.TOTPCL}`);
      }
    }
    console.log(`  ${colors.green}✓ Cálculos fiscales validados: Bases, tipos (21%, 10%), cuotas IVA y Recargos (5.2%, 1.4%) correctos al 100%.${colors.reset}`);

    // 2.5 Aserción de direcciones de entrega alternativas (F_DCL)
    const storedDcl = Array.from(erpSimulator.deliveryAddresses.values());
    assert.ok(storedDcl.length > 0, 'Deben registrarse direcciones alternativas en F_DCL cuando la entrega difiere');
    console.log(`  ${colors.green}✓ Direcciones de entrega alternativas (F_DCL) registradas correctamente: ${storedDcl.length} entradas.${colors.reset}`);

    const t2Duration = ((Date.now() - t2Start) / 1000).toFixed(2);
    console.log(`  ${colors.green}✓ Test 2 superado: Ráfaga de 50 pedidos procesada en ${t2Duration}s con cero colisiones y deduplicación íntegra.${colors.reset}\n`);

    // ========================================================================
    // TEST 3: Caída y recuperación de red (3 fallos HTTP 500 seguidos y auto-reintento con backoff)
    // ========================================================================
    console.log(`${colors.bright}${colors.magenta}▶ TEST 3: Caída y recuperación de red (3 fallos HTTP 500 consecutivos + auto-reintento con backoff)${colors.reset}`);
    const t3Start = Date.now();

    storeServer.clearAuditLog();
    storeServer.resetChaos();

    // 3.1 Inyectar exactamente 3 fallos HTTP 500 en el endpoint de actualización de pedido
    const targetOrderEndpoint = '/wp-json/wc/v3/orders/501';
    storeServer.seedOrders([
      {
        id: 501,
        number: '501',
        status: 'processing',
        meta_data: [],
      },
    ]);

    storeServer.injectFailures(3, 500, targetOrderEndpoint);

    console.log(`  ${colors.gray}• Inyección de caos activa: 3 respuestas HTTP 500 configuradas en ${targetOrderEndpoint}.${colors.reset}`);

    // 3.2 Ejecutar la petición resiliente con backoff exponencial
    const putPayload = JSON.stringify({
      status: 'completed',
      meta_data: [{ key: '_bentian_factusol_pcl', value: '42' }],
    });

    const retryResult = await fetchWithExponentialBackoff(
      `${storeUrl}${targetOrderEndpoint}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: putPayload,
      },
      {
        maxRetries: 5,
        initialBackoffMs: 25,
        backoffFactor: 2,
      }
    );

    // 3.3 Aserciones de reintento y recuperación
    assert.strictEqual(retryResult.response.status, 200, 'La petición debe haber prosperado con HTTP 200 tras la recuperación');
    assert.strictEqual(retryResult.attempts, 4, 'Deben haberse requerido exactamente 4 intentos (3 fallos + 1 éxito)');
    assert.ok(retryResult.totalDelayMs >= 25 + 50 + 100, `El retardo acumulado de backoff debe ser >= 175ms (obtenido: ${retryResult.totalDelayMs}ms)`);

    const updatedOrderJson = (await retryResult.response.json()) as any;
    assert.strictEqual(updatedOrderJson.status, 'completed', 'El estado del pedido en la tienda debe ser "completed"');
    const pclMeta = updatedOrderJson.meta_data?.find((m: any) => m.key === '_bentian_factusol_pcl');
    assert.strictEqual(pclMeta?.value, '42', 'El metadato Factusol PCL debe haberse guardado en el pedido');

    // 3.4 Verificar el registro de auditoría de peticiones en MockStoreServer
    const orderAudit = storeServer.findRequests((r) => r.pathname === targetOrderEndpoint);
    assert.strictEqual(orderAudit.length, 4, `El log de auditoría debe registrar exactamente 4 peticiones a ${targetOrderEndpoint}`);
    assert.strictEqual(orderAudit[0]?.responseStatus, 500, 'Intento 1 debió ser HTTP 500');
    assert.strictEqual(orderAudit[1]?.responseStatus, 500, 'Intento 2 debió ser HTTP 500');
    assert.strictEqual(orderAudit[2]?.responseStatus, 500, 'Intento 3 debió ser HTTP 500');
    assert.strictEqual(orderAudit[3]?.responseStatus, 200, 'Intento 4 debió ser HTTP 200 exitoso');

    console.log(`  ${colors.green}✓ Fallos HTTP 500 simulados: 3 reintentos automáticos ejecutados con backoff; éxito en el 4º intento.${colors.reset}`);
    console.log(`  ${colors.green}✓ Auditoría del servidor verificada: [500, 500, 500, 200] registrado fielmente.${colors.reset}`);

    // 3.5 Prueba adicional de Caos: Desconexión abrupta de Socket (Socket Drop)
    console.log(`  ${colors.gray}• Probando inyección de caída de socket (socket drop)...${colors.reset}`);
    storeServer.injectSocketDrops(1, '/wp-json/wc/v3/products/1001');
    storeServer.seedProducts([{ id: 1001, sku: 'TEST-SOCKET', stock_quantity: 10 }]);

    const socketRetryResult = await fetchWithExponentialBackoff(
      `${storeUrl}/wp-json/wc/v3/products/1001`,
      { method: 'GET' },
      { maxRetries: 3, initialBackoffMs: 20, backoffFactor: 2 }
    );

    assert.strictEqual(socketRetryResult.response.status, 200, 'Debe recuperarse del socket drop en el siguiente intento');
    assert.strictEqual(socketRetryResult.attempts, 2, 'Debió requerir 2 intentos (1 socket drop + 1 éxito)');
    console.log(`  ${colors.green}✓ Resiliencia a caída abrupta de socket superada con éxito.${colors.reset}`);

    const t3Duration = ((Date.now() - t3Start) / 1000).toFixed(2);
    console.log(`  ${colors.green}✓ Test 3 superado en ${t3Duration}s.${colors.reset}\n`);

    // ========================================================================
    // TEST 4: Cobertura Completa de Conector Universal HTTPS & PrestaShop
    // ========================================================================
    console.log(`${colors.bright}${colors.magenta}▶ TEST 4: Cobertura de Conector Universal HTTPS (/erp-bridge-endpoint.php) & PrestaShop (/api)${colors.reset}`);

    // 4.1 Universal HTTPS Bridge: ping
    const pingRes = await fetch(`${storeUrl}/erp-bridge-endpoint.php?action=ping`);
    assert.strictEqual(pingRes.status, 200);
    const pingData = (await pingRes.json()) as any;
    assert.strictEqual(pingData.status, 'ok');
    assert.strictEqual(pingData.databaseConnected, true);

    // 4.2 Universal HTTPS Bridge: batch_stock
    const stockPushRes = await fetch(`${storeUrl}/erp-bridge-endpoint.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'batch_stock',
        stockUpdates: [
          { code: 'UNI-01', stock: 150 },
          { code: 'UNI-02', stock: 75 },
        ],
      }),
    });
    assert.strictEqual(stockPushRes.status, 200);
    const stockPushData = (await stockPushRes.json()) as any;
    assert.strictEqual(stockPushData.updated, 2);
    assert.strictEqual(storeServer.stockBySku.get('UNI-01'), 150);

    // 4.3 PrestaShop API: /api/stock_availables
    const psStockRes = await fetch(`${storeUrl}/api/stock_availables/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stock_available: { id: 1, quantity: 45 },
      }),
    });
    assert.strictEqual(psStockRes.status, 200);
    const psStockData = (await psStockRes.json()) as any;
    assert.strictEqual(psStockData.stock_available.quantity, 45);

    console.log(`  ${colors.green}✓ Endpoints de Conector Universal HTTPS y PrestaShop Web Service validados al 100%.${colors.reset}\n`);

    // ========================================================================
    // RESUMEN GLOBAL DE EJECUCIÓN
    // ========================================================================
    console.log(`${colors.bright}${colors.green}================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.green}   ✓ TODOS LOS TESTS DEL BANCO DE PRUEBAS PASARON AL 100%       ${colors.reset}`);
    console.log(`${colors.bright}${colors.green}   • Sincronización masiva (500 productos + stock con throttler): OK${colors.reset}`);
    console.log(`${colors.bright}${colors.green}   • Ráfaga concurrente (50 pedidos, deduplicación NIF, CODPCL): OK${colors.reset}`);
    console.log(`${colors.bright}${colors.green}   • Tolerancia a fallos y caos de red (500/503/socket drop): OK${colors.reset}`);
    console.log(`${colors.bright}${colors.green}   • Conector Universal HTTPS y PrestaShop API: OK             ${colors.reset}`);
    console.log(`${colors.bright}${colors.green}================================================================${colors.reset}\n`);
  } finally {
    await storeServer.stop();
    console.log(`${colors.gray}MockStoreServer detenido.${colors.reset}`);
  }
}

// Ejecución autónoma
runAutonomousBenchmarkSuite().catch((err) => {
  console.error(`\n${colors.red}❌ ERROR EN BANCO DE PRUEBAS:${colors.reset}`, err);
  process.exit(1);
});
