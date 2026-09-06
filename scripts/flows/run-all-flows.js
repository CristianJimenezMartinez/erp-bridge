const { MockWooCommerceServer } = require('./mock-woocommerce');
const { 
  ensureSeedData, 
  runAdodb, 
  executePostgres, 
  queryPostgresJson,
  ORG_ID 
} = require('./flow-helper');

const { runFlow1CatalogSync } = require('./flow-1-catalog-sync');
const { runFlow2StockSync } = require('./flow-2-stock-sync');
const { runFlow3WatcherReactive } = require('./flow-3-watcher-reactive');
const { runFlow4OrderIngestion } = require('./flow-4-order-ingestion');
const { runFlow5OrderStatusSync } = require('./flow-5-order-status');
const { runFlow6InvoiceGeneration } = require('./flow-6-invoice-generation');
const { runFlow7RetryResilience } = require('./flow-7-retry-resilience');

async function main() {
  console.log('#################################################################');
  console.log('##                                                             ##');
  console.log('##      BENTIAN ERP BRIDGE - SUITE COMPLETA DE FLUJOS REALES   ##');
  console.log('##      Factusol (.accdb) <==> PostgreSQL <==> WooCommerce     ##');
  console.log('##                                                             ##');
  console.log('#################################################################\n');

  const overallStart = Date.now();
  const results = [];

  // 1. Iniciar servidor simulado de WooCommerce en puerto 8090
  const mockWc = new MockWooCommerceServer(8090);
  await mockWc.start();

  let orderResult = null;
  let invoiceResult = null;

  try {
    // 2. Asegurar esquema y semillas en PostgreSQL
    console.log('[CONFIG] Comprobando infraestructura y semillas en PostgreSQL...');
    await ensureSeedData();
    console.log('[CONFIG] PostgreSQL listo y conectado en bentian-postgres:5434\n');

    // FLUJO 1: Sincronización de Catálogo
    const t1 = Date.now();
    try {
      const res1 = await runFlow1CatalogSync();
      results.push({ flow: '1. Catalogo (Factusol -> WooCommerce)', status: 'PASS', durationMs: Date.now() - t1, detail: `${res1.count} articulos sincronizados y mapeados` });
    } catch (e) {
      results.push({ flow: '1. Catalogo (Factusol -> WooCommerce)', status: 'FAIL', durationMs: Date.now() - t1, error: e.message });
      throw e;
    }

    // FLUJO 2: Sincronización de Stock
    const t2 = Date.now();
    try {
      const res2 = await runFlow2StockSync();
      results.push({ flow: '2. Stock (Factusol F_STO -> WooCommerce)', status: 'PASS', durationMs: Date.now() - t2, detail: `${res2.count} stocks actualizados` });
    } catch (e) {
      results.push({ flow: '2. Stock (Factusol F_STO -> WooCommerce)', status: 'FAIL', durationMs: Date.now() - t2, error: e.message });
      throw e;
    }

    // FLUJO 3: Watcher Reactivo de Cambios
    const t3 = Date.now();
    try {
      const res3 = await runFlow3WatcherReactive();
      results.push({ flow: '3. Watcher Reactivo (AccdbFileWatcher)', status: 'PASS', durationMs: Date.now() - t3, detail: `Debounce OK, ${res3.triggers} triggers -> 1 ejecucion` });
    } catch (e) {
      results.push({ flow: '3. Watcher Reactivo (AccdbFileWatcher)', status: 'FAIL', durationMs: Date.now() - t3, error: e.message });
      throw e;
    }

    // FLUJO 4: Ingesta Real de Pedido
    const t4 = Date.now();
    try {
      orderResult = await runFlow4OrderIngestion();
      results.push({ flow: '4. Ingesta de Pedido (WooCommerce -> Factusol)', status: 'PASS', durationMs: Date.now() - t4, detail: `Pedido Factusol ${orderResult.factusolSeries}-${orderResult.factusolCode} (Cliente #${orderResult.codCli})` });
    } catch (e) {
      results.push({ flow: '4. Ingesta de Pedido (WooCommerce -> Factusol)', status: 'FAIL', durationMs: Date.now() - t4, error: e.message });
      throw e;
    }

    // FLUJO 5: Actualización de Estado de Pedido (Almacén Factusol -> WooCommerce)
    const t5 = Date.now();
    try {
      const res5 = await runFlow5OrderStatusSync(orderResult);
      results.push({ flow: '5. Estado de Pedido (Factusol -> WooCommerce)', status: 'PASS', durationMs: Date.now() - t5, detail: `Factusol ESTPCL=2 -> WC status '${res5.status}'` });
    } catch (e) {
      results.push({ flow: '5. Estado de Pedido (Factusol -> WooCommerce)', status: 'FAIL', durationMs: Date.now() - t5, error: e.message });
      throw e;
    }

    // FLUJO 6: Generación y Vinculación de Factura
    const t6 = Date.now();
    try {
      invoiceResult = await runFlow6InvoiceGeneration(orderResult);
      results.push({ flow: '6. Facturacion (Factusol F_FAC / F_LFA)', status: 'PASS', durationMs: Date.now() - t6, detail: `Factura ${invoiceResult.invoiceSeries}-${invoiceResult.invoiceCode} vinculada al pedido` });
    } catch (e) {
      results.push({ flow: '6. Facturacion (Factusol F_FAC / F_LFA)', status: 'FAIL', durationMs: Date.now() - t6, error: e.message });
      throw e;
    }

    // FLUJO 7: Motor de Reintentos y Resiliencia
    const t7 = Date.now();
    try {
      const res7 = await runFlow7RetryResilience();
      results.push({ flow: '7. Resiliencia & Retry (Lock / Dead-Letter)', status: 'PASS', durationMs: Date.now() - t7, detail: `Recuperado en intento #${res7.recoveredAttempt}, fallos registrados en Postgres` });
    } catch (e) {
      results.push({ flow: '7. Resiliencia & Retry (Lock / Dead-Letter)', status: 'FAIL', durationMs: Date.now() - t7, error: e.message });
      throw e;
    }

  } finally {
    // Limpieza de datos temporales de prueba en Factusol para dejar la base de datos intacta
    console.log('\n[LIMPIEZA] Ejecutando limpieza controlada de datos de prueba en Factusol...');
    try {
      await runAdodb('execute', "DELETE FROM F_LFA WHERE TIPLFA = 'A'");
      await runAdodb('execute', "DELETE FROM F_FAC WHERE TIPFAC = 'A'");
      console.log('      OK: Facturas y lineas de prueba eliminadas de F_FAC y F_LFA');
    } catch (e) {
      console.warn('      Aviso en limpieza de F_FAC/F_LFA:', e.message);
    }

    try {
      await runAdodb('execute', "DELETE FROM F_LPC WHERE TIPLPC = 'W'");
      await runAdodb('execute', "DELETE FROM F_PCL WHERE TIPPCL = 'W'");
      console.log('      OK: Pedidos y lineas de prueba eliminados de F_PCL y F_LPC');
    } catch (e) {
      console.warn('      Aviso en limpieza de F_PCL/F_LPC:', e.message);
    }

    try {
      await runAdodb('execute', "DELETE FROM F_CLI WHERE CODCLI >= 10008");
      console.log('      OK: Clientes temporales eliminados de F_CLI');
    } catch (e) {
      console.warn('      Aviso en limpieza de F_CLI:', e.message);
    }

    // Detener servidor WooCommerce
    await mockWc.stop();
    console.log('[MOCK WC] Servidor mock detenido.');
  }

  const overallDuration = ((Date.now() - overallStart) / 1000).toFixed(2);

  // Informe final
  console.log('\n#################################################################');
  console.log('##                                                             ##');
  console.log('##                  RESUMEN DE EJECUCION FINAL                 ##');
  console.log('##                                                             ##');
  console.log('#################################################################');
  console.log(`Duracion total: ${overallDuration}s\n`);

  let allPass = true;
  for (const r of results) {
    const icon = r.status === 'PASS' ? ' [PASS] ' : ' [FAIL] ';
    console.log(`${icon} | ${r.flow.padEnd(46)} | ${(r.durationMs + 'ms').padStart(8)} | ${r.detail || r.error}`);
    if (r.status !== 'PASS') allPass = false;
  }

  console.log('\n-----------------------------------------------------------------');
  if (allPass) {
    console.log(' EXITO TOTAL: LOS 7 FLUJOS REALES SE HAN EJECUTADO Y VERIFICADO! ');
  } else {
    console.log(' ERROR: AL MENOS UN FLUJO HA FALLADO. REVISA LOS DETALLES ARRIBA. ');
  }
  console.log('-----------------------------------------------------------------\n');

  if (!allPass) process.exit(1);
}

main().catch(err => {
  console.error('\nERROR FATAL EN RUN-ALL-FLOWS:', err);
  process.exit(1);
});
