process.env['ERP_BRIDGE_TEST_MODE'] = 'true';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LocalAgent } from '../src/agent';
import { LocalGuiServer } from '../src/gui/gui-server';
import { writePanicLog, getPanicLogPath } from '../src/cli';
import { ConfigManager } from '../src/config/config.manager';
import { HistoryManager } from '../src/history/history.manager';
import { EventBus } from '../src/diagnostics/event-bus';
import { FactusolService } from '../src/factusol/factusol.service';
import { LocalSyncEngine } from '../src/sync/sync.engine';
import { FactusolYearResolver } from '@erp-bridge/connector-factusol';

console.log('--- Running Lifecycle, Stability & Rollover Tests (Squad 3) ---');

async function testPanicLogging() {
  console.log('1. Probando captura y registro de reporte de pánico...');
  const testError = new Error('Test panic error for audit simulation');
  const logPath = writePanicLog('testPanic', testError);

  assert(fs.existsSync(logPath), `El archivo de pánico debe existir en: ${logPath}`);
  const content = fs.readFileSync(logPath, 'utf8');
  assert(content.includes('🚨 [PANIC REPORT]'), 'El log debe contener la cabecera de pánico');
  assert(content.includes('testPanic'), 'El log debe contener el tipo de error');
  assert(content.includes('Test panic error for audit simulation'), 'El log debe contener el mensaje del error');
  assert(content.includes('Stack Trace:'), 'El log debe contener el stack trace');
  console.log(`  ✓ Reporte de pánico verificado en: ${logPath}`);

  const resolvedPath = getPanicLogPath();
  assert.strictEqual(typeof resolvedPath, 'string');
  assert(resolvedPath.length > 0);
  console.log('  ✓ getPanicLogPath() resolvió correctamente la ruta de auditoría.');
}

async function testFiscalRolloverInSyncEngine() {
  console.log('2. Probando Rollover Fiscal Automático en bucle de sincronización...');

  const tempDir = path.join(os.tmpdir(), `bentian_rollover_test_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;
  const oldDbFile = path.join(tempDir, `225${prevYear}.accdb`);
  const newDbFile = path.join(tempDir, `225${currentYear}.accdb`);

  // Crear archivos simulados de Factusol
  fs.writeFileSync(oldDbFile, 'MOCK_OLD_YEAR_DATABASE');
  fs.writeFileSync(newDbFile, 'MOCK_NEW_YEAR_DATABASE');

  // Verificar resolución de año fiscal
  const resolved = FactusolYearResolver.resolveActiveDatabase(oldDbFile);
  assert.strictEqual(resolved.switched, true, 'Debe detectar cambio de ejercicio fiscal');
  assert.strictEqual(resolved.currentYear, currentYear, `Debe resolver al año ${currentYear}`);
  assert.strictEqual(path.resolve(resolved.activePath), path.resolve(newDbFile), 'Debe apuntar a la nueva base de datos');

  // Probar integración con ConfigManager y LocalSyncEngine
  const configManager = new ConfigManager({
    factusolDbPath: oldDbFile,
    factusol: {
      databasePath: oldDbFile,
      tariffCode: '1',
      orderSeries: '1',
      invoiceSeries: '1',
      warehouseCode: 'GEN',
      activeOnly: true,
    },
  });

  const eventBus = new EventBus();
  const factusolService = new FactusolService(configManager, eventBus);
  const historyManager = new HistoryManager(tempDir);
  const syncEngine = new LocalSyncEngine(configManager, factusolService, historyManager, eventBus);

  // Ejecutar triggerManualSync (sin WooCommerce configurado)
  const syncResult = await syncEngine.triggerManualSync();
  assert.strictEqual(syncResult.success, true);

  // Verificar que la configuración se actualizó automáticamente al nuevo año
  const updatedCfg = configManager.get();
  assert.strictEqual(
    path.resolve(updatedCfg.factusolDbPath || ''),
    path.resolve(newDbFile),
    'factusolDbPath debe haberse actualizado al archivo del nuevo año'
  );
  assert.strictEqual(
    path.resolve(updatedCfg.factusol?.databasePath || ''),
    path.resolve(newDbFile),
    'factusol.databasePath debe haberse actualizado al archivo del nuevo año'
  );

  // Limpiar archivos temporales
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  console.log('  ✓ Rollover fiscal automático validado exitosamente en LocalSyncEngine.');
}

async function testLifecycleAndCleanTeardown() {
  console.log('3. Probando limpieza de eventos, sockets y timers en agent.stop()...');

  const agent = new LocalAgent();
  const server = new LocalGuiServer(agent, 39888);

  // Verificar que el servidor se registró automáticamente con el agente
  assert.strictEqual(agent.getGuiServer(), server, 'LocalGuiServer debe registrarse en LocalAgent');

  // Registrar listeners en EventBus para comprobar desconexión limpia
  let eventReceived = false;
  agent.eventBus.on('test_event', () => {
    eventReceived = true;
  });
  agent.eventBus.emit('test_event');
  assert.strictEqual(eventReceived, true, 'Listener inicial debe recibir el evento');

  // Iniciar servidor y agente
  const { url } = await server.start();
  console.log(`  ✓ Servidor GUI iniciado en: ${url}`);

  // Realizar una petición HTTP con conexión keep-alive
  const res = await fetch(`${url}/api/local/status`, {
    headers: { Connection: 'keep-alive' },
  });
  assert.strictEqual(res.status, 200);

  // Detener el agente completamente
  await agent.stop();

  // 1. Verificar desconexión de listeners de EventBus
  assert.strictEqual(
    agent.eventBus.listenerCount('test_event'),
    0,
    'Todos los listeners de EventBus deben haberse desconectado'
  );

  // 2. Verificar que el servidor GUI se cerró y liberó
  assert.strictEqual(agent.getGuiServer(), null, 'guiServer debe quedar null tras stop()');

  // 3. Verificar que el servidor ya no acepta peticiones
  let requestFailed = false;
  try {
    await fetch(`${url}/api/local/status`, { signal: AbortSignal.timeout(1000) });
  } catch {
    requestFailed = true;
  }
  assert.strictEqual(requestFailed, true, 'El puerto debe quedar liberado y rechazar conexiones');

  console.log('  ✓ agent.stop() detuvo todos los timers, desconectó listeners y cerró sockets keep-alive limpiamente.');
}

async function main() {
  try {
    await testPanicLogging();
    await testFiscalRolloverInSyncEngine();
    await testLifecycleAndCleanTeardown();
    console.log('\n🎉 ALL LIFECYCLE, STABILITY & ROLLOVER TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Fallo en pruebas de ciclo de vida y rollover:', err);
    process.exit(1);
  }
}

main();
