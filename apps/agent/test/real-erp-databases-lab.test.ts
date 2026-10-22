import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { LocalAgent } from '../src/agent';
import { buildSqlServerAtomicOrderBatch } from '../src/services/sql-erp-enhancer.service';

async function runRealErpDatabasesLabTests() {
  console.log('======================================================================');
  console.log('🧪 LABORATORIO DE BASES DE DATOS REALES MULTI-ERP (SIMPLYGEST, AGORA, SAGE 50, A3ERP)');
  console.log('======================================================================\n');

  // 1. Verificar generador T-SQL atómico para SQL Server
  console.log('1. Verificando generador T-SQL transaccional (BEGIN TRAN ... COMMIT TRAN)...');
  const sampleOrder: any = {
    id: 'WC-999',
    reference: 'WC-999',
    totalAmount: 150,
    customer: { fiscalName: 'Cliente SQL Server' },
    lines: [{ position: 1, sku: 'SKU-1', name: 'Producto 1', quantity: 2, unitPrice: 75, total: 150 }],
  };

  const agoraBatch = buildSqlServerAtomicOrderBatch('agora', sampleOrder, '1', '1');
  assert(agoraBatch.tsql.includes('BEGIN TRAN'));
  assert(agoraBatch.tsql.includes('ISNULL(MAX([Number]), 100) + 1'));
  assert(agoraBatch.tsql.includes('INSERT INTO CustomerOrderLine'));
  assert(agoraBatch.tsql.includes('UPDATE WarehouseStock'));

  const sageBatch = buildSqlServerAtomicOrderBatch('sage50', sampleOrder, 'A', '01');
  assert(sageBatch.tsql.includes("OBJECT_ID('c_pediven', 'U')"));
  assert(sageBatch.tsql.includes("OBJECT_ID('c_pedive', 'U')"));
  assert(sageBatch.tsql.includes('INSERT INTO d_pediven'));
  assert(sageBatch.tsql.includes('UPDATE stocks'));

  const a3Batch = buildSqlServerAtomicOrderBatch('a3erp', sampleOrder, 'W', 'GEN');
  assert(a3Batch.tsql.includes("OBJECT_ID('CABEPEV', 'U')"));
  assert(a3Batch.tsql.includes("OBJECT_ID('CABEPEDV', 'U')"));
  assert(a3Batch.tsql.includes('INSERT INTO LINEPEV'));
  assert(a3Batch.tsql.includes('UPDATE STOCKALM'));
  console.log('  ✓ Lotes T-SQL atómicos verificados para Ágora POS, Sage 50 y a3ERP.');

  const hasLabDbs =
    process.platform === 'win32' &&
    fs.existsSync('C:\\SimplyGest\\Datos.mdb') &&
    fs.existsSync('C:\\BentianLab\\AgoraDB.mdb') &&
    fs.existsSync('C:\\BentianLab\\GESTION.mdb') &&
    fs.existsSync('C:\\BentianLab\\A3ERP.mdb');

  if (!hasLabDbs) {
    console.log('ℹ️ Bases .mdb de laboratorio no presentes en esta máquina; omitiendo tests físicos.');
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bentian-real-erp-lab-'));
  process.env.BENTIAN_CONFIG_PATH = path.join(tempDir, 'agent-config.json');

  try {
    // 2. SimplyGest (Datos.mdb)
    console.log('2. Probando SimplyGest físico (Datos.mdb)...');
    const sgCopy = path.join(tempDir, 'Datos.mdb');
    fs.copyFileSync('C:\\SimplyGest\\Datos.mdb', sgCopy);
    const sgAgent = new LocalAgent({ erpType: 'simplygest', simplygestDbPath: sgCopy }, tempDir);
    const sgConn = await sgAgent.simplygestAdapter.reconnect(sgCopy);
    assert.strictEqual(sgConn.success, true);
    assert((sgConn.articleCount ?? 0) >= 5);
    const sgStockBefore = (await sgAgent.simplygestAdapter.getStockMap('GEN')).get('SG-1002') ?? 0;
    const sgRef = `WC-SG-${Date.now()}`;
    const sgOrder: any = {
      id: sgRef, orderNumber: '501', reference: sgRef, date: new Date(), status: 'processing', currency: 'EUR',
      netAmount: 190, taxAmount: 39.9, totalAmount: 229.9,
      customer: { id: 'C-SG-1', fiscalName: 'Comercial SimplyGest Real SL', taxId: 'B11223344', email: 'pedidos@simplygestreal.es' },
      lines: [{ position: 1, sku: 'SG-1002', name: 'Impresora Termica Tickets 80mm USB LAN', quantity: 2, unitPrice: 95, taxRate: 21, total: 190 }],
    };
    const sgRes1 = await sgAgent.simplygestAdapter.createOrder(sgOrder);
    assert.strictEqual(sgRes1.success, true);
    const sgRes2 = await sgAgent.simplygestAdapter.createOrder(sgOrder);
    assert.strictEqual(sgRes2.orderNumber, sgRes1.orderNumber, 'Idempotencia SimplyGest');
    const sgStockAfter = (await sgAgent.simplygestAdapter.getStockMap('GEN')).get('SG-1002') ?? 0;
    assert.strictEqual(sgStockAfter, sgStockBefore - 2);
    console.log(`  ✓ SimplyGest verificado: pedido #${sgRes1.orderNumber}, stock ${sgStockBefore} -> ${sgStockAfter}`);

    // 3. Ágora POS (AgoraDB.mdb)
    console.log('3. Probando Ágora POS físico (AgoraDB.mdb)...');
    const agCopy = path.join(tempDir, 'AgoraDB.mdb');
    fs.copyFileSync('C:\\BentianLab\\AgoraDB.mdb', agCopy);
    const agAgent = new LocalAgent({ erpType: 'agora' }, tempDir);
    const agConn = await agAgent.agoraAdapter.reconnect(`mssql://LOCAL_MDB/${agCopy}`, {
      serverInstance: 'LOCAL_MDB', databaseName: agCopy, evaluationMode: false,
    });
    assert.strictEqual(agConn.success, true);
    const agStockBefore = (await agAgent.agoraAdapter.getStockMap('1')).get('3001') ?? 0;
    const agRef = `WC-AG-${Date.now()}`;
    const agOrder: any = {
      id: agRef, orderNumber: '601', reference: agRef, notes: agRef, totalAmount: 104.7,
      customer: { fiscalName: 'Hosteleria Agora Real SL' },
      lines: [{ position: 1, sku: '3001', name: 'Estuche Vino Reserva Seleccion D.O. Rioja', quantity: 3, unitPrice: 34.9, total: 104.7 }],
    };
    const agRes1 = await agAgent.agoraAdapter.createOrder(agOrder, '1', '1');
    assert.strictEqual(agRes1.success, true);
    const agRes2 = await agAgent.agoraAdapter.createOrder(agOrder, '1', '1');
    assert.strictEqual(agRes2.orderNumber, agRes1.orderNumber, 'Idempotencia Ágora POS');
    const agStockAfter = (await agAgent.agoraAdapter.getStockMap('1')).get('3001') ?? 0;
    assert.strictEqual(agStockAfter, agStockBefore - 3);
    console.log(`  ✓ Ágora POS verificado: pedido #${agRes1.orderNumber}, stock ${agStockBefore} -> ${agStockAfter}`);

    // 4. Sage 50 (GESTION.mdb)
    console.log('4. Probando Sage 50 físico (GESTION.mdb)...');
    const s50Copy = path.join(tempDir, 'GESTION.mdb');
    fs.copyFileSync('C:\\BentianLab\\GESTION.mdb', s50Copy);
    const s50Agent = new LocalAgent({ erpType: 'sage50' }, tempDir);
    const s50Conn = await s50Agent.sage50Adapter.reconnect(`mssql://LOCAL_MDB/${s50Copy}`, {
      serverInstance: 'LOCAL_MDB', databaseName: s50Copy, evaluationMode: false,
    });
    assert.strictEqual(s50Conn.success, true);
    const s50StockBefore = (await s50Agent.sage50Adapter.getStockMap('01')).get('S50-4001') ?? 0;
    const s50Ref = `WC-S50-${Date.now()}`;
    const s50Order: any = {
      id: s50Ref, orderNumber: '701', reference: s50Ref, notes: s50Ref, totalAmount: 438,
      customer: { fiscalName: 'Instalaciones Sage50 Real SL' },
      lines: [{ position: 1, sku: 'S50-4001', name: 'Taladro Percutor Brushless 18V 2x5.0Ah', quantity: 2, unitPrice: 219, total: 438 }],
    };
    const s50Res1 = await s50Agent.sage50Adapter.createOrder(s50Order, '1', '01');
    assert.strictEqual(s50Res1.success, true);
    const s50Res2 = await s50Agent.sage50Adapter.createOrder(s50Order, '1', '01');
    assert.strictEqual(s50Res2.orderNumber, s50Res1.orderNumber, 'Idempotencia Sage 50');
    const s50StockAfter = (await s50Agent.sage50Adapter.getStockMap('01')).get('S50-4001') ?? 0;
    assert.strictEqual(s50StockAfter, s50StockBefore - 2);
    console.log(`  ✓ Sage 50 verificado: pedido #${s50Res1.orderNumber}, stock ${s50StockBefore} -> ${s50StockAfter}`);

    // 5. a3ERP (A3ERP.mdb)
    console.log('5. Probando Wolters Kluwer a3ERP físico (A3ERP.mdb)...');
    const a3Copy = path.join(tempDir, 'A3ERP.mdb');
    fs.copyFileSync('C:\\BentianLab\\A3ERP.mdb', a3Copy);
    const a3Agent = new LocalAgent({ erpType: 'a3erp' }, tempDir);
    const a3Conn = await a3Agent.a3erpAdapter.reconnect(`mssql://LOCAL_MDB/${a3Copy}`, {
      serverInstance: 'LOCAL_MDB', databaseName: a3Copy, evaluationMode: false,
    });
    assert.strictEqual(a3Conn.success, true);
    const a3StockBefore = (await a3Agent.a3erpAdapter.getStockMap('GEN')).get('A3-5001') ?? 0;
    const a3Ref = `WC-A3-${Date.now()}`;
    const a3Order: any = {
      id: a3Ref, orderNumber: '801', reference: a3Ref, notes: a3Ref, totalAmount: 256,
      customer: { fiscalName: 'Ingenieria Industrial A3 Real SA' },
      lines: [{ position: 1, sku: 'A3-5001', name: 'Valvula Hidraulica Solenoide 2P 24V AC', quantity: 4, unitPrice: 64, total: 256 }],
    };
    const a3Res1 = await a3Agent.a3erpAdapter.createOrder(a3Order, 'A', 'GEN');
    assert.strictEqual(a3Res1.success, true);
    const a3Res2 = await a3Agent.a3erpAdapter.createOrder(a3Order, 'A', 'GEN');
    assert.strictEqual(a3Res2.orderNumber, a3Res1.orderNumber, 'Idempotencia a3ERP');
    const a3StockAfter = (await a3Agent.a3erpAdapter.getStockMap('GEN')).get('A3-5001') ?? 0;
    assert.strictEqual(a3StockAfter, a3StockBefore - 4);
    console.log(`  ✓ a3ERP verificado: pedido #${a3Res1.orderNumber}, stock ${a3StockBefore} -> ${a3StockAfter}`);

    console.log('\n✅ TODAS LAS PRUEBAS DEL LABORATORIO REAL MULTI-ERP PASARON CON ÉXITO\n');
  } finally {
    delete process.env.BENTIAN_CONFIG_PATH;
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

runRealErpDatabasesLabTests().catch((err) => {
  console.error('❌ Error en laboratorio real Multi-ERP:', err);
  process.exit(1);
});
