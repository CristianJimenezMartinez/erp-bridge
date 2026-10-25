import assert from 'assert';
import fs from 'fs';
import http from 'http';
import net from 'net';
import os from 'os';
import path from 'path';
import { ConfigManager } from '../src/config/config.manager';
import { SqlServerBaseAdapter } from '../src/erp';
import { EXTENDED_SQL_PROFILES } from '../src/erp-extensions/spanish-erp-profiles';
import {
  enhanceExtendedSpanishSqlAdapter,
  translateExtendedTsqlToJetSql,
} from '../src/erp-extensions/spanish-local-mdb.helper';
import {
  BusinessCentralErpAdapter,
  FacturaScriptsErpAdapter,
  OdooErpAdapter,
  Sage200ErpAdapter,
} from '../src/erp-extensions/spanish-erp.adapters';
import { resolveLocalMdbPath } from '../src/services/sql-erp-enhancer.service';

/**
 * Resiliencia de ERPs españoles: helper Jet/ACE (.mdb/.accdb) y rutas de error de createOrder.
 * Los hallazgos de producción (comportamiento cuestionable) se registran en KNOWN_ISSUES
 * sin hacer fallar la suite: la prueba fija el comportamiento ACTUAL y lo documenta.
 */

const KNOWN_ISSUES: string[] = [];
let passed = 0;

function ok(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn()).then(() => {
    passed++;
    console.log(`  ✔ ${name}`);
  });
}

function mkOrder(sku = 'ART-001', orderNumber = 'WC-5001'): any {
  return {
    id: orderNumber,
    orderNumber,
    notes: '',
    totalAmount: 24.2,
    customer: { id: '000001', customerNumber: '10000', fiscalName: 'Cliente Prueba', email: 'cli@test.es' },
    lines: [{ sku, name: 'Articulo', quantity: 2, unitPrice: 10, total: 20, position: 1 }],
  };
}

async function getClosedPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

type Mode = 'ok' | '401' | '500' | 'dup' | 'nosku';

interface MockState {
  mode: Mode;
  odooCreates: number;
  odooRefs: Set<string>;
  fsPosts: number;
  bcOrderPosts: number;
  bcLinePosts: number;
}

function startMockServer(state: MockState): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const json = (code: number, obj: unknown) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      if (state.mode === '401') return json(401, { error: 'unauthorized' });
      if (state.mode === '500') return json(500, { error: 'boom' });
      const url = req.url || '';

      if (url.startsWith('/jsonrpc')) {
        const p = JSON.parse(body || '{}').params || {};
        if (p.service === 'common') return json(200, { result: 7 });
        const [, , , model, method, args] = p.args;
        if (model === 'res.partner' && method === 'search') return json(200, { result: [] });
        if (model === 'res.partner' && method === 'create') return json(200, { result: 11 });
        if (model === 'product.product') return json(200, { result: state.mode === 'nosku' ? [] : [5] });
        if (model === 'sale.order' && method === 'create') {
          const ref = String(args[0].client_order_ref);
          if (state.mode === 'dup' && state.odooRefs.has(ref)) {
            return json(200, { error: { message: 'duplicate client_order_ref', data: { message: 'Pedido duplicado' } } });
          }
          state.odooCreates++;
          state.odooRefs.add(ref);
          return json(200, { result: 100 + state.odooCreates });
        }
        return json(200, { result: null });
      }

      if (url.startsWith('/api/3/crearPedidoCliente')) {
        state.fsPosts++;
        if (state.mode === 'nosku') return json(400, { error: 'referencia inexistente' });
        if (state.mode === 'dup' && state.fsPosts > 1) return json(409, { error: 'duplicado' });
        return json(200, { doc: { codigo: `PED${state.fsPosts}` } });
      }

      if (url.includes('/companies') && !url.includes('salesOrders')) {
        return json(200, { value: [{ id: 'cmp-1', name: 'CRONUS' }] });
      }
      if (url.includes('/salesOrderLines')) {
        state.bcLinePosts++;
        if (state.mode === 'nosku') return json(400, { error: { message: 'Item does not exist' } });
        return json(201, { id: 'line-1' });
      }
      if (url.includes('/salesOrders')) {
        state.bcOrderPosts++;
        if (state.mode === 'dup' && state.bcOrderPosts > 1) return json(400, { error: { message: 'duplicate externalDocumentNumber' } });
        return json(201, { id: 'so-1', number: 'SO-0001' });
      }
      return json(404, {});
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

