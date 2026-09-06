import assert from 'assert';
import { RetryEngine } from '../src/retry/retry.engine';
import { SyncExecution } from '@erp-bridge/shared';

console.log('--- Running Core RetryEngine Tests ---');

const retryEngine = new RetryEngine();

// 1. Backoff calculation test
const backoff1 = retryEngine.calculateBackoff(1, 10, 300);
assert(backoff1 >= 10 && backoff1 <= 15, 'Attempt 1 backoff should be around base delay');

const backoff2 = retryEngine.calculateBackoff(2, 10, 300);
assert(backoff2 >= 20 && backoff2 <= 25, 'Attempt 2 backoff should be doubled');

const backoffCap = retryEngine.calculateBackoff(10, 10, 100);
assert(backoffCap <= 100, 'Backoff should respect max delay cap');

// 2. Failed SKUs extraction
const executionWithErrors: SyncExecution = {
  id: 'exec_fail_1',
  syncJobId: 'job_1',
  organizationId: 'org_default',
  status: 'PARTIAL_SUCCESS',
  startedAt: new Date(),
  processedCount: 5,
  successCount: 3,
  failedCount: 2,
  errors: [
    { itemSku: 'ART-001', code: 'INVALID_PRICE', message: 'Price is zero' },
    { itemSku: 'ART-002', code: 'TIMEOUT', message: 'HTTP 504' },
    { itemSku: 'ART-001', code: 'DUPLICATE', message: 'Duplicate item' },
  ],
};

const failedSkus = retryEngine.extractFailedSkus(executionWithErrors);
assert.strictEqual(failedSkus.length, 2, 'Should deduplicate SKUs');
assert(failedSkus.includes('ART-001'), 'Should contain ART-001');
assert(failedSkus.includes('ART-002'), 'Should contain ART-002');
assert.strictEqual(retryEngine.canRetry(executionWithErrors), true);

const cleanExecution: SyncExecution = {
  id: 'exec_clean',
  syncJobId: 'job_1',
  organizationId: 'org_default',
  status: 'SUCCESS',
  startedAt: new Date(),
  processedCount: 5,
  successCount: 5,
  failedCount: 0,
  errors: [],
};

assert.strictEqual(retryEngine.canRetry(cleanExecution), false);
assert.strictEqual(retryEngine.extractFailedSkus(cleanExecution).length, 0);

console.log('✓ Core RetryEngine Tests Passed');
