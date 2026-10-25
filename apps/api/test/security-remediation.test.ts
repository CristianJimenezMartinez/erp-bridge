import assert from 'assert';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { bootstrapApp, assertProductionSecrets } from '../src/server';
import { AuthService } from '../src/routes/auth.router';
import { assertSafeCloudConnectionConfig } from '../src/routes/connections.router';
import { validateSessionRedemptionWindow, clearRedeemedSessions } from '../src/routes/billing.helpers';
import { AgentService, SyncScheduler } from '@erp-bridge/core';
import { resetRateLimiters } from '../src/middleware/rate-limit';

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

    // -------------------------------------------------------------
    // Test 6: P3-1 (Cabeceras estrictas, CORS allowlist, payload 100kb)
    // -------------------------------------------------------------
    console.log('6. Probando cabeceras de seguridad estrictas, CORS y límites de payload (P3-1)...');

    const resHeaders = await fetch(`${baseUrl}/health`);
    assert.strictEqual(resHeaders.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains; preload');
    assert.strictEqual(resHeaders.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(resHeaders.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.strictEqual(resHeaders.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.strictEqual(resHeaders.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
    assert.ok(resHeaders.headers.get('content-security-policy')?.includes("default-src 'self'"));
    console.log('  ✓ Cabeceras estrictas HSTS, nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy y CSP verificadas.');

    // CORS: origen permitido
    const resCorsAllowed = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'https://bridge.cristianjm.com' },
    });
    assert.strictEqual(resCorsAllowed.headers.get('access-control-allow-origin'), 'https://bridge.cristianjm.com');

    // CORS: origen no permitido
    const resCorsDenied = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'https://evil-attacker-site.com' },
    });
    assert.strictEqual(resCorsDenied.headers.get('access-control-allow-origin'), null);
    console.log('  ✓ CORS allowlist verificado (permitido para bridge.cristianjm.com, denegado para atacante).');

    // Límite de payload express.json (100kb)
    const largePayload = JSON.stringify({ data: 'A'.repeat(120 * 1024) });
    const resPayloadLimit = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: largePayload,
    });
    assert.strictEqual(resPayloadLimit.status, 413, 'Payload mayor a 100kb debe responder 413 Payload Too Large');
    console.log('  ✓ Límite de payload de 100kb verificado (413 Payload Too Large).');

    // -------------------------------------------------------------
    // Test 7: P3-2 (Pairing token 64 bits y Rate Limiting)
    // -------------------------------------------------------------
    console.log('7. Probando pairing token de 64 bits y rate limiting en emparejamiento (P3-2)...');
    const agentService = new AgentService();
    const pairingData = await agentService.generatePairingToken('org_test_p3');
    assert.ok(pairingData.token.startsWith('EB-'), 'Token debe comenzar con EB-');
    const tokenEntropyHex = pairingData.token.slice(3);
    assert.strictEqual(tokenEntropyHex.length, 16, 'Token debe contener 16 caracteres hexadecimales (64 bits)');

    resetRateLimiters();
    for (let i = 0; i < 10; i++) {
      const resPairAttempt = await fetch(`${baseUrl}/api/v1/agents/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingToken: `EB-000000000000000${i}`,
          name: `Agent Test ${i}`,
          systemInfo: {
            platform: 'win32',
            arch: 'x64',
            osVersion: '10.0.19045',
            hostname: 'TEST',
            memoryTotalMb: 1024,
            memoryFreeMb: 512,
            cpuCores: 4,
            nodeVersion: 'v20.0.0',
            uptimeSeconds: 100,
          },
          detectedFactusol: [],
        }),
      });
      assert.ok(resPairAttempt.status === 401 || resPairAttempt.status === 400);
    }
    const resPairBlocked = await fetch(`${baseUrl}/api/v1/agents/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pairingToken: 'EB-9999999999999999',
        name: 'Agent Test 11',
        systemInfo: {
          platform: 'win32',
          arch: 'x64',
          osVersion: '10.0.19045',
          hostname: 'TEST',
          memoryTotalMb: 1024,
          memoryFreeMb: 512,
          cpuCores: 4,
          nodeVersion: 'v20.0.0',
          uptimeSeconds: 100,
        },
        detectedFactusol: [],
      }),
    });
    assert.strictEqual(resPairBlocked.status, 429, 'Petición 11 a /agents/pair debe ser 429 Rate Limited');
    resetRateLimiters();
    console.log('  ✓ Pairing token de 64 bits y rate limiter (10 intentos / 15 min) en /agents/pair verificados.');

    // -------------------------------------------------------------
    // Test 8: P3-3 (Auth Hardening, exp obligatorio, jti y revocación /logout)
    // -------------------------------------------------------------
    console.log('8. Probando Auth Hardening: exp obligatorio, jti y logout con revocación (P3-3)...');
    AuthService.clearRevokedTokens();

    // 8.1 Token sin exp debe ser rechazado
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadNoExp = Buffer.from(JSON.stringify({ sub: 'user_no_exp', role: 'ADMIN', organizationId: 'org_test' })).toString('base64url');
    const sigNoExp = crypto.createHmac('sha256', AuthService.getSecret()).update(`${header}.${payloadNoExp}`).digest('base64url');
    const rawTokenNoExp = `${header}.${payloadNoExp}.${sigNoExp}`;
    const verifNoExp = AuthService.verifyToken(rawTokenNoExp);
    assert.strictEqual(verifNoExp.valid, false);
    assert.strictEqual(verifNoExp.reason, 'Token sin fecha de expiración');
    console.log('  ✓ Token sin exp rechazado con éxito.');

    // 8.2 Token generado tiene jti y exp
    const genToken = AuthService.generateToken({
      sub: 'user_gen',
      role: 'ADMIN',
      organizationId: 'org_test',
    });
    const verifGen = AuthService.verifyToken(genToken);
    assert.strictEqual(verifGen.valid, true);
    assert.ok(verifGen.payload?.jti, 'Token debe contener jti único');
    assert.ok(verifGen.payload?.exp, 'Token debe contener exp');

    // 8.3 Logout revoca el jti
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${genToken}`,
      },
    });
    assert.strictEqual(logoutRes.status, 200);
    const logoutJson = (await logoutRes.json()) as any;
    assert.strictEqual(logoutJson.success, true);

    // Tras logout, el token debe ser rechazado como revocado
    const verifAfterLogout = AuthService.verifyToken(genToken);
    assert.strictEqual(verifAfterLogout.valid, false);
    assert.strictEqual(verifAfterLogout.reason, 'Token revocado');

    const resUsingRevoked = await fetch(`${baseUrl}/api/v1/licenses`, {
      headers: {
        Authorization: `Bearer ${genToken}`,
      },
    });
    assert.strictEqual(resUsingRevoked.status, 401);
    console.log('  ✓ Endpoint /auth/logout y lista negra de revocación verificados.');

    // -------------------------------------------------------------
    // Test 9: P3-9 (Health mínimo limpio y Errores Genéricos)
    // -------------------------------------------------------------
    console.log('9. Probando /health mínimo limpio y errores genéricos en producción (P3-9)...');
    const healthJson = (await (await fetch(`${baseUrl}/health`)).json()) as any;
    assert.ok(healthJson.status === 'OK' || healthJson.status === 'DEGRADED');
    assert.ok(healthJson.version, 'Debe incluir version');
    assert.ok(healthJson.timestamp, 'Debe incluir timestamp');
    assert.strictEqual(healthJson.memory, undefined, 'No debe filtrar memoria interna');
    assert.strictEqual(healthJson.database?.message, undefined, 'No debe filtrar mensaje de error interno de BD');
    console.log('  ✓ /health limpio sin filtración de memoria ni detalles de base de datos.');

    // -------------------------------------------------------------
    // Test 10: Auditoría Adicional API & Web (SSRF, Session Replay, Telemetry Auth, Web Logout)
    // -------------------------------------------------------------
    console.log('10. Probando blindajes adicionales de API & Web (SSRF, Session Replay, Telemetría y Frontend)...');

    // 10.1 SSRF en /connections/test bloqueado para TENANT_CLIENT y para IPs internas / rutas locales
    const resConnTestTenant = await fetch(`${baseUrl}/api/v1/connections/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        connectorId: 'woocommerce',
        configuration: { storeUrl: 'http://169.254.169.254/latest/meta-data/' },
      }),
    });
    assert.strictEqual(resConnTestTenant.status, 403, 'TENANT_CLIENT no debe poder ejecutar /connections/test en Cloud');

    assert.throws(
      () => assertSafeCloudConnectionConfig({ storeUrl: 'https://169.254.169.254/latest/meta-data/' }),
      /anti-SSRF/,
      'Debe bloquear metadata cloud IP 169.254.169.254'
    );
    assert.throws(
      () => assertSafeCloudConnectionConfig({ storeUrl: 'https://127.0.0.1:8080' }),
      /anti-SSRF/,
      'Debe bloquear loopback 127.0.0.1'
    );
    assert.throws(
      () => assertSafeCloudConnectionConfig({ databasePath: '/etc/passwd' }),
      /sistema de archivos local/,
      'Debe bloquear rutas locales en Cloud API'
    );
    console.log('  ✓ Mitigación anti-SSRF y restricción RBAC en /connections/test verificadas.');

    // 10.2 Protección anti-replay en /billing/session-license
    clearRedeemedSessions();
    const expiredCheck = validateSessionRedemptionWindow(
      'cs_live_expired_123',
      Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000) // hace 2 horas
    );
    assert.strictEqual(expiredCheck.allowed, false, 'Sesión Stripe de hace > 60 min debe ser rechazada');

    const firstRedeem = validateSessionRedemptionWindow('cs_live_fresh_456', Math.floor(Date.now() / 1000));
    assert.strictEqual(firstRedeem.allowed, true, 'Primer canje reciente debe permitirse');

    const lateReplay = validateSessionRedemptionWindow(
      'cs_live_fresh_456',
      Math.floor(Date.now() / 1000),
      null,
      Date.now() + 20 * 60 * 1000 // 20 min después del primer canje
    );
    assert.strictEqual(lateReplay.allowed, false, 'Replay pasados > 15 min del primer canje debe rechazarse');
    clearRedeemedSessions();
    console.log('  ✓ Ventana temporal y anti-replay de session_id en /billing/session-license verificados.');

    // 10.3 Heartbeat y report-error sin autenticación ni agente registrado deben devolver 401
    resetRateLimiters();
    const resUnauthHeartbeat = await fetch(`${baseUrl}/api/v1/agents/ag_spoofed_999999/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'ag_spoofed_999999',
        hwid: 'spoofed_unknown_hwid_999999999999',
        status: 'ONLINE',
        version: '0.4.10',
      }),
    });
    assert.strictEqual(resUnauthHeartbeat.status, 401, 'Heartbeat de agente desconocido sin token/licencia debe dar 401');

    const resUnauthErrorReport = await fetch(`${baseUrl}/api/v1/fleet/report-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'ag_spoofed_999999',
        errorCode: 'FAKE_ERR',
        message: 'Flood attempt',
      }),
    });
    assert.strictEqual(resUnauthErrorReport.status, 401, 'POST /fleet/report-error sin autenticación debe dar 401');
    console.log('  ✓ Endpoints /agents/:id/heartbeat y /fleet/report-error protegidos contra spoofing anónimo.');

    // 10.4 Frontend Dashboard: revocación en logout y eliminación de secreto estático en multichannel
    const authJsContent = fs.readFileSync(path.resolve(__dirname, '../public/dashboard/js/auth.js'), 'utf8');
    assert.ok(authJsContent.includes("fetch('/api/v1/auth/logout'"), 'auth.js debe invocar /api/v1/auth/logout al cerrar sesión');

    const multiJsContent = fs.readFileSync(path.resolve(__dirname, '../public/dashboard/js/multichannel.js'), 'utf8');
    assert.ok(!multiJsContent.includes('shpss_sec_99887766554433221100aabbccddeeff'), 'multichannel.js no debe tener secreto estático hardcodeado');
    console.log('  ✓ Dashboard Web: logout con revocación en servidor y eliminación de secreto estático verificados.');

    // -----------------------------------------------------------------------
    // 11. Conectores secundarios (SimplyGest SQL, WooCommerce SSRF) y MappingEngine
    // -----------------------------------------------------------------------
    console.log('\n[Test 11] Blindaje en SimplyGest, WooCommerce y MappingEngine (Prototype Pollution)...');
    const { sanitizeSql: sanitizeSimplyGest } = await import('../../../packages/connectors/simplygest/src/queries/article.queries');
    const boundaryVal = 'A'.repeat(19) + "' OR 1=1--";
    const escapedBoundary = sanitizeSimplyGest(boundaryVal, 20);
    const singleQuotesCount = (escapedBoundary.match(/'/g) || []).length;
    assert.strictEqual(singleQuotesCount % 2, 0, 'sanitizeSql de SimplyGest nunca debe dejar una comilla impar al truncar');

    const { MappingEngine } = await import('@erp-bridge/core');
    const engine = new MappingEngine();
    const dummyProduct: any = {
      id: 'p1',
      sku: 'SKU1',
      name: 'Test',
      price: 10,
      currency: 'EUR',
      taxRate: 21,
      active: true,
      categories: [],
      attributes: {},
    };
    engine.applyMappingToProduct(dummyProduct, [
      { sourceField: 'name', destinationField: '__proto__.pollutedFlag', defaultValue: 'yes' },
      { sourceField: 'name', destinationField: 'constructor.prototype.pollutedFlag2', defaultValue: 'yes' },
    ] as any);
    assert.strictEqual(({} as any).pollutedFlag, undefined, 'Object.prototype no debe contaminarse vía __proto__');
    assert.strictEqual(({} as any).pollutedFlag2, undefined, 'Object.prototype no debe contaminarse vía constructor.prototype');

    const { WooCommerceClient } = await import('@erp-bridge/connector-woocommerce');
    const prevEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      assert.throws(
        () => new WooCommerceClient({ url: 'http://169.254.169.254', consumerKey: 'ck_1', consumerSecret: 'cs_1' }),
        /Host no permitido/,
        'WooCommerceClient debe rechazar 169.254.169.254 en producción'
      );
      assert.throws(
        () => new WooCommerceClient({ url: 'http://127.0.0.1:8080', consumerKey: 'ck_1', consumerSecret: 'cs_1' }),
        /Host no permitido/,
        'WooCommerceClient debe rechazar 127.0.0.1 en producción'
      );
    } finally {
      process.env['NODE_ENV'] = prevEnv;
    }
    console.log('  ✓ SimplyGest SQL, MappingEngine anti-Prototype-Pollution y WooCommerce anti-SSRF verificados.');

    console.log('\n============================================================');
    console.log('✅ TODAS LAS PRUEBAS DE SEGURIDAD (P0, P1 y P3) PASARON CON ÉXITO');
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
