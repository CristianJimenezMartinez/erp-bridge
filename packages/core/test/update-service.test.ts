import assert from 'assert';
import { UpdateSigner } from '../src/update/update-signer';
import { UpdateService, compareSemver } from '../src/update/update.service';

async function run() {
  console.log('--- Running UpdateSigner & UpdateService Tests ---');

  // 1. Test semver comparisons
  assert.strictEqual(compareSemver('1.1.0', '1.0.0'), 1);
  assert.strictEqual(compareSemver('1.0.0', '1.1.0'), -1);
  assert.strictEqual(compareSemver('1.0.0', '1.0.0'), 0);
  assert.strictEqual(compareSemver('1.0.1', '1.0.0'), 1);
  assert.strictEqual(compareSemver('2.0.0', '1.9.9'), 1);

  // 2. Test Ed25519 digital signature creation and verification
  const { publicKey, privateKey } = UpdateSigner.generateKeyPair();
  const binaryPayload = Buffer.from('FAKE-BINARY-EXECUTABLE-CONTENT-v1.1.0');

  const sha256 = UpdateSigner.calculateSHA256(binaryPayload);
  assert.strictEqual(sha256.length, 64);

  const signature = UpdateSigner.sign(binaryPayload, privateKey);
  assert(signature.length > 0, 'Signature must not be empty');

  const isValid = UpdateSigner.verify(binaryPayload, signature, publicKey);
  assert.strictEqual(isValid, true, 'Signature must be verified with public key');

  // Reject tampered binary
  const tamperedPayload = Buffer.from('MALICIOUS-MODIFIED-BINARY');
  const isTamperedValid = UpdateSigner.verify(tamperedPayload, signature, publicKey);
  assert.strictEqual(isTamperedValid, false, 'Tampered binary signature verification must fail');

  // 3. Test UpdateService lifecycle
  const updateService = new UpdateService();

  // Publish manifest v1.1.0
  const manifest = await updateService.publishManifest({
    version: '1.1.0',
    channel: 'stable',
    platform: 'win32_x64',
    downloadUrl: 'https://cdn.erpbridge.io/updates/v1.1.0/erp-bridge-agent.exe',
    sha256,
    signature,
    releaseNotes: 'Performance improvements and bugfixes',
    mandatory: false,
    minVersion: '1.0.0',
  });
  assert.strictEqual(manifest.version, '1.1.0');

  // Check from Agent with older version v1.0.0 -> Should be available
  const checkOld = await updateService.checkForUpdates({
    agentId: 'agent_test_1',
    currentVersion: '1.0.0',
    platform: 'win32',
    arch: 'x64',
  });
  assert.strictEqual(checkOld.available, true);
  assert.strictEqual(checkOld.version, '1.1.0');
  assert.strictEqual(checkOld.downloadUrl, manifest.downloadUrl);

  // Check from Agent with same version v1.1.0 -> Should NOT be available
  const checkCurrent = await updateService.checkForUpdates({
    agentId: 'agent_test_1',
    currentVersion: '1.1.0',
    platform: 'win32',
    arch: 'x64',
  });
  assert.strictEqual(checkCurrent.available, false);

  // Check from Agent with newer version v1.2.0 -> Should NOT be available
  const checkNewer = await updateService.checkForUpdates({
    agentId: 'agent_test_1',
    currentVersion: '1.2.0',
    platform: 'win32',
    arch: 'x64',
  });
  assert.strictEqual(checkNewer.available, false);

  // Record update confirmation
  const history = await updateService.recordConfirmation({
    agentId: 'agent_test_1',
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    status: 'success',
  });
  assert.strictEqual(history.status, 'success');

  const historyList = await updateService.listUpdateHistory('agent_test_1');
  assert.strictEqual(historyList.length, 1);
  assert.strictEqual(historyList[0]?.toVersion, '1.1.0');

  console.log('✓ UpdateSigner & UpdateService Tests Passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
