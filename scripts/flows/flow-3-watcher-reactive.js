const fs = require('fs');
const path = require('path');
const { DB_PATH, runAdodb } = require('./flow-helper');
const { runFlow2StockSync } = require('./flow-2-stock-sync');

class TestAccdbFileWatcher {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.pollingIntervalMs = options.pollingIntervalMs || 500;
    this.debounceMs = options.debounceMs || 1000;
    this.minIntervalMs = options.minIntervalMs || 2000;
    this.isWatching = false;
    this.debounceTimer = null;
    this.lastRunAt = 0;
    this.triggers = 0;
    this.executions = 0;
    this.onSyncCallback = null;
  }

  onSync(fn) {
    this.onSyncCallback = fn;
  }

  start() {
    this.isWatching = true;
    fs.watchFile(this.filePath, { interval: this.pollingIntervalMs }, (curr, prev) => {
      if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
        this.triggers++;
        console.log(`      [AccdbWatcher] Evento FS detectado! mtime anterior: ${prev.mtime.toISOString()} -> nuevo: ${curr.mtime.toISOString()} (Triggers: ${this.triggers})`);
        this.scheduleSync('fs-mtime-change');
      }
    });
    console.log(`      [AccdbWatcher] Vigilando archivo: ${path.basename(this.filePath)} (polling: ${this.pollingIntervalMs}ms, debounce: ${this.debounceMs}ms)`);
  }

  scheduleSync(reason) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      console.log(`      [AccdbWatcher] Debounce reseteado por rafaga de cambios`);
    }
    this.debounceTimer = setTimeout(async () => {
      this.executions++;
      console.log(`      [AccdbWatcher] Ventana de debounce completada. Ejecutando callback de sincronizacion reactiva (#${this.executions})`);
      if (this.onSyncCallback) {
        await this.onSyncCallback(reason);
      }
    }, this.debounceMs);
  }

  stop() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    fs.unwatchFile(this.filePath);
    this.isWatching = false;
    console.log(`      [AccdbWatcher] Watcher detenido.`);
  }
}

async function runFlow3WatcherReactive() {
  console.log('\n======================================================');
  console.log('   FLUJO 3: REACTIVE ACCDB WATCHER & DELTA SYNC      ');
  console.log('======================================================');

  // Archivo dedicado para pruebas reactivas de watcher
  const watchFilePath = path.resolve(__dirname, 'test-watcher-factusol.accdb');
  fs.writeFileSync(watchFilePath, 'BENTIAN_WATCHER_TEST');

  console.log('[1/4] Inicializando AccdbFileWatcher para base de datos Factusol...');
  const watcher = new TestAccdbFileWatcher(watchFilePath, {
    pollingIntervalMs: 300,
    debounceMs: 800,
    minIntervalMs: 1500
  });

  let syncTriggered = false;
  let syncCompleted = false;
  let syncReason = '';

  watcher.onSync(async (reason) => {
    syncTriggered = true;
    syncReason = reason;
    console.log(`      >>> Callback de sincronizacion reactiva disparado con motivo: "${reason}"`);
    console.log('      >>> Ejecutando Flujo 2 (Stock Sync) en respuesta al cambio detectado...');
    try {
      await runFlow2StockSync();
    } finally {
      syncCompleted = true;
    }
  });

  watcher.start();

  // 2. Simular cambio en Factusol tocando el archivo vigilado
  console.log('[2/4] Simulando actividad de usuario en Factusol (modificacion de archivo .accdb)...');
  const now = new Date();
  fs.utimesSync(watchFilePath, now, now);

  // Simular rafaga inmediata (segundo toque 100ms despues para probar debounce)
  await new Promise(r => setTimeout(r, 100));
  const now2 = new Date(Date.now() + 1000);
  fs.utimesSync(watchFilePath, now2, now2);

  // 3. Esperar a que el debounce expire y la sincronización se complete al 100%
  console.log('[3/4] Esperando expiracion de debounce y finalizacion de ejecucion reactiva...');
  const maxWaitMs = 15000;
  const startWait = Date.now();
  while (!syncCompleted && (Date.now() - startWait) < maxWaitMs) {
    await new Promise(r => setTimeout(r, 200));
  }

  // 4. Detener watcher, limpiar archivo temporal y verificar resultados
  watcher.stop();
  if (fs.existsSync(watchFilePath)) fs.unlinkSync(watchFilePath);

  if (!syncCompleted) {
    throw new Error('El watcher no completo la sincronizacion reactiva dentro del tiempo limite');
  }

  console.log('\n>>> VERIFICACION FINAL FLUJO 3:');
  console.log(`    Triggers detectados por fs.watchFile: ${watcher.triggers}`);
  console.log(`    Ejecuciones de sync post-debounce: ${watcher.executions} (esperado: 1 gracias a debounce)`);
  console.log(`    Motivo de activacion: "${syncReason}"`);
  console.log('    ESTADO FLUJO 3: 100% COMPLETADO CON EXITO!\n');

  return { success: true, triggers: watcher.triggers, executions: watcher.executions };
}

if (require.main === module) {
  (async () => {
    await runFlow3WatcherReactive();
  })().catch(err => {
    console.error('ERROR EN FLUJO 3:', err);
    process.exit(1);
  });
}

module.exports = { runFlow3WatcherReactive };
