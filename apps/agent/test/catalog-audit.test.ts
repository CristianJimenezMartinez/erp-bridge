import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { LocalAgent } from '../src/agent';
import { CatalogAuditController } from '../src/gui/router/controllers/catalog-audit.controller';
import { renderDashboardHtml } from '../src/gui/ui-template';
import { renderCatalogAuditTab } from '../src/gui/templates/views/catalog-audit.view';
import { buildExtendedSpanishSqlOrderBatch } from '../src/erp-extensions/spanish-sql-order-tx.builder';

async function runCatalogAuditTests() {
  console.log('--- Running Multi-ERP Catalog Audit Tests ---');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bentian-catalog-audit-test-'));
  process.env.BENTIAN_CONFIG_PATH = path.join(tempDir, 'agent-config.json');

  const agent = new LocalAgent({
    agentName: 'AuditTestAgent',
    apiBaseUrl: 'http://127.0.0.1:59999',
  });

  try {
    const providers = [
      { id: 'factusol', expectedName: 'Factusol ERP', expectedTable: 'F_LTA / F_ART' },
      { id: 'simplygest', expectedName: 'SimplyGest Desktop', expectedTable: 'Articulos.Precio1' },
      { id: 'agora', expectedName: 'Ágora Retail / POS', expectedTable: 'PriceList.MainPrice' },
      { id: 'sage50', expectedName: 'Sage 50 ERP', expectedTable: 'pvp.pvp (Tarifa 01)' },
      { id: 'a3erp', expectedName: 'Wolters Kluwer a3ERP', expectedTable: 'ARTICULO.PRCVENTA' },
      { id: 'sage200', expectedName: 'Sage 200 (Sage Murano)', expectedTable: 'Articulos.PrecioVenta' },
      { id: 'icg', expectedName: 'ICG Manager / FrontRetail', expectedTable: 'PRECIOSVENTA.PNETO' },
      { id: 'visionwin', expectedName: 'Visionwin Gestión', expectedTable: 'ARTICULOS.PVP1' },
      { id: 'aplifisa', expectedName: 'Aplifisa (GestFuturo / Factus)', expectedTable: 'ARTICULOS.PVP1' },
      { id: 'odoo', expectedName: 'Odoo ERP', expectedTable: 'product.template.list_price' },
      { id: 'facturascripts', expectedName: 'FacturaScripts', expectedTable: 'variantes.precio' },
      { id: 'businesscentral', expectedName: 'Microsoft Dynamics 365 Business Central / NAV', expectedTable: 'Item.[Unit Price]' },
    ] as const;

    const allConnectors = agent.erpRegistry.getAllConnectors();
    assert.strictEqual(allConnectors.length, 12, `Expected 12 Spanish ERP connectors registered, got ${allConnectors.length}`);

    for (const p of providers) {
      // 1. Verify ErpProviderRegistry connector in DEMO mode for all 7 new + 3 existing SQL ERPs
      if (p.id !== 'factusol' && p.id !== 'simplygest') {
        const connector = agent.erpRegistry.getConnector(p.id as any);
        assert.ok(connector, `Expected connector registered for ${p.id}`);
        (agent.configManager.get() as any)[p.id] = { evaluationMode: true, databasePath: 'DEMO' };
        const connRes = await connector.testConnection('DEMO');
        assert.strictEqual(connRes.success, true, `Expected DEMO connection for ${p.id}`);
        const demoArticles = await connector.getPreviewArticles(10);
        assert.ok(demoArticles.length >= 2, `Expected >= 2 demo articles from connector for ${p.id}`);
        const demoStock = await connector.getStockMap();
        assert.ok(demoStock.size >= 2, `Expected >= 2 demo stock entries from connector for ${p.id}`);
        delete (agent.configManager.get() as any)[p.id];
      }

      // 2. Verify Catalog Audit Report for all 12 Spanish ERPs
      const reqUrl = new URL(`http://127.0.0.1:39281/api/local/erp/preview?mode=audit&provider=${p.id}&demo=1`);
      const report = await CatalogAuditController.buildAuditReport(agent, reqUrl);

      assert.strictEqual(report.success, true);
      assert.strictEqual(report.providerId, p.id);
      assert.strictEqual(report.erpDisplayName, p.expectedName);
      assert.strictEqual(report.dataSourceMode, 'demo');
      assert.ok(report.summary.totalInspected >= 7, `Expected >= 7 articles for ${p.id}`);
      assert.ok(report.summary.countsByType.ZERO_PRICE >= 1);
      assert.ok(report.summary.countsByType.BELOW_COST >= 1);
      assert.ok(report.summary.countsByType.NEGATIVE_STOCK >= 1);
      assert.ok(report.summary.countsByType.MISSING_IMAGE >= 1);
      assert.ok(report.summary.countsByType.INCOMPLETE_DATA >= 1);

      const zeroPriceItem = report.issues.find((it) => it.primaryIssue === 'ZERO_PRICE');
      assert.ok(zeroPriceItem, `Expected ZERO_PRICE item for ${p.id}`);
      assert.strictEqual(zeroPriceItem?.erpTableRef, p.expectedTable);
      console.log(`  ✓ Connector & Audit report verified for ${p.expectedName} (${report.summary.affectedArticlesCount} issues detected)`);
    }

    // CSV export test
    const req = {
      url: '/api/local/erp/preview?mode=audit-csv&provider=sage50&demo=1',
    } as http.IncomingMessage;

    let statusCode = 0;
    let headers: Record<string, any> = {};
    let body = '';

    const res = {
      writeHead: (code: number, hdrs: Record<string, any>) => {
        statusCode = code;
        headers = hdrs;
      },
      end: (chunk: string) => {
        body = chunk;
      },
    } as unknown as http.ServerResponse;

    await CatalogAuditController.handleAuditCsv(agent, req, res);
    assert.strictEqual(statusCode, 200);
    assert.ok(String(headers['Content-Type']).includes('text/csv'));
    assert.ok(String(headers['Content-Disposition']).includes('auditoria-catalogo-sage50-'));
    assert.ok(body.startsWith('\uFEFFSoftware ERP;Codigo SKU;'));
    assert.ok(body.includes('Sage 50 ERP;S50-4004;'));
    console.log('  ✓ CSV export with UTF-8 BOM verified');

    // UI & Minimalist SVG Icons test (zero emojis)
    const tabHtml = renderCatalogAuditTab();
    assert.ok(tabHtml.includes('id="tab-catalog-audit"'));
    assert.ok(tabHtml.includes('<svg'));
    assert.strictEqual(/[\u{1F300}-\u{1FAFF}]/u.test(tabHtml), false, 'Catalog Audit tab must not contain emojis');

    const fullHtml = renderDashboardHtml('0.4.15', 'test-token');
    assert.ok(fullHtml.includes('data-tab="catalog-audit"'));
    assert.ok(fullHtml.includes('Auditoría de Catálogo'));
    assert.ok(fullHtml.includes('loadCatalogAudit'));
    for (const p of providers) {
      assert.ok(fullHtml.includes(`id="modal-choice-${p.id}"`), `Missing modal-choice-${p.id} in GUI HTML`);
      assert.ok(fullHtml.includes(`id="wiz-erp-choice-${p.id}"`), `Missing wiz-erp-choice-${p.id} in Wizard HTML`);
    }
    console.log('  ✓ Minimalist SVG UI & 12-ERP Dashboard HTML verified');

    // 3. Verify Atomic T-SQL Order Batch Builder (Header + Lines + Stock) for all 5 new SQL ERPs
    const sampleOrder: any = {
      id: 'ORD-2026-999',
      orderNumber: '999',
      reference: 'WC-999',
      totalAmount: 145.5,
      customer: { id: 'CLI-10', customerNumber: '10000', fiscalName: 'Ferretería Industrial Norte S.L.', email: 'compras@ferreterianorte.es' },
      lines: [
        { position: 1, sku: 'ART-101', name: 'Taladro Percutor 850W', quantity: 2, unitPrice: 50, total: 100 },
        { position: 2, sku: 'ART-202-XL-AZUL', name: 'Chaquetilla ignífuga', quantity: 1, unitPrice: 45.5, total: 45.5 },
      ],
    };

    const s200Tx = buildExtendedSpanishSqlOrderBatch('sage200', sampleOrder, 'A', 'ALM1');
    assert.ok(s200Tx.tsql.includes('INSERT INTO CabeceraPedidoCliente'));
    assert.ok(s200Tx.tsql.includes('INSERT INTO LineasPedidoCliente'));
    assert.ok(s200Tx.tsql.includes('UPDATE AcumuladosStock SET UnidadesReservadas'));

    const icgTx = buildExtendedSpanishSqlOrderBatch('icg', sampleOrder, 'P', '01');
    assert.ok(icgTx.tsql.includes('INSERT INTO PEDVENTACAB'));
    assert.ok(icgTx.tsql.includes('INSERT INTO PEDVENTALIN'));
    assert.ok(icgTx.tsql.includes('UPDATE STOCKS SET ASIGNADO'));

    const vwTx = buildExtendedSpanishSqlOrderBatch('visionwin', sampleOrder, '1', '1');
    assert.ok(vwTx.tsql.includes('INSERT INTO PEDIDOS_CLI'));
    assert.ok(vwTx.tsql.includes('INSERT INTO LINEAS_PEDIDOS_CLI'));
    assert.ok(vwTx.tsql.includes('UPDATE STOCK_ALMACEN SET RESERVADO'));

    const apTx = buildExtendedSpanishSqlOrderBatch('aplifisa', sampleOrder, 'A', '01');
    assert.ok(apTx.tsql.includes('INSERT INTO PEDIDOSCLI_CAB'));
    assert.ok(apTx.tsql.includes('INSERT INTO PEDIDOSCLI_LIN'));
    assert.ok(apTx.tsql.includes('UPDATE EXISTENCIAS SET RESERVADO'));

    const bcTx = buildExtendedSpanishSqlOrderBatch('businesscentral', sampleOrder, 'PED', 'PRINCIPAL');
    assert.ok(bcTx.tsql.includes('INSERT INTO [CRONUS$Sales Header]'));
    assert.ok(bcTx.tsql.includes('INSERT INTO [CRONUS$Sales Line]'));
    console.log('  ✓ Atomic T-SQL transaction batches (Header + Lines + Stock) verified for sage200, icg, visionwin, aplifisa, businesscentral');

    // 4. Verify Real HTTP RPC / REST Order & Catalog Execution for Odoo, FacturaScripts, and Business Central Cloud
    const mockServer = http.createServer((req, res) => {
      let reqBody = '';
      req.on('data', (chunk) => (reqBody += chunk));
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        const u = (req.url || '').replace(/^\/api\/v2\.0(?=\/)/, '');
        // Odoo JSON-RPC
        if (u === '/jsonrpc') {
          const rpc = JSON.parse(reqBody || '{}');
          const { service, method, args } = rpc.params || {};
          if (service === 'common' && method === 'authenticate') {
            res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: 7 }));
            return;
          }
          const model = args?.[3];
          const op = args?.[4];
          if (model === 'product.product' && op === 'search_count') {
            res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: 2 }));
            return;
          }
          if (model === 'product.product' && op === 'search_read') {
            res.end(
              JSON.stringify({
                jsonrpc: '2.0',
                id: rpc.id,
                result: [
                  { id: 101, default_code: 'ART-101', name: 'Taladro Odoo', list_price: 50, standard_price: 30, free_qty: 14, barcode: '8410000101', categ_id: [1, 'Herramientas'] },
                ],
              })
            );
            return;
          }
          if (model === 'res.partner' && op === 'search') {
            res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: [55] }));
            return;
          }
          if (model === 'product.product' && op === 'search') {
            res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: [101] }));
            return;
          }
          if (model === 'sale.order' && op === 'search') {
            res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: [] }));
            return;
          }
          if (model === 'sale.order' && op === 'create') {
            res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: 9042 }));
            return;
          }
        }
        // FacturaScripts API v3
        if (u.startsWith('/api/3/productos')) {
          res.end(JSON.stringify([{ referencia: 'ART-101', descripcion: 'Taladro FS', codfamilia: 'HER', precio: 50, stockfis: 12 }]));
          return;
        }
        if (u.startsWith('/api/3/variantes')) {
          res.end(JSON.stringify([{ referencia: 'ART-101', precio: 50, coste: 28, stockfis: 12, codbarras: '8410000101' }]));
          return;
        }
        if (u.startsWith('/api/3/stocks')) {
          res.end(JSON.stringify([{ referencia: 'ART-101', disponible: 12 }]));
          return;
        }
        if (u.startsWith('/api/3/crearPedidoCliente')) {
          res.end(JSON.stringify({ ok: true, doc: { codigo: 'PED-FS-2026-088' } }));
          return;
        }
        // Business Central OData API v2.0
        if (u === '/companies') {
          res.end(JSON.stringify({ value: [{ id: 'comp-es-01', name: 'Suministros Iberia S.L.' }] }));
          return;
        }
        if (u.includes('/items')) {
          res.end(
            JSON.stringify({
              value: [
                { id: 'it-1', number: 'ART-101', displayName: 'Taladro BC', itemCategoryCode: 'HERR', inventory: 22, unitPrice: 50, unitCost: 31, gtin: '8410000101', blocked: false },
              ],
            })
          );
          return;
        }
        if (u.endsWith('/salesOrders')) {
          res.end(JSON.stringify({ id: 'so-guid-1', number: 'SO-BC-1099' }));
          return;
        }
        if (u.endsWith('/salesOrderLines')) {
          res.end(JSON.stringify({ id: 'sol-guid-1' }));
          return;
        }
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
      });
    });

    await new Promise<void>((resolve) => mockServer.listen(0, '127.0.0.1', () => resolve()));
    const addr = mockServer.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    try {
      // Test Odoo Live RPC
      const odooConn = agent.erpRegistry.getConnector('odoo' as any) as any;
      odooConn.saveProviderConfig({ serverInstance: baseUrl, databaseName: 'odoo_es', username: 'admin', password: 'key', evaluationMode: false });
      const odooTest = await odooConn.testConnection(baseUrl);
      assert.strictEqual(odooTest.success, true);
      const odooOrder = await odooConn.createOrder(sampleOrder, 'SO', 'WH');
      assert.strictEqual(odooOrder.success, true);
      assert.strictEqual(odooOrder.externalId, 'SO-9042');

      // Test FacturaScripts Live API v3
      const fsConn = agent.erpRegistry.getConnector('facturascripts' as any) as any;
      fsConn.saveProviderConfig({ serverInstance: baseUrl, password: 'fs-token-123', evaluationMode: false });
      const fsTest = await fsConn.testConnection(baseUrl);
      assert.strictEqual(fsTest.success, true);
      const fsStock = await fsConn.getStockMap();
      assert.strictEqual(fsStock.get('ART-101'), 12);
      const fsOrder = await fsConn.createOrder(sampleOrder, 'A', 'ALG');
      assert.strictEqual(fsOrder.success, true);
      assert.strictEqual(fsOrder.orderNumber, 'PED-FS-2026-088');

      // Test Business Central Live OData API v2.0
      const bcConn = agent.erpRegistry.getConnector('businesscentral' as any) as any;
      bcConn.saveProviderConfig({ serverInstance: baseUrl, databaseName: 'Suministros Iberia S.L.', password: 'Bearer tok-bc', evaluationMode: false });
      const bcTest = await bcConn.testConnection(baseUrl);
      assert.strictEqual(bcTest.success, true);
      const bcCatalog = await bcConn.getArticlesForCatalog(10);
      assert.strictEqual(bcCatalog[0]?.code, 'ART-101');
      const bcOrder = await bcConn.createOrder(sampleOrder, 'SO', 'PRINCIPAL');
      assert.strictEqual(bcOrder.success, true);
      assert.strictEqual(bcOrder.orderNumber, 'SO-BC-1099');
      console.log('  ✓ Live HTTP RPC / REST / OData execution verified for Odoo, FacturaScripts, and Business Central');
    } finally {
      mockServer.close();
    }

    console.log('✓ All Multi-ERP Catalog Audit & Real Production Adapter tests passed!');
  } finally {
    try {
      await agent.stop();
    } catch {}
    delete process.env.BENTIAN_CONFIG_PATH;
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

runCatalogAuditTests().catch((err) => {
  console.error('Catalog Audit Test Failed:', err);
  process.exit(1);
});
