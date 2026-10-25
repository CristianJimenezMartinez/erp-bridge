import assert from 'assert';
import { Logger } from '@erp-bridge/shared';
import { FACTUSOL_QUERIES, buildStockSumQuery, resolveStockWarehouse, normalizeStockQuantity } from '../src/queries';
import { sanitizeSqlLiteral, insertOrderLineQuery } from '../src/queries/order.queries';
import { buildSafeOledbConnectionString, sanitizeDatabasePath } from '../src/access-connection.helper';
import { FactusolOrderHandler } from '../src/handlers/order.handler';
import { FactusolProductHandler } from '../src/handlers/product.handler';
import { FactusolStockHandler } from '../src/handlers/stock.handler';
import { FactusolCustomerHandler } from '../src/handlers/customer.handler';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AccessDatabaseTimeoutError, AccessDriver } from '../src/access-driver';
import { DEFAULT_FACTUSOL_ORDER_SERIES } from '../src/factusol.types';

/**
 * Auditoría ERP 2026-10-25 · Factusol F1–F16 (parte del conector).
 * No toca ninguna base de datos real: usa un AccessDriver simulado.
 */
const logger = new Logger('FactusolAuditTest');

type Call = { kind: 'query' | 'execute' | 'transaction'; sql: string | string[] };

function fakeDriver(handler: (sql: string, calls: Call[]) => any[] | Promise<any[]>, txHandler?: (sqls: string[], n: number) => void | Promise<void>) {
  const calls: Call[] = [];
  let txCount = 0;
  return {
    calls,
    get txCount() { return txCount; },
    query: async (sql: string) => { calls.push({ kind: 'query', sql }); return handler(sql, calls); },
    execute: async (sql: string) => { calls.push({ kind: 'execute', sql }); },
    executeTransaction: async (sqls: string[]) => { calls.push({ kind: 'transaction', sql: sqls }); txCount++; if (txHandler) await txHandler(sqls, txCount); },
  } as any;
}

const baseOrder: any = {
  id: 'w1',
  orderNumber: 'WEB-1001',
  reference: 'WEB-1001',
  customer: { fiscalName: 'Cliente Web', email: 'a@b.c' },
  lines: [{ sku: 'ART1', name: 'Artículo 1', quantity: 2, unitPrice: 10, total: 20, vatPercent: 21 }],
  totalAmount: 24.2,
  netAmount: 20,
  date: new Date('2026-03-01T10:00:00Z'),
};

