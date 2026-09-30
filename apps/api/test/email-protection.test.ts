import assert from 'assert';
import express from 'express';
import http from 'http';
import { EmailProtectionService } from '../src/services/email-protection.service';
import { authRouter, computeOrganizationIdFromEmail } from '../src/routes/auth.router';
import { LicenseService } from '@erp-bridge/core';


async function testEmailProtection() {
  console.log('🧪 Iniciando prueba automatizada de EmailProtectionService & Rate Limiting...');

  const testEmail = 'cliente-rate-limit@test.com';
  const testIp = '192.168.1.50';

  // 1. Test Unitario: Cooldown de 60 segundos
  console.log('  -> Test 1: Primer envío permitido, segundo envío en cooldown bloqueado (429)...');
  const check1 = EmailProtectionService.checkOtpAllowed(testEmail, testIp);
  assert.strictEqual(check1.allowed, true, 'La primera solicitud debe ser permitida');

  EmailProtectionService.recordOtpSent(testEmail, testIp);

  const check2 = EmailProtectionService.checkOtpAllowed(testEmail, testIp);
  assert.strictEqual(check2.allowed, false, 'La segunda solicitud inmediata debe ser bloqueada por cooldown');
  assert.strictEqual(check2.code, 'OTP_COOLDOWN_ACTIVE');
  assert.ok(check2.retryAfterSeconds && check2.retryAfterSeconds > 0 && check2.retryAfterSeconds <= 60);
  console.log(`  ✓ Test 1 superado (Bloqueado por cooldown con feedback: "${check2.reason}").`);

  // 2. Test Unitario: Deduplicación de bienvenida Stripe (Idempotencia)
  console.log('  -> Test 2: Deduplicación de bienvenida de compra Stripe...');
  const purchaseId = 'cs_test_checkout_unique_123';
  const firstWelcome = EmailProtectionService.shouldSendBillingWelcome(purchaseId);
  assert.strictEqual(firstWelcome, true, 'El primer webhook debe autorizar el envío');

  const secondWelcome = EmailProtectionService.shouldSendBillingWelcome(purchaseId);
  assert.strictEqual(secondWelcome, false, 'El webhook duplicado debe ser descartado (0 emails extra)');
  console.log('  ✓ Test 2 superado (Idempotencia Stripe garantizada).');

  // 3. Test Unitario: Deduplicación de Alertas de Pedidos Factusol
  console.log('  -> Test 3: Deduplicación de pedidos Factusol en bucle...');
  const licenseKey = 'EB-TEST-ORDER-DEDUP';
  const orderRef = 'PED-2026-999';
  const firstAlert = EmailProtectionService.shouldSendOrderAlert(licenseKey, orderRef);
  assert.strictEqual(firstAlert, true, 'La primera alerta de pedido debe autorizarse');

  const secondAlert = EmailProtectionService.shouldSendOrderAlert(licenseKey, orderRef);
  assert.strictEqual(secondAlert, false, 'El reintento del mismo pedido debe ser descartado');
  console.log('  ✓ Test 3 superado (Deduplicación 24h de pedido activa).');

  // 4. Test Integración HTTP: Endpoint /api/v1/auth/email-session con feedback 429
  console.log('  -> Test 4: Integración HTTP /auth/email-session devolviendo 429 con Retry-After...');
  const app = express();
  app.use(express.json());
  app.use('/api/v1', authRouter);

  // Crear una licencia de prueba en memoria para que el email sea reconocido
  const validEmail = 'empresa-valida@test.com';
  const orgId = computeOrganizationIdFromEmail(validEmail);
  const licenseService = new LicenseService();
  await licenseService.createLicense({
    organizationId: orgId,
    plan: 'starter',
    maxActivations: 1,
  });



  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  try {
    // Solicitud 1: Debe responder 200 con requireOtp y cooldownSeconds
    const res1 = await fetch(`${baseUrl}/auth/email-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'empresa-valida@test.com' }),
    });
    assert.strictEqual(res1.status, 200, 'Debe devolver 200 en el primer envío');
    const json1 = (await res1.json()) as any;
    assert.strictEqual(json1.requireOtp, true);
    assert.strictEqual(json1.cooldownSeconds, 60);
    console.log('  ✓ Test 4a superado: Primer intento 200 OK con cooldownSeconds: 60.');

    // Solicitud 2 inmediata: Debe responder 429 con cabecera Retry-After y feedback claro
    const res2 = await fetch(`${baseUrl}/auth/email-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'empresa-valida@test.com' }),
    });
    assert.strictEqual(res2.status, 429, 'Debe devolver 429 por cooldown');
    const retryHeader = res2.headers.get('retry-after');
    assert.ok(retryHeader, 'Debe incluir cabecera Retry-After');
    const json2 = (await res2.json()) as any;
    assert.strictEqual(json2.error?.code, 'OTP_COOLDOWN_ACTIVE');
    assert.ok(json2.error?.message?.includes('segundo'), 'El mensaje debe indicar los segundos de espera');
    console.log(`  ✓ Test 4b superado: 429 TOO_MANY_REQUESTS con feedback "${json2.error.message}" y Retry-After: ${retryHeader}s.`);

    console.log('======================================================================');
    console.log('🎉 TODOS LOS TESTS DE BLINDAJE DE CORREO PASARON CON ÉXITO');
    console.log('======================================================================');
  } finally {
    server.close();
  }
}

testEmailProtection().catch((err) => {
  console.error('❌ Error en test de blindaje de correo:', err);
  process.exit(1);
});
