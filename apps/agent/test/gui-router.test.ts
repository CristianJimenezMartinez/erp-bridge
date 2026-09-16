import assert from 'assert';
import http from 'http';
import { LocalAgent } from '../src/agent';
import { LocalGuiServer } from '../src/gui/gui-server';

console.log('--- Running Local GUI Server & Router Tests ---');

async function testGuiServer() {
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

  } finally {
    await server.stop();
    console.log('✓ LocalGuiServer detenido limpiamente.');
  }

  console.log('ALL LOCAL GUI & ROUTER TESTS PASSED SUCCESSFULLY!');
}

testGuiServer().catch((err) => {
  console.error('❌ Error en test de GUI Server:', err);
  process.exit(1);
});
