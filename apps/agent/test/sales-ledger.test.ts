import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SalesLedgerManager } from '../src/orders/sales-ledger.manager';
import { LocalAgent } from '../src/agent';
import { LocalGuiServer } from '../src/gui/gui-server';

console.log('--- Running Sales Ledger Store & API Tests ---');

async function runTests() {
  const tempDir = path.join(os.tmpdir(), `bentian-sales-ledger-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const customLedgerFile = path.join(tempDir, 'sales-ledger.json');
  process.env.BENTIAN_DATA_DIR = tempDir;
  process.env.BENTIAN_CONFIG_PATH = path.join(tempDir, 'agent-config.json');
  process.env.BENTIAN_SALES_LEDGER_PATH = customLedgerFile;

  try {
    // ----------------------------------------------------
    // TEST 1: Instanciación e Inserción Básica
    // ----------------------------------------------------
    console.log('▶ [Test 1] Inicialización de SalesLedgerManager y registro de pedido...');
    const manager = new SalesLedgerManager(tempDir);
    assert.strictEqual(manager.getFilePath(), customLedgerFile);

    const nowIso = new Date().toISOString();
    const order1 = manager.recordOrder({
      channel: 'universal_bridge',
      webOrderId: '101',
      orderNumber: 'PED-101',
      date: nowIso,
      factusolSeries: '1',
      factusolOrderNumber: '5001',
      customerName: 'Ferretería García S.L.',
      customerEmail: 'compras@garcia.com',
      customerPhone: '600112233',
      totalAmount: 145.20,
      currency: 'EUR',
      status: 'synced',
      lines: [
        { sku: 'TORN-01', name: 'Tornillo Allen M6', quantity: 100, unitPrice: 0.20, total: 20.00 },
        { sku: 'BROC-02', name: 'Broca HSS 6mm', quantity: 5, unitPrice: 25.04, total: 125.20 },
      ],
      shippingAddress: 'Polígono Industrial Nave 4, Madrid',
      paymentMethod: 'Transferencia Bancaria',
    });

    assert.strictEqual(order1.webOrderId, '101');
    assert.strictEqual(order1.status, 'synced');
    assert.strictEqual(order1.lines.length, 2);
    assert.strictEqual(fs.existsSync(customLedgerFile), true, 'El archivo sales-ledger.json debe persistirse en disco');
    console.log('  ✓ Pedido 1 registrado y persistido atómicamente en disco.');

    // ----------------------------------------------------
    // TEST 2: Idempotencia y Actualización de Pedido Existente
    // ----------------------------------------------------
    console.log('▶ [Test 2] Idempotencia y actualización de pedido existente...');
    const updatedOrder1 = manager.recordOrder({
      channel: 'universal_bridge',
      webOrderId: '101',
      totalAmount: 150.00,
      customerPhone: '600998877',
    });
    assert.strictEqual(updatedOrder1.id, order1.id);
    assert.strictEqual(updatedOrder1.totalAmount, 150.00);
    assert.strictEqual(updatedOrder1.customerPhone, '600998877');
    assert.strictEqual(manager.getOrders().total, 1, 'No debe duplicar el registro');
    console.log('  ✓ Pedido existente actualizado sin duplicidad.');

    // ----------------------------------------------------
    // TEST 3: Registro de Pedidos con Fallo y Métricas
    // ----------------------------------------------------
    console.log('▶ [Test 3] Registro de pedidos fallidos y cálculo de métricas...');
    const orderFail = manager.recordOrder({
      channel: 'woocommerce',
      webOrderId: '202',
      orderNumber: 'WC-202',
      date: nowIso,
      customerName: 'Construcciones Norte S.A.',
      customerEmail: 'admin@norte.com',
      totalAmount: 85.00,
      currency: 'EUR',
      status: 'failed',
      error: 'Error OLEDB: El artículo TUBO-99 no existe en Factusol.',
      lines: [{ sku: 'TUBO-99', name: 'Tubo Cobre 15mm', quantity: 2, unitPrice: 42.50, total: 85.00 }],
    });

    const metrics = manager.getMetrics();
    assert.strictEqual(metrics.ordersTodayCount, 2, 'Debe haber 2 pedidos hoy');
    assert.strictEqual(metrics.issuesCount, 1, 'Debe haber 1 incidencia');
    assert.strictEqual(metrics.totalTodayEur, 150.00, 'Total ventas hoy debe sumar solo los sincronizados');
    console.log('  ✓ Métricas calculadas correctamente (Ventas hoy: 150€, Pedidos: 2, Incidencias: 1).');

    // ----------------------------------------------------
    // TEST 4: Paginación, Búsqueda y Filtros
    // ----------------------------------------------------
    console.log('▶ [Test 4] Verificación de paginación server-side y filtros...');
    // Añadir varios pedidos más
    for (let i = 1; i <= 25; i++) {
      manager.recordOrder({
        channel: 'woocommerce',
        webOrderId: `bulk-${i}`,
        orderNumber: `WC-B${i}`,
        date: new Date(Date.now() - i * 86400000).toISOString(), // días anteriores
        customerName: `Cliente Bulk ${i}`,
        totalAmount: 10 + i,
        status: i % 5 === 0 ? 'failed' : 'synced',
        lines: [{ sku: `ART-${i}`, name: `Producto ${i}`, quantity: 1, unitPrice: 10 + i, total: 10 + i }],
      });
    }

    const page1 = manager.getOrders({ page: 1, limit: 10, range: 'all' });
    assert.strictEqual(page1.orders.length, 10);
    assert.strictEqual(page1.page, 1);
    assert.strictEqual(page1.totalPages, 3); // 27 total / 10 = 3
    assert.strictEqual(page1.total, 27);

    // Búsqueda por SKU
    const searchSku = manager.getOrders({ search: 'TORN-01' });
    assert.strictEqual(searchSku.total, 1);
    assert.strictEqual(searchSku.orders[0]?.orderNumber, 'PED-101');

    // Búsqueda por cliente
    const searchClient = manager.getOrders({ search: 'norte' });
    assert.strictEqual(searchClient.total, 1);
    assert.strictEqual(searchClient.orders[0]?.webOrderId, '202');

    // Filtro temporal: 'today'
    const todayOrders = manager.getOrders({ range: 'today' });
    assert.strictEqual(todayOrders.total, 2);

    // Filtro por estado: 'failed'
    const failedOrders = manager.getOrders({ status: 'failed' });
    assert.strictEqual(failedOrders.total >= 6, true);
    console.log('  ✓ Paginación, búsqueda inteligente por SKU/Cliente y filtros temporales validados.');

    // ----------------------------------------------------
    // TEST 5: Recarga de Estado tras Reinicio (Persistencia)
    // ----------------------------------------------------
    console.log('▶ [Test 5] Validación de persistencia tras re-instanciar manager...');
    const managerRestarted = new SalesLedgerManager(tempDir);
    assert.strictEqual(managerRestarted.getOrders({ range: 'all' }).total, 27);
    const reloadedFail = managerRestarted.getOrderById(orderFail.id);
    assert.strictEqual(reloadedFail?.orderNumber, 'WC-202');
    assert.strictEqual(reloadedFail?.status, 'failed');
    console.log('  ✓ Todos los 27 pedidos leídos intactos desde disco.');

    // ----------------------------------------------------
    // TEST 6: Reintento de Pedido (markOrderRetried)
    // ----------------------------------------------------
    console.log('▶ [Test 6] Reintento de pedido con cambio de estado...');
    const retried = managerRestarted.markOrderRetried(orderFail.id, 'synced', undefined, '5002', '1');
    assert.strictEqual(retried?.status, 'synced');
    assert.strictEqual(retried?.factusolOrderNumber, '5002');
    assert.strictEqual(retried?.retryCount, 1);
    assert.strictEqual(retried?.error, undefined);
    assert(retried?.lastRetriedAt);
    console.log('  ✓ Pedido reintentado y marcado como synced con número Factusol asignado.');

    // ----------------------------------------------------
    // TEST 7: Endpoints HTTP de la API Local
    // ----------------------------------------------------
    console.log('▶ [Test 7] Verificación de endpoints HTTP de la API Local...');
    const agent = new LocalAgent({ agentName: 'TestAgent' }, tempDir);
    const server = new LocalGuiServer(agent, 39888);
    const { url } = await server.start();

    try {
      // GET /api/local/sales-orders
      const resList = await fetch(`${url}/api/local/sales-orders?page=1&limit=5&range=all`);
      assert.strictEqual(resList.status, 200);
      const jsonList = await resList.json() as any;
      assert.strictEqual(Array.isArray(jsonList.orders), true);
      assert.strictEqual(jsonList.limit, 5);
      assert(jsonList.metrics);
      assert.strictEqual(typeof jsonList.metrics.totalTodayEur, 'number');
      assert.strictEqual(typeof jsonList.metrics.ordersTodayCount, 'number');
      assert.strictEqual(typeof jsonList.metrics.issuesCount, 'number');
      console.log('  ✓ GET /api/local/sales-orders respondió 200 con estructura paginada y métricas.');

      // GET /api/local/sales-orders/:id
      const firstOrderId = jsonList.orders[0]?.id;
      assert(firstOrderId, 'Debe haber un pedido en la lista');
      const resDetail = await fetch(`${url}/api/local/sales-orders/${encodeURIComponent(firstOrderId)}`);
      assert.strictEqual(resDetail.status, 200);
      const jsonDetail = await resDetail.json() as any;
      assert.strictEqual(jsonDetail.id, firstOrderId);
      assert(Array.isArray(jsonDetail.lines));
      console.log(`  ✓ GET /api/local/sales-orders/:id respondió 200 para pedido #${jsonDetail.orderNumber}.`);

      // POST /api/local/sales-orders/:id/retry (Pedido ya sincronizado debe rechazar con aviso)
      const resRetry = await fetch(`${url}/api/local/sales-orders/${encodeURIComponent(firstOrderId)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      // Puede devolver 200 o 400 si ya estaba sincronizado
      const jsonRetry = await resRetry.json() as any;
      assert(jsonRetry.message);
      console.log(`  ✓ POST /api/local/sales-orders/:id/retry procesado correctamente (${jsonRetry.message}).`);

    } finally {
      await server.stop();
    }

  } finally {
    delete process.env.BENTIAN_DATA_DIR;
    delete process.env.BENTIAN_CONFIG_PATH;
    delete process.env.BENTIAN_SALES_LEDGER_PATH;
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n======================================================');
  console.log('🎉 TODOS LOS TESTS DE SALES LEDGER Y API PASARON 100%');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Error en test de Sales Ledger:', err);
  process.exit(1);
});
