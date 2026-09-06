const { 
  ORG_ID, 
  CONN_FACTUSOL, 
  CONN_WOO, 
  runAdodb, 
  executePostgres, 
  queryPostgresJson 
} = require('./flow-helper');

async function runFlow6InvoiceGeneration(orderInfo = null) {
  console.log('\n======================================================');
  console.log('   FLUJO 6: FACTUSOL INVOICE GENERATION (F_FAC/F_LFA)');
  console.log('======================================================');

  let series = 'W';
  let code = 1;
  let wcOrderId = null;

  if (orderInfo && orderInfo.factusolCode) {
    series = orderInfo.factusolSeries || 'W';
    code = orderInfo.factusolCode;
    wcOrderId = orderInfo.wcOrderId || '501';
  } else {
    console.log('[1/5] Buscando pedido origen en Factusol y PostgreSQL...');
    const orderMappings = await queryPostgresJson(`
      SELECT source_identifier, target_identifier 
      FROM external_entity_mappings 
      WHERE entity_type = 'order' AND organization_id = '${ORG_ID}'
      ORDER BY last_synced_at DESC
      LIMIT 1
    `);

    if (orderMappings.length === 0) {
      throw new Error('No se encontro ningun pedido para facturar. Ejecuta primero el Flujo 4.');
    }

    const [s, c] = orderMappings[0].source_identifier.split('-');
    series = s;
    code = Number(c);
    wcOrderId = Number(orderMappings[0].target_identifier);
  }

  // 1. Leer pedido y lineas de Factusol (F_PCL y F_LPC)
  console.log(`[2/5] Leyendo datos completos del pedido ${series}-${code} en Factusol...`);
  const orders = await runAdodb('query', `
    SELECT * FROM F_PCL WHERE TIPPCL = '${series}' AND CODPCL = ${code}
  `);
  if (orders.length === 0) throw new Error(`Pedido ${series}-${code} no encontrado en F_PCL`);
  const order = orders[0];

  const lines = await runAdodb('query', `
    SELECT * FROM F_LPC WHERE TIPLPC = '${series}' AND CODLPC = ${code} ORDER BY POSLPC ASC
  `);
  console.log(`      Pedido encontrado: Cliente [${order.CLIPCL}] "${order.CNOPCL}" | Total: ${order.TOTPCL} EUR | Lineas: ${lines.length}`);

  // 2. Obtener correlativo de Factura para Serie 'A' (F_FAC)
  console.log('[3/5] Obteniendo correlativo de Facturacion (Serie "A")...');
  const facSeries = 'A';
  const maxFacRow = await runAdodb('query', `
    SELECT MAX(CODFAC) AS maxfac FROM F_FAC WHERE TIPFAC = '${facSeries}'
  `);
  const nextFacCode = (maxFacRow[0]?.maxfac ? Number(maxFacRow[0].maxfac) : 0) + 1;
  console.log(`      Siguiente numero de factura: ${facSeries}-${nextFacCode}`);

  // 3. Crear cabecera de Factura en F_FAC
  console.log('[4/5] Insertando cabecera de Factura en F_FAC y lineas en F_LFA...');
  const facDateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const insertFacHeader = `
    INSERT INTO F_FAC (
      TIPFAC, CODFAC, FECFAC, CLIFAC, CNOFAC, CDOFAC, CPOFAC, CCPFAC, CPRFAC, CNIFAC,
      FOPFAC, NET1FAC, PIVA1FAC, IIVA1FAC, PIVA2FAC, PIVA3FAC, TOTFAC, PEDFAC
    ) VALUES (
      '${facSeries}', ${nextFacCode}, #${facDateStr}#, ${order.CLIPCL},
      '${order.CNOPCL}', '${order.CDOPCL || ''}', '${order.CPOPCL || ''}', '${order.CCPPCL || ''}',
      '${order.CPRPCL || 'MADRID'}', '${order.CNIPCL || ''}', 'TRF',
      ${Number(order.NET1PCL).toFixed(2)}, ${Number(order.PIVA1PCL).toFixed(2)}, ${Number(order.IIVA1PCL).toFixed(2)},
      10.00, 4.00, ${Number(order.TOTPCL).toFixed(2)}, ${code}
    )
  `.trim();
  await runAdodb('execute', insertFacHeader);

  // Insertar líneas en F_LFA
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const insertFacLine = `
      INSERT INTO F_LFA (
        TIPLFA, CODLFA, POSLFA, ARTLFA, DESLFA, CANLFA, DT1LFA, IVALFA, PRELFA, TOTLFA
      ) VALUES (
        '${facSeries}', ${nextFacCode}, ${i + 1}, '${l.ARTLPC}', '${l.DESLPC}',
        ${Number(l.CANLPC).toFixed(2)}, 0.00, 0, ${Number(l.PRELPC).toFixed(4)}, ${Number(l.TOTLPC).toFixed(2)}
      )
    `.trim();
    await runAdodb('execute', insertFacLine);
  }

  console.log(`      OK: Factura ${facSeries}-${nextFacCode} creada y vinculada al pedido #${code} (F_FAC.PEDFAC)!`);

  // 4. Registrar mapeo en PostgreSQL
  console.log('[5/5] Registrando factura en PostgreSQL external_entity_mappings...');
  const mapId = `map_fac_${facSeries}_${nextFacCode}`;
  await executePostgres(`
    INSERT INTO external_entity_mappings (
      id, organization_id, entity_type, source_connection_id, source_identifier,
      target_connection_id, target_identifier, hash, last_synced_at
    ) VALUES (
      '${mapId}', '${ORG_ID}', 'invoice', '${CONN_FACTUSOL}', '${facSeries}-${nextFacCode}',
      '${CONN_WOO}', 'WC-${wcOrderId}', 'fac_${Date.now()}', NOW()
    )
    ON CONFLICT (id) DO UPDATE SET last_synced_at = NOW();
  `);

  // Verificación
  const verifyFac = await runAdodb('query', `
    SELECT TIPFAC, CODFAC, FECFAC, CNOFAC, TOTFAC, PEDFAC 
    FROM F_FAC 
    WHERE TIPFAC = '${facSeries}' AND CODFAC = ${nextFacCode}
  `);
  const verifyLfa = await runAdodb('query', `
    SELECT TIPLFA, CODLFA, ARTLFA, TOTLFA 
    FROM F_LFA 
    WHERE TIPLFA = '${facSeries}' AND CODLFA = ${nextFacCode}
  `);

  console.log(`\n>>> VERIFICACION FINAL FLUJO 6:`);
  console.log(`    Factura Factusol F_FAC: #${verifyFac[0].TIPFAC}-${verifyFac[0].CODFAC} | Cliente: "${verifyFac[0].CNOFAC}" | Total: ${verifyFac[0].TOTFAC} EUR | Pedido Ref: #${verifyFac[0].PEDFAC}`);
  console.log(`    Lineas en F_LFA: ${verifyLfa.length} linea(s) verificada(s)`);
  console.log('    ESTADO FLUJO 6: 100% COMPLETADO CON EXITO!\n');

  return {
    success: true,
    invoiceSeries: facSeries,
    invoiceCode: nextFacCode
  };
}

if (require.main === module) {
  (async () => {
    await runFlow6InvoiceGeneration();
  })().catch(err => {
    console.error('ERROR EN FLUJO 6:', err);
    process.exit(1);
  });
}

module.exports = { runFlow6InvoiceGeneration };
