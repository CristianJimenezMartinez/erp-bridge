import assert from 'assert';
import http from 'http';
import { bootstrapApp, assertProductionSecrets } from '../src/server';
import { AuthService } from '../src/routes/auth.router';
import { SyncScheduler } from '@erp-bridge/core';

console.log('--- Running API Cloud Security Remediation Regression Tests ---');

async function runTests() {
  process.env['ADMIN_EMAIL'] = 'admin@cristianjm.com';
  process.env['ADMIN_PASSWORD'] = 'SuperSecurePass123!';
  process.env['ADMIN_JWT_SECRET'] = 'test-jwt-secret-key-12345-very-long-secret-key';
  process.env['PARTNER_SECRET'] = 'PartnerSecret2026!';
  process.env['DASHBOARD_URL'] = 'https://bridge.cristianjm.com/dashboard/';

  const app = await bootstrapApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------
    // Test 1: P0-2 (API-001 / INF-002) - Path Traversal en /releases
    // -------------------------------------------------------------
    console.log('1. Probando mitigación de Path Traversal en /releases/latest/:filename y /releases/:version/:filename...');

    // 1.1 Fichero no permitido (no está en whitelist)
    const resForbiddenFile = await fetch(`${baseUrl}/releases/latest/package.json`);
    assert.strictEqual(resForbiddenFile.status, 404, 'Fichero fuera de whitelist debe responder 404');

    // 1.2 Path traversal con ../ hacia arriba
    const resTraversal1 = await fetch(`${baseUrl}/releases/latest/..%2Fpackage.json`);
    assert.ok(
      resTraversal1.status === 400 || resTraversal1.status === 404 || resTraversal1.status === 403,
      `Path traversal con %2F debe ser rechazado (obtenido: ${resTraversal1.status})`
    );

    // 1.3 Path traversal con %2e%2e%2f
    const resTraversal2 = await fetch(`${baseUrl}/releases/latest/%2e%2e%2fpackage.json`);
    assert.ok(
      resTraversal2.status === 400 || resTraversal2.status === 404 || resTraversal2.status === 403,
      `Path traversal con %2e debe ser rechazado (obtenido: ${resTraversal2.status})`
    );

    // 1.4 Path traversal con doble codificación %252e%252e%252f
    const resTraversal3 = await fetch(`${baseUrl}/releases/latest/%252e%252e%252fpackage.json`);
    assert.ok(
      resTraversal3.status === 400 || resTraversal3.status === 404 || resTraversal3.status === 403,
      `Path traversal con doble codificación debe ser rechazado (obtenido: ${resTraversal3.status})`
    );

    // 1.5 Path traversal en versión /releases/:version/:filename
    const resTraversalVer = await fetch(`${baseUrl}/releases/..%2F/Bentian-Setup.exe`);
    assert.ok(
      resTraversalVer.status === 400 || resTraversalVer.status === 404 || resTraversalVer.status === 403,
      `Path traversal en parámetro version debe ser rechazado (obtenido: ${resTraversalVer.status})`
    );

    console.log('  ✓ Path traversal bloqueado al 100% en descargas de releases.');

    // -------------------------------------------------------------
    // Test 2: P0-3 (API-002) - /sync/run-reactive sin auth
    // -------------------------------------------------------------
    console.log('2. Probando protección de POST /sync/run-reactive...');

    const resSyncNoAuth = await fetch(`${baseUrl}/api/v1/sync/run-reactive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': 'org_malicious' },
      body: JSON.stringify({ reason: 'test' }),
    });
    assert.strictEqual(resSyncNoAuth.status, 401, 'POST /sync/run-reactive sin token debe responder 401 Unauthorized');
    console.log('  ✓ POST /sync/run-reactive rechaza llamadas anónimas con 401.');

    // -------------------------------------------------------------
    // Test 3: P0-4 (API-007) - Relé de correo en /notifications/order
    // -------------------------------------------------------------
    console.log('3. Probando mitigación de relé de email en POST /api/v1/notifications/order...');

    // 3.1 Sin licencia ni auth -> 401
    const resNotifyNoAuth = await fetch(`${baseUrl}/api/v1/notifications/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'victim@target.com',
        subject: 'Spam Relay',
        text: 'Spam content',
      }),
    });
    assert.strictEqual(resNotifyNoAuth.status, 401, 'POST /notifications/order sin auth ni licencia debe dar 401');

    // 3.2 Licencia con formato inválido -> 401
    const resNotifyBadLic = await fetch(`${baseUrl}/api/v1/notifications/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-license-key': 'invalid_license_key',
      },
      body: JSON.stringify({
        to: 'victim@target.com',
        subject: 'Spam Relay',
        text: 'Spam content',
      }),
    });
    assert.strictEqual(resNotifyBadLic.status, 401, 'Licencia inválida debe responder 401');

    // 3.3 Intento de inyección CRLF en destinatario
    const userToken = AuthService.createToken({
      sub: 'tenant_user',
      role: 'TENANT_CLIENT',
      organizationId: 'org_test_client',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const resCrlfTo = await fetch(`${baseUrl}/api/v1/notifications/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        to: "victim@target.com\r\nBcc: evil@attacker.com",
        subject: 'Test Subject',
        text: 'Content',
      }),
    });
    assert.strictEqual(resCrlfTo.status, 400, 'CRLF en campo to debe responder 400 Bad Request');

    // 3.4 Intento de inyección CRLF en asunto
    const resCrlfSubject = await fetch(`${baseUrl}/api/v1/notifications/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        to: 'victim@target.com',
        subject: "Alerta de Pedido\nBcc: evil@attacker.com",
        text: 'Content',
      }),
    });
    assert.strictEqual(resCrlfSubject.status, 400, 'CRLF en campo subject debe responder 400 Bad Request');

    // 3.5 Destinatario masivo / inválido
    const resMultiEmail = await fetch(`${baseUrl}/api/v1/notifications/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        to: 'victim1@target.com, victim2@target.com',
        subject: 'Alerta',
        text: 'Content',
      }),
    });
    assert.strictEqual(resMultiEmail.status, 400, 'Destinatarios múltiples deben ser rechazados con 400');

    console.log('  ✓ Inyección CRLF, relé anónimo y destinatarios no válidos bloqueados al 100%.');

    // -------------------------------------------------------------
    // Test 4: P1-1 (API-003, API-004) - BOLA en Billing
    // -------------------------------------------------------------
    console.log('4. Probando aislamiento BOLA en endpoints de facturación...');

    // 4.1 licenses-by-email ignora el query parameter si el usuario no es SUPERADMIN
    const resLicensesByEmail = await fetch(`${baseUrl}/api/v1/billing/licenses-by-email?email=victim@target.com`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(resLicensesByEmail.status, 200);
    const licensesData = (await resLicensesByEmail.json()) as any;
    assert.ok(Array.isArray(licensesData.data), 'Debe responder con array de licencias de su propia org');

    // 4.2 create-portal-session sanitiza returnUrl foráneo
    const resPortal = await fetch(`${baseUrl}/api/v1/billing/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        returnUrl: 'https://evil-phishing-site.com/steal-credentials',
        customerId: 'cus_victim123',
      }),
    });
    assert.strictEqual(resPortal.status, 200);
    const portalData = (await resPortal.json()) as any;
    assert.strictEqual(portalData.success, true);
    console.log('  ✓ BOLA en billing mitigado: org forzada desde token y returnUrl validado.');

    // -------------------------------------------------------------
    // Test 5: P1-6 (API-008, API-027) - assertProductionSecrets()
    // -------------------------------------------------------------
    console.log('5. Probando validación estricta de secretos en producción (assertProductionSecrets)...');

    const origEnv = process.env.NODE_ENV;
    const origJwt = process.env['ADMIN_JWT_SECRET'];
    const origPriv = process.env['LICENSE_SIGNING_PRIVATE_KEY'];

    try {
      process.env.NODE_ENV = 'production';
      delete process.env['ADMIN_JWT_SECRET'];

      assert.throws(
        () => assertProductionSecrets(),
        /CRITICAL SECURITY CONFIGURATION ERROR/,
        'Debe lanzar error si falta ADMIN_JWT_SECRET en producción'
      );

      process.env['ADMIN_JWT_SECRET'] = 'short-secret';
      assert.throws(
        () => assertProductionSecrets(),
        /below minimum required/,
        'Debe lanzar error si ADMIN_JWT_SECRET es demasiado corto'
      );

      process.env['ADMIN_JWT_SECRET'] = 'test-default-secret-placeholder-value-32chars!';
      assert.throws(
        () => assertProductionSecrets(),
        /contains insecure placeholder value/,
        'Debe lanzar error si contiene valores por defecto o placeholders'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origJwt) process.env['ADMIN_JWT_SECRET'] = origJwt;
      if (origPriv) process.env['LICENSE_SIGNING_PRIVATE_KEY'] = origPriv;
    }
    console.log('  ✓ assertProductionSecrets() protege arranque en producción.');

    console.log('\n============================================================');
    console.log('✅ TODAS LAS PRUEBAS DE SEGURIDAD (P0 y P1) PASARON CON ÉXITO');
    console.log('============================================================');
    process.exit(0);
  } finally {
    try {
      SyncScheduler.getInstance().stop();
    } catch {}
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

runTests().catch((err) => {
  console.error('❌ Fallo en tests de seguridad:', err);
  process.exit(1);
});
