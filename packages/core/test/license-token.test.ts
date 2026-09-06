import assert from 'assert';
import { LicenseTokenManager } from '../src/license/license-token';
import { LicenseTokenPayload } from '@erp-bridge/shared';

console.log('--- Running LicenseTokenManager Tests ---');

const secret = 'super-secret-key-123456789';

const validPayload: LicenseTokenPayload = {
  licenseId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  organizationId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  plan: 'professional',
  hwid: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  agentId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 7 * 86400000, // +7 days
};

// 1. Create and verify valid token
const token = LicenseTokenManager.createToken(validPayload, secret);
assert(token.includes('.'), 'Token must be dot-separated');
const verification = LicenseTokenManager.verifyToken(token, secret);
assert.strictEqual(verification.valid, true);
assert.strictEqual(verification.payload?.plan, 'professional');
assert.strictEqual(verification.payload?.hwid, validPayload.hwid);

// 2. Reject wrong secret
const wrongSecretVerification = LicenseTokenManager.verifyToken(token, 'wrong-secret');
assert.strictEqual(wrongSecretVerification.valid, false);
assert.strictEqual(wrongSecretVerification.reason, 'Invalid token signature');

// 3. Reject expired token
const expiredPayload: LicenseTokenPayload = {
  ...validPayload,
  issuedAt: Date.now() - 10 * 86400000,
  expiresAt: Date.now() - 1000, // expired 1s ago
};
const expiredToken = LicenseTokenManager.createToken(expiredPayload, secret);
const expiredVerification = LicenseTokenManager.verifyToken(expiredToken, secret);
assert.strictEqual(expiredVerification.valid, false);
assert(expiredVerification.reason?.includes('expired'));

// 4. Decode unverified
const decoded = LicenseTokenManager.decodeUnverified(token);
assert.strictEqual(decoded?.licenseId, validPayload.licenseId);

console.log('✓ LicenseTokenManager Tests Passed');
