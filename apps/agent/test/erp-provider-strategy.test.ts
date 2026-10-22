import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../src/config/config.manager';
import { FactusolService } from '../src/factusol/factusol.service';
import { SimplyGestService } from '../src/simplygest/simplygest.service';
import { FactusolAdapter } from '../src/erp/adapters/factusol.adapter';
import { SimplyGestAdapter } from '../src/erp/adapters/simplygest.adapter';
import { AgoraErpAdapter, Sage50ErpAdapter, A3ErpAdapter } from '../src/erp/adapters/sql-erp.adapters';
import { ErpProviderRegistry } from '../src/erp/erp-provider.registry';
import { ConfigApplierService } from '../src/lifecycle/config-applier.service';
import { LocalSyncEngine } from '../src/sync/sync.engine';
import { HistoryManager } from '../src/history/history.manager';
import { EventBus } from '../src/diagnostics/event-bus';
import { SalesLedgerManager } from '../src/orders/sales-ledger.manager';

/**
 * Suite de pruebas unitarias para la arquitectura Single ERP Provider (Strategy Pattern)
 * y Aprovisionamiento Guiado en el Agente.
 */
async function runTests() {
  console.log('======================================================================');
  console.log('🚀 TEST SUITE: ERP Provider Strategy & Single ERP Architecture');
  console.log('======================================================================\n');

  const tempDir = path.join(os.tmpdir(), `bentian-erp-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const originalConfigPath = process.env.BENTIAN_CONFIG_PATH;
  const configPath = path.join(tempDir, 'agent-config.json');
  process.env.BENTIAN_CONFIG_PATH = configPath;

  try {
    console.log('1. Inicializando componentes y adaptadores...');
    const configManager = new ConfigManager({});
    const eventBus = new EventBus(50);
    const factusolService = new FactusolService(configManager, eventBus);
    const simplygestService = new SimplyGestService(configManager, eventBus);
    const factusolAdapter = new FactusolAdapter(configManager, factusolService, eventBus);
    const simplygestAdapter = new SimplyGestAdapter(configManager, simplygestService, eventBus);
    const agoraAdapter = new AgoraErpAdapter(configManager, eventBus);
    const sage50Adapter = new Sage50ErpAdapter(configManager, eventBus);
    const a3erpAdapter = new A3ErpAdapter(configManager, eventBus);
    const registry = new ErpProviderRegistry(configManager, [
      factusolAdapter,
      simplygestAdapter,
      agoraAdapter,
      sage50Adapter,
      a3erpAdapter,
    ]);
    const historyManager = new HistoryManager(tempDir);
    const salesLedgerManager = new SalesLedgerManager(tempDir);

    // Test 1: Resolución por defecto
    console.log('2. Verificando que Registry resuelve Factusol por defecto...');
    assert.strictEqual(registry.getActiveProviderId(), 'factusol');
    assert.strictEqual(registry.getActiveConnector().providerId, 'factusol');
    assert.strictEqual(registry.getActiveConnector().displayName, 'Factusol ERP');
    console.log('   ✓ Factusol resuelto por defecto con éxito');

    // Test 2: Resolución mediante softwareErp
    console.log('3. Verificando resolución de SimplyGest vía softwareErp...');
    configManager.update({
      softwareErp: {
        activeProvider: 'simplygest',
        provisioned: true,
      },
    });
    assert.strictEqual(registry.getActiveProviderId(), 'simplygest');
    assert.strictEqual(registry.getActiveConnector().providerId, 'simplygest');
    assert.strictEqual(registry.getActiveConnector().displayName, 'SimplyGest Desktop');
    console.log('   ✓ SimplyGest resuelto vía softwareErp');

    // Test 3: Fallback a legacy erpType
    console.log('4. Verificando fallback legacy por erpType...');
    configManager.update({
      softwareErp: undefined,
      erpType: 'simplygest',
    });
    assert.strictEqual(registry.getActiveProviderId(), 'simplygest');
    assert.strictEqual(registry.getActiveConnector().providerId, 'simplygest');
    console.log('   ✓ Fallback legacy erpType verificado');

    // Test 4: Conmutación dinámica y persistencia
    console.log('5. Verificando conmutación dinámica de ERP y persistencia...');
    registry.setActiveProvider('simplygest');
    assert.strictEqual(registry.getActiveProviderId(), 'simplygest');
    let currentCfg = configManager.get();
    assert.strictEqual(currentCfg.softwareErp?.activeProvider, 'simplygest');
    assert.strictEqual(currentCfg.erpType, 'simplygest');

    registry.setActiveProvider('factusol');
    assert.strictEqual(registry.getActiveProviderId(), 'factusol');
    currentCfg = configManager.get();
    assert.strictEqual(currentCfg.softwareErp?.activeProvider, 'factusol');
    assert.strictEqual(currentCfg.erpType, 'factusol');
    console.log('   ✓ Conmutación dinámica y persistencia verificadas');

    // Test 5: ConfigApplierService sincroniza bidireccionalmente
    console.log('6. Verificando ConfigApplierService con softwareErp y SimplyGest...');
    const licenseService: any = { getLicenseStatus: () => ({ status: 'VALID' }) };
    const dummySyncEngine: any = {
      triggerManualSync: async () => ({ success: true }),
      startAutoSyncLoop: () => {},
    };
    const applier = new ConfigApplierService(
      configManager,
      licenseService,
      factusolService,
      dummySyncEngine,
      eventBus,
      simplygestService,
      registry
    );

    const fakeSgDb = path.join(tempDir, 'Datos.mdb');
    fs.writeFileSync(fakeSgDb, 'MDB_MOCK_CONTENT');

    const res = await applier.saveFullConfig(
      {
        softwareErp: {
          activeProvider: 'simplygest',
          provisioned: true,
          providers: {
            simplygest: {
              databasePath: fakeSgDb,
              orderSeries: 'W1',
            },
          },
        },
      },
      () => false
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(registry.getActiveProviderId(), 'simplygest');

    const updatedCfg = configManager.get();
    assert.strictEqual(updatedCfg.erpType, 'simplygest');
    assert.strictEqual(updatedCfg.simplygest?.databasePath, fakeSgDb);
    assert.strictEqual(updatedCfg.simplygest?.orderSeries, 'W1');
    console.log('   ✓ ConfigApplierService actualizó softwareErp y erpType correctamente');

    // Test 6: LocalSyncEngine con ERP activo SimplyGest y Factusol sin configurar
    console.log('7. Verificando LocalSyncEngine con SimplyGest activo y Factusol no configurado...');
    configManager.update({
      factusolDbPath: '',
      factusol: { databasePath: '' },
      erpType: 'simplygest',
      softwareErp: {
        activeProvider: 'simplygest',
        provisioned: true,
        providers: {
          simplygest: { databasePath: fakeSgDb, orderSeries: 'W1' },
        },
      },
      channelType: 'universal_bridge',
      universalBridge: {
        storeUrl: 'https://example.com/erp-bridge-endpoint.php',
        secretKey: 'test_key',
      },
    });

    const syncEngine = new LocalSyncEngine(
      configManager,
      factusolService,
      historyManager,
      eventBus,
      () => ({ status: 'VALID' }),
      salesLedgerManager,
      registry
    );

    assert.strictEqual(syncEngine.getActiveErpConnector().providerId, 'simplygest');
    assert.strictEqual(syncEngine.getActiveErpConnector().displayName, 'SimplyGest Desktop');
    assert.strictEqual(syncEngine.getActiveErpConnector().getDatabasePath(), fakeSgDb);

    // Test 7: Métodos de extensión en IErpConnector
    console.log('8. Verificando IErpConnector métodos estándar...');
    const conn = syncEngine.getActiveErpConnector();
    const testRes = await conn.testConnection(fakeSgDb);
    assert.strictEqual(typeof testRes.success, 'boolean');
    assert.strictEqual(typeof testRes.message, 'string');

    if (conn.getMetadata) {
      const meta = await conn.getMetadata();
      assert.ok(Array.isArray(meta.tariffs));
      assert.ok(Array.isArray(meta.warehouses));
      assert.ok(Array.isArray(meta.series));
    }

    console.log('   ✓ Métodos y metadatos de IErpConnector verificados');

    // Test 8: Multi-ERP SQL Server (Ágora POS, Sage 50, a3ERP) + Modo Evaluación en los 5 ERPs
    console.log('9. Verificando los 5 ERPs oficiales en Modo Evaluación (Sandbox)...');
    const allFiveProviders = ['factusol', 'simplygest', 'agora', 'sage50', 'a3erp'] as const;
    for (const providerId of allFiveProviders) {
      configManager.update({
        erpType: providerId,
        softwareErp: {
          activeProvider: providerId,
          provisioned: true,
          providers: {
            [providerId]: {
              databasePath: 'DEMO',
              sqlInstance: '.\\SQLEXPRESS',
              evaluationMode: true,
              orderSeries: '1',
            },
          },
        },
      });
      assert.strictEqual(registry.getActiveProviderId(), providerId);
      const activeConn = registry.getActiveConnector();
      assert.strictEqual(activeConn.providerId, providerId);

      const evalConnRes = await activeConn.testConnection('DEMO');
      assert.strictEqual(evalConnRes.success, true, `testConnection(DEMO) debe tener éxito en ${providerId}`);

      const preview = await activeConn.getPreviewArticles(10);
      assert.ok(preview.length >= 3, `${providerId} debe devolver artículos demo en getPreviewArticles`);

      const stockMap = await activeConn.getStockMap();
      assert.ok(stockMap.size >= 3, `${providerId} debe devolver stockMap en modo evaluación`);

      const orderRes = await activeConn.createOrder({
        id: `WEB-${providerId.toUpperCase()}-001`,
        orderNumber: `WEB-${providerId.toUpperCase()}-001`,
        date: new Date(),
        status: 'pending',
        currency: 'EUR',
        netAmount: 100,
        totalAmount: 121,
        taxAmount: 21,
        customer: {
          id: 'cust-1',
          fiscalName: 'Agencia Test Beta',
          taxId: 'B12345678',
          email: 'test@agencia.es',
        },
        lines: [
          {
            position: 1,
            sku: preview[0]!.code,
            name: preview[0]!.description,
            quantity: 2,
            unitPrice: 50,
            subtotal: 100,
            total: 121,
          },
        ],
      } as any);
      assert.strictEqual(orderRes.success, true, `createOrder debe funcionar en modo evaluación para ${providerId}`);
      assert.ok((orderRes.orderNumber || orderRes.externalId));
      console.log(`   ✓ [${providerId}] Evaluación verificada (${preview.length} arts., pedido #${orderRes.orderNumber || orderRes.externalId})`);
    }

    // Test 9: Simulador de Pedidos de Prueba y Reintento Polimórfico (SalesOrderManager + TestOrderSimulatorService)
    console.log('10. Verificando TestOrderSimulatorService y SalesOrderManager polimórficos...');
    const { TestOrderSimulatorService } = await import('../src/orders/test-order-simulator.service');
    const { SalesOrderManager } = await import('../src/orders/sales-order.manager');
    const simulator = new TestOrderSimulatorService(configManager, eventBus, salesLedgerManager, factusolService, undefined, registry);
    const salesOrderMgr = new SalesOrderManager(salesLedgerManager, configManager, factusolService, eventBus, registry);

    for (const providerId of ['agora', 'sage50', 'a3erp', 'simplygest'] as const) {
      configManager.update({
        erpType: providerId,
        softwareErp: {
          activeProvider: providerId,
          provisioned: true,
          providers: {
            [providerId]: {
              databasePath: 'DEMO',
              databaseName: 'DEMO',
              serverInstance: '.\\SQLEXPRESS',
              evaluationMode: true,
              orderSeries: '1',
            },
          },
        },
      });
      const simRes = await simulator.simulateOrder({ dryRun: false });
      assert.strictEqual(simRes.success, true, `Simulador de pedidos debe tener éxito en ${providerId}`);
      assert.ok(simRes.details.steps.length >= 4);

      // Registrar un pedido fallido y reintentarlo vía SalesOrderManager
      const failedRecord = salesLedgerManager.recordOrder({
        channel: 'woocommerce',
        webOrderId: `RETRY-${providerId}-99`,
        orderNumber: `RETRY-${providerId}-99`,
        date: new Date().toISOString(),
        factusolSeries: '1',
        customerName: 'Cliente Reintento',
        totalAmount: 60.5,
        currency: 'EUR',
        status: 'failed',
        error: 'Simulación fallo temporal',
        lines: [{ sku: 'DEMO-01', name: 'Artículo Demo', quantity: 1, unitPrice: 50, total: 50 }],
      });
      const retryRes = await salesOrderMgr.retrySalesOrder(failedRecord.id);
      assert.strictEqual(retryRes.success, true, `retrySalesOrder debe tener éxito en ${providerId}`);
    }
    console.log('   ✓ TestOrderSimulatorService y SalesOrderManager verificados en los motores Multi-ERP');

    console.log('\n======================================================================');
    console.log('✅ TODAS LAS PRUEBAS DE ESTRATEGIA ERP PASARON CON ÉXITO');
    console.log('======================================================================\n');
  } finally {
    if (originalConfigPath !== undefined) {
      process.env.BENTIAN_CONFIG_PATH = originalConfigPath;
    } else {
      delete process.env.BENTIAN_CONFIG_PATH;
    }
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  }
}

runTests().catch(err => {
  console.error('❌ Error en test suite de estrategia ERP:', err);
  process.exit(1);
});
