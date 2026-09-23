import assert from 'assert';
import { AuthService } from '../src/routes/auth.router';
import { billingRouter } from '../src/routes/billing.router';
import express from 'express';
import http from 'http';

async function testSessionLicenseOnboarding() {
  console.log('🧪 Iniciando prueba automatizada de Onboarding Post-Checkout Stripe...');

  const app = express();
  app.use(express.json());
  app.use('/api/v1', billingRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  try {
    // 1. Caso error: Falta session_id
    console.log('  -> Test 1: Solicitud sin session_id (debe responder 400)');
    const res1 = await fetch(`${baseUrl}/billing/session-license`);
    assert.strictEqual(res1.status, 400, 'Debe devolver 400 si falta session_id');
    const json1 = await res1.json() as any;
    assert.strictEqual(json1.error?.code, 'MISSING_SESSION_ID');
    console.log('  ✓ Test 1 superado (400 MISSING_SESSION_ID verificado).');

    // 2. Caso éxito: Modo mock con session_id cs_test_mock_...
    console.log('  -> Test 2: Solicitud con session_id mock (debe generar licencia y JWT)');
    const res2 = await fetch(`${baseUrl}/billing/session-license?session_id=cs_test_mock_9999`);
    assert.strictEqual(res2.status, 200, 'Debe devolver 200 para session_id mock');
    const json2 = await res2.json() as any;
    assert.strictEqual(json2.success, true);
    assert.ok(json2.licenseKey.startsWith('EB-'), 'La clave debe comenzar con EB-');
    assert.ok(json2.token, 'Debe retornar un token JWT');
    assert.strictEqual(json2.email, 'cliente-demo@bentian.es');

    // 3. Verificar que el JWT emitido es válido y tiene rol TENANT_CLIENT
    const verification = AuthService.verifyToken(json2.token);
    assert.strictEqual(verification.valid, true, 'El token debe ser criptográficamente válido');
    assert.strictEqual(verification.payload?.role, 'TENANT_CLIENT');
    assert.strictEqual(verification.payload?.sub, json2.licenseKey);
    console.log('  ✓ Test 2 superado (Licencia y JWT TENANT_CLIENT emitidos correctamente).');

    console.log('======================================================================');
    console.log('🎉 TODOS LOS TESTS DE ONBOARDING STRIPE PASARON CON ÉXITO');
    console.log('======================================================================');
  } finally {
    server.close();
  }
}

testSessionLicenseOnboarding().catch((err) => {
  console.error('❌ Error en test de onboarding:', err);
  process.exit(1);
});
