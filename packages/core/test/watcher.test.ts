import assert from 'assert';
import { AccdbFileWatcher } from '../src/watcher/accdb-file-watcher';

console.log('--- Running Core AccdbFileWatcher Tests ---');

async function testWatcherDebounceAndMutex() {
  let executionCount = 0;
  const executionReasons: string[] = [];

  const watcher = new AccdbFileWatcher({
    filePath: 'dummy-path.accdb',
    debounceMs: 50,
    minIntervalMs: 100,
  });

  watcher.onSync(async (reason) => {
    executionCount++;
    executionReasons.push(reason);
    // Simulate async sync work
    await new Promise((r) => setTimeout(r, 40));
  });

  // 1. Trigger multiple rapid change events
  watcher.scheduleSync('change-1');
  watcher.scheduleSync('change-2');
  watcher.scheduleSync('change-3');

  // Wait for debounce time + execution
  await new Promise((r) => setTimeout(r, 120));

  // Should have executed exactly once due to debouncing
  assert.strictEqual(executionCount, 1, `Debe ejecutarse 1 sola vez tras el debounce, pero fue ${executionCount}`);
  assert.strictEqual(executionReasons[0], 'change-3');

  const status = watcher.getStatus();
  assert.strictEqual(status.isRunning, false);
  assert(status.lastExecutedAt !== null);

  console.log('✓ Core AccdbFileWatcher Tests Passed');
}

testWatcherDebounceAndMutex().catch((err) => {
  console.error('❌ Error en test AccdbFileWatcher:', err);
  process.exit(1);
});
