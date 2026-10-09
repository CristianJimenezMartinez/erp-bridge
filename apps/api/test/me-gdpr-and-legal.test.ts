import assert from 'assert';
import http from 'http';
import { bootstrapApp } from '../src/server';
import { AuthService } from '../src/routes/auth.router';

console.log('--- Running GDPR (Portability & Erasure) & Legal Pages Tests ---');

async function runTests() {
  process.env['ADMIN_EMAIL'] = 'admin@cristianjm.com';
  process.env['ADMIN_PASSWORD'] = 'SuperSecurePass123!';
  process.env['ADMIN_JWT_SECRET'] = 'test-jwt-secret-key-12345-very-long-secret-key';
  process.env['PARTNER_SECRET'] = 'PartnerSecret2026!';

  const app = await bootstrapApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const testOrgId = `org_gdpr_${Date.now()}`;
    const testUserEmail = `user_gdpr_${Date.now()}@empresa-test.es`;

    const token = AuthService.generateToken({
      sub: testUserEmail,
      role: 'TENANT_CLIENT',
      organizationId: testOrgId,
    });

    // 1. GET /me/export sin autenticación -> 401
    console.log('1. Probando GET /me/export sin autenticación (debe rechazar con 401)...');
    const resNoAuthExport = await fetch(`${baseUrl}/api/v1/me/export`);
    assert.strictEqual(resNoAuthExport.status, 401, 'Sin autenticación debe devolver 401');
    console.log('  ✓ GET /me/export protegido sin token.');

    // 2. GET /me/export con token válido -> 200 y estructura RGPD Art. 20
    console.log('2. Probando GET /me/export autenticado (RGPD Art. 20 Portabilidad)...');
    const resExport = await fetch(`${baseUrl}/api/v1/me/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(resExport.status, 200, 'Con autenticación debe devolver 200');
    const exportJson = (await resExport.json()) as any;
    assert.strictEqual(exportJson.success, true);
    assert(exportJson.data, 'Debe incluir objeto data');
    assert(exportJson.data.rgpdMetadata, 'Debe incluir metadatos de RGPD');
    assert.strictEqual(exportJson.data.account.userId, testUserEmail);
    assert.strictEqual(exportJson.data.account.organizationId, testOrgId);
    console.log('  ✓ Estructura de exportación RGPD Art. 20 validada con éxito.');

    // 3. Probando ruta directa /me/export (sin /api/v1)
    console.log('3. Probando ruta directa GET /me/export...');
    const resDirectExport = await fetch(`${baseUrl}/me/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(resDirectExport.status, 200);
    console.log('  ✓ Ruta directa GET /me/export operativa.');

    // 4. DELETE /me sin autenticación -> 401
    console.log('4. Probando DELETE /me sin autenticación (debe rechazar con 401)...');
    const resNoAuthDelete = await fetch(`${baseUrl}/api/v1/me`, { method: 'DELETE' });
    assert.strictEqual(resNoAuthDelete.status, 401, 'Sin autenticación debe devolver 401');
    console.log('  ✓ DELETE /me protegido sin token.');

    // 5. DELETE /me con token válido -> 200 y revocación de token
    console.log('5. Probando DELETE /me autenticado (RGPD Art. 17 Derecho al olvido)...');
    const deleteToken = AuthService.generateToken({
      sub: `user_delete_${Date.now()}@empresa.es`,
      role: 'TENANT_CLIENT',
      organizationId: `org_del_${Date.now()}`,
    });

    const resDelete = await fetch(`${baseUrl}/api/v1/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${deleteToken}` },
    });
    assert.strictEqual(resDelete.status, 200, 'Debe devolver 200');
    const deleteJson = (await resDelete.json()) as any;
    assert.strictEqual(deleteJson.success, true);
    assert(deleteJson.requestId, 'Debe devolver un requestId de auditoría');
    assert.strictEqual(deleteJson.details.status, 'ANONYMIZED');
    console.log('  ✓ Supresión y anonimización RGPD Art. 17 procesada.');

    // 6. Verificar que el token usado en DELETE queda revocado
    console.log('6. Comprobando que el token usado en DELETE queda revocado...');
    const resPostDelete = await fetch(`${baseUrl}/api/v1/me/export`, {
      headers: { Authorization: `Bearer ${deleteToken}` },
    });
    assert.strictEqual(resPostDelete.status, 401, 'El token revocado debe ser rechazado con 401');
    console.log('  ✓ Token revocado tras solicitud de supresión de datos.');

    // 7. Páginas públicas estáticas /privacidad y /cookies
    console.log('7. Verificando disponibilidad de /privacidad y /cookies...');
    const resPriv = await fetch(`${baseUrl}/privacidad`);
    assert.strictEqual(resPriv.status, 200, '/privacidad debe responder 200');
    const privHtml = await resPriv.text();
    assert(privHtml.includes('Política de Privacidad y Protección de Datos'), 'Debe contener el título de privacidad');
    assert(privHtml.includes('RGPD'), 'Debe referenciar el RGPD');
    console.log('  ✓ Página oficial /privacidad validada.');

    const resCookies = await fetch(`${baseUrl}/cookies`);
    assert.strictEqual(resCookies.status, 200, '/cookies debe responder 200');
    const cookiesHtml = await resCookies.text();
    assert(cookiesHtml.includes('Política de Cookies'), 'Debe contener el título de cookies');
    console.log('  ✓ Página oficial /cookies validada.');

    const resTerminos = await fetch(`${baseUrl}/terminos`);
    assert.strictEqual(resTerminos.status, 200, '/terminos debe responder 200');
    console.log('  ✓ Página oficial /terminos validada.');

    console.log('\n============================================================');
    console.log('✅ TODOS LOS TESTS DE RGPD, PRIVACIDAD Y COOKIES PASARON');
    console.log('============================================================');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Error en test de RGPD y páginas legales:', err);
  process.exit(1);
});
