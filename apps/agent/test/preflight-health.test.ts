import assert from 'assert';
import { PreflightHealthService } from '../src/diagnostics/preflight-health.service';
import { PreflightHealthReport } from '../src/diagnostics/preflight-health.types';

console.log('--- Iniciando Test Suite: Preflight Health & EDR Diagnostics ---');

async function runTests() {
  // =========================================================================
  // TEST 1: Comprobación de cscript.exe (OK vs CSCRIPT_BLOCKED vs NOT_FOUND)
  // =========================================================================
  console.log('1. Probando diagnóstico de cscript.exe...');

  // 1.1 Caso cscript operativo
  const serviceOkScript = new PreflightHealthService({
    probeCScript: async () => ({ ok: true, path: 'C:\\Windows\\SysWOW64\\cscript.exe' }),
  });
  const checkCscriptOk = await serviceOkScript.checkCScript();
  assert.strictEqual(checkCscriptOk.status, 'OK');
  assert.strictEqual(checkCscriptOk.code, 'CSCRIPT_READY');
  assert(checkCscriptOk.message.includes('SysWOW64'));

  // 1.2 Caso cscript bloqueado por Windows 11 24H2 / EDR
  const serviceBlockedScript = new PreflightHealthService({
    probeCScript: async () => ({
      ok: false,
      blocked: true,
      path: 'C:\\Windows\\SysWOW64\\cscript.exe',
      reason: 'Blocked by Attack Surface Reduction rule / VBScript disabled',
    }),
  });
  const checkCscriptBlocked = await serviceBlockedScript.checkCScript();
  assert.strictEqual(checkCscriptBlocked.status, 'FAIL');
  assert.strictEqual(checkCscriptBlocked.code, 'CSCRIPT_BLOCKED');
  assert(checkCscriptBlocked.recommendation?.includes('dism /online /add-capability /capabilityname:VBScript~~~~'));
  assert(checkCscriptBlocked.recommendation?.includes('EDR/antivirus'));

  // 1.3 Caso cscript no encontrado en disco
  const serviceNotFoundScript = new PreflightHealthService({
    probeCScript: async () => ({ ok: false, blocked: false, reason: 'cscript.exe no encontrado' }),
  });
  const checkCscriptNotFound = await serviceNotFoundScript.checkCScript();
  assert.strictEqual(checkCscriptNotFound.status, 'FAIL');
  assert.strictEqual(checkCscriptNotFound.code, 'CSCRIPT_NOT_FOUND');
  console.log('  ✓ Comprobaciones de cscript.exe y CSCRIPT_BLOCKED validadas.');

  // =========================================================================
  // TEST 2: Comprobación de Driver Access OLEDB (OK vs OLEDB_PROVIDER_MISSING)
  // =========================================================================
  console.log('2. Probando diagnóstico de Driver Access OLEDB...');

  // 2.1 Caso driver disponible
  const serviceOledbOk = new PreflightHealthService({
    probeOleDb: async () => ({ ok: true, providers: ['Microsoft.ACE.OLEDB.12.0', 'Microsoft.Jet.OLEDB.4.0'] }),
  });
  const checkOledbOk = await serviceOledbOk.checkOleDb();
  assert.strictEqual(checkOledbOk.status, 'OK');
  assert.strictEqual(checkOledbOk.code, 'OLEDB_PROVIDER_READY');
  assert(checkOledbOk.message.includes('Microsoft.ACE.OLEDB.12.0'));

  // 2.2 Caso falta runtime de Access
  const serviceOledbMissing = new PreflightHealthService({
    probeOleDb: async () => ({ ok: false, providers: [], error: 'Provider cannot be found' }),
  });
  const checkOledbMissing = await serviceOledbMissing.checkOleDb();
  assert.strictEqual(checkOledbMissing.status, 'FAIL');
  assert.strictEqual(checkOledbMissing.code, 'OLEDB_PROVIDER_MISSING');
  assert(checkOledbMissing.recommendation?.includes('Microsoft Access Database Engine 2010 Redistributable'));
  console.log('  ✓ Detección de drivers OLEDB y OLEDB_PROVIDER_MISSING validada.');

  // =========================================================================
  // TEST 3: Comprobación de Desincronización Horaria (Clock Drift / NTP)
  // =========================================================================
  console.log('3. Probando detección de Clock Drift / NTP...');

  // 3.1 Reloj sincronizado (desviación < 3 min)
  const serviceClockSynced = new PreflightHealthService({
    probeClockDrift: async () => ({ ok: true, driftMs: 1500, serverDate: new Date().toUTCString() }),
  });
  const checkClockSynced = await serviceClockSynced.checkClockDrift();
  assert.strictEqual(checkClockSynced.status, 'OK');
  assert.strictEqual(checkClockSynced.code, 'CLOCK_SYNCHRONIZED');

  // 3.2 Reloj desincronizado (> 3 min = 180s)
  const serviceClockDrift = new PreflightHealthService({
    probeClockDrift: async () => ({ ok: true, driftMs: 250000, serverDate: new Date(Date.now() - 250000).toUTCString() }),
  });
  const checkClockDrift = await serviceClockDrift.checkClockDrift();
  assert.strictEqual(checkClockDrift.status, 'FAIL');
  assert.strictEqual(checkClockDrift.code, 'CLOCK_DRIFT_DETECTED');
  assert(checkClockDrift.recommendation?.includes('w32tm /resync'));

  // 3.3 Servidor inalcanzable
  const serviceClockUnreach = new PreflightHealthService({
    probeClockDrift: async () => ({ ok: false, driftMs: 0, error: 'Network timeout' }),
  });
  const checkClockUnreach = await serviceClockUnreach.checkClockDrift();
  assert.strictEqual(checkClockUnreach.status, 'WARN');
  assert.strictEqual(checkClockUnreach.code, 'CLOCK_SERVER_UNREACHABLE');
  console.log('  ✓ Detección de CLOCK_DRIFT_DETECTED y sincronización horaria validada.');

  // =========================================================================
  // TEST 4: Almacenamiento de Red y Tipo de Conexión (Wi-Fi vs Cable vs Local)
  // =========================================================================
  console.log('4. Probando diagnóstico de almacenamiento y Wi-Fi...');

  // 4.1 Base de datos en disco local directo
  const serviceLocalDb = new PreflightHealthService({
    factusolDbPath: 'C:\\Factusol\\Datos\\FS2026.mdb',
    probeNetworkStorage: async () => ({
      isNetwork: false,
      isWifi: false,
      storageType: 'local',
      drive: 'C:',
      latency: { avgMs: 0.8, minMs: 0.5, maxMs: 1.2, jitterMs: 0.7 },
    }),
  });
  const checkLocal = await serviceLocalDb.checkNetworkStorage();
  assert.strictEqual(checkLocal.status, 'OK');
  assert.strictEqual(checkLocal.code, 'LOCAL_STORAGE_OPTIMAL');

  // 4.2 Base de datos en red (UNC) sobre conexión Wi-Fi (peligro de corrupción)
  const serviceWifiNas = new PreflightHealthService({
    factusolDbPath: '\\\\NAS_EMPRESA\\Factusol\\Datos\\FS2026.mdb',
    probeNetworkStorage: async () => ({
      isNetwork: true,
      isWifi: true,
      storageType: 'unc',
      latency: { avgMs: 18.5, minMs: 12.0, maxMs: 45.0, jitterMs: 33.0 },
    }),
  });
  const checkWifiNas = await serviceWifiNas.checkNetworkStorage();
  assert.strictEqual(checkWifiNas.status, 'WARN');
  assert.strictEqual(checkWifiNas.code, 'NETWORK_DB_WIFI_WARNING');
  assert(checkWifiNas.recommendation?.includes('Ethernet Gigabit'));

  // 4.3 Base de datos en unidad mapeada (Z:\) cableada con latencia normal
  const serviceMappedLan = new PreflightHealthService({
    factusolDbPath: 'Z:\\Factusol\\Datos\\FS2026.mdb',
    probeNetworkStorage: async () => ({
      isNetwork: true,
      isWifi: false,
      storageType: 'mapped',
      drive: 'Z:',
      latency: { avgMs: 4.2, minMs: 3.8, maxMs: 5.1, jitterMs: 1.3 },
    }),
  });
  const checkMappedLan = await serviceMappedLan.checkNetworkStorage();
  assert.strictEqual(checkMappedLan.status, 'OK');
  assert.strictEqual(checkMappedLan.code, 'NETWORK_STORAGE_HEALTHY');

  // 4.4 Base de datos en red cableada con latencia anómala / jitter
  const serviceLaggyLan = new PreflightHealthService({
    factusolDbPath: 'Z:\\Factusol\\Datos\\FS2026.mdb',
    probeNetworkStorage: async () => ({
      isNetwork: true,
      isWifi: false,
      storageType: 'mapped',
      drive: 'Z:',
      latency: { avgMs: 95.0, minMs: 30.0, maxMs: 160.0, jitterMs: 130.0 },
    }),
  });
  const checkLaggyLan = await serviceLaggyLan.checkNetworkStorage();
  assert.strictEqual(checkLaggyLan.status, 'WARN');
  assert.strictEqual(checkLaggyLan.code, 'HIGH_LATENCY_NETWORK_STORAGE');
  console.log('  ✓ Alerta NETWORK_DB_WIFI_WARNING y cálculo de latencia de disco validados.');

  // =========================================================================
  // TEST 5: Generación del Reporte Completo y Semáforo Global
  // =========================================================================
  console.log('5. Probando agregación de reporte completo (HEALTHY / DEGRADED / CRITICAL)...');

  // 5.1 Caso HEALTHY
  const serviceHealthy = new PreflightHealthService({
    probeCScript: async () => ({ ok: true, path: 'C:\\Windows\\SysWOW64\\cscript.exe' }),
    probeOleDb: async () => ({ ok: true, providers: ['Microsoft.ACE.OLEDB.12.0'] }),
    probeClockDrift: async () => ({ ok: true, driftMs: 500, serverDate: new Date().toUTCString() }),
    probeNetworkStorage: async () => ({ isNetwork: false, isWifi: false, storageType: 'local' }),
  });
  const reportHealthy = await serviceHealthy.runDiagnostics(true);
  assert.strictEqual(reportHealthy.overallStatus, 'HEALTHY');
  assert.strictEqual(reportHealthy.summary.failures, 0);
  assert.strictEqual(reportHealthy.summary.warnings, 0);
  assert.strictEqual(reportHealthy.summary.passed, 4);

  // 5.2 Caso DEGRADED (0 fallos, 1 aviso por Wi-Fi)
  const serviceDegraded = new PreflightHealthService({
    factusolDbPath: '\\\\NAS\\datos.mdb',
    probeCScript: async () => ({ ok: true, path: 'C:\\Windows\\SysWOW64\\cscript.exe' }),
    probeOleDb: async () => ({ ok: true, providers: ['Microsoft.ACE.OLEDB.12.0'] }),
    probeClockDrift: async () => ({ ok: true, driftMs: 500 }),
    probeNetworkStorage: async () => ({ isNetwork: true, isWifi: true, storageType: 'unc' }),
  });
  const reportDegraded = await serviceDegraded.runDiagnostics(true);
  assert.strictEqual(reportDegraded.overallStatus, 'DEGRADED');
  assert.strictEqual(reportDegraded.summary.warnings, 1);
  assert.strictEqual(reportDegraded.summary.failures, 0);

  // 5.3 Caso CRITICAL (1 fallo por cscript bloqueado)
  const serviceCritical = new PreflightHealthService({
    probeCScript: async () => ({ ok: false, blocked: true, reason: 'EDR block' }),
    probeOleDb: async () => ({ ok: true, providers: ['Microsoft.ACE.OLEDB.12.0'] }),
    probeClockDrift: async () => ({ ok: true, driftMs: 500 }),
    probeNetworkStorage: async () => ({ isNetwork: false, isWifi: false, storageType: 'local' }),
  });
  const reportCritical = await serviceCritical.runDiagnostics(true);
  assert.strictEqual(reportCritical.overallStatus, 'CRITICAL');
  assert.strictEqual(reportCritical.summary.failures, 1);
  console.log('  ✓ Semáforos globales (HEALTHY / DEGRADED / CRITICAL) computados con exactitud.');

  // =========================================================================
  // TEST 6: Ejecución en vivo en el sistema local
  // =========================================================================
  console.log('6. Probando ejecución en vivo en el entorno real de Windows...');
  const liveService = new PreflightHealthService({
    apiBaseUrl: 'https://bridge.cristianjm.com',
  });
  const liveReport: PreflightHealthReport = await liveService.runDiagnostics(true);
  assert(liveReport.durationMs >= 0);
  assert(liveReport.timestamp.length > 0);
  assert(['HEALTHY', 'DEGRADED', 'CRITICAL'].includes(liveReport.overallStatus));
  assert(liveReport.checks.cscript.id === 'cscript');
  assert(liveReport.checks.oledbProvider.id === 'oledb_provider');
  assert(liveReport.checks.clockDrift.id === 'clock_drift');
  assert(liveReport.checks.networkStorage.id === 'network_storage');
  console.log(`  ✓ Reporte en vivo generado con éxito en ${liveReport.durationMs}ms: Estado=${liveReport.overallStatus}`);

  console.log('\n✅ TODOS LOS TESTS DE PRE-FLIGHT HEALTH Y DIAGNÓSTICO EDR COMPLETADOS CON ÉXITO.');
}

runTests().catch((err) => {
  console.error('❌ Error en el test de preflight health:', err);
  process.exit(1);
});
