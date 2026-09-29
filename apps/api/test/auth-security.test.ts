import assert from 'assert';
import http from 'http';
import crypto from 'crypto';
import express from 'express';
import { authRouter, AuthService, clearLoginAttempts, MAX_LOGIN_ATTEMPTS } from '../src/routes/auth.router';
import { billingRouter } from '../src/routes/billing.router';
import { licensesRouter } from '../src/routes/licenses.router';

console.log('--- Running API Auth & Security Hardening Tests ---');

async function runTests() {
  process.env['ADMIN_EMAIL'] = 'admin@cristianjm.com';
  process.env['ADMIN_PASSWORD'] = 'SuperSecurePass123!';
  process.env['ADMIN_JWT_SECRET'] = 'test-jwt-secret-key-12345';
  process.env['PARTNER_SECRET'] = 'PartnerSecret2026!';

  const app = express();
  app.use(express.json());
  app.use('/api/v1', authRouter);
  app.use('/api/v1', billingRouter);
  app.use('/api/v1', licensesRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    clearLoginAttempts();

    // 1. Login exitoso con PBKDF2 (100.000 iteraciones)
    console.log('1. Probando login exitoso con PBKDF2...');
    const resLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cristianjm.com', password: 'SuperSecurePass123!' }),
    });
    assert.strictEqual(resLogin.status, 200, 'Login válido debe responder 200 OK');
    const loginData = (await resLogin.json()) as any;
    assert.strictEqual(loginData.success, true);
    assert(loginData.token, 'Debe retornar token JWT');
    console.log('  ✓ Login exitoso con verificación PBKDF2 y timingSafeEqual.');

    // 2. Login fallido con contraseña incorrecta
    console.log('2. Probando rechazo con credenciales erróneas...');
    const resFail = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cristianjm.com', password: 'WrongPassword!' }),
    });
    assert.strictEqual(resFail.status, 401, 'Credenciales incorrectas deben responder 401');
    console.log('  ✓ Contraseña errónea rechazada con 401.');

    // 3. Mitigación de fuerza bruta (Rate Limiting en memoria)
    console.log(`3. Probando mitigación de fuerza bruta (${MAX_LOGIN_ATTEMPTS} intentos fallidos)...`);
    clearLoginAttempts();

    for (let i = 1; i <= MAX_LOGIN_ATTEMPTS; i++) {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@cristianjm.com', password: `wrong_${i}` }),
      });
      assert.strictEqual(res.status, 401, `Intento ${i} debe retornar 401`);
    }

    // El intento 6 debe recibir 429 Too Many Requests
    const resBlocked = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cristianjm.com', password: 'SuperSecurePass123!' }),
    });
    assert.strictEqual(resBlocked.status, 429, 'Petición tras exceder límite debe responder 429');
    const blockedJson = (await resBlocked.json()) as any;
    assert.strictEqual(blockedJson.error?.code, 'TOO_MANY_ATTEMPTS');
    assert(resBlocked.headers.get('retry-after'), 'Debe incluir cabecera Retry-After');
    console.log('  ✓ Bloqueo por fuerza bruta (429 Too Many Requests) verificado.');

    // 4. Verificación estricta de Webhook de Stripe sin excepciones de NODE_ENV
    console.log('4. Probando webhook de Stripe sin STRIPE_WEBHOOK_SECRET configurado...');
    delete process.env['STRIPE_WEBHOOK_SECRET'];
    process.env['NODE_ENV'] = 'development'; // Modo desarrollo NO debe eludir la validación

    const resNoSecret = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    assert.strictEqual(resNoSecret.status, 500, 'Sin secret configurado debe retornar 500');
    console.log('  ✓ Webhook rechazado por falta de secret sin bypass de NODE_ENV.');

    console.log('5. Probando webhook de Stripe con secret y firma inválida...');
    process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test_secret_for_unit_tests';
    const resBadSig = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=123456,v1=invalid_signature',
      },
      body: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    assert.strictEqual(resBadSig.status, 400, 'Firma no válida debe responder 400 Bad Request');
    console.log('  ✓ Firma inválida rechazada con 400.');

    console.log('6. Probando webhook de Stripe con firma criptográfica válida HMAC-SHA256...');
    const nowSec = Math.floor(Date.now() / 1000);
    const webhookPayload = JSON.stringify({ id: 'evt_test', type: 'unknown.event' });
    const payloadToSign = `${nowSec}.${webhookPayload}`;
    const validSig = crypto
      .createHmac('sha256', process.env['STRIPE_WEBHOOK_SECRET'])
      .update(payloadToSign)
      .digest('hex');

    const resValidSig = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': `t=${nowSec},v1=${validSig}`,
      },
      body: webhookPayload,
    });
    assert.strictEqual(resValidSig.status, 200, 'Webhook con firma válida debe responder 200');
    const validJson = (await resValidSig.json()) as any;
    assert.strictEqual(validJson.received, true);
    console.log('  ✓ Webhook con firma criptográfica válida aceptado con éxito (200 OK).');

    // 7. Acceso de Partner protegido contra bypass sin secreto
    console.log('7. Probando autenticación de Partner con y sin partnerSecret...');
    const resPartnerFail = await fetch(`${baseUrl}/api/v1/auth/partner-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerCode: 'PT-INFORMATICA', partnerSecret: 'WrongSecret' }),
    });
    assert.strictEqual(resPartnerFail.status, 401, 'Partner con secret erróneo debe responder 401');
    const partnerFailJson = (await resPartnerFail.json()) as any;
    assert.strictEqual(partnerFailJson.error?.code, 'INVALID_PARTNER_SECRET');

    const resPartnerOk = await fetch(`${baseUrl}/api/v1/auth/partner-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerCode: 'PT-INFORMATICA', partnerSecret: 'PartnerSecret2026!' }),
    });
    assert.strictEqual(resPartnerOk.status, 200, 'Partner con secret correcto debe responder 200');
    const partnerOkJson = (await resPartnerOk.json()) as any;
    assert.strictEqual(partnerOkJson.user?.role, 'RESELLER');
    assert(partnerOkJson.token, 'Debe emitir token JWT de RESELLER');
    console.log('  ✓ Partner login validado con secreto estricto y timingSafeEqual.');

    // 8. Control de Acceso Basado en Roles (RBAC) en /licenses
    console.log('8. Probando RBAC: creación y revocación de licencias protegidas contra TENANT_CLIENT...');
    const clientToken = AuthService.createToken({
      sub: 'cliente@prueba.es',
      role: 'TENANT_CLIENT',
      organizationId: 'org_cliente',
      exp: Date.now() + 3600000,
    });

    const resCreateForbidden = await fetch(`${baseUrl}/api/v1/licenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({ seatType: 'BASE' }),
    });
    assert.strictEqual(resCreateForbidden.status, 403, 'TENANT_CLIENT no debe poder crear licencias (403 Forbidden)');

    const resRevokeForbidden = await fetch(`${baseUrl}/api/v1/licenses/lic_test/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({ reason: 'Ataque de prueba' }),
    });
    assert.strictEqual(resRevokeForbidden.status, 403, 'TENANT_CLIENT no debe poder revocar licencias (403 Forbidden)');
    console.log('  ✓ RBAC verificado: TENANT_CLIENT no puede emitir ni revocar licencias.');

    // 9. Flujo Passwordless OTP en /auth/email-session
    console.log('9. Probando flujo Passwordless OTP en /auth/email-session...');
    const testEmail = 'cliente-otp@empresa.es';
    // Crear una licencia previa para que el email tenga licencias
    const superToken = AuthService.createToken({
      sub: 'admin@cristianjm.com',
      role: 'SUPERADMIN',
      organizationId: 'org_default',
      exp: Date.now() + 3600000,
    });
    const resCreateLic = await fetch(`${baseUrl}/api/v1/licenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superToken}`,
      },
      body: JSON.stringify({
        organizationId: 'org_' + crypto.createHash('sha256').update(testEmail).digest('hex').substring(0, 16),
        plan: 'starter',
      }),
    });
    assert(resCreateLic.status === 201 || resCreateLic.status === 200, 'Debe crear licencia para el test');

    // Paso 9.1: Solicitar OTP
    const resReqOtp = await fetch(`${baseUrl}/api/v1/auth/email-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert.strictEqual(resReqOtp.status, 200, 'Petición inicial debe responder 200 requireOtp');
    const otpJson = (await resReqOtp.json()) as any;
    assert.strictEqual(otpJson.requireOtp, true, 'Debe solicitar OTP');
    assert(otpJson.debugOtp, 'En modo dev/test debe incluir debugOtp');

    // Paso 9.2: Enviar OTP erróneo
    const resWrongOtp = await fetch(`${baseUrl}/api/v1/auth/email-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '000000' }),
    });
    assert.strictEqual(resWrongOtp.status, 401, 'OTP incorrecto debe responder 401');

    // Paso 9.3: Enviar OTP correcto
    const resValidOtp = await fetch(`${baseUrl}/api/v1/auth/email-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: otpJson.debugOtp }),
    });
    assert.strictEqual(resValidOtp.status, 200, 'OTP correcto debe responder 200 y entregar token');
    const validOtpJson = (await resValidOtp.json()) as any;
    assert(validOtpJson.token, 'Debe retornar JWT');
    assert.strictEqual(validOtpJson.user?.role, 'TENANT_CLIENT');
    console.log('  ✓ Flujo Passwordless OTP validado con éxito (solicitud, rechazo erróneo y canje correcto).');

    console.log('✓ ALL API AUTH & SECURITY TESTS PASSED!');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Error en test de Auth Security:', err);
  process.exit(1);
});
