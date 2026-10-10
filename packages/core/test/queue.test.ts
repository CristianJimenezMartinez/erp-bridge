import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  FileEventQueue,
  StoreAndForwardQueue,
  QueueWorker,
  QueueEvent,
} from '../src/queue';

console.log('--- Running Core Queue & Store-and-Forward Tests ---');

function createTempDir(): string {
  const dir = path.join(
    os.tmpdir(),
    `bentian-queue-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function removeDir(dir: string): void {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {}
}

async function runQueueTests() {
  const tempDir = createTempDir();
  const queueFile = path.join(tempDir, 'test-queue.json');

  try {
    // -------------------------------------------------------------
    // 1. Encolado básico, persistencia en disco y estadísticas
    // -------------------------------------------------------------
    console.log('▶ Test 1: Operaciones básicas de cola y persistencia en disco');
    const queue = new FileEventQueue({
      storagePath: queueFile,
      baseDelayMs: 100,
      maxRetries: 3,
    });

    const evt1 = await queue.enqueue('STOCK_SYNC', { sku: 'PROD-001', qty: 15 });
    const evt2 = await queue.enqueue('ORDER_PUSH', { orderId: 'ORD-999', total: 120.5 });
    const evt3 = await queue.enqueue('ORDER_ACK', { orderId: 'ORD-999', status: 'ACKNOWLEDGED' });

    assert.strictEqual(evt1.status, 'PENDING');
    assert.strictEqual(evt1.attempts, 0);
    assert.strictEqual(evt1.type, 'STOCK_SYNC');
    assert.strictEqual(evt2.type, 'ORDER_PUSH');
    assert.strictEqual(evt3.type, 'ORDER_ACK');

    // Verificar que el archivo se ha escrito en disco físicamente
    assert.ok(fs.existsSync(queueFile), 'El archivo de cola debe existir en disco');
    const rawDisk = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
    assert.strictEqual(rawDisk.length, 3, 'El archivo en disco debe contener los 3 eventos');

    let stats = await queue.getStats();
    assert.strictEqual(stats.total, 3);
    assert.strictEqual(stats.pending, 3);
    assert.strictEqual(stats.processing, 0);

    // Peek: no debe mutar estado
    const peeked = await queue.peek();
    assert.ok(peeked);
    assert.strictEqual(peeked?.id, evt1.id);
    assert.strictEqual(peeked?.status, 'PENDING');

    stats = await queue.getStats();
    assert.strictEqual(stats.pending, 3);

    // Dequeue: debe marcar como PROCESSING e incrementar intentos
    const dequeued1 = await queue.dequeue();
    assert.ok(dequeued1);
    assert.strictEqual(dequeued1?.id, evt1.id);
    assert.strictEqual(dequeued1?.status, 'PROCESSING');
    assert.strictEqual(dequeued1?.attempts, 1);

    stats = await queue.getStats();
    assert.strictEqual(stats.pending, 2);
    assert.strictEqual(stats.processing, 1);

    // Acknowledge: marca como COMPLETED
    await queue.acknowledge(dequeued1!.id);
    stats = await queue.getStats();
    assert.strictEqual(stats.processing, 0);
    assert.strictEqual(stats.completed, 1);

    const completedEvt = await queue.getEvent(dequeued1!.id);
    assert.strictEqual(completedEvt?.status, 'COMPLETED');
    console.log('✓ Test 1 superado con éxito');

    // -------------------------------------------------------------
    // 2. Desencolado idempotente libre de carreras concurrentes
    // -------------------------------------------------------------
    console.log('▶ Test 2: Desencolado idempotente y concurrencia');
    // Tenemos evt2 y evt3 pendientes. Lanzamos 5 peticiones concurrentes de dequeue:
    // Solo deben salir evt2 y evt3, el resto deben ser null.
    const concurrentDequeues = await Promise.all([
      queue.dequeue(),
      queue.dequeue(),
      queue.dequeue(),
      queue.dequeue(),
      queue.dequeue(),
    ]);

    const nonNulls = concurrentDequeues.filter((e): e is QueueEvent => e !== null);
    assert.strictEqual(nonNulls.length, 2, 'Solo 2 eventos estaban disponibles');
    assert.notStrictEqual(nonNulls[0]?.id, nonNulls[1]?.id, 'No debe haber duplicados en concurrencia');

    // Agradecemos ambos
    await queue.acknowledge(nonNulls[0]!.id);
    await queue.acknowledge(nonNulls[1]!.id);

    stats = await queue.getStats();
    assert.strictEqual(stats.pending, 0);
    assert.strictEqual(stats.completed, 3);
    console.log('✓ Test 2 superado con éxito');

    // -------------------------------------------------------------
    // 3. Reintentos con backoff exponencial y fallo definitivo
    // -------------------------------------------------------------
    console.log('▶ Test 3: Reintentos con backoff exponencial y fallo definitivo');
    const retryEvt = await queue.enqueue('STOCK_SYNC', { sku: 'PROD-RETRY', qty: 5 }, { maxAttempts: 2 });
    assert.strictEqual(retryEvt.attempts, 0);

    // Intento 1
    const attempt1 = await queue.dequeue();
    assert.strictEqual(attempt1?.id, retryEvt.id);
    assert.strictEqual(attempt1?.attempts, 1);

    // Fallamos intento 1 (retryable: true)
    await queue.fail(attempt1!.id, 'Error de conexión simulado 1', true);

    const afterFail1 = await queue.getEvent(retryEvt.id);
    assert.strictEqual(afterFail1?.status, 'PENDING', 'Debe regresar a PENDING para reintento');
    assert.strictEqual(afterFail1?.attempts, 1);
    assert.strictEqual(afterFail1?.error, 'Error de conexión simulado 1');
    assert.ok(afterFail1!.nextRetryAt > Date.now() - 5, 'nextRetryAt debe tener backoff');

    // Como nextRetryAt está en el futuro, un dequeue inmediato debe ignorarlo
    const prematureDequeue = await queue.dequeue();
    assert.strictEqual(prematureDequeue, null, 'No debe desencolar antes de nextRetryAt');

    // Esperar al vencimiento del backoff breve (baseDelayMs = 100ms)
    await new Promise((resolve) => setTimeout(resolve, 180));

    // Intento 2
    const attempt2 = await queue.dequeue();
    assert.ok(attempt2, 'Debe desencolarse tras expirar el retardo de backoff');
    assert.strictEqual(attempt2?.attempts, 2);

    // Fallamos intento 2 (alcanza maxAttempts = 2 -> FAILED)
    await queue.fail(attempt2!.id, 'Error definitivo simulado 2', true);

    const afterFail2 = await queue.getEvent(retryEvt.id);
    assert.strictEqual(afterFail2?.status, 'FAILED', 'Debe pasar a FAILED al superar maxAttempts');
    assert.strictEqual(afterFail2?.attempts, 2);

    // Esperar y verificar que nunca vuelve a desencolarse
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.strictEqual(await queue.dequeue(), null);
    console.log('✓ Test 3 superado con éxito');

    // -------------------------------------------------------------
    // 4. Cola Store-and-Forward y desconexión simulada
    // -------------------------------------------------------------
    console.log('▶ Test 4: Encolado ante desconexión simulada (Store-and-Forward)');
    const sfQueueFile = path.join(tempDir, 'sf-queue.json');
    const sfQueue = new StoreAndForwardQueue({
      storagePath: sfQueueFile,
      baseDelayMs: 50,
      initialOnlineState: false, // Desconectado inicialmente
    });

    assert.strictEqual(sfQueue.isOnline(), false);

    // Almacenamos eventos durante la caída de red
    const stored1 = await sfQueue.store('STOCK_SYNC', { sku: 'OFFLINE-1', stock: 40 });
    const stored2 = await sfQueue.store('ORDER_PUSH', { orderId: 'OFFLINE-ORD-1', amount: 50 });

    assert.strictEqual(stored1.status, 'PENDING');
    assert.strictEqual(stored2.status, 'PENDING');

    // Worker vinculado con comprobación online
    const dispatchedEvents: QueueEvent[] = [];
    const worker = new QueueWorker(sfQueue, {
      pollIntervalMs: 50,
      isOnline: () => sfQueue.isOnline(),
    });

    worker.registerHandler('STOCK_SYNC', async (event) => {
      dispatchedEvents.push(event);
    });
    worker.registerHandler('ORDER_PUSH', async (event) => {
      dispatchedEvents.push(event);
    });

    // Intentar drenar mientras está offline: no debe despachar nada
    const offlineDrained = await worker.drain();
    assert.strictEqual(offlineDrained, 0);
    assert.strictEqual(dispatchedEvents.length, 0);

    const sfStatsOffline = await sfQueue.getStats();
    assert.strictEqual(sfStatsOffline.pending, 2, 'Los eventos deben seguir seguros en disco');

    // Restablecer conectividad (online = true)
    sfQueue.setOnline(true);
    assert.strictEqual(sfQueue.isOnline(), true);

    // Drenar ahora que hay conexión
    const onlineDrained = await worker.drain();
    assert.strictEqual(onlineDrained, 2, 'Debe procesar los 2 eventos acumulados');
    assert.strictEqual(dispatchedEvents.length, 2);
    assert.strictEqual(dispatchedEvents[0]?.type, 'STOCK_SYNC');
    assert.strictEqual(dispatchedEvents[1]?.type, 'ORDER_PUSH');

    const sfStatsOnline = await sfQueue.getStats();
    assert.strictEqual(sfStatsOnline.pending, 0);
    assert.strictEqual(sfStatsOnline.completed, 2);
    console.log('✓ Test 4 superado con éxito');

    // -------------------------------------------------------------
    // 5. Preservación y recuperación tras reinicio abrupto (Crash Recovery)
    // -------------------------------------------------------------
    console.log('▶ Test 5: Preservación y recuperación tras reinicio / crash');
    const crashQueueFile = path.join(tempDir, 'crash-queue.json');
    const q1 = new FileEventQueue({ storagePath: crashQueueFile });

    await q1.enqueue('STOCK_SYNC', { sku: 'CRASH-SKU', qty: 100 });
    const inFlight = await q1.dequeue();
    assert.ok(inFlight);
    assert.strictEqual(inFlight?.status, 'PROCESSING');

    // Simulamos crash: proceso termina repentinamente sin llamar acknowledge() ni fail().
    // Nueva instancia de la cola arranca leyendo el mismo archivo:
    const q2 = new FileEventQueue({
      storagePath: crashQueueFile,
      recoverOnStartup: true,
    });

    const recoveredEvt = await q2.getEvent(inFlight!.id);
    assert.strictEqual(
      recoveredEvt?.status,
      'PENDING',
      'El evento que quedó en PROCESSING durante el crash debe recuperarse a PENDING'
    );

    // Ahora q2 puede volver a desencolarlo con éxito
    const redelivered = await q2.dequeue();
    assert.ok(redelivered);
    assert.strictEqual(redelivered?.id, inFlight?.id);
    await q2.acknowledge(redelivered!.id);

    const finalStats = await q2.getStats();
    assert.strictEqual(finalStats.pending, 0);
    assert.strictEqual(finalStats.completed, 1);
    console.log('✓ Test 5 superado con éxito');

    // -------------------------------------------------------------
    // 6. Respaldo defensivo (.bak) ante corrupción de archivo primario
    // -------------------------------------------------------------
    console.log('▶ Test 6: Respaldo defensivo (.bak) ante corrupción');
    const bakQueueFile = path.join(tempDir, 'backup-queue.json');
    const bakQueue = new FileEventQueue({ storagePath: bakQueueFile });
    await bakQueue.enqueue('ORDER_ACK', { test: true });

    // Corromper intencionadamente el archivo primario
    fs.writeFileSync(bakQueueFile, '{ "corrupted_incomplete_json": [', 'utf8');

    // Nueva instancia debe leer el .bak
    const recoveredFromBak = new FileEventQueue({ storagePath: bakQueueFile });
    const bakStats = await recoveredFromBak.getStats();
    assert.strictEqual(bakStats.total, 1, 'Debe haber recuperado los datos desde el archivo .bak');
    console.log('✓ Test 6 superado con éxito');

    console.log('\n✅ Todos los tests del motor de cola offline pasaron correctamente.');
  } finally {
    removeDir(tempDir);
  }
}

runQueueTests().catch((err) => {
  console.error('❌ Error en pruebas de cola offline:', err);
  process.exit(1);
});
