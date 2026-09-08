const path = require('path');
const fs = require('fs');

async function runGuiServerTests() {
  console.log('================================================================');
  console.log('   TEST INTEGRAL: LOCAL GUI SERVER & ASISTENTE FACTUSOL (E2E)   ');
  console.log('================================================================\n');

  // Require compiled bundle to test real production artifact
  const bundlePath = path.resolve(__dirname, '../builder/dist/bentian-agent.bundle.cjs');
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`No se encontró el bundle compilado en: ${bundlePath}`);
  }

  // Set env to avoid opening real window and prevent auto-run of CLI main
  process.env['HEADLESS'] = 'true';
  process.env['ERP_BRIDGE_TEST_MODE'] = 'true';

  // Import bundle components
  const { LocalAgent, LocalGuiServer } = require(bundlePath);

  const testFactusolDb = path.resolve(__dirname, '../../API/bentian/2252025.accdb');
  console.log(`[Config] Base de datos Factusol de prueba: ${testFactusolDb}`);
  console.log(`[Config] Existe archivo: ${fs.existsSync(testFactusolDb)}`);

  console.log('\nTEST 1: Instanciando LocalAgent e iniciando LocalGuiServer en puerto dinámico...');
  const agent = new LocalAgent({
    factusolDbPath: testFactusolDb,
    apiBaseUrl: 'https://bridge.cristianjm.com',
  });

  const guiServer = new LocalGuiServer(agent, 39299);
  const { port, url } = await guiServer.start();
  console.log(`  ✓ Servidor GUI escuchando en: ${url} (Puerto ${port})`);

  try {
    console.log('\nTEST 2: Verificando servicio de la interfaz HTML de escritorio (GET /)...');
    const resHtml = await fetch(`${url}/`);
    if (resHtml.status !== 200) throw new Error(`GET / retornó HTTP ${resHtml.status}`);
    const htmlText = await resHtml.text();
    if (!htmlText.includes('Bentian ERP Bridge') || !htmlText.includes('Factusol ERP')) {
      throw new Error('El HTML retornado no contiene los títulos esperados de Bentian');
    }
    console.log(`  ✓ HTML servido correctamente (${htmlText.length} bytes). Contiene UI de Factusol y Bentian.`);

    console.log('\nTEST 3: Verificando endpoint de estado (GET /api/local/status)...');
    const resStatus = await fetch(`${url}/api/local/status`);
    if (resStatus.status !== 200) throw new Error(`GET /api/local/status retornó HTTP ${resStatus.status}`);
    const statusData = await resStatus.json();
    console.log(`  ✓ Nombre Agente: ${statusData.agentName}`);
    console.log(`  ✓ HWID: ${statusData.hwid ? statusData.hwid.substring(0, 20) + '...' : 'N/A'}`);
    console.log(`  ✓ Factusol configurado: ${statusData.factusol.configured} (Archivo: ${statusData.factusol.fileName})`);
    console.log(`  ✓ Licencia: ${statusData.license.status} (Plan: ${statusData.license.plan || 'Ninguno'})`);

    console.log('\nTEST 4: Verificando prueba de conexión Factusol (POST /api/local/test-factusol)...');
    const resTestDb = await fetch(`${url}/api/local/test-factusol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ databasePath: testFactusolDb }),
    });
    const testDbData = await resTestDb.json();
    console.log(`  ✓ Éxito conexión: ${testDbData.success}`);
    console.log(`  ✓ Mensaje: ${testDbData.message}`);
    console.log(`  ✓ Artículos contados: ${testDbData.articleCount}`);
    if (!testDbData.success || typeof testDbData.articleCount !== 'number') {
      throw new Error(`Fallo en test-factusol: ${JSON.stringify(testDbData)}`);
    }

    console.log('\nTEST 5: Verificando detección de bases de datos (POST /api/local/detect-factusol)...');
    const resDetect = await fetch(`${url}/api/local/detect-factusol`, {
      method: 'POST',
    });
    const detectData = await resDetect.json();
    console.log(`  ✓ Bases detectadas: ${detectData.instances.length}`);

    console.log('\nTEST 6: Verificando disparo de sincronización manual (POST /api/local/sync-now)...');
    const resSync = await fetch(`${url}/api/local/sync-now`, {
      method: 'POST',
    });
    const syncData = await resSync.json();
    console.log(`  ✓ Resultado sync: ${syncData.success} - ${syncData.message}`);

    console.log('\nTEST 7: Verificando registro de eventos en vivo (GET /api/local/logs)...');
    const resLogs = await fetch(`${url}/api/local/logs`);
    const logsData = await resLogs.json();
    console.log(`  ✓ Eventos registrados: ${logsData.length}`);
    logsData.slice(0, 3).forEach((l, i) => {
      console.log(`    [${i + 1}] [${l.timestamp}] (${l.level}): ${l.message}`);
    });

    console.log('\n================================================================');
    console.log('   🎉 7/7 PRUEBAS DE SERVIDOR GUI LOCAL COMPLETADAS CON ÉXITO   ');
    console.log('================================================================\n');
  } finally {
    await guiServer.stop();
    await agent.stop();
  }
}

runGuiServerTests().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS GUI SERVER:', err);
  process.exit(1);
});
