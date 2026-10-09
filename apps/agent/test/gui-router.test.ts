import assert from 'assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LocalAgent } from '../src/agent';
import { LocalGuiServer } from '../src/gui/gui-server';

console.log('--- Running Local GUI Server & Router Tests ---');

async function testGuiServer() {
  const testDir = path.join(os.tmpdir(), `bentian-gui-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  process.env.BENTIAN_DATA_DIR = testDir;
  process.env.BENTIAN_CONFIG_PATH = path.join(testDir, 'agent-config.json');

  const agent = new LocalAgent();
  const server = new LocalGuiServer(agent, 39876);

  const { port, url } = await server.start();
  console.log(`✓ LocalGuiServer iniciado en: ${url} (port ${port})`);

  try {
    // 1. Test GET / (UI HTML template)
    console.log('1. Probando GET / (UI HTML Template)...');
    const resRoot = await fetch(`${url}/`);
    assert.strictEqual(resRoot.status, 200, 'GET / debe responder 200 OK');
    const html = await resRoot.text();
    assert(html.includes('Bentian ERP Bridge'), 'El HTML debe contener "Bentian ERP Bridge"');
    console.log('  ✓ GET / respondió 200 OK con el template HTML.');

    // 2. Test GET /api/local/status
    console.log('2. Probando GET /api/local/status...');
    const resStatus = await fetch(`${url}/api/local/status`);
    assert.strictEqual(resStatus.status, 200, 'GET /api/local/status debe responder 200 OK');
    const statusJson = await resStatus.json() as any;
    assert(statusJson.agentName, 'El status debe contener agentName');
    assert(statusJson.agentVersion, 'El status debe contener agentVersion');
    console.log(`  ✓ GET /api/local/status respondió 200 OK (Agent: ${statusJson.agentName}, v${statusJson.agentVersion}).`);

    // 3. Test GET /api/local/logs
    console.log('3. Probando GET /api/local/logs...');
    const resLogs = await fetch(`${url}/api/local/logs`);
    assert.strictEqual(resLogs.status, 200, 'GET /api/local/logs debe responder 200 OK');
    const logsJson = await resLogs.json();
    assert(Array.isArray(logsJson), 'Los logs deben retornar un array');
    console.log(`  ✓ GET /api/local/logs respondió 200 OK con ${logsJson.length} eventos.`);

    // 4. Test GET /api/local/history
    console.log('4. Probando GET /api/local/history...');
    const resHistory = await fetch(`${url}/api/local/history`);
    assert.strictEqual(resHistory.status, 200, 'GET /api/local/history debe responder 200 OK');
    const historyJson = await resHistory.json();
    assert(Array.isArray(historyJson), 'Debe retornar un array history');
    console.log(`  ✓ GET /api/local/history respondió 200 OK (${historyJson.length} registros).`);

    // 5. Test POST /api/local/detect-factusol
    console.log('5. Probando POST /api/local/detect-factusol...');
    const resDetect = await fetch(`${url}/api/local/detect-factusol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.strictEqual(resDetect.status, 200, 'POST /api/local/detect-factusol debe responder 200 OK');
    const detectJson = await resDetect.json() as any;
    assert(Array.isArray(detectJson.instances), 'Debe retornar un array instances');
    console.log(`  ✓ POST /api/local/detect-factusol respondió 200 OK (${detectJson.instances.length} instancias detectadas).`);

    // 6. Test GET /api/local/check-update
    console.log('6. Probando GET /api/local/check-update...');
    const resUpdate = await fetch(`${url}/api/local/check-update`);
    assert.strictEqual(resUpdate.status, 200, 'GET /api/local/check-update debe responder 200 OK');
    console.log('  ✓ GET /api/local/check-update respondió 200 OK.');

    // 7. Test GET /api/local/autostart
    console.log('7. Probando GET /api/local/autostart...');
    const resAutoStartGet = await fetch(`${url}/api/local/autostart`);
    assert.strictEqual(resAutoStartGet.status, 200, 'GET /api/local/autostart debe responder 200 OK');
    const autostartGetJson = await resAutoStartGet.json() as any;
    assert.strictEqual(autostartGetJson.success, true);
    assert.strictEqual(typeof autostartGetJson.enabled, 'boolean');
    console.log(`  ✓ GET /api/local/autostart respondió 200 OK (enabled: ${autostartGetJson.enabled}).`);

    // 8. Test POST /api/local/autostart
    console.log('8. Probando POST /api/local/autostart...');
    const resAutoStartPost = await fetch(`${url}/api/local/autostart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: autostartGetJson.enabled }),
    });
    assert.strictEqual(resAutoStartPost.status, 200, 'POST /api/local/autostart debe responder 200 OK');
    const autostartPostJson = await resAutoStartPost.json() as any;
    assert.strictEqual(typeof autostartPostJson.success, 'boolean');
    assert.strictEqual(typeof autostartPostJson.enabled, 'boolean');
    console.log('  ✓ POST /api/local/autostart respondió 200 OK.');

    // 9. Test Anti-CSRF: Rechazar Origin externo
    console.log('9. Probando Anti-CSRF (Origin externo: https://sitio-malicioso.com)...');
    const resEvilOrigin = await fetch(`${url}/api/local/status`, {
      headers: { Origin: 'https://sitio-malicioso.com' },
    });
    assert.strictEqual(resEvilOrigin.status, 403, 'Petición con Origin malicioso debe responder 403 Forbidden');
    const evilOriginJson = await resEvilOrigin.json() as any;
    assert.strictEqual(evilOriginJson.error, 'Acceso denegado: Origen no autorizado');
    console.log('  ✓ Origin externo rechazado con 403 Forbidden.');

    // 10. Test Anti-CSRF: Rechazar Referer externo
    console.log('10. Probando Anti-CSRF (Referer externo: https://sitio-malicioso.com/exploit)...');
    const resEvilReferer = await fetch(`${url}/api/local/status`, {
      headers: { Referer: 'https://sitio-malicioso.com/exploit' },
    });
    assert.strictEqual(resEvilReferer.status, 403, 'Petición con Referer malicioso debe responder 403 Forbidden');
    const evilRefererJson = await resEvilReferer.json() as any;
    assert.strictEqual(evilRefererJson.error, 'Acceso denegado: Origen no autorizado');
    console.log('  ✓ Referer externo rechazado con 403 Forbidden.');

    // 11. Test Host Header Validation: Rechazar Host externo
    console.log('11. Probando Host Header Validation (Host: evil.com)...');
    const evilHostStatus = await new Promise<number>((resolve, reject) => {
      const httpReq = http.get(`http://127.0.0.1:${port}/api/local/status`, {
        headers: { Host: 'evil.com' },
      }, (res) => {
        resolve(res.statusCode || 0);
      });
      httpReq.on('error', reject);
    });
    assert.strictEqual(evilHostStatus, 403, 'Petición con Host externo debe responder 403 Forbidden');
    console.log('  ✓ Host externo rechazado con 403 Forbidden.');

    // 12. Test OPTIONS preflight con CORS restrictivo loopback
    console.log('12. Probando OPTIONS preflight con CORS restrictivo loopback...');
    const resOptions = await fetch(`${url}/api/local/status`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert.strictEqual(resOptions.status, 204, 'OPTIONS debe responder 204');
    assert.strictEqual(resOptions.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.strictEqual(resOptions.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');
    console.log('  ✓ Preflight OPTIONS validado con CORS loopback.');

    // 13. Test GET /health
    console.log('13. Probando GET /health...');
    const resHealth = await fetch(`${url}/health`);
    assert.strictEqual(resHealth.status, 200, 'GET /health debe responder 200 OK');
    const healthJson = await resHealth.json() as any;
    assert.strictEqual(healthJson.status, 'OK', 'El status de health debe ser OK');
    // 14. Test GET /api/local/download-companion
    console.log('14. Probando GET /api/local/download-companion...');
    const resCompanion = await fetch(`${url}/api/local/download-companion?secretKey=EB_SEC_test123&dbName=test_db&dbUser=test_user&dbPass=test_pass`);
    assert.strictEqual(resCompanion.status, 200, 'GET /api/local/download-companion debe responder 200 OK');
    assert.strictEqual(resCompanion.headers.get('content-type'), 'application/x-php; charset=utf-8');
    assert(resCompanion.headers.get('content-disposition')?.includes('filename="erp-bridge-endpoint.php"'));
    const phpBody = await resCompanion.text();
    assert(phpBody.startsWith('<?php'), 'El acompañante debe ser código PHP válido');
    assert(phpBody.includes('EB_SEC_test123'), 'El script debe contener la clave secreta inyectada');
    assert(phpBody.includes('test_db'), 'El script debe contener la base de datos inyectada');
    assert(phpBody.includes('test_user'), 'El script debe contener el usuario inyectado');
    assert(!phpBody.includes('%%EB_SECRET_KEY%%'), 'No deben quedar marcadores de posición sin reemplazar');
    console.log(`  ✓ GET /api/local/download-companion respondió 200 OK con ${phpBody.length} bytes de PHP personalizado.`);

    // 15. Test Security Headers (AGT-003)
    console.log('15. Probando cabeceras de seguridad (X-Frame-Options, X-Content-Type-Options)...');
    assert.strictEqual(resRoot.headers.get('x-frame-options'), 'DENY');
    assert.strictEqual(resRoot.headers.get('x-content-type-options'), 'nosniff');
    console.log('  ✓ Cabeceras X-Frame-Options: DENY y X-Content-Type-Options: nosniff verificadas.');

    // 16. Test Sec-Fetch-Site: cross-site -> 403 Forbidden
    console.log('16. Probando rechazo de Sec-Fetch-Site: cross-site...');
    const resCrossSite = await fetch(`${url}/api/local/status`, {
      headers: { 'Sec-Fetch-Site': 'cross-site' },
    });
    assert.strictEqual(resCrossSite.status, 403);
    console.log('  ✓ Sec-Fetch-Site: cross-site rechazado con 403 Forbidden.');

    // 17. Content-Type enforcement on POST with Origin
    console.log('17. Probando Content-Type enforcement en POST con Origin...');
    const resBadType = await fetch(`${url}/api/local/autostart`, {
      method: 'POST',
      headers: {
        Origin: 'http://127.0.0.1:39281',
        'Content-Type': 'text/plain',
      },
      body: 'enabled=true',
    });
    assert.strictEqual(resBadType.status, 415);
    console.log('  ✓ POST con Origin y Content-Type inválido rechazado con 415.');

    // 18. Token extraction & validation for browser requests (AGT-003)
    console.log('18. Probando autenticación por token para peticiones de navegador con Origin...');
    const tokenMatch = html.match(/<meta\s+name="bentian-token"\s+content="([^"]+)"/);
    assert(tokenMatch && tokenMatch[1], 'El HTML debe contener la meta etiqueta con el bentian-token');
    const token = tokenMatch[1];

    // Petición con Origin sin token debe fallar
    const resNoToken = await fetch(`${url}/api/local/status`, {
      headers: { Origin: 'http://127.0.0.1:39281' },
    });
    assert.strictEqual(resNoToken.status, 403);

    // Petición con Origin y token válido debe tener éxito
    const resWithToken = await fetch(`${url}/api/local/status`, {
      headers: {
        Origin: 'http://127.0.0.1:39281',
        'X-Bentian-Token': token,
      },
    });
    assert.strictEqual(resWithToken.status, 200);
    console.log('  ✓ Token de sesión local (X-Bentian-Token) validado correctamente.');

    // 19. Anti-NTLM Leak on GET /api/local/open-file-dialog with UNC path (AGT-003)
    console.log('19. Probando bloqueo de rutas UNC en GET /api/local/open-file-dialog (Anti-NTLM leak)...');
    const resUncGet = await fetch(`${url}/api/local/open-file-dialog?currentPath=\\\\evil-nas\\share\\db.accdb`);
    assert.strictEqual(resUncGet.status, 400);
    const uncJson = (await resUncGet.json()) as any;
    assert(uncJson.message.includes('UNC'));
    console.log('  ✓ Ruta UNC en GET /open-file-dialog bloqueada con 400 Bad Request.');

    // 20. Secret Masking & Preservation (AGT-004)
    console.log('20. Probando enmascaramiento y preservación de credenciales (AGT-004)...');
    await agent.saveFullConfig({
      woocommerce: {
        storeUrl: 'https://test-store.local',
        consumerKey: 'ck_real_123',
        consumerSecret: 'cs_real_secret_456',
      },
    });
    const statusBefore = await agent.getStatusDetails();
    assert.strictEqual(statusBefore.woocommerceSettings?.consumerSecret, '••••••••', 'El secret debe estar enmascarado en status');
    assert.strictEqual(statusBefore.woocommerceSettings?.consumerKey, 'ck_real_123', 'El key no debe estar enmascarado');

    // Simular que el frontend devuelve el valor enmascarado sin cambiarlo
    await agent.saveFullConfig({
      woocommerce: {
        storeUrl: 'https://test-store.local',
        consumerKey: 'ck_real_123',
        consumerSecret: '••••••••',
      },
    });
    const secretInConfig = agent.getConfig().woocommerce?.consumerSecret;
    assert.strictEqual(secretInConfig, 'cs_real_secret_456', 'El valor real del secret no debe haberse sobrescrito');
    console.log('  ✓ Enmascaramiento y preservación de credenciales verificado exitosamente.');

    // 21. Report incident endpoint (POST /api/local/report-incident)
    console.log('21. Probando reporte de incidencias (POST /api/local/report-incident)...');
    const resIncMissing = await fetch(`${url}/api/local/report-incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(resIncMissing.status, 400, 'Debe requerir contacto y descripción');

    const resIncValid = await fetch(`${url}/api/local/report-incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact: 'soporte-test@empresa.com',
        category: 'factusol',
        description: 'Error simulado de prueba para comprobación técnica',
        includeDiagnostics: true
      })
    });
    assert.strictEqual(resIncValid.status, 200, 'Debe registrar la incidencia con 200 OK');
    const incJson = (await resIncValid.json()) as any;
    assert(incJson.success, 'La respuesta debe ser success: true');
    assert(incJson.ticketId && incJson.ticketId.startsWith('#INC-'), 'Debe generar un ticketId con formato #INC-');
    console.log(`  ✓ Incidencia registrada exitosamente: ${incJson.ticketId}`);

  } finally {
    await server.stop();
    delete process.env.BENTIAN_DATA_DIR;
    delete process.env.BENTIAN_CONFIG_PATH;
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    console.log('✓ LocalGuiServer detenido limpiamente.');
  }

  console.log('ALL LOCAL GUI & ROUTER TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testGuiServer().catch((err) => {
  console.error('❌ Error en test de GUI Server:', err);
  process.exit(1);
});
