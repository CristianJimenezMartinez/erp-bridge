import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LicenseService } from '../src/license/license.service';
import { ConfigManager } from '../src/config/config.manager';
import { LicenseTokenManager } from '@erp-bridge/core';

console.log('--- Running Clock Rollback & License Tampering Protection Tests ---');

async function runTests() {
  const tmpDir = path.join(os.tmpdir(), `bentian_clock_test_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const configManager = new ConfigManager({
      agentId: 'agent_test_clock',
      apiBaseUrl: 'http://127.0.0.1:59999', // Simula desconexión para probar período de gracia offline
    });
    const licenseService = new LicenseService(configManager, undefined, tmpDir);

    const hwid = await licenseService.getHWID();
    const now = Date.now();

    // 1. Crear un token válido local
    const validToken = LicenseTokenManager.createToken({
      licenseId: '11111111-2222-3333-4444-555555555555',
      organizationId: 'org_test_1',
      plan: 'professional',
      hwid,
      issuedAt: now - 3600 * 1000, // Emitido hace 1 hora
      expiresAt: now + 24 * 3600 * 1000, // Expira en 24 horas
    });

    // Guardar token en el almacén seguro del servicio
    await (licenseService as any).secureStore.saveLicenseToken(validToken, hwid);

    // 2. Validar licencia normal (offline grace period)
    console.log('1. Probando validación normal sin manipulación...');
    const res1 = await licenseService.validateLicense();
    assert.strictEqual(res1.status, 'GRACE_PERIOD', 'Debe ser GRACE_PERIOD en modo offline');
    assert(licenseService.getLastSeenTimestamp() >= now, 'lastSeenTimestamp debe haberse registrado');
    console.log('  ✓ Validación normal exitosa. lastSeenTimestamp registrado.');

    // 3. Simular manipulación de reloj (usuario retrasa el reloj del sistema)
    console.log('2. Probando detección de retraso de reloj (Clock Rollback)...');
    const futureTimestamp = Date.now() + 10 * 3600 * 1000; // 10 horas en el futuro
    licenseService.setLastSeenTimestamp(futureTimestamp);

    const resRollback = await licenseService.validateLicense();
    assert.strictEqual(resRollback.status, 'EXPIRED', 'Debe marcar EXPIRED al detectar reloj retrasado');
    assert.strictEqual(licenseService.getLicenseStatus().status, 'EXPIRED');
    assert(resRollback.message?.includes('Clock Rollback'), 'El mensaje debe indicar Clock Rollback');
    console.log('  ✓ Clock rollback detectado y licencia bloqueada (EXPIRED).');

    // 4. Probar checkHealth() ante manipulación
    console.log('3. Probando detección en checkHealth()...');
    licenseService.setLastSeenTimestamp(Date.now() + 500000);
    const health = licenseService.checkHealth();
    assert.strictEqual(health.healthy, false, 'Health check debe fallar ante rollback');
    assert.strictEqual(health.status, 'EXPIRED');
    console.log('  ✓ checkHealth() detecta manipulación correctamente.');

    // 5. Probar token con issuedAt en el futuro (reloj retrasado antes de la emisión)
    console.log('4. Probando detección de token con issuedAt futuro...');
    licenseService.setLastSeenTimestamp(0); // Reset monotonic timestamp
    const futureIssuedToken = LicenseTokenManager.createToken({
      licenseId: '22222222-3333-4444-5555-666666666666',
      organizationId: 'org_test_2',
      plan: 'starter',
      hwid,
      issuedAt: Date.now() + 24 * 3600 * 1000, // Emitido en el futuro
      expiresAt: Date.now() + 48 * 3600 * 1000,
    });
    await (licenseService as any).secureStore.saveLicenseToken(futureIssuedToken, hwid);

    const resFutureIssued = await licenseService.validateLicense();
    assert.strictEqual(resFutureIssued.status, 'EXPIRED', 'Token con issuedAt futuro debe ser rechazado como EXPIRED');
    assert.strictEqual(licenseService.getLicenseStatus().status, 'EXPIRED');
    console.log('  ✓ Token previo a la fecha de emisión bloqueado como EXPIRED.');

    console.log('✓ ALL CLOCK ROLLBACK & TAMPERING TESTS PASSED!');
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

runTests().catch((err) => {
  console.error('❌ Error en test de Clock Rollback:', err);
  process.exit(1);
});
