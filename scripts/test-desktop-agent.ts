import fs from 'fs';
import { LocalAgent } from '../apps/agent/src/agent';
import { AgentDiskLogger } from '../apps/agent/src/diagnostics/disk-logger';

async function main() {
  const isJson = process.argv.includes('--json');
  const t0 = performance.now();

  if (!isJson) {
    console.log('\n=============================================================');
    console.log('🧪 BENTIAN DESKTOP AGENT — VERIFICADOR AUTOMÁTICO EN TIEMPO REAL');
    console.log('   Ejecutando pruebas de latencia y salud reales sobre Windows...');
    console.log('=============================================================');
  }

  // 1. Intentar consultar agente activo por HTTP (puerto 39281)
  let liveReport: any = null;
  let isRunningViaHttp = false;

  try {
    const res = await fetch('http://127.0.0.1:39281/api/local/live-health', {
      method: 'GET',
      signal: AbortSignal.timeout(1200),
    });
    if (res.ok) {
      liveReport = await res.json();
      isRunningViaHttp = true;
    }
  } catch {
    // Agente no está corriendo en segundo plano como daemon HTTP
  }

  // 2. Si el daemon no está corriendo en puerto HTTP, ejecutar sonda directa
  if (!liveReport) {
    const localAgent = new LocalAgent();
    liveReport = await localAgent.getLiveHealth();
  }

  const elapsedTotalMs = Math.round((performance.now() - t0) * 10) / 10;

  // 3. Inspeccionar logs persistidos en disco
  const diskLogger = AgentDiskLogger.getInstance();
  const recentLogs = diskLogger.getRecentLogs(10);
  const logFile = diskLogger.getLogPath();
  const logFileExists = fs.existsSync(logFile);
  const logFileSizeKb = logFileExists ? Math.round(fs.statSync(logFile).size / 1024) : 0;

  if (isJson) {
    console.log(JSON.stringify({
      ...liveReport,
      verifyingDurationMs: elapsedTotalMs,
      isRunningViaHttp,
      logFile: {
        path: logFile,
        exists: logFileExists,
        sizeKb: logFileSizeKb,
      },
    }, null, 2));
    process.exit(liveReport.overallStatus === 'OFFLINE' ? 1 : 0);
  }

  // Visual Output
  const statusEmoji = liveReport.overallStatus === 'HEALTHY' ? '🟢' : (liveReport.overallStatus === 'DEGRADED' ? '🟡' : '🔴');
  console.log(`\n${statusEmoji} ESTADO GLOBAL DEL AGENTE: [${liveReport.overallStatus}] (Test completado en ${elapsedTotalMs} ms)`);
  console.log(`   Modo de ejecución: ${isRunningViaHttp ? 'Proceso Activo en 127.0.0.1:39281' : 'Sonda Local Directa (Standby)'}`);

  console.log('\n┌───────────────────────────────────────────────┬────────────┬─────────────┐');
  console.log('│ COMPONENTE EVALUADO                           │ LATENCIA   │ ESTADO      │');
  console.log('├───────────────────────────────────────────────┼────────────┼─────────────┤');

  // Factusol Row
  const facStatus = liveReport.factusol.exists ? 'ONLINE' : 'DESCONECTADO';
  const facLatency = `${liveReport.factusol.latencyMs} ms`.padEnd(10);
  const facStatusPad = facStatus.padEnd(11);
  console.log(`│ Factusol DB (.accdb local/red)                │ ${facLatency} │ ${facStatusPad} │`);

  // Web Channel Row
  const chanStatus = liveReport.channel.reachable ? 'ONLINE' : 'INACCESIBLE';
  const chanLatency = `${liveReport.channel.latencyMs} ms`.padEnd(10);
  const chanStatusPad = chanStatus.padEnd(11);
  console.log(`│ Canal Web (Suministros Rubio / WooCommerce)   │ ${chanLatency} │ ${chanStatusPad} │`);

  // Central License API Row
  const licStatus = liveReport.license.centralApiReachable ? 'ONLINE' : 'INACCESIBLE';
  const licLatency = `${liveReport.license.centralApiLatencyMs} ms`.padEnd(10);
  const licStatusPad = licStatus.padEnd(11);
  console.log(`│ API Central (bridge.cristianjm.com)           │ ${licLatency} │ ${licStatusPad} │`);

  console.log('└───────────────────────────────────────────────┴────────────┴─────────────┘');

  console.log('\n📊 MÉTRICAS DEL SISTEMA Y PROCESO:');
  console.log(`   • Memoria RAM: ${liveReport.process.memoryRssMb} MB (RSS) / ${liveReport.process.memoryHeapMb} MB (Heap)`);
  console.log(`   • PID: ${liveReport.process.pid} | Uptime: ${liveReport.process.uptimeSeconds}s | CPUs: ${liveReport.process.cpuCores}`);
  console.log(`   • Licencia: ${liveReport.license.status} (Plan: ${liveReport.license.plan || 'Ninguno'})`);

  console.log('\n🗄️  DETALLE DE BASE DE DATOS FACTUSOL:');
  console.log(`   • Archivo: ${liveReport.factusol.path || 'No configurada'}`);
  console.log(`   • Tamaño en disco: ${liveReport.factusol.sizeMb} MB`);
  if (liveReport.factusol.lockFile.exists) {
    const isOrphan = liveReport.factusol.lockFile.isOrphan;
    console.log(`   • Archivo candado: ${liveReport.factusol.lockFile.path} (${isOrphan ? '⚠️ HUÉRFANO DETECTADO' : '✓ En uso activo concurrente'})`);
  } else {
    console.log(`   • Archivo candado (.laccdb): Cero bloqueos (Base de datos libre)`);
  }

  console.log('\n📄 REGISTRO ESTRUCTURADO EN DISCO:');
  console.log(`   • Ruta: ${logFile}`);
  console.log(`   • Tamaño actual: ${logFileSizeKb} KB`);
  if (recentLogs.length === 0) {
    console.log('   • Últimos eventos: Sin registros en el log aún.');
  } else {
    console.log(`   • Últimos ${Math.min(5, recentLogs.length)} eventos registrados:`);
    recentLogs.slice(0, 5).forEach((entry, i) => {
      const durationStr = typeof entry.duration_ms === 'number' ? ` [${entry.duration_ms} ms]` : '';
      console.log(`     [${i + 1}] ${entry.timestamp} [${entry.level}] ${entry.component}.${entry.action}${durationStr}: ${entry.message}`);
    });
  }

  if (liveReport.recentErrors.length > 0) {
    console.log('\n🚨 ERRORES RECIENTES DETECTADOS:');
    liveReport.recentErrors.forEach((err: any, i: number) => {
      console.log(`   [${i + 1}] ${err.timestamp} [${err.component}] ${err.message}`);
      if (err.error?.stack) {
        console.log(`       Stack: ${err.error.stack.split('\n')[0]}`);
      }
    });
  } else {
    console.log('\n✅ CERO ERRORES ACTIVOS EN EL AGENTE');
  }

  console.log('=============================================================\n');
  process.exit(liveReport.overallStatus === 'OFFLINE' ? 1 : 0);
}

main().catch((err) => {
  console.error('Error fatal al ejecutar test del agente:', err);
  process.exit(1);
});
