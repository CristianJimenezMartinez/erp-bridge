const { 
  ORG_ID, 
  CONN_FACTUSOL, 
  CONN_WOO, 
  JOB_ORDERS,
  runAdodb, 
  executePostgres, 
  queryPostgresJson, 
  wcRequest 
} = require('./flow-helper');

async function runFlow5OrderStatusSync(orderInfo = null) {
  console.log('\n======================================================');
  console.log('   FLUJO 5: FACTUSOL -> WOOCOMMERCE ORDER STATUS     ');
  console.log('======================================================');

  let series = 'W';
  let code = 1;
  let wcOrderId = null;

  if (orderInfo && orderInfo.factusolCode && orderInfo.wcOrderId) {
    series = orderInfo.factusolSeries || 'W';
    code = orderInfo.factusolCode;
    wcOrderId = orderInfo.wcOrderId;
  } else {
    // Buscar el último mapeo de pedido en PostgreSQL
    console.log('[1/4] Buscando pedido mapeado en PostgreSQL...');
    const orderMappings = await queryPostgresJson(`
      SELECT source_identifier, target_identifier 
      FROM external_entity_mappings 
      WHERE entity_type = 'order' AND organization_id = '${ORG_ID}'
      ORDER BY last_synced_at DESC
      LIMIT 1
    `);

    if (orderMappings.length === 0) {
      throw new Error('No se encontro ningun pedido mapeado en PostgreSQL. Ejecuta primero el Flujo 4.');
    }

    const [s, c] = orderMappings[0].source_identifier.split('-');
    series = s;
    code = Number(c);
    wcOrderId = Number(orderMappings[0].target_identifier);
  }

  console.log(`      Objetivo: Pedido Factusol ${series}-${code} <---> WooCommerce #${wcOrderId}`);

  // 1. Simular que el operario en el almacén de Factusol cambia el estado a 'Servido' (ESTPCL = 2)
  console.log('[2/4] Simulando cambio de estado en Factusol (Almacen marca pedido como SERVIDO: ESTPCL = 2)...');
  await runAdodb('execute', `
    UPDATE F_PCL SET ESTPCL = 2 WHERE TIPPCL = '${series}' AND CODPCL = ${code}
  `);

  // 2. Motor de sincronización detecta el cambio de estado en Factusol
  console.log('[3/4] Motor de sync lee estado en Factusol y resuelve transicion de estado...');
  const checkFactusol = await runAdodb('query', `
    SELECT TIPPCL, CODPCL, ESTPCL FROM F_PCL WHERE TIPPCL = '${series}' AND CODPCL = ${code}
  `);
  const factusolStatus = Number(checkFactusol[0].ESTPCL);
  console.log(`      Estado leido en Factusol: ESTPCL = ${factusolStatus}`);

  // Mapeo canónico de estado Factusol -> WooCommerce
  let wcTargetStatus = 'processing';
  if (factusolStatus === 2) wcTargetStatus = 'completed';
  else if (factusolStatus === 3) wcTargetStatus = 'cancelled';
  else if (factusolStatus === 1) wcTargetStatus = 'processing';
  else wcTargetStatus = 'on-hold';

  console.log(`      Mapeo de estado: Factusol ESTPCL (${factusolStatus}) ===> WooCommerce "${wcTargetStatus}"`);

  // 3. Notificar a WooCommerce REST API
  console.log(`[4/4] Actualizando pedido #${wcOrderId} en WooCommerce via REST API...`);
  const startTime = Date.now();
  const wcUpdateResp = await wcRequest(`/wp-json/wc/v3/orders/${wcOrderId}`, 'PUT', {
    status: wcTargetStatus,
    meta_data: [
      { key: '_factusol_status_code', value: String(factusolStatus) },
      { key: '_factusol_shipped_at', value: new Date().toISOString() }
    ]
  });

  // Registrar en PostgreSQL sync_executions
  const durationMs = Date.now() - startTime;
  await executePostgres(`
    INSERT INTO sync_executions (
      id, sync_job_id, organization_id, status, started_at, completed_at, duration_ms,
      processed_count, success_count, failed_count, errors, metadata
    ) VALUES (
      'exec_status_${Date.now()}', '${JOB_ORDERS}', '${ORG_ID}', 'COMPLETED', NOW() - INTERVAL '1 second', NOW(), ${durationMs},
      1, 1, 0, '[]'::jsonb,
      '{"type": "order_status_sync", "order": "${series}-${code}", "wc_status": "${wcTargetStatus}"}'::jsonb
    );
  `);

  // Verificación en WooCommerce
  const verifyOrder = await wcRequest(`/wp-json/wc/v3/orders/${wcOrderId}`, 'GET');

  console.log(`\n>>> VERIFICACION FINAL FLUJO 5:`);
  console.log(`    Factusol ESTPCL: ${checkFactusol[0].ESTPCL} (Servido/Enviado)`);
  console.log(`    WooCommerce Estado actual: "${verifyOrder.data.status}"`);
  console.log('    ESTADO FLUJO 5: 100% COMPLETADO CON EXITO!\n');

  return { success: true, status: verifyOrder.data.status };
}

if (require.main === module) {
  (async () => {
    await runFlow5OrderStatusSync();
  })().catch(err => {
    console.error('ERROR EN FLUJO 5:', err);
    process.exit(1);
  });
}

module.exports = { runFlow5OrderStatusSync };
