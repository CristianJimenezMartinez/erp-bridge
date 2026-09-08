const path = require('path');
const fs = require('fs');

// Require compiled bundle to test real production artifact
const bundlePath = path.resolve(__dirname, '../builder/dist/bentian-agent.bundle.cjs');
if (!fs.existsSync(bundlePath)) {
  throw new Error(`No se encontró el bundle compilado en: ${bundlePath}`);
}

process.env['HEADLESS'] = 'true';
process.env['ERP_BRIDGE_TEST_MODE'] = 'true';

const { LocalAgent, LocalGuiServer, SystemTrayManager } = require(bundlePath);

async function runSystemTrayTests() {
  console.log('===============================================================');
  console.log('  TEST SUITE: NATIVE WINDOWS SYSTEM TRAY & GUI LOOPBACK');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ [TEST ${total}] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [TEST ${total}] FALLO: ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. Verificar existencia del código fuente C# de BentianTray
  const csSource = path.resolve(__dirname, '../apps/agent/src/gui/tray/BentianTray.cs');
  assert(fs.existsSync(csSource), 'Archivo fuente C# BentianTray.cs existe');

  // 2. Localizar o compilar BentianTray.exe mediante SystemTrayManager
  const trayExePath = SystemTrayManager.ensureTrayExecutable();
  assert(!!trayExePath && fs.existsSync(trayExePath), `BentianTray.exe localizado/compilado en: ${trayExePath}`);

  // 3. Verificar que el ejecutable es un binario PE de Windows válido (> 8 KB)
  if (trayExePath && fs.existsSync(trayExePath)) {
    const stats = fs.statSync(trayExePath);
    assert(stats.size > 8192, `Tamaño de BentianTray.exe válido (${(stats.size / 1024).toFixed(1)} KB)`);

    // Leer cabecera PE para verificar que es Windows GUI
    const fd = fs.openSync(trayExePath, 'r');
    const buf = Buffer.alloc(2);
    fs.readSync(fd, buf, 0, 2, 0);
    fs.closeSync(fd);
    assert(buf.toString('ascii') === 'MZ', 'Firma DOS/PE válida ("MZ") en BentianTray.exe');
  }

  // 4. Iniciar agente y servidor GUI en puerto efímero
  const agent = new LocalAgent({
    apiBaseUrl: 'https://bridge.cristianjm.com',
  });
  await agent.start();
  const guiServer = new LocalGuiServer(agent, 39992);
  const { port, url } = await guiServer.start();
  assert(port > 0, `LocalGuiServer escuchando en ${url}`);

  try {
    // 5. Probar endpoint /api/local/status
    const statusRes = await fetch(`${url}/api/local/status`);
    const statusData = await statusRes.json();
    assert(statusRes.status === 200 && statusData.agentName, 'Endpoint /api/local/status responde correctamente');

    // 6. Probar endpoint /api/local/open-window (llamado desde el System Tray al hacer click)
    const openRes = await fetch(`${url}/api/local/open-window`);
    const openData = await openRes.json();
    assert(openRes.status === 200 && openData.url === url, 'Endpoint /api/local/open-window responde con URL correcta');

    // 7. Probar endpoint /api/local/sync-now (llamado desde "Forzar Sincronización" del tray)
    const syncRes = await fetch(`${url}/api/local/sync-now`, { method: 'POST' });
    assert(syncRes.status === 200, 'Endpoint /api/local/sync-now responde satisfactoriamente');

    // 8. Verificar que el ejecutable en builder/dist/BentianTray.exe existe para el instalador
    const distTray = path.resolve(__dirname, '../builder/dist/BentianTray.exe');
    assert(fs.existsSync(distTray), 'builder/dist/BentianTray.exe empaquetado para Inno Setup');

  } finally {
    await guiServer.stop();
    await agent.stop();
  }

  console.log(`\n---------------------------------------------------------------`);
  console.log(`RESULTADO SYSTEM TRAY: ${passed}/${total} pruebas superadas.`);
  console.log(`---------------------------------------------------------------\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSystemTrayTests().catch(err => {
  console.error('Error no controlado en test de System Tray:', err);
  process.exit(1);
});
