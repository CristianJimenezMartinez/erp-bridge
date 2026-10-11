import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  TestOrderSimulatorService,
  TestOrderSimulationResult,
} from '../src/orders/test-order-simulator.service';
import { SalesLedgerManager } from '../src/orders/sales-ledger.manager';
import { ConfigManager } from '../src/config/config.manager';
import { EventBus } from '../src/diagnostics/event-bus';
import { LocalAgent } from '../src/agent';
import { LocalGuiServer } from '../src/gui/gui-server';

console.log('--- Running Test Order Simulator Unit & Integration Tests ---');

// Mock AccessDriver para pruebas unitarias sin depender de base de datos Access física
class MockAccessDriver {
  public executedTransactions: string[][] = [];
  public executedQueries: string[] = [];
  public mockArticles: any[] = [
    { CODART: '000001', DESART: 'TORNILLO CABEZA HEXAGONAL M8X40', PCOART: 10.0, PVALART: 14.50 },
  ];
  public mockCustomers: any[] = [
    {
      CODCLI: 105,
      NOFCLI: 'FERRETERIA INDUSTRIAL VALENCIA SL',
      NIFCLI: 'B96000000',
      DOMCLI: 'Poligono Fuente del Jarro s/n',
      POBCLI: 'Paterna',
      CPOCLI: '46988',
      PROCLI: 'Valencia',
      TELCLI: '961000000',
      EMACLI: 'compras@ferreteriavalencia.es',
    },
  ];
  public mockMaxOrderId = 41;
  public mockStock = 12;

  public async query<T>(sql: string): Promise<T[]> {
    this.executedQueries.push(sql);
    const upper = sql.toUpperCase();

    if (upper.includes('MAX(CODPCL)')) {
      return [{ maxid: this.mockMaxOrderId }] as any;
    }

    if (upper.includes('F_ART')) {
      return this.mockArticles as any;
    }

    if (upper.includes('F_LTA')) {
      return [{ PRELTA: 14.50 }] as any;
    }

    if (upper.includes('F_STO')) {
      return [{ DISSTO: this.mockStock, ACTSTO: this.mockStock }] as any;
    }

    if (upper.includes('F_CLI')) {
      return this.mockCustomers as any;
    }

    if (upper.includes('COUNT(*)')) {
      return [{ total: this.mockArticles.length }] as any;
    }

    return [] as any;
  }

  public async executeTransaction(sqls: string[]): Promise<void> {
    this.executedTransactions.push(sqls);
    // Simular decremento de stock en memoria
    this.mockStock -= 1;
    this.mockMaxOrderId += 1;
  }
}

