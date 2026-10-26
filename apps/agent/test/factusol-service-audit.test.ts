import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigManager } from '../src/config/config.manager';
import { FactusolService, FactusolOfflineError } from '../src/factusol/factusol.service';
import { FactusolAdapter } from '../src/erp/adapters/factusol.adapter';
import { FactusolPathResolver } from '../src/factusol/factusol.resolver';
import { PrestashopSyncHelper } from '../src/sync/prestashop-sync.helper';
import { TestOrderSimulatorService } from '../src/orders/test-order-simulator.service';

/**
 * Auditoría ERP 2026-10-25 · Factusol F1, F5, F9, F17 (capa del agente).
 * Aislamiento de config: BENTIAN_CONFIG_PATH apunta a un directorio temporal (nunca a %APPDATA%).
 */
async function run() {
  console.log('--- Running Factusol service audit tests ---');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bentian-factusol-audit-'));
  process.env.BENTIAN_CONFIG_PATH = path.join(tempDir, 'agent-config.json');

  try {
    // Carpeta con tres ejercicios (ficheros vacíos: solo se prueba la resolución de rutas, no OLEDB)
    const dataDir = path.join(tempDir, 'Datos; Empresa=1');
    fs.mkdirSync(dataDir, { recursive: true });
    const year = new Date().getFullYear();
    const oldFile = path.join(dataDir, `2252024.accdb`);
    const prevFile = path.join(dataDir, `225${year - 1}.accdb`);
    const curFile = path.join(dataDir, `225${year}.accdb`);
    for (const f of [oldFile, prevFile, curFile]) fs.writeFileSync(f, 'x');

    const configManager = new ConfigManager();
    const service = new FactusolService(configManager);
    const adapter = new FactusolAdapter(configManager, service);

    // F5: getSettings lee softwareErp.providers.factusol.* con prioridad sobre factusol.*; serie por defecto única '1'
    configManager.update({
      factusol: { databasePath: prevFile, orderSeries: 'Z', warehouseCode: 'GEN', tariffCode: '3' },
      softwareErp: {
        activeProvider: 'factusol',
        provisioned: true,
        providers: { factusol: { databasePath: prevFile, orderSeries: 'W', warehouseCode: '02' } },
      },
    } as any);
    const s = service.getSettings();
    assert.strictEqual(s.orderSeries, 'W', 'F5: providers.factusol tiene prioridad');
    assert.strictEqual(s.warehouseCode, '02');
    assert.strictEqual(s.tariffCode, '3', 'F5: lo no definido en providers cae a factusol.*');
    configManager.update({ factusol: { databasePath: prevFile }, softwareErp: { activeProvider: 'factusol', provisioned: true, providers: { factusol: { databasePath: prevFile } } } } as any);
    const s2 = service.getSettings();
    assert.strictEqual(s2.orderSeries, '1', 'F5: serie por defecto única');
    assert.strictEqual(s2.warehouseCode, 'GEN');

    // F1: la ruta a abrir es la del ejercicio activo resuelto por FactusolYearResolver
    const active = service.resolveActiveDbPath();
    assert.strictEqual(path.resolve(active.configuredPath), path.resolve(prevFile), 'la ruta configurada no se toca (anti-wiping)');
    assert.strictEqual(path.resolve(active.activePath), path.resolve(curFile), 'F1: se usa el ejercicio actual, no el año viejo');
    assert.ok(active.switchedYear && active.exists);
    assert.strictEqual(configManager.get().factusol?.databasePath, prevFile, 'la config persistida no se sobrescribe');

    // F1: con autoRollover desactivado se respeta la ruta configurada
    configManager.update({ factusol: { databasePath: prevFile, autoRollover: false } } as any);
    assert.strictEqual(path.resolve(service.resolveActiveDbPath().activePath), path.resolve(prevFile));
    configManager.update({ factusol: { databasePath: prevFile, autoRollover: true } } as any);

    // F9: ruta inexistente/offline => getStockMap LANZA (no devuelve un mapa vacío) y la ruta sigue guardada
    const offlinePath = path.join(tempDir, 'NoExiste', '0012026.accdb');
    configManager.update({ factusol: { databasePath: offlinePath }, softwareErp: { activeProvider: 'factusol', provisioned: true, providers: { factusol: { databasePath: offlinePath } } } } as any);
    await assert.rejects(service.getStockMap('GEN'), (e: any) => e instanceof FactusolOfflineError);
    await assert.rejects(adapter.getStockMap('GEN'), (e: any) => e instanceof FactusolOfflineError);
    await assert.rejects(adapter.getArticlesForCatalog(10), (e: any) => e instanceof FactusolOfflineError);
    assert.strictEqual(adapter.isDatabaseAccessible(), false);
    assert.strictEqual(configManager.get().factusol?.databasePath, offlinePath, 'anti-wiping: la ruta offline permanece');
    const preview = await service.getPreviewArticles(undefined, 5);
    assert.strictEqual(preview.offline, true, 'F9: preview distingue offline de vacío');
    const meta = await service.getMetadata();
    assert.strictEqual(meta.offline, true);
    assert.strictEqual(meta.source, 'defaults');
    assert.strictEqual(await service.getArticleCount(), undefined);

    // F9: createOrder offline => error explícito, no excepción ni éxito falso
    const orderRes = await adapter.createOrder({ id: '1', orderNumber: 'X', lines: [], customer: {} } as any, '1', 'GEN');
    assert.strictEqual(orderRes.success, false);
    assert.ok(/offline|accesible/i.test(String(orderRes.error)));

    // F10/UNC: rutas con espacios y ; = se limpian sin perder caracteres
    assert.strictEqual(FactusolPathResolver.cleanPath('"\\\\NAS EMPRESA\\Datos; v=1\\0012026.accdb"'), '\\\\NAS EMPRESA\\Datos; v=1\\0012026.accdb');

    // F17: resolver de carpeta prefiere el ejercicio más alto de la misma empresa aunque otro fichero tenga mtime más reciente
    const now = Date.now() / 1000;
    fs.utimesSync(curFile, now - 7200, now - 7200);
    fs.utimesSync(prevFile, now, now); // ejercicio anterior "tocado" más tarde
    const resolved = FactusolPathResolver.resolve(dataDir);
    assert.ok(resolved.success);
    assert.strictEqual(path.resolve(resolved.resolvedPath), path.resolve(curFile), 'F17: ejercicio más reciente de la empresa');

    // PrestashopSyncHelper: fallback directo usa buildStockSumQuery (ARTSTO, nunca CODSTO inexistente)
    {
      let capturedSql = '';
      let updatedBatch: any[] = [];
      const psHelper = new PrestashopSyncHelper({
        configManager,
        prestashopFactory: () => ({
          testConnection: async () => true,
          updateStockBatch: async (items: any[]) => {
            updatedBatch = items;
            return { updated: items.length, skipped: 0, errors: [] };
          },
        } as any),
        accessDriverFactory: () => ({
          query: async (sql: string) => {
            capturedSql = sql;
            return [{ ARTSTO: '001', DISSTO: 7 }];
          },
        } as any),
      });
      configManager.update({
        factusol: { databasePath: curFile, warehouseCode: '02' },
        softwareErp: { activeProvider: 'factusol', provisioned: true, providers: { factusol: { databasePath: curFile, warehouseCode: '02' } } },
        prestashop: { shopUrl: 'https://ps.test', apiKey: 'key123' },
      } as any);
      const psRes = await psHelper.syncStockToPrestashop();
      assert.strictEqual(psRes.synced, 1);
      assert.ok(!capturedSql.includes('CODSTO'), 'PrestashopSyncHelper no debe consultar columna inexistente CODSTO');
      assert.ok(capturedSql.includes('ARTSTO') && capturedSql.includes("ALMSTO = '02'"), 'usa buildStockSumQuery con ARTSTO y almacén configurado');
      assert.deepStrictEqual(updatedBatch, [{ sku: '001', quantity: 7 }]);
    }

    // TestOrderSimulatorService: respeta softwareErp.providers.factusol y autoRollover al ejercicio activo
    {
      configManager.update({
        factusol: { databasePath: prevFile, orderSeries: 'Z', warehouseCode: 'GEN', autoRollover: true },
        softwareErp: {
          activeProvider: 'factusol',
          provisioned: true,
          providers: { factusol: { databasePath: prevFile, orderSeries: 'W', warehouseCode: '02' } },
        },
      } as any);
      const simDriver = {
        query: async (sql: string) => {
          if (/MAX\(CODPCL\)/.test(sql)) return [{ maxid: 9 }];
          return [];
        },
        executeTransaction: async () => {},
      };
      const sim = new TestOrderSimulatorService(configManager, undefined, undefined, service, simDriver as any);
      const simRes = await sim.simulateOrder({ dryRun: true });
      assert.strictEqual(simRes.success, true);
      assert.strictEqual(simRes.series, 'W', 'TestOrderSimulator usa la serie prioritaria de providers.factusol');
      assert.strictEqual(path.resolve(simRes.databasePath), path.resolve(curFile), 'TestOrderSimulator resuelve el ejercicio activo con FactusolYearResolver');
    }

    console.log('✓ Factusol service audit tests passed');
  } finally {
    delete process.env.BENTIAN_CONFIG_PATH;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error(err);
  delete process.env.BENTIAN_CONFIG_PATH;
  process.exit(1);
});
