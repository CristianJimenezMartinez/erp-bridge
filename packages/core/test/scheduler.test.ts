import assert from 'assert';
import { SyncScheduler } from '../src/scheduler/sync.scheduler';

console.log('--- Running Core SyncScheduler Tests ---');

const scheduler = new SyncScheduler();

// Test frequency to milliseconds conversion
assert.strictEqual(scheduler.frequencyToMilliseconds('every_5_minutes'), 300000);
assert.strictEqual(scheduler.frequencyToMilliseconds('every_15_minutes'), 900000);
assert.strictEqual(scheduler.frequencyToMilliseconds('every_hour'), 3600000);
assert.strictEqual(scheduler.frequencyToMilliseconds('every_24_hours'), 86400000);
assert.strictEqual(scheduler.frequencyToMilliseconds('manual'), 0);

// Test concurrency lock
assert.strictEqual(scheduler.isJobRunning('job_non_existent'), false);

console.log('✓ Core SyncScheduler Tests Passed');
