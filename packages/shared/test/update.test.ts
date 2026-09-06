import assert from 'assert';
import {
  UpdateManifestSchema,
  UpdateCheckRequestSchema,
  UpdateCheckResponseSchema,
  UpdateConfirmRequestSchema,
} from '../src/domain/update';

console.log('--- Running Shared Update Schema Tests ---');

// 1. Valid UpdateManifest
const validManifest = {
  version: '1.1.0',
  channel: 'stable' as const,
  platform: 'win32_x64' as const,
  downloadUrl: 'https://cdn.erpbridge.io/updates/v1.1.0/agent-win32-x64.zip',
  sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  signature: 'MC4CAQAwBQYDK2VwBCIEIPz5uG8dK3m7v...',
  fileSize: 45120800,
  releaseNotes: 'Fixed Factusol OLEDB lock retry logic',
  mandatory: false,
  minVersion: '1.0.0',
};

const parsedManifest = UpdateManifestSchema.parse(validManifest);
assert.strictEqual(parsedManifest.version, '1.1.0');
assert.strictEqual(parsedManifest.channel, 'stable');
assert.strictEqual(parsedManifest.sha256.length, 64);

// 2. Check Request
const checkReq = {
  agentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  currentVersion: '1.0.0',
  licenseKey: 'EB-78K2A-9MP4X-3W7Q1-Y9N2Z',
  platform: 'win32',
  arch: 'x64',
};
const parsedCheck = UpdateCheckRequestSchema.parse(checkReq);
assert.strictEqual(parsedCheck.currentVersion, '1.0.0');

// 3. Confirm Request
const confirmReq = {
  agentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  status: 'success' as const,
};
const parsedConfirm = UpdateConfirmRequestSchema.parse(confirmReq);
assert.strictEqual(parsedConfirm.status, 'success');

// 4. Check Response
const checkResp = {
  available: true,
  version: '1.1.0',
  downloadUrl: 'https://cdn.erpbridge.io/updates/v1.1.0/agent-win32-x64.zip',
  sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  mandatory: false,
};
const parsedResp = UpdateCheckResponseSchema.parse(checkResp);
assert.strictEqual(parsedResp.available, true);

console.log('✓ Shared Update Schema Tests Passed');
