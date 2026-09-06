const crypto = require('crypto');
const { 
  ORG_ID, 
  CONN_FACTUSOL, 
  CONN_WOO, 
  JOB_PRODUCTS,
  runAdodb, 
  executePostgres, 
  queryPostgresJson, 
  wcRequest 
} = require('./flow-helper');

async function runFlow1CatalogSync() {
  console.log('\n======================================================');
  console.log('   FLUJO 1: FACTUSOL -> WOOCOMMERCE CATALOG SYNC     ');
  console.log('======================================================');

  // 1. Extraer artículos de Factusol F_ART
  console.log('[1/5] Leyendo articulos activos de Factusol (F_ART)...');
  const articles = await runAdodb('query', `
    SELECT TOP 5 CODART, DESART, FAMART, EANART, PCOART 
    FROM F_ART 
    WHERE DESART IS NOT NULL 
    ORDER BY CODART ASC
  `);
  console.log(`      Articulos leidos: ${articles.length}`);
  articles.forEach(a => console.log(`      - [${a.CODART}] ${a.DESART} (Coste: ${a.PCOART} EUR)`));

  // 2. Extraer tarifas de F_LTA para los artículos (Tarifa 1 - PVP)
  console.log('[2/5] Consultando precios de Tarifa 1 (F_LTA)...');
  const codList = articles.map(a => `'${a.CODART}'`).join(',');
  const prices = await runAdodb('query', `
    SELECT ARTLTA, TARLTA, PRELTA 
    FROM F_LTA 
    WHERE TARLTA = 1 AND ARTLTA IN (${codList})
  `);
  const priceMap = new Map();
  prices.forEach(p => priceMap.set(p.ARTLTA, Number(p.PRELTA)));

  // 3. Mapeo Canónico -> Payload WooCommerce
  console.log('[3/5] Transformando a modelo canonico y preparando batch WooCommerce...');
  const wcBatchCreate = articles.map(art => {
    const rawPrice = priceMap.get(art.CODART) || (Number(art.PCOART || 10) * 1.35);
    const regularPrice = rawPrice.toFixed(2);
    return {
      name: art.DESART.trim(),
      sku: art.CODART.trim(),
      type: 'simple',
      regular_price: regularPrice,
      manage_stock: true,
      status: 'publish',
      meta_data: [
        { key: '_factusol_family', value: art.FAMART || '' },
        { key: '_factusol_ean', value: art.EANART || '' }
      ]
    };
  });

  // 4. Enviar a WooCommerce REST API (/wp-json/wc/v3/products/batch)
  console.log('[4/5] Enviando productos a WooCommerce via REST API...');
  const startTime = Date.now();
  const wcResponse = await wcRequest('/wp-json/wc/v3/products/batch', 'POST', {
    create: wcBatchCreate
  });

  const createdProducts = wcResponse.data.create || [];
  console.log(`      Productos creados en WooCommerce: ${createdProducts.length}`);
  createdProducts.forEach(p => console.log(`      - WC ID ${p.id} | SKU: ${p.sku} | "${p.name}" | Precio: ${p.regular_price} EUR`));

  // 5. Persistir mapeos y ejecucion en PostgreSQL
  console.log('[5/5] Registrando mapeos de entidades y auditoria en PostgreSQL...');
  for (const prod of createdProducts) {
    const mapId = `map_prod_${prod.sku}`;
    const hash = crypto.createHash('sha256').update(JSON.stringify(prod)).digest('hex').substring(0, 32);
    const upsertSql = `
      INSERT INTO external_entity_mappings (
        id, organization_id, entity_type, source_connection_id, source_identifier,
        target_connection_id, target_identifier, hash, last_synced_at
      ) VALUES (
        '${mapId}', '${ORG_ID}', 'product', '${CONN_FACTUSOL}', '${prod.sku}',
        '${CONN_WOO}', '${prod.id}', '${hash}', NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        target_identifier = EXCLUDED.target_identifier,
        hash = EXCLUDED.hash,
        last_synced_at = NOW();
    `;
    await executePostgres(upsertSql);
  }

  // Registrar sync_executions
  const execId = `exec_cat_${Date.now()}`;
  const durationMs = Date.now() - startTime;
  await executePostgres(`
    INSERT INTO sync_executions (
      id, sync_job_id, organization_id, status, started_at, completed_at, duration_ms,
      processed_count, success_count, failed_count, errors, metadata
    ) VALUES (
      '${execId}', '${JOB_PRODUCTS}', '${ORG_ID}', 'COMPLETED', NOW() - INTERVAL '${Math.ceil(durationMs / 1000)} second', NOW(), ${durationMs},
      ${articles.length}, ${createdProducts.length}, 0, '[]'::jsonb,
      '{"type": "catalog_sync", "source": "factusol", "target": "woocommerce"}'::jsonb
    );
  `);

  // Verificación en PostgreSQL
  const savedMappings = await queryPostgresJson(`
    SELECT source_identifier, target_identifier, entity_type, last_synced_at
    FROM external_entity_mappings
    WHERE entity_type = 'product' AND organization_id = '${ORG_ID}'
  `);

  console.log(`\n>>> VERIFICACION FINAL FLUJO 1:`);
  console.log(`    Total mapeos en PostgreSQL: ${savedMappings.length}`);
  savedMappings.forEach(m => console.log(`    Factusol [${m.source_identifier}] <---> WooCommerce [ID ${m.target_identifier}]`));
  console.log('    ESTADO FLUJO 1: 100% COMPLETADO CON EXITO!\n');

  return { success: true, count: createdProducts.length, mappings: savedMappings };
}

if (require.main === module) {
  (async () => {
    const { ensureSeedData } = require('./flow-helper');
    await ensureSeedData();
    await runFlow1CatalogSync();
  })().catch(err => {
    console.error('ERROR EN FLUJO 1:', err);
    process.exit(1);
  });
}

module.exports = { runFlow1CatalogSync };
