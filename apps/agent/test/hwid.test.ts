import assert from 'assert';
import { HWIDManager } from '../src/security/hwid';

async function run() {
  console.log('--- Running HWID Manager Tests ---');

  const fp1 = await HWIDManager.calculate();
  assert(fp1.fingerprint, 'Fingerprint must be present');
  assert.strictEqual(fp1.fingerprint.length, 64, 'SHA-256 fingerprint must be 64 hex characters');

  // Verify determinism on same machine
  const fp2 = await HWIDManager.calculate();
  assert.strictEqual(fp1.fingerprint, fp2.fingerprint, 'Fingerprint calculation must be deterministic');

  const hash = await HWIDManager.getFingerprintHash();
  assert.strictEqual(hash, fp1.fingerprint);

  console.log('✓ HWID Manager Tests Passed (Fingerprint:', fp1.fingerprint.substring(0, 16) + '...)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
