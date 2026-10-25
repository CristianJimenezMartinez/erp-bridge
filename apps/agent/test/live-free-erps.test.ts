import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ConfigManager } from '../src/config/config.manager';
import { FacturaScriptsErpAdapter, OdooErpAdapter } from '../src/erp-extensions/spanish-erp.adapters';

async function runLiveFreeErpTests() {
  console.log('====================================================================');
  console.log('🚀 TEST EN VIVO CONTRA ERPs GRATUITOS (FacturaScripts & Odoo 17)');
  console.log('====================================================================\n');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bentian-free-erps-'));
  const originalConfigPath = process.env.BENTIAN_CONFIG_PATH;
  process.env.BENTIAN_CONFIG_PATH = path.join(tempDir, 'agent-config.json');

  try {
    const cm = new ConfigManager({});

    // -------------------------------------------------------------
    // 1. FACTURASCRIPTS REST API v3
    // -------------------------------------------------------------
    console.log('--- 1. PROBANDO FACTURASCRIPTS (API REST v3 Oficial) ---');
    const fsAdapter = new FacturaScriptsErpAdapter(cm);
    fsAdapter.saveProviderConfig({
      serverInstance: 'http://127.0.0.1:8096',
      password: 'bentian_fs_api_token_test_123',
      databaseName: 'facturascripts_test',
      orderSeries: 'A',
      warehouseCode: 'ALG',
      evaluationMode: false,
    } as any);

    // 1.1 Test Connection
    console.log('[FacturaScripts] Ejecutando testConnection()...');
    const fsConn = await fsAdapter.testConnection();
    console.log('[FacturaScripts] Resultado conexión:', fsConn.message);
    assert.strictEqual(fsConn.success, true, 'testConnection de FacturaScripts debe ser exitoso');
    assert.ok((fsConn.articleCount || 0) >= 1, 'Debe encontrar al menos 1 producto');

    // 1.2 Get Catalog Articles
    console.log('[FacturaScripts] Obteniendo catálogo...');
    const fsCatalog = await fsAdapter.getArticlesForCatalog(50);
    console.log(`[FacturaScripts] ${fsCatalog.length} artículos encontrados en catálogo.`);
    assert.ok(fsCatalog.length >= 1, 'El catálogo de FacturaScripts no debe estar vacío');
    const testArt = fsCatalog.find((a) => a.code === 'TEST-SKU-001');
    assert.ok(testArt, 'Debe encontrar el artículo TEST-SKU-001');
    console.log('[FacturaScripts] Artículo verificado:', {
      code: testArt?.code,
      name: testArt?.name,
      price: testArt?.price,
    });
    assert.strictEqual(Number(testArt?.price), 25.5);

    // 1.3 Create Order
    console.log('[FacturaScripts] Creando pedido de venta...');
    const fsOrderNumber = `FS-LIVE-${Math.floor(Math.random() * 100000)}`;
    const fsTestOrder: any = {
      id: fsOrderNumber,
      orderNumber: fsOrderNumber,
      status: 'pending',
      currency: 'EUR',
      paymentMethod: 'Tarjeta de crédito',
      customer: {
        id: '1',
        fiscalName: 'Cliente Bentian Lab',
        email: 'lab@bentian.local',
        cif: 'B12345678',
      },
      lines: [
        {
          sku: 'TEST-SKU-001',
          name: 'Producto Test Bentian',
          quantity: 3,
          unitPrice: 25.5,
          total: 76.5,
          position: 1,
        },
      ],
    };

    const fsOrderRes = await fsAdapter.createOrder(fsTestOrder);
    console.log('[FacturaScripts] createOrder resultado:', fsOrderRes);
    assert.strictEqual(fsOrderRes.success, true, 'FacturaScripts createOrder debe retornar success: true');
    assert.ok(fsOrderRes.orderNumber, 'Debe tener un orderNumber asignado');
    console.log(`✅ FacturaScripts REST API v3 CERTIFICADO (Pedido ${fsOrderRes.orderNumber})\n`);

    // -------------------------------------------------------------
    // 2. ODOO COMMUNITY 17 JSON-RPC 2.0
    // -------------------------------------------------------------
    console.log('--- 2. PROBANDO ODOO 17 COMMUNITY (JSON-RPC 2.0 Oficial) ---');
    const odooAdapter = new OdooErpAdapter(cm);
    odooAdapter.saveProviderConfig({
      serverInstance: 'http://127.0.0.1:8069',
      databaseName: 'bentian_odoo_test',
      username: 'admin',
      password: 'admin',
      evaluationMode: false,
    } as any);

    // 2.1 Test Connection
    console.log('[Odoo] Ejecutando testConnection()...');
    const odooConn = await odooAdapter.testConnection();
    console.log('[Odoo] Resultado conexión:', odooConn.message);
    assert.strictEqual(odooConn.success, true, 'testConnection de Odoo debe ser exitoso');
    assert.ok((odooConn.articleCount || 0) >= 1, 'Debe encontrar al menos 1 producto');

    // 2.2 Get Catalog Articles
    console.log('[Odoo] Obteniendo catálogo...');
    const odooCatalog = await odooAdapter.getArticlesForCatalog(50);
    console.log(`[Odoo] ${odooCatalog.length} artículos encontrados en catálogo.`);
    assert.ok(odooCatalog.length >= 1, 'El catálogo de Odoo no debe estar vacío');
    const odooArt = odooCatalog.find((a) => a.code === 'TAL-750W');
    assert.ok(odooArt, 'Debe encontrar el producto TAL-750W en Odoo');
    console.log('[Odoo] Artículo verificado:', {
      code: odooArt?.code,
      name: odooArt?.name,
      price: odooArt?.price,
      barcode: odooArt?.barcode,
    });
    assert.strictEqual(Number(odooArt?.price), 89.95);

    // 2.3 Create Order
    console.log('[Odoo] Creando pedido de venta...');
    const odooOrderNumber = `ODOO-LIVE-${Math.floor(Math.random() * 100000)}`;
    const odooTestOrder: any = {
      id: odooOrderNumber,
      orderNumber: odooOrderNumber,
      status: 'pending',
      currency: 'EUR',
      customer: {
        fiscalName: 'Construcciones del Norte S.A.',
        email: 'compras@construccionesnorte.es',
      },
      lines: [
        {
          sku: 'TAL-750W',
          name: 'Taladro Percutor 750W',
          quantity: 2,
          unitPrice: 89.95,
          total: 179.9,
          position: 1,
        },
      ],
    };

    const odooOrderRes = await odooAdapter.createOrder(odooTestOrder);
    console.log('[Odoo] createOrder resultado:', odooOrderRes);
    assert.strictEqual(odooOrderRes.success, true, 'Odoo createOrder debe retornar success: true');
    assert.ok(odooOrderRes.orderNumber, 'Debe tener un orderNumber asignado');
    console.log(`✅ Odoo 17 JSON-RPC 2.0 CERTIFICADO (Pedido ${odooOrderRes.orderNumber})\n`);

    console.log('====================================================================');
    console.log('🏆 VERIFICACIÓN 100% EXITOSA DE TODOS LOS ERPs GRATUITOS');
    console.log('====================================================================');
  } finally {
    if (originalConfigPath !== undefined) {
      process.env.BENTIAN_CONFIG_PATH = originalConfigPath;
    } else {
      delete process.env.BENTIAN_CONFIG_PATH;
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

runLiveFreeErpTests().catch((err) => {
  console.error('\n❌ ERROR FATAL EN PRUEBAS:', err);
  process.exit(1);
});
