import assert from 'assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProgressiveCatalogHelper } from '../src/sync/progressive-catalog.helper';
import { EventBus } from '../src/diagnostics/event-bus';
import { Logger } from '@erp-bridge/shared';

async function run() {
  console.log('--- Running ProgressiveCatalogHelper Tests ---');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'progressive-catalog-test-'));
  const fakeDbPath = path.join(tmpDir, '0012026.accdb');
  fs.writeFileSync(fakeDbPath, 'fake-factusol-db-content');

  // Preparar mock server para Universal Bridge
  let pushCatalogReceived: any[] = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const action = url.searchParams.get('action');

    if (action === 'ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', success: true, articleCount: 0 }));
      return;
    }

    if (action === 'push_catalog') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body || '{}');
      pushCatalogReceived.push(...(data.products || []));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, processed: (data.products || []).length }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const endpointUrl = `http://127.0.0.1:${port}/erp-bridge-endpoint.php`;

  try {
    const eventBus = new EventBus();

    const mockFactusolProducts = Array.from({ length: 25 }, (_, i) => ({
      sku: `SKU-${String(i + 1).padStart(3, '0')}`,
      name: `Producto de prueba ${i + 1}`,
      regularPrice: 10 + i,
      taxRate: 21,
      stockQuantity: 5,
      status: 'published' as const,
    }));

    const mockConfigManager = {
      get: () => ({
        channelType: 'universal_bridge',
        universalBridge: {
          storeUrl: endpointUrl,
          secretKey: 'secret_123',
        },
        factusol: {
          databasePath: fakeDbPath,
          activeOnly: false,
        },
      }),
    } as any;

    const mockFactusolService = {
      getConnector: () => ({
        readProducts: async () => mockFactusolProducts,
      }),
    } as any;

    const ctx = {
      configManager: mockConfigManager,
      factusolService: mockFactusolService,
      eventBus,
      logger: new Logger('TestProgressiveCatalog'),
      resolveBridgeEndpoint: (u: string) => u,
      getBridgeHeaders: () => ({ 'Content-Type': 'application/json' }),
    };

    // Test 1: Primera ejecución - debe subir el micro-lote de 15 artículos
    ProgressiveCatalogHelper.resetState();
    console.log('1. Probando subida de primer micro-lote (15 artículos)...');
    const uploadedFirstBatch = await ProgressiveCatalogHelper.processProgressiveUpload(ctx, {
      channel: 'universal_bridge',
      dbPath: fakeDbPath,
    });

    assert.strictEqual(uploadedFirstBatch, 15, 'El primer lote debe contener exactamente 15 artículos');
    assert.strictEqual(pushCatalogReceived.length, 15, 'El servidor debe recibir exactamente 15 artículos');
    const hasEvent = eventBus.getRecentEvents().some((e) => e.message.includes('✓ Subida progresiva: 15 artículos nuevos dados de alta en la web'));
    assert.ok(hasEvent, 'Debe emitirse el evento sutil de subida progresiva en EventBus');
    console.log('✓ Test 1 superado con éxito');

    // Test 2: Comprobar debounce / periodo de respiro
    console.log('2. Probando debounce / periodo de respiro...');
    const debounceAttempt = await ProgressiveCatalogHelper.processProgressiveUpload(ctx, {
      channel: 'universal_bridge',
      dbPath: fakeDbPath,
    });
    assert.strictEqual(debounceAttempt, 0, 'La llamada inmediata debe ignorarse por debounce (retorna 0)');
    console.log('✓ Test 2 superado con éxito');

    // Test 3: Segunda ejecución (tras reset de debounce) - debe subir los 10 artículos restantes
    console.log('3. Probando subida de lote remanente (10 artículos)...');
    // Para simular el paso del tiempo en el debounce sin hacer sleep de 20s:
    (ProgressiveCatalogHelper as any).lastRunTime = 0;
    const uploadedSecondBatch = await ProgressiveCatalogHelper.processProgressiveUpload(ctx, {
      channel: 'universal_bridge',
      dbPath: fakeDbPath,
    });

    assert.strictEqual(uploadedSecondBatch, 10, 'El segundo lote debe subir los 10 artículos restantes');
    assert.strictEqual(pushCatalogReceived.length, 25, 'Se han subido en total los 25 artículos');
    const hasSecondEvent = eventBus.getRecentEvents().some((e) => e.message.includes('✓ Subida progresiva: 10 artículos nuevos dados de alta en la web'));
    assert.ok(hasSecondEvent, 'Debe emitirse el evento para el segundo lote');
    console.log('✓ Test 3 superado con éxito');

    // Test 4: Tercera ejecución - catálogo completo, debe retornar 0 sin emitir eventos
    console.log('4. Probando ejecución con catálogo ya completo...');
    (ProgressiveCatalogHelper as any).lastRunTime = 0;
    const uploadedThirdBatch = await ProgressiveCatalogHelper.processProgressiveUpload(ctx, {
      channel: 'universal_bridge',
      dbPath: fakeDbPath,
    });
    assert.strictEqual(uploadedThirdBatch, 0, 'No debe haber artículos pendientes (retorna 0)');
    console.log('✓ Test 4 superado con éxito');

    console.log('🎉 TODOS LOS TESTS DE PROGRESSIVE CATALOG HELPER PASARON CON ÉXITO');
  } finally {
    server.close();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error('❌ Error en test de ProgressiveCatalogHelper:', err);
  process.exit(1);
});
