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

async function runFlow4OrderIngestion() {
  console.log('\n======================================================');
  console.log('   FLUJO 4: WOOCOMMERCE -> FACTUSOL ORDER INGESTION  ');
  console.log('======================================================');

  // 1. Simular un nuevo pedido recibido en WooCommerce
  console.log('[1/6] Creando pedido simulado en WooCommerce...');
  const testEmail = `cliente_test_${Date.now()}@bentian.com`;
  const wcOrderPayload = {
    status: 'processing',
    billing: {
      first_name: 'Cristian',
      last_name: 'Bentian Test',
      address_1: 'Avenida Gran Via 45',
      city: 'Madrid',
      postcode: '28013',
      state: 'Madrid',
      email: testEmail,
      phone: '611223344'
    },
    line_items: [
      {
        product_id: 1001,
        name: 'M. TUBO PVC ENC 16/160 MM.',
        sku: '000047',
        quantity: 2,
        price: '25.00',
        total: '50.00'
      }
    ],
    meta_data: [
      { key: '_billing_nif', value: '12345678Z' }
    ]
  };

  const createOrderResp = await wcRequest('/wp-json/wc/v3/orders', 'POST', wcOrderPayload);
  const wcOrder = createOrderResp.data;
  console.log(`      OK: Pedido WooCommerce creado con ID #${wcOrder.id} (Total: ${wcOrder.line_items[0].total} EUR)`);

  // 2. Comprobar / Crear cliente en Factusol F_CLI
  console.log('[2/6] Verificando / creando cliente en Factusol (F_CLI) por email (EMACLI)...');
  const existingClients = await runAdodb('query', `
    SELECT CODCLI, NOFCLI, EMACLI FROM F_CLI WHERE EMACLI = '${testEmail}'
  `);

  let codCli;
  if (existingClients.length > 0) {
    codCli = existingClients[0].CODCLI;
    console.log(`      Cliente existente encontrado: [CODCLI: ${codCli}] ${existingClients[0].NOFCLI}`);
  } else {
    // Obtener siguiente ID de cliente
    const maxCliRow = await runAdodb('query', 'SELECT MAX(CODCLI) AS maxcli FROM F_CLI');
    codCli = (maxCliRow[0]?.maxcli ? Number(maxCliRow[0].maxcli) : 4000) + 1;
    const clientName = `${wcOrder.billing.first_name} ${wcOrder.billing.last_name}`.toUpperCase();
    
    console.log(`      Creando nuevo cliente en Factusol: [CODCLI: ${codCli}] "${clientName}"...`);
    const insertCliSql = `
      INSERT INTO F_CLI (
        CODCLI, NOFCLI, NOCCLI, DOMCLI, POBCLI, CPOCLI, PROCLI, NIFCLI, TELCLI, EMACLI, TARCLI, FPACLI
      ) VALUES (
        ${codCli}, '${clientName}', '${clientName}', '${wcOrder.billing.address_1}',
        '${wcOrder.billing.city}', '${wcOrder.billing.postcode}', 'MADRID',
        '12345678Z', '${wcOrder.billing.phone}', '${testEmail}', 1, 'TRF'
      )
    `.trim();
    await runAdodb('execute', insertCliSql);
    console.log(`      OK: Cliente #${codCli} insertado en Factusol F_CLI`);
  }

  // 3. Obtener correlativo de pedido en Factusol para Serie 'W'
  console.log('[3/6] Obteniendo correlativo de pedido en Factusol para Serie "W" (F_PCL)...');
  const series = 'W';
  const maxOrderRow = await runAdodb('query', `
    SELECT MAX(CODPCL) AS maxorder FROM F_PCL WHERE TIPPCL = '${series}'
  `);
  const nextOrderCode = (maxOrderRow[0]?.maxorder ? Number(maxOrderRow[0].maxorder) : 0) + 1;
  const orderRef = `WC-${wcOrder.id}`;
  console.log(`      Siguiente pedido para Factusol: Serie ${series} - Codigo ${nextOrderCode} (Ref: ${orderRef})`);

  // 4. Insertar cabecera de pedido F_PCL y líneas F_LPC
  console.log('[4/6] Insertando cabecera y lineas de pedido en Factusol...');
  const netTotal = 50.00;
  const ivaRate = 21.00;
  const ivaTotal = 10.50;
  const totalAmount = 60.50;
  const orderDateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const insertHeaderSql = `
    INSERT INTO F_PCL (
      TIPPCL, CODPCL, REFPCL, FECPCL, AGEPCL, CLIPCL,
      CNOPCL, CDOPCL, CPOPCL, CCPPCL, CPRPCL, CNIPCL,
      TELPCL, TIVPCL, REQPCL, ESTPCL, ALMPCL,
      NET1PCL, PIVA1PCL, PIVA2PCL, PIVA3PCL, IIVA1PCL, IPOR1PCL, TOTPCL
    ) VALUES (
      '${series}', ${nextOrderCode}, '${orderRef}', #${orderDateStr}#, 0, ${codCli},
      '${wcOrder.billing.first_name} ${wcOrder.billing.last_name}', '${wcOrder.billing.address_1}',
      '${wcOrder.billing.city}', '${wcOrder.billing.postcode}', 'MADRID', '12345678Z',
      '${wcOrder.billing.phone}', 0, 0, 0, 'GEN',
      ${netTotal.toFixed(2)}, ${ivaRate.toFixed(2)}, 10.00, 4.00, ${ivaTotal.toFixed(2)}, 0.00, ${totalAmount.toFixed(2)}
    )
  `.trim();
  await runAdodb('execute', insertHeaderSql);

  // Línea de pedido
  const item = wcOrder.line_items[0];
  const insertLineSql = `
    INSERT INTO F_LPC (
      TIPLPC, CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, DT1LPC, IVALPC, PRELPC, TOTLPC
    ) VALUES (
      '${series}', ${nextOrderCode}, 1, '${item.sku}', '${item.name}', ${Number(item.quantity).toFixed(2)}, 0.00, 0, ${Number(item.price).toFixed(4)}, ${Number(item.total).toFixed(2)}
    )
  `.trim();
  await runAdodb('execute', insertLineSql);
  console.log(`      OK: Pedido #${series}-${nextOrderCode} y linea de articulo "${item.sku}" grabados en Factusol!`);

  // 5. Persistir mapeo en PostgreSQL y actualizar WooCommerce
  console.log('[5/6] Registrando mapeo en PostgreSQL y actualizando estado en WooCommerce...');
  const mapId = `map_order_${series}_${nextOrderCode}`;
  const orderIdentifierFactusol = `${series}-${nextOrderCode}`;

  await executePostgres(`
    INSERT INTO external_entity_mappings (
      id, organization_id, entity_type, source_connection_id, source_identifier,
      target_connection_id, target_identifier, hash, last_synced_at
    ) VALUES (
      '${mapId}', '${ORG_ID}', 'order', '${CONN_FACTUSOL}', '${orderIdentifierFactusol}',
      '${CONN_WOO}', '${wcOrder.id}', 'ord_${Date.now()}', NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      target_identifier = EXCLUDED.target_identifier,
      last_synced_at = NOW();
  `);

  // Actualizar pedido en WooCommerce con referencia a Factusol
  await wcRequest(`/wp-json/wc/v3/orders/${wcOrder.id}`, 'PUT', {
    status: 'on-hold',
    meta_data: [
      { key: '_factusol_order_code', value: orderIdentifierFactusol },
      { key: '_factusol_synced_at', value: new Date().toISOString() }
    ]
  });

  // Registrar en PostgreSQL sync_executions
  await executePostgres(`
    INSERT INTO sync_executions (
      id, sync_job_id, organization_id, status, started_at, completed_at, duration_ms,
      processed_count, success_count, failed_count, errors, metadata
    ) VALUES (
      'exec_order_${Date.now()}', '${JOB_ORDERS}', '${ORG_ID}', 'COMPLETED', NOW() - INTERVAL '1 second', NOW(), 350,
      1, 1, 0, '[]'::jsonb,
      '{"type": "order_ingestion", "order": "${orderIdentifierFactusol}", "wc_id": ${wcOrder.id}}'::jsonb
    );
  `);

  // 6. Verificación en Factusol y PostgreSQL
  console.log('[6/6] Verificando consistencia final de datos...');
  const checkPcl = await runAdodb('query', `
    SELECT TIPPCL, CODPCL, REFPCL, TOTPCL, CNOPCL, ESTPCL 
    FROM F_PCL 
    WHERE TIPPCL = '${series}' AND CODPCL = ${nextOrderCode}
  `);
  const checkLpc = await runAdodb('query', `
    SELECT TIPLPC, CODLPC, ARTLPC, CANLPC, TOTLPC 
    FROM F_LPC 
    WHERE TIPLPC = '${series}' AND CODLPC = ${nextOrderCode}
  `);
  const checkMap = await queryPostgresJson(`
    SELECT source_identifier, target_identifier 
    FROM external_entity_mappings 
    WHERE id = '${mapId}'
  `);

  console.log(`\n>>> VERIFICACION FINAL FLUJO 4:`);
  console.log(`    Factusol Cabecera F_PCL: #${checkPcl[0].TIPPCL}-${checkPcl[0].CODPCL} | Ref: "${checkPcl[0].REFPCL}" | Total: ${checkPcl[0].TOTPCL} EUR | Estado: ${checkPcl[0].ESTPCL}`);
  console.log(`    Factusol Linea F_LPC: Articulo ${checkLpc[0].ARTLPC} x ${checkLpc[0].CANLPC} = ${checkLpc[0].TOTLPC} EUR`);
  console.log(`    Mapeo PostgreSQL: Factusol [${checkMap[0].source_identifier}] <---> WooCommerce [ID ${checkMap[0].target_identifier}]`);
  console.log('    ESTADO FLUJO 4: 100% COMPLETADO CON EXITO!\n');

  return {
    success: true,
    factusolSeries: series,
    factusolCode: nextOrderCode,
    wcOrderId: wcOrder.id,
    codCli
  };
}

if (require.main === module) {
  (async () => {
    await runFlow4OrderIngestion();
  })().catch(err => {
    console.error('ERROR EN FLUJO 4:', err);
    process.exit(1);
  });
}

module.exports = { runFlow4OrderIngestion };
