import assert from 'assert';
import {
  LicenseSchema,
  LicenseActivationRequestSchema,
  LicenseValidationResponseSchema,
  CreateLicenseDtoSchema,
  HardwareFingerprintSchema,
} from '../src/domain/license';

console.log('--- Running Shared License Schema Tests ---');

// 1. Valid License
const validLicense = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  key: 'EB-78K2A-9MP4X-3W7Q1-Y9N2Z',
  organizationId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  plan: 'starter' as const,
  status: 'active' as const,
  maxActivations: 3,
  currentActivations: 1,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 86400000),
};

const parsed = LicenseSchema.parse(validLicense);
assert.strictEqual(parsed.key, 'EB-78K2A-9MP4X-3W7Q1-Y9N2Z');
assert.strictEqual(parsed.plan, 'starter');
assert.strictEqual(parsed.maxActivations, 3);

// 2. Invalid Key Pattern
try {
  LicenseSchema.parse({
    ...validLicense,
    key: 'INVALID-KEY-123',
  });
  assert.fail('Should fail on invalid license key format');
} catch (e: any) {
  assert(e.errors, 'Zod rejected invalid key pattern');
}

// 3. Activation Request validation
const validActivationReq = {
  licenseKey: 'EB-78K2A-9MP4X-3W7Q1-Y9N2Z',
  hwid: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  agentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  machineInfo: { hostname: 'FACTUSOL-SERVER', platform: 'win32' },
};
const parsedReq = LicenseActivationRequestSchema.parse(validActivationReq);
assert.strictEqual(parsedReq.hwid, 'a1b2c3d4e5f60718293a4b5c6d7e8f90');

// 4. HWID schema
const validHWID = {
  macAddress: '00:1A:2B:3C:4D:5E',
  diskSerial: 'WD-WCC4N0123456',
  computerName: 'SERVER-01',
  windowsSID: 'S-1-5-21-3623811015-3361044348-30300820-1013',
  fingerprint: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
};
const parsedHWID = HardwareFingerprintSchema.parse(validHWID);
assert.strictEqual(parsedHWID.fingerprint.length, 64);

// 5. CreateLicenseDto
const createDto = {
  organizationId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  plan: 'enterprise' as const,
  maxActivations: 10,
};
const parsedDto = CreateLicenseDtoSchema.parse(createDto);
assert.strictEqual(parsedDto.maxActivations, 10);

// 6. Validation Response schema
const valResp = {
  valid: true,
  plan: 'starter' as const,
  renewedToken: 'jwt.token.here',
  expiresAt: new Date().toISOString(),
  gracePeriodRemainingSeconds: 604800,
};
const parsedValResp = LicenseValidationResponseSchema.parse(valResp);
assert.strictEqual(parsedValResp.valid, true);

console.log('✓ Shared License Schema Tests Passed');