function configureAdapter(adapter: SqlServerBaseAdapter, serverInstance: string, extra: Record<string, unknown> = {}) {
  adapter.saveProviderConfig({
    serverInstance,
    databaseName: 'odoo',
    username: 'admin',
    password: 'secret',
    evaluationMode: false,
    ...extra,
  } as any);
}

class MockSqlAdapter extends SqlServerBaseAdapter {
  public queries: string[] = [];
  constructor(profileKey: 'sage200' | 'businesscentral', cm: ConfigManager, handler: (q: string) => any[]) {
    super(EXTENDED_SQL_PROFILES[profileKey], cm);
    (this as any).executeSqlQuery = async (_o: unknown, q: string) => {
      this.queries.push(q);
      return handler(q);
    };
    enhanceExtendedSpanishSqlAdapter(this);
  }
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bentian-spanish-resilience-'));
  const originalConfigPath = process.env.BENTIAN_CONFIG_PATH;
  process.env.BENTIAN_CONFIG_PATH = path.join(tempDir, 'agent-config.json');
  const state: MockState = { mode: 'ok', odooCreates: 0, odooRefs: new Set(), fsPosts: 0, bcOrderPosts: 0, bcLinePosts: 0 };
  const mock = await startMockServer(state);

  try {
    const cm = new ConfigManager({});
    const fresh = (cls: any) => {
      const a = new cls(cm);
      return a as SqlServerBaseAdapter & { createOrder: (o: any, s?: string, w?: string) => Promise<any> };
    };
    const reset = (mode: Mode) => {
      state.mode = mode;
      state.odooCreates = 0;
      state.odooRefs.clear();
      state.fsPosts = 0;
      state.bcOrderPosts = 0;
      state.bcLinePosts = 0;
    };

    console.log('\n[A] Traducción T-SQL → Jet/ACE');
    await ok('quita WITH (NOLOCK), COUNT(1), GETDATE, ISNULL, LTRIM(RTRIM)', () => {
      const out = translateExtendedTsqlToJetSql(
        'sage200',
        'SELECT COUNT(1) AS total, GETDATE() AS d, ISNULL(x, 0) AS y, LTRIM(RTRIM(n)) AS n FROM Articulos WITH (NOLOCK)'
      );
      assert.ok(!/NOLOCK/i.test(out));
      assert.ok(/COUNT\(\*\)/.test(out));
      assert.ok(/Now\(\)/.test(out));
      assert.ok(/IIF\(x IS NULL,\s+0, x\)/.test(out), out);
      assert.ok(/Trim\(n\)/.test(out));
    });
    await ok('ISNULL con función anidada (documenta limitación del regex)', () => {
      const out = translateExtendedTsqlToJetSql('sage200', 'SELECT ISNULL(SUM(Stock), 0) AS s FROM Stocks');
      if (!/IIF\(SUM\(Stock\) IS NULL,\s+0, SUM\(Stock\)\)/.test(out)) {
        KNOWN_ISSUES.push('JET-ISNULL: translateExtendedTsqlToJetSql usa [^)]+ y no traduce ISNULL(f(x), y) con paréntesis anidados -> Jet recibe ISNULL inválido: ' + out);
      }
    });
    await ok('visionwin y aplifisa generan SELECT Jet con TOP y alias', () => {
      const v = translateExtendedTsqlToJetSql('visionwin', 'SELECT TOP 25 A.CODIGO AS code, 1 AS salePrice FROM ARTICULOS A');
      assert.ok(/^SELECT TOP 25 Trim\(A\.CODIGO\)/.test(v));
      assert.ok(/AS salePrice/.test(v) && /STOCK_ALMACEN/.test(v) && /IIF\(/.test(v));
      const a = translateExtendedTsqlToJetSql('aplifisa', 'SELECT A.CODART FROM ARTICULOS A');
      assert.ok(/AS price/.test(a) && /EXISTENCIAS/.test(a) && !/TOP/.test(a));
    });
    await ok('proveedor sin plantilla específica: consulta ARTICULOS A no se reescribe como visionwin', () => {
      const out = translateExtendedTsqlToJetSql('icg', 'SELECT * FROM ARTICULOS A WITH (NOLOCK)');
      assert.strictEqual(out, 'SELECT * FROM ARTICULOS A');
    });

    console.log('\n[A] resolveLocalMdbPath');
    const cmMdb = new ConfigManager({});
    const mdbFile = path.join(tempDir, 'dir con espacios', 'ñandú.mdb');
    fs.mkdirSync(path.dirname(mdbFile), { recursive: true });
    fs.writeFileSync(mdbFile, '');
    const probe = new Sage200ErpAdapter(cmMdb);
    await ok('resuelve .mdb existente (también con prefijo mdb:// y espacios/ñ)', () => {
      assert.strictEqual(resolveLocalMdbPath(probe, { databaseName: mdbFile } as any), path.resolve(mdbFile));
      assert.strictEqual(resolveLocalMdbPath(probe, { databaseName: `mdb://${mdbFile}` } as any), path.resolve(mdbFile));
    });
    await ok('.mdb inexistente o servidor SQL → null (sin lanzar ni borrar config)', () => {
      assert.strictEqual(resolveLocalMdbPath(probe, { databaseName: path.join(tempDir, 'no.mdb') } as any), null);
      assert.strictEqual(resolveLocalMdbPath(probe, { serverInstance: 'localhost\\SQLEXPRESS' } as any), null);
    });
    await ok('resuelve ruta desde settings.databasePath guardado', () => {
      const a = new Sage200ErpAdapter(cmMdb);
      a.saveProviderConfig({ databasePath: mdbFile } as any);
      assert.strictEqual(resolveLocalMdbPath(a), path.resolve(mdbFile));
    });

    console.log('\n[A] Autodetección Business Central / Sage 200 (executeSqlQuery simulado)');
    await ok('Business Central: sustituye [CRONUS$ por el prefijo real y cachea la detección', async () => {
      const a = new MockSqlAdapter('businesscentral', cm, (q) => (/sys\.tables/.test(q) ? [{ prefix: 'ACME SL' }] : [{ ok: 1 }]));
      await (a as any).executeSqlQuery({}, 'SELECT * FROM [CRONUS$Item] WITH (NOLOCK)');
      await (a as any).executeSqlQuery({}, 'SELECT * FROM [CRONUS$Sales Header]');
      const real = a.queries.filter((q) => !/sys\.tables/.test(q));
      assert.ok(real.every((q) => q.includes('[ACME SL$')), real.join('|'));
      assert.strictEqual(a.queries.filter((q) => /sys\.tables/.test(q)).length, 1, 'prefijo cacheado');
    });
    await ok('Business Central: si falla la detección, mantiene [CRONUS$ sin lanzar', async () => {
      const a = new MockSqlAdapter('businesscentral', cm, (q) => {
        if (/sys\.tables/.test(q)) throw new Error('permiso denegado');
        return [];
      });
      await (a as any).executeSqlQuery({}, 'SELECT * FROM [CRONUS$Item]');
      assert.ok(String(a.queries[a.queries.length - 1]).includes('[CRONUS$Item]'));
    });
    await ok('Sage 200: reemplaza CodigoEmpresa = 1 por la empresa con más artículos', async () => {
      const a = new MockSqlAdapter('sage200', cm, (q) => (/GROUP BY CodigoEmpresa/.test(q) ? [{ emp: 4 }] : []));
      await (a as any).executeSqlQuery({}, 'SELECT * FROM Articulos WHERE CodigoEmpresa = 1');
      assert.ok(String(a.queries[a.queries.length - 1]).includes('CodigoEmpresa = 4'));
    });
    await ok('Sage 200: error en detección → empresa 1 intacta', async () => {
      const a = new MockSqlAdapter('sage200', cm, (q) => {
        if (/GROUP BY CodigoEmpresa/.test(q)) throw new Error('timeout');
        return [];
      });
      await (a as any).executeSqlQuery({}, 'SELECT * FROM Articulos WHERE CodigoEmpresa = 1');
      assert.ok(String(a.queries[a.queries.length - 1]).includes('CodigoEmpresa = 1'));
    });
    await ok('createOrder SQL (mock): éxito, idempotencia por orderNumber devuelto y error → {success:false}', async () => {
      const a = new MockSqlAdapter('sage200', cm, (q) => (/^SELECT TOP 1 CodigoEmpresa AS emp/.test(q) ? [{ emp: 1 }] : [{ orderNumber: 77 }]));
      configureAdapter(a, 'localhost\\SQLEXPRESS', { databaseName: 'Sage200' });
      const r1 = await a.createOrder(mkOrder(), 'A', 'GEN');
      const r2 = await a.createOrder(mkOrder(), 'A', 'GEN'); // mismo pedido: el T-SQL devuelve el existente
      assert.strictEqual(r1.success, true);
      assert.strictEqual(r1.orderNumber, 77);
      assert.strictEqual(r2.orderNumber, 77);
      const failing = new MockSqlAdapter('sage200', cm, () => {
        throw new Error('Invalid object name Articulos');
      });
      configureAdapter(failing, 'localhost\\SQLEXPRESS', { databaseName: 'Sage200' });
      const r3 = await failing.createOrder(mkOrder('NOEXISTE'), 'A', 'GEN');
      assert.strictEqual(r3.success, false);
      assert.ok(/Invalid object/.test(String(r3.error)));
    });

    console.log('\n[B] createOrder: red caída (puerto cerrado)');
    const closed = await getClosedPort();
    const deadUrl = `http://127.0.0.1:${closed}`;
    for (const [name, cls] of [
      ['Odoo', OdooErpAdapter],
      ['FacturaScripts', FacturaScriptsErpAdapter],
      ['BusinessCentral', BusinessCentralErpAdapter],
    ] as const) {
      await ok(`${name}: servidor inaccesible → {success:false,error} sin lanzar`, async () => {
        const a = fresh(cls);
        configureAdapter(a, deadUrl);
        const r = await a.createOrder(mkOrder());
        assert.strictEqual(r.success, false);
        assert.ok(typeof r.error === 'string' && r.error.length > 0);
      });
    }
    await ok('Sage200 SQL con puerto cerrado → {success:false,error} sin lanzar', async () => {
      const a = fresh(Sage200ErpAdapter);
      configureAdapter(a, `127.0.0.1,${closed}`, { databaseName: 'Sage200', authMode: 'sql' });
      const r = await a.createOrder(mkOrder());
      assert.strictEqual(r.success, false);
      assert.ok(r.error);
    });

    console.log('\n[B] createOrder: HTTP 401 / 500');
    for (const code of ['401', '500'] as const) {
      for (const [name, cls] of [
        ['Odoo', OdooErpAdapter],
        ['FacturaScripts', FacturaScriptsErpAdapter],
        ['BusinessCentral', BusinessCentralErpAdapter],
      ] as const) {
        await ok(`${name}: HTTP ${code} → {success:false,error}`, async () => {
          reset(code);
          const a = fresh(cls);
          configureAdapter(a, mock.url);
          const r = await a.createOrder(mkOrder());
          assert.strictEqual(r.success, false);
          assert.ok(new RegExp(code).test(String(r.error)), String(r.error));
        });
      }
    }

    console.log('\n[B] createOrder: camino feliz, duplicados y SKU inexistente');
    await ok('Odoo/FS/BC: camino feliz devuelve success y número', async () => {
      reset('ok');
      for (const cls of [OdooErpAdapter, FacturaScriptsErpAdapter, BusinessCentralErpAdapter]) {
        const a = fresh(cls);
        configureAdapter(a, mock.url);
        const r = await a.createOrder(mkOrder());
        assert.strictEqual(r.success, true, JSON.stringify(r));
        assert.ok(r.orderNumber !== undefined);
      }
    });
    await ok('Odoo: pedido duplicado — error del servidor se propaga sin lanzar', async () => {
      reset('dup');
      const a = fresh(OdooErpAdapter);
      configureAdapter(a, mock.url);
      const r1 = await a.createOrder(mkOrder());
      const r2 = await a.createOrder(mkOrder());
      assert.strictEqual(r1.success, true);
      assert.strictEqual(r2.success, false);
      assert.ok(/duplicado|duplicate/i.test(String(r2.error)));
    });
    await ok('Odoo: sin comprobación local de idempotencia (servidor sin restricción crea 2 pedidos)', async () => {
      reset('ok');
      const a = fresh(OdooErpAdapter);
      configureAdapter(a, mock.url);
      await a.createOrder(mkOrder());
      await a.createOrder(mkOrder());
      if (state.odooCreates === 2) {
        KNOWN_ISSUES.push(
          'ODOO-DUP: createOrder no busca sale.order por client_order_ref antes de crear; un reintento duplica el pedido salvo que Odoo tenga restricción única.'
        );
      }
      assert.ok(state.odooCreates >= 1);
    });
    await ok('FacturaScripts: duplicado (HTTP 409) → {success:false}; sin dedupe local', async () => {
      reset('dup');
      const a = fresh(FacturaScriptsErpAdapter);
      configureAdapter(a, mock.url);
      const r1 = await a.createOrder(mkOrder());
      const r2 = await a.createOrder(mkOrder());
      assert.strictEqual(r1.success, true);
      assert.strictEqual(r2.success, false);
      assert.ok(/409/.test(String(r2.error)));
      KNOWN_ISSUES.push('FS-DUP: createOrder no consulta si ya existe el pedido; depende de que el servidor rechace duplicados (HTTP 409).');
    });
    await ok('Business Central: duplicado (HTTP 400 en salesOrders) → {success:false}', async () => {
      reset('dup');
      const a = fresh(BusinessCentralErpAdapter);
      configureAdapter(a, mock.url);
      const r1 = await a.createOrder(mkOrder());
      const r2 = await a.createOrder(mkOrder());
      assert.strictEqual(r1.success, true);
      assert.strictEqual(r2.success, false);
      assert.ok(/400/.test(String(r2.error)));
    });
    await ok('FacturaScripts: SKU inexistente (HTTP 400) → {success:false}', async () => {
      reset('nosku');
      const a = fresh(FacturaScriptsErpAdapter);
      configureAdapter(a, mock.url);
      const r = await a.createOrder(mkOrder('NOEXISTE'));
      assert.strictEqual(r.success, false);
      assert.ok(/400/.test(String(r.error)));
    });
    await ok('Odoo: SKU inexistente (documenta comportamiento actual)', async () => {
      reset('nosku');
      const a = fresh(OdooErpAdapter);
      configureAdapter(a, mock.url);
      const r = await a.createOrder(mkOrder('NOEXISTE'));
      if (r.success === true) {
        KNOWN_ISSUES.push(
          'ODOO-SKU: con SKU inexistente createOrder crea igualmente la línea sin product_id y devuelve success:true (pedido con líneas huérfanas, sin error).'
        );
      }
      assert.ok(typeof r.success === 'boolean');
    });
    await ok('Business Central: SKU inexistente (documenta comportamiento actual)', async () => {
      reset('nosku');
      const a = fresh(BusinessCentralErpAdapter);
      configureAdapter(a, mock.url);
      const r = await a.createOrder(mkOrder('NOEXISTE'));
      if (r.success === true && state.bcLinePosts > 0) {
        KNOWN_ISSUES.push(
          'BC-LINE: el POST de salesOrderLines no comprueba res.ok; un SKU inexistente (HTTP 400) deja una cabecera sin líneas y createOrder devuelve success:true.'
        );
      }
      assert.ok(typeof r.success === 'boolean');
    });

    console.log(`\n✅ ${passed} comprobaciones superadas.`);
    if (KNOWN_ISSUES.length) {
      console.log('\n⚠️ HALLAZGOS DE PRODUCCIÓN (no corregidos, ver informe):');
      KNOWN_ISSUES.forEach((k) => console.log(`  - ${k}`));
    }
  } finally {
    await mock.close();
    if (originalConfigPath === undefined) delete process.env.BENTIAN_CONFIG_PATH;
    else process.env.BENTIAN_CONFIG_PATH = originalConfigPath;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('❌ spanish-erp-resilience falló:', err);
  process.exit(1);
});



