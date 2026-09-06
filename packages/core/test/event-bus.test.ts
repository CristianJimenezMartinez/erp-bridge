import assert from 'assert';
import { EventBus } from '../src/events/event-bus';
import { BridgeEvent } from '@erp-bridge/shared';

console.log('--- Running Core EventBus Tests ---');

async function testEventBus() {
  const bus = EventBus.getInstance();
  bus.clearHistory();

  const receivedEvents: BridgeEvent[] = [];

  // Subscribe to specific event
  const unsubscribeStarted = bus.subscribe('SYNC_STARTED', (evt) => {
    receivedEvents.push(evt);
  });

  // Subscribe to wildcard
  const wildcardEvents: BridgeEvent[] = [];
  const unsubscribeAll = bus.subscribe('*', (evt) => {
    wildcardEvents.push(evt);
  });

  // Publish SYNC_STARTED
  const event1 = await bus.publish({
    type: 'SYNC_STARTED',
    organizationId: 'org_test',
    source: 'test-runner',
    data: { jobId: 'job_123' },
  });

  assert.strictEqual(event1.status, 'COMPLETED');
  assert.strictEqual(receivedEvents.length, 1);
  assert.strictEqual(wildcardEvents.length, 1);
  assert.strictEqual(receivedEvents[0]?.type, 'SYNC_STARTED');

  // Publish SYNC_COMPLETED (should not trigger specific SYNC_STARTED handler)
  await bus.publish({
    type: 'SYNC_COMPLETED',
    organizationId: 'org_test',
    source: 'test-runner',
    data: { processed: 10, succeeded: 10 },
  });

  assert.strictEqual(receivedEvents.length, 1);
  assert.strictEqual(wildcardEvents.length, 2);

  // Check history
  const recent = bus.getRecentEvents('org_test');
  assert.strictEqual(recent.length, 2);

  // Unsubscribe
  unsubscribeStarted();
  unsubscribeAll();

  await bus.publish({
    type: 'SYNC_STARTED',
    organizationId: 'org_test',
    source: 'test-runner',
    data: {},
  });

  // Count should not increase after unsubscription
  assert.strictEqual(receivedEvents.length, 1);

  console.log('✓ Core EventBus Tests Passed');
}

testEventBus().catch((err) => {
  console.error('❌ Error en test EventBus:', err);
  process.exit(1);
});
