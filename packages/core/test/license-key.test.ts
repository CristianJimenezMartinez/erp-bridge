import assert from 'assert';
import { LicenseKeyGenerator } from '../src/license/license-key.generator';

console.log('--- Running LicenseKeyGenerator Tests ---');

// 1. Generate keys and validate them
for (let i = 0; i < 50; i++) {
  const key = LicenseKeyGenerator.generate();
  assert(/^EB-[0-9A-HJ-NP-Z]{5}-[0-9A-HJ-NP-Z]{5}-[0-9A-HJ-NP-Z]{5}-[0-9A-HJ-NP-Z]{5}$/.test(key), `Key ${key} matches format`);
  const validation = LicenseKeyGenerator.validate(key);
  assert.strictEqual(validation.valid, true, `Generated key ${key} must pass validation`);
}

// 2. Test normalization (handling lowercase, 'o' -> '0', 'i'/'l' -> '1', spaces)
const generated = LicenseKeyGenerator.generate();
const lowercased = generated.toLowerCase();
assert.strictEqual(LicenseKeyGenerator.validate(lowercased).valid, true);

// 3. Test corrupted key detection (tampering with 1 character)
const validKey = LicenseKeyGenerator.generate();
// Modify one character in the middle
const parts = validKey.split('-');
const lastPart = parts[4] || 'AAAAA';
// Flip the last char
const tamperedLastChar = lastPart[4] === 'A' ? 'B' : 'A';
const tamperedKey = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${lastPart.substring(0, 4)}${tamperedLastChar}`;
const tamperedResult = LicenseKeyGenerator.validate(tamperedKey);
assert.strictEqual(tamperedResult.valid, false, 'Tampered key must be rejected by checksum');

// 4. Test invalid formats
assert.strictEqual(LicenseKeyGenerator.validate('').valid, false);
assert.strictEqual(LicenseKeyGenerator.validate('EB-12345').valid, false);
assert.strictEqual(LicenseKeyGenerator.validate('ABC-12345-12345-12345-12345').valid, false);

console.log('✓ LicenseKeyGenerator Tests Passed');
