import assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { UpdateSigner } from '@erp-bridge/core';
import { UpdateVerifier } from '../src/update/update-verifier';
import { AutoUpdater } from '../src/update/auto-updater';
import { UpdateSupervisor } from '../src/update/update-supervisor';

async function run() {
  console.log('--- Running Agent AutoUpdater & Verifier Tests ---');

  const testDir = path.join(__dirname, 'temp_updater_test');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const tempDir = path.join(testDir, 'temp');
  const backupDir = path.join(testDir, 'backup');
  const currentBin = path.join(testDir, 'agent.exe');
  const updateBin = path.join(testDir, 'agent-new.exe');

  // Setup sample binary file
  fs.writeFileSync(currentBin, 'ORIGINAL-BINARY-v1.0.0');
  fs.writeFileSync(updateBin, 'NEW-RELEASE-BINARY-v1.1.0');

  // 1. Test Digital Signature & SHA-256 Verification
  const { publicKey, privateKey } = UpdateSigner.generateKeyPair();
  const validSha256 = UpdateVerifier.calculateFileSHA256(updateBin);
  const signature = UpdateSigner.sign(fs.readFileSync(updateBin), privateKey);

  const verificationSuccess = UpdateVerifier.verifyBinary(updateBin, validSha256, signature, publicKey);
  assert.strictEqual(verificationSuccess.valid, true);

  // Test tampered signature/hash
  const wrongSha = '0000000000000000000000000000000000000000000000000000000000000000';
  const verificationTampered = UpdateVerifier.verifyBinary(updateBin, wrongSha, signature, publicKey);
  assert.strictEqual(verificationTampered.valid, false);

  // 2. Test Backup, Apply and Rollback
  const updater = new AutoUpdater({
    apiBaseUrl: 'http://localhost:3000',
    agentId: 'agent_test_1',
    currentVersion: '1.0.0',
    publicKeyPem: publicKey,
    tempDir,
    backupDir,
  });

  // Backup
  const backupPath = await updater.backupCurrentBinary(currentBin);
  assert(fs.existsSync(backupPath), 'Backup file must exist');
  assert.strictEqual(fs.readFileSync(backupPath, 'utf8'), 'ORIGINAL-BINARY-v1.0.0');

  // Apply update
  await updater.applyUpdate(updateBin, currentBin);
  assert.strictEqual(fs.readFileSync(currentBin, 'utf8'), 'NEW-RELEASE-BINARY-v1.1.0');

  // Rollback
  await updater.rollback(backupPath, currentBin);
  assert.strictEqual(fs.readFileSync(currentBin, 'utf8'), 'ORIGINAL-BINARY-v1.0.0');

  // 3. Test UpdateSupervisor
  const supervisor = new UpdateSupervisor({ healthCheckTimeoutMs: 1000 });

  // Scenario A: Healthy service
  let checkCalls = 0;
  const isHealthy = await supervisor.observePostUpdateHealth(
    async () => {
      checkCalls++;
      return true;
    },
    async () => {
      assert.fail('Rollback should not be called when healthy');
    }
  );
  assert.strictEqual(isHealthy, true);
  assert(checkCalls > 0);

  // Scenario B: Unhealthy service -> Triggers rollback
  let rollbackExecuted = false;
  const isUnhealthy = await supervisor.observePostUpdateHealth(
    async () => false,
    async () => {
      rollbackExecuted = true;
    }
  );
  assert.strictEqual(isUnhealthy, false);
  assert.strictEqual(rollbackExecuted, true, 'Supervisor must trigger rollback on health failure');

  // Cleanup
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  console.log('✓ Agent AutoUpdater & Verifier Tests Passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
