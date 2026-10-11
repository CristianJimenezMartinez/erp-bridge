import assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { UpdateSigner } from '@erp-bridge/core';
import {
  UpdateVerifier,
  DEFAULT_UPDATE_PUBLIC_KEY,
  LEGACY_UPDATE_PUBLIC_KEY,
  UPDATE_PUBLIC_KEY_V2,
  TRUSTED_UPDATE_PUBLIC_KEYS,
} from '../src/update/update-verifier';
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

  // 4. Test AGT-001: Path traversal & version regex validation
  console.log('4. Testing AGT-001: Path traversal & version regex validation...');
  await assert.rejects(
    async () => {
      await updater.downloadUpdate('http://localhost:3000/bad', '../../malicious');
    },
    /Versión de actualización no válida o insegura/
  );

  await assert.rejects(
    async () => {
      await updater.downloadUpdate('http://localhost:3000/bad', '1.2.3/../../../evil');
    },
    /Versión de actualización no válida o insegura/
  );

  // 5. Test INF-001: Dual Key Bridge Release Verification (v1 legacy + v2 current)
  console.log('5. Testing INF-001: Dual Key Bridge Release Verification...');
  assert.strictEqual(DEFAULT_UPDATE_PUBLIC_KEY, UPDATE_PUBLIC_KEY_V2);
  assert(TRUSTED_UPDATE_PUBLIC_KEYS.includes(UPDATE_PUBLIC_KEY_V2));
  assert(TRUSTED_UPDATE_PUBLIC_KEYS.includes(LEGACY_UPDATE_PUBLIC_KEY));

  const samplePayload = path.join(testDir, 'bridge-test.bin');
  fs.writeFileSync(samplePayload, 'BENTIAN-BRIDGE-RELEASE-PAYLOAD-DATA');
  const sampleSha = UpdateVerifier.calculateFileSHA256(samplePayload);

  // 5.1 Test with untrusted ephemeral key
  const untrusted = UpdateSigner.generateKeyPair();
  const untrustedSig = UpdateSigner.sign(fs.readFileSync(samplePayload), untrusted.privateKey);
  const untrustedVerifyDefault = UpdateVerifier.verifyBinary(samplePayload, sampleSha, untrustedSig);
  assert.strictEqual(untrustedVerifyDefault.valid, false, 'Firma no confiable debe ser rechazada sin publicKeyPem');
  const untrustedVerifyExplicit = UpdateVerifier.verifyBinary(samplePayload, sampleSha, untrustedSig, DEFAULT_UPDATE_PUBLIC_KEY);
  assert.strictEqual(untrustedVerifyExplicit.valid, false, 'Firma no confiable debe ser rechazada con DEFAULT_UPDATE_PUBLIC_KEY');

  // 5.2 Test with v2 key from .bentian-secrets
  const v2PrivPath = path.join(os.homedir(), '.bentian-secrets', 'update-private-v2.pem');
  if (fs.existsSync(v2PrivPath)) {
    const v2Priv = fs.readFileSync(v2PrivPath, 'utf8');
    const v2Sig = UpdateSigner.sign(fs.readFileSync(samplePayload), v2Priv);
    const v2VerifyNoKey = UpdateVerifier.verifyBinary(samplePayload, sampleSha, v2Sig);
    assert.strictEqual(v2VerifyNoKey.valid, true, 'Firma v2 debe ser aceptada sin pasar publicKeyPem');
    const v2VerifyExplicit = UpdateVerifier.verifyBinary(samplePayload, sampleSha, v2Sig, DEFAULT_UPDATE_PUBLIC_KEY);
    assert.strictEqual(v2VerifyExplicit.valid, true, 'Firma v2 debe ser aceptada con DEFAULT_UPDATE_PUBLIC_KEY');
    console.log('  ✓ Firma con clave v2 verificada exitosamente en modo puente.');
  }

  // 5.3 Test with legacy v1 key from .bentian-secrets
  const v1PrivPath = path.join(os.homedir(), '.bentian-secrets', 'update-private.pem');
  if (fs.existsSync(v1PrivPath)) {
    const v1Priv = fs.readFileSync(v1PrivPath, 'utf8');
    const v1Sig = UpdateSigner.sign(fs.readFileSync(samplePayload), v1Priv);
    const v1VerifyNoKey = UpdateVerifier.verifyBinary(samplePayload, sampleSha, v1Sig);
    assert.strictEqual(v1VerifyNoKey.valid, true, 'Firma v1 (legada) debe ser aceptada en la release puente sin pasar publicKeyPem');
    const v1VerifyExplicit = UpdateVerifier.verifyBinary(samplePayload, sampleSha, v1Sig, DEFAULT_UPDATE_PUBLIC_KEY);
    assert.strictEqual(v1VerifyExplicit.valid, true, 'Firma v1 (legada) debe ser aceptada en la release puente con DEFAULT_UPDATE_PUBLIC_KEY');
    console.log('  ✓ Firma de transición con clave v1 legada verificada exitosamente en modo puente.');
  }

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