async function run() {
  console.log('--- Running Factusol audit fixes tests (F2-F16) ---');

  // ---------- F2 / F13: política única de stock ----------
  assert.strictEqual(resolveStockWarehouse(undefined), null);
  assert.strictEqual(resolveStockWarehouse(''), null);
  assert.strictEqual(resolveStockWarehouse(' gen '), null, 'GEN (cualquier caja) => todos los almacenes');
  assert.strictEqual(resolveStockWarehouse('02'), '02');
  const sumAll = buildStockSumQuery('GEN');
  assert.ok(!sumAll.includes('WHERE'), 'GEN/vacío suma todos los almacenes');
  const sumOne = buildStockSumQuery('02', ['A1']);
  assert.ok(sumOne.includes("ALMSTO = '02'") && sumOne.includes("ARTSTO IN ('A1')"));
  assert.ok(!/OR\s+ALMSTO/i.test(sumOne), "sin 'OR GEN' implícito");
  assert.ok(!FACTUSOL_QUERIES.getStock(['A1'], 'GEN').includes('ALMSTO ='));
  assert.ok(FACTUSOL_QUERIES.getStock(['A1'], '02').includes("ALMSTO = '02'"));
  assert.strictEqual(normalizeStockQuantity(-3), 0);
  assert.strictEqual(normalizeStockQuantity('4.6'), 5);
  console.log('V F2/F13 política única de stock');

  // F2: el handler de stock aplica la misma política (GEN => sin filtro de almacén)
  {
    const d = fakeDriver(() => []);
    await new FactusolStockHandler(d, { databasePath: 'x', defaultWarehouse: 'GEN' }, logger).readStock({});
    assert.ok(!String(d.calls[0].sql).includes('ALMSTO ='), 'readStock con GEN no filtra almacén');
    const d2 = fakeDriver(() => []);
    await new FactusolStockHandler(d2, { databasePath: 'x', defaultWarehouse: '02' }, logger).readStock({});
    assert.ok(String(d2.calls[0].sql).includes("ALMSTO = '02'"));
  }

  // ---------- F3 / F14: product handler ----------
  const articles = [{ CODART: 'A1', DESART: 'Uno', SUWART: 1 }, { CODART: 'A2', DESART: 'Dos', SUWART: 1 }];
  const okDriver = (failOn?: RegExp) => fakeDriver((sql) => {
    if (failOn && failOn.test(sql)) throw new Error('lock simulado');
    if (/FROM F_ART/.test(sql) && !/F_EAN/.test(sql)) return articles;
    if (/FROM F_STO/.test(sql)) return [{ ARTSTO: 'A1', ALMSTO: '01', ACTSTO: 5, DISSTO: 5 }, { ARTSTO: 'A1', ALMSTO: '02', ACTSTO: 3, DISSTO: 3 }];
    if (/FROM F_LTA/.test(sql)) return [{ TARLTA: 1, ARTLTA: 'A1', PRELTA: 9.9 }, { TARLTA: 1, ARTLTA: 'A2', PRELTA: 5 }];
    if (/FROM F_FAM/.test(sql)) return [];
    if (/FROM F_EAN/.test(sql)) return [];
    return [];
  });

  {
    const d = okDriver();
    const products = await new FactusolProductHandler(d, { databasePath: 'x', tariffCode: '1', defaultWarehouse: 'GEN' }, logger).readProducts({ activeOnly: true });
    assert.strictEqual(products.find((p) => p.sku === 'A1')!.stockQuantity, 8, 'catálogo suma todos los almacenes con GEN');
    const stockSql = d.calls.map((c: Call) => String(c.sql)).find((s: string) => /FROM F_STO/.test(s))!;
    assert.ok(!stockSql.includes('ALMSTO ='));
  }
  {
    const d = okDriver();
    await new FactusolProductHandler(d, { databasePath: 'x', tariffCode: '1', defaultWarehouse: '02' }, logger).readProducts({ activeOnly: true });
    const stockSql = d.calls.map((c: Call) => String(c.sql)).find((s: string) => /FROM F_STO/.test(s))!;
    assert.ok(stockSql.includes("ALMSTO = '02'"));
  }
  for (const re of [/FROM F_STO/, /FROM F_LTA/, /FROM F_FAM/, /FROM F_EAN/]) {
    await assert.rejects(
      new FactusolProductHandler(okDriver(re), { databasePath: 'x', tariffCode: '1' }, logger).readProducts({ activeOnly: true }),
      /lock simulado/,
      `F3: un fallo en ${re} debe propagarse (no precio 0/draft/stock 0)`
    );
  }
  {
    // fail-safe: ninguna tarifa con precio positivo => se aborta el lote
    const d = fakeDriver((sql) => {
      if (/FROM F_ART/.test(sql) && !/F_EAN/.test(sql)) return articles;
      return [];
    });
    await assert.rejects(
      new FactusolProductHandler(d, { databasePath: 'x', tariffCode: '1' }, logger).readProducts({ activeOnly: true }),
      /ningún precio positivo/
    );
    const ok = await new FactusolProductHandler(d, { databasePath: 'x', tariffCode: '1', allowEmptyPrices: true }, logger).readProducts({ activeOnly: true });
    assert.strictEqual(ok.length, 2);
  }
  {
    // F14: tarifa de venta == tarifa 1 distinta de la configurada => una sola consulta por tarifa
    const d = okDriver();
    await new FactusolProductHandler(d, { databasePath: 'x', tariffCode: '2', saleTariffCode: '1' }, logger).readProducts({ activeOnly: true });
    const ltaCalls = d.calls.filter((c: Call) => /FROM F_LTA/.test(String(c.sql)));
    assert.strictEqual(ltaCalls.length, 2, 'tarifas 2 y 1: una consulta cada una (sin repetir la 1)');
  }
  console.log('V F3/F14 product handler');

  // ---------- F4 / F5 / F7 / F8: createOrder ----------
  const cfg: any = { databasePath: 'x', orderSeries: undefined, defaultWarehouse: 'GEN' };
  const mkCustomerHandler = (d: any) => new FactusolCustomerHandler(d, logger);

  {
    // F5: serie y almacén del pedido se respetan; serie por defecto única
    const d = fakeDriver((sql) => (/MAX\(CODPCL\)/.test(sql) ? [{ maxid: 7 }] : []));
    const h = new FactusolOrderHandler(d, cfg, mkCustomerHandler(d), logger);
    const res = await h.createOrder({ ...baseOrder, series: 'W', warehouse: '02' });
    assert.ok(res.success, res.error);
    assert.strictEqual(res.externalId, '8');
    const tx = d.calls.find((c: Call) => c.kind === 'transaction').sql as string[];
    assert.ok(tx[0]!.includes("'W'") && tx[0]!.includes("'02'"), 'cabecera con serie/almacén del pedido');
    assert.ok(tx.some((s) => s.startsWith('UPDATE F_STO') && s.includes("ALMSTO = '02'")), 'el stock se descuenta en el almacén del pedido');
    const d2 = fakeDriver((sql) => (/MAX\(CODPCL\)/.test(sql) ? [{ maxid: 0 }] : []));
    const h2 = new FactusolOrderHandler(d2, cfg, mkCustomerHandler(d2), logger);
    await h2.createOrder({ ...baseOrder });
    const tx2 = d2.calls.find((c: Call) => c.kind === 'transaction').sql as string[];
    assert.ok(tx2[0]!.includes(`'${DEFAULT_FACTUSOL_ORDER_SERIES}'`));
  }

  {
    // F4: timeout => NO se reintenta a ciegas; se comprueba por REFPCL y, si no existe, se devuelve el error
    let refChecks = 0;
    const d = fakeDriver(
      (sql) => {
        if (/FROM F_PCL WHERE REFPCL/.test(sql)) { refChecks++; return []; }
        if (/MAX\(CODPCL\)/.test(sql)) return [{ maxid: 1 }];
        return [];
      },
      () => { throw new AccessDatabaseTimeoutError(); }
    );
    const h = new FactusolOrderHandler(d, cfg, mkCustomerHandler(d), logger);
    const res = await h.createOrder({ ...baseOrder });
    assert.strictEqual(res.success, false);
    assert.strictEqual(d.txCount, 1, 'tras timeout hay UN solo intento de transacción');
    assert.ok(refChecks >= 2, 'comprobación inicial + comprobación final por REFPCL');
  }
  {
    // F4: timeout tras el cual el pedido SÍ quedó confirmado => éxito idempotente, sin duplicar
    let committed = false;
    const d = fakeDriver(
      (sql) => {
        if (/FROM F_PCL WHERE REFPCL/.test(sql)) return committed ? [{ CODPCL: 41, ESTPCL: 0 }] : [];
        if (/MAX\(CODPCL\)/.test(sql)) return [{ maxid: 40 }];
        return [];
      },
      () => { committed = true; throw new AccessDatabaseTimeoutError(); }
    );
    const res = await new FactusolOrderHandler(d, cfg, mkCustomerHandler(d), logger).createOrder({ ...baseOrder });
    assert.ok(res.success);
    assert.strictEqual(res.externalId, '41');
    assert.strictEqual(d.txCount, 1);
  }
  {
    // F4: colisión de correlativo => reintento, re-comprobando idempotencia antes de cada reintento
    let refChecks = 0;
    const d = fakeDriver(
      (sql) => {
        if (/FROM F_PCL WHERE REFPCL/.test(sql)) { refChecks++; return []; }
        if (/MAX\(CODPCL\)/.test(sql)) return [{ maxid: 9 }];
        return [];
      },
      (_s, n) => { if (n === 1) throw new Error('Los valores duplicados en el índice, clave principal'); }
    );
    const res = await new FactusolOrderHandler(d, cfg, mkCustomerHandler(d), logger).createOrder({ ...baseOrder });
    assert.ok(res.success);
    assert.strictEqual(d.txCount, 2);
    assert.strictEqual(refChecks, 2, 'idempotencia: comprobación inicial + antes del reintento');
  }
  {
    // F4: error genérico sin referencia => no reintentar a ciegas
    const d = fakeDriver((sql) => (/MAX\(CODPCL\)/.test(sql) ? [{ maxid: 1 }] : []), () => { throw new Error('error raro'); });
    const res = await new FactusolOrderHandler(d, cfg, mkCustomerHandler(d), logger).createOrder({ ...baseOrder, reference: '', orderNumber: '' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(d.txCount, 1);
  }
  console.log('V F4/F5 createOrder idempotencia y serie/almacén');

  {
    // F7: el pedido NO se bloquea, pero se advierte; F8: cliente genérico configurable
    const warnings: string[] = [];
    const spyLogger: any = { info() {}, error() {}, debug() {}, warn: (m: string) => warnings.push(m) };
    const d = fakeDriver((sql) => {
      if (/MAX\(CODPCL\)/.test(sql)) return [{ maxid: 1 }];
      if (/SELECT ARTSTO, DISSTO FROM F_STO/.test(sql)) return []; // sin fila de stock
      if (/FROM F_CLI WHERE CODCLI/.test(sql)) return [];
      return [];
    });
    const res = await new FactusolOrderHandler(d, { ...cfg, guestCustomerCode: 5 }, mkCustomerHandler(d), spyLogger).createOrder({ ...baseOrder });
    assert.ok(res.success);
    assert.ok(warnings.some((w) => /no tiene fila en F_STO/.test(w)), 'F7 aviso de stock sin fila');
    assert.ok(warnings.some((w) => /CODCLI=5/.test(w)), 'F8 aviso de cliente genérico inexistente');
    const header = (d.calls.find((c: Call) => c.kind === 'transaction').sql as string[])[0]!;
    assert.ok(/'724',\s*0,\s*5,/.test(header), 'cabecera usa el cliente genérico configurado');
  }

  // ---------- F6: updateOrderStatus idempotente ----------
  {
    const mk = (est: number) => fakeDriver((sql) => {
      if (/SELECT ALMPCL, ESTPCL, TIPPCL FROM F_PCL/.test(sql)) return [{ ALMPCL: '02', ESTPCL: est, TIPPCL: '1' }];
      if (/FROM F_LPC/.test(sql)) return [{ ARTLPC: 'A1', CANLPC: 2 }];
      return [];
    });
    const dNew = mk(0);
    const r1 = await new FactusolOrderHandler(dNew, cfg, mkCustomerHandler(dNew), logger).updateOrderStatus('10', 'cancelled');
    assert.ok(r1.success);
    const tx = dNew.calls.find((c: Call) => c.kind === 'transaction');
    assert.ok(tx && (tx.sql as string[]).some((s) => s.includes('DISSTO + 2') && s.includes("ALMSTO = '02'")));
    const dDone = mk(4);
    const r2 = await new FactusolOrderHandler(dDone, cfg, mkCustomerHandler(dDone), logger).updateOrderStatus('10', 'refunded');
    assert.ok(r2.success);
    assert.ok(!dDone.calls.some((c: Call) => c.kind === 'transaction' || c.kind === 'execute'), 'ya anulado: ni reposición ni update');
    // lectura de líneas fallida => error (no se anula sin reponer)
    const dFail = fakeDriver((sql) => {
      if (/SELECT ALMPCL/.test(sql)) return [{ ALMPCL: '01', ESTPCL: 0, TIPPCL: '1' }];
      throw new Error('lock');
    });
    await assert.rejects(new FactusolOrderHandler(dFail, cfg, mkCustomerHandler(dFail), logger).updateOrderStatus('10', 'cancelled'), /lock/);
  }
  console.log('V F6 updateOrderStatus idempotente');

  // ---------- F10: rutas con ; y = ----------
  {
    const p = 'C:\\Datos;Empresa=1\\Factusol\\0012026.accdb';
    assert.doesNotThrow(() => sanitizeDatabasePath(p));
    const cs = buildSafeOledbConnectionString('Microsoft.ACE.OLEDB.12.0', p, true);
    assert.ok(cs.includes('Data Source="'), 'valor entrecomillado para que ; y = no rompan la cadena');
    assert.ok(cs.includes(p));
    const plain = buildSafeOledbConnectionString('Microsoft.ACE.OLEDB.12.0', '\\\\NAS EMPRESA\\Datos y más\\0012026.accdb', true);
    assert.ok(plain.includes('Data Source=\\\\NAS EMPRESA\\'), 'UNC con espacios sigue sin comillas');
    assert.throws(() => sanitizeDatabasePath('C:\\a"; Provider=evil;\\x.accdb'), /no permitidos/, 'comillas dobles siguen prohibidas (inyección)');
  }
  console.log('V F10 rutas con ; y =');

  // ---------- F15: literal <= 255 ----------
  {
    const lit = sanitizeSqlLiteral("O'" .repeat(300), 255);
    assert.ok(lit.length <= 255);
    assert.ok(!/(^|[^'])'([^']|$)/.test(lit.replace(/''/g, '')), 'nunca queda una comilla suelta');
    const sql = insertOrderLineQuery({ sku: 'A', name: 'N', quantity: 1, unitPrice: 1, description: 'x'.repeat(2000) } as any, 1, '1', 1);
    const memoMatch = sql.match(/'(x{200,})'/);
    assert.ok(memoMatch && memoMatch[1]!.length <= 255, 'MEMLPC limitado a 255');
  }
  console.log('V F15 literal memo limitado');

  // ---------- F11 / F12: AccessDriver (cola de escrituras y candidatos OLEDB) ----------
  if (process.platform === 'win32') {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'factusol-driver-'));
    const dbFile = path.join(tmp, 'Datos;Emp=1', '0012026.accdb');
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    fs.writeFileSync(dbFile, 'fake');
    try {
      // F11: dos escrituras concurrentes sobre la misma base se serializan (nunca solapadas)
      const d1 = new AccessDriver({ databasePath: dbFile, timeoutMs: 5000 });
      let running = 0;
      let maxRunning = 0;
      (d1 as any).runAdodb = async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((r) => setTimeout(r, 25));
        running--;
        return '[]';
      };
      await Promise.all([d1.execute('UPDATE A SET X=1'), d1.executeTransaction(['UPDATE B SET X=1']), d1.execute('UPDATE C SET X=1')]);
      assert.strictEqual(maxRunning, 1, 'F11: escrituras serializadas por base de datos');
      // las lecturas siguen siendo concurrentes
      running = 0; maxRunning = 0;
      await Promise.all([d1.query('SELECT 1'), d1.query('SELECT 2')]);
      assert.strictEqual(maxRunning, 2, 'lecturas concurrentes');
      // una escritura fallida no bloquea la cola
      (d1 as any).runAdodb = async () => { throw new Error('boom'); };
      await assert.rejects(d1.execute('UPDATE Z'), /boom/);
      (d1 as any).runAdodb = async () => '[]';
      await d1.execute('UPDATE OK');

      // F12: tras un error de proveedor, solo se prueba otro candidato mientras el error siga siendo de proveedor/arquitectura
      const d2 = new AccessDriver({ databasePath: dbFile });
      const attempts: string[] = [];
      (d2 as any).runAdodb = async () => { throw new Error('Class not registered'); };
      (d2 as any).runAdodbWith = async (_c: string, _a: string, input: string) => {
        attempts.push(input);
        throw new Error('Error de sintaxis en la instrucción INSERT INTO');
      };
      await assert.rejects(
        d2.executeTransaction(['INSERT INTO F_PCL VALUES (1)']),
        (err: any) => /Class not registered/.test(err.message) && /sintaxis/.test(err.message),
        'F12: el error original NO se oculta y se informa el del candidato'
      );
      assert.ok(attempts.length <= 1, 'F12: un error no atribuible a la arquitectura detiene los reintentos (sin repetir la transacción)');
      assert.ok(attempts.every((a) => a.includes('Data Source=\\"')) || attempts.length === 0, 'F10: ruta con ; entrecomillada');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    console.log('V F10/F11/F12 AccessDriver');
  }

  console.log('✓ Factusol audit fixes tests passed');}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
