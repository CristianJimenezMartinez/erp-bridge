import assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { SecureStore } from '../src/security/secure-store';

async function run() {
  console.log('--- Running SecureStore Tests ---');

  const testDir = path.join(__dirname, 'temp_secure_store');
  const store = new SecureStore(testDir);

  const hwidMachine1 = '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff';
  const hwidMachine2 = '9999888877776666555544443333222211110000ffffddddccccbbbbaaaa0000';
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwbGFuIjoicHJvIn0.abc123sig';

  // 1. Save and load with same HWID
  await store.saveLicenseToken(testToken, hwidMachine1);
  assert.strictEqual(store.hasLicenseToken(), true);

  const loaded = await store.loadLicenseToken(hwidMachine1);
  assert.strictEqual(loaded, testToken, 'Decrypted token must match original');

  // 2. Anti-tamper: Load with different HWID (simulating copied license.enc file to another PC)
  const loadedWrongHwid = await store.loadLicenseToken(hwidMachine2);
  assert.strictEqual(loadedWrongHwid, null, 'Decryption must fail when loaded on different HWID');

  // 3. Delete token
  await store.deleteLicenseToken();
  assert.strictEqual(store.hasLicenseToken(), false);
  const loadedAfterDelete = await store.loadLicenseToken(hwidMachine1);
  assert.strictEqual(loadedAfterDelete, null);

  // Cleanup
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  console.log('✓ SecureStore Tests Passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