async function runTests() {
  const tempDir = path.join(os.tmpdir(), `bentian-sim-order-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const customLedgerFile = path.join(tempDir, 'sales-ledger.json');
  const customConfigFile = path.join(tempDir, 'agent-config.json');

  // Configuración de entorno aislado (Anti-Wiping y regla de testing SSoT)
  process.env.BENTIAN_DATA_DIR = tempDir;
  process.env.BENTIAN_CONFIG_PATH = customConfigFile;
  process.env.BENTIAN_SALES_LEDGER_PATH = customLedgerFile;

  try {
    const configManager = new ConfigManager({
      factusol: {
        databasePath: 'C:\\Factusol\\Datos\\2252026.accdb',
        orderSeries: '1',
        warehouseCode: 'GEN',
        tariffCode: '1',
      },
    });
    const eventBus = new EventBus(50);
    const salesLedgerManager = new SalesLedgerManager(tempDir);

    // ----------------------------------------------------
    // TEST 1: Simulación en modo Dry-Run (Sin escritura en disco)
    // ----------------------------------------------------
    console.log('▶ [Test 1] Simulación en modo Dry-Run (dryRun: true)...');
    const mockDriver1 = new MockAccessDriver();
    const simulator1 = new TestOrderSimulatorService(
      configManager,
      eventBus,
      salesLedgerManager,
      undefined,
      mockDriver1 as any
    );

    const resDryRun: TestOrderSimulationResult = await simulator1.simulateOrder({
      dryRun: true,
      orderSeries: '1',
    });

    assert.strictEqual(resDryRun.success, true, 'La simulación en dryRun debe ser exitosa');
    assert.strictEqual(resDryRun.dryRun, true, 'El flag dryRun debe ser true');
    assert.strictEqual(resDryRun.orderNumber, '42', 'El correlativo simulado debe ser 42');
    assert.strictEqual(resDryRun.series, '1', 'La serie asignada debe coincidir con la configuración');
    assert.strictEqual(resDryRun.articleCode, '000001');
    assert.strictEqual(resDryRun.totalAmount, 17.55, 'Total con IVA: 14.50 + 21% IVA (3.05) = 17.55');
    assert.strictEqual(resDryRun.taxAmount, 3.05, 'Cuadre exacto de 21% IVA');
    assert.strictEqual(resDryRun.details.steps.length, 5, 'Debe registrar los 5 pasos del checklist');

    // Verificar los 5 pasos en estado ok
    const stepNames = resDryRun.details.steps.map((s) => s.name);
    assert(stepNames.some((n) => n.includes('Factusol OLEDB')));
    assert(stepNames.some((n) => n.includes('Búsqueda de artículo')));
    assert(stepNames.some((n) => n.includes('Cuadre de IVA')));
    assert(stepNames.some((n) => n.includes('F_PCL')));
    assert(stepNames.some((n) => n.includes('stock')));
    assert(resDryRun.details.steps.every((s) => s.status === 'ok'));

    // En dry-run NO debe llamar a executeTransaction
    assert.strictEqual(mockDriver1.executedTransactions.length, 0, 'En dryRun no debe escribir en base de datos');
    console.log('  ✓ Dry-Run verificado: 5 pasos OK, desglose contable correcto, cero escrituras en disco.');

    // ----------------------------------------------------
    // TEST 2: Inserción Real Atómica en Factusol (dryRun: false)
    // ----------------------------------------------------
    console.log('▶ [Test 2] Inserción real en Factusol (dryRun: false)...');
    const mockDriver2 = new MockAccessDriver();
    const simulator2 = new TestOrderSimulatorService(
      configManager,
      eventBus,
      salesLedgerManager,
      undefined,
      mockDriver2 as any
    );

    const resReal: TestOrderSimulationResult = await simulator2.simulateOrder({
      dryRun: false,
      orderSeries: 'T',
    });

    assert.strictEqual(resReal.success, true);
    assert.strictEqual(resReal.dryRun, false);
    assert.strictEqual(resReal.orderNumber, '42');
    assert.strictEqual(resReal.series, 'T');
    assert.strictEqual(mockDriver2.executedTransactions.length, 1, 'Debe ejecutar 1 transacción atómica');

    const tx = mockDriver2.executedTransactions[0]!;
    assert(tx.some((sql) => sql.includes('INSERT INTO F_PCL')), 'Debe insertar cabecera F_PCL');
    assert(tx.some((sql) => sql.includes('INSERT INTO F_LPC')), 'Debe insertar línea F_LPC');
    assert(tx.some((sql) => sql.includes('UPDATE F_STO SET DISSTO')), 'Debe decrementar stock en F_STO');

    // Verificar que se emitió el evento en EventBus
    const events = eventBus.getRecentEvents();
    const orderEvent = events.find((e) => e.message.includes('Pedido de prueba'));
    assert(orderEvent, 'Debe registrar evento de éxito en EventBus');
    assert(orderEvent.message.includes('#T-0042'), `El evento debe incluir el identificador oficial: ${orderEvent.message}`);

    // Verificar que se registró en SalesLedgerManager
    const ordersInLedger = salesLedgerManager.getOrders({ limit: 10 });
    assert(ordersInLedger.orders.some((o) => o.factusolOrderNumber === '42' && o.factusolSeries === 'T'));
    console.log('  ✓ Inserción real verificada: Transacción atómica ejecutada, stock decrementado y guardado en ledger.');

    // ----------------------------------------------------
    // TEST 3: Base de datos vacía (Fallback a TEST-001)
    // ----------------------------------------------------
    console.log('▶ [Test 3] Fallback defensivo ante base de datos vacía...');
    const emptyDriver = new MockAccessDriver();
    emptyDriver.mockArticles = [];
    emptyDriver.mockCustomers = [];

    const simulatorEmpty = new TestOrderSimulatorService(
      configManager,
      eventBus,
      salesLedgerManager,
      undefined,
      emptyDriver as any
    );

    const resEmpty = await simulatorEmpty.simulateOrder({ dryRun: true });
    assert.strictEqual(resEmpty.success, true);
    assert.strictEqual(resEmpty.articleCode, 'TEST-001');
    assert.strictEqual(resEmpty.totalAmount, 17.55);
    assert(resEmpty.details.customer?.name.includes('CLIENTE DE PRUEBAS'));
    console.log('  ✓ Fallback defensivo verificado: Artículo TEST-001 y cliente de pruebas generados correctamente.');

    // ----------------------------------------------------
    // TEST 4: Fallo de conexión o archivo inaccesible
    // ----------------------------------------------------
    console.log('▶ [Test 4] Detección de error ante base de datos inexistente...');
    const simulatorNoDb = new TestOrderSimulatorService(undefined, eventBus, salesLedgerManager);
    const resNoDb = await simulatorNoDb.simulateOrder({
      dbPath: 'Z:\\Inexistente\\Factusol_Fantasma.accdb',
      dryRun: true,
    });
    assert.strictEqual(resNoDb.success, false);
    assert.strictEqual(resNoDb.details.steps[0]?.status, 'failed');
    assert(resNoDb.error?.includes('no existe o no es accesible'));
    console.log('  ✓ Manejo de error de archivo verificado.');

    // ----------------------------------------------------
    // TEST 5: Integración con Endpoint HTTP /api/local/simulate-test-order
    // ----------------------------------------------------
    console.log('▶ [Test 5] Integración de endpoint HTTP /api/local/simulate-test-order...');
    const testAgent = new LocalAgent({
      factusol: {
        databasePath: path.join(tempDir, 'fake-factusol.accdb'),
        orderSeries: '1',
      },
    }, tempDir);

    // Inyectamos el mock driver en el testOrderSimulator del agente
    (testAgent.testOrderSimulator as any).defaultDriver = mockDriver1;

    const TEST_PORT = 39871;
    const server = new LocalGuiServer(testAgent, TEST_PORT);
    const { url } = await server.start();

    try {
      const endpointUrl = `${url}/api/local/simulate-test-order`;

      // Simulación Dry-Run vía HTTP POST
      const postRes = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      });

      assert.strictEqual(postRes.status, 200);
      const jsonRes = (await postRes.json()) as TestOrderSimulationResult;

      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(jsonRes.dryRun, true);
      assert.strictEqual(jsonRes.orderNumber, '42');
      assert.strictEqual(jsonRes.details.steps.length, 5);
      console.log(`  ✓ POST /api/local/simulate-test-order respondió 200 OK con los 5 pasos validados.`);
    } finally {
      await server.stop();
    }

  } finally {
    // Teardown obligatorio según regla de aislamiento de configuración
    delete process.env.BENTIAN_DATA_DIR;
    delete process.env.BENTIAN_CONFIG_PATH;
    delete process.env.BENTIAN_SALES_LEDGER_PATH;
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n======================================================');
  console.log('🎉 TODOS LOS TESTS DEL SIMULADOR DE PEDIDOS PASARON 100%');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Error en test de TestOrderSimulator:', err);
  process.exit(1);
});
