import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { LocalAgent } from '../src/agent';
import { CatalogAuditController } from '../src/gui/router/controllers/catalog-audit.controller';
import { renderDashboardHtml } from '../src/gui/ui-template';
import { renderCatalogAuditTab } from '../src/gui/templates/views/catalog-audit.view';

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
    console.log('✓ All Multi-ERP Catalog Audit tests passed!');
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
