import assert from 'assert';
import { LicenseService } from '../src/license/license.service';

async function run() {
  console.log('--- Running LicenseService Tests ---');

  const licenseService = new LicenseService();
  const orgId = '11111111-2222-3333-4444-555555555555';

  // 1. Create License
  const license = await licenseService.createLicense({
    organizationId: orgId,
    plan: 'professional',
    maxActivations: 2,
    trialDays: 14,
  });

  assert(license.key.startsWith('EB-'), 'License key must start with EB-');
  assert.strictEqual(license.plan, 'professional');
  assert.strictEqual(license.maxActivations, 2);
  assert.strictEqual(license.currentActivations, 0);

  // 2. Activate on First Machine
  const hwid1 = '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff';
  const act1 = await licenseService.activateLicense({
    licenseKey: license.key,
    hwid: hwid1,
    machineInfo: { hostname: 'SERVER-01' },
  });

  assert.strictEqual(act1.success, true);
  assert(act1.licenseToken, 'License token must be returned');
  assert.strictEqual(act1.plan, 'professional');

  // Verify license updated
  const updatedLic1 = await licenseService.getLicenseByKey(license.key);
  assert.strictEqual(updatedLic1?.currentActivations, 1);

  // 3. Activate on Second Machine
  const hwid2 = '2222333344445555666677778888999900001111bbbbccccddddeeeeffff0000';
  const act2 = await licenseService.activateLicense({
    licenseKey: license.key,
    hwid: hwid2,
    machineInfo: { hostname: 'SERVER-02' },
  });
  assert.strictEqual(act2.success, true);

  const updatedLic2 = await licenseService.getLicenseByKey(license.key);
  assert.strictEqual(updatedLic2?.currentActivations, 2);

  // 4. Third machine should be REJECTED (maxActivations = 2)
  const hwid3 = '3333444455556666777788889999000011112222ccccddddeeeeffff00001111';
  const act3 = await licenseService.activateLicense({
    licenseKey: license.key,
    hwid: hwid3,
    machineInfo: { hostname: 'SERVER-03' },
  });
  assert.strictEqual(act3.success, false);
  assert(act3.error?.includes('Límite de activaciones alcanzado'));

  // 5. Validate Machine 1 Token
  const val1 = await licenseService.validateLicense({
    licenseToken: act1.licenseToken!,
    hwid: hwid1,
  });
  assert.strictEqual(val1.valid, true);
  assert(val1.renewedToken, 'Renewed token must be present');

  // 6. Validate Machine 1 Token with WRONG HWID should fail
  const valWrongHwid = await licenseService.validateLicense({
    licenseToken: act1.licenseToken!,
    hwid: '9999999999999999999999999999999999999999999999999999999999999999',
  });
  assert.strictEqual(valWrongHwid.valid, false);
  assert(valWrongHwid.message?.includes('Hardware fingerprint mismatch'));

  // 7. Deactivate Machine 2
  const deact = await licenseService.deactivateLicense(license.key, hwid2);
  assert.strictEqual(deact.success, true);

  const updatedLicAfterDeact = await licenseService.getLicenseByKey(license.key);
  assert.strictEqual(updatedLicAfterDeact?.currentActivations, 1);

  // 8. Now Machine 3 CAN activate
  const act3Retry = await licenseService.activateLicense({
    licenseKey: license.key,
    hwid: hwid3,
    machineInfo: { hostname: 'SERVER-03' },
  });
  assert.strictEqual(act3Retry.success, true);

  // 9. Revoke License
  const revoked = await licenseService.revokeLicense(license.id, 'Payment chargeback');
  assert.strictEqual(revoked.status, 'revoked');

  // Validation should now fail
  const valRevoked = await licenseService.validateLicense({
    licenseToken: act1.licenseToken!,
    hwid: hwid1,
  });
  assert.strictEqual(valRevoked.valid, false);
  assert(valRevoked.message?.includes('revocada'));

  console.log('✓ LicenseService Tests Passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
